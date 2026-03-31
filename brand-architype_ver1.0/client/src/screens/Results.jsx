import { useState } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts';
import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import { ARCHETYPES, getQuadrant } from '../data.js';

export default function Results({ results, formData, onRestart, onReport }) {
  const [tab, setTab] = useState('scores');
  const [detail, setDetail] = useState(null);

  const sorted = results.scores ? [...results.scores].sort((a, b) => b.score - a.score) : [];
  const top3 = sorted.slice(0, 3);
  const primary = top3[0] ? ARCHETYPES.find(a => a.id === top3[0].id) : null;
  const primaryQ = primary ? getQuadrant(primary.quadrant) : null;

  const radarData = ARCHETYPES.map(a => {
    const s = results.scores?.find(x => x.id === a.id);
    return { subject: a.nameJa, A: s?.score || 0, fullMark: 10 };
  });

  const barData = sorted.map(s => {
    const a = ARCHETYPES.find(x => x.id === s.id);
    return { name: a?.nameJa, icon: a?.icon, score: s.score, color: getQuadrant(a?.quadrant)?.color || '#6366f1' };
  });

  const tabs = [
    { id: 'scores', label: '📊 スコア' },
    { id: 'analysis', label: '💡 AI分析' },
    { id: 'all', label: '🗺️ 全アーキタイプ' },
  ];

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>🎯</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: '#111827', marginBottom: 4 }}>診断結果</h2>
        <p style={{ fontSize: 14, color: '#6b7280' }}>{formData.brandName || 'ブランド'} のアーキタイプ分析</p>
      </div>

      {primary && (
        <div style={{
          background: `linear-gradient(135deg, ${primaryQ.color}18, ${primaryQ.color}08)`,
          border: `2px solid ${primaryQ.color}60`,
          borderRadius: 20, padding: '28px', marginBottom: 24, textAlign: 'center', animation: 'fadeIn 0.5s ease'
        }}>
          <div style={{ fontSize: 11, color: primaryQ.color, fontWeight: 800, letterSpacing: 3, marginBottom: 10 }}>PRIMARY ARCHETYPE</div>
          <div style={{ fontSize: 64, marginBottom: 10 }}>{primary.icon}</div>
          <h3 style={{ fontSize: 36, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>{primary.nameJa}</h3>
          <div style={{ fontSize: 18, color: primaryQ.color, marginBottom: 14, fontWeight: 600 }}>{primary.nameEn}</div>
          <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.8, maxWidth: 520, margin: '0 auto 18px' }}>{primary.description}</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {primary.keywords.map(k => (
              <span key={k} style={{ background: primaryQ.color, color: 'white', borderRadius: 20, padding: '5px 14px', fontSize: 13, fontWeight: 600 }}>{k}</span>
            ))}
          </div>
          {top3[0] && (
            <div style={{ marginTop: 12 }}>
              <span style={{
                background: 'white', border: `2px solid ${primaryQ.color}`,
                color: primaryQ.color, borderRadius: 20, padding: '5px 16px', fontSize: 14, fontWeight: 700
              }}>適合度：{top3[0].score} / 10</span>
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#374151', marginBottom: 12 }}>🏆 適合度ランキング TOP 3</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {top3.map((s, i) => {
            const a = ARCHETYPES.find(x => x.id === s.id);
            const q = getQuadrant(a?.quadrant);
            return (
              <div key={s.id} style={{
                border: `2px solid ${q?.color}50`,
                background: i === 0 ? `${q?.color}12` : 'white',
                borderRadius: 16, padding: '18px', textAlign: 'center',
                boxShadow: i === 0 ? `0 4px 20px ${q?.color}20` : '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, fontWeight: 600 }}>{['🥇', '🥈', '🥉'][i]}</div>
                <div style={{ fontSize: 36, marginBottom: 8 }}>{a?.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{a?.nameJa}</div>
                <div style={{ fontSize: 11, color: q?.color, marginBottom: 10, fontWeight: 600 }}>{a?.nameEn}</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: q?.color }}>
                  {s.score}<span style={{ fontSize: 14, fontWeight: 400 }}>/10</span>
                </div>
                {results.scores?.find(x => x.id === s.id)?.reason && (
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8, lineHeight: 1.5 }}>
                    {results.scores.find(x => x.id === s.id).reason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: '#f3f4f6', borderRadius: 14, padding: 4, display: 'flex', gap: 4, marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '9px 12px', border: 'none', borderRadius: 10,
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: tab === t.id ? 'white' : 'transparent',
            color: tab === t.id ? '#6366f1' : '#6b7280',
            boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'scores' && (
        <Card>
          <div style={{ height: 320, marginBottom: 28 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <PolarRadiusAxis angle={90} domain={[0, 10]} tick={false} axisLine={false} />
                <Radar dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ height: 340 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={65} />
                <Tooltip formatter={(v) => [`${v} / 10`, '適合度']} />
                <Bar dataKey="score" radius={[0, 8, 8, 0]} maxBarSize={20}>
                  {barData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {tab === 'analysis' && (
        <Card>
          {results.analysis && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: '#374151', marginBottom: 10, fontSize: 15 }}>🔍 ブランド分析</div>
              <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.9, whiteSpace: 'pre-wrap', padding: '16px', background: '#f9fafb', borderRadius: 12 }}>
                {results.analysis}
              </div>
            </div>
          )}
          {results.recommendations && (
            <div>
              <div style={{ fontWeight: 700, color: '#6366f1', marginBottom: 10, fontSize: 15 }}>💡 ブランディングアプローチの提案</div>
              <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.9, whiteSpace: 'pre-wrap', padding: '16px', background: '#eef2ff', borderRadius: 12, border: '1px solid #c7d2fe' }}>
                {results.recommendations}
              </div>
            </div>
          )}
        </Card>
      )}

      {tab === 'all' && (
        <Card>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {ARCHETYPES.map(a => {
              const s = results.scores?.find(x => x.id === a.id);
              const q = getQuadrant(a.quadrant);
              const isSelected = detail === a.id;
              return (
                <div key={a.id} onClick={() => setDetail(isSelected ? null : a.id)} style={{
                  border: `2px solid ${isSelected ? q.color : '#e5e7eb'}`,
                  background: isSelected ? q.light : 'white',
                  borderRadius: 14, padding: '12px', cursor: 'pointer',
                  transition: 'all 0.2s', position: 'relative',
                  boxShadow: isSelected ? `0 4px 16px ${q.color}25` : '0 1px 4px rgba(0,0,0,0.04)',
                }}>
                  {s && (
                    <div style={{ position: 'absolute', top: 8, right: 8, background: q.color, color: 'white', borderRadius: 12, padding: '1px 7px', fontSize: 12, fontWeight: 700 }}>{s.score}</div>
                  )}
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{a.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{a.nameJa}</div>
                  <div style={{ fontSize: 11, color: q.color, fontWeight: 600 }}>{a.nameEn}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{a.role}</div>
                </div>
              );
            })}
          </div>
          {detail && (() => {
            const a = ARCHETYPES.find(x => x.id === detail);
            const q = getQuadrant(a.quadrant);
            return (
              <div style={{ marginTop: 16, background: q.light, border: `2px solid ${q.border}`, borderRadius: 16, padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 44 }}>{a.icon}</span>
                  <div>
                    <h4 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>{a.nameJa}</h4>
                    <div style={{ fontSize: 13, color: q.color, fontWeight: 600 }}>{a.nameEn} ｜ {a.role}</div>
                  </div>
                </div>
                <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, marginBottom: 14 }}>{a.description}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                  {[
                    ['💜 核心的欲求', a.coreDesire],
                    ['🔴 恐れ', a.fear],
                    ['🎤 トーン', a.tone],
                    ['🏢 参照ブランド', a.brands.join('、')],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: 'white', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontWeight: 700, color: '#374151', marginBottom: 2, fontSize: 12 }}>{k}</div>
                      <div style={{ color: '#6b7280' }}>{v}</div>
                    </div>
                  ))}
                </div>
                {results.scores?.find(x => x.id === detail)?.reason && (
                  <div style={{ marginTop: 12, background: `${q.color}15`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#374151' }}>
                    <strong>AI分析：</strong>{results.scores.find(x => x.id === detail).reason}
                  </div>
                )}
              </div>
            );
          })()}
        </Card>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <Btn onClick={onRestart} variant="outline" style={{ flex: 1 }}>🔄 最初からやり直す</Btn>
        <Btn onClick={onReport} style={{ flex: 2 }}>📄 レポートを出力する</Btn>
      </div>
    </div>
  );
}
