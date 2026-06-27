import { useState } from 'react'
import { supabase } from '../lib/supabase'

// ── Opções dos seletores ─────────────────────────────────────────────
const MODOS = [
  { key: 'completo',  label: 'Roteiro Completo', desc: 'Pronto para gravar' },
  { key: 'esqueleto', label: 'Só Esqueleto',     desc: 'Estrutura + campos para preencher' },
]

const FORMATOS = [
  { key: 'lista',         label: 'Lista' },
  { key: 'urgente',       label: 'Urgente' },
  { key: 'passo_a_passo', label: 'Passo a Passo' },
  { key: 'storytelling',  label: 'Storytelling' },
  { key: 'pergunta',      label: 'Pergunta' },
]

const TIPOS_HOOK = [
  { key: 'negacao',      label: 'Negação' },
  { key: 'urgencia',     label: 'Urgência' },
  { key: 'medo',         label: 'Medo' },
  { key: 'valor_choque', label: 'Valor-Choque' },
  { key: 'segredo',      label: 'Segredo' },
  { key: 'curiosidade',  label: 'Curiosidade' },
]

// ── Prompt builder ───────────────────────────────────────────────────
function buildPrompt({ conteudo, modo, formato, tipoHook, topico }) {
  const instrucoesModo = modo === 'completo'
    ? 'Gere o roteiro COMPLETO, pronto para gravar, em português gaúcho (tu/teu/tua). Cada seção deve ter o texto final, sem lacunas.'
    : 'Gere apenas o ESQUELETO do roteiro. Use campos em [COLCHETES E MAIÚSCULAS] onde o usuário deve preencher. Ex: [DESCREVA O PROBLEMA], [NÚMERO ESPECÍFICO], [EXEMPLO PESSOAL]. O esqueleto deve mostrar a estrutura lógica sem revelar o conteúdo.'

  return `Você é a assistente de roteiros de Fonseca Alves Advogados, escritório especializado em direito bancário e do consumidor, localizado no Rio Grande do Sul.

VOZ OBRIGATÓRIA:
- Use sempre "tu/teu/tua" (NUNCA "você")
- Bordões disponíveis (use no máximo 2 por roteiro, com naturalidade): "para. respira.", "segura tua emoção", "dívida a gente resolve", "sem julgamento, só estratégia", "tu não tá sozinha nisso", "informação é poder", "o banco não quer que tu saiba disso", "confia no processo"
- Tom: empático, direto, acolhedor — sem juridiquês

RESTRIÇÕES ABSOLUTAS — nunca quebre essas regras:
- NUNCA citar caso real, nome de cliente ou processo específico
- NUNCA prometer resultado ("vai ganhar", "vou recuperar seu dinheiro", "garantido")
- NUNCA fazer CTA comercial direto ("me chama no WhatsApp", "contrate agora", "agende sua consulta")
- NÃO copiar o conteúdo original — reescrever completamente com a voz do escritório

FORMATO DE SAÍDA OBRIGATÓRIO (use exatamente esses títulos de seção):

[HOOK — 3 a 5 segundos]
(texto do hook)

[DESENVOLVIMENTO]
(corpo do roteiro)

[CTA FINAL]
(chamada para salvar, comentar ou seguir — nunca comercial)

---
CONTEÚDO DE INSPIRAÇÃO:
${conteudo?.trim() || '(nenhum fornecido — baseie-se no tópico abaixo)'}

MODO: ${modo === 'completo' ? 'Roteiro Completo' : 'Só Esqueleto'}
FORMATO: ${formato.replace('_', ' ')}
TIPO DE HOOK: ${tipoHook.replace('_', '-')}
TÓPICO/TEMA: ${topico?.trim() || '(não especificado)'}

INSTRUÇÃO FINAL: ${instrucoesModo}`
}

// ── Helpers de UI ────────────────────────────────────────────────────
function Label({ children }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, color: '#374151',
      textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
    }}>
      {children}
    </p>
  )
}

function PillGroup({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(o => {
        const ativo = value === o.key
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            style={{
              padding: '6px 12px', borderRadius: 20, fontSize: 12,
              fontWeight: ativo ? 700 : 500,
              border: `1px solid ${ativo ? '#2563eb' : '#e2e8f0'}`,
              background: ativo ? '#2563eb' : '#f8fafc',
              color: ativo ? '#fff' : '#64748b',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Roteiros ─────────────────────────────────────────────────────────
export default function Roteiros() {
  const [conteudo, setConteudo]   = useState('')
  const [modo, setModo]           = useState('completo')
  const [formato, setFormato]     = useState('lista')
  const [tipoHook, setTipoHook]   = useState('valor_choque')
  const [topico, setTopico]       = useState('')
  const [gerando, setGerando]     = useState(false)
  const [roteiro, setRoteiro]     = useState('')
  const [erro, setErro]           = useState('')
  const [salvando, setSalvando]   = useState(false)
  const [salvo, setSalvo]         = useState(false)
  const [copiado, setCopiado]     = useState(false)

  async function gerarRoteiro() {
    if (!conteudo.trim() && !topico.trim()) {
      setErro('Preencha o conteúdo de inspiração ou o tópico.')
      return
    }

    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!apiKey) {
      setErro('Chave VITE_ANTHROPIC_API_KEY não encontrada no .env')
      return
    }

    setGerando(true)
    setErro('')
    setRoteiro('')
    setSalvo(false)

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-request-source': 'browser-client',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          messages: [{ role: 'user', content: buildPrompt({ conteudo, modo, formato, tipoHook, topico }) }],
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `Erro HTTP ${res.status}`)
      }

      const data = await res.json()
      setRoteiro(data.content?.[0]?.text || '')
    } catch (e) {
      setErro(`Erro ao gerar roteiro: ${e.message}`)
    } finally {
      setGerando(false)
    }
  }

  async function salvarNoBanco() {
    setSalvando(true)
    const linhas = roteiro.split('\n')
    const idxHook = linhas.findIndex(l => l.toLowerCase().includes('[hook'))
    const titulo = (idxHook >= 0 ? linhas[idxHook + 1]?.trim() : '') ||
      topico || 'Roteiro sem título'

    const { error } = await supabase.from('mkt_roteiros').insert({
      titulo: titulo.slice(0, 80),
      conteudo_original: conteudo,
      roteiro_gerado: roteiro,
      modo,
      formato,
      tipo_hook: tipoHook,
      topico,
      status: 'rascunho',
    })

    if (error) setErro(`Erro ao salvar: ${error.message}`)
    else setSalvo(true)
    setSalvando(false)
  }

  async function copiar() {
    await navigator.clipboard.writeText(roteiro)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

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
              Roteiros
            </h1>
            <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
              Geração de roteiros com IA na voz do escritório
            </p>
          </div>
          <span style={{ fontSize: 24 }}>🎬</span>
        </div>

        {/* ── Duas colunas ── */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

          {/* ── COLUNA ESQUERDA — formulário ── */}
          <div style={{
            width: '40%', flexShrink: 0,
            background: '#fff', borderRadius: 12, padding: 24,
            border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>

            {/* Conteúdo de Inspiração */}
            <div style={{ marginBottom: 20 }}>
              <Label>Conteúdo de Inspiração</Label>
              <textarea
                value={conteudo}
                onChange={e => setConteudo(e.target.value)}
                placeholder="Cole aqui o hook, roteiro ou legenda do concorrente que serviu de inspiração..."
                rows={6}
                style={{
                  width: '100%', padding: '10px 12px',
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 8, color: '#1e293b', fontSize: 13,
                  resize: 'vertical', outline: 'none', fontFamily: 'inherit',
                  lineHeight: 1.6, boxSizing: 'border-box', transition: 'border-color 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = '#2563eb' }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0' }}
              />
            </div>

            {/* Tópico */}
            <div style={{ marginBottom: 20 }}>
              <Label>Tópico / Tema</Label>
              <input
                type="text"
                value={topico}
                onChange={e => setTopico(e.target.value)}
                placeholder="Ex: dívida com banco, revisão de contrato, nome sujo..."
                style={{
                  width: '100%', padding: '10px 12px',
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 8, color: '#1e293b', fontSize: 13,
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = '#2563eb' }}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0' }}
              />
            </div>

            {/* Modo */}
            <div style={{ marginBottom: 20 }}>
              <Label>Modo de Geração</Label>
              <div style={{ display: 'flex', gap: 8 }}>
                {MODOS.map(m => {
                  const ativo = modo === m.key
                  return (
                    <button
                      key={m.key}
                      onClick={() => setModo(m.key)}
                      style={{
                        flex: 1, padding: '10px 12px', borderRadius: 8, textAlign: 'left',
                        border: `1px solid ${ativo ? '#2563eb' : '#e2e8f0'}`,
                        background: ativo ? '#eff6ff' : '#f8fafc',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <p style={{ fontSize: 13, fontWeight: 700, color: ativo ? '#2563eb' : '#374151', margin: '0 0 2px' }}>
                        {m.label}
                      </p>
                      <p style={{ fontSize: 11, color: ativo ? '#3b82f6' : '#94a3b8', margin: 0 }}>
                        {m.desc}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Formato */}
            <div style={{ marginBottom: 20 }}>
              <Label>Formato</Label>
              <PillGroup options={FORMATOS} value={formato} onChange={setFormato} />
            </div>

            {/* Tipo de Hook */}
            <div style={{ marginBottom: 24 }}>
              <Label>Tipo de Hook</Label>
              <PillGroup options={TIPOS_HOOK} value={tipoHook} onChange={setTipoHook} />
            </div>

            {/* Botão gerar */}
            {erro && (
              <p style={{
                fontSize: 12, color: '#ef4444', marginBottom: 12,
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 6, padding: '8px 12px',
              }}>
                {erro}
              </p>
            )}
            <button
              onClick={gerarRoteiro}
              disabled={gerando}
              style={{
                width: '100%', padding: '12px', background: gerando ? '#93c5fd' : '#2563eb',
                color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 700, cursor: gerando ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background 0.15s',
              }}
            >
              {gerando ? (
                <>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Gerando...
                </>
              ) : (
                '✨ Gerar Roteiro'
              )}
            </button>
          </div>

          {/* ── COLUNA DIREITA — resultado ── */}
          <div style={{ flex: 1 }}>

            {/* Placeholder */}
            {!gerando && !roteiro && (
              <div style={{
                background: '#fff', border: '2px dashed #e2e8f0', borderRadius: 12,
                padding: 64, textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                minHeight: 340, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 40, marginBottom: 14 }}>✍️</span>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                  O roteiro gerado aparecerá aqui
                </p>
                <p style={{ fontSize: 13, color: '#cbd5e1' }}>
                  Preencha o formulário e clique em "Gerar Roteiro"
                </p>
              </div>
            )}

            {/* Loading */}
            {gerando && (
              <div style={{
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
                padding: 64, textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                minHeight: 340, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  border: '3px solid #e2e8f0', borderTopColor: '#2563eb',
                  animation: 'spin 0.8s linear infinite',
                  marginBottom: 16,
                }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                  Gerando roteiro...
                </p>
                <p style={{ fontSize: 13, color: '#94a3b8' }}>
                  Claude está criando o conteúdo na voz do escritório
                </p>
              </div>
            )}

            {/* Resultado */}
            {!gerando && roteiro && (
              <div style={{
                background: '#fff', borderRadius: 12,
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                overflow: 'hidden',
              }}>
                {/* Header do resultado */}
                <div style={{
                  padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#f8fafc',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🎬</span>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                      Roteiro Gerado
                    </p>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                      background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
                    }}>
                      {modo === 'completo' ? 'Completo' : 'Esqueleto'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={copiar}
                      style={{
                        fontSize: 12, fontWeight: 600, padding: '7px 12px',
                        background: copiado ? '#f0fdf4' : '#f8fafc',
                        border: `1px solid ${copiado ? '#86efac' : '#e2e8f0'}`,
                        borderRadius: 7,
                        color: copiado ? '#16a34a' : '#475569',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                        transition: 'all 0.15s',
                      }}
                    >
                      {copiado ? '✓ Copiado' : '📋 Copiar'}
                    </button>
                    <button
                      onClick={salvarNoBanco}
                      disabled={salvando || salvo}
                      style={{
                        fontSize: 12, fontWeight: 600, padding: '7px 12px',
                        background: salvo ? '#eff6ff' : '#2563eb',
                        border: `1px solid ${salvo ? '#bfdbfe' : '#2563eb'}`,
                        borderRadius: 7,
                        color: salvo ? '#2563eb' : '#fff',
                        cursor: salvando || salvo ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 5,
                        opacity: salvando ? 0.7 : 1,
                        transition: 'all 0.15s',
                      }}
                    >
                      {salvo ? '✓ Salvo' : salvando ? 'Salvando...' : '💾 Salvar no Banco'}
                    </button>
                  </div>
                </div>

                {/* Texto do roteiro */}
                <div style={{ padding: 24 }}>
                  <pre style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: 14, color: '#1e293b',
                    whiteSpace: 'pre-wrap', lineHeight: 1.9,
                    margin: 0, background: 'transparent',
                  }}>
                    {roteiro}
                  </pre>
                </div>

                {/* Tags do roteiro */}
                <div style={{
                  padding: '12px 24px 20px',
                  display: 'flex', gap: 6, flexWrap: 'wrap',
                }}>
                  {[
                    { label: formato.replace('_', ' '), color: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
                    { label: tipoHook.replace('_', '-'), color: '#fefce8', text: '#92400e', border: '#fde68a' },
                    topico && { label: topico, color: '#f8fafc', text: '#475569', border: '#e2e8f0' },
                  ].filter(Boolean).map((tag, i) => (
                    <span key={i} style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                      background: tag.color, color: tag.text, border: `1px solid ${tag.border}`,
                    }}>
                      {tag.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
