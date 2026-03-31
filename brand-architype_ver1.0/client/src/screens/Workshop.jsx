import Card from '../components/Card.jsx';
import Btn from '../components/Btn.jsx';
import FieldInput from '../components/FieldInput.jsx';
import ProgressSteps from '../components/ProgressSteps.jsx';
import { WORKSHOP_STEPS } from '../data.js';

export default function Workshop({ stepIndex, formData, onChange, onNext, onBack }) {
  const step = WORKSHOP_STEPS[stepIndex];
  const isLast = stepIndex === WORKSHOP_STEPS.length - 1;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px' }}>
      <ProgressSteps current={stepIndex} />
      <Card style={{ marginTop: 20 }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: `${step.color}18`, borderRadius: 8, padding: '4px 12px', marginBottom: 10
          }}>
            <span style={{ fontSize: 18 }}>{step.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: step.color, letterSpacing: 1 }}>
              STEP {stepIndex + 1} / {WORKSHOP_STEPS.length}
            </span>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>{step.title}</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{step.subtitle}</p>
          <div style={{
            marginTop: 10, padding: '10px 14px',
            background: `${step.color}0d`, borderLeft: `3px solid ${step.color}`,
            borderRadius: '0 8px 8px 0', fontSize: 13, color: '#374151'
          }}>
            💡 {step.hint}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {step.questions.map(q => (
            <div key={q.id}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 14, color: '#374151', marginBottom: 6 }}>
                {q.label}
                {q.required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
              </label>
              <FieldInput q={q} value={formData[q.id]} onChange={onChange} />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <Btn onClick={onBack} variant="outline" style={{ flex: 1 }}>← 戻る</Btn>
          <Btn onClick={onNext} style={{ flex: 2 }}>
            {isLast ? 'AI診断へ進む ✨' : '次のステップへ →'}
          </Btn>
        </div>
      </Card>
    </div>
  );
}
