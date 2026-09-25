// Сетка 9: 9 подсказок, 3x3 пересечения.
// Типы: club (клуб), national (сборная), award (награда/доп. факт)

export type GridClueType = "club" | "national" | "award";

export type GridClue = {
  type: GridClueType;
  label: string;     // заголовок: «Клуб», «Сборная», «Награда»
  value: string;     // значение: «Барселона», «Аргентина», «Золотой мяч 2010»
};

export type GridRow = [GridClue, GridClue, GridClue];
export type Grid = [GridRow, GridRow, GridRow]; // 9 пересечений

export type GridTheme = {
  id: string;
  title: string;
  rows: Grid;
};

export const GRID_THEMES: GridTheme[] = [
  {
    id: "legend-2020s",
    title: "Легенды 2020-х",
    rows: [
      [{ type: "club", label: "Клуб", value: "Реал Мадрид" }, { type: "national", label: "Сборная", value: "Франция" }, { type: "award", label: "Факт", value: "Родился в 1998" }],
      [{ type: "club", label: "Клуб", value: "Манчестер Сити" }, { type: "national", label: "Сборная", value: "Норвегия" }, { type: "award", label: "Факт", value: "«Золотая бутса» 2021" }],
      [{ type: "club", label: "Клуб", value: "Барселона" }, { type: "national", label: "Сборная", value: "Аргентина" }, { type: "award", label: "Факт", value: "Золотой мяч x8" }],
    ],
  },
  {
    id: "europe-classics",
    title: "Классика Европы",
    rows: [
      [{ type: "club", label: "Клуб", value: "Арсенал" }, { type: "national", label: "Сборная", value: "Англия" }, { type: "award", label: "Факт", value: "Вырос во «Вест Хэме»" }],
      [{ type: "club", label: "Клуб", value: "Бавария" }, { type: "national", label: "Сборная", value: "Германия" }, { type: "award", label: "Факт", value: "Голкипер" }],
      [{ type: "club", label: "Клуб", value: "Ливерпуль" }, { type: "national", label: "Сборная", value: "Египет" }, { type: "award", label: "Факт", value: "«Фараон»" }],
    ],
  },
  {
    id: "south-america",
    title: "Южная Америка",
    rows: [
      [{ type: "club", label: "Клуб", value: "Сан-Паулу" }, { type: "national", label: "Сборная", value: "Бразилия" }, { type: "award", label: "Факт", value: "«Огонёк»" }],
      [{ type: "club", label: "Клуб", value: "Ривер Плейт" }, { type: "national", label: "Сборная", value: "Аргентина" }, { type: "award", label: "Факт", value: "«Диего»" }],
      [{ type: "club", label: "Клуб", value: "Фламенго" }, { type: "national", label: "Сборная", value: "Бразилия" }, { type: "award", label: "Факт", value: "Вингер" }],
    ],
  },
  {
    id: "goalkeepers",
    title: "Вратари",
    rows: [
      [{ type: "club", label: "Клуб", value: "Реал Мадрид" }, { type: "national", label: "Сборная", value: "Испания" }, { type: "award", label: "Факт", value: "Легенда вратарской" }],
      [{ type: "club", label: "Клуб", value: "Бавария" }, { type: "national", label: "Сборная", value: "Германия" }, { type: "award", label: "Факт", value: "«Ливерпудль» x0" }],
      [{ type: "club", label: "Клуб", value: "Атлетико Мадрид" }, { type: "national", label: "Сборная", value: "Испания" }, { type: "award", label: "Факт", value: "«Сантьяго»" }],
    ],
  },
  {
    id: "legendary-1990s",
    title: "Легенды 90-х",
    rows: [
      [{ type: "club", label: "Клуб", value: "Архентинос Хуниорс" }, { type: "national", label: "Сборная", value: "Аргентина" }, { type: "award", label: "Факт", value: "Золотой мяч 1986" }],
      [{ type: "club", label: "Клуб", value: "Аякс" }, { type: "national", label: "Сборная", value: "Нидерланды" }, { type: "award", label: "Факт", value: "«Божественный»" }],
      [{ type: "club", label: "Клуб", value: "Кан" }, { type: "national", label: "Сборная", value: "Франция" }, { type: "award", label: "Факт", value: "«Зizou»" }],
    ],
  },
];

export function randomTheme(): GridTheme {
  return GRID_THEMES[Math.floor(Math.random() * GRID_THEMES.length)];
}
