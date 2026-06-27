'use strict'

/**
 * Reprocessa posts em mkt_posts com dados incompletos.
 * Condição: titulo IS NULL ou titulo = 'Instagram'
 * Para cada post: abre o reel no Playwright, coleta legenda/views/likes,
 * infere hook e formato, gera análise via Claude Haiku se views > 5.000.
 */

const { chromium } = require('playwright')
const ws           = require('ws')
const { createClient } = require('@supabase/supabase-js')

// ── Ambiente ──────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

console.log('🔍 Diagnóstico de ambiente:')
console.log('  SUPABASE_URL definida:        ', !!SUPABASE_URL)
console.log('  SUPABASE_SERVICE_KEY definida:', !!SUPABASE_KEY)
console.log('  ANTHROPIC_API_KEY definida:   ', !!process.env.ANTHROPIC_API_KEY)
console.log('  INSTAGRAM_COOKIES definida:   ', !!process.env.INSTAGRAM_COOKIES)

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórias')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { transport: ws },
  auth: { persistSession: false },
})

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// ── Utilitários ───────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
function sleepRandom(min, max) { return sleep(min + Math.random() * (max - min)) }

function parseContagem(texto) {
  if (!texto) return null
  const t = texto.trim().replace(/\s/g, '')
  if (/mi$/i.test(t)) return Math.round(parseFloat(t.replace(/[^\d,]/g, '').replace(',', '.')) * 1_000_000)
  if (/[mk]$/i.test(t)) return Math.round(parseFloat(t.replace(/[^\d,]/g, '').replace(',', '.')) * 1_000)
  const n = parseInt(t.replace(/\D/g, ''))
  return isNaN(n) ? null : n
}

function extrairHashtags(texto) {
  if (!texto) return []
  return (texto.match(/#[\wÀ-ɏ]+/g) || []).slice(0, 10)
}

function inferirPerformance(views, likes) {
  return (views || likes || 0) > 100000 ? 'viral' : 'normal'
}

function inferirFormato(legenda, hook) {
  const texto = (hook || legenda || '').toLowerCase()
  if (/\b(1\.|primeiro|2\.|segundo|passo\s*1|passo\s*a\s*passo)/i.test(texto)) return 'Passo a Passo'
  if (/urgente|atenção|cuidado|alerta/i.test(texto))                             return 'Urgente'
  if (/\?/.test(hook || ''))                                                      return 'Pergunta'
  if (/^[\s\S]*?[•\-]\s/m.test(legenda || ''))                                   return 'Lista'
  return 'Talking Head'
}

// ── Análise via Claude Haiku ──────────────────────────────────────────
async function analisarComClaude(hook, legenda) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { por_que_viralizou: null, como_adaptar: null }

  try {
    const prompt = `Analise este conteúdo do Instagram de um concorrente jurídico. Responda SOMENTE com JSON válido, sem markdown.

HOOK: ${hook || '(sem hook)'}
LEGENDA: ${legenda || '(sem legenda)'}

{"por_que_viralizou":"2-3 frases sobre os gatilhos emocionais, formato e razão do alto engajamento","como_adaptar":"2-3 frases sugerindo como adaptar para advocacia bancária gaúcha (superendividamento, revisão de contrato, fraude bancária, nome sujo)"}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-3-5-haiku-20241022',
        max_tokens: 300,
        messages:   [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) return { por_que_viralizou: null, como_adaptar: null }
    const data = await res.json()
    const json = JSON.parse(data.content?.[0]?.text || '{}')
    return {
      por_que_viralizou: json.por_que_viralizou || null,
      como_adaptar:      json.como_adaptar      || null,
    }
  } catch (e) {
    console.log(`  ⚠️  Claude falhou: ${e.message}`)
    return { por_que_viralizou: null, como_adaptar: null }
  }
}

// ── Coleta de dados de um reel ────────────────────────────────────────
async function coletarDadosReel(page, reelUrl) {
  await page.goto(reelUrl, { waitUntil: 'networkidle', timeout: 30000 })
  await sleepRandom(1500, 3000)

  if (page.url().includes('/accounts/login')) {
    return null  // bloqueado — pular este post
  }

  // Legenda completa
  const legenda = await page.$$eval(
    'h1._aagv span, div._a9zs span, div[class*="Caption"] span, article div span',
    spans => {
      for (const s of spans) {
        const t = s.textContent.trim()
        if (t.length > 20 && !t.startsWith('http')) return t
      }
      return null
    }
  ).catch(() => null)

  // Views — aria-label primeiro
  let views = null
  const ariaViews = await page.$$eval('[aria-label]', els =>
    els.map(e => e.getAttribute('aria-label')).find(a => /visualiza/i.test(a)) || null
  ).catch(() => null)

  if (ariaViews) {
    const m = ariaViews.match(/([\d.,]+\s*(?:mi|m|k)?)/i)
    if (m) views = parseContagem(m[1])
  }

  if (!views) {
    const viewsTexto = await page.$eval(
      'span[class*="view"], span._aacl._aaco._aacw._aacx._aad7._aade',
      el => el.textContent.trim()
    ).catch(() => null)
    if (viewsTexto) views = parseContagem(viewsTexto)
  }

  // Likes — separados dos views
  const likesTexto = await page.$$eval(
    'section button span, section a span, div[role="button"] span',
    spans => {
      const nums = spans
        .map(s => s.textContent.trim())
        .filter(t => /^[\d,\.]+\s*(?:mi|m|k)?$/i.test(t) && t !== '0')
      return nums[0] || null
    }
  ).catch(() => null)

  return {
    views,
    likes:  likesTexto ? parseContagem(likesTexto) : null,
    legenda: legenda ? legenda.slice(0, 400) : null,
  }
}

// ── Setup do browser com cookies ──────────────────────────────────────
async function setupBrowser() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1440,900',
    ],
  })

  const context = await browser.newContext({
    userAgent:  USER_AGENT,
    viewport:   { width: 1440, height: 900 },
    locale:     'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  })

  const cookiesRaw = process.env.INSTAGRAM_COOKIES
  if (cookiesRaw) {
    try {
      const SAME_SITE_MAP = { no_restriction: 'None', none: 'None', lax: 'Lax', strict: 'Strict' }
      const cookies = JSON.parse(cookiesRaw)
        .map(c => {
          const n = {
            name: c.name, value: c.value, domain: c.domain, path: c.path || '/',
            sameSite: SAME_SITE_MAP[(c.sameSite || '').toLowerCase()] || 'Lax',
          }
          const exp = c.expires ?? c.expirationDate
          if (exp != null) n.expires = Number(exp)
          if (c.httpOnly != null) n.httpOnly = Boolean(c.httpOnly)
          if (c.secure   != null) n.secure   = Boolean(c.secure)
          return n
        })
        .filter(c => c.name && c.value && c.domain)
      await context.addCookies(cookies)
      console.log(`🍪 ${cookies.length} cookie(s) carregados`)
    } catch (e) {
      console.log(`⚠️  INSTAGRAM_COOKIES inválido: ${e.message}`)
    }
  } else {
    console.log('⚠️  Sem cookies — modo anônimo')
  }

  const page = await context.newPage()
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    window.chrome = { runtime: {} }
  })

  return { browser, page }
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  const hoje = new Date().toISOString().slice(0, 10)
  console.log(`🔄 Reprocessar posts incompletos — ${hoje}`)
  console.log('─'.repeat(50))

  // Buscar posts sem dados completos
  const { data: posts, error: dbErr } = await supabase
    .from('mkt_posts')
    .select('id, url, views, likes, titulo')
    .or('titulo.is.null,titulo.eq.Instagram')
    .not('url', 'is', null)
    .order('criado_em', { ascending: false })
    .limit(50)

  if (dbErr) {
    console.error('❌ Erro ao buscar posts:', dbErr.message)
    process.exit(1)
  }

  if (!posts?.length) {
    console.log('✅ Nenhum post incompleto encontrado. Nada a fazer.')
    process.exit(0)
  }

  console.log(`📋 ${posts.length} post(s) para reprocessar`)

  const { browser, page } = await setupBrowser()

  let atualizados = 0
  let bloqueados  = 0
  let erros       = 0

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i]
    console.log(`\n[${i + 1}/${posts.length}] ${post.url}`)

    const dados = await coletarDadosReel(page, post.url)

    if (!dados) {
      console.log('  ⚠️  Bloqueado pelo Instagram — pulando')
      bloqueados++
      continue
    }

    const hook   = dados.legenda ? dados.legenda.slice(0, 100).split('\n')[0] : null
    const titulo = hook
      ? hook.slice(0, 80)
      : (post.url.split('/').filter(Boolean).pop() || 'Sem título')
    const formato = inferirFormato(dados.legenda, hook)
    const views   = dados.views ?? post.views
    const likes   = dados.likes ?? post.likes

    // Análise Claude para posts com engajamento significativo
    let analise = { por_que_viralizou: null, como_adaptar: null }
    if ((views || 0) > 5000) {
      console.log(`  🧠 Analisando com Claude (${views ?? '?'} views)...`)
      analise = await analisarComClaude(hook, dados.legenda)
    }

    const { error } = await supabase
      .from('mkt_posts')
      .update({
        titulo:            titulo,
        hook:              hook,
        formato:           formato,
        resumo_legenda:    dados.legenda,
        hashtags:          extrairHashtags(dados.legenda),
        views:             views,
        likes:             likes,
        por_que_viralizou: analise.por_que_viralizou,
        como_adaptar:      analise.como_adaptar,
        performance:       inferirPerformance(views, likes),
      })
      .eq('id', post.id)

    if (!error) {
      atualizados++
      console.log(`  ✅ Atualizado: "${titulo?.slice(0, 50)}" (${views ?? '?'} views, formato: ${formato})`)
    } else {
      erros++
      console.log(`  ❌ Erro: ${error.message}`)
    }

    if (i < posts.length - 1) await sleepRandom(2000, 4000)
  }

  await browser.close()

  console.log('\n' + '─'.repeat(50))
  console.log('📊 Resultado:')
  console.log(`  Atualizados: ${atualizados}`)
  console.log(`  Bloqueados:  ${bloqueados}`)
  console.log(`  Erros:       ${erros}`)
  console.log('\n✅ Reprocessamento finalizado.')
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message)
  process.exit(1)
})
