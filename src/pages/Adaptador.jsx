import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ArrowsClockwise, CopySimple, FloppyDisk, Check, Pencil } from '@phosphor-icons/react'

const CARD = { background: '#fff', borderRadius: 12, border: '1px solid #e3e8ee', boxShadow: '0 2px 5px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }

const SERVICOS = [
  { key: 'superendividamento', label: 'Superendividamento',  desc: 'pessoa física com múltiplas dívidas — Lei 14.181/2021' },
  { key: 'revisao_contrato',   label: 'Revisão de Contrato', desc: 'contratos com juros abusivos ou cláusulas ilegais' },
  { key: 'busca_apreensao',    label: 'Busca e Apreensão',   desc: 'veículo financiado em atraso com risco de apreensão' },
  { key: 'fraude_bancaria',    label: 'Fraude Bancária',     desc: 'vítima de golpe que quer reembolso do banco' },
  { key: 'nome_sujo',          label: 'Nome Sujo',           desc: 'negativação indevida por dívida prescrita ou inexistente' },
]

function buildPrompt({ post, servico }) {
  const srv = SERVICOS.find(s => s.key === servico)
  return `Você é a assistente de criação de conteúdo de Fonseca Alves Advogados, escritório de direito bancário e do consumidor no RS.

TAREFA: Adaptar completamente o post abaixo para o serviço de ${srv?.label}.

POST ORIGINAL:
---
${post?.trim() || '(nenhum)'}
---

SERVIÇO ALVO: ${srv?.label}
CONTEXTO: ${srv?.desc}

REGRAS: mesma estrutura e energia do original; troque o tema para ${srv?.label}; use "tu/teu/tua"; bordões como "para. respira.", "dívida a gente resolve", "tu não tá sozinha nisso", "informação é poder"; NUNCA copiar frases; NUNCA prometer resultado; NUNCA CTA comercial.

FORMATO DE SAÍDA:

[HOOK — 3 a 5 segundos]
(texto)

[DESENVOLVIMENTO]
(texto)

[CTA FINAL]
(chamada para salvar, comentar ou seguir)`
}

export default function Adaptador() {
  const [post, setPost]         = useState('')
  const [servico, setServico]   = useState('superendividamento')
  const [gerando, setGerando]   = useState(false)
  const [resultado, setResultado] = useState('')
  const [erro, setErro]         = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo]       = useState(false)
  const [copiado, setCopiado]   = useState(false)

  async function adaptar() {
    if (!post.trim()) { setErro('Cole o post do concorrente antes de adaptar.'); return }
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!apiKey) { setErro('Chave VITE_ANTHROPIC_API_KEY não encontrada no .env'); return }
    setGerando(true); setErro(''); setResultado(''); setSalvo(false)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', 'anthropic-dangerous-request-source': 'browser-client' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1024, messages: [{ role: 'user', content: buildPrompt({ post, servico }) }] }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Erro HTTP ${res.status}`) }
      const data = await res.json()
      setResultado(data.content?.[0]?.text || '')
    } catch (e) {
      setErro(`Erro ao adaptar: ${e.message}`)
    } finally { setGerando(false) }
  }

  async function salvarNoBanco() {
    setSalvando(true)
    const linhas = resultado.split('\n')
    const idx = linhas.findIndex(l => l.toLowerCase().includes('[hook'))
    const titulo = (idx >= 0 ? linhas[idx + 1]?.trim() : '') || SERVICOS.find(s => s.key === servico)?.label || servico
    const { error } = await supabase.from('mkt_roteiros').insert({ titulo: titulo.slice(0, 80), conteudo_original: post, roteiro_gerado: resultado, modo: 'adaptacao', formato: null, tipo_hook: null, topico: SERVICOS.find(s => s.key === servico)?.label || servico, status: 'rascunho' })
    if (error) setErro(`Erro ao salvar: ${error.message}`)
    else setSalvo(true)
    setSalvando(false)
  }

  async function copiar() {
    await navigator.clipboard.writeText(resultado)
    setCopiado(true); setTimeout(() => setCopiado(false), 2000)
  }

  const srv = SERVICOS.find(s => s.key === servico)

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ maxWidth: 1200 }}>

        <div style={{ ...CARD, padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <ArrowsClockwise size={22} weight="bold" color="#635bff" />
              <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0a2540', margin: 0, letterSpacing: '-0.3px' }}>Adaptador</h1>
            </div>
            <p style={{ color: '#8898aa', fontSize: 14, margin: 0 }}>Adapte posts de concorrentes para o nicho do escritório</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

          {/* Formulário */}
          <div style={{ width: '40%', flexShrink: 0, ...CARD, padding: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#425466', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>Post do Concorrente</p>
              <textarea value={post} onChange={e => setPost(e.target.value)}
                placeholder="Cole aqui o post completo — hook, desenvolvimento e CTA..." rows={10}
                style={{ width: '100%', padding: '10px 12px', background: '#f6f9fc', border: '1px solid #e3e8ee', borderRadius: 8, color: '#0a2540', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={e => { e.target.style.borderColor = '#635bff'; e.target.style.background = '#fff' }}
                onBlur={e => { e.target.style.borderColor = '#e3e8ee'; e.target.style.background = '#f6f9fc' }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#425466', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Para qual serviço adaptar</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {SERVICOS.map(s => {
                  const a = servico === s.key
                  return (
                    <button key={s.key} onClick={() => setServico(s.key)} style={{ padding: '10px 14px', borderRadius: 8, border: `1px solid ${a ? '#635bff' : '#e3e8ee'}`, background: a ? '#f0efff' : '#fff', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: a ? '#635bff' : '#0a2540', margin: '0 0 2px' }}>{s.label}</p>
                      <p style={{ fontSize: 11, color: a ? '#635bff' : '#8898aa', margin: 0, opacity: a ? 0.75 : 1 }}>{s.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>
            {erro && <p style={{ fontSize: 12, color: '#ed5f74', marginBottom: 12, background: '#fef2f4', border: '1px solid #fce4e8', borderRadius: 6, padding: '8px 12px' }}>{erro}</p>}
            <button onClick={adaptar} disabled={gerando} style={{ width: '100%', padding: '11px', background: gerando ? '#8b86ff' : '#635bff', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: gerando ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.15s' }}>
              {gerando ? <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />Adaptando...</> : <><ArrowsClockwise size={16} weight="bold" /> Adaptar para meu nicho</>}
            </button>
          </div>

          {/* Resultado */}
          <div style={{ flex: 1 }}>
            {!gerando && !resultado && (
              <div style={{ ...CARD, padding: 64, textAlign: 'center', minHeight: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' }}>
                <ArrowsClockwise size={40} weight="thin" color="#8898aa" style={{ marginBottom: 14 }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: '#8898aa', marginBottom: 6 }}>O post adaptado aparecerá aqui</p>
                <p style={{ fontSize: 13, color: '#c2cdd6' }}>Cole o post do concorrente e selecione o serviço</p>
              </div>
            )}
            {gerando && (
              <div style={{ ...CARD, padding: 64, textAlign: 'center', minHeight: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #e3e8ee', borderTopColor: '#635bff', animation: 'spin 0.8s linear infinite', marginBottom: 16 }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: '#425466', marginBottom: 4 }}>Adaptando conteúdo...</p>
                <p style={{ fontSize: 13, color: '#8898aa' }}>Claude está reescrevendo na voz do escritório</p>
              </div>
            )}
            {!gerando && resultado && (
              <div style={{ ...CARD, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #e3e8ee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f6f9fc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ArrowsClockwise size={16} weight="bold" color="#635bff" />
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#0a2540', margin: 0 }}>Post Adaptado</p>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#f0efff', color: '#635bff', border: '1px solid #c7c5ff' }}>{srv?.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={copiar} style={{ fontSize: 12, fontWeight: 500, padding: '6px 12px', background: copiado ? '#ecfdf5' : '#fff', border: `1px solid ${copiado ? '#d1fae5' : '#e3e8ee'}`, borderRadius: 7, color: copiado ? '#00a854' : '#425466', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'all 0.15s' }}>
                      {copiado ? <Check size={12} weight="bold" /> : <CopySimple size={12} />} {copiado ? 'Copiado' : 'Copiar'}
                    </button>
                    <button onClick={salvarNoBanco} disabled={salvando || salvo} style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', background: salvo ? '#f0efff' : '#635bff', border: `1px solid ${salvo ? '#c7c5ff' : '#635bff'}`, borderRadius: 7, color: salvo ? '#635bff' : '#fff', cursor: salvando || salvo ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, opacity: salvando ? 0.7 : 1, transition: 'all 0.15s' }}>
                      <FloppyDisk size={12} /> {salvo ? 'Salvo' : salvando ? 'Salvando...' : 'Salvar no Banco'}
                    </button>
                  </div>
                </div>
                <div style={{ padding: 24 }}>
                  <pre style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14, color: '#0a2540', whiteSpace: 'pre-wrap', lineHeight: 1.9, margin: 0 }}>{resultado}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
