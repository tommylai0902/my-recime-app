// api/scan-dish.js — 影一張餸相，Gemini 認出係咩菜並出食譜（免費 tier）
const schema = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING', description: '菜式名稱（繁體中文）' },
    category: { type: 'STRING', description: '分類，例如 中式/意式/日式' },
    ingredients: { type: 'ARRAY', items: { type: 'STRING' }, description: '材料清單，每項包含份量' },
    description: { type: 'STRING', description: '簡介 + 簡短做法步驟' },
  },
  required: ['name', 'category', 'ingredients', 'description'],
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { image, media_type: mediaType } = req.body || {};
  if (!image) return res.status(400).json({ error: '缺少圖片' });

  // ponytail: 免費 tier 個別模型會塞車（503）/退役（404），順序試落去
  const models = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite'];

  try {
    let r;
    for (const model of models) {
      r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': process.env.GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { inline_data: { mime_type: mediaType || 'image/jpeg', data: image } },
                  { text: '認出呢張相入面嘅菜式，然後用繁體中文寫出佢嘅食譜（材料連份量、簡短做法）。' },
                ],
              },
            ],
            generationConfig: { responseMimeType: 'application/json', responseSchema: schema },
          }),
        }
      );
      if (r.ok) break;
      console.error(model, r.status, await r.text());
      if (![404, 429, 503].includes(r.status)) break; // 其他錯誤唔使再試
    }
    if (!r.ok) {
      return res.status(r.status === 429 || r.status === 503 ? 429 : 500).json({
        error: r.status === 429 || r.status === 503 ? 'AI 而家太多人用，等一陣再試' : '掃描失敗',
      });
    }
    const data = await r.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return res.status(422).json({ error: '無法辨識呢張相' });
    res.status(200).json(JSON.parse(text));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '掃描失敗', detail: err.message });
  }
};
