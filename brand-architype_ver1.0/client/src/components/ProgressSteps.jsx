export default function ProgressSteps({ current }) {
  const labels = [{ icon: '🌱', text: '魂' }, { icon: '🔍', text: '実体' }, { icon: '⚡', text: '競合' }, { icon: '🎯', text: '感性' }];
  return (
    <div style={{ padding: '16px 24px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {labels.map((l, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < labels.length - 1 ? 1 : undefined }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 48 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', fontSize: 16,
                background: i <= current ? '#6366f1' : '#e5e7eb',
                color: i <= current ? 'white' : '#9ca3af',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: i === current ? '0 0 0 4px #c7d2fe' : 'none',
                transition: 'all 0.3s',
              }}>
                {i < current ? '✓' : l.icon}
              </div>
              <div style={{ fontSize: 10, marginTop: 4, color: i <= current ? '#6366f1' : '#9ca3af', fontWeight: 600 }}>
                {l.text}
              </div>
            </div>
            {i < labels.length - 1 && (
              <div style={{
                flex: 1, height: 3, borderRadius: 2, margin: '0 4px',
                background: i < current ? '#6366f1' : '#e5e7eb',
                transition: 'background 0.3s', marginBottom: 16,
              }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
