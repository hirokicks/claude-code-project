export const QUADRANTS = [
  { id: "stability", name: "安定 / 制御", subtitle: "安心感を抱く", color: "#6366f1", light: "#eef2ff", border: "#c7d2fe" },
  { id: "belonging", name: "帰属 / 楽しみ", subtitle: "愛情やコミュニティを手に入れる", color: "#ec4899", light: "#fdf2f8", border: "#fbcfe8" },
  { id: "mastery", name: "支配 / リスク", subtitle: "成功する・成し遂げる", color: "#f59e0b", light: "#fffbeb", border: "#fde68a" },
  { id: "freedom", name: "自立 / 自己実現", subtitle: "幸せを見つけられる", color: "#10b981", light: "#ecfdf5", border: "#a7f3d0" },
];

export const ARCHETYPES = [
  { id: "creator", nameJa: "創造者", nameEn: "Creator", quadrant: "stability", icon: "🎨", role: "新しいものを作り出す", coreDesire: "傑出した作品・体験の創造", fear: "凡庸さ・模倣", description: "革新と表現を通じて世界に価値を生み出す。ビジョンとオリジナリティを大切にし、妥協のない品質と独創性を追求する人格。", tone: "インスピレーション的・芸術的・こだわり強め", brands: ["Apple", "LEGO", "Adobe", "Dyson"], keywords: ["革新", "創造性", "オリジナリティ", "表現", "ビジョン"] },
  { id: "caregiver", nameJa: "援助者", nameEn: "Caregiver", quadrant: "stability", icon: "🤝", role: "他者を助ける", coreDesire: "他者の保護とケア", fear: "利己主義・不安定", description: "他者の世話をし、保護することに使命感を持つ。温かみと共感を大切にし、コミュニティの安全と幸福を守る人格。", tone: "温かみ・誠実・安心感・共感", brands: ["JOHNSON'S", "Pampers", "UNICEF", "Campbell's"], keywords: ["ケア", "共感", "サポート", "安心", "温かみ"] },
  { id: "ruler", nameJa: "統治者", nameEn: "Ruler", quadrant: "stability", icon: "👑", role: "統制力を発揮する", coreDesire: "繁栄・秩序の維持", fear: "混乱・失墜", description: "秩序とコントロールを重視し、安定した組織・社会を構築する。権威と責任感を持ち、高い品質の基準を定める人格。", tone: "権威的・洗練・信頼感・格調", brands: ["Mercedes-Benz", "Rolex", "Microsoft", "American Express"], keywords: ["権威", "品質", "秩序", "安定", "リーダーシップ"] },
  { id: "jester", nameJa: "道化師", nameEn: "Jester", quadrant: "belonging", icon: "🎭", role: "楽しむ", coreDesire: "今この瞬間を楽しむ", fear: "退屈・つまらなさ", description: "ユーモアと遊び心で世界を明るくする。今この瞬間を楽しむことを大切にし、人々に笑いと軽さをもたらす人格。", tone: "ユーモラス・軽快・遊び心・エネルギッシュ", brands: ["Ben&Jerry's", "Old Spice", "Skittles", "M&M's"], keywords: ["ユーモア", "遊び心", "楽しさ", "軽さ", "笑い"] },
  { id: "everyman", nameJa: "一般大衆", nameEn: "Everyman", quadrant: "belonging", icon: "👥", role: "ありのままでいい", coreDesire: "所属感・繋がり", fear: "孤立・エリート主義", description: "等身大の親しみやすさで人々と繋がる。特別である必要はなく、共感と帰属意識を大切にする人格。", tone: "親しみやすい・誠実・等身大・フレンドリー", brands: ["IKEA", "Gap", "eBay", "Walmart"], keywords: ["親しみ", "共感", "誠実", "平等", "コミュニティ"] },
  { id: "lover", nameJa: "恋人", nameEn: "Lover", quadrant: "belonging", icon: "❤️", role: "愛を見つけ、与える", coreDesire: "親密さ・感覚的な豊かさ", fear: "孤独・無関心", description: "官能的な美しさと情熱で人々を魅了する。親密さと豊かな体験を通じて、特別な絆と深い共鳴を育む人格。", tone: "情熱的・官能的・洗練・プレミアム感", brands: ["Chanel", "Godiva", "Alfa Romeo", "Victoria's Secret"], keywords: ["情熱", "美", "親密さ", "官能", "魅力"] },
  { id: "hero", nameJa: "英雄", nameEn: "Hero", quadrant: "mastery", icon: "⚔️", role: "勇敢に行動する", coreDesire: "証明・世界をより良くする", fear: "弱さ・脆弱性", description: "困難に立ち向かい、世界をより良くするために戦う。強い意志と克己心で不可能を可能にする人格。", tone: "力強い・挑戦的・インスピレーション・勝利", brands: ["Nike", "FedEx", "BMW", "Gatorade"], keywords: ["勇敢", "強さ", "挑戦", "勝利", "克服"] },
  { id: "outlaw", nameJa: "無法者", nameEn: "Outlaw", quadrant: "mastery", icon: "💥", role: "ルールを破る", coreDesire: "変革・革命", fear: "無力さ・形骸化", description: "既成概念を壊し、革命を起こす。ルールや制度に反抗し、真の自由と根本的な変革を求める人格。", tone: "反骨的・自由・挑発的・ロック", brands: ["Harley-Davidson", "Virgin", "Diesel", "Converse"], keywords: ["反抗", "自由", "破壊", "革命", "個性"] },
  { id: "magician", nameJa: "魔術師", nameEn: "Magician", quadrant: "mastery", icon: "✨", role: "生まれ変わりを促す", coreDesire: "知識・変容・奇跡", fear: "悪い副作用・意図しない結果", description: "夢を現実に変える触媒。変容と奇跡をもたらし、人々の可能性を広げ、世界を根本から変えようとする人格。", tone: "神秘的・変革的・インスピレーション・ビジョナリー", brands: ["Disney", "Mastercard", "Dyson", "Polaroid"], keywords: ["変容", "奇跡", "ビジョン", "魔法", "可能性"] },
  { id: "innocent", nameJa: "幼子", nameEn: "Innocent", quadrant: "freedom", icon: "🌸", role: "信じる心を保つ・取り戻す", coreDesire: "幸福・純粋さ・安全", fear: "悪い行為・懲罰", description: "純粋さと楽観主義で幸せを追求する。シンプルさの中に美しさを見出し、善意と誠実さを信じる人格。", tone: "純粋・楽観的・シンプル・温かい", brands: ["Dove", "Coca-Cola", "Nintendo", "Innocent Drinks"], keywords: ["純粋", "楽観", "シンプル", "誠実", "幸福"] },
  { id: "explorer", nameJa: "探検家", nameEn: "Explorer", quadrant: "freedom", icon: "🧭", role: "自立を保つ", coreDesire: "自由・発見・新体験", fear: "空虚さ・束縛", description: "自由と冒険を求め、世界を探求する。自己発見の旅を通じて真の自分を見つけ、常に新しい地平を目指す人格。", tone: "冒険的・自由・独立・発見・アクティブ", brands: ["REI", "Jeep", "National Geographic", "Patagonia"], keywords: ["冒険", "自由", "発見", "探求", "独立"] },
  { id: "sage", nameJa: "賢者", nameEn: "Sage", quadrant: "freedom", icon: "🔭", role: "世界を理解する", coreDesire: "真実・知恵・洞察", fear: "無知・欺瞞", description: "知識と知恵を通じて真実を追求する。深い分析と洞察で世界を理解し、他者に知識と啓発をもたらす人格。", tone: "知的・信頼性・分析的・教育的", brands: ["Google", "BBC", "TED", "The Economist"], keywords: ["知識", "知恵", "分析", "真実", "洞察"] },
];

export const WORKSHOP_STEPS = [
  {
    id: "soul", title: "ブランドの魂を探る", subtitle: "創業精神・ブランドのルーツを掘り下げる", icon: "🌱", color: "#6366f1",
    hint: "ブランドの歴史を紐解き、創業者の想いとブランドの誕生背景を探ります。",
    questions: [
      { id: "brandName", label: "ブランド名", required: true, type: "text", placeholder: "例：株式会社〇〇 / ブランド名" },
      { id: "mainBusiness", label: "主な事業内容", required: true, type: "text", placeholder: "例：Webデザイン・ブランディングコンサルティング" },
      { id: "founded", label: "創業年・従業員数（任意）", type: "text", placeholder: "例：2010年創業 / 従業員50名" },
      { id: "founderStory", label: "創業者の想い・ブランドが生まれた背景", type: "textarea", placeholder: "誰がどういう理由でこのブランドを生み出したのか？\nブランド誕生当時の社会背景は？\n創業当初のポジショニングは？" },
      { id: "brandCommunication", label: "最も印象的なブランドコミュニケーション", type: "textarea", placeholder: "これまで最も記憶に残るメッセージ・キャンペーン・スローガンは？" },
      { id: "customerRelationship", label: "顧客との関係性", type: "textarea", placeholder: "顧客はこのブランドとどのように関わってきたか？現在の関係は？" },
    ]
  },
  {
    id: "reality", title: "ブランドの実体を探る", subtitle: "現代における真実味を検証する", icon: "🔍", color: "#ec4899",
    hint: "ステップ①で見つかったアーキタイプが、現代においても真実味があるかを検証します。",
    questions: [
      { id: "brandRole", label: "ブランドの役割", type: "select", options: ["機能的（課題解決・利便性中心）", "価値観的（ライフスタイル・アイデンティティ表現）", "両方を兼ね備えている"] },
      { id: "involvement", label: "製品・サービスの関与度", type: "select", options: ["高関与型（高額・長期利用・慎重な購買）", "低関与型（日常的・手軽・習慣的購買）"] },
      { id: "coreValue", label: "ユーザーに与えるコアバリュー", required: true, type: "textarea", placeholder: "このブランドが提供する本質的な価値は？\n機能的・感情的・自己表現的にどんな意味があるか？" },
      { id: "targetCustomer", label: "ターゲット顧客像", required: true, type: "textarea", placeholder: "誰のためのブランドか？\nターゲットの価値観・ライフスタイル・動機は？" },
      { id: "brandAssets", label: "競合と比べて際立つ強み・独自性", type: "textarea", placeholder: "このブランドの本質的な強みと競合と比べて際立っている部分は？" },
      { id: "usagePattern", label: "顧客の利用パターン", type: "select", options: ["専らこのブランドのみ使用", "複数ブランドの中の一つ", "状況によって使い分け"] },
    ]
  },
  {
    id: "competition", title: "競合分析", subtitle: "市場における差別化ポイントを見極める", icon: "⚡", color: "#f59e0b",
    hint: "競合ブランドのアーキタイプを把握し、差別化の機会を探ります。",
    questions: [
      { id: "competitors", label: "主な競合ブランド", type: "text", placeholder: "例：〇〇社、△△社、□□社" },
      { id: "competitorArchetypes", label: "競合ブランドのイメージ・雰囲気", type: "textarea", placeholder: "競合ブランドはどのようなイメージを持っているか？\nどんな人格・トーンを表現しているか？" },
      { id: "differentiator", label: "差別化したい点・市場の空白", type: "textarea", placeholder: "競合とどう違いを出したいか？\n市場の中でまだ占有されていない感情的ポジションはあるか？" },
      { id: "categoryTrend", label: "業界・カテゴリーの傾向", type: "textarea", placeholder: "この業界全体で共通するトーンやイメージはあるか？\nカテゴリー全体で新しいアーキタイプを創出できるか？" },
    ]
  },
  {
    id: "sensory", title: "感性分析", subtitle: "直感と言語からアーキタイプを探る", icon: "🎯", color: "#10b981",
    hint: "歴史的・マーケット視点とは別に、直感的な観点からアーキタイプを探ります。",
    questions: [
      { id: "philosophy", label: "ブランドのステートメント・理念", type: "textarea", placeholder: "企業理念・ミッション・ビジョン・バリューなど" },
      { id: "brandPersonality", label: "このブランドが「人」だとしたら？", type: "textarea", placeholder: "どんな人物像か？\nどんな言葉を使うか？どんな服装をしているか？\nどんな雰囲気・性格を持つか？" },
      { id: "idealImage", label: "理想のブランドイメージ・世界観", type: "textarea", placeholder: "目指したい視覚的な世界観、感情的な印象、雰囲気を教えてください" },
      { id: "challenges", label: "現在の課題と理想の状態", type: "textarea", placeholder: "今どんな課題がありますか？\nブランディングを通じてどうなりたいですか？" },
    ]
  }
];

export const getQuadrant = (id) => QUADRANTS.find(q => q.id === id);
export const getArchetypesByQuadrant = (qid) => ARCHETYPES.filter(a => a.quadrant === qid);
