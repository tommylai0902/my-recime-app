// api/_gemini.js — 共用 Gemini 呼叫（底線開頭，Vercel 唔會當成 route）
// ponytail: 免費 tier 個別模型會塞車（503）/退役（404），順序試落去
const MODELS = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite'];

export async function askGemini(parts, schema) {
  let r;
  for (const model of MODELS) {
    const generationConfig = { responseMimeType: 'application/json', responseSchema: schema };
    // Gemini 3 系預設 thinking 深度高，抽食譜呢啲簡單嘢會白等成半分鐘 — 較低佢
    if (model.startsWith('gemini-3')) generationConfig.thinkingConfig = { thinkingLevel: 'low' };
    r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({ contents: [{ parts }], generationConfig }),
      }
    );
    if (r.ok) break;
    console.error(model, r.status, await r.text());
    if (![400, 404, 429, 503].includes(r.status)) break; // 400 都跳下一個模型（參數支援度唔同）
  }
  if (!r.ok) {
    const busy = r.status === 429 || r.status === 503;
    const err = new Error(busy ? 'busy' : 'gemini_failed');
    err.status = busy ? 429 : 500;
    throw err;
  }
  const data = await r.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const err = new Error('unrecognized');
    err.status = 422;
    throw err;
  }
  return JSON.parse(text);
}

// 食譜輸出格式（掃描 + 網址匯入共用）
export const recipeSchema = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING', description: '菜式名稱' },
    category: { type: 'STRING', description: '分類，例如 中式/意式/日式' },
    ingredients: { type: 'ARRAY', items: { type: 'STRING' }, description: '材料清單，每項包含份量' },
    description: { type: 'STRING', description: '簡介 + 簡短做法步驟' },
  },
  required: ['name', 'category', 'ingredients', 'description'],
};

export function geminiError(res, err, fallback) {
  console.error(err);
  const known = ['busy', 'unrecognized', 'gemini_failed'];
  res.status(err.status || 500).json({ error: known.includes(err.message) ? err.message : fallback });
}
