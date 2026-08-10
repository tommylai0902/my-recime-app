// api/_utils.js — 底線開頭嘅檔案 Vercel 唔會當成 route
import jwt from 'jsonwebtoken';
import { del } from '@vercel/blob';

export function getUserId(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  try {
    return jwt.verify(token, process.env.JWT_SECRET).uid;
  } catch {
    return null;
  }
}

// 換相/刪食譜嗰陣清走舊相，唔存喺 Blob 度嘅（用戶自己貼嘅外部 URL）唔會亂刪
export async function maybeDeleteBlob(url) {
  if (!url || !url.includes('.blob.vercel-storage.com')) return;
  try {
    await del(url);
  } catch (err) {
    console.error('刪除舊相失敗:', err.message);
  }
}
