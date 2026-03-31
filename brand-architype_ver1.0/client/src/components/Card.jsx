export default function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'white', borderRadius: 20, padding: '28px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      animation: 'fadeIn 0.4s ease',
      ...style,
    }}>
      {children}
    </div>
  );
}
