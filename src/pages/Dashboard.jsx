import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import {
  ChartBar, Eye, TrendUp, Fire, Bell, CalendarBlank,
  Fire as FireIcon, CheckCircle, ArrowSquareOut, FileText,
  MagnifyingGlass, PencilSimple, Heart, ChatCircle, Tray,
} from '@phosphor-icons/react'

// ── Constantes ────────────────────────────────────────────────────────
const HOJE = new Date().toISOString().slice(0, 10)
const DIAS_SEMANA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DIAS_SEMANA_LONGO = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const MESES_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

const CARD = {
  background: '#fff',
  borderRadius: 12,
  border: '1px solid #e3e8ee',
  boxShadow: '0 2px 5px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
}

// ── Mock data ─────────────────────────────────────────────────────────
const MOCK_POSTS = [
  {
    id: 'm1', concorrente_id: 'c1', data_coleta: HOJE,
    views: 487000, likes: 14200, comentarios: 932,
    hook: 'Você está estudando OAB do jeito errado — e vai reprovar de novo',
    formato: 'TALKING HEAD + LISTA',
    resumo_legenda: 'Os 5 erros que me fizeram reprovar 2 vezes e o método que usei para passar na 3ª tentativa.',
    por_que_viralizou: 'Aborda uma dor muito específica com promessa de resultado em prazo curto. O hook usa o medo do fracasso como gatilho.',
    como_adaptar: 'Criar: "3 erros que clientes cometem ao contratar advogado trabalhista" — mesmo gatilho de medo + promessa de solução.',
    performance: 'viral', url: 'https://instagram.com',
    transcricao: 'Você sabia que 70% das pessoas que fazem OAB reprovam na primeira tentativa? Eu fui uma delas. Duas vezes...',
    mkt_concorrentes: { id: 'c1', handle: '@escribaconcursos', nome: 'Escriva Concursos', seguidores_texto: '120k' },
  },
  {
    id: 'm2', concorrente_id: 'c1', data_coleta: HOJE,
    views: 89000, likes: 3100, comentarios: 245,
    hook: 'Mudanças no CLT que todo trabalhador precisa conhecer em 2025',
    formato: 'TALKING HEAD',
    resumo_legenda: 'As 3 principais mudanças na legislação trabalhista que entram em vigor esse ano.',
    por_que_viralizou: null,
    como_adaptar: 'Adaptar: "3 mudanças tributárias que afetam pequenas empresas em 2025" — mesmo formato informativo.',
    performance: 'normal', url: 'https://instagram.com', transcricao: null,
    mkt_concorrentes: { id: 'c1', handle: '@escribaconcursos', nome: 'Escriva Concursos', seguidores_texto: '120k' },
  },
  {
    id: 'm3', concorrente_id: 'c2', data_coleta: HOJE,
    views: 1200000, likes: 45000, comentarios: 3800,
    hook: 'Se você trabalhou de carteira assinada, você provavelmente tem dinheiro a receber',
    formato: 'TALKING HEAD + CTA',
    resumo_legenda: 'Muita gente sai do emprego sem saber que tem direitos que nunca foram pagos.',
    por_que_viralizou: 'Gatilho de dinheiro perdido + CTA nos comentários criou engajamento massivo. Hook universal — qualquer ex-CLT se identifica.',
    como_adaptar: 'Replicar: "Se você abriu ou fechou empresa, pode ter créditos fiscais não aproveitados" — mesmo gatilho.',
    performance: 'viral', url: 'https://instagram.com',
    transcricao: 'Presta atenção: se você trabalhou de carteira assinada nos últimos 5 anos, é bem provável que tenha dinheiro a receber...',
    mkt_concorrentes: { id: 'c2', handle: '@direitoseutrabalhista', nome: 'Direito Seu Trabalhista', seguidores_texto: '890k' },
  },
  {
    id: 'm4', concorrente_id: 'c2', data_coleta: HOJE,
    views: 210000, likes: 8900, comentarios: 1200,
    hook: 'Justa causa: quando é legal e quando é abuso do empregador',
    formato: 'CARROSSEL EDUCATIVO',
    resumo_legenda: '7 situações em que a justa causa pode ser revertida na Justiça.',
    por_que_viralizou: 'Tema de alta busca + gatilho de injustiça. O "salva para consultar" aumentou o alcance via saves.',
    como_adaptar: 'Criar carrossel "5 cláusulas contratuais que podem ser anuladas na Justiça".',
    performance: 'viral', url: 'https://instagram.com', transcricao: null,
    mkt_concorrentes: { id: 'c2', handle: '@direitoseutrabalhista', nome: 'Direito Seu Trabalhista', seguidores_texto: '890k' },
  },
]

// ── Helpers ───────────────────────────────────────────────────────────
function fmtNum(n) {
  if (!n && n !== 0) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k'
  return String(n)
}

function dataBotao(iso) {
  const [, m, d] = iso.split('-')
  return { dia: d, mes: m }
}

function dataLonga(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${DIAS_SEMANA_LONGO[dt.getDay()]}, ${d} de ${MESES_PT[m - 1]} de ${y}`
}

function diaSemana(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return DIAS_SEMANA_CURTO[new Date(y, m - 1, d).getDay()]
}

function inicialHandle(h) {
  return (h || '?').replace('@', '').charAt(0).toUpperCase()
}

// ── MetricCard ────────────────────────────────────────────────────────
function MetricCard({ label, value, Icon, color }) {
  return (
    <div style={{ ...CARD, padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#8898aa', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
            {label}
          </p>
          <p style={{ fontSize: 28, fontWeight: 700, color: color || '#0a2540', lineHeight: 1 }}>
            {value}
          </p>
        </div>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: color ? `${color}18` : '#f6f9fc',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} weight="bold" color={color || '#425466'} />
        </div>
      </div>
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────
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

// ── PostCard ──────────────────────────────────────────────────────────
function PostCard({ post, onVerTranscricao }) {
  const eViral = post.performance === 'viral'
  return (
    <div style={{ ...CARD, padding: 20, display: 'flex', flexDirection: 'column' }}>
      {/* Views + Badge + Formato */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 26, fontWeight: 700, color: '#0a2540', lineHeight: 1 }}>
          {fmtNum(post.views)}
        </span>
        <span style={{ fontSize: 11, color: '#8898aa', alignSelf: 'flex-end', paddingBottom: 2 }}>views</span>
        <Badge viral={eViral} />
        {post.formato && (
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
            background: '#f6f9fc', color: '#425466', border: '1px solid #e3e8ee',
            letterSpacing: 0.3, whiteSpace: 'nowrap',
          }}>
            {post.formato}
          </span>
        )}
      </div>

      {/* Hook — fallback para titulo se hook for null */}
      {(post.hook || post.titulo)?.trim() && (
        <p style={{
          fontSize: 14, fontWeight: 600, color: '#0a2540', fontStyle: 'italic',
          lineHeight: 1.5, marginBottom: 10,
          borderLeft: '3px solid #635bff', paddingLeft: 10,
        }}>
          "{(post.hook || post.titulo).trim()}"
        </p>
      )}

      {/* Resumo */}
      {post.resumo_legenda?.trim() && (
        <p style={{ fontSize: 13, color: '#425466', lineHeight: 1.6, marginBottom: 12 }}>
          {post.resumo_legenda}
        </p>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
        <span style={{ fontSize: 13, color: '#425466', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Heart size={13} weight="fill" color="#ed5f74" /> {fmtNum(post.likes)}
        </span>
        <span style={{ fontSize: 13, color: '#425466', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ChatCircle size={13} weight="fill" color="#8898aa" /> {fmtNum(post.comentarios)}
        </span>
      </div>

      {/* Botões */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {post.url && (
          <a href={post.url} target="_blank" rel="noopener noreferrer" style={{
            fontSize: 12, fontWeight: 500, padding: '6px 12px',
            background: '#f6f9fc', border: '1px solid #e3e8ee',
            borderRadius: 7, color: '#425466', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            <ArrowSquareOut size={12} /> Ver Original
          </a>
        )}
        {post.transcricao?.trim() && (
          <button onClick={() => onVerTranscricao(post)} style={{
            fontSize: 12, fontWeight: 500, padding: '6px 12px',
            background: '#f0efff', border: '1px solid #c7c5ff',
            borderRadius: 7, color: '#635bff', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            <FileText size={12} /> Ver Transcrição
          </button>
        )}
      </div>

      {/* Por que Viralizou */}
      {post.por_que_viralizou?.trim() && (
        <div style={{ background: '#f0efff', borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
          <p style={{
            fontSize: 10, fontWeight: 700, color: '#635bff', marginBottom: 5,
            textTransform: 'uppercase', letterSpacing: 0.5,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <MagnifyingGlass size={11} weight="bold" /> Por que Viralizou
          </p>
          <p style={{ fontSize: 13, color: '#4139ab', lineHeight: 1.6, margin: 0 }}>
            {post.por_que_viralizou}
          </p>
        </div>
      )}

      {/* Como Adaptar */}
      {post.como_adaptar?.trim() && (
        <div style={{ background: '#ecfdf5', borderRadius: 8, padding: '12px 14px' }}>
          <p style={{
            fontSize: 10, fontWeight: 700, color: '#00a854', marginBottom: 5,
            textTransform: 'uppercase', letterSpacing: 0.5,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <PencilSimple size={11} weight="bold" /> Como Adaptar
          </p>
          <p style={{ fontSize: 13, color: '#007a3c', lineHeight: 1.6, margin: 0 }}>
            {post.como_adaptar}
          </p>
        </div>
      )}
    </div>
  )
}

// ── TranscricaoModal ──────────────────────────────────────────────────
function TranscricaoModal({ post, onClose }) {
  if (!post) return null
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(10,37,64,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 16, width: '100%', maxWidth: 600,
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(10,37,64,0.15)',
        border: '1px solid #e3e8ee',
      }}>
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid #e3e8ee',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize: 10, color: '#8898aa', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: 0.6 }}>Transcrição</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#0a2540', margin: 0 }}>
              {post.mkt_concorrentes?.handle}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: '50%',
            border: '1px solid #e3e8ee', background: '#f6f9fc',
            cursor: 'pointer', fontSize: 15, color: '#8898aa',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>
        <div style={{ padding: 24, overflowY: 'auto' }}>
          <p style={{ fontSize: 14, color: '#425466', lineHeight: 1.9, whiteSpace: 'pre-wrap', margin: 0 }}>
            {post.transcricao}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Filtros ───────────────────────────────────────────────────────────
const FILTROS = [
  { key: 'todos',  label: 'Todos' },
  { key: 'virais', label: 'Virais' },
  { key: 'acima',  label: 'Acima da Média' },
]

export default function Dashboard() {
  const [dataSelecionada, setDataSelecionada]   = useState(null)
  const [datasDisponiveis, setDatasDisponiveis] = useState([])
  const [todosPosts, setTodosPosts]             = useState([])
  const [alertasCount, setAlertasCount]         = useState(0)
  const [diasMonitorados, setDiasMonitorados]   = useState(0)
  const [loading, setLoading]                   = useState(true)
  const [filtro, setFiltro]                     = useState('todos')
  const [modalPost, setModalPost]               = useState(null)
  const [usandoMock, setUsandoMock]             = useState(false)

  useEffect(() => {
    async function init() {
      setLoading(true)
      const trintaDiasAtras = new Date()
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)
      const inicio = trintaDiasAtras.toISOString().slice(0, 10)

      const [
        { data: datas },
        { count: alertas },
        { data: todosDias },
      ] = await Promise.all([
        supabase.from('mkt_posts').select('data_coleta').gte('data_coleta', inicio).order('data_coleta', { ascending: false }),
        supabase.from('mkt_alertas').select('*', { count: 'exact', head: true }),
        supabase.from('mkt_posts').select('data_coleta'),
      ])

      setAlertasCount(alertas || 0)
      setDiasMonitorados(new Set((todosDias || []).map(r => r.data_coleta)).size)

      if (!datas?.length) {
        setUsandoMock(true)
        setDatasDisponiveis([HOJE])
        setTodosPosts(MOCK_POSTS)
        setDataSelecionada(HOJE)
        setLoading(false)
        return
      }

      const unique = [...new Set(datas.map(r => r.data_coleta))]
      setDatasDisponiveis(unique)
      setDataSelecionada(unique[0])
    }
    init()
  }, [])

  useEffect(() => {
    if (!dataSelecionada || usandoMock) return
    async function fetchPosts() {
      setLoading(true)
      const { data } = await supabase
        .from('mkt_posts').select('*, mkt_concorrentes(*)')
        .eq('data_coleta', dataSelecionada).order('views', { ascending: false })
      setTodosPosts(data || [])
      setLoading(false)
    }
    fetchPosts()
  }, [dataSelecionada, usandoMock])

  const totalViews  = todosPosts.reduce((s, p) => s + (p.views || 0), 0)
  const mediaViews  = todosPosts.length ? Math.round(totalViews / todosPosts.length) : 0
  const viraisCount = todosPosts.filter(p => p.performance === 'viral').length

  const postsFiltrados = useMemo(() => {
    if (filtro === 'virais') return todosPosts.filter(p => p.performance === 'viral')
    if (filtro === 'acima')  return todosPosts.filter(p => (p.views || 0) > mediaViews)
    return todosPosts
  }, [todosPosts, filtro, mediaViews])

  const grupos = useMemo(() => {
    const map = {}
    postsFiltrados.forEach(post => {
      const key = post.concorrente_id || 'unknown'
      if (!map[key]) map[key] = { concorrente: post.mkt_concorrentes, posts: [] }
      map[key].posts.push(post)
    })
    return Object.values(map)
  }, [postsFiltrados])

  return (
    <div style={{ maxWidth: 1200 }}>

      {/* Header */}
      <div style={{ ...CARD, padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <ChartBar size={22} weight="bold" color="#635bff" />
            <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0a2540', margin: 0, letterSpacing: '-0.3px' }}>Por Dia</h1>
          </div>
          <p style={{ color: '#8898aa', fontSize: 14, margin: 0 }}>
            {dataSelecionada ? dataLonga(dataSelecionada) : 'Carregando...'}
          </p>
        </div>
        {usandoMock && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: '#fffbeb', color: '#855900', border: '1px solid #f5be58' }}>
            dados mock
          </span>
        )}
      </div>

      {/* Métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
        <MetricCard label="Total de Views"   value={fmtNum(totalViews)}  Icon={Eye}           />
        <MetricCard label="Média de Views"   value={fmtNum(mediaViews)}  Icon={TrendUp}       />
        <MetricCard label="Conteúdos Virais" value={viraisCount}         Icon={Fire}          color="#ed5f74" />
        <MetricCard label="Alertas Ativos"   value={alertasCount}        Icon={Bell}          color="#f5be58" />
        <MetricCard label="Dias Monitorados" value={diasMonitorados}     Icon={CalendarBlank} color="#635bff" />
      </div>

      {/* Seletor de datas */}
      {datasDisponiveis.length > 0 && (
        <div style={{ ...CARD, padding: '14px 16px', marginBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#8898aa', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
            Datas disponíveis
          </p>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {datasDisponiveis.map(data => {
              const ativa = data === dataSelecionada
              const { dia, mes } = dataBotao(data)
              return (
                <button key={data} onClick={() => setDataSelecionada(data)} style={{
                  flexShrink: 0, minWidth: 52, padding: '7px 10px', borderRadius: 8,
                  border: `1px solid ${ativa ? '#635bff' : '#e3e8ee'}`,
                  background: ativa ? '#635bff' : '#fff',
                  color: ativa ? '#fff' : '#425466',
                  cursor: 'pointer', fontSize: 12, fontWeight: ativa ? 700 : 500,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                  transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: 9, opacity: 0.75, textTransform: 'uppercase', letterSpacing: 0.3 }}>{diaSemana(data)}</span>
                  <span>{dia}/{mes}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 22, alignItems: 'center' }}>
        {FILTROS.map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)} style={{
            padding: '7px 16px', borderRadius: 8, fontSize: 13,
            fontWeight: filtro === f.key ? 600 : 500,
            border: `1px solid ${filtro === f.key ? '#c7c5ff' : '#e3e8ee'}`,
            background: filtro === f.key ? '#f0efff' : '#fff',
            color: filtro === f.key ? '#635bff' : '#425466',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {f.label}
          </button>
        ))}
        {!loading && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#8898aa' }}>
            {postsFiltrados.length} post{postsFiltrados.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ ...CARD, padding: 56, textAlign: 'center' }}>
          <p style={{ color: '#8898aa', fontSize: 14 }}>Carregando...</p>
        </div>
      )}

      {/* Vazio */}
      {!loading && postsFiltrados.length === 0 && (
        <div style={{ ...CARD, padding: 56, textAlign: 'center' }}>
          <Tray size={40} weight="thin" color="#8898aa" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: '#0a2540', marginBottom: 6 }}>
            Nenhum conteúdo registrado para este dia
          </p>
          <p style={{ fontSize: 13, color: '#8898aa', marginBottom: filtro === 'todos' ? 24 : 0 }}>
            {filtro !== 'todos' ? 'Nenhum post corresponde ao filtro selecionado.' : 'Adicione conteúdos monitorados para esta data.'}
          </p>
          {filtro === 'todos' && (
            <button style={{
              padding: '9px 20px', background: '#635bff', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              + Adicionar Conteúdo Manualmente
            </button>
          )}
        </div>
      )}

      {/* Grupos */}
      {!loading && grupos.map((grupo, i) => (
        <div key={grupo.concorrente?.id || i} style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #e3e8ee' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'linear-gradient(135deg, #635bff, #4f7df3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {inicialHandle(grupo.concorrente?.handle)}
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#0a2540', margin: '0 0 2px' }}>
                {grupo.concorrente?.nome}
              </p>
              <p style={{ fontSize: 12, color: '#8898aa', margin: 0 }}>
                {grupo.concorrente?.handle}
                {grupo.concorrente?.seguidores_texto && (
                  <span style={{ marginLeft: 8 }}>· {grupo.concorrente.seguidores_texto} seguidores</span>
                )}
              </p>
            </div>
            <span style={{
              marginLeft: 'auto', fontSize: 12, color: '#425466',
              background: '#f6f9fc', padding: '3px 10px', borderRadius: 20, border: '1px solid #e3e8ee',
            }}>
              {grupo.posts.length} post{grupo.posts.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {grupo.posts.map(post => (
              <PostCard key={post.id} post={post} onVerTranscricao={setModalPost} />
            ))}
          </div>
        </div>
      ))}

      <TranscricaoModal post={modalPost} onClose={() => setModalPost(null)} />
    </div>
  )
}
