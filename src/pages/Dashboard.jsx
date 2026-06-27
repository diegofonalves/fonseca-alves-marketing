const hoje = new Date().toLocaleDateString('pt-BR', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
})

export default function Dashboard() {
  return (
    <div>
      {/* Header */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '20px 24px',
        marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        border: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: '0 0 2px' }}>
            Por Dia
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
            {hoje.charAt(0).toUpperCase() + hoje.slice(1)}
          </p>
        </div>
        <span style={{ fontSize: 28 }}>📊</span>
      </div>

      {/* Placeholder */}
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
        padding: 48, textAlign: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <p style={{ fontSize: 36, marginBottom: 12 }}>🚧</p>
        <p style={{ fontSize: 14, color: '#64748b' }}>Em construção</p>
      </div>
    </div>
  )
}
