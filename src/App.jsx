import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Perfis from './pages/Perfis'
import Insights from './pages/Insights'
import Alertas from './pages/Alertas'
import Inteligencia from './pages/Inteligencia'
import Roteiros from './pages/Roteiros'
import Adaptador from './pages/Adaptador'

function RotaProtegida({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ background: '#0a0a0a', minHeight: '100vh' }} />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ background: '#0a0a0a', minHeight: '100vh' }} />

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={<RotaProtegida><Layout /></RotaProtegida>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"    element={<Dashboard />} />
        <Route path="perfis"       element={<Perfis />} />
        <Route path="insights"     element={<Insights />} />
        <Route path="alertas"      element={<Alertas />} />
        <Route path="inteligencia" element={<Inteligencia />} />
        <Route path="roteiros"     element={<Roteiros />} />
        <Route path="adaptador"    element={<Adaptador />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
