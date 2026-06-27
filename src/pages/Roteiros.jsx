import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { FilmStrip, Lightning, CopySimple, FloppyDisk, Check, Pencil } from '@phosphor-icons/react'

const CARD = { background: '#fff', borderRadius: 12, border: '1px solid #e3e8ee', boxShadow: '0 2px 5px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }

const MODOS = [
  { key: 'completo',  label: 'Roteiro Completo', desc: 'Pronto para gravar' },
  { key: 'esqueleto', label: 'Só Esqueleto',     desc: 'Estrutura para preencher' },
]
const FORMATOS  = [{ key: 'lista', label: 'Lista' }, { key: 'urgente', label: 'Urgente' }, { key: 'passo_a_passo', label: 'Passo a Passo' }, { key: 'storytelling', label: 'Storytelling' }, { key: 'pergunta', label: 'Pergunta' }]
const TIPOS_HOOK = [{ key: 'negacao', label: 'Negação' }, { key: 'urgencia', label: 'Urgência' }, { key: 'medo', label: 'Medo' }, { key: 'valor_choque', label: 'Valor-Choque' }, { key: 'segredo', label: 'Segredo' }, { key: 'curiosidade', label: 'Curiosidade' }]

function buildPrompt({ conteudo, modo, formato, tipoHook, topico }) {
  const instrucoesModo = modo === 'completo'
    ? 'Gere o roteiro COMPLETO, pronto para gravar, em português gaúcho (tu/teu/tua).'
    : 'Gere apenas o ESQUELETO com campos em [COLCHETES MAIÚSCULOS] para o usuário preencher.'
  return `Você é a assistente de roteiros de Fonseca Alves Advogados, escritório de direito bancário e do consumidor no RS.

VOZ OBRIGATÓRIA: "tu/teu/tua". Bordões (máx 2): "para. respira.", "segura tua emoção", "dívida a gente resolve", "sem julgamento, só estratégia", "tu não tá sozinha nisso", "informação é poder", "o banco não quer que tu saiba disso", "confia no processo".

RESTRIÇÕES: nunca citar caso real, nunca prometer resultado, nunca CTA comercial direto, não copiar o original.

FORMATO DE SAÍDA:
[HOOK — 3 a 5 segundos]
(texto)

[DESENVOLVIMENTO]
(texto)

[CTA FINAL]
(chamada para salvar, comentar ou seguir)

---
CONTEÚDO DE INSPIRAÇÃO: ${conteudo?.trim() || '(nenhum)'}
MODO: ${modo === 'completo' ? 'Roteiro Completo' : 'Só Esqueleto'}
FORMATO: ${formato.replace('_', ' ')}
TIPO DE HOOK: ${tipoHook.replace('_', '-')}
TÓPICO: ${topico?.trim() || '(não especificado)'}

INSTRUÇÃO: ${instrucoesModo}`
}

function Label({ children }) {
  return <p style={{ fontSize: 11, fontWeight: 600, color: '#425466', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>{children}</p>
}

function Pills({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(o => {
        const a = value === o.key
        return (
          <button key={o.key} onClick={() => onChange(o.key)} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 12,
            fontWeight: a ? 600 : 500,
            border: `1px solid ${a ? '#c7c5ff' : '#e3e8ee'}`,
            background: a ? '#635bff' : '#fff',
            color: a ? '#fff' : '#425466',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>{o.label}</button>
        )
      })}
    </div>
  )
}

export default function Roteiros() {
  const [conteudo, setConteudo] = useState('')
  const [modo, setModo]         = useState('completo')
  const [formato, setFormato]   = useState('lista')
  const [tipoHook, setTipoHook] = useState('valor_choque')
  const [topico, setTopico]     = useState('')
  const [gerando, setGerando]   = useState(false)
  const [roteiro, setRoteiro]   = useState('')
  const [erro, setErro]         = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo]       = useState(false)
  const [copiado, setCopiado]   = useState(false)

  async function gerarRoteiro() {
    if (!conteudo.trim() && !topico.trim()) { setErro('Preencha o conteúdo de inspiração ou o tópico.'); return }
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!apiKey) { setErro('Chave VITE_ANTHROPIC_API_KEY não encontrada no .env'); return }
    setGerando(true); setErro(''); setRoteiro(''); setSalvo(false)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', 'anthropic-dangerous-request-source': 'browser-client' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1024, messages: [{ role: 'user', content: buildPrompt({ conteudo, modo, formato, tipoHook, topico }) }] }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Erro HTTP ${res.status}`) }
      const data = await res.json()
      setRoteiro(data.content?.[0]?.text || '')
    } catch (e) {
      setErro(`Erro ao gerar: ${e.message}`)
    } finally { setGerando(false) }
  }

  async function salvarNoBanco() {
    setSalvando(true)
    const linhas = roteiro.split('\n')
    const idx = linhas.findIndex(l => l.toLowerCase().includes('[hook'))
    const titulo = (idx >= 0 ? linhas[idx + 1]?.trim() : '') || topico || 'Roteiro'
    const { error } = await supabase.from('mkt_roteiros').insert({ titulo: titulo.slice(0, 80), conteudo_original: conteudo, roteiro_gerado: roteiro, modo, formato, tipo_hook: tipoHook, topico, status: 'rascunho' })
    if (error) setErro(`Erro ao salvar: ${error.message}`)
    else setSalvo(true)
    setSalvando(false)
  }

  async function copiar() {
    await navigator.clipboard.writeText(roteiro)
    setCopiado(true); setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ maxWidth: 1200 }}>

        <div style={{ ...CARD, padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <FilmStrip size={22} weight="bold" color="#635bff" />
              <h1 style={{ fontSize: 24, fontWeight: 600, color: '#0a2540', margin: 0, letterSpacing: '-0.3px' }}>Roteiros</h1>
            </div>
            <p style={{ color: '#8898aa', fontSize: 14, margin: 0 }}>Geração de roteiros com IA na voz do escritório</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

          {/* Formulário */}
          <div style={{ width: '40%', flexShrink: 0, ...CARD, padding: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <Label>Conteúdo de Inspiração</Label>
              <textarea value={conteudo} onChange={e => setConteudo(e.target.value)}
                placeholder="Cole aqui o hook, roteiro ou legenda do concorrente..." rows={6}
                style={{ width: '100%', padding: '10px 12px', background: '#f6f9fc', border: '1px solid #e3e8ee', borderRadius: 8, color: '#0a2540', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={e => { e.target.style.borderColor = '#635bff'; e.target.style.background = '#fff' }}
                onBlur={e => { e.target.style.borderColor = '#e3e8ee'; e.target.style.background = '#f6f9fc' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <Label>Tópico / Tema</Label>
              <input type="text" value={topico} onChange={e => setTopico(e.target.value)}
                placeholder="Ex: dívida com banco, revisão de contrato, nome sujo..."
                style={{ width: '100%', padding: '10px 12px', background: '#f6f9fc', border: '1px solid #e3e8ee', borderRadius: 8, color: '#0a2540', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={e => { e.target.style.borderColor = '#635bff'; e.target.style.background = '#fff' }}
                onBlur={e => { e.target.style.borderColor = '#e3e8ee'; e.target.style.background = '#f6f9fc' }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <Label>Modo de Geração</Label>
              <div style={{ display: 'flex', gap: 8 }}>
                {MODOS.map(m => {
                  const a = modo === m.key
                  return (
                    <button key={m.key} onClick={() => setModo(m.key)} style={{ flex: 1, padding: '10px 12px', borderRadius: 8, textAlign: 'left', border: `1px solid ${a ? '#635bff' : '#e3e8ee'}`, background: a ? '#f0efff' : '#f6f9fc', cursor: 'pointer', transition: 'all 0.15s' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: a ? '#635bff' : '#0a2540', margin: '0 0 2px' }}>{m.label}</p>
                      <p style={{ fontSize: 11, color: a ? '#635bff' : '#8898aa', margin: 0, opacity: a ? 0.75 : 1 }}>{m.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <Label>Formato</Label>
              <Pills options={FORMATOS} value={formato} onChange={setFormato} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <Label>Tipo de Hook</Label>
              <Pills options={TIPOS_HOOK} value={tipoHook} onChange={setTipoHook} />
            </div>
            {erro && <p style={{ fontSize: 12, color: '#ed5f74', marginBottom: 12, background: '#fef2f4', border: '1px solid #fce4e8', borderRadius: 6, padding: '8px 12px' }}>{erro}</p>}
            <button onClick={gerarRoteiro} disabled={gerando} style={{ width: '100%', padding: '11px', background: gerando ? '#8b86ff' : '#635bff', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: gerando ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.15s' }}>
              {gerando ? <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />Gerando...</> : <><Lightning size={16} weight="bold" /> Gerar Roteiro</>}
            </button>
          </div>

          {/* Resultado */}
          <div style={{ flex: 1 }}>
            {!gerando && !roteiro && (
              <div style={{ ...CARD, padding: 64, textAlign: 'center', minHeight: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' }}>
                <Pencil size={40} weight="thin" color="#8898aa" style={{ marginBottom: 14 }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: '#8898aa', marginBottom: 6 }}>O roteiro gerado aparecerá aqui</p>
                <p style={{ fontSize: 13, color: '#c2cdd6' }}>Preencha o formulário e clique em "Gerar Roteiro"</p>
              </div>
            )}
            {gerando && (
              <div style={{ ...CARD, padding: 64, textAlign: 'center', minHeight: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #e3e8ee', borderTopColor: '#635bff', animation: 'spin 0.8s linear infinite', marginBottom: 16 }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: '#425466', marginBottom: 4 }}>Gerando roteiro...</p>
                <p style={{ fontSize: 13, color: '#8898aa' }}>Claude está criando o conteúdo na voz do escritório</p>
              </div>
            )}
            {!gerando && roteiro && (
              <div style={{ ...CARD, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #e3e8ee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f6f9fc' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FilmStrip size={16} weight="bold" color="#635bff" />
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#0a2540', margin: 0 }}>Roteiro Gerado</p>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#ecfdf5', color: '#00a854', border: '1px solid #d1fae5' }}>{modo === 'completo' ? 'Completo' : 'Esqueleto'}</span>
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
                  <pre style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14, color: '#0a2540', whiteSpace: 'pre-wrap', lineHeight: 1.9, margin: 0 }}>{roteiro}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
