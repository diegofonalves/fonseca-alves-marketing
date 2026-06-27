import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  ChartBar, User, Lightbulb, Bell, Brain,
  FilmStrip, ArrowsClockwise, SignOut,
} from '@phosphor-icons/react'

const NAV_ITEMS = [
  { to: '/dashboard',    label: 'Por Dia',      Icon: ChartBar },
  { to: '/perfis',       label: 'Por Perfil',   Icon: User },
  { to: '/insights',     label: 'Insights',     Icon: Lightbulb },
  { to: '/alertas',      label: 'Alertas',      Icon: Bell },
  { to: '/inteligencia', label: 'Inteligência', Icon: Brain },
  { to: '/roteiros',     label: 'Roteiros',     Icon: FilmStrip },
  { to: '/adaptador',    label: 'Adaptador',    Icon: ArrowsClockwise },
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
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f6f9fc' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 240, minWidth: 240,
        background: '#ffffff',
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid #e3e8ee',
        flexShrink: 0,
      }}>

        {/* Logo */}
        <div style={{ padding: '20px', borderBottom: '1px solid #e3e8ee' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36,
              background: 'linear-gradient(135deg, #635bff, #4f7df3)',
              borderRadius: 8, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 13, fontWeight: 700,
              color: '#fff', flexShrink: 0,
            }}>MC</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0a2540', lineHeight: 1.3 }}>
                Monitor de Concorrentes
              </div>
              <div style={{ fontSize: 11, color: '#8898aa', marginTop: 1 }}>
                Fonseca Alves
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
          <p style={{
            fontSize: 10, fontWeight: 600, color: '#8898aa',
            textTransform: 'uppercase', letterSpacing: 0.8,
            padding: '4px 8px 8px',
          }}>Menu</p>
          {NAV_ITEMS.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 8, marginBottom: 2,
                textDecoration: 'none', fontSize: 13.5,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#635bff' : '#425466',
                background: isActive ? '#f0efff' : 'transparent',
                borderLeft: `3px solid ${isActive ? '#635bff' : 'transparent'}`,
                transition: 'all 0.15s',
              })}
              onMouseEnter={e => {
                if (!e.currentTarget.getAttribute('aria-current')) {
                  e.currentTarget.style.background = '#f6f9fc'
                }
              }}
              onMouseLeave={e => {
                if (!e.currentTarget.getAttribute('aria-current')) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              {({ isActive }) => (
                <>
                  <span style={{ flexShrink: 0, display: 'flex' }}>
                    <Icon size={18} weight={isActive ? 'bold' : 'regular'} />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e3e8ee' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #635bff, #4f7df3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {inicialEmail(user?.email)}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                fontSize: 12, fontWeight: 600, color: '#0a2540',
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
              border: '1px solid #e3e8ee', background: 'transparent',
              fontSize: 12, fontWeight: 500, color: '#8898aa', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#635bff'; e.currentTarget.style.color = '#635bff' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e3e8ee'; e.currentTarget.style.color = '#8898aa' }}
          >
            <SignOut size={14} />
            Sair
          </button>
        </div>
      </aside>

      {/* ── Conteúdo ── */}
      <main style={{ flex: 1, background: '#f6f9fc', overflowY: 'auto', padding: '32px' }}>
        <Outlet />
      </main>
    </div>
  )
}
