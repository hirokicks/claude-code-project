export default function Btn({ children, onClick, variant = 'primary', disabled = false, style = {} }) {
  const styles = {
    primary: {
      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      color: 'white', border: 'none',
      boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
    },
    outline: {
      background: 'white', color: '#6b7280',
      border: '2px solid #e5e7eb',
    },
    danger: {
      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
      color: 'white', border: 'none',
    },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '13px 24px', borderRadius: 12, fontSize: 15, fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'transform 0.15s, box-shadow 0.15s',
        ...styles[variant],
        ...style,
      }}
      onMouseOver={e => { if (!disabled) e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {children}
    </button>
  );
}
