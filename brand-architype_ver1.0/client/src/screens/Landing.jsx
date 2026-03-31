import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import { QUADRANTS, ARCHETYPES, WORKSHOP_STEPS, getArchetypesByQuadrant } from '../data.js';

export default function Landing({ onStart }) {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px' }}>
      <Card>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>🔮</div>
          <h1 style={{ fontSize: 30, fontWeight: 800, color: '#111827', marginBottom: 12, lineHeight: 1.3 }}>
            ブランドアーキタイプ<br />ワークショップツール
          </h1>
          <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.8 }}>
            企業・ブランドを12種類の「人格」になぞらえ、<br />
            ブランドの本質とアイデンティティを発見するフレームワーク
          </p>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
            Carl Gustav Jung の「元型」理論 × Brand Personality ｜ Margaret Mark &amp; Carol S. Pearson (2001)
          </div>
        </div>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#374151', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🗺️</span> 12のアーキタイプ ― 4つの動機軸
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {QUADRANTS.map(q => (
              <div key={q.id} style={{ background: q.light, border: `1.5px solid ${q.border}`, borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ fontWeight: 700, color: q.color, fontSize: 14 }}>{q.name}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>{q.subtitle}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {getArchetypesByQuadrant(q.id).map(a => (
                    <span key={a.id} style={{
                      fontSize: 12, background: 'white', border: `1px solid ${q.border}`,
                      borderRadius: 20, padding: '3px 9px', color: '#374151',
                      display: 'flex', alignItems: 'center', gap: 3
                    }}>{a.icon} {a.nameJa}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#f9fafb', borderRadius: 16, padding: '20px', marginBottom: 32 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 14 }}>
            📋 ワークショップの4ステップ
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {WORKSHOP_STEPS.map((s, i) => (
              <div key={s.id} style={{ background: 'white', borderRadius: 12, padding: '12px 14px', border: `1.5px solid ${s.color}30` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#374151' }}>Step {i + 1}｜{s.title}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{s.subtitle}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb', fontSize: 13, color: '#6b7280' }}>
            ✨ <strong>AI診断</strong>：入力情報をもとにClaude AIが12アーキタイプの適合度を分析・レポート出力
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Btn onClick={onStart} style={{ padding: '16px 56px', fontSize: 18 }}>
            ワークショップを開始する →
          </Btn>
          <div style={{ marginTop: 10, fontSize: 12, color: '#9ca3af' }}>
            所要時間：約15〜30分 ｜ Anthropic API キーが必要です
          </div>
        </div>
      </Card>
    </div>
  );
}
