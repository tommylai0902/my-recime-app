// api/auth.js — 註冊 / 登入 / 忘記密碼 / 重設密碼，回傳 JWT
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getUserId } from './_utils.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const RESET_TTL_MIN = 30;
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const signToken = (uid) => jwt.sign({ uid }, process.env.JWT_SECRET, { expiresIn: '30d' });

async function sendResetMail(to, link, lang) {
  const key = process.env.RESEND_API_KEY;
  const zh = lang !== 'en';
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESET_MAIL_FROM || 'onboarding@resend.dev',
      to,
      subject: zh ? '重設你嘅「我的食譜」密碼' : 'Reset your My Recipes password',
      html: zh
        ? `<p>撳下面條連結重設密碼（${RESET_TTL_MIN} 分鐘內有效）：</p><p><a href="${link}">${link}</a></p><p>如果唔係你要求嘅，唔使理呢封電郵。</p>`
        : `<p>Click the link below to reset your password (valid for ${RESET_TTL_MIN} minutes):</p><p><a href="${link}">${link}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
    }),
  });
  if (!r.ok) {
    // 唔可以將寄失敗照拋出去：只有「真係有註冊」先會行到呢步，
    // 拋error等於話咗俾人聽呢個email有帳號。記錄落server log算數。
    console.error('resend failed', r.status, await r.text());
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const { action, username, password, email, token: resetToken, lang } = req.body || {};

  try {
    // ---- 忘記密碼：寄重設連結 ----
    if (action === 'forgot') {
      const mail = (email || '').trim().toLowerCase();
      if (!isEmail(mail)) return res.status(400).json({ error: 'invalid_input' });
      // 部署層面嘅問題，同「呢個email有冇註冊」無關 —— 要喺查用戶之前答，
      // 否則有註冊/冇註冊嘅回應唔同，就變咗俾人查邊個email有帳號
      if (!process.env.RESEND_API_KEY) return res.status(503).json({ error: 'email_not_configured' });
      const r = await pool.query('SELECT id FROM users WHERE email = $1', [mail]);
      // 唔透露個email有冇註冊過（防止拿嚟查邊個有帳號），但真係有先寄
      if (r.rowCount > 0) {
        const raw = crypto.randomBytes(32).toString('hex');
        await pool.query(
          `UPDATE users SET reset_token_hash = $2, reset_expires = now() + interval '${RESET_TTL_MIN} minutes' WHERE id = $1`,
          [r.rows[0].id, sha256(raw)]
        );
        const base = process.env.APP_URL || 'https://my-recime-app.vercel.app';
        await sendResetMail(mail, `${base}/?reset=${raw}`, lang);
      }
      return res.status(200).json({ ok: true });
    }

    // ---- 用重設連結設定新密碼 ----
    if (action === 'reset') {
      if (!resetToken || !password) return res.status(400).json({ error: 'invalid_input' });
      if (password.length < 6) return res.status(400).json({ error: 'password_too_short' });
      const r = await pool.query(
        'SELECT id, username FROM users WHERE reset_token_hash = $1 AND reset_expires > now()',
        [sha256(resetToken)]
      );
      if (r.rowCount === 0) return res.status(400).json({ error: 'reset_link_invalid' });
      const hash = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE users SET password_hash = $2, reset_token_hash = NULL, reset_expires = NULL WHERE id = $1',
        [r.rows[0].id, hash]
      );
      return res.status(200).json({ token: signToken(r.rows[0].id), username: r.rows[0].username });
    }

    // ---- 已登入用戶補填/更新 email（舊用戶冇email，冇email就用唔到忘記密碼）----
    if (action === 'set-email') {
      const uid = getUserId(req);
      if (!uid) return res.status(401).json({ error: 'unauthorized' });
      const mail = (email || '').trim().toLowerCase();
      if (!isEmail(mail)) return res.status(400).json({ error: 'invalid_email' });
      try {
        await pool.query('UPDATE users SET email = $2 WHERE id = $1', [uid, mail]);
      } catch (e) {
        if (e.code === '23505') return res.status(409).json({ error: 'email_taken' });
        throw e;
      }
      return res.status(200).json({ email: mail });
    }

    // ---- 註冊 / 登入 ----
    const name = (username || '').trim().toLowerCase();
    if (!name || !password) return res.status(400).json({ error: 'invalid_input' });

    let user;
    if (action === 'register') {
      if (password.length < 6) return res.status(400).json({ error: 'password_too_short' });
      const mail = (email || '').trim().toLowerCase();
      if (!isEmail(mail)) return res.status(400).json({ error: 'invalid_email' });
      const hash = await bcrypt.hash(password, 10);
      try {
        const r = await pool.query(
          'INSERT INTO users (username, password_hash, email) VALUES ($1, $2, $3) RETURNING id, username',
          [name, hash, mail]
        );
        user = r.rows[0];
      } catch (e) {
        if (e.code === '23505') {
          return res.status(409).json({ error: e.constraint === 'users_email_uniq' ? 'email_taken' : 'username_taken' });
        }
        throw e;
      }
    } else {
      const r = await pool.query('SELECT id, username, password_hash FROM users WHERE username = $1', [name]);
      if (!r.rows[0] || !(await bcrypt.compare(password, r.rows[0].password_hash))) {
        return res.status(401).json({ error: 'bad_credentials' });
      }
      user = r.rows[0];
    }
    res.status(200).json({ token: signToken(user.id), username: user.username });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'server_error' });
  }
}
