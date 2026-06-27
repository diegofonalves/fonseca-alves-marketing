import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

// ── Mock data ────────────────────────────────────────────────────────
const MOCK_CONCORRENTES = [
  { id: 'c1', handle: '@escribaconcursos',      nome: 'Escriva Concursos',          seguidores_texto: '120k',  ativo: true },
  { id: 'c2', handle: '@direitoseutrabalhista',  nome: 'Direito Seu Trabalhista',    seguidores_texto: '890k',  ativo: true },
  { id: 'c3', handle: '@drcarlospecas',          nome: 'Dr. Carlos Peças',           seguidores_texto: '45k',   ativo: true },
]

const MOCK_POSTS = [
  {
    id: 'm1', concorrente_id: 'c1',
    views: 487000, likes: 14200, comentarios: 932,
    hook: 'Você está estudando OAB do jeito errado — e vai reprovar de novo',
    formato: 'TALKING HEAD + LISTA',
    resumo_legenda: 'Os 5 erros que me fizeram reprovar 2 vezes e o método que usei para passar na 3ª tentativa. Salva esse vídeo.',
    por_que_viralizou: 'Aborda uma dor muito específica (reprovar na OAB) com promessa de resultado em prazo curto. O hook usa o medo do fracasso como gatilho.',
    como_adaptar: 'Criar vídeo: "3 erros que clientes cometem ao contratar advogado trabalhista" — mesmo gatilho de medo + promessa de solução prática.',
    performance: 'viral', url: 'https://instagram.com',
    transcricao: 'Você sabia que 70% das pessoas que fazem OAB reprovam na primeira tentativa? Eu fui uma delas. Duas vezes. Mas na terceira, eu descobri algo que mudou tudo.\n\nPrimeiro erro: estudar muito, mas estudar errado. Segundo erro: ignorar as súmulas do STJ e STF. Terceiro erro: não fazer simulados semanais com tempo cronometrado.',
    mkt_concorrentes: MOCK_CONCORRENTES[0],
  },
  {
    id: 'm2', concorrente_id: 'c1',
    views: 89000, likes: 3100, comentarios: 245,
    hook: 'Mudanças no CLT que todo trabalhador precisa conhecer em 2025',
    formato: 'TALKING HEAD',
    resumo_legenda: 'As 3 principais mudanças na legislação trabalhista que entram em vigor esse ano. Se você trabalha de carteira assinada, assiste até o final.',
    por_que_viralizou: null,
    como_adaptar: 'Adaptar para: "3 mudanças tributárias que afetam pequenas empresas em 2025" — mesmo formato informativo para nicho empresarial.',
    performance: 'normal', url: 'https://instagram.com', transcricao: null,
    mkt_concorrentes: MOCK_CONCORRENTES[0],
  },
  {
    id: 'm3', concorrente_id: 'c2',
    views: 1200000, likes: 45000, comentarios: 3800,
    hook: 'Se você trabalhou de carteira assinada, você provavelmente tem dinheiro a receber',
    formato: 'TALKING HEAD + CTA',
    resumo_legenda: 'Muita gente sai do emprego sem saber que tem direitos que nunca foram pagos. Comenta "QUERO SABER" que eu te explico.',
    por_que_viralizou: 'Gatilho de dinheiro perdido + CTA direto nos comentários criou engajamento massivo. Hook universal — qualquer ex-CLT se identifica imediatamente.',
    como_adaptar: 'Replicar com: "Se você abriu ou fechou empresa, pode ter créditos fiscais não aproveitados" — mesmo gatilho para nicho empresarial.',
    performance: 'viral', url: 'https://instagram.com',
    transcricao: 'Presta atenção: se você trabalhou de carteira assinada nos últimos 5 anos, é bem provável que tenha dinheiro a receber que nunca foi pago.\n\nHoras extras, adicional noturno, FGTS mal calculado, aviso prévio indenizado. Isso pode te dar de volta de R$5.000 a R$50.000.',
    mkt_concorrentes: MOCK_CONCORRENTES[1],
  },
  {
    id: 'm4', concorrente_id: 'c2',
    views: 210000, likes: 8900, comentarios: 1200,
    hook: 'Justa causa: quando é legal e quando é abuso do empregador',
    formato: 'CARROSSEL EDUCATIVO',
    resumo_legenda: '7 situações em que a justa causa pode ser revertida na Justiça. Salva para consultar quando precisar.',
    por_que_viralizou: 'Tema de alta busca + gatilho de injustiça. O "salva para consultar" aumentou o alcance via saves, que o algoritmo prioriza.',
    como_adaptar: 'Criar carrossel "5 cláusulas contratuais que podem ser anuladas na Justiça" — mesmo formato para nicho contratual.',
    performance: 'viral', url: 'https://instagram.com', transcricao: null,
    mkt_concorrentes: MOCK_CONCORRENTES[1],
  },
  {
    id: 'm5', concorrente_id: 'c3',
    views: 54000, likes: 2100, comentarios: 180,
    hook: 'O habeas corpus que impetrei em 2 horas e soltei meu cliente',
    formato: 'TALKING HEAD + CASE',
    resumo_legenda: 'Caso real: como um habeas corpus bem fundamentado mudou o rumo de uma prisão preventiva. A defesa técnica faz toda a diferença.',
    por_que_viralizou: null,
    como_adaptar: 'Criar série "Casos reais de escritório" — humaniza a advocacia e gera identificação com quem passa por situações similares.',
    performance: 'normal', url: 'https://instagram.com',
    transcricao: 'Semana passada recebi uma ligação às 23h. O filho de uma cliente tinha sido preso preventivamente por suspeita de furto. Mas havia um vício insanável na representação policial — o flagrante foi lavrado sem que o preso fosse informado de seus direitos constitucionais.',
    mkt_concorrentes: MOCK_CONCORRENTES[2],
  },
]

// ── Helpers ──────────────────────────────────────────────────────────
function fmtNum(n) {
  if (!n && n !== 0) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k'
  return String(n)
}

function inicialHandle(handle) {
  return (handle || '?').replace('@', '').charAt(0).toUpperCase()
}

// ── Badge ────────────────────────────────────────────────────────────
function Badge({ viral }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
      background: viral ? '#fef2f2' : '#f0fdf4',
      color: viral ? '#ef4444' : '#22c55e',
      border: `1px solid ${viral ? '#fecaca' : '#bbf7d0'}`,
      letterSpacing: 0.4, whiteSpace: 'nowrap',
    }}>
      {viral ? '🔴 VIRAL' : '🟢 NORMAL'}
    </span>
  )
}

// ── PostCard ─────────────────────────────────────────────────────────
function PostCard({ post, onVerTranscricao }) {
  const eViral = post.performance === 'viral'
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
      padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Views + Badge + Formato */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
          {fmtNum(post.views)}
        </span>
        <span style={{ fontSize: 11, color: '#94a3b8', alignSelf: 'flex-end', paddingBottom: 2 }}>
          views
        </span>
        <Badge viral={eViral} />
        {post.formato && (
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
            background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0',
            letterSpacing: 0.3, whiteSpace: 'nowrap',
          }}>
            {post.formato}
          </span>
        )}
      </div>

      {/* Hook */}
      {post.hook && (
        <p style={{
          fontSize: 14, fontWeight: 700, color: '#1e293b', fontStyle: 'italic',
          lineHeight: 1.5, marginBottom: 10,
          borderLeft: '3px solid #2563eb', paddingLeft: 10,
        }}>
          "{post.hook}"
        </p>
      )}

      {/* Resumo */}
      {post.resumo_legenda && (
        <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 12 }}>
          {post.resumo_legenda}
        </p>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: '#475569' }}>❤️ {fmtNum(post.likes)}</span>
        <span style={{ fontSize: 13, color: '#475569' }}>💬 {fmtNum(post.comentarios)}</span>
      </div>

      {/* Botões */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {post.url && (
          <a href={post.url} target="_blank" rel="noopener noreferrer" style={{
            fontSize: 12, fontWeight: 600, padding: '7px 12px',
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: 7, color: '#475569', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            🔗 Ver Original
          </a>
        )}
        {post.transcricao && (
          <button onClick={() => onVerTranscricao(post)} style={{
            fontSize: 12, fontWeight: 600, padding: '7px 12px',
            background: '#eff6ff', border: '1px solid #bfdbfe',
            borderRadius: 7, color: '#2563eb', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            📄 Ver Transcrição
          </button>
        )}
      </div>

      {/* Por que Viralizou */}
      {post.por_que_viralizou && (
        <div style={{ background: '#eff6ff', borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
          <p style={{
            fontSize: 10, fontWeight: 700, color: '#1d4ed8', marginBottom: 5,
            textTransform: 'uppercase', letterSpacing: 0.5,
          }}>🔍 Por que Viralizou</p>
          <p style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.6, margin: 0 }}>
            {post.por_que_viralizou}
          </p>
        </div>
      )}

      {/* Como Adaptar */}
      {post.como_adaptar && (
        <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '12px 14px' }}>
          <p style={{
            fontSize: 10, fontWeight: 700, color: '#15803d', marginBottom: 5,
            textTransform: 'uppercase', letterSpacing: 0.5,
          }}>🎯 Como Adaptar</p>
          <p style={{ fontSize: 13, color: '#166534', lineHeight: 1.6, margin: 0 }}>
            {post.como_adaptar}
          </p>
        </div>
      )}
    </div>
  )
}

// ── TranscricaoModal ─────────────────────────────────────────────────
function TranscricaoModal({ post, onClose }) {
  if (!post) return null
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600,
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
      }}>
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize: 10, color: '#94a3b8', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Transcrição
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0 }}>
              {post.mkt_concorrentes?.handle || 'Post'}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%',
            border: '1px solid #e2e8f0', background: '#f8fafc',
            cursor: 'pointer', fontSize: 16, color: '#64748b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>
        <div style={{ padding: 24, overflowY: 'auto' }}>
          <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.9, whiteSpace: 'pre-wrap', margin: 0 }}>
            {post.transcricao}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Perfis ───────────────────────────────────────────────────────────
const FILTROS = [
  { key: 'todos',  label: 'Todos' },
  { key: 'virais', label: '🔴 Virais' },
  { key: 'acima',  label: '🟡 Acima da Média' },
]

export default function Perfis() {
  const [concorrentes, setConcorrentes]   = useState([])
  const [selecionado, setSelecionado]     = useState(null)
  const [posts, setPosts]                 = useState([])
  const [loadingInit, setLoadingInit]     = useState(true)
  const [loadingPosts, setLoadingPosts]   = useState(false)
  const [filtro, setFiltro]               = useState('todos')
  const [modalPost, setModalPost]         = useState(null)
  const [usandoMock, setUsandoMock]       = useState(false)

  // Busca concorrentes ativos
  useEffect(() => {
    async function init() {
      const { data } = await supabase
        .from('mkt_concorrentes')
        .select('*')
        .eq('ativo', true)
        .order('nome')

      if (!data?.length) {
        setUsandoMock(true)
        setConcorrentes(MOCK_CONCORRENTES)
        setSelecionado(MOCK_CONCORRENTES[0])
      } else {
        setConcorrentes(data)
        setSelecionado(data[0])
      }
      setLoadingInit(false)
    }
    init()
  }, [])

  // Busca posts quando muda o concorrente selecionado
  useEffect(() => {
    if (!selecionado) return

    if (usandoMock) {
      setPosts(MOCK_POSTS.filter(p => p.concorrente_id === selecionado.id))
      return
    }

    async function fetchPosts() {
      setLoadingPosts(true)
      const { data } = await supabase
        .from('mkt_posts')
        .select('*, mkt_concorrentes(*)')
        .eq('concorrente_id', selecionado.id)
        .order('views', { ascending: false })
      setPosts(data || [])
      setLoadingPosts(false)
    }
    fetchPosts()
  }, [selecionado, usandoMock])

  // Métricas do perfil
  const totalViews  = posts.reduce((s, p) => s + (p.views || 0), 0)
  const mediaViews  = posts.length ? Math.round(totalViews / posts.length) : 0
  const melhorPost  = posts.reduce((max, p) => (p.views || 0) > (max?.views || 0) ? p : max, null)

  // Filtro
  const postsFiltrados = useMemo(() => {
    if (filtro === 'virais') return posts.filter(p => p.performance === 'viral')
    if (filtro === 'acima')  return posts.filter(p => (p.views || 0) > mediaViews)
    return posts
  }, [posts, filtro, mediaViews])

  if (loadingInit) {
    return (
      <div style={{ background: '#fff', borderRadius: 12, padding: 56, textAlign: 'center', border: '1px solid #e2e8f0' }}>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>Carregando perfis...</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1200 }}>

      {/* ── Header ── */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '18px 24px',
        marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        border: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: '0 0 2px' }}>
            Por Perfil
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
            Análise individual por concorrente
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {usandoMock && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
              background: '#fefce8', color: '#92400e', border: '1px solid #fde68a',
            }}>
              dados mock
            </span>
          )}
          <span style={{ fontSize: 24 }}>👤</span>
        </div>
      </div>

      {/* ── Chips de concorrentes ── */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '14px 16px',
        marginBottom: 20, border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <p style={{
          fontSize: 10, fontWeight: 600, color: '#94a3b8',
          textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10,
        }}>
          Concorrentes monitorados
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {concorrentes.map(c => {
            const ativo = selecionado?.id === c.id
            return (
              <button
                key={c.id}
                onClick={() => { setSelecionado(c); setFiltro('todos') }}
                style={{
                  padding: '8px 14px', borderRadius: 24,
                  border: `1px solid ${ativo ? '#2563eb' : '#e2e8f0'}`,
                  background: ativo ? '#2563eb' : '#f8fafc',
                  color: ativo ? '#fff' : '#475569',
                  cursor: 'pointer', fontSize: 13, fontWeight: ativo ? 700 : 500,
                  display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: ativo ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 800,
                  color: ativo ? '#fff' : '#475569',
                  flexShrink: 0,
                }}>
                  {inicialHandle(c.handle)}
                </span>
                {c.handle}
                {c.seguidores_texto && (
                  <span style={{ fontSize: 11, opacity: 0.75 }}>· {c.seguidores_texto}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Header do perfil selecionado ── */}
      {selecionado && (
        <div style={{
          background: '#fff', borderRadius: 12, padding: '20px 24px',
          marginBottom: 20, border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          {/* Avatar + nome */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, color: '#fff', flexShrink: 0,
            }}>
              {inicialHandle(selecionado.handle)}
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: '0 0 2px' }}>
                {selecionado.nome}
              </p>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                {selecionado.handle}
                {selecionado.seguidores_texto && (
                  <span style={{ color: '#94a3b8', marginLeft: 8 }}>
                    · {selecionado.seguidores_texto} seguidores
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Métricas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              { label: 'Posts Coletados', value: posts.length, icon: '📋' },
              { label: 'Média de Views',  value: fmtNum(mediaViews), icon: '📈' },
              { label: 'Melhor Post',     value: fmtNum(melhorPost?.views || 0) + ' views', icon: '🏆' },
            ].map(m => (
              <div key={m.label} style={{
                background: '#f8fafc', borderRadius: 10, padding: '14px 16px',
                border: '1px solid #e2e8f0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <p style={{
                    fontSize: 10, color: '#94a3b8', marginBottom: 5, fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>{m.label}</p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
                    {m.value}
                  </p>
                </div>
                <span style={{ fontSize: 20 }}>{m.icon}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filtros ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
        {FILTROS.map(f => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13,
              fontWeight: filtro === f.key ? 600 : 500,
              border: `1px solid ${filtro === f.key ? '#2563eb' : '#e2e8f0'}`,
              background: filtro === f.key ? '#eff6ff' : '#fff',
              color: filtro === f.key ? '#2563eb' : '#64748b',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {f.label}
          </button>
        ))}
        {!loadingPosts && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8' }}>
            {postsFiltrados.length} post{postsFiltrados.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Loading posts ── */}
      {loadingPosts && (
        <div style={{
          background: '#fff', borderRadius: 12, padding: 56,
          textAlign: 'center', border: '1px solid #e2e8f0',
        }}>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>Carregando posts...</p>
        </div>
      )}

      {/* ── Estado vazio ── */}
      {!loadingPosts && postsFiltrados.length === 0 && (
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
          padding: 56, textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>📭</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>
            {filtro !== 'todos'
              ? 'Nenhum post corresponde ao filtro selecionado'
              : 'Nenhum conteúdo coletado para este perfil ainda'}
          </p>
          <p style={{ fontSize: 13, color: '#94a3b8' }}>
            {filtro !== 'todos'
              ? 'Tente remover o filtro para ver todos os posts.'
              : `Adicione posts de ${selecionado?.handle} para começar a análise.`}
          </p>
        </div>
      )}

      {/* ── Grid de posts ── */}
      {!loadingPosts && postsFiltrados.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {postsFiltrados.map(post => (
            <PostCard key={post.id} post={post} onVerTranscricao={setModalPost} />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      <TranscricaoModal post={modalPost} onClose={() => setModalPost(null)} />
    </div>
  )
}
