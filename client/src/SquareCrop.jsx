import React, { useEffect, useRef, useState } from 'react';

const BOX = 280; // 裁圖方框嘅 CSS px 大小
const OUT = 1024; // 輸出正方形相嘅像素大小

// IG 風格正方形裁圖：固定方框，拖曳/縮放張相嚟揀想要嘅部分
export default function SquareCrop({ file, onCancel, onConfirm, title, cancelLabel, confirmLabel }) {
  const imgRef = useRef(null);
  const dragRef = useRef(null);
  const [url, setUrl] = useState(null);
  const [natural, setNatural] = useState(null); // { w, h }
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // 圖片左上角相對方框嘅 offset（CSS px）

  useEffect(() => {
    if (!file) return;
    const objUrl = URL.createObjectURL(file);
    setUrl(objUrl);
    setNatural(null);
    setZoom(1);
    setPos({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(objUrl);
  }, [file]);

  if (!file || !url) return null;

  const minScale = natural ? BOX / Math.min(natural.w, natural.h) : 1;
  const scale = minScale * zoom;
  const dispW = natural ? natural.w * scale : 0;
  const dispH = natural ? natural.h * scale : 0;

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
  const clampWith = (p, w, h) => ({
    x: clamp(p.x, Math.min(BOX - w, 0), 0),
    y: clamp(p.y, Math.min(BOX - h, 0), 0),
  });

  // 圖片載入完成：知道自然大小，計最小縮放並置中
  const onImgLoad = () => {
    const w = imgRef.current.naturalWidth;
    const h = imgRef.current.naturalHeight;
    const ms = BOX / Math.min(w, h);
    setNatural({ w, h });
    setPos({ x: (BOX - w * ms) / 2, y: (BOX - h * ms) / 2 });
  };

  const onPointerDown = (e) => {
    if (!natural) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origin: pos };
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const { startX, startY, origin } = dragRef.current;
    setPos(clampWith({ x: origin.x + (e.clientX - startX), y: origin.y + (e.clientY - startY) }, dispW, dispH));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const onZoomChange = (z) => {
    setZoom(z);
    if (!natural) return;
    const s = minScale * z;
    setPos((p) => clampWith(p, natural.w * s, natural.h * s));
  };

  const confirm = () => {
    const cropX = -pos.x / scale;
    const cropY = -pos.y / scale;
    const cropSize = BOX / scale;
    const canvas = document.createElement('canvas');
    canvas.width = OUT;
    canvas.height = OUT;
    canvas.getContext('2d').drawImage(imgRef.current, cropX, cropY, cropSize, cropSize, 0, 0, OUT, OUT);
    onConfirm(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 max-w-xs w-full">
        {title && <p className="font-bold mb-2 text-center">{title}</p>}
        <div
          className="relative mx-auto overflow-hidden rounded touch-none select-none bg-gray-200 dark:bg-gray-700"
          style={{ width: BOX, height: BOX }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <img
            ref={imgRef}
            src={url}
            alt=""
            draggable={false}
            onLoad={onImgLoad}
            className="absolute top-0 left-0 max-w-none pointer-events-none"
            style={{ width: dispW, height: dispH, transform: `translate(${pos.x}px, ${pos.y}px)` }}
          />
        </div>
        <input
          type="range"
          min="1"
          max="3"
          step="0.05"
          value={zoom}
          disabled={!natural}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          className="w-full mt-3"
        />
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 font-bold py-2 rounded"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!natural}
            className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-bold py-2 rounded"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
