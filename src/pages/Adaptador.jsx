import { useState } from 'react'
import { supabase } from '../lib/supabase'

const SERVICOS = [
  {
    key: 'superendividamento',
    label: 'Superendividamento',
    desc: 'pessoa física com múltiplas dívidas bancárias — Lei do Superendividamento (Lei 14.181/2021)',
  },
  {
    key: 'revisao_contrato',
    label: 'Revisão de Contrato',
    desc: 'contratos bancários com juros abusivos, capitalização indevida ou cláusulas ilegais',
  },
  {
    key: 'busca_apreensao',
    label: 'Busca e Apreensão',
    desc: 'veículo financiado em atraso com risco ou notificação de busca e apreensão pelo banco',
  },
  {
    key: 'fraude_bancaria',
    label: 'Fraude Bancária',
    desc: 'vítima de golpe, fraude ou operação não reconhecida que quer reembolso da instituição financeira',
  },
  {
    key: 'nome_sujo',
    label: 'Nome Sujo',
    desc: 'pessoa com nome negativado indevidamente por dívida prescrita, inexistente ou em processo de revisão',
  },
]

function buildPrompt({ post, servico }) {
  const srv = SERVICOS.find(s => s.key === servico)
  return `Você é a assistente de criação de conteúdo de Fonseca Alves Advogados, escritório de direito bancário e do consumidor no Rio Grande do Sul.

TAREFA: Adaptar completamente o post abaixo para o serviço de ${srv?.label || servico} do escritório.

POST ORIGINAL DO CONCORRENTE:
---
${post?.trim() || '(nenhum post fornecido)'}
---

SERVIÇO ALVO: ${srv?.label}
CONTEXTO: ${srv?.desc}

REGRAS DE ADAPTAÇÃO:
1. Mantenha a MESMA ESTRUTURA e energia do post original (hook + desenvolvimento + CTA)
2. Troque o problema/tema para o contexto de: ${srv?.label}
3. Use a VOZ DO ESCRITÓRIO: "tu/teu/tua" (NUNCA "você"), bordões como "para. respira.", "dívida a gente resolve", "sem julgamento, só estratégia", "tu não tá sozinha nisso", "informação é poder", "o banco não quer que tu saiba disso"
4. NUNCA copiar frases do original — reescrever completamente com a voz do escritório
5. NUNCA prometer resultado ("vai ganhar", "vou recuperar", "garantido")
6. NUNCA fazer CTA comercial direto ("me chama no WhatsApp", "contrate agora")

FORMATO DE SAÍDA OBRIGATÓRIO:

[HOOK — 3 a 5 segundos]
(texto)

[DESENVOLVIMENTO]
(texto)

[CTA FINAL]
(chamada para salvar, comentar ou seguir — nunca comercial)`
}

function PillGroup({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(o => {
        const ativo = value === o.key
        return (
          <button key={o.key} onClick={() => onChange(o.key)} style={{
            padding: '8px 14px', borderRadius: 8, fontSize: 13,
            fontWeight: ativo ? 700 : 500,
            border: `1px solid ${ativo ? '#2563eb' : '#e2e8f0'}`,
            background: ativo ? '#eff6ff' : '#f8fafc',
            color: ativo ? '#2563eb' : '#64748b',
            cursor: 'pointer', transition: 'all 0.15s',
            textAlign: 'left',
          }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
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
    if (!post.trim()) {
      setErro('Cole o post do concorrente antes de adaptar.')
      return
    }

    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!apiKey) {
      setErro('Chave VITE_ANTHROPIC_API_KEY não encontrada no .env')
      return
    }

    setGerando(true)
    setErro('')
    setResultado('')
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
          messages: [{ role: 'user', content: buildPrompt({ post, servico }) }],
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `Erro HTTP ${res.status}`)
      }

      const data = await res.json()
      setResultado(data.content?.[0]?.text || '')
    } catch (e) {
      setErro(`Erro ao adaptar: ${e.message}`)
    } finally {
      setGerando(false)
    }
  }

  async function salvarNoBanco() {
    setSalvando(true)
    const linhas = resultado.split('\n')
    const idxHook = linhas.findIndex(l => l.toLowerCase().includes('[hook'))
    const titulo = (idxHook >= 0 ? linhas[idxHook + 1]?.trim() : '') ||
      `Adaptação — ${SERVICOS.find(s => s.key === servico)?.label || servico}`

    const { error } = await supabase.from('mkt_roteiros').insert({
      titulo: titulo.slice(0, 80),
      conteudo_original: post,
      roteiro_gerado: resultado,
      modo: 'adaptacao',
      formato: null,
      tipo_hook: null,
      topico: SERVICOS.find(s => s.key === servico)?.label || servico,
      status: 'rascunho',
    })

    if (error) setErro(`Erro ao salvar: ${error.message}`)
    else setSalvo(true)
    setSalvando(false)
  }

  async function copiar() {
    await navigator.clipboard.writeText(resultado)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const servicoSelecionado = SERVICOS.find(s => s.key === servico)

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ maxWidth: 1200 }}>

        {/* Header */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: '18px 24px',
          marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          border: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: '0 0 2px' }}>Adaptador</h1>
            <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
              Adapte posts de concorrentes para o nicho do escritório
            </p>
          </div>
          <span style={{ fontSize: 24 }}>🔄</span>
        </div>

        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

          {/* ── Coluna esquerda — formulário ── */}
          <div style={{
            width: '40%', flexShrink: 0,
            background: '#fff', borderRadius: 12, padding: 24,
            border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>

            {/* Post do concorrente */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
                Post do Concorrente
              </p>
              <textarea
                value={post}
                onChange={e => setPost(e.target.value)}
                placeholder="Cole aqui o post completo do concorrente — hook, desenvolvimento e CTA..."
                rows={10}
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

            {/* Serviço alvo */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
                Para qual serviço adaptar
              </p>
              <PillGroup options={SERVICOS} value={servico} onChange={setServico} />
              {servicoSelecionado && (
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 10, lineHeight: 1.5, paddingLeft: 2 }}>
                  {servicoSelecionado.desc}
                </p>
              )}
            </div>

            {/* Erro */}
            {erro && (
              <p style={{
                fontSize: 12, color: '#ef4444', marginBottom: 12,
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 6, padding: '8px 12px',
              }}>
                {erro}
              </p>
            )}

            {/* Botão */}
            <button
              onClick={adaptar}
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
                  Adaptando...
                </>
              ) : '🔄 Adaptar para meu nicho'}
            </button>
          </div>

          {/* ── Coluna direita — resultado ── */}
          <div style={{ flex: 1 }}>

            {/* Placeholder */}
            {!gerando && !resultado && (
              <div style={{
                background: '#fff', border: '2px dashed #e2e8f0', borderRadius: 12,
                padding: 64, textAlign: 'center',
                minHeight: 340, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 40, marginBottom: 14 }}>🔄</span>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                  O post adaptado aparecerá aqui
                </p>
                <p style={{ fontSize: 13, color: '#cbd5e1' }}>
                  Cole o post do concorrente e selecione o serviço
                </p>
              </div>
            )}

            {/* Loading */}
            {gerando && (
              <div style={{
                background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
                padding: 64, textAlign: 'center',
                minHeight: 340, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  border: '3px solid #e2e8f0', borderTopColor: '#2563eb',
                  animation: 'spin 0.8s linear infinite', marginBottom: 16,
                }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Adaptando conteúdo...</p>
                <p style={{ fontSize: 13, color: '#94a3b8' }}>
                  Claude está reescrevendo na voz do escritório
                </p>
              </div>
            )}

            {/* Resultado */}
            {!gerando && resultado && (
              <div style={{
                background: '#fff', borderRadius: 12,
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                overflow: 'hidden',
              }}>
                {/* Header */}
                <div style={{
                  padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#f8fafc',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🔄</span>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 }}>Post Adaptado</p>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                      background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
                    }}>
                      {servicoSelecionado?.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={copiar} style={{
                      fontSize: 12, fontWeight: 600, padding: '7px 12px',
                      background: copiado ? '#f0fdf4' : '#f8fafc',
                      border: `1px solid ${copiado ? '#86efac' : '#e2e8f0'}`,
                      borderRadius: 7, color: copiado ? '#16a34a' : '#475569',
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                      transition: 'all 0.15s',
                    }}>
                      {copiado ? '✓ Copiado' : '📋 Copiar'}
                    </button>
                    <button onClick={salvarNoBanco} disabled={salvando || salvo} style={{
                      fontSize: 12, fontWeight: 600, padding: '7px 12px',
                      background: salvo ? '#eff6ff' : '#2563eb',
                      border: `1px solid ${salvo ? '#bfdbfe' : '#2563eb'}`,
                      borderRadius: 7, color: salvo ? '#2563eb' : '#fff',
                      cursor: salvando || salvo ? 'not-allowed' : 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      opacity: salvando ? 0.7 : 1, transition: 'all 0.15s',
                    }}>
                      {salvo ? '✓ Salvo' : salvando ? 'Salvando...' : '💾 Salvar no Banco'}
                    </button>
                  </div>
                </div>

                {/* Texto */}
                <div style={{ padding: 24 }}>
                  <pre style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: 14, color: '#1e293b',
                    whiteSpace: 'pre-wrap', lineHeight: 1.9, margin: 0,
                  }}>
                    {resultado}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
