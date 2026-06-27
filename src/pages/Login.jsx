import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [email, setEmail]   = useState('')
  const [senha, setSenha]   = useState('')
  const [erro, setErro]     = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn }  = useAuth()
  const navigate    = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    const { error } = await signIn(email, senha)
    if (error) {
      setErro('E-mail ou senha incorretos.')
      setLoading(false)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f6f9fc 0%, #ffffff 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        width: '100%', maxWidth: '420px',
        background: '#ffffff', borderRadius: '16px',
        padding: '48px 40px',
        border: '1px solid #e3e8ee',
        boxShadow: '0 8px 32px rgba(10,37,64,0.06), 0 2px 8px rgba(10,37,64,0.04)',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: '52px', height: '52px',
            background: 'linear-gradient(135deg, #635bff, #4f7df3)',
            borderRadius: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px',
            fontSize: '17px', fontWeight: 700, color: '#fff',
            boxShadow: '0 4px 14px rgba(99,91,255,0.3)',
          }}>MC</div>
          <h1 style={{ color: '#0a2540', fontSize: '22px', fontWeight: 600, margin: '0 0 6px', letterSpacing: '-0.3px' }}>
            Monitor de Concorrentes
          </h1>
          <p style={{ color: '#8898aa', fontSize: '14px', margin: 0 }}>Fonseca Alves Advogados</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block', color: '#425466', fontSize: '13px',
              fontWeight: 500, marginBottom: '6px',
            }}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="seu@email.com"
              style={{
                width: '100%', padding: '10px 14px',
                background: '#f6f9fc', border: '1px solid #e3e8ee',
                borderRadius: '8px', color: '#0a2540', fontSize: '14px',
                outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = '#635bff'; e.target.style.background = '#fff' }}
              onBlur={e => { e.target.style.borderColor = '#e3e8ee'; e.target.style.background = '#f6f9fc' }}
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block', color: '#425466', fontSize: '13px',
              fontWeight: 500, marginBottom: '6px',
            }}>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%', padding: '10px 14px',
                background: '#f6f9fc', border: '1px solid #e3e8ee',
                borderRadius: '8px', color: '#0a2540', fontSize: '14px',
                outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = '#635bff'; e.target.style.background = '#fff' }}
              onBlur={e => { e.target.style.borderColor = '#e3e8ee'; e.target.style.background = '#f6f9fc' }}
            />
          </div>
          {erro && (
            <p style={{
              color: '#ed5f74', fontSize: '13px', marginBottom: '16px',
              background: '#fef2f4', border: '1px solid #fce4e8',
              borderRadius: '6px', padding: '8px 12px',
            }}>{erro}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px',
              background: loading ? '#8b86ff' : '#635bff',
              color: '#fff', border: 'none', borderRadius: '8px',
              fontSize: '14px', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
              boxShadow: '0 2px 8px rgba(99,91,255,0.25)',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#5249f1' }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#635bff' }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
