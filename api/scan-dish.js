// api/scan-dish.js — 影一張餸相，Claude 認出係咩菜並出食譜
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic(); // 讀 ANTHROPIC_API_KEY 環境變數

const schema = {
  type: 'object',
  properties: {
    name: { type: 'string', description: '菜式名稱（繁體中文）' },
    category: { type: 'string', description: '分類，例如 中式/意式/日式' },
    ingredients: { type: 'array', items: { type: 'string' }, description: '材料清單，每項包含份量' },
    description: { type: 'string', description: '簡介 + 簡短做法步驟' },
  },
  required: ['name', 'category', 'ingredients', 'description'],
  additionalProperties: false,
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { image, media_type: mediaType } = req.body || {};
  if (!image) return res.status(400).json({ error: '缺少圖片' });

  try {
    const msg = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      output_config: { format: { type: 'json_schema', schema } },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: image } },
            { type: 'text', text: '認出呢張相入面嘅菜式，然後用繁體中文寫出佢嘅食譜（材料連份量、簡短做法）。' },
          ],
        },
      ],
    });

    if (msg.stop_reason === 'refusal') return res.status(422).json({ error: '無法辨識呢張相' });
    const text = msg.content.find((b) => b.type === 'text')?.text;
    res.status(200).json(JSON.parse(text));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '掃描失敗', detail: err.message });
  }
};
