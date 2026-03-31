import { useState } from 'react';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';

const PROVIDERS = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    sublabel: 'Claude',
    icon: '🤖',
    placeholder: 'sk-ant-api03-...',
    hint: 'console.anthropic.com でAPIキーを取得できます。',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    sublabel: 'GPT-4o',
    icon: '🟢',
    placeholder: 'sk-...',
    hint: 'platform.openai.com でAPIキーを取得できます。',
  },
  {
    id: 'gemini',
    label: 'Google',
    sublabel: 'Gemini',
    icon: '🔷',
    placeholder: 'AIzaSy...',
    hint: 'aistudio.google.com でAPIキーを取得できます。',
  },
];

export default function ApiKey({ apiKey, setApiKey, provider, setProvider, onAnalyze, onBack, isLoading, error }) {
  const [show, setShow] = useState(false);
  const current = PROVIDERS.find(p => p.id === provider) || PROVIDERS[0];

  const handleProviderChange = (id) => {
    setProvider(id);
    setApiKey('');
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 20px' }}>
      <Card>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>✨</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginBottom: 8 }}>AI診断の準備</h2>
          <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7 }}>
            AIがブランド情報をもとに<br />
            12のアーキタイプへの適合度を詳細分析します
          </p>
        </div>

        {/* Provider selector */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 8 }}>
            🤖 AIプロバイダーを選択
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => handleProviderChange(p.id)}
                style={{
                  flex: 1, padding: '12px 6px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center',
                  border: provider === p.id ? '2px solid #6366f1' : '2px solid #e5e7eb',
                  background: provider === p.id ? '#eef2ff' : 'white',
                  color: provider === p.id ? '#6366f1' : '#6b7280',
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 4 }}>{p.icon}</div>
                <div>{p.label}</div>
                <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.8 }}>{p.sublabel}</div>
              </button>
            ))}
          </div>
        </div>

        {/* API key input */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 6 }}>
            🔑 {current.label} API キー
          </label>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
            キーはこのセッション中のみ使用され、サーバーに保存されません。
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10 }}>
            {current.hint}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type={show ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={current.placeholder}
              style={{
                flex: 1, padding: '11px 14px', border: '1.5px solid #e5e7eb',
                borderRadius: 10, fontSize: 14, fontFamily: 'monospace', outline: 'none'
              }}
            />
            <button onClick={() => setShow(!show)} style={{
              padding: '11px 14px', border: '1.5px solid #e5e7eb',
              borderRadius: 10, background: 'white', cursor: 'pointer', fontSize: 16
            }}>{show ? '🙈' : '👁️'}</button>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '12px 14px', background: '#fef2f2',
            border: '1px solid #fca5a5', borderRadius: 10,
            fontSize: 13, color: '#dc2626', marginBottom: 16
          }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <Btn onClick={onBack} variant="outline" style={{ flex: 1 }}>← 戻る</Btn>
          <Btn onClick={onAnalyze} disabled={isLoading || !apiKey.trim()} style={{ flex: 2 }}>
            {isLoading ? '⏳ 分析中...' : '診断スタート ✨'}
          </Btn>
        </div>
      </Card>
    </div>
  );
}
