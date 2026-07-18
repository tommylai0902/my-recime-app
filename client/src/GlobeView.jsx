import React, { useEffect, useRef, useState } from 'react';
import Globe from 'react-globe.gl';

// 3D 地球：菜系標記，點高度＝食譜數量。用 React.lazy 載入，唔拖慢主 bundle
export default function GlobeView({ points, height = 420, onSelect }) {
  const wrapRef = useRef(null);
  const globeRef = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const measure = () => setWidth(wrapRef.current ? wrapRef.current.offsetWidth : 0);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    g.controls().autoRotate = true;
    g.controls().autoRotateSpeed = 1.4;
    g.pointOfView({ lat: 23, lng: 110, altitude: 2.1 });
  }, [width]);

  const max = Math.max(...points.map((p) => p.count), 1);

  const setSpin = (on) => {
    const g = globeRef.current;
    if (g) g.controls().autoRotate = on;
  };

  return (
    <div ref={wrapRef} onMouseEnter={() => setSpin(false)} onMouseLeave={() => setSpin(true)}>
      {width > 0 && (
        <Globe
          ref={globeRef}
          width={width}
          height={height}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          atmosphereColor="#88bbff"
          pointsData={points}
          pointLat="lat"
          pointLng="lng"
          pointColor={() => '#f97316'}
          pointAltitude={(d) => 0.06 + (d.count / max) * 0.25}
          pointRadius={0.7}
          onPointClick={(d) => onSelect && onSelect(d.code)}
          htmlElementsData={points}
          htmlLat="lat"
          htmlLng="lng"
          htmlAltitude={0.02}
          htmlElement={(d) => {
            // 3D 文字引擎冇中文字型，用 HTML 標籤先顯示到中文
            const el = document.createElement('div');
            el.textContent = d.count > 0 ? `${d.name} ${d.count}` : d.name;
            el.style.cssText =
              'color:#ffd166;font-size:12px;font-weight:bold;text-shadow:0 0 4px #000,0 0 8px #000;cursor:pointer;transform:translate(-50%,-120%);white-space:nowrap;pointer-events:auto;';
            el.onclick = () => onSelect && onSelect(d.code);
            return el;
          }}
        />
      )}
    </div>
  );
}
