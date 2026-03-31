export default function FieldInput({ q, value, onChange }) {
  const base = {
    width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb',
    borderRadius: 10, fontSize: 14, background: 'white',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    outline: 'none', color: '#111827',
  };
  const focus = (e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px #eef2ff'; };
  const blur = (e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; };

  if (q.type === 'textarea') return (
    <textarea value={value || ''} onChange={e => onChange(q.id, e.target.value)}
      placeholder={q.placeholder} rows={3}
      style={{ ...base, resize: 'vertical', lineHeight: 1.7 }}
      onFocus={focus} onBlur={blur} />
  );
  if (q.type === 'select') return (
    <select value={value || ''} onChange={e => onChange(q.id, e.target.value)}
      style={{ ...base, cursor: 'pointer' }} onFocus={focus} onBlur={blur}>
      <option value="">選択してください</option>
      {q.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  );
  return (
    <input type="text" value={value || ''} onChange={e => onChange(q.id, e.target.value)}
      placeholder={q.placeholder} style={base} onFocus={focus} onBlur={blur} />
  );
}
