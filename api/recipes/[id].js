import { Pool } from 'pg';
import { getUserId, maybeDeleteBlob } from '../_utils.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  const uid = getUserId(req);
  if (!uid) return res.status(401).json({ error: 'unauthorized' });

  // Vercel 會自動將 [id].js 的 id 放在 req.query.id
  const id = parseInt(req.query.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: '無效的食譜 ID' });
  }

  try {
    if (req.method === 'GET') {
      const result = await pool.query(
        'SELECT * FROM recipes WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)',
        [id, uid]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: '找不到食譜' });
      }
      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'PUT') {
      const { name, description, ingredients, image, url, category, prep_minutes, cook_minutes, servings, notes } = req.body;
      const prev = await pool.query(
        'SELECT image FROM recipes WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)',
        [id, uid]
      );
      if (prev.rowCount === 0) {
        return res.status(404).json({ error: '找不到要更新的食譜' });
      }
      const n = (v) => (Number.isFinite(v) ? v : null);
      // notes 淨係「有傳先改」：主表單編輯唔會帶埋 notes，唔想因為咁誤刪備注記錄
      const notesParam = Array.isArray(notes) ? JSON.stringify(notes) : null;
      const result = await pool.query(
        `UPDATE recipes SET name = $1, description = $2, ingredients = $3, image = $4, url = $5, category = $6,
                nutrition = NULL, translation = NULL, prep_minutes = $9, cook_minutes = $10, servings = $11, notes = COALESCE($12::jsonb, notes)
         WHERE id = $7 AND (user_id = $8 OR user_id IS NULL) RETURNING *`,
        [name, description, JSON.stringify(ingredients), image, url, category, id, uid, n(prep_minutes), n(cook_minutes), n(servings), notesParam]
      );
      // 換咗相：舊嗰張（如果係我哋自己存嘅）唔再有用，清走
      if (prev.rows[0].image && prev.rows[0].image !== image) {
        await maybeDeleteBlob(prev.rows[0].image);
      }
      return res.status(200).json(result.rows[0]);
    }

    if (req.method === 'DELETE') {
      const result = await pool.query(
        'DELETE FROM recipes WHERE id = $1 AND (user_id = $2 OR user_id IS NULL) RETURNING image',
        [id, uid]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: '找不到要刪除的食譜' });
      }
      await maybeDeleteBlob(result.rows[0].image);
      return res.status(200).json({ message: '刪除成功' });
    }

    return res.status(405).json({ error: '不支援的請求方法' });
  } catch (err) {
    console.error('API 錯誤：', err);
    return res.status(500).json({ error: '伺服器錯誤', detail: err.message });
  }
}
