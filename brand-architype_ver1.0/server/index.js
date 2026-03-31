import express from 'express';
import cors from 'cors';
import { PROVIDER_CONFIG } from './providers.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.post('/api/analyze', async (req, res) => {
  const { apiKey, provider = 'anthropic', formData } = req.body;

  const config = PROVIDER_CONFIG[provider];
  if (!config) {
    return res.status(400).json({ error: `未対応のプロバイダーです: ${provider}` });
  }

  const keyError = config.validate(apiKey);
  if (keyError) {
    return res.status(400).json({ error: keyError });
  }

  const info = Object.entries({
    'ブランド名': formData.brandName,
    '主な事業': formData.mainBusiness,
    '創業・規模': formData.founded,
    '創業の背景・創業者の想い': formData.founderStory,
    'ブランドコミュニケーション': formData.brandCommunication,
    '顧客との関係性': formData.customerRelationship,
    'ブランドの役割': formData.brandRole,
    'コアバリュー': formData.coreValue,
    'ターゲット顧客': formData.targetCustomer,
    '独自性・強み': formData.brandAssets,
    '利用パターン': formData.usagePattern,
    '競合ブランド': formData.competitors,
    '競合のイメージ': formData.competitorArchetypes,
    '差別化したい点': formData.differentiator,
    '業界傾向': formData.categoryTrend,
    '企業理念・ステートメント': formData.philosophy,
    'ブランドの人格像': formData.brandPersonality,
    '理想のイメージ': formData.idealImage,
    '課題と理想': formData.challenges,
  }).filter(([, v]) => v).map(([k, v]) => `・${k}：${v}`).join('\n');

  const prompt = `あなたはブランドマーケティングの専門家です。以下のブランド情報を深く分析し、12種類のブランドアーキタイプへの適合度を評価してください。

【ブランド情報】
${info}

【12種類のブランドアーキタイプ】
安定/制御：creator（創造者）、caregiver（援助者）、ruler（統治者）
帰属/楽しみ：jester（道化師）、everyman（一般大衆）、lover（恋人）
支配/リスク：hero（英雄）、outlaw（無法者）、magician（魔術師）
自立/自己実現：innocent（幼子）、explorer（探検家）、sage（賢者）

以下のJSON形式で回答してください（JSONのみ、説明文なし）：
{
  "scores": [
    {"id": "creator", "score": 7, "reason": "このブランドに適合/不適合する具体的な理由を1〜2文で"},
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
  "analysis": "ブランドの本質的な特性とアーキタイプ傾向についての総合分析（350〜450字程度）",
  "recommendations": "最も適合するアーキタイプに基づいた具体的なブランディングアプローチの提案。コミュニケーションスタイル、ビジュアル方向性、差別化戦略を含む（350〜450字程度）"
}`;

  try {
    const text = await config.call(apiKey, prompt);
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return res.status(500).json({ error: 'AIの回答を解析できませんでした。もう一度お試しください。' });
    }
    const result = JSON.parse(match[0]);
    res.json(result);
  } catch (err) {
    const message = config.extractError(err);
    res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
