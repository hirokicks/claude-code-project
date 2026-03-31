import { useState, useCallback } from 'react';
import Landing from './screens/Landing.jsx';
import Workshop from './screens/Workshop.jsx';
import ApiKey from './screens/ApiKey.jsx';
import Loading from './screens/Loading.jsx';
import Results from './screens/Results.jsx';
import Report from './screens/Report.jsx';

export default function App() {
  const [screen, setScreen] = useState('landing');
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState('anthropic');
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const WORKSHOP_STEP_COUNT = 4;

  const handleChange = useCallback((field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  }, []);

  const handleNext = () => {
    if (step < WORKSHOP_STEP_COUNT - 1) setStep(s => s + 1);
    else setScreen('apikey');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (screen === 'apikey') { setScreen('workshop'); return; }
    if (step > 0) setStep(s => s - 1);
    else setScreen('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAnalyze = async () => {
    if (!apiKey.trim()) return;
    setLoading(true);
    setError('');
    setScreen('loading');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, provider, formData }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `サーバーエラー (${res.status})`);
      }
      const data = await res.json();
      setResults(data);
      setScreen('results');
    } catch (e) {
      setError(e.message);
      setScreen('apikey');
    } finally {
      setLoading(false);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRestart = () => {
    setScreen('landing');
    setStep(0);
    setFormData({});
    setResults(null);
    setError('');
    setProvider('anthropic');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <nav style={{
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e5e7eb', padding: '12px 24px',
        display: 'flex', alignItems: 'center', gap: 10,
        position: 'sticky', top: 0, zIndex: 1000,
      }} className="no-print">
        <span style={{ fontSize: 22 }}>🔮</span>
        <span style={{ fontWeight: 800, fontSize: 15, color: '#374151' }}>ブランドアーキタイプ ワークショップ</span>
        {screen !== 'landing' && (
          <button
            onClick={() => { if (window.confirm('ホームに戻りますか？入力内容は保持されます。')) setScreen('landing'); }}
            style={{ marginLeft: 'auto', fontSize: 13, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← ホーム
          </button>
        )}
        <div style={{ marginLeft: screen === 'landing' ? 'auto' : 0, fontSize: 12, color: '#9ca3af' }}>
          Powered by {{ anthropic: 'Claude AI', openai: 'GPT-4o', gemini: 'Gemini' }[provider] || 'AI'}
        </div>
      </nav>

      {screen === 'landing' && <Landing onStart={() => { setScreen('workshop'); setStep(0); }} />}
      {screen === 'workshop' && <Workshop stepIndex={step} formData={formData} onChange={handleChange} onNext={handleNext} onBack={handleBack} />}
      {screen === 'apikey' && <ApiKey apiKey={apiKey} setApiKey={setApiKey} provider={provider} setProvider={setProvider} onAnalyze={handleAnalyze} onBack={handleBack} isLoading={loading} error={error} />}
      {screen === 'loading' && <Loading />}
      {screen === 'results' && results && <Results results={results} formData={formData} onRestart={handleRestart} onReport={() => setScreen('report')} />}
      {screen === 'report' && results && <Report results={results} formData={formData} onBack={() => setScreen('results')} />}
    </div>
  );
}
