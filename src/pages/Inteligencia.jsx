import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Brain, Users, Article, Trophy, Tray } from '@phosphor-icons/react'

const CARD = { background: '#fff', borderRadius: 12, border: '1px solid #e3e8ee', boxShadow: '0 2px 5px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }

const MOCK_CONCORRENTES = [
  { id: 'c1', handle: '@escribaconcursos',      nome: 'Escriva Concursos',       seguidores_texto: '120k', ativo: true },
  { id: 'c2', handle: '@direitoseutrabalhista',  nome: 'Direito Seu Trabalhista', seguidores_texto: '890k', ativo: true },
  { id: 'c3', handle: '@drcarlospecas',          nome: 'Dr. Carlos Peças',        seguidores_texto: '45k',  ativo: true },
]
const MOCK_POSTS = [
  { concorrente_id: 'c1', views: 487000, performance: 'viral' },
  { concorrente_id: 'c1', views: 89000,  performance: 'normal' },
  { concorrente_id: 'c2', views: 1200000, performance: 'viral' },
  { concorrente_id: 'c2', views: 210000,  performance: 'viral' },
  { concorrente_id: 'c3', views: 54000,   performance: 'normal' },
]

function fmtNum(n) {
  if (!n && n !== 0) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k'
  return String(n)
}

function inicialHandle(h) { return (h || '?').replace('@', '').charAt(0).toUpperCase() }

function calcStats(concorrentes, posts) {
  return concorrentes.map(c => {
    const cPosts   = posts.filter(p => p.concorrente_id === c.id)
    const totalV   = cPosts.reduce((s, p) => s + (p.views || 0), 0)
    const avgViews = cPosts.length ? Math.round(totalV / cPosts.length) : 0
    const virais   = cPosts.filter(p => p.performance === 'viral').length
    const melhor   = cPosts.reduce((max, p) => Math.max(max, p.views || 0), 0)
    return { ...c, postsCount: cPosts.length, avgViews, virais, melhorPost: melhor }
  }).sort((a, b) => b.avgViews - a.avgViews)
}

function Barra({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: '#f6f9fc', borderRadius: 3, overflow: 'hidden', border: '1px solid #e3e8ee' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: 12, color: '#425466', minWidth: 44, textAlign: 'right', fontWeight: 600 }}>{fmtNum(value)}</span>
    </div>
  )
}

export default function Inteligencia() {
  const [concorrentes, setConcorrentes] = useState([])
  const [posts, setPosts]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [usandoMock, setUsandoMock]     = useState(false)

  useEffect(() => {
    async function init() {
      setLoading(true)
      const [{ data: concs }, { data: ps }] = await Promise.all([
        supabase.from('mkt_concorrentes').select('*').eq('ativo', true).order('nome'),
        supabase.from('mkt_posts').select('concorrente_id, views, performance'),
      ])
      if (!concs?.length) { setUsandoMock(true); setConcorrentes(MOCK_CONCORRENTES); setPosts(MOCK_POSTS) }
      else { setConcorrentes(concs); setPosts(ps || []) }
      setLoading(false)
    }
    init()
  }, [])

  const stats = useMemo(() => calcStats(concorrentes, posts), [concorrentes, posts])
  const maxAvg    = Math.max(...stats.map(s => s.avgViews), 1)
  const maxVirais = Math.max(...stats.map(s => s.virais), 1)
  const maxMelhor = Math.max(...stats.map(s => s.melhorPost), 1)

  const COLS = ['25%', '10%', '8%', '22%', '15%', '20%']
  const COL_LABELS = ['Concorrente', 'Seguidores', 'Posts', 'Média de Views', 'Virais', 'Melhor Post']

  return (
    <div style={{ maxWidth: 1200 }}>
      <div style={{ ...CARD, padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Brain size={22} weight="bold" color="#635bff" />
            <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0a2540', margin: 0, letterSpacing: '-0.3px' }}>Inteligência</h1>
          </div>
          <p style={{ color: '#8898aa', fontSize: 14, margin: 0 }}>Análise comparativa entre concorrentes monitorados</p>
        </div>
        {usandoMock && <span style={{ fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: '#fffbeb', color: '#855900', border: '1px solid #f5be58' }}>dados mock</span>}
      </div>

      {!loading && stats.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Concorrentes Monitorados', value: stats.length,  Icon: Users,   color: '#635bff' },
            { label: 'Posts Analisados',          value: posts.length,  Icon: Article, color: '#4f7df3' },
            { label: 'Maior Média de Views',       value: stats[0] ? `${fmtNum(stats[0].avgViews)}` : '—', Icon: Trophy, color: '#f5be58' },
          ].map(m => (
            <div key={m.label} style={{ ...CARD, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, color: '#8898aa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{m.label}</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#0a2540', lineHeight: 1 }}>{m.value}</p>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: `${m.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <m.Icon size={18} weight="bold" color={m.color} />
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && <div style={{ ...CARD, padding: 56, textAlign: 'center' }}><p style={{ color: '#8898aa' }}>Carregando dados...</p></div>}

      {!loading && stats.length === 0 && (
        <div style={{ ...CARD, padding: 56, textAlign: 'center' }}>
          <Tray size={40} weight="thin" color="#8898aa" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: '#0a2540' }}>Nenhum concorrente cadastrado ainda</p>
        </div>
      )}

      {!loading && stats.length > 0 && (
        <div style={{ ...CARD, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: COLS.join(' '), padding: '12px 20px', background: '#f6f9fc', borderBottom: '1px solid #e3e8ee' }}>
            {COL_LABELS.map(l => <div key={l} style={{ fontSize: 10, fontWeight: 700, color: '#8898aa', textTransform: 'uppercase', letterSpacing: 0.6 }}>{l}</div>)}
          </div>
          {stats.map((s, i) => (
            <div key={s.id} style={{ display: 'grid', gridTemplateColumns: COLS.join(' '), padding: '16px 20px', alignItems: 'center', borderBottom: i < stats.length - 1 ? '1px solid #f6f9fc' : 'none', background: i === 0 ? '#fafbff' : '#fff' }}>
              {/* Concorrente */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {i === 0 && <Trophy size={14} weight="fill" color="#f5be58" />}
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #635bff, #4f7df3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {inicialHandle(s.handle)}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0a2540', margin: '0 0 1px' }}>{s.nome}</p>
                  <p style={{ fontSize: 11, color: '#8898aa', margin: 0 }}>{s.handle}</p>
                </div>
              </div>
              {/* Seguidores */}
              <span style={{ fontSize: 13, fontWeight: 600, color: '#425466' }}>{s.seguidores_texto || '—'}</span>
              {/* Posts */}
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0a2540', background: '#f6f9fc', padding: '2px 8px', borderRadius: 20, display: 'inline-block' }}>{s.postsCount}</span>
              {/* Avg Views */}
              <div style={{ paddingRight: 16 }}><Barra value={s.avgViews}   max={maxAvg}    color="#635bff" /></div>
              {/* Virais */}
              <div style={{ paddingRight: 16 }}><Barra value={s.virais}    max={maxVirais} color="#ed5f74" /></div>
              {/* Melhor */}
              <div style={{ paddingRight: 8 }}>  <Barra value={s.melhorPost} max={maxMelhor} color="#00d97e" /></div>
            </div>
          ))}
        </div>
      )}

      {!loading && stats.length > 0 && (
        <div style={{ display: 'flex', gap: 20, marginTop: 12, paddingLeft: 4 }}>
          {[{ color: '#635bff', label: 'Média de Views' }, { color: '#ed5f74', label: 'Virais' }, { color: '#00d97e', label: 'Melhor Post' }].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
              <span style={{ fontSize: 11, color: '#8898aa' }}>{l.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
