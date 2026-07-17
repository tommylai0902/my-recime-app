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

  return (
    <div ref={wrapRef}>
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
          labelsData={points}
          labelLat="lat"
          labelLng="lng"
          labelText={(d) => (d.count > 0 ? `${d.name} ${d.count}` : d.name)}
          labelSize={1.6}
          labelDotRadius={0.45}
          labelColor={() => '#ffd166'}
          labelAltitude={0.01}
          onLabelClick={(d) => onSelect && onSelect(d.code)}
        />
      )}
    </div>
  );
}
