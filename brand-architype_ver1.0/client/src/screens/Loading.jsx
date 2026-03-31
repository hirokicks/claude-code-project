import { useState, useEffect } from 'react';

export default function Loading() {
  const [dots, setDots] = useState('.');
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '.' : d + '.'), 600);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ textAlign: 'center', padding: '100px 24px' }}>
      <div style={{ fontSize: 72, marginBottom: 24, animation: 'spin 3s linear infinite', display: 'inline-block' }}>✨</div>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#374151', marginBottom: 12 }}>AI分析中{dots}</h2>
      <p style={{ color: '#6b7280', lineHeight: 1.8, fontSize: 15 }}>
        ブランド情報を解析して<br />
        12のアーキタイプへの適合度を算出しています
      </p>
    </div>
  );
}
