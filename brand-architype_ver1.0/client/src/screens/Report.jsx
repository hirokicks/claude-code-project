import Btn from '../components/Btn.jsx';
import { ARCHETYPES, QUADRANTS, getQuadrant, getArchetypesByQuadrant } from '../data.js';

export default function Report({ results, formData, onBack }) {
  const top3 = results.scores ? [...results.scores].sort((a, b) => b.score - a.score).slice(0, 3) : [];

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '24px 20px' }}>
      <div className="no-print" style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <Btn onClick={onBack} variant="outline">← 結果に戻る</Btn>
        <Btn onClick={() => window.print()}>🖨️ 印刷 / PDF保存</Btn>
      </div>

      <div className="print-area" style={{ background: 'white', borderRadius: 20, padding: '44px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign: 'center', marginBottom: 36, borderBottom: '3px solid #6366f1', paddingBottom: 28 }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🔮</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 6px' }}>ブランドアーキタイプ 診断レポート</h1>
          <p style={{ fontSize: 14, color: '#6b7280' }}>
            {formData.brandName || 'ブランド名'} ｜ {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#6366f1', marginBottom: 12 }}>🏢 ブランド基本情報</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <tbody>
              {[
                ['ブランド名', formData.brandName],
                ['主な事業', formData.mainBusiness],
                ['創業・規模', formData.founded],
                ['ターゲット顧客', formData.targetCustomer],
                ['コアバリュー', formData.coreValue],
                ['競合ブランド', formData.competitors],
              ].filter(([, v]) => v).map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: '8px 14px', fontWeight: 600, color: '#374151', background: '#f9fafb', width: '28%', borderBottom: '1px solid #f0f0f0' }}>{k}</td>
                  <td style={{ padding: '8px 14px', color: '#6b7280', borderBottom: '1px solid #f0f0f0' }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#6366f1', marginBottom: 14 }}>🎯 診断結果 ― 上位アーキタイプ</h2>
          {top3.map((s, i) => {
            const a = ARCHETYPES.find(x => x.id === s.id);
            const q = getQuadrant(a?.quadrant);
            return (
              <div key={s.id} style={{ border: `1.5px solid ${q?.border}`, background: i === 0 ? q?.light : 'white', borderRadius: 14, padding: '18px', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 36 }}>{a?.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 17, color: '#111827' }}>
                      {'#' + (i + 1)} {a?.nameJa}
                      <span style={{ fontSize: 14, fontWeight: 400, color: '#6b7280', marginLeft: 8 }}>({a?.nameEn})</span>
                    </div>
                    <div style={{ fontSize: 12, color: q?.color, fontWeight: 600 }}>{q?.name} ｜ {a?.role}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: q?.color, lineHeight: 1 }}>
                      {s.score}<span style={{ fontSize: 14, fontWeight: 400 }}>/10</span>
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: '#374151', margin: '0 0 10px', lineHeight: 1.7 }}>{a?.description}</p>
                {s.reason && (
                  <div style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic', borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
                    📌 {s.reason}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {a?.keywords.map(k => (
                    <span key={k} style={{ background: q?.color, color: 'white', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>{k}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        {results.analysis && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#6366f1', marginBottom: 12 }}>🔍 AI分析コメント</h2>
            <div style={{ background: '#f9fafb', borderRadius: 12, padding: '18px', fontSize: 14, color: '#374151', lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
              {results.analysis}
            </div>
          </section>
        )}

        {results.recommendations && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#6366f1', marginBottom: 12 }}>💡 ブランディングアプローチの提案</h2>
            <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 12, padding: '18px', fontSize: 14, color: '#374151', lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
              {results.recommendations}
            </div>
          </section>
        )}

        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#6366f1', marginBottom: 12 }}>📊 全アーキタイプ 適合度一覧</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {QUADRANTS.map(q => (
              <div key={q.id} style={{ background: q.light, borderRadius: 12, padding: '12px' }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: q.color, marginBottom: 8 }}>{q.name}</div>
                {getArchetypesByQuadrant(q.id).map(a => {
                  const s = results.scores?.find(x => x.id === a.id);
                  const score = s?.score || 0;
                  return (
                    <div key={a.id} style={{ marginBottom: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                        <span>{a.icon} {a.nameJa}</span>
                        <strong style={{ color: q.color }}>{score}</strong>
                      </div>
                      <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2 }}>
                        <div style={{ width: `${score * 10}%`, height: '100%', background: q.color, borderRadius: 2 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 16px', fontSize: 12, color: '#92400e' }}>
          ⚠️ このレポートはAI（Claude）による分析を含みます。アーキタイプの選定はあくまで提案の立脚点であり、最終的な判断はデザイナーとクライアントで行ってください。
        </div>

        <div style={{ marginTop: 28, textAlign: 'center', fontSize: 11, color: '#9ca3af', borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
          ブランドアーキタイプ ワークショップツール ｜ Powered by Claude AI
        </div>
      </div>
    </div>
  );
}
