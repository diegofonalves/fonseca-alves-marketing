import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import {
  User, Article, TrendUp, Trophy,
  Fire, CheckCircle, ArrowSquareOut, FileText,
  MagnifyingGlass, PencilSimple, Heart, ChatCircle, Tray,
} from '@phosphor-icons/react'

const CARD = {
  background: '#fff', borderRadius: 12,
  border: '1px solid #e3e8ee',
  boxShadow: '0 2px 5px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
}

// ── Mock data ─────────────────────────────────────────────────────────
const MOCK_CONCORRENTES = [
  { id: 'c1', handle: '@escribaconcursos',      nome: 'Escriva Concursos',       seguidores_texto: '120k', ativo: true },
  { id: 'c2', handle: '@direitoseutrabalhista',  nome: 'Direito Seu Trabalhista', seguidores_texto: '890k', ativo: true },
  { id: 'c3', handle: '@drcarlospecas',          nome: 'Dr. Carlos Peças',        seguidores_texto: '45k',  ativo: true },
]

const MOCK_POSTS = [
  {
    id: 'm1', concorrente_id: 'c1', views: 487000, likes: 14200, comentarios: 932,
    hook: 'Você está estudando OAB do jeito errado — e vai reprovar de novo',
    formato: 'TALKING HEAD + LISTA',
    resumo_legenda: 'Os 5 erros que me fizeram reprovar 2 vezes e o método que usei para passar na 3ª tentativa.',
    por_que_viralizou: 'Aborda uma dor muito específica com promessa de resultado em prazo curto. Hook usa o medo do fracasso como gatilho.',
    como_adaptar: 'Criar: "3 erros que clientes cometem ao contratar advogado trabalhista".',
    performance: 'viral', url: 'https://instagram.com',
    transcricao: 'Você sabia que 70% das pessoas que fazem OAB reprovam na primeira tentativa?...',
    mkt_concorrentes: MOCK_CONCORRENTES[0],
  },
  {
    id: 'm2', concorrente_id: 'c1', views: 89000, likes: 3100, comentarios: 245,
    hook: 'Mudanças no CLT que todo trabalhador precisa conhecer em 2025',
    formato: 'TALKING HEAD', resumo_legenda: 'As 3 principais mudanças na legislação trabalhista.',
    por_que_viralizou: null,
    como_adaptar: 'Adaptar: "3 mudanças tributárias que afetam pequenas empresas em 2025".',
    performance: 'normal', url: 'https://instagram.com', transcricao: null,
    mkt_concorrentes: MOCK_CONCORRENTES[0],
  },
  {
    id: 'm3', concorrente_id: 'c2', views: 1200000, likes: 45000, comentarios: 3800,
    hook: 'Se você trabalhou de carteira assinada, você provavelmente tem dinheiro a receber',
    formato: 'TALKING HEAD + CTA', resumo_legenda: 'Muita gente sai do emprego sem saber que tem direitos que nunca foram pagos.',
    por_que_viralizou: 'Gatilho de dinheiro perdido + CTA nos comentários. Hook universal — qualquer ex-CLT se identifica.',
    como_adaptar: 'Replicar: "Se você abriu ou fechou empresa, pode ter créditos fiscais não aproveitados".',
    performance: 'viral', url: 'https://instagram.com',
    transcricao: 'Presta atenção: se você trabalhou de carteira assinada nos últimos 5 anos...',
    mkt_concorrentes: MOCK_CONCORRENTES[1],
  },
  {
    id: 'm4', concorrente_id: 'c2', views: 210000, likes: 8900, comentarios: 1200,
    hook: 'Justa causa: quando é legal e quando é abuso do empregador',
    formato: 'CARROSSEL EDUCATIVO', resumo_legenda: '7 situações em que a justa causa pode ser revertida na Justiça.',
    por_que_viralizou: 'Tema de alta busca + gatilho de injustiça. O "salva para consultar" aumentou o alcance via saves.',
    como_adaptar: 'Criar carrossel "5 cláusulas contratuais que podem ser anuladas na Justiça".',
    performance: 'viral', url: 'https://instagram.com', transcricao: null,
    mkt_concorrentes: MOCK_CONCORRENTES[1],
  },
  {
    id: 'm5', concorrente_id: 'c3', views: 54000, likes: 2100, comentarios: 180,
    hook: 'O habeas corpus que impetrei em 2 horas e soltei meu cliente',
    formato: 'TALKING HEAD + CASE', resumo_legenda: 'Caso real de como um habeas corpus bem fundamentado mudou o rumo de uma prisão preventiva.',
    por_que_viralizou: null,
    como_adaptar: 'Criar série "Casos reais de escritório" — humaniza a advocacia.',
    performance: 'normal', url: 'https://instagram.com',
    transcricao: 'Semana passada recebi uma ligação às 23h...',
    mkt_concorrentes: MOCK_CONCORRENTES[2],
  },
]

function fmtNum(n) {
  if (!n && n !== 0) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k'
  return String(n)
}

function inicialHandle(h) {
  return (h || '?').replace('@', '').charAt(0).toUpperCase()
}

function Badge({ viral }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
      background: viral ? '#fef2f4' : '#ecfdf5',
      color: viral ? '#ed5f74' : '#00d97e',
      border: `1px solid ${viral ? '#fce4e8' : '#d1fae5'}`,
      letterSpacing: 0.4, whiteSpace: 'nowrap',
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      {viral ? <Fire size={10} weight="fill" /> : <CheckCircle size={10} weight="fill" />}
      {viral ? 'VIRAL' : 'NORMAL'}
    </span>
  )
}

function PostCard({ post, onVerTranscricao }) {
  const eViral = post.performance === 'viral'
  return (
    <div style={{ ...CARD, padding: 20, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 26, fontWeight: 700, color: '#0a2540', lineHeight: 1 }}>{fmtNum(post.views)}</span>
        <span style={{ fontSize: 11, color: '#8898aa', alignSelf: 'flex-end', paddingBottom: 2 }}>views</span>
        <Badge viral={eViral} />
        {post.formato && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: '#f6f9fc', color: '#425466', border: '1px solid #e3e8ee', letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
            {post.formato}
          </span>
        )}
      </div>

      {post.hook && (
        <p style={{ fontSize: 14, fontWeight: 600, color: '#0a2540', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 10, borderLeft: '3px solid #635bff', paddingLeft: 10 }}>
          "{post.hook}"
        </p>
      )}

      {post.resumo_legenda && (
        <p style={{ fontSize: 13, color: '#425466', lineHeight: 1.6, marginBottom: 12 }}>{post.resumo_legenda}</p>
      )}

      <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: '#425466', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Heart size={13} weight="fill" color="#ed5f74" /> {fmtNum(post.likes)}
        </span>
        <span style={{ fontSize: 13, color: '#425466', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ChatCircle size={13} weight="fill" color="#8898aa" /> {fmtNum(post.comentarios)}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {post.url && (
          <a href={post.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 500, padding: '6px 12px', background: '#f6f9fc', border: '1px solid #e3e8ee', borderRadius: 7, color: '#425466', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <ArrowSquareOut size={12} /> Ver Original
          </a>
        )}
        {post.transcricao && (
          <button onClick={() => onVerTranscricao(post)} style={{ fontSize: 12, fontWeight: 500, padding: '6px 12px', background: '#f0efff', border: '1px solid #c7c5ff', borderRadius: 7, color: '#635bff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <FileText size={12} /> Ver Transcrição
          </button>
        )}
      </div>

      {post.por_que_viralizou && (
        <div style={{ background: '#f0efff', borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#635bff', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 5 }}>
            <MagnifyingGlass size={11} weight="bold" /> Por que Viralizou
          </p>
          <p style={{ fontSize: 13, color: '#4139ab', lineHeight: 1.6, margin: 0 }}>{post.por_que_viralizou}</p>
        </div>
      )}

      {post.como_adaptar && (
        <div style={{ background: '#ecfdf5', borderRadius: 8, padding: '12px 14px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#00a854', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 5 }}>
            <PencilSimple size={11} weight="bold" /> Como Adaptar
          </p>
          <p style={{ fontSize: 13, color: '#007a3c', lineHeight: 1.6, margin: 0 }}>{post.como_adaptar}</p>
        </div>
      )}
    </div>
  )
}

function TranscricaoModal({ post, onClose }) {
  if (!post) return null
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(10,37,64,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(10,37,64,0.15)', border: '1px solid #e3e8ee' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e3e8ee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 10, color: '#8898aa', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: 0.6 }}>Transcrição</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#0a2540', margin: 0 }}>{post.mkt_concorrentes?.handle}</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #e3e8ee', background: '#f6f9fc', cursor: 'pointer', fontSize: 15, color: '#8898aa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        <div style={{ padding: 24, overflowY: 'auto' }}>
          <p style={{ fontSize: 14, color: '#425466', lineHeight: 1.9, whiteSpace: 'pre-wrap', margin: 0 }}>{post.transcricao}</p>
        </div>
      </div>
    </div>
  )
}

const FILTROS = [
  { key: 'todos', label: 'Todos' },
  { key: 'virais', label: 'Virais' },
  { key: 'acima',  label: 'Acima da Média' },
]

export default function Perfis() {
  const [concorrentes, setConcorrentes] = useState([])
  const [selecionado, setSelecionado]   = useState(null)
  const [posts, setPosts]               = useState([])
  const [loadingInit, setLoadingInit]   = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [filtro, setFiltro]             = useState('todos')
  const [modalPost, setModalPost]       = useState(null)
  const [usandoMock, setUsandoMock]     = useState(false)

  useEffect(() => {
    async function init() {
      const { data } = await supabase.from('mkt_concorrentes').select('*').eq('ativo', true).order('nome')
      if (!data?.length) {
        setUsandoMock(true); setConcorrentes(MOCK_CONCORRENTES); setSelecionado(MOCK_CONCORRENTES[0])
      } else {
        setConcorrentes(data); setSelecionado(data[0])
      }
      setLoadingInit(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (!selecionado) return
    if (usandoMock) { setPosts(MOCK_POSTS.filter(p => p.concorrente_id === selecionado.id)); return }
    async function fetchPosts() {
      setLoadingPosts(true)
      const { data } = await supabase.from('mkt_posts').select('*, mkt_concorrentes(*)').eq('concorrente_id', selecionado.id).order('views', { ascending: false })
      setPosts(data || [])
      setLoadingPosts(false)
    }
    fetchPosts()
  }, [selecionado, usandoMock])

  const totalViews = posts.reduce((s, p) => s + (p.views || 0), 0)
  const mediaViews = posts.length ? Math.round(totalViews / posts.length) : 0
  const melhorPost = posts.reduce((max, p) => (p.views || 0) > (max?.views || 0) ? p : max, null)

  const postsFiltrados = useMemo(() => {
    if (filtro === 'virais') return posts.filter(p => p.performance === 'viral')
    if (filtro === 'acima')  return posts.filter(p => (p.views || 0) > mediaViews)
    return posts
  }, [posts, filtro, mediaViews])

  if (loadingInit) return <div style={{ ...CARD, padding: 56, textAlign: 'center' }}><p style={{ color: '#8898aa' }}>Carregando perfis...</p></div>

  return (
    <div style={{ maxWidth: 1200 }}>

      {/* Header */}
      <div style={{ ...CARD, padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <User size={22} weight="bold" color="#635bff" />
            <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0a2540', margin: 0, letterSpacing: '-0.3px' }}>Por Perfil</h1>
          </div>
          <p style={{ color: '#8898aa', fontSize: 14, margin: 0 }}>Análise individual por concorrente</p>
        </div>
        {usandoMock && <span style={{ fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: '#fffbeb', color: '#855900', border: '1px solid #f5be58' }}>dados mock</span>}
      </div>

      {/* Chips de concorrentes */}
      <div style={{ ...CARD, padding: '14px 16px', marginBottom: 20 }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: '#8898aa', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Concorrentes monitorados</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {concorrentes.map(c => {
            const ativo = selecionado?.id === c.id
            return (
              <button key={c.id} onClick={() => { setSelecionado(c); setFiltro('todos') }} style={{
                padding: '7px 14px', borderRadius: 24,
                border: `1px solid ${ativo ? '#635bff' : '#e3e8ee'}`,
                background: ativo ? '#635bff' : '#fff',
                color: ativo ? '#fff' : '#425466',
                cursor: 'pointer', fontSize: 13, fontWeight: ativo ? 600 : 500,
                display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
              }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: ativo ? 'rgba(255,255,255,0.25)' : '#f6f9fc', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: ativo ? '#fff' : '#635bff', flexShrink: 0 }}>
                  {inicialHandle(c.handle)}
                </span>
                {c.handle}
                {c.seguidores_texto && <span style={{ fontSize: 11, opacity: 0.75 }}>· {c.seguidores_texto}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Header do perfil */}
      {selecionado && (
        <div style={{ ...CARD, padding: '20px 24px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #635bff, #4f7df3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
              {inicialHandle(selecionado.handle)}
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 600, color: '#0a2540', margin: '0 0 2px' }}>{selecionado.nome}</p>
              <p style={{ fontSize: 13, color: '#8898aa', margin: 0 }}>
                {selecionado.handle}
                {selecionado.seguidores_texto && <span style={{ marginLeft: 8 }}>· {selecionado.seguidores_texto} seguidores</span>}
              </p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              { label: 'Posts Coletados', value: posts.length,                   Icon: Article, color: '#635bff' },
              { label: 'Média de Views',  value: fmtNum(mediaViews),              Icon: TrendUp, color: '#4f7df3' },
              { label: 'Melhor Post',     value: fmtNum(melhorPost?.views || 0) + ' views', Icon: Trophy, color: '#f5be58' },
            ].map(m => (
              <div key={m.label} style={{ background: '#f6f9fc', borderRadius: 10, padding: '14px 16px', border: '1px solid #e3e8ee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 10, color: '#8898aa', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.label}</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: '#0a2540', lineHeight: 1 }}>{m.value}</p>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${m.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <m.Icon size={16} weight="bold" color={m.color} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
        {FILTROS.map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)} style={{
            padding: '7px 16px', borderRadius: 8, fontSize: 13,
            fontWeight: filtro === f.key ? 600 : 500,
            border: `1px solid ${filtro === f.key ? '#c7c5ff' : '#e3e8ee'}`,
            background: filtro === f.key ? '#f0efff' : '#fff',
            color: filtro === f.key ? '#635bff' : '#425466',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>{f.label}</button>
        ))}
        {!loadingPosts && <span style={{ marginLeft: 'auto', fontSize: 12, color: '#8898aa' }}>{postsFiltrados.length} post{postsFiltrados.length !== 1 ? 's' : ''}</span>}
      </div>

      {loadingPosts && <div style={{ ...CARD, padding: 56, textAlign: 'center' }}><p style={{ color: '#8898aa' }}>Carregando posts...</p></div>}

      {!loadingPosts && postsFiltrados.length === 0 && (
        <div style={{ ...CARD, padding: 56, textAlign: 'center' }}>
          <Tray size={40} weight="thin" color="#8898aa" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: '#0a2540', marginBottom: 6 }}>
            {filtro !== 'todos' ? 'Nenhum post corresponde ao filtro' : 'Nenhum conteúdo coletado para este perfil'}
          </p>
          <p style={{ fontSize: 13, color: '#8898aa' }}>
            {filtro !== 'todos' ? 'Tente remover o filtro.' : `Adicione posts de ${selecionado?.handle} para começar.`}
          </p>
        </div>
      )}

      {!loadingPosts && postsFiltrados.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {postsFiltrados.map(post => <PostCard key={post.id} post={post} onVerTranscricao={setModalPost} />)}
        </div>
      )}

      <TranscricaoModal post={modalPost} onClose={() => setModalPost(null)} />
    </div>
  )
}
