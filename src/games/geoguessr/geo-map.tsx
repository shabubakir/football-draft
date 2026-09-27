"use client";

// Интерактивная карта на Leaflet + OpenStreetMap.
// Используется и для установки точки игрока, и для показа
// результата (правильная точка + линия + расстояние).

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface GeoMapProps {
  // начальное положение карты
  center?: [number, number];
  zoom?: number;

  // точка игрока (можно двигать кликом, пока не подтверждена)
  guess: [number, number] | null;
  onGuessChange?: (lat: number, lng: number) => void;

  // после подтверждения: правильная точка + линия
  reveal?: {
    correct: [number, number];
    correctLabel: string;
    guessLabel: string;
    distanceText: string;
    points: number;
  } | null;

  // блокировка кликов (во время показа результата)
  locked?: boolean;

  className?: string;
}

// Кастомные маркеры (SVG-данные, чтобы не зависеть от asset-путь)
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

export function GeoMap({
  center = [25, 10],
  zoom = 2,
  guess,
  onGuessChange,
  reveal,
  locked = false,
  className = "",
}: GeoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const guessMarkerRef = useRef<L.Marker | null>(null);
  const correctMarkerRef = useRef<L.Marker | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);
  const guessLabelRef = useRef<HTMLDivElement>(null);

  // init
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center,
      zoom,
      worldCopyJump: true,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    mapRef.current = map;

    const onClick = (e: L.LeafletMouseEvent) => {
      if (locked) return;
      onGuessChange?.(e.latlng.lat, e.latlng.lng);
    };
    map.on("click", onClick);
    // храним актуальный locked, чтобы не пересоздавать обработчик
    (map as any).__onClick = onClick;

    return () => {
      map.remove();
      mapRef.current = null;
      guessMarkerRef.current = null;
      correctMarkerRef.current = null;
      lineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // обновляем locked в обработчике
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = (e: L.LeafletMouseEvent) => {
      if (locked) return;
      onGuessChange?.(e.latlng.lat, e.latlng.lng);
    };
    (map as any).__handler = handler;
    map.off("click", (map as any).__prevHandler);
    map.on("click", handler);
    (map as any).__prevHandler = handler;
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (!locked) {
        guessMarkerRef.current.on("dragend", () => {
          const p = guessMarkerRef.current!.getLatLng();
          onGuessChange?.(p.lat, p.lng);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guess, locked, onGuessChange]);

  // reveal: правильная точка + линия
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!reveal) {
      if (correctMarkerRef.current) {
        correctMarkerRef.current.remove();
        correctMarkerRef.current = null;
      }
      if (lineRef.current) {
        lineRef.current.remove();
        lineRef.current = null;
      }
      return;
    }

    const { correct, correctLabel, guessLabel, distanceText, points } = reveal;
    if (guess) {
      // линия
      if (lineRef.current) lineRef.current.remove();
      lineRef.current = L.polyline([guess, correct], {
        color: "#f59e0b",
        weight: 3,
        dashArray: "8 6",
        opacity: 0.9,
      }).addTo(map);

      // правильная точка
      if (correctMarkerRef.current) correctMarkerRef.current.remove();
      correctMarkerRef.current = L.marker(correct, {
        icon: pinIcon("#dc2626", correctLabel),
        zIndexOffset: 900,
      }).addTo(map);

      // подпись игрока + расстояние
      if (guessLabelRef.current) {
        guessLabelRef.current.remove();
        guessLabelRef.current = null;
      }
      const label = L.marker(guess, {
        icon: L.divIcon({
          className: "",
          html: `<div style="transform:translate(-50%,10px);white-space:nowrap;background:#059669;color:#fff;font-size:12px;font-weight:700;padding:3px 8px;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.3)">${guessLabel} · ${distanceText} · ${points} очк.</div>`,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }),
        interactive: false,
        zIndexOffset: 950,
      }).addTo(map);
      guessLabelRef.current = label;

      // подогнать вид на обе точки
      const bounds = L.latLngBounds([guess, correct]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal]);

  return <div ref={containerRef} className={`h-full w-full ${className}`} />;
}
