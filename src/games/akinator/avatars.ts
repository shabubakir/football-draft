// ============================================================
// АВАТАРЫ ДЛЯ СУЩНОСТЕЙ
// ============================================================
// 1. Реальные фото из /images/players/ (топ-игроки)
// 2. Сгенерированный SVG-аватар (инициалы + цвет по стране)
// ============================================================

import type { Entity } from "./types";
import { WIKI_PHOTOS } from "./wiki-photos";

/** Локальные фото (топ-игроки, уже в public/) */
const LOCAL_PHOTOS: Record<string, string> = {
  messi: "/images/players/messi.jpg",
  ronaldo: "/images/players/ronaldo.jpg",
  mbappe: "/images/players/mbappe.jpg",
  haaland: "/images/players/haaland.jpg",
  modric: "/images/players/modric.jpg",
  neymar: "/images/players/neymar.jpg",
  lewandowski: "/images/players/lewandowski.jpg",
  ibrahimovic: "/images/players/ibrahimovic.jpg",
  benzema: "/images/players/benzema.jpg",
  griezmann: "/images/players/griezmann.jpg",
  kane: "/images/players/kane.jpg",
  salah: "/images/players/salah.jpg",
  vinicius: "/images/players/vinicius.jpg",
  "x_sergio_aguero": "/images/players/aguero.jpg",
  "x_zlatan_ibrahimovic": "/images/players/ibrahimovic.jpg",
};

/** Объединённый словарь: локальные + Wikimedia */
const PLAYER_PHOTOS: Record<string, string> = {
  ...WIKI_PHOTOS,
  ...LOCAL_PHOTOS, // локальные имеют приоритет
};

/** Цвета по стране (для генерации аватара) */
const NATION_COLORS: Record<string, { bg: string; fg: string }> = {
  england:    { bg: "#003399", fg: "#ffffff" },
  spain:      { bg: "#aa1518", fg: "#f1bf24" },
  italy:      { bg: "#006341", fg: "#ffffff" },
  germany:    { bg: "#1515b3", fg: "#ffd500" },
  france:     { bg: "#002395", fg: "#ffffff" },
  netherlands:{ bg: "#ae1c28", fg: "#ffffff" },
  portugal:   { bg: "#006600", fg: "#ffffff" },
  brazil:     { bg: "#009c3b", fg: "#ffdf00" },
  argentina:  { bg: "#74acdf", fg: "#ffffff" },
  russia:     { bg: "#0039a6", fg: "#ffffff" },
  ukraine:    { bg: "#0057b7", fg: "#ffd700" },
  croatia:    { bg: "#ff0000", fg: "#ffffff" },
  belgium:    { bg: "#1d1d1d", fg: "#fdd835" },
  poland:     { bg: "#dc143c", fg: "#ffffff" },
  norway:     { bg: "#ba0c2f", fg: "#ffffff" },
  serbia:     { bg: "#c6363c", fg: "#ffffff" },
  mexico:     { bg: "#006847", fg: "#ffffff" },
  japan:      { bg: "#bc002d", fg: "#ffffff" },
  south_korea:{ bg: "#cd2e3a", fg: "#ffffff" },
  colombia:   { bg: "#fcd116", fg: "#003893" },
  uruguay:    { bg: "#7b9ec8", fg: "#ffffff" },
  chile:      { bg: "#d52b1e", fg: "#ffffff" },
  netherlands2:{ bg: "#21468b", fg: "#ffffff" },
  denmark:    { bg: "#c8102e", fg: "#ffffff" },
  sweden:     { bg: "#006aa7", fg: "#fecc02" },
  switzerland:{ bg: "#d52b1e", fg: "#ffffff" },
  austria:    { bg: "#ed2939", fg: "#ffffff" },
  hungary:    { bg: "#436f4d", fg: "#ffffff" },
  romania:    { bg: "#002b7f", fg: "#ffffff" },
  slovakia:   { bg: "#0b4ea2", fg: "#ffffff" },
  czech:      { bg: "#11457e", fg: "#ffffff" },
  belarus:    { bg: "#0093d0", fg: "#ffffff" },
  greece:     { bg: "#0d5eaf", fg: "#ffffff" },
  scotland:   { bg: "#0084c8", fg: "#ffffff" },
  wales:      { bg: "#a11f33", fg: "#ffffff" },
  turkey:     { bg: "#e30a17", fg: "#ffffff" },
  egypt:      { bg: "#c09300", fg: "#ffffff" },
  senegal:    { bg: "#00853f", fg: "#ffffff" },
  nigeria:    { bg: "#008751", fg: "#ffffff" },
  cameroon:   { bg: "#009543", fg: "#ffffff" },
  ghana:      { bg: "#ce1126", fg: "#ffffff" },
  algeria:    { bg: "#006233", fg: "#ffffff" },
  morocco:    { bg: "#c1272d", fg: "#ffffff" },
  cote_divoire:{ bg: "#f77f00", fg: "#ffffff" },
  iran:       { bg: "#239f40", fg: "#ffffff" },
  saudi:      { bg: "#165d31", fg: "#ffffff" },
  iran2:      { bg: "#239f40", fg: "#ffffff" },
  iraq:       { bg: "#ce1126", fg: "#ffffff" },
  kazakhstan: { bg: "#00afca", fg: "#ffffff" },
  australia:  { bg: "#ffcd00", fg: "#003399" },
  usa:        { bg: "#b31942", fg: "#ffffff" },
  per:        { bg: "#0038a8", fg: "#ffffff" },
  ecuador:    { bg: "#ffdd00", fg: "#00247d" },
  paraguay:   { bg: "#d52b1e", fg: "#ffffff" },
  venezuela:  { bg: "#ffcc00", fg: "#00247d" },
  georgia:    { bg: "#003399", fg: "#d90012" },
  kosovo:     { bg: "#005ce6", fg: "#ffffff" },
  albania:    { bg: "#d72828", fg: "#ffffff" },
  slovenia:   { bg: "#005da4", fg: "#ffffff" },
  mozambique: { bg: "#009639", fg: "#ffffff" },
  guinea:     { bg: "#fdd835", fg: "#ffffff" },
  congo:      { bg: "#007f54", fg: "#ffffff" },
  finland:    { bg: "#003580", fg: "#ffffff" },
  togo:       { bg: "#006a4e", fg: "#ffffff" },
  belize:     { bg: "#062b6c", fg: "#ffffff" },
  liberia:    { bg: "#00853f", fg: "#ffffff" },
  armenia:    { bg: "#d90012", fg: "#ffffff" },
  new_zealand:{ bg: "#1f4d8c", fg: "#ffffff" },
  belgium2:   { bg: "#1d1d1d", fg: "#fdd835" },
};

const DEFAULT_AVATAR = { bg: "#5c677d", fg: "#ffffff" };

/** Получить инициалы (до 2 букв) из имени */
function initials(name: string): string {
  const parts = name.replace(/[^\p{L}\s]/gu, "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** SHA256-подобный хэш строки в число */
function strHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * Получить URL изображения для сущности.
 * Возвращает null, если нет фото (рендерим заглушку).
 */
export function getEntityPhoto(entity: Entity): string | null {
  // 1. Если есть img в данных — используем его
  if (entity.img) return entity.img;

  // 2. Ищем реальное фото по id
  if (PLAYER_PHOTOS[entity.id]) return PLAYER_PHOTOS[entity.id];

  // 3. Для игроков генерируем SVG-аватар с инициалами
  if (entity.category === "player") {
    return generateAvatar(entity);
  }

  // 4. Для остальных категорий — нет фото (рендерим эмодзи)
  return null;
}

/** Сгенерировать data-URI SVG аватара с инициалами */
function generateAvatar(entity: Entity): string {
  const nation = (entity.props.nationality as string) || "";
  const colors = NATION_COLORS[nation] || DEFAULT_AVATAR;
  const init = initials(entity.nameEn || entity.name);
  const h = strHash(entity.id);

  // Лёгкий градиент на основе хэша
  const angle = h % 360;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
  <defs>
    <linearGradient id="g" gradientTransform="rotate(${angle},0.5,0.5)">
      <stop offset="0%" stop-color="${colors.bg}"/>
      <stop offset="100%" stop-color="${shadeColor(colors.bg, -30)}"/>
    </linearGradient>
  </defs>
  <rect width="72" height="72" fill="url(#g)"/>
  <text x="36" y="36" text-anchor="middle" dominant-baseline="central"
    font-family="system-ui,-apple-system,sans-serif" font-size="28" font-weight="800"
    fill="${colors.fg}" opacity="0.95">${init}</text>
</svg>`;

  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

/** Затемнить/осветить hex цвет на pct% */
function shadeColor(hex: string, pct: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, ((n >> 16) & 0xff) + Math.round(2.55 * pct)));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + Math.round(2.55 * pct)));
  const b = Math.min(255, Math.max(0, (n & 0xff) + Math.round(2.55 * pct)));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
