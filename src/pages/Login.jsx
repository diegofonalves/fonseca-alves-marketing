import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

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
      minHeight: '100vh', background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        width: '100%', maxWidth: '380px',
        background: '#111', border: '1px solid #1e1e1e',
        borderRadius: '12px', padding: '40px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '48px', height: '48px', background: '#1a1a1a',
            border: '1px solid #333', borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: '16px', fontWeight: 700, color: '#fff'
          }}>MC</div>
          <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 600, margin: '0 0 4px' }}>
            Monitor de Concorrentes
          </h1>
          <p style={{ color: '#555', fontSize: '13px', margin: 0 }}>Fonseca Alves Advogados</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '6px' }}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 12px', background: '#1a1a1a',
                border: '1px solid #2a2a2a', borderRadius: '6px',
                color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', color: '#888', fontSize: '12px', marginBottom: '6px' }}>
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              required
              style={{
                width: '100%', padding: '10px 12px', background: '#1a1a1a',
                border: '1px solid #2a2a2a', borderRadius: '6px',
                color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>
          {erro && (
            <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>{erro}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px', background: '#fff',
              color: '#000', border: 'none', borderRadius: '6px',
              fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
