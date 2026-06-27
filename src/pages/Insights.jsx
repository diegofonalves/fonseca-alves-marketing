import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const HOJE = new Date().toISOString().slice(0, 10)
const DIAS_SEMANA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DIAS_SEMANA_LONGO = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const MESES_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

const MOCK_INSIGHTS = [
  { id: 'i1', data: HOJE, insight: 'Conteúdos com hook de "valor a receber" performam 3× mais que informativos puros. Priorizar esse formato nas próximas semanas.' },
  { id: 'i2', data: HOJE, insight: 'Posts publicados entre 18h–20h têm em média 40% mais views. Testar publicação nesse horário esta semana.' },
  { id: 'i3', data: HOJE, insight: 'CTAs de comentário ("comenta QUERO SABER") geram mais alcance orgânico que CTAs com link. Adotar esse padrão nos próximos carrosséis.' },
  { id: 'i4', data: HOJE, insight: 'Formato carrossel com "salva para consultar" acumula mais saves que reels — sinal importante para o algoritmo de distribuição.' },
]

function dataBotao(iso) {
  const [, m, d] = iso.split('-')
  return { dia: d, mes: m }
}

function diaSemana(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return DIAS_SEMANA_CURTO[new Date(y, m - 1, d).getDay()]
}

function dataLonga(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return `${DIAS_SEMANA_LONGO[dt.getDay()]}, ${d} de ${MESES_PT[m - 1]} de ${y}`
}

export default function Insights() {
  const [dataSelecionada, setDataSelecionada] = useState(null)
  const [datasDisponiveis, setDatasDisponiveis] = useState([])
  const [insights, setInsights]               = useState([])
  const [loading, setLoading]                 = useState(true)
  const [usandoMock, setUsandoMock]           = useState(false)

  useEffect(() => {
    async function init() {
      setLoading(true)
      const trintaDiasAtras = new Date()
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)
      const inicio = trintaDiasAtras.toISOString().slice(0, 10)

      const { data: datas } = await supabase
        .from('mkt_insights')
        .select('data')
        .gte('data', inicio)
        .order('data', { ascending: false })

      if (!datas?.length) {
        setUsandoMock(true)
        setDatasDisponiveis([HOJE])
        setInsights(MOCK_INSIGHTS)
        setDataSelecionada(HOJE)
        setLoading(false)
        return
      }

      const unique = [...new Set(datas.map(r => r.data))]
      setDatasDisponiveis(unique)
      setDataSelecionada(unique[0])
    }
    init()
  }, [])

  useEffect(() => {
    if (!dataSelecionada || usandoMock) return
    async function fetchInsights() {
      setLoading(true)
      const { data } = await supabase
        .from('mkt_insights')
        .select('*')
        .eq('data', dataSelecionada)
        .order('criado_em', { ascending: true })
      setInsights(data || [])
      setLoading(false)
    }
    fetchInsights()
  }, [dataSelecionada, usandoMock])

  return (
    <div style={{ maxWidth: 900 }}>

      {/* Header */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '18px 24px',
        marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        border: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: '0 0 2px' }}>Insights</h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
            {dataSelecionada ? dataLonga(dataSelecionada) : 'Carregando...'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {usandoMock && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: '#fefce8', color: '#92400e', border: '1px solid #fde68a' }}>
              dados mock
            </span>
          )}
          <span style={{ fontSize: 24 }}>💡</span>
        </div>
      </div>

      {/* Seletor de datas */}
      {datasDisponiveis.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: '14px 16px', marginBottom: 20, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>
            Datas disponíveis
          </p>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {datasDisponiveis.map(data => {
              const ativa = data === dataSelecionada
              const { dia, mes } = dataBotao(data)
              return (
                <button key={data} onClick={() => setDataSelecionada(data)} style={{
                  flexShrink: 0, minWidth: 52, padding: '7px 10px', borderRadius: 8,
                  border: `1px solid ${ativa ? '#2563eb' : '#e2e8f0'}`,
                  background: ativa ? '#2563eb' : '#f8fafc',
                  color: ativa ? '#fff' : '#475569',
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

      {/* Loading */}
      {loading && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 56, textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>Carregando insights...</p>
        </div>
      )}

      {/* Estado vazio */}
      {!loading && insights.length === 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 56, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>📭</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>Nenhum insight registrado para este dia</p>
          <p style={{ fontSize: 13, color: '#94a3b8' }}>Os insights são adicionados manualmente após análise dos dados do dia.</p>
        </div>
      )}

      {/* Cards de insights */}
      {!loading && insights.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {insights.map((item, i) => (
            <div key={item.id || i} style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
              padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              display: 'flex', gap: 16, alignItems: 'flex-start',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: '#fefce8',
                border: '1px solid #fde68a', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 18, flexShrink: 0,
              }}>
                💡
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                  Insight #{i + 1}
                </p>
                <p style={{ fontSize: 14, color: '#1e293b', lineHeight: 1.7, margin: 0 }}>
                  {item.insight}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
