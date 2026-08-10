// api/upload-image.js — 將掃描/上載嗰張相存做永久 URL（Vercel Blob），俾食譜做縮圖用
import { put } from '@vercel/blob';
import { getUserId } from './_utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const uid = getUserId(req);
  if (!uid) return res.status(401).json({ error: 'unauthorized' });

  const { image, media_type: mediaType } = req.body || {};
  if (!image) return res.status(400).json({ error: 'missing_image' });

  try {
    const ext = (mediaType || 'image/jpeg').split('/')[1] || 'jpg';
    const buffer = Buffer.from(image, 'base64');
    if (buffer.length > 8 * 1024 * 1024) return res.status(413).json({ error: 'image_too_large' });

    const blob = await put(`recipes/${uid}/${Date.now()}.${ext}`, buffer, {
      access: 'public',
      contentType: mediaType || 'image/jpeg',
    });
    res.status(200).json({ url: blob.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'upload_failed' });
  }
}
