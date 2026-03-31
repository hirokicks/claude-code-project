
import { useState, useCallback, useRef } from "react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, Cell
} from "recharts";

// ===== DATA DEFINITIONS =====

const QUADRANTS = [
  { id: "stability", name: "安定 / 制御", subtitle: "安心感を抱く", color: "#6366f1", light: "#eef2ff", border: "#a5b4fc" },
  { id: "belonging", name: "帰属 / 楽しみ", subtitle: "愛情やコミュニティを手に入れる", color: "#ec4899", light: "#fdf2f8", border: "#f9a8d4" },
  { id: "mastery", name: "支配 / リスク", subtitle: "成功する・成し遂げる", color: "#f59e0b", light: "#fffbeb", border: "#fcd34d" },
  { id: "freedom", name: "自立 / 自己実現", subtitle: "幸せを見つけられる", color: "#10b981", light: "#ecfdf5", border: "#6ee7b7" },
];

const ARCHETYPES = [
  {
    id: "creator", nameJa: "創造者", nameEn: "Creator", quadrant: "stability",
    icon: "🎨", role: "新しいものを作り出す",
    coreDesire: "傑出した作品・体験の創造",
    fear: "凡庸さ・模倣",
    description: "革新と表現を通じて世界に価値を生み出す。ビジョンとオリジナリティを大切にし、妥協のない品質と独創性を追求する人格。",
    tone: "インスピレーション的・芸術的・こだわり強め",
    brands: ["Apple", "LEGO", "Adobe", "Dyson"],
    keywords: ["革新", "創造性", "オリジナリティ", "表現", "ビジョン"],
  },
  {
    id: "caregiver", nameJa: "援助者", nameEn: "Caregiver", quadrant: "stability",
    icon: "🤝", role: "他者を助ける",
    coreDesire: "他者の保護とケア",
    fear: "利己主義・不安定",
    description: "他者の世話をし、保護することに使命感を持つ。温かみと共感を大切にし、コミュニティの安全と幸福を守る人格。",
    tone: "温かみ・誠実・安心感・共感",
    brands: ["JOHNSON'S", "Pampers", "UNICEF", "Campbell's"],
    keywords: ["ケア", "共感", "サポート", "安心", "温かみ"],
  },
  {
    id: "ruler", nameJa: "統治者", nameEn: "Ruler", quadrant: "stability",
    icon: "👑", role: "統制力を発揮する",
    coreDesire: "繁栄・秩序の維持",
    fear: "混乱・失墜",
    description: "秩序とコントロールを重視し、安定した組織・社会を構築する。権威と責任感を持ち、高い品質の基準を定める人格。",
    tone: "権威的・洗練・信頼感・格調",
    brands: ["Mercedes-Benz", "Rolex", "Microsoft", "American Express"],
    keywords: ["権威", "品質", "秩序", "安定", "リーダーシップ"],
  },
  {
    id: "jester", nameJa: "道化師", nameEn: "Jester", quadrant: "belonging",
    icon: "🎭", role: "楽しむ",
    coreDesire: "今この瞬間を楽しむ",
    fear: "退屈・つまらなさ",
    description: "ユーモアと遊び心で世界を明るくする。今この瞬間を楽しむことを大切にし、人々に笑いと軽さをもたらす人格。",
    tone: "ユーモラス・軽快・遊び心・エネルギッシュ",
    brands: ["Ben&Jerry's", "Old Spice", "Skittles", "M&M's"],
    keywords: ["ユーモア", "遊び心", "楽しさ", "軽さ", "笑い"],
  },
  {
    id: "everyman", nameJa: "一般大衆", nameEn: "Everyman", quadrant: "belonging",
    icon: "👥", role: "ありのままでいい",
    coreDesire: "所属感・繋がり",
    fear: "孤立・エリート主義",
    description: "等身大の親しみやすさで人々と繋がる。特別である必要はなく、共感と帰属意識を大切にする人格。",
    tone: "親しみやすい・誠実・等身大・フレンドリー",
    brands: ["IKEA", "Gap", "eBay", "Home Depot"],
    keywords: ["親しみ", "共感", "誠実", "平等", "コミュニティ"],
  },
  {
    id: "lover", nameJa: "恋人", nameEn: "Lover", quadrant: "belonging",
    icon: "❤️", role: "愛を見つけ、与える",
    coreDesire: "親密さ・感覚的な豊かさ",
    fear: "孤独・無関心",
    description: "官能的な美しさと情熱で人々を魅了する。親密さと豊かな体験を通じて、特別な絆と深い共鳴を育む人格。",
    tone: "情熱的・官能的・洗練・プレミアム感",
    brands: ["Chanel", "Godiva", "Victoria's Secret", "Alfa Romeo"],
    keywords: ["情熱", "美", "親密さ", "官能", "魅力"],
  },
  {
    id: "hero", nameJa: "英雄", nameEn: "Hero", quadrant: "mastery",
    icon: "⚔️", role: "勇敢に行動する",
    coreDesire: "証明・世界をより良くする",
    fear: "弱さ・脆弱性",
    description: "困難に立ち向かい、世界をより良くするために戦う。強い意志と克己心で不可能を可能にする人格。",
    tone: "力強い・挑戦的・インスピレーション・勝利",
    brands: ["Nike", "FedEx", "BMW", "Gatorade"],
    keywords: ["勇敢", "強さ", "挑戦", "勝利", "克服"],
  },
  {
    id: "outlaw", nameJa: "無法者", nameEn: "Outlaw", quadrant: "mastery",
    icon: "💥", role: "ルールを破る",
    coreDesire: "変革・革命",
    fear: "無力さ・形骸化",
    description: "既成概念を壊し、革命を起こす。ルールや制度に反抗し、真の自由と根本的な変革を求める人格。",
    tone: "反骨的・自由・挑発的・ロック",
    brands: ["Harley-Davidson", "Virgin", "Diesel", "Converse"],
    keywords: ["反抗", "自由", "破壊", "革命", "個性"],
  },
  {
    id: "magician", nameJa: "魔術師", nameEn: "Magician", quadrant: "mastery",
    icon: "✨", role: "生まれ変わりを促す",
    coreDesire: "知識・変容・奇跡",
    fear: "悪い副作用・意図しない結果",
    description: "夢を現実に変える触媒。変容と奇跡をもたらし、人々の可能性を広げ、世界を根本から変えようとする人格。",
    tone: "神秘的・変革的・インスピレーション・ビジョナリー",
    brands: ["Disney", "Apple（一部）", "Mastercard", "Dyson"],
    keywords: ["変容", "奇跡", "ビジョン", "魔法", "可能性"],
  },
  {
    id: "innocent", nameJa: "幼子", nameEn: "Innocent", quadrant: "freedom",
    icon: "🌸", role: "信じる心を保つ・取り戻す",
    coreDesire: "幸福・純粋さ・安全",
    fear: "悪い行為・懲罰",
    description: "純粋さと楽観主義で幸せを追求する。シンプルさの中に美しさを見出し、善意と誠実さを信じる人格。",
    tone: "純粋・楽観的・シンプル・温かい・素直",
    brands: ["Dove", "Coca-Cola（一部）", "Nintendo", "Innocent Drinks"],
    keywords: ["純粋", "楽観", "シンプル", "誠実", "幸福"],
  },
  {
    id: "explorer", nameJa: "探検家", nameEn: "Explorer", quadrant: "freedom",
    icon: "🧭", role: "自立を保つ",
    coreDesire: "自由・発見・新体験",
    fear: "空虚さ・束縛",
    description: "自由と冒険を求め、世界を探求する。自己発見の旅を通じて真の自分を見つけ、常に新しい地平を目指す人格。",
    tone: "冒険的・自由・独立・発見・アクティブ",
    brands: ["REI", "Jeep", "National Geographic", "Patagonia"],
    keywords: ["冒険", "自由", "発見", "探求", "独立"],
  },
  {
    id: "sage", nameJa: "賢者", nameEn: "Sage", quadrant: "freedom",
    icon: "🔭", role: "世界を理解する",
    coreDesire: "真実・知恵・洞察",
    fear: "無知・欺瞞",
    description: "知識と知恵を通じて真実を追求する。深い分析と洞察で世界を理解し、他者に知識と啓発をもたらす人格。",
    tone: "知的・信頼性・分析的・教育的・客観的",
    brands: ["Google", "BBC", "TED", "The Economist"],
    keywords: ["知識", "知恵", "分析", "真実", "洞察"],
  },
];

const WORKSHOP_STEPS = [
  {
    id: "soul", title: "① ブランドの魂を探る", subtitle: "創業精神・ブランドのルーツ",
    icon: "🌱", color: "#6366f1",
    questions: [
      { id: "brandName", label: "ブランド名 *", type: "text", placeholder: "例：株式会社〇〇 / ブランド名" },
      { id: "mainBusiness", label: "主な事業内容 *", type: "text", placeholder: "例：Webデザイン・ブランディングコンサルティング" },
      { id: "founded", label: "創業年・従業員数", type: "text", placeholder: "例：2010年 / 50名" },
      { id: "founderStory", label: "創業者の想い・背景", type: "textarea", placeholder: "誰がどういう理由でこのブランドを生み出したのか？\nブランド誕生当時の社会背景は？\n創業時のポジショニングは？" },
      { id: "brandCommunication", label: "最も印象的なブランドコミュニケーション", type: "textarea", placeholder: "これまで最も記憶に残るメッセージ・キャンペーン・表現は何ですか？" },
      { id: "customerRelationship", label: "顧客との関係性", type: "textarea", placeholder: "これまで顧客はどのようにこのブランドと関わってきたか？\n現在の関係性は？" },
    ]
  },
  {
    id: "reality", title: "② ブランドの実体を探る", subtitle: "現代における真実味の検証",
    icon: "🔍", color: "#ec4899",
    questions: [
      { id: "brandRole", label: "ブランドの役割", type: "select", options: ["機能的（課題解決・利便性中心）", "価値観的（ライフスタイル・アイデンティティ表現）", "両方を兼ね備えている"] },
      { id: "involvement", label: "製品・サービスの関与度", type: "select", options: ["高関与型（高額・長期利用・慎重な購買）", "低関与型（日常的・手軽・習慣的購買）"] },
      { id: "coreValue", label: "ユーザーに与えるコアバリュー *", type: "textarea", placeholder: "このブランドが提供する本質的な価値は何か？\n機能的・感情的・自己表現的にどんな意味があるか？" },
      { id: "targetCustomer", label: "ターゲット顧客像", type: "textarea", placeholder: "誰のためのブランドか？\nターゲットの価値観・ライフスタイル・動機は？" },
      { id: "brandAssets", label: "競合と比べて際立つ強み・独自性", type: "textarea", placeholder: "このブランドの本質的な強みと、競合と比べて際立っている部分は？" },
      { id: "usagePattern", label: "顧客の利用パターン", type: "select", options: ["専らこのブランドのみ使用", "複数ブランドの中の一つ", "状況によって使い分け"] },
    ]
  },
  {
    id: "competition", title: "③ 競合分析", subtitle: "市場における差別化ポイント",
    icon: "⚡", color: "#f59e0b",
    questions: [
      { id: "competitors", label: "主な競合ブランド", type: "text", placeholder: "例：〇〇社、△△社、□□社" },
      { id: "competitorArchetypes", label: "競合のブランドイメージ・雰囲気", type: "textarea", placeholder: "競合ブランドはどのようなイメージを持っていますか？\nどんな人格・トーンを表現していますか？" },
      { id: "differentiator", label: "差別化したい点・市場の空白", type: "textarea", placeholder: "競合と比べてどう違いを出したいか？\n市場の中で未だ占有されていない感情的ポジションはあるか？" },
      { id: "categoryTrend", label: "業界・カテゴリーの傾向", type: "textarea", placeholder: "この業界全体で共通するトーンやイメージはあるか？\nカテゴリー全体で新しいアーキタイプを創出できるか？" },
    ]
  },
  {
    id: "sensory", title: "④ 感性分析", subtitle: "直感と言語からアーキタイプを探る",
    icon: "🎯", color: "#10b981",
    questions: [
      { id: "philosophy", label: "ブランドのステートメント・理念", type: "textarea", placeholder: "企業理念・ミッション・ビジョン・バリューなどを記述してください" },
      { id: "brandPersonality", label: "このブランドが「人」だとしたら？", type: "textarea", placeholder: "どんな人物像か？\nどんな言葉を使うか？どんな服装をしているか？\nどんな雰囲気・性格を持つか？" },
      { id: "idealImage", label: "理想のブランドイメージ・世界観", type: "textarea", placeholder: "目指したい視覚的な世界観、感情的な印象、雰囲気を教えてください" },
      { id: "challenges", label: "現在の課題と理想の状態", type: "textarea", placeholder: "今どんな課題がありますか？\nブランディングを通じてどうなりたいですか？" },
    ]
  },
];

// ===== UTILITY FUNCTIONS =====

const getQuadrant = (id) => QUADRANTS.find(q => q.id === id);
const getArchetypesByQuadrant = (qid) => ARCHETYPES.filter(a => a.quadrant === qid);

// ===== COMPONENTS =====

function ProgressBar({ current, total, labels }) {
  return (
    <div style={{ padding: "0 24px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        {labels.map((l, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center" }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: i < current ? "#6366f1" : i === current ? "#6366f1" : "#e5e7eb",
              color: i <= current ? "white" : "#9ca3af",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 4px",
              fontSize: 14, fontWeight: 600,
              boxShadow: i === current ? "0 0 0 4px #c7d2fe" : "none",
              transition: "all 0.3s",
            }}>
              {i < current ? "✓" : i + 1}
            </div>
            <div style={{ fontSize: 11, color: i <= current ? "#6366f1" : "#9ca3af", fontWeight: i === current ? 600 : 400 }}>
              {l}
            </div>
          </div>
        ))}
      </div>
      <div style={{ height: 4, background: "#e5e7eb", borderRadius: 4, position: "relative" }}>
        <div style={{
          height: "100%", borderRadius: 4,
          background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
          width: `${(current / (total - 1)) * 100}%`,
          transition: "width 0.5s ease",
        }} />
      </div>
    </div>
  );
}

function QuestionInput({ q, value, onChange }) {
  const base = {
    width: "100%", padding: "10px 14px", border: "1.5px solid #e5e7eb",
    borderRadius: 10, fontSize: 14, outline: "none", background: "white",
    transition: "border-color 0.2s",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };
  if (q.type === "textarea") {
    return (
      <textarea
        value={value || ""}
        onChange={e => onChange(q.id, e.target.value)}
        placeholder={q.placeholder}
        rows={3}
        style={{ ...base, resize: "vertical", lineHeight: 1.6 }}
        onFocus={e => e.target.style.borderColor = "#6366f1"}
        onBlur={e => e.target.style.borderColor = "#e5e7eb"}
      />
    );
  }
  if (q.type === "select") {
    return (
      <select
        value={value || ""}
        onChange={e => onChange(q.id, e.target.value)}
        style={{ ...base, cursor: "pointer" }}
      >
        <option value="">選択してください</option>
        {q.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    );
  }
  return (
    <input
      type="text"
      value={value || ""}
      onChange={e => onChange(q.id, e.target.value)}
      placeholder={q.placeholder}
      style={base}
      onFocus={e => e.target.style.borderColor = "#6366f1"}
      onBlur={e => e.target.style.borderColor = "#e5e7eb"}
    />
  );
}

function ArchetypeCard({ archetype, score, selected, onClick, compact }) {
  const q = getQuadrant(archetype.quadrant);
  const isSelected = selected;
  return (
    <div
      onClick={onClick}
      style={{
        border: `2px solid ${isSelected ? q.color : "#e5e7eb"}`,
        borderRadius: 16,
        padding: compact ? "12px" : "16px",
        background: isSelected ? q.light : "white",
        cursor: "pointer",
        transition: "all 0.2s",
        position: "relative",
        boxShadow: isSelected ? `0 4px 20px ${q.color}30` : "0 2px 8px rgba(0,0,0,0.05)",
      }}
    >
      {score !== undefined && (
        <div style={{
          position: "absolute", top: 10, right: 10,
          background: q.color, color: "white",
          borderRadius: 20, padding: "2px 8px",
          fontSize: 13, fontWeight: 700,
        }}>{score}</div>
      )}
      <div style={{ fontSize: compact ? 28 : 36, marginBottom: 6 }}>{archetype.icon}</div>
      <div style={{ fontWeight: 700, fontSize: compact ? 14 : 16, color: "#111827" }}>{archetype.nameJa}</div>
      <div style={{ fontSize: 11, color: q.color, fontWeight: 600, marginBottom: 4 }}>{archetype.nameEn}</div>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{archetype.role}</div>
      {!compact && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#374151", lineHeight: 1.5 }}>
          {archetype.description.slice(0, 80)}...
        </div>
      )}
    </div>
  );
}

function LandingScreen({ onStart }) {
  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "40px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 60, marginBottom: 16 }}>🔮</div>
      <h1 style={{ fontSize: 32, fontWeight: 800, color: "#111827", marginBottom: 12, lineHeight: 1.3 }}>
        ブランドアーキタイプ<br />ワークショップツール
      </h1>
      <p style={{ fontSize: 16, color: "#6b7280", marginBottom: 8, lineHeight: 1.7 }}>
        企業・ブランドを12種類の「人格」になぞらえ、<br />
        ブランドの本質を発見するフレームワーク
      </p>
      <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 32 }}>
        カール・グスタフ・ユングの「元型」理論 × ブランドパーソナリティ<br />
        by Margaret Mark & Carol S. Pearson (2001)
      </p>

      {/* 4 Quadrants Preview */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
        {QUADRANTS.map(q => (
          <div key={q.id} style={{
            background: q.light, border: `1.5px solid ${q.border}`,
            borderRadius: 12, padding: "14px 16px", textAlign: "left"
          }}>
            <div style={{ fontWeight: 700, color: q.color, fontSize: 14 }}>{q.name}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{q.subtitle}</div>
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {getArchetypesByQuadrant(q.id).map(a => (
                <span key={a.id} style={{
                  fontSize: 12, background: "white", border: `1px solid ${q.border}`,
                  borderRadius: 20, padding: "2px 8px", color: "#374151"
                }}>{a.icon} {a.nameJa}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Flow */}
      <div style={{
        background: "#f9fafb", borderRadius: 16, padding: "20px 24px",
        marginBottom: 32, textAlign: "left"
      }}>
        <div style={{ fontWeight: 700, color: "#374151", marginBottom: 12, fontSize: 14 }}>
          📋 ワークショップの流れ
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {WORKSHOP_STEPS.map((s, i) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
              <div>
                <div style={{ fontWeight: 600, color: "#374151" }}>{s.title}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>{s.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e5e7eb", fontSize: 13, color: "#6b7280" }}>
          ✨ <strong>AI診断</strong>：ブランド情報をもとにClaude AIが12アーキタイプへの適合度を分析
        </div>
      </div>

      <button
        onClick={onStart}
        style={{
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          color: "white", border: "none", borderRadius: 14,
          padding: "16px 48px", fontSize: 18, fontWeight: 700,
          cursor: "pointer", boxShadow: "0 4px 20px #6366f130",
          transition: "transform 0.2s",
        }}
        onMouseOver={e => e.target.style.transform = "translateY(-2px)"}
        onMouseOut={e => e.target.style.transform = "translateY(0)"}
      >
        ワークショップを開始する →
      </button>
      <p style={{ marginTop: 12, fontSize: 12, color: "#9ca3af" }}>
        所要時間：約15〜30分
      </p>
    </div>
  );
}

function WorkshopScreen({ stepIndex, formData, onChange, onNext, onBack }) {
  const step = WORKSHOP_STEPS[stepIndex];
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px" }}>
      <ProgressBar
        current={stepIndex}
        total={WORKSHOP_STEPS.length}
        labels={WORKSHOP_STEPS.map(s => s.icon + " " + s.id === "soul" ? "魂" : s.id === "reality" ? "実体" : s.id === "competition" ? "競合" : "感性")}
      />

      <div style={{ marginTop: 28, marginBottom: 24 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: `${step.color}15`, borderRadius: 8, padding: "4px 12px",
          marginBottom: 8
        }}>
          <span style={{ fontSize: 20 }}>{step.icon}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: step.color }}>
            STEP {stepIndex + 1} / {WORKSHOP_STEPS.length}
          </span>
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>
          {step.title}
        </h2>
        <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>{step.subtitle}</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {step.questions.map(q => (
          <div key={q.id}>
            <label style={{ display: "block", fontWeight: 600, fontSize: 14, color: "#374151", marginBottom: 6 }}>
              {q.label}
            </label>
            <QuestionInput q={q} value={formData[q.id]} onChange={onChange} />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
        {stepIndex > 0 && (
          <button onClick={onBack} style={{
            flex: 1, padding: "14px", border: "2px solid #e5e7eb",
            borderRadius: 12, background: "white", fontSize: 15,
            cursor: "pointer", fontWeight: 600, color: "#6b7280"
          }}>
            ← 前のステップ
          </button>
        )}
        <button onClick={onNext} style={{
          flex: 2, padding: "14px",
          background: `linear-gradient(135deg, ${step.color}, ${step.color}cc)`,
          border: "none", borderRadius: 12, color: "white",
          fontSize: 15, cursor: "pointer", fontWeight: 700,
          boxShadow: `0 4px 16px ${step.color}40`,
        }}>
          {stepIndex < WORKSHOP_STEPS.length - 1 ? "次のステップへ →" : "AI診断へ進む ✨"}
        </button>
      </div>
    </div>
  );
}

function ApiKeyScreen({ apiKey, setApiKey, onAnalyze, onBack, isLoading }) {
  const [showKey, setShowKey] = useState(false);
  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111827", marginBottom: 8 }}>AI診断</h2>
      <p style={{ fontSize: 15, color: "#6b7280", marginBottom: 32, lineHeight: 1.6 }}>
        入力されたブランド情報をもとに、Claude AIが<br />
        12のアーキタイプへの適合度を分析します。
      </p>

      <div style={{
        background: "#f9fafb", borderRadius: 16, padding: "24px",
        marginBottom: 24, textAlign: "left"
      }}>
        <label style={{ display: "block", fontWeight: 700, fontSize: 14, color: "#374151", marginBottom: 8 }}>
          🔑 Anthropic API キー
        </label>
        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
          <a href="https://console.anthropic.com" target="_blank" style={{ color: "#6366f1" }}>console.anthropic.com</a> から取得できます。
          キーはこのセッション中のみ使用され、保存されません。
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-ant-api03-..."
            style={{
              flex: 1, padding: "10px 14px", border: "1.5px solid #e5e7eb",
              borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "monospace"
            }}
          />
          <button
            onClick={() => setShowKey(!showKey)}
            style={{
              padding: "10px 14px", border: "1.5px solid #e5e7eb",
              borderRadius: 10, background: "white", cursor: "pointer", fontSize: 14
            }}
          >
            {showKey ? "🙈" : "👁️"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={onBack} style={{
          flex: 1, padding: "14px", border: "2px solid #e5e7eb",
          borderRadius: 12, background: "white", fontSize: 15,
          cursor: "pointer", fontWeight: 600, color: "#6b7280"
        }}>
          ← 戻る
        </button>
        <button
          onClick={onAnalyze}
          disabled={isLoading || !apiKey.trim()}
          style={{
            flex: 2, padding: "14px",
            background: apiKey.trim() ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "#e5e7eb",
            border: "none", borderRadius: 12, color: "white",
            fontSize: 15, cursor: apiKey.trim() ? "pointer" : "not-allowed",
            fontWeight: 700,
          }}
        >
          {isLoading ? "分析中... ⏳" : "AI診断を開始する ✨"}
        </button>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ textAlign: "center", padding: "80px 24px" }}>
      <div style={{ fontSize: 60, marginBottom: 24, animation: "spin 2s linear infinite" }}>✨</div>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: "#374151", marginBottom: 12 }}>AI分析中...</h2>
      <p style={{ color: "#6b7280", lineHeight: 1.6 }}>
        ブランド情報をもとに12のアーキタイプへの<br />
        適合度を分析しています
      </p>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ResultsScreen({ results, formData, onRestart, onReport }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedArchetype, setSelectedArchetype] = useState(null);

  const sortedScores = results.scores
    ? [...results.scores].sort((a, b) => b.score - a.score)
    : [];
  const top3 = sortedScores.slice(0, 3);
  const primary = top3[0];
  const primaryArchetype = primary ? ARCHETYPES.find(a => a.id === primary.id) : null;
  const primaryQ = primaryArchetype ? getQuadrant(primaryArchetype.quadrant) : null;

  const radarData = ARCHETYPES.map(a => {
    const s = results.scores?.find(x => x.id === a.id);
    return { name: a.nameJa, score: s?.score || 0, fullMark: 10 };
  });

  const barData = sortedScores.map(s => {
    const a = ARCHETYPES.find(x => x.id === s.id);
    const q = getQuadrant(a?.quadrant);
    return { name: a?.nameJa, score: s.score, color: q?.color || "#6366f1", icon: a?.icon };
  });

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🎯</div>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: "#111827", marginBottom: 4 }}>診断結果</h2>
        <p style={{ fontSize: 14, color: "#6b7280" }}>{formData.brandName || "ブランド"} のアーキタイプ分析</p>
      </div>

      {/* Primary Archetype */}
      {primaryArchetype && (
        <div style={{
          background: `linear-gradient(135deg, ${primaryQ.color}15, ${primaryQ.color}08)`,
          border: `2px solid ${primaryQ.color}50`,
          borderRadius: 20, padding: "24px",
          marginBottom: 24, textAlign: "center"
        }}>
          <div style={{ fontSize: 12, color: primaryQ.color, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>
            PRIMARY ARCHETYPE
          </div>
          <div style={{ fontSize: 56, marginBottom: 8 }}>{primaryArchetype.icon}</div>
          <h3 style={{ fontSize: 32, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>
            {primaryArchetype.nameJa}
          </h3>
          <div style={{ fontSize: 16, color: primaryQ.color, marginBottom: 12 }}>{primaryArchetype.nameEn}</div>
          <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, maxWidth: 480, margin: "0 auto 16px" }}>
            {primaryArchetype.description}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {primaryArchetype.keywords.map(k => (
              <span key={k} style={{
                background: primaryQ.color, color: "white",
                borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 600
              }}>{k}</span>
            ))}
          </div>
        </div>
      )}

      {/* Top 3 */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#374151", marginBottom: 12 }}>
          🏆 適合度ランキング TOP 3
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {top3.map((s, i) => {
            const a = ARCHETYPES.find(x => x.id === s.id);
            const q = getQuadrant(a?.quadrant);
            return (
              <div key={s.id} style={{
                border: `2px solid ${q?.color}50`,
                background: i === 0 ? `${q?.color}12` : "white",
                borderRadius: 16, padding: "16px", textAlign: "center",
              }}>
                <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>#{i + 1}</div>
                <div style={{ fontSize: 32, marginBottom: 6 }}>{a?.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{a?.nameJa}</div>
                <div style={{ fontSize: 11, color: q?.color, marginBottom: 8 }}>{a?.nameEn}</div>
                <div style={{
                  fontSize: 28, fontWeight: 800, color: q?.color
                }}>{s.score}<span style={{ fontSize: 14 }}>/10</span></div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#f3f4f6", borderRadius: 12, padding: 4 }}>
        {["overview", "analysis", "archetypes"].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            flex: 1, padding: "8px 12px", border: "none",
            borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
            background: activeTab === tab ? "white" : "transparent",
            color: activeTab === tab ? "#6366f1" : "#6b7280",
            boxShadow: activeTab === tab ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
          }}>
            {tab === "overview" ? "📊 スコア" : tab === "analysis" ? "💡 AI分析" : "🗺️ 全アーキタイプ"}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div>
          <div style={{ height: 320, marginBottom: 24 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <PolarRadiusAxis angle={90} domain={[0, 10]} tick={false} />
                <Radar name="適合度" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={60} />
                <Tooltip formatter={(v) => [`${v}/10`, "適合度"]} />
                <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "analysis" && results.analysis && (
        <div style={{ background: "#f9fafb", borderRadius: 16, padding: "20px" }}>
          <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.9, whiteSpace: "pre-wrap" }}>
            {results.analysis}
          </div>
          {results.recommendations && (
            <div style={{ marginTop: 20, padding: 16, background: "#eef2ff", borderRadius: 12 }}>
              <div style={{ fontWeight: 700, color: "#6366f1", marginBottom: 8, fontSize: 14 }}>
                💡 ブランディングアプローチの提案
              </div>
              <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                {results.recommendations}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "archetypes" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {ARCHETYPES.map(a => {
            const s = results.scores?.find(x => x.id === a.id);
            return (
              <ArchetypeCard
                key={a.id}
                archetype={a}
                score={s?.score ? `${s.score}/10` : undefined}
                selected={selectedArchetype === a.id}
                onClick={() => setSelectedArchetype(selectedArchetype === a.id ? null : a.id)}
                compact
              />
            );
          })}
        </div>
      )}

      {/* Selected Archetype Detail */}
      {selectedArchetype && activeTab === "archetypes" && (() => {
        const a = ARCHETYPES.find(x => x.id === selectedArchetype);
        const q = getQuadrant(a.quadrant);
        return (
          <div style={{
            marginTop: 20, background: q.light,
            border: `2px solid ${q.border}`, borderRadius: 16, padding: "20px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 40 }}>{a.icon}</span>
              <div>
                <h4 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111827" }}>{a.nameJa}</h4>
                <div style={{ fontSize: 13, color: q.color }}>{a.nameEn} • {a.role}</div>
              </div>
            </div>
            <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, marginBottom: 12 }}>{a.description}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
              <div><strong style={{ color: "#6366f1" }}>核心的欲求：</strong>{a.coreDesire}</div>
              <div><strong style={{ color: "#ef4444" }}>恐れ：</strong>{a.fear}</div>
              <div><strong style={{ color: "#374151" }}>トーン：</strong>{a.tone}</div>
              <div><strong style={{ color: "#374151" }}>参照ブランド：</strong>{a.brands.join("、")}</div>
            </div>
          </div>
        );
      })()}

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
        <button onClick={onRestart} style={{
          flex: 1, padding: "14px", border: "2px solid #e5e7eb",
          borderRadius: 12, background: "white", fontSize: 14,
          cursor: "pointer", fontWeight: 600, color: "#6b7280"
        }}>
          🔄 最初からやり直す
        </button>
        <button onClick={onReport} style={{
          flex: 2, padding: "14px",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          border: "none", borderRadius: 12, color: "white",
          fontSize: 14, cursor: "pointer", fontWeight: 700,
        }}>
          📄 レポートを出力する
        </button>
      </div>
    </div>
  );
}

function ReportScreen({ results, formData, onBack }) {
  const top3 = results.scores
    ? [...results.scores].sort((a, b) => b.score - a.score).slice(0, 3)
    : [];

  const handlePrint = () => window.print();

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px" }}>
      <div className="no-print" style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{
          padding: "10px 20px", border: "2px solid #e5e7eb",
          borderRadius: 10, background: "white", cursor: "pointer", fontWeight: 600
        }}>← 戻る</button>
        <button onClick={handlePrint} style={{
          padding: "10px 24px",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          border: "none", borderRadius: 10, color: "white",
          cursor: "pointer", fontWeight: 700
        }}>🖨️ 印刷 / PDF保存</button>
      </div>

      {/* Printable Report */}
      <div id="report" style={{ background: "white", padding: "40px", borderRadius: 16, border: "1px solid #e5e7eb" }}>
        <div style={{ textAlign: "center", marginBottom: 32, borderBottom: "2px solid #6366f1", paddingBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔮</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>ブランドアーキタイプ診断レポート</h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>
            {formData.brandName || "ブランド名"} ｜ {new Date().toLocaleDateString("ja-JP")}
          </p>
        </div>

        {/* Brand Summary */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#6366f1", marginBottom: 12 }}>ブランド基本情報</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <tbody>
              {[
                ["ブランド名", formData.brandName],
                ["主な事業", formData.mainBusiness],
                ["創業・規模", formData.founded],
                ["ターゲット顧客", formData.targetCustomer],
              ].filter(r => r[1]).map(([k, v]) => (
                <tr key={k} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 600, color: "#374151", width: "30%", background: "#f9fafb" }}>{k}</td>
                  <td style={{ padding: "8px 12px", color: "#6b7280" }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top 3 */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#6366f1", marginBottom: 12 }}>診断結果 — 上位アーキタイプ</h2>
          {top3.map((s, i) => {
            const a = ARCHETYPES.find(x => x.id === s.id);
            const q = getQuadrant(a?.quadrant);
            return (
              <div key={s.id} style={{
                border: `1.5px solid ${q?.border}`,
                background: i === 0 ? q?.light : "white",
                borderRadius: 12, padding: "16px", marginBottom: 12
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 32 }}>{a?.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>
                      #{i + 1} {a?.nameJa} ({a?.nameEn})
                    </div>
                    <div style={{ fontSize: 12, color: q?.color }}>{a?.role}</div>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: q?.color }}>{s.score}<span style={{ fontSize: 13 }}>/10</span></div>
                </div>
                <p style={{ fontSize: 13, color: "#374151", margin: "0 0 8px", lineHeight: 1.6 }}>{a?.description}</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {a?.keywords.map(k => (
                    <span key={k} style={{
                      background: q?.color, color: "white",
                      borderRadius: 20, padding: "2px 10px", fontSize: 11
                    }}>{k}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Analysis */}
        {results.analysis && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#6366f1", marginBottom: 12 }}>AI分析コメント</h2>
            <div style={{
              background: "#f9fafb", borderRadius: 12, padding: "16px",
              fontSize: 14, color: "#374151", lineHeight: 1.8, whiteSpace: "pre-wrap"
            }}>
              {results.analysis}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {results.recommendations && (
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#6366f1", marginBottom: 12 }}>ブランディングアプローチの提案</h2>
            <div style={{
              background: "#eef2ff", borderRadius: 12, padding: "16px",
              fontSize: 14, color: "#374151", lineHeight: 1.8, whiteSpace: "pre-wrap"
            }}>
              {results.recommendations}
            </div>
          </div>
        )}

        {/* All Scores */}
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#6366f1", marginBottom: 12 }}>全アーキタイプ適合度</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {QUADRANTS.map(q => (
              <div key={q.id}>
                <div style={{ fontWeight: 700, fontSize: 12, color: q.color, marginBottom: 6 }}>{q.name}</div>
                {getArchetypesByQuadrant(q.id).map(a => {
                  const s = results.scores?.find(x => x.id === a.id);
                  return (
                    <div key={a.id} style={{
                      display: "flex", justifyContent: "space-between",
                      fontSize: 12, padding: "4px 0", borderBottom: "1px solid #f3f4f6"
                    }}>
                      <span>{a.icon} {a.nameJa}</span>
                      <strong style={{ color: q.color }}>{s?.score || 0}</strong>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid #e5e7eb", textAlign: "center", fontSize: 12, color: "#9ca3af" }}>
          ブランドアーキタイプ診断ツール ｜ Powered by Claude AI
        </div>
      </div>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          #report { border: none !important; padding: 0 !important; }
        }
      `}</style>
    </div>
  );
}

// ===== AI ANALYSIS =====

async function analyzeWithClaude(apiKey, formData) {
  const brandInfo = `
【ブランド基本情報】
- ブランド名：${formData.brandName || "未入力"}
- 主な事業内容：${formData.mainBusiness || "未入力"}
- 創業年・規模：${formData.founded || "未入力"}
- ターゲット顧客：${formData.targetCustomer || "未入力"}
- 競合ブランド：${formData.competitors || "未入力"}

【創業・ブランドの魂】
- 創業者の想い・背景：${formData.founderStory || "未入力"}
- 最も印象的なブランドコミュニケーション：${formData.brandCommunication || "未入力"}
- 顧客との関係性：${formData.customerRelationship || "未入力"}

【ブランドの実体】
- ブランドの役割：${formData.brandRole || "未入力"}
- コアバリュー：${formData.coreValue || "未入力"}
- 独自性・強み：${formData.brandAssets || "未入力"}
- 利用パターン：${formData.usagePattern || "未入力"}

【競合分析・差別化】
- 競合のイメージ：${formData.competitorArchetypes || "未入力"}
- 差別化したい点：${formData.differentiator || "未入力"}
- カテゴリー傾向：${formData.categoryTrend || "未入力"}

【感性・人格】
- 企業理念・ステートメント：${formData.philosophy || "未入力"}
- ブランドの人格：${formData.brandPersonality || "未入力"}
- 理想のイメージ・世界観：${formData.idealImage || "未入力"}
- 課題と理想：${formData.challenges || "未入力"}
`;

  const prompt = `あなたはブランドマーケティングの専門家です。

以下のブランド情報をもとに、12種類のブランドアーキタイプへの適合度（10段階）を分析してください。

【12種類のブランドアーキタイプ】
安定/制御：creator（創造者）、caregiver（援助者）、ruler（統治者）
帰属/楽しみ：jester（道化師）、everyman（一般大衆）、lover（恋人）
支配/リスク：hero（英雄）、outlaw（無法者）、magician（魔術師）
自立/自己実現：innocent（幼子）、explorer（探検家）、sage（賢者）

${brandInfo}

以下の形式でJSONを返してください：
{
  "scores": [
    {"id": "creator", "score": 7, "reason": "理由を1〜2文で"},
    {"id": "caregiver", "score": 4, "reason": "理由"},
    {"id": "ruler", "score": 8, "reason": "理由"},
    {"id": "jester", "score": 3, "reason": "理由"},
    {"id": "everyman", "score": 5, "reason": "理由"},
    {"id": "lover", "score": 6, "reason": "理由"},
    {"id": "hero", "score": 7, "reason": "理由"},
    {"id": "outlaw", "score": 4, "reason": "理由"},
    {"id": "magician", "score": 9, "reason": "理由"},
    {"id": "innocent", "score": 5, "reason": "理由"},
    {"id": "explorer", "score": 6, "reason": "理由"},
    {"id": "sage", "score": 5, "reason": "理由"}
  ],
  "analysis": "ブランドの総合的な分析コメント（300〜400字）",
  "recommendations": "最も適合するアーキタイプに基づいたブランディングアプローチの提案（300〜400字）"
}

必ずJSONのみを返してください。`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "API呼び出しに失敗しました");
  }

  const data = await response.json();
  const text = data.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("レスポンスのパースに失敗しました");
  return JSON.parse(jsonMatch[0]);
}

// ===== MAIN APP =====

export default function App() {
  const [screen, setScreen] = useState("landing"); // landing | workshop | apikey | loading | results | report
  const [workshopStep, setWorkshopStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [apiKey, setApiKey] = useState("");
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleFormChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleWorkshopNext = () => {
    if (workshopStep < WORKSHOP_STEPS.length - 1) {
      setWorkshopStep(prev => prev + 1);
    } else {
      setScreen("apikey");
    }
  };

  const handleWorkshopBack = () => {
    if (workshopStep > 0) setWorkshopStep(prev => prev - 1);
    else setScreen("landing");
  };

  const handleAnalyze = async () => {
    if (!apiKey.trim()) return;
    setIsLoading(true);
    setError("");
    setScreen("loading");
    try {
      const res = await analyzeWithClaude(apiKey, formData);
      setResults(res);
      setScreen("results");
    } catch (e) {
      setError(e.message);
      setScreen("apikey");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = () => {
    setScreen("landing");
    setWorkshopStep(0);
    setFormData({});
    setResults(null);
    setError("");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f8fafc 0%, #f0f4ff 50%, #faf0ff 100%)",
      fontFamily: "'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Yu Gothic', sans-serif",
    }}>
      {/* Nav */}
      <div style={{
        background: "rgba(255,255,255,0.8)", backdropFilter: "blur(10px)",
        borderBottom: "1px solid #e5e7eb", padding: "12px 24px",
        display: "flex", alignItems: "center", gap: 8,
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <span style={{ fontSize: 20 }}>🔮</span>
        <span style={{ fontWeight: 700, fontSize: 15, color: "#374151" }}>ブランドアーキタイプ ワークショップ</span>
        {screen !== "landing" && (
          <button onClick={() => setScreen("landing")} style={{
            marginLeft: "auto", fontSize: 12, color: "#6b7280",
            background: "none", border: "none", cursor: "pointer"
          }}>← ホームに戻る</button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          maxWidth: 680, margin: "16px auto 0",
          padding: "12px 16px", background: "#fef2f2",
          border: "1px solid #fca5a5", borderRadius: 10,
          fontSize: 14, color: "#dc2626"
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Screens */}
      {screen === "landing" && <LandingScreen onStart={() => setScreen("workshop")} />}

      {screen === "workshop" && (
        <WorkshopScreen
          stepIndex={workshopStep}
          formData={formData}
          onChange={handleFormChange}
          onNext={handleWorkshopNext}
          onBack={handleWorkshopBack}
        />
      )}

      {screen === "apikey" && (
        <ApiKeyScreen
          apiKey={apiKey}
          setApiKey={setApiKey}
          onAnalyze={handleAnalyze}
          onBack={() => setScreen("workshop")}
          isLoading={isLoading}
        />
      )}

      {screen === "loading" && <LoadingScreen />}

      {screen === "results" && results && (
        <ResultsScreen
          results={results}
          formData={formData}
          onRestart={handleRestart}
          onReport={() => setScreen("report")}
        />
      )}

      {screen === "report" && results && (
        <ReportScreen
          results={results}
          formData={formData}
          onBack={() => setScreen("results")}
        />
      )}
    </div>
  );
}
