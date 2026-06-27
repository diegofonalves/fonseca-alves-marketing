import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Lightbulb, Tray } from '@phosphor-icons/react'

const HOJE = new Date().toISOString().slice(0, 10)
const DIAS_SEMANA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DIAS_SEMANA_LONGO = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const MESES_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const CARD = { background: '#fff', borderRadius: 12, border: '1px solid #e3e8ee', boxShadow: '0 2px 5px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }

const MOCK_INSIGHTS = [
  { id: 'i1', data: HOJE, insight: 'Conteúdos com hook de "valor a receber" performam 3× mais que informativos puros. Priorizar esse formato nas próximas semanas.' },
  { id: 'i2', data: HOJE, insight: 'Posts publicados entre 18h–20h têm em média 40% mais views. Testar publicação nesse horário esta semana.' },
  { id: 'i3', data: HOJE, insight: 'CTAs de comentário ("comenta QUERO SABER") geram mais alcance orgânico que CTAs com link. Adotar esse padrão nos próximos carrosséis.' },
  { id: 'i4', data: HOJE, insight: 'Formato carrossel com "salva para consultar" acumula mais saves que reels — sinal importante para o algoritmo de distribuição.' },
]

function dataBotao(iso) { const [, m, d] = iso.split('-'); return { dia: d, mes: m } }
function diaSemana(iso) { const [y, m, d] = iso.split('-').map(Number); return DIAS_SEMANA_CURTO[new Date(y, m - 1, d).getDay()] }
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
      const trintaDiasAtras = new Date(); trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)
      const { data: datas } = await supabase.from('mkt_insights').select('data').gte('data', trintaDiasAtras.toISOString().slice(0, 10)).order('data', { ascending: false })
      if (!datas?.length) {
        setUsandoMock(true); setDatasDisponiveis([HOJE]); setInsights(MOCK_INSIGHTS); setDataSelecionada(HOJE); setLoading(false); return
      }
      const unique = [...new Set(datas.map(r => r.data))]
      setDatasDisponiveis(unique); setDataSelecionada(unique[0])
    }
    init()
  }, [])

  useEffect(() => {
    if (!dataSelecionada || usandoMock) return
    async function fetch() {
      setLoading(true)
      const { data } = await supabase.from('mkt_insights').select('*').eq('data', dataSelecionada).order('criado_em', { ascending: true })
      setInsights(data || []); setLoading(false)
    }
    fetch()
  }, [dataSelecionada, usandoMock])

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ ...CARD, padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Lightbulb size={22} weight="bold" color="#635bff" />
            <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0a2540', margin: 0, letterSpacing: '-0.3px' }}>Insights</h1>
          </div>
          <p style={{ color: '#8898aa', fontSize: 14, margin: 0 }}>{dataSelecionada ? dataLonga(dataSelecionada) : 'Carregando...'}</p>
        </div>
        {usandoMock && <span style={{ fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: '#fffbeb', color: '#855900', border: '1px solid #f5be58' }}>dados mock</span>}
      </div>

      {datasDisponiveis.length > 0 && (
        <div style={{ ...CARD, padding: '14px 16px', marginBottom: 20 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#8898aa', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Datas disponíveis</p>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {datasDisponiveis.map(data => {
              const ativa = data === dataSelecionada
              const { dia, mes } = dataBotao(data)
              return (
                <button key={data} onClick={() => setDataSelecionada(data)} style={{ flexShrink: 0, minWidth: 52, padding: '7px 10px', borderRadius: 8, border: `1px solid ${ativa ? '#635bff' : '#e3e8ee'}`, background: ativa ? '#635bff' : '#fff', color: ativa ? '#fff' : '#425466', cursor: 'pointer', fontSize: 12, fontWeight: ativa ? 700 : 500, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, transition: 'all 0.15s' }}>
                  <span style={{ fontSize: 9, opacity: 0.75, textTransform: 'uppercase', letterSpacing: 0.3 }}>{diaSemana(data)}</span>
                  <span>{dia}/{mes}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {loading && <div style={{ ...CARD, padding: 56, textAlign: 'center' }}><p style={{ color: '#8898aa' }}>Carregando insights...</p></div>}

      {!loading && insights.length === 0 && (
        <div style={{ ...CARD, padding: 56, textAlign: 'center' }}>
          <Tray size={40} weight="thin" color="#8898aa" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: '#0a2540', marginBottom: 6 }}>Nenhum insight registrado para este dia</p>
          <p style={{ fontSize: 13, color: '#8898aa' }}>Os insights são adicionados manualmente após análise dos dados do dia.</p>
        </div>
      )}

      {!loading && insights.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {insights.map((item, i) => (
            <div key={item.id || i} style={{ ...CARD, padding: '20px 24px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fffbeb', border: '1px solid #f5be58', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Lightbulb size={18} weight="fill" color="#f5be58" />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#8898aa', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Insight #{i + 1}</p>
                <p style={{ fontSize: 14, color: '#0a2540', lineHeight: 1.7, margin: 0 }}>{item.insight}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
