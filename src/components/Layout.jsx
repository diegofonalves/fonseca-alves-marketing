import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV_ITEMS = [
  { to: '/dashboard',   label: 'Por Dia',      emoji: '📊' },
  { to: '/perfis',      label: 'Por Perfil',   emoji: '👤' },
  { to: '/insights',    label: 'Insights',     emoji: '💡' },
  { to: '/alertas',     label: 'Alertas',      emoji: '🚨' },
  { to: '/inteligencia',label: 'Inteligência', emoji: '🧠' },
  { to: '/roteiros',    label: 'Roteiros',     emoji: '🎬' },
  { to: '/adaptador',   label: 'Adaptador',    emoji: '🔄' },
]

function inicialEmail(email) {
  return (email || '?').charAt(0).toUpperCase()
}

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0a0a0a' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 240, minWidth: 240,
        background: '#111111',
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid #1f1f1f',
        flexShrink: 0,
      }}>

        {/* Logo */}
        <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid #1f1f1f' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, background: '#7c3aed',
              borderRadius: 8, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 13, fontWeight: 700,
              color: '#fff', flexShrink: 0,
            }}>MC</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
                Monitor de Concorrentes
              </div>
              <div style={{ fontSize: 10, color: '#555', marginTop: 1 }}>
                Fonseca Alves Advogados
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px', overflowY: 'auto' }}>
          <div style={{
            fontSize: 10, fontWeight: 600, color: '#444',
            textTransform: 'uppercase', letterSpacing: 0.8,
            padding: '8px 10px 6px',
          }}>
            Menu
          </div>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 8, marginBottom: 2,
                textDecoration: 'none', fontSize: 13.5,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#fff' : '#666',
                background: isActive ? 'rgba(124,58,237,0.12)' : 'transparent',
                borderLeft: isActive ? '3px solid #7c3aed' : '3px solid transparent',
                transition: 'all 0.15s',
              })}
              onMouseEnter={e => {
                if (!e.currentTarget.getAttribute('aria-current')) {
                  e.currentTarget.style.background = '#1a1a1a'
                  e.currentTarget.style.color = '#ccc'
                }
              }}
              onMouseLeave={e => {
                if (!e.currentTarget.getAttribute('aria-current')) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#666'
                }
              }}
            >
              <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>{item.emoji}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid #1f1f1f' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {inicialEmail(user?.email)}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                fontSize: 12, fontWeight: 600, color: '#fff',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {user?.email || 'Usuário'}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '7px 10px', borderRadius: 7,
              border: '1px solid #2a2a2a', background: 'transparent',
              fontSize: 12, color: '#666', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.color = '#a78bfa' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = '#666' }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sair
          </button>
        </div>
      </aside>

      {/* ── Conteúdo ── */}
      <main style={{ flex: 1, background: '#0a0a0a', overflowY: 'auto', padding: '32px' }}>
        <Outlet />
      </main>
    </div>
  )
}
