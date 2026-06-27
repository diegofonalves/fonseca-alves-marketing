import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Bell, ArrowSquareOut, Tray } from '@phosphor-icons/react'

const HOJE = new Date().toISOString().slice(0, 10)
const DIAS_SEMANA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const DIAS_SEMANA_LONGO = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const MESES_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const CARD = { background: '#fff', borderRadius: 12, border: '1px solid #e3e8ee', boxShadow: '0 2px 5px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }

const MOCK_ALERTAS = [
  { id: 'a1', data: HOJE, titulo: 'STJ define prazo prescricional para revisão de contratos bancários', resumo: 'A 3ª Turma do STJ firmou entendimento de que o prazo para ação de revisão de contrato bancário com cláusulas abusivas é de 5 anos, contados da data de cada cobrança indevida.', fonte: 'STJ', url: 'https://stj.jus.br', como_usar_conteudo: 'Criar vídeo: "Tu tem até 5 anos para questionar um contrato abusivo com o banco" — urgência natural + informação nova + valor prático imediato.' },
  { id: 'a2', data: HOJE, titulo: 'Banco Central publica resolução sobre cobranças em cartão de crédito', resumo: 'Nova resolução do Bacen (nº 340/2025) estabelece limites e transparência obrigatória nas cobranças de tarifas em cartão de crédito e crédito rotativo. Bancos têm 60 dias para se adequar.', fonte: 'Bacen', url: 'https://bcb.gov.br', como_usar_conteudo: 'Carrossel educativo: "5 cobranças no cartão que o banco não pode fazer" — tema de alta busca + novidade regulatória.' },
  { id: 'a3', data: HOJE, titulo: 'TJRS registra aumento de 35% em processos de superendividamento no 1º tri', resumo: 'Dados do Tribunal de Justiça do RS apontam crescimento expressivo em ações de superendividamento no primeiro trimestre de 2025.', fonte: 'TJRS', url: 'https://tjrs.jus.br', como_usar_conteudo: 'Post com dado local: "35% mais famílias gaúchas buscando sair das dívidas — tu não tá sozinha nisso" — dado regional cria identificação e urgência.' },
]

const CORES_FONTE = {
  STJ:    { bg: '#f0efff', text: '#635bff', border: '#c7c5ff' },
  STF:    { bg: '#f5f3ff', text: '#5b4be3', border: '#ddd6fe' },
  Bacen:  { bg: '#ecfdf5', text: '#00a854', border: '#d1fae5' },
  TJRS:   { bg: '#fffbeb', text: '#855900', border: '#f5be58' },
  Conjur: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
}
function corFonte(f) { return CORES_FONTE[f] || { bg: '#f6f9fc', text: '#425466', border: '#e3e8ee' } }
function dataBotao(iso) { const [, m, d] = iso.split('-'); return { dia: d, mes: m } }
function diaSemana(iso) { const [y, m, d] = iso.split('-').map(Number); return DIAS_SEMANA_CURTO[new Date(y, m - 1, d).getDay()] }
function dataLonga(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return `${DIAS_SEMANA_LONGO[new Date(y, m - 1, d).getDay()]}, ${d} de ${MESES_PT[m - 1]} de ${y}`
}

export default function Alertas() {
  const [dataSelecionada, setDataSelecionada] = useState(null)
  const [datasDisponiveis, setDatasDisponiveis] = useState([])
  const [alertas, setAlertas]                 = useState([])
  const [loading, setLoading]                 = useState(true)
  const [usandoMock, setUsandoMock]           = useState(false)

  useEffect(() => {
    async function init() {
      setLoading(true)
      const trintaDiasAtras = new Date(); trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)
      const { data: datas } = await supabase.from('mkt_alertas').select('data').gte('data', trintaDiasAtras.toISOString().slice(0, 10)).order('data', { ascending: false })
      if (!datas?.length) {
        setUsandoMock(true); setDatasDisponiveis([HOJE]); setAlertas(MOCK_ALERTAS); setDataSelecionada(HOJE); setLoading(false); return
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
      const { data } = await supabase.from('mkt_alertas').select('*').eq('data', dataSelecionada).order('criado_em', { ascending: true })
      setAlertas(data || []); setLoading(false)
    }
    fetch()
  }, [dataSelecionada, usandoMock])

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ ...CARD, padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Bell size={22} weight="bold" color="#635bff" />
            <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0a2540', margin: 0, letterSpacing: '-0.3px' }}>Alertas</h1>
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

      {loading && <div style={{ ...CARD, padding: 56, textAlign: 'center' }}><p style={{ color: '#8898aa' }}>Carregando alertas...</p></div>}

      {!loading && alertas.length === 0 && (
        <div style={{ ...CARD, padding: 56, textAlign: 'center' }}>
          <Tray size={40} weight="thin" color="#8898aa" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: '#0a2540', marginBottom: 6 }}>Nenhum alerta registrado para este dia</p>
          <p style={{ fontSize: 13, color: '#8898aa' }}>Alertas são adicionados manualmente com base em novidades jurídicas e regulatórias.</p>
        </div>
      )}

      {!loading && alertas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {alertas.map((alerta, i) => {
            const cor = corFonte(alerta.fonte)
            return (
              <div key={alerta.id || i} style={{ ...CARD, overflow: 'hidden' }}>
                <div style={{ padding: '18px 20px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    {alerta.fonte && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: cor.bg, color: cor.text, border: `1px solid ${cor.border}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {alerta.fonte}
                      </span>
                    )}
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#0a2540', margin: 0, lineHeight: 1.4 }}>{alerta.titulo}</p>
                  </div>
                  {alerta.resumo && <p style={{ fontSize: 13, color: '#425466', lineHeight: 1.6, margin: '0 0 14px' }}>{alerta.resumo}</p>}
                  {alerta.url && (
                    <a href={alerta.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 500, color: '#635bff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <ArrowSquareOut size={12} /> Ver fonte original
                    </a>
                  )}
                </div>
                {alerta.como_usar_conteudo && (
                  <div style={{ background: '#fffbeb', borderTop: '1px solid #f5be58', padding: '14px 20px' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#855900', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>
                      Como usar em conteúdo
                    </p>
                    <p style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6, margin: 0 }}>{alerta.como_usar_conteudo}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
