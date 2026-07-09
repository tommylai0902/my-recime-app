// api/_utils.js — 底線開頭嘅檔案 Vercel 唔會當成 route
import jwt from 'jsonwebtoken';

export function getUserId(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  try {
    return jwt.verify(token, process.env.JWT_SECRET).uid;
  } catch {
    return null;
  }
}
