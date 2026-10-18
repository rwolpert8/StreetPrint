"use client";

import { useLayoutEffect, useRef, useState } from "react";

export function PuzzleMap() {
  const [zoom, setZoom] = useState(1);
  const viewport = useRef<HTMLDivElement>(null);
  const centre = useRef({ x: 0.5, y: 0.5 });

  function changeZoom(next: number) {
    const element = viewport.current;
    if (element) centre.current = {
      x: (element.scrollLeft + element.clientWidth / 2) / element.scrollWidth,
      y: (element.scrollTop + element.clientHeight / 2) / element.scrollHeight,
    };
    setZoom(next);
  }

  useLayoutEffect(() => {
    const element = viewport.current;
    if (element) {
      element.scrollLeft = centre.current.x * element.scrollWidth - element.clientWidth / 2;
      element.scrollTop = centre.current.y * element.scrollHeight - element.clientHeight / 2;
    }
  }, [zoom]);

  return <figure className="map-figure">
    <div className="map-topline"><span>CITY MAP</span><span><span className="water-dot" />Water <span className="street-line" />Streets</span></div>
    <div className="map-frame">
      <div className="north-mark" aria-label="North is up"><span>N</span><svg width="18" height="25" viewBox="0 0 18 25" aria-hidden="true"><path d="M9 1 16 22 9 17 2 22Z" fill="#24323b" /><path d="M9 1V17L2 22Z" fill="#faf9f6" stroke="#24323b" /></svg></div>
      <div ref={viewport} className="map-viewport" tabIndex={0} role="region" aria-label="Street map. Use zoom buttons, then scroll to explore.">
        <div style={{ width: `${zoom * 100}%` }}>
          {/* Plain SVG image: local pre-generated asset; no image transformation needed. */}
          <img src="/puzzles/study-001.svg" alt="Unlabeled city street network with light-blue water" width={1000} height={1000} draggable={false} className="puzzle-image" />
        </div>
      </div>
      <div className="map-controls" aria-label="Map zoom controls">
        <button type="button" aria-label="Zoom out" disabled={zoom === 1} onClick={() => changeZoom(Math.max(1, zoom - 0.5))}>−</button>
        <button type="button" className="zoom-level" aria-label="Reset map zoom" onClick={() => changeZoom(1)}>{Math.round(zoom * 100)}%</button>
        <button type="button" aria-label="Zoom in" disabled={zoom === 3} onClick={() => changeZoom(Math.min(3, zoom + 0.5))}>+</button>
      </div>
    </div>
    <figcaption><span>6 × 6 km · North up · {zoom > 1 ? "Scroll to explore" : "Zoom in for a closer look"}</span><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a></figcaption>
  </figure>;
}
