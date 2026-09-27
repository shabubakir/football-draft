// ============================================================
// GEOGUESSR LITE — банк локаций
//
// ВАЖНО: photo и координаты обязаны соответствовать друг другу.
// Координаты — точка, которую показывает фото (установлены
// вручную по известным достопримечательностям).
//
// Источник фото: Wikimedia Commons (CC). Файлы не скачиваются —
// используются прямые URL thumbnail.wikimedia.org. Банк легко
// пополнять: добавь объект в массив LOCATIONS.
//
// Структура соответствует ТЗ:
// { id, image, latitude, longitude, country, city, description }
//
// Будущие режимы (FOOTBALL_STADIUMS, CITIES, COUNTRY_STREAK,
// DAILY, DUEL) фильтруются через поле `kind` и селекторы ниже.
// ============================================================

import { shuffle, type GeoLocation } from "./geo-engine";

// Прямой URL оригинала (без thumbnail) — гарантирует, что файл существует.
// Для крупных фото браузеру не нужен thumbnail: Commons отдаёт JPEG.
const orig = (title: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
    title
  )}?width=1600`;

export const LOCATIONS: GeoLocation[] = [
  // ==================== КАЗАХСТАН ====================
  {
    id: "kz-astana-bayterek",
    image: orig("Astana-2021-10 - 12.jpg"),
    latitude: 51.1643,
    longitude: 71.4645,
    country: "Казахстан",
    city: "Астана",
    description: "Панорама Астаны с Байтереком на набережной",
    kind: "city",
  },
  {
    id: "kz-almaty-koktobe",
    image: orig("Sunset over the Almaty seen from Kok Tobe mountain, pic 2.jpg"),
    latitude: 43.235,
    longitude: 76.923,
    country: "Казахстан",
    city: "Алматы",
    description: "Алматы со смотровой площадки Кок-Тобе",
    kind: "city",
  },
  {
    id: "kz-burabay",
    image: orig("Lake Burabai 2.jpg"),
    latitude: 53.1525,
    longitude: 69.7361,
    country: "Казахстан",
    city: "Бурабай",
    description: "Озеро Бурабай, нацпарк «Бурабай»",
    kind: "nature",
  },

  // ==================== ЕВРОПА ====================
  {
    id: "fr-paris-eiffel",
    image: orig("Champ de Mars from the Eiffel Tower - July 2006 edit.jpg"),
    latitude: 48.8584,
    longitude: 2.2945,
    country: "Франция",
    city: "Париж",
    description: "Шам-де-Марс с уровня Эйфелевой башни",
    kind: "landmark",
  },
  {
    id: "gb-london-bigben",
    image: orig("Big Ben Elizabeth Tower London 2023 01.jpg"),
    latitude: 51.5007,
    longitude: -0.1246,
    country: "Великобритания",
    city: "Лондон",
    description: "Большой Бен и Вестминстерский дворец",
    kind: "landmark",
  },
  {
    id: "it-rome-colosseum",
    image: orig("Colosseo 2020.jpg"),
    latitude: 41.8902,
    longitude: 12.4922,
    country: "Италия",
    city: "Рим",
    description: "Колизей",
    kind: "landmark",
  },
  {
    id: "de-berlin-brandenburg",
    image: orig("Brandenburger Tor morgens.jpg"),
    latitude: 52.5163,
    longitude: 13.3777,
    country: "Германия",
    city: "Берлин",
    description: "Бранденбургские ворота",
    kind: "landmark",
  },

  // ==================== АЗИЯ ====================
  {
    id: "jp-tokyo-tower",
    image: orig("Tokyo Tower, Minato City.jpg"),
    latitude: 35.6586,
    longitude: 139.7454,
    country: "Япония",
    city: "Токио",
    description: "Башня Токио в районе Минато",
    kind: "landmark",
  },

  // ==================== БЛИЖНИЙ ВОСТОК ====================
  {
    id: "ae-dubai-burj",
    image: orig("Dubai Skyline mit Burj Khalifa (18241030269).jpg"),
    latitude: 25.1972,
    longitude: 55.2744,
    country: "ОАЭ",
    city: "Дубай",
    description: "Бурдж-Халифа и финансовый район Дубая",
    kind: "landmark",
  },
  {
    id: "eg-cairo-pyramids",
    image: orig("Great Sphinx (أبو الهول).jpg"),
    latitude: 29.9753,
    longitude: 31.1376,
    country: "Египет",
    city: "Каир",
    description: "Великий сфинкс и пирамиды Гизы",
    kind: "landmark",
  },

  // ==================== СЕВЕРНАЯ АМЕРИКА ====================
  {
    id: "us-ny-one-wtc",
    image: orig("Lower Manhattan from Jersey City November 2014 panorama 3.jpg"),
    latitude: 40.7127,
    longitude: -74.0134,
    country: "США",
    city: "Нью-Йорк",
    description: "Lower Manhattan с One World Trade Center",
    kind: "city",
  },
  {
    id: "ca-toronto-cn",
    image: orig("Sunset Toronto Skyline Panorama Crop from Snake Island.jpg"),
    latitude: 43.6426,
    longitude: -79.3871,
    country: "Канада",
    city: "Торонто",
    description: "Панорама Торонто с CN Tower",
    kind: "city",
  },

  // ==================== ЮЖНАЯ АМЕРИКА ====================
  {
    id: "br-rio-cristo",
    image: orig("Redentor Over Clouds 1.jpg"),
    latitude: -22.9519,
    longitude: -43.2105,
    country: "Бразилия",
    city: "Рио-де-Жанейро",
    description: "Христос-Искупитель над Рио",
    kind: "landmark",
  },

  // ==================== АФРИКА ====================
  {
    id: "tz-kilimanjaro",
    image: orig("Clouds Over Mount Kilimanjaro (Unsplash).jpg"),
    latitude: -3.0674,
    longitude: 37.3556,
    country: "Танзания",
    city: "Килиманджаро",
    description: "Килиманджаро — высочайшая вершина Африки",
    kind: "nature",
  },

  // ==================== ОКЕАНИЯ ====================
  {
    id: "au-sydney-opera",
    image: orig("Sydney Opera House and Harbour Bridge Dusk (3) 2019-06-21.jpg"),
    latitude: -33.8568,
    longitude: 151.2153,
    country: "Австралия",
    city: "Сидней",
    description: "Оперный театр и мост через бухту",
    kind: "landmark",
  },
];

// ==================== Селекторы (подготовка к будущим режимам) ====================

/** DAILY: детерминированная сетка по дате — все игроки получают
 *  одни и те же 5 локаций. Зарезервировано: пока не используется. */
export function dailyLocations(date = new Date()): GeoLocation[] {
  const d =
    date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  let seed = d % 2147483647;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return shuffle(LOCATIONS, rand).slice(0, 5);
}

/** FOOTBALL_STADIUMS: фильтр по виду (будет заполняться стадионом). */
export function stadiumLocations(): GeoLocation[] {
  return LOCATIONS.filter((l) => l.kind === "stadium");
}

/** CITIES: только города (kind === "city"). */
export function cityLocations(): GeoLocation[] {
  return LOCATIONS.filter((l) => l.kind === "city");
}
