'use strict'

const { chromium } = require('playwright')
const ws           = require('ws')
const { createClient } = require('@supabase/supabase-js')

// ── Ambiente ──────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

console.log('🔍 Diagnóstico de ambiente:')
console.log('  SUPABASE_URL definida:        ', !!SUPABASE_URL)
console.log('  SUPABASE_SERVICE_KEY definida:', !!SUPABASE_KEY)

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL e SUPABASE_SERVICE_KEY são obrigatórias')
  console.error('   Configure as secrets no GitHub: Settings → Secrets → Actions')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { transport: ws },
  auth: { persistSession: false },
})

const HOJE = new Date().toISOString().slice(0, 10)

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// ── Utilitários ───────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function sleepRandom(minMs, maxMs) {
  return sleep(minMs + Math.random() * (maxMs - minMs))
}

// Converte "1,2 mi", "890k", "45.000" → número inteiro
function parseContagem(texto) {
  if (!texto) return null
  const t = texto.trim().replace(/\s/g, '')
  if (/mi$/i.test(t))
    return Math.round(parseFloat(t.replace(/[^\d,]/g, '').replace(',', '.')) * 1_000_000)
  if (/[mk]$/i.test(t))
    return Math.round(parseFloat(t.replace(/[^\d,]/g, '').replace(',', '.')) * 1_000)
  const n = parseInt(t.replace(/\D/g, ''))
  return isNaN(n) ? null : n
}

function fmtSeguidores(n) {
  if (!n) return null
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${Math.round(n / 1_000)}k`
  return String(n)
}

function extrairHashtags(texto) {
  if (!texto) return []
  return (texto.match(/#[\wÀ-ɏ]+/g) || []).slice(0, 10)
}

function inferirPerformance(views, likes) {
  return (views || likes || 0) > 100000 ? 'viral' : 'normal'
}

// ── Coleta de seguidores do perfil ────────────────────────────────────
async function coletarPerfil(page, handle) {
  const username = handle.replace('@', '')
  console.log(`  → Abrindo perfil: instagram.com/${username}/`)

  await page.goto(`https://www.instagram.com/${username}/`, {
    waitUntil: 'networkidle',
    timeout: 30000,
  })
  await sleepRandom(2000, 3500)

  // Verificar redirecionamento para login
  if (page.url().includes('/accounts/login')) {
    console.log(`  ⚠️  Instagram exigiu login para ver o perfil`)
    return { seguidores: null, posts_count: null, bloqueado: true }
  }

  let seguidores  = null
  let posts_count = null

  // Estratégia 1: meta description — "1,2 mi Followers, 500 Following, 1.234 Posts"
  const metaDesc = await page
    .$eval('meta[name="description"]', el => el.getAttribute('content'))
    .catch(() => null)

  if (metaDesc) {
    const mSeg   = metaDesc.match(/([\d,\.]+\s*(?:mi|m|k)?)\s*Followers?/i)
    const mPosts = metaDesc.match(/([\d,\.]+)\s*Posts?/i)
    if (mSeg)   seguidores  = parseContagem(mSeg[1])
    if (mPosts) posts_count = parseInt(mPosts[1].replace(/\D/g, '')) || null
  }

  // Estratégia 2: <li> do header de stats
  if (!seguidores) {
    const liTextos = await page
      .$$eval('header section ul li', els => els.map(e => e.innerText.trim()))
      .catch(() => [])

    for (const t of liTextos) {
      if (/follower/i.test(t)) {
        const m = t.match(/([\d,\.]+\s*(?:mi|m|k)?)/i)
        if (m) seguidores = parseContagem(m[1])
      }
      if (/\bpost/i.test(t) && !posts_count) {
        const m = t.match(/(\d[\d,\.]*)/)
        if (m) posts_count = parseInt(m[1].replace(/\D/g, '')) || null
      }
    }
  }

  if (seguidores) console.log(`  ✅ Seguidores: ${fmtSeguidores(seguidores)}`)
  else            console.log(`  ℹ️  Seguidores não encontrados no HTML`)

  return { seguidores, posts_count, bloqueado: false }
}

// ── Coleta dos reels visíveis na aba /reels/ ──────────────────────────
async function coletarLinksReels(page, handle) {
  const username = handle.replace('@', '')
  console.log(`  → Abrindo aba de reels`)

  await page.goto(`https://www.instagram.com/${username}/reels/`, {
    waitUntil: 'networkidle',
    timeout: 30000,
  })
  await sleepRandom(2000, 3000)

  if (page.url().includes('/accounts/login')) {
    console.log(`  ⚠️  Reels bloqueados — Instagram exigiu login`)
    return []
  }

  // Aguardar grid carregar
  await page.waitForSelector('a[href*="/reel/"]', { timeout: 10000 }).catch(() => {})

  // Scroll suave para carregar lazy content
  await page.evaluate(() => window.scrollBy(0, 600))
  await sleepRandom(1500, 2500)

  const reels = await page.$$eval('a[href*="/reel/"]', links =>
    [...new Set(links.map(a => a.getAttribute('href')))]
      .filter(Boolean)
      .slice(0, 6)
      .map(href => {
        const el  = document.querySelector(`a[href="${href}"]`)
        const shortcode = href.match(/\/reel\/([^/]+)\//)?.[1] || null

        // View count aparece como overlay no thumbnail (span com número)
        const spans = el ? [...el.querySelectorAll('span')] : []
        const viewsTexto = spans
          .map(s => s.textContent.trim())
          .find(t => /^[\d,\.]+\s*(?:mi|m|k)?$/i.test(t)) || null

        return {
          shortcode,
          url: 'https://www.instagram.com' + href.replace(/\?.*/, ''),
          views_texto: viewsTexto,
        }
      })
      .filter(r => r.shortcode)
  ).catch(() => [])

  // Remover duplicatas por shortcode
  const unicos = [...new Map(reels.map(r => [r.shortcode, r])).values()]
  console.log(`  ✅ ${unicos.length} reel(s) encontrado(s)`)
  return unicos
}

// ── Coleta de dados de um reel individual ─────────────────────────────
async function coletarDadosReel(page, reelUrl) {
  await page.goto(reelUrl, { waitUntil: 'networkidle', timeout: 30000 })
  await sleepRandom(1500, 3000)

  if (page.url().includes('/accounts/login')) {
    return { likes: null, comentarios: null, legenda: null }
  }

  // Legenda: primeiro bloco de texto significativo da postagem
  const legenda = await page
    .$eval(
      'h1, article div[role="button"] span, div._a9zs span, div.x9f619 span',
      el => el.textContent.trim(),
    )
    .catch(() => null)

  // Likes: procurar botão/seção com contagem de curtidas
  const likesTexto = await page
    .$$eval('section span, button span', spans => {
      const candidatos = spans
        .map(s => s.textContent.trim())
        .filter(t => /^[\d,\.]+\s*(?:mi|m|k)?$/i.test(t) && t !== '0')
      return candidatos[0] || null
    })
    .catch(() => null)

  // Comentários: contar elementos de comentário na seção
  const comentarios = await page
    .$eval('ul li', () => null) // placeholder — requer scroll e seletor específico
    .catch(() => null)

  return {
    likes:       likesTexto ? parseContagem(likesTexto) : null,
    comentarios: comentarios,
    legenda:     legenda ? legenda.slice(0, 400) : null,
  }
}

// ── Processamento de um concorrente ───────────────────────────────────
async function processarConcorrente(page, concorrente) {
  console.log(`\n📱 ${concorrente.handle}`)

  const resultado = { handle: concorrente.handle, posts_novos: 0, bloqueado: false }

  // 1. Perfil
  const perfil = await coletarPerfil(page, concorrente.handle)
  resultado.bloqueado = perfil.bloqueado

  if (perfil.seguidores) {
    await supabase
      .from('mkt_concorrentes')
      .update({
        seguidores_num:   perfil.seguidores,
        seguidores_texto: fmtSeguidores(perfil.seguidores),
      })
      .eq('id', concorrente.id)
  }

  if (perfil.bloqueado) return resultado

  await sleepRandom(1500, 2500)

  // 2. Links dos reels
  const reelLinks = await coletarLinksReels(page, concorrente.handle)

  // 3. Dados individuais de cada reel
  for (const reel of reelLinks) {
    // Verificar duplicata
    const { data: existente } = await supabase
      .from('mkt_posts')
      .select('id')
      .eq('url', reel.url)
      .maybeSingle()

    if (existente) {
      console.log(`  ⏭️  Já registrado: ${reel.shortcode}`)
      continue
    }

    console.log(`  → Abrindo reel: ${reel.shortcode}`)
    const dados = await coletarDadosReel(page, reel.url)

    const views = reel.views_texto ? parseContagem(reel.views_texto) : null

    const { error } = await supabase.from('mkt_posts').insert({
      concorrente_id: concorrente.id,
      data_coleta:    HOJE,
      tipo:           'reels',
      url:            reel.url,
      views:          views,
      likes:          dados.likes,
      comentarios:    dados.comentarios,
      resumo_legenda: dados.legenda,
      hashtags:       extrairHashtags(dados.legenda),
      performance:    inferirPerformance(views, dados.likes),
    })

    if (!error) {
      resultado.posts_novos++
      console.log(`  ✅ Salvo: ${reel.shortcode} (${views ?? '?'} views, ${dados.likes ?? '?'} likes)`)
    } else {
      console.log(`  ❌ Erro ao salvar: ${error.message}`)
    }

    await sleepRandom(2000, 4000)
  }

  return resultado
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  console.log(`🚀 Coleta com Playwright — ${HOJE}`)
  console.log('─'.repeat(50))

  // Concorrentes ativos
  const { data: concorrentes, error: dbErr } = await supabase
    .from('mkt_concorrentes')
    .select('*')
    .eq('ativo', true)
    .order('nome')

  if (dbErr) {
    console.error('❌ Erro ao buscar concorrentes:', dbErr.message)
    process.exit(1)
  }

  if (!concorrentes?.length) {
    console.log('⚠️  Nenhum concorrente ativo em mkt_concorrentes.')
    process.exit(0)
  }

  console.log(`📋 ${concorrentes.length} concorrente(s) para processar`)

  // Lançar browser
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1440,900',
    ],
  })

  const context = await browser.newContext({
    userAgent:   USER_AGENT,
    viewport:    { width: 1440, height: 900 },
    locale:      'pt-BR',
    timezoneId:  'America/Sao_Paulo',
  })

  const page = await context.newPage()

  // Ocultar sinais de automação
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    window.chrome = { runtime: {} }
  })

  const resultados = []

  for (let i = 0; i < concorrentes.length; i++) {
    const res = await processarConcorrente(page, concorrentes[i])
    resultados.push(res)

    if (i < concorrentes.length - 1) {
      const wait = 3000 + Math.random() * 4000  // 3–7 segundos
      console.log(`  ⏳ Aguardando ${Math.round(wait / 1000)}s antes do próximo...`)
      await sleep(wait)
    }
  }

  await browser.close()

  // ── Resumo ─────────────────────────────────────────────────────────
  const totalPosts = resultados.reduce((s, r) => s + r.posts_novos, 0)
  const acessados  = resultados.filter(r => !r.bloqueado).length
  const bloqueados = resultados.filter(r => r.bloqueado).length

  console.log('\n' + '─'.repeat(50))
  console.log('📊 Resumo:')
  console.log(`  Perfis acessados:  ${acessados}/${resultados.length}`)
  console.log(`  Perfis bloqueados: ${bloqueados}/${resultados.length}`)
  console.log(`  Posts novos:       ${totalPosts}`)

  // ── Insight automático ────────────────────────────────────────────
  let insight
  if (totalPosts > 0) {
    const top = resultados.reduce((m, r) => r.posts_novos > m.posts_novos ? r : m, resultados[0])
    insight = `Coleta automática ${HOJE} (Playwright): ${totalPosts} reel(s) novo(s) de ${acessados} perfil(s). Mais ativo: ${top.handle} com ${top.posts_novos} reel(s).`
  } else if (acessados > 0) {
    insight = `Coleta automática ${HOJE}: ${acessados} perfil(s) acessado(s) sem reels novos — conteúdo já registrado ou aba de reels vazia.`
  } else {
    insight = `Coleta automática ${HOJE}: Instagram bloqueou todos os ${resultados.length} perfil(s) — pode ser necessário adicionar cookies de sessão autenticada.`
  }

  await supabase.from('mkt_insights').insert({ data: HOJE, insight })
  console.log(`\n💡 ${insight}`)
  console.log('\n✅ Coleta finalizada.')
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message)
  process.exit(1)
})
