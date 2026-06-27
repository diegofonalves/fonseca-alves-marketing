import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

// ── Mock data ────────────────────────────────────────────────────────
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

function calcStats(concorrentes, posts) {
  return concorrentes.map(c => {
    const cPosts = posts.filter(p => p.concorrente_id === c.id)
    const totalViews = cPosts.reduce((s, p) => s + (p.views || 0), 0)
    const avgViews   = cPosts.length ? Math.round(totalViews / cPosts.length) : 0
    const virais     = cPosts.filter(p => p.performance === 'viral').length
    const melhorPost = cPosts.reduce((max, p) => Math.max(max, p.views || 0), 0)
    return { ...c, postsCount: cPosts.length, avgViews, virais, melhorPost }
  }).sort((a, b) => b.avgViews - a.avgViews)
}

// ── Barra de progresso ───────────────────────────────────────────────
function Barra({ value, max, color = '#2563eb' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: color, borderRadius: 3,
          transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{ fontSize: 12, color: '#475569', minWidth: 44, textAlign: 'right', fontWeight: 600 }}>
        {fmtNum(value)}
      </span>
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

      if (!concs?.length) {
        setUsandoMock(true)
        setConcorrentes(MOCK_CONCORRENTES)
        setPosts(MOCK_POSTS)
      } else {
        setConcorrentes(concs)
        setPosts(ps || [])
      }
      setLoading(false)
    }
    init()
  }, [])

  const stats = useMemo(() => calcStats(concorrentes, posts), [concorrentes, posts])

  const maxAvg     = Math.max(...stats.map(s => s.avgViews), 1)
  const maxVirais  = Math.max(...stats.map(s => s.virais), 1)
  const maxMelhor  = Math.max(...stats.map(s => s.melhorPost), 1)

  const COLUNAS = [
    { label: 'Concorrente', width: '25%' },
    { label: 'Seguidores',  width: '10%' },
    { label: 'Posts',       width: '8%' },
    { label: 'Média de Views', width: '22%' },
    { label: 'Virais',      width: '15%' },
    { label: 'Melhor Post', width: '20%' },
  ]

  return (
    <div style={{ maxWidth: 1200 }}>

      {/* Header */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '18px 24px',
        marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        border: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: '0 0 2px' }}>Inteligência</h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Análise comparativa entre concorrentes monitorados</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {usandoMock && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: '#fefce8', color: '#92400e', border: '1px solid #fde68a' }}>
              dados mock
            </span>
          )}
          <span style={{ fontSize: 24 }}>🧠</span>
        </div>
      </div>

      {/* Cards de resumo */}
      {!loading && stats.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Concorrentes Monitorados', value: stats.length, icon: '👥' },
            { label: 'Posts Analisados',          value: posts.length, icon: '📋' },
            {
              label: 'Maior Média de Views',
              value: stats[0] ? `${fmtNum(stats[0].avgViews)} (${stats[0].handle})` : '—',
              icon: '🏆',
            },
          ].map(m => (
            <div key={m.label} style={{
              background: '#fff', borderRadius: 12, padding: '18px 20px',
              border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{m.label}</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{m.value}</p>
              </div>
              <span style={{ fontSize: 22 }}>{m.icon}</span>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 56, textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>Carregando dados...</p>
        </div>
      )}

      {/* Estado vazio */}
      {!loading && stats.length === 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 56, textAlign: 'center' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>📭</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>Nenhum concorrente cadastrado ainda</p>
        </div>
      )}

      {/* Tabela comparativa */}
      {!loading && stats.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

          {/* Cabeçalho */}
          <div style={{
            display: 'grid', gridTemplateColumns: COLUNAS.map(c => c.width).join(' '),
            padding: '12px 20px', background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
          }}>
            {COLUNAS.map(col => (
              <div key={col.label} style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                {col.label}
              </div>
            ))}
          </div>

          {/* Linhas */}
          {stats.map((s, i) => (
            <div key={s.id} style={{
              display: 'grid',
              gridTemplateColumns: COLUNAS.map(c => c.width).join(' '),
              padding: '16px 20px', alignItems: 'center',
              borderBottom: i < stats.length - 1 ? '1px solid #f1f5f9' : 'none',
              background: i === 0 ? '#fafbff' : '#fff',
            }}>
              {/* Concorrente */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {i === 0 && (
                  <span style={{ fontSize: 14, marginRight: 2 }}>🏆</span>
                )}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0,
                }}>
                  {inicialHandle(s.handle)}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: '0 0 1px' }}>{s.nome}</p>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{s.handle}</p>
                </div>
              </div>

              {/* Seguidores */}
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                  {s.seguidores_texto || '—'}
                </span>
              </div>

              {/* Posts */}
              <div>
                <span style={{
                  fontSize: 13, fontWeight: 700, color: '#1e293b',
                  background: '#f1f5f9', padding: '2px 8px', borderRadius: 20,
                }}>
                  {s.postsCount}
                </span>
              </div>

              {/* Média de Views */}
              <div style={{ paddingRight: 16 }}>
                <Barra value={s.avgViews} max={maxAvg} color="#2563eb" />
              </div>

              {/* Virais */}
              <div style={{ paddingRight: 16 }}>
                <Barra value={s.virais} max={maxVirais} color="#ef4444" />
              </div>

              {/* Melhor Post */}
              <div style={{ paddingRight: 8 }}>
                <Barra value={s.melhorPost} max={maxMelhor} color="#22c55e" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legenda */}
      {!loading && stats.length > 0 && (
        <div style={{ display: 'flex', gap: 20, marginTop: 14, paddingLeft: 4 }}>
          {[
            { color: '#2563eb', label: 'Média de Views' },
            { color: '#ef4444', label: 'Conteúdos Virais' },
            { color: '#22c55e', label: 'Melhor Post' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{l.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
