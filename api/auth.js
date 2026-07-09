// api/auth.js — 註冊 + 登入，回傳 JWT
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const { action, username, password } = req.body || {};
  const name = (username || '').trim().toLowerCase();
  if (!name || !password) return res.status(400).json({ error: 'invalid_input' });

  try {
    let user;
    if (action === 'register') {
      if (password.length < 6) return res.status(400).json({ error: 'password_too_short' });
      const hash = await bcrypt.hash(password, 10);
      try {
        const r = await pool.query(
          'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
          [name, hash]
        );
        user = r.rows[0];
      } catch (e) {
        if (e.code === '23505') return res.status(409).json({ error: 'username_taken' });
        throw e;
      }
    } else {
      const r = await pool.query('SELECT id, username, password_hash FROM users WHERE username = $1', [name]);
      if (!r.rows[0] || !(await bcrypt.compare(password, r.rows[0].password_hash))) {
        return res.status(401).json({ error: 'bad_credentials' });
      }
      user = r.rows[0];
    }
    const token = jwt.sign({ uid: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(200).json({ token, username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
}
