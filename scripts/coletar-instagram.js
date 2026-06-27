'use strict'

/**
 * Coleta automática de dados públicos do Instagram
 *
 * Limitações reais do Instagram (2025):
 * - Posts e reels exigem autenticação para dados completos (views, likes)
 * - A API pública foi descontinuada em 2018
 * - Scraping é bloqueado progressivamente por rate-limit e CAPTCHA
 *
 * Este script tenta dois endpoints não-oficiais que o próprio webapp do Instagram usa:
 *   1. /api/v1/users/web_profile_info/ — retorna dados do perfil + até 12 posts
 *   2. Fallback via página HTML — tenta extrair seguidores de meta tags
 *
 * Quando dados completos não estão disponíveis, salva o que conseguiu e
 * registra um insight automático com o status da coleta.
 */

const fetch      = require('node-fetch')
const ws         = require('ws')
const { createClient } = require('@supabase/supabase-js')

// ── Validação de ambiente ────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórias')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { transport: ws },
})
const HOJE = new Date().toISOString().slice(0, 10)

// ── Headers simulando browser real ──────────────────────────────────
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const HEADERS_PAGE = {
  'User-Agent': UA,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0',
}

const HEADERS_API = {
  ...HEADERS_PAGE,
  'Accept': '*/*',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'X-IG-App-ID': '936619743392459',   // App ID do webapp do Instagram
  'X-Requested-With': 'XMLHttpRequest',
  'Referer': 'https://www.instagram.com/',
  'Origin': 'https://www.instagram.com',
}

// ── Utilitários ──────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
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
  const metrica = views || likes || 0
  return metrica > 100000 ? 'viral' : 'normal'
}

// ── Coleta do perfil ─────────────────────────────────────────────────
async function buscarPerfil(username) {

  // Tentativa 1: endpoint interno da API web do Instagram
  try {
    const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`
    const res  = await fetch(url, { headers: HEADERS_API, timeout: 20000 })

    if (res.ok) {
      const json = await res.json()
      const user = json?.data?.user

      if (user) {
        const edges = user.edge_owner_to_timeline_media?.edges || []
        const posts = edges.slice(0, 6).map(({ node }) => ({
          shortcode:    node.shortcode,
          tipo:         node.__typename === 'GraphVideo' ? 'reels' : 'post',
          url:          `https://www.instagram.com/p/${node.shortcode}/`,
          views:        node.video_view_count ?? null,
          likes:        node.edge_liked_by?.count ?? node.edge_media_preview_like?.count ?? null,
          comentarios:  node.edge_media_to_comment?.count ?? null,
          legenda:      node.edge_media_to_caption?.edges?.[0]?.node?.text ?? null,
          timestamp:    node.taken_at_timestamp ?? null,
        }))

        return {
          ok: true,
          fonte: 'api',
          seguidores:   user.edge_followed_by?.count ?? null,
          posts_count:  user.edge_owner_to_timeline_media?.count ?? null,
          posts,
        }
      }
    }

    console.log(`  ↳ API retornou ${res.status} — tentando fallback`)
  } catch (e) {
    console.log(`  ↳ API inacessível: ${e.message}`)
  }

  await sleep(2500)

  // Tentativa 2: página HTML do perfil (extrai o que está disponível no HTML)
  try {
    const url = `https://www.instagram.com/${username}/`
    const res  = await fetch(url, { headers: HEADERS_PAGE, timeout: 20000 })

    if (res.ok) {
      const html = await res.text()

      const followersMatch = html.match(/"edge_followed_by":\{"count":(\d+)\}/)
      const postsMatch     = html.match(/"edge_owner_to_timeline_media":\{"count":(\d+)/)

      return {
        ok:          !!(followersMatch || postsMatch),
        fonte:       'html',
        seguidores:  followersMatch ? parseInt(followersMatch[1]) : null,
        posts_count: postsMatch     ? parseInt(postsMatch[1])     : null,
        posts:       [],             // dados de posts não disponíveis por HTML simples
        aviso:       'Dados parciais (sem posts) — Instagram bloqueou a API',
      }
    }
  } catch (e) {
    console.log(`  ↳ Página HTML inacessível: ${e.message}`)
  }

  return {
    ok: false,
    fonte: null,
    seguidores: null,
    posts_count: null,
    posts: [],
    aviso: 'Instagram bloqueou todos os acessos para este perfil',
  }
}

// ── Processamento de um concorrente ─────────────────────────────────
async function processarConcorrente(concorrente) {
  const username = concorrente.handle.replace('@', '')
  console.log(`\n📱 ${concorrente.handle}`)

  const dados = await buscarPerfil(username)

  const resultado = {
    handle:       concorrente.handle,
    ok:           dados.ok,
    fonte:        dados.fonte,
    posts_novos:  0,
    aviso:        dados.aviso ?? null,
  }

  // Atualizar seguidores no cadastro
  if (dados.seguidores) {
    await supabase
      .from('mkt_concorrentes')
      .update({
        seguidores_num:   dados.seguidores,
        seguidores_texto: fmtSeguidores(dados.seguidores),
      })
      .eq('id', concorrente.id)

    console.log(`  ✅ Seguidores atualizados: ${fmtSeguidores(dados.seguidores)}`)
  }

  // Salvar posts coletados (evitando duplicatas pela URL)
  for (const post of dados.posts) {
    if (!post.shortcode) continue

    const { data: existente } = await supabase
      .from('mkt_posts')
      .select('id')
      .eq('url', post.url)
      .maybeSingle()

    if (existente) {
      console.log(`  ⏭️  Já registrado: ${post.shortcode}`)
      continue
    }

    const dataPost = post.timestamp
      ? new Date(post.timestamp * 1000).toISOString().slice(0, 10)
      : HOJE

    const { error } = await supabase.from('mkt_posts').insert({
      concorrente_id: concorrente.id,
      data_coleta:    dataPost,
      tipo:           post.tipo,
      url:            post.url,
      views:          post.views,
      likes:          post.likes,
      comentarios:    post.comentarios,
      resumo_legenda: post.legenda ? post.legenda.slice(0, 400) : null,
      hashtags:       extrairHashtags(post.legenda),
      performance:    inferirPerformance(post.views, post.likes),
    })

    if (!error) {
      resultado.posts_novos++
      console.log(`  ✅ Post salvo: /p/${post.shortcode}/ (${post.views ?? '?'} views)`)
    } else {
      console.log(`  ❌ Erro ao salvar post: ${error.message}`)
    }
  }

  if (!dados.ok) {
    console.log(`  ⚠️  ${dados.aviso}`)
  } else if (dados.posts.length === 0) {
    console.log(`  ℹ️  Perfil acessado mas sem posts disponíveis (${dados.fonte})`)
  }

  return resultado
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  console.log(`🚀 Coleta automática — ${HOJE}`)
  console.log('─'.repeat(50))

  // Buscar concorrentes ativos
  const { data: concorrentes, error } = await supabase
    .from('mkt_concorrentes')
    .select('*')
    .eq('ativo', true)
    .order('nome')

  if (error) {
    console.error('❌ Erro ao buscar concorrentes:', error.message)
    process.exit(1)
  }

  if (!concorrentes?.length) {
    console.log('⚠️  Nenhum concorrente ativo encontrado. Cadastre perfis em mkt_concorrentes.')
    process.exit(0)
  }

  console.log(`📋 ${concorrentes.length} concorrente(s) para processar`)

  const resultados = []

  for (let i = 0; i < concorrentes.length; i++) {
    const res = await processarConcorrente(concorrentes[i])
    resultados.push(res)

    // Pausa entre perfis para reduzir chance de bloqueio por rate-limit
    if (i < concorrentes.length - 1) {
      console.log('  ⏳ Aguardando 4s...')
      await sleep(4000)
    }
  }

  // ── Resumo ──────────────────────────────────────────────────────────
  const totalPosts   = resultados.reduce((s, r) => s + r.posts_novos, 0)
  const coletados    = resultados.filter(r => r.ok).length
  const bloqueados   = resultados.filter(r => !r.ok).length

  console.log('\n' + '─'.repeat(50))
  console.log('📊 Resumo da coleta:')
  console.log(`  Perfis acessados:  ${coletados}/${resultados.length}`)
  console.log(`  Perfis bloqueados: ${bloqueados}/${resultados.length}`)
  console.log(`  Posts novos:       ${totalPosts}`)

  // ── Insight automático ───────────────────────────────────────────────
  let insight

  if (totalPosts > 0) {
    const top = resultados.reduce((max, r) => r.posts_novos > max.posts_novos ? r : max, resultados[0])
    insight = `Coleta automática ${HOJE}: ${totalPosts} post(s) novo(s) de ${coletados} perfil(s). Mais ativo: ${top.handle} com ${top.posts_novos} post(s) novo(s).`
  } else if (coletados > 0) {
    insight = `Coleta automática ${HOJE}: ${coletados} perfil(s) acessado(s), porém sem posts novos (conteúdo já registrado ou sem reels recentes).`
  } else {
    insight = `Coleta automática ${HOJE}: Instagram bloqueou o acesso a todos os ${resultados.length} perfil(s). Considerar adicionar cookies de sessão ou usar API alternativa.`
  }

  const { error: insightErr } = await supabase.from('mkt_insights').insert({
    data:    HOJE,
    insight,
  })

  if (insightErr) {
    console.log(`⚠️  Erro ao salvar insight: ${insightErr.message}`)
  } else {
    console.log(`\n💡 Insight: ${insight}`)
  }

  console.log('\n✅ Coleta finalizada.')
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message)
  process.exit(1)
})
