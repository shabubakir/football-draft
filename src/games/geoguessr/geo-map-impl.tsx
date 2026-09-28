"use client";

// Реальная карта Leaflet (см. geo-map.tsx — динамическая загрузка).
// Используется и для установки точки игрока, и для показа
// результата (правильная точка + линия + расстояние).

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface GeoMapImplProps {
  center?: [number, number];
  zoom?: number;
  guess: [number, number] | null;
  onGuessChange?: (lat: number, lng: number) => void;
  reveal?: {
    correct: [number, number];
    correctLabel: string;
    guessLabel?: string | null;
    distanceText?: string | null;
    points?: number | null;
  } | null;
  locked?: boolean;
  /** при смене — сбрасываем все маркеры и линию (новый раунд) */
  roundKey?: string | number;
  className?: string;
}

// Кастомные маркеры (SVG-данные, чтобы не зависеть от asset-пути)
function pinIcon(color: string, label?: string) {
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;transform:translate(-50%,-100%);">
      <svg width="34" height="46" viewBox="0 0 34 46" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))">
        <path d="M17 0C7.6 0 0 7.6 0 17c0 12 17 29 17 29s17-17 17-29C34 7.6 26.4 0 17 0z" fill="${color}"/>
        <circle cx="17" cy="17" r="7" fill="#fff"/>
      </svg>
      ${
        label
          ? `<div style="position:absolute;left:38px;top:6px;white-space:nowrap;background:#1c1917;color:#fff;font-size:12px;font-weight:700;padding:3px 8px;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.3)">${label}</div>`
          : ""
      }
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export function GeoMapImpl({
  center = [25, 10],
  zoom = 2,
  guess,
  onGuessChange,
  reveal,
  locked = false,
  roundKey,
  className = "",
}: GeoMapImplProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const guessMarkerRef = useRef<L.Marker | null>(null);
  const correctMarkerRef = useRef<L.Marker | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);
  const guessLabelRef = useRef<L.Marker | null>(null);

  // init (один раз)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center,
      zoom,
      worldCopyJump: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      guessMarkerRef.current = null;
      correctMarkerRef.current = null;
      lineRef.current = null;
      guessLabelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // клик по карте → точка игрока (пока не заперто)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = (e: L.LeafletMouseEvent) => {
      if (locked) return;
      onGuessChange?.(e.latlng.lat, e.latlng.lng);
    };
    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [locked, onGuessChange]);

  // маркер игрока
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!guess) {
      if (guessMarkerRef.current) {
        guessMarkerRef.current.remove();
        guessMarkerRef.current = null;
      }
      return;
    }
    if (guessMarkerRef.current) {
      guessMarkerRef.current.setLatLng(guess);
    } else {
      guessMarkerRef.current = L.marker(guess, {
        icon: pinIcon("#059669"),
        draggable: !locked,
        zIndexOffset: 1000,
      }).addTo(map);
      guessMarkerRef.current.on("dragend", () => {
        const p = guessMarkerRef.current!.getLatLng();
        onGuessChange?.(p.lat, p.lng);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guess, locked, onGuessChange, roundKey]);

  // reveal: правильная точка + линия + подпись
  // roundKey в зависимостях: при смене раунда reveal сбрасывается до null,
  // и этот эффект очищает маркеры (уже сделан эффектом roundKey выше).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!reveal) {
      // reveal = null → убираем все маркеры (новый раунд)
      if (correctMarkerRef.current) {
        correctMarkerRef.current.remove();
        correctMarkerRef.current = null;
      }
      if (lineRef.current) {
        lineRef.current.remove();
        lineRef.current = null;
      }
      if (guessLabelRef.current) {
        guessLabelRef.current.remove();
        guessLabelRef.current = null;
      }
      return;
    }

    const { correct, correctLabel, guessLabel, distanceText, points } = reveal;

    // правильная точка (всегда показываем)
    if (correctMarkerRef.current) correctMarkerRef.current.remove();
    correctMarkerRef.current = L.marker(correct, {
      icon: pinIcon("#dc2626", correctLabel),
      zIndexOffset: 900,
    }).addTo(map);

    if (guess) {
      // линия между точками
      if (lineRef.current) lineRef.current.remove();
      lineRef.current = L.polyline([guess, correct], {
        color: "#f59e0b",
        weight: 3,
        dashArray: "8 6",
        opacity: 0.9,
      }).addTo(map);

      // подпись у точки игрока: расстояние + очки
      if (guessLabelRef.current) {
        guessLabelRef.current.remove();
        guessLabelRef.current = null;
      }
      if (guessLabel && distanceText !== null && points !== null) {
        guessLabelRef.current = L.marker(guess, {
          icon: L.divIcon({
            className: "",
            html: `<div style="transform:translate(-50%,10px);white-space:nowrap;background:#059669;color:#fff;font-size:12px;font-weight:700;padding:3px 8px;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.3)">${guessLabel} · ${distanceText} · ${points} очк.</div>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          }),
          interactive: false,
          zIndexOffset: 950,
        }).addTo(map);
      }

      // подогнать вид на обе точки
      const bounds = L.latLngBounds([guess, correct]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 });
    } else {
      // нет своей точки — центрируем на правильной
      map.setView(correct, Math.max(map.getZoom(), 5));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal, guess, roundKey]);

  return <div ref={containerRef} className={`h-full w-full ${className}`} />;
}
