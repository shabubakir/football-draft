// Статичная база футболистов (работает без БД).
// В продакшене можно заменить на таблицу public.players в Supabase.

export type Player = {
  id: number;
  name_ru: string;
  name_en: string;
  country: string;
  position: "ВР" | "Защитник" | "Полузащитник" | "Нападающий";
  birth_year: number;
  current_club: string;
  debut_club: string;
  max_market_value: number; // млн €
};

export const PLAYERS: Player[] = [
  { id: 1, name_ru: "Лео Месси", name_en: "Lionel Messi", country: "Аргентина", position: "Полузащитник", birth_year: 1987, current_club: "Интер Майами", debut_club: "Барселона", max_market_value: 135 },
  { id: 2, name_ru: "Криштиану Роналду", name_en: "Cristiano Ronaldo", country: "Португалия", position: "Нападающий", birth_year: 1985, current_club: "Ал-Наср", debut_club: "Спортинг", max_market_value: 100 },
  { id: 3, name_ru: "Криштиану Роналду (Юный)", name_en: "C. Ronaldo Jr", country: "Португалия", position: "Полузащитник", birth_year: 2004, current_club: "Спортинг", debut_club: "Спортинг", max_market_value: 8 },
  { id: 4, name_ru: "Нeymar", name_en: "Neymar Jr", country: "Бразилия", position: "Полузащитник", birth_year: 1992, current_club: "Сан-Паулу", debut_club: "Сан-Паулу", max_market_value: 120 },
  { id: 5, name_ru: "Лука Модрич", name_en: "Luka Modric", country: "Хорватия", position: "Полузащитник", birth_year: 1985, current_club: "Реал Мадрид", debut_club: "Динамо Загреб", max_market_value: 70 },
  { id: 6, name_ru: "Караваев Кевин", name_en: "Kevin De Bruyne", country: "Бельгия", position: "Полузащитник", birth_year: 1991, current_club: "Манчестер Сити", debut_club: "Генк", max_market_value: 115 },
  { id: 7, name_ru: "Эден Азар", name_en: "Eden Hazard", country: "Бельгия", position: "Полузащитник", birth_year: 1991, current_club: "Ретайрмент", debut_club: "Лилль", max_market_value: 110 },
  { id: 8, name_ru: "Антуан Гризманн", name_en: "Antoine Griezmann", country: "Франция", position: "Нападающий", birth_year: 1991, current_club: "Атлетико Мадрид", debut_club: "Ренн", max_market_value: 80 },
  { id: 9, name_ru: "Килиан Мбаппе", name_en: "Kylian Mbappe", country: "Франция", position: "Нападающий", birth_year: 1998, current_club: "Реал Мадрид", debut_club: "Монако", max_market_value: 200 },
  { id: 10, name_ru: "Эрлинг Холанд", name_en: "Erling Haaland", country: "Норвегия", position: "Нападающий", birth_year: 2000, current_club: "Манчестер Сити", debut_club: "Брюгге", max_market_value: 180 },
  { id: 11, name_ru: "Кевин Шацкири", name_en: "Kevin Schachtiri", country: "Швейцария", position: "Полузащитник", birth_year: 1991, current_club: "Ньон", debut_club: "Берн", max_market_value: 20 },
  { id: 12, name_ru: "Дани Алвес", name_en: "Dani Alves", country: "Бразилия", position: "Защитник", birth_year: 1983, current_club: "Коринтианс", debut_club: "Минейро", max_market_value: 25 },
  { id: 13, name_ru: "Хавьер Маскерано", name_en: "Javier Mascherano", country: "Аргентина", position: "Защитник", birth_year: 1984, current_club: "Ретайрмент", debut_club: "Ривер Плейт", max_market_value: 30 },
  { id: 14, name_ru: "Серхио Рамос", name_en: "Sergio Ramos", country: "Испания", position: "Защитник", birth_year: 1986, current_club: "Севилья", debut_club: "Севилья", max_market_value: 55 },
  { id: 15, name_ru: "Джейми Варди", name_en: "Jamie Vardy", country: "Англия", position: "Нападающий", birth_year: 1987, current_club: "Астон Вилла", debut_club: "Флинтшир", max_market_value: 35 },
  { id: 16, name_ru: "Андре Гомеш", name_en: "Andre Gomes", country: "Португалия", position: "Полузащитник", birth_year: 1993, current_club: "Бенфика", debut_club: "Спортинг", max_market_value: 35 },
  { id: 17, name_ru: "Пол Погба", name_en: "Paul Pogba", country: "Франция", position: "Полузащитник", birth_year: 1993, current_club: "Ювентус", debut_club: "Марсель", max_market_value: 110 },
  { id: 18, name_ru: "Бенчимакейль", name_en: "Achraf Hakimi", country: "Марокко", position: "Защитник", birth_year: 1998, current_club: "Пари Сен-Жермен", debut_club: "Реал Мадрид", max_market_value: 75 },
  { id: 19, name_ru: "Джорджиньо Вейналдум", name_en: "Georginio Wijnaldum", country: "Нидерланды", position: "Полузащитник", birth_year: 1991, current_club: "Аякс", debut_club: "Камбур", max_market_value: 50 },
  { id: 20, name_ru: "Садьо Мане", name_en: "Sadio Mane", country: "Сенегал", position: "Нападающий", birth_year: 1992, current_club: "Аль-Насер", debut_club: "Реда Казабланка", max_market_value: 100 },
  { id: 21, name_ru: "Мохамед Салах", name_en: "Mohamed Salah", country: "Египет", position: "Нападающий", birth_year: 1992, current_club: "Ливерпуль", debut_club: "Эль-Эзбью", max_market_value: 120 },
  { id: 22, name_ru: "Роберт Левандовский", name_en: "Robert Lewandowski", country: "Польша", position: "Нападающий", birth_year: 1988, current_club: "Барселона", debut_club: "Лех", max_market_value: 90 },
  { id: 23, name_ru: "Эрлинг Брун Лаген", name_en: "Erling Braut Haaland", country: "Норвегия", position: "Нападающий", birth_year: 2000, current_club: "Манчестер Сити", debut_club: "Брюгге", max_market_value: 180 },
  { id: 24, name_ru: "Андре Кристенсен", name_en: "Andreas Christensen", country: "Дания", position: "Защитник", birth_year: 1996, current_club: "Байер", debut_club: "Аякс", max_market_value: 60 },
  { id: 25, name_ru: "Йонас Виктор Линдлём", name_en: "Jonas Viktor Lindelof", country: "Швеция", position: "Защитник", birth_year: 1995, current_club: "Манчестер Юнайтед", debut_club: "Копенгаген", max_market_value: 65 },
  { id: 26, name_ru: "Гуладан Диего", name_en: "Diego Godin", country: "Уругвай", position: "Защитник", birth_year: 1986, current_club: "Ретайрмент", debut_club: "Данубио", max_market_value: 35 },
  { id: 27, name_ru: "Маркете Давид", name_en: "David de Gea", country: "Испания", position: "ВР", birth_year: 1990, current_club: "Манчестер Юнайтед", debut_club: "Атлетико Мадрид", max_market_value: 50 },
  { id: 28, name_ru: "Икер Касилья", name_en: "Iker Casillas", country: "Испания", position: "ВР", birth_year: 1981, current_club: "Ретайрмент", debut_club: "Реал Мадрид", max_market_value: 35 },
  { id: 29, name_ru: "Мануэль Нойер", name_en: "Manuel Neuer", country: "Германия", position: "ВР", birth_year: 1986, current_club: "Бавария", debut_club: "Шваби Алльгой", max_market_value: 55 },
  { id: 30, name_ru: "Альфонсо Дэвис", name_en: "Alphonso Davies", country: "Канада", position: "Защитник", birth_year: 2000, current_club: "Бавария", debut_club: "Ванкувер Уайткэпс", max_market_value: 100 },
  { id: 31, name_ru: "Витинь Диего", name_en: "Vini Jr", country: "Бразилия", position: "Полузащитник", birth_year: 2000, current_club: "Реал Мадрид", debut_club: "Фламенго", max_market_value: 150 },
  { id: 32, name_ru: "Джулиан Альварес", name_en: "Julian Alvarez", country: "Аргентина", position: "Нападающий", birth_year: 2000, current_club: "Манчестер Сити", debut_club: "Ривер Плейт", max_market_value: 120 },
  { id: 33, name_ru: "Деклан Райс", name_en: "Declan Rice", country: "Англия", position: "Полузащитник", birth_year: 1999, current_club: "Арсенал", debut_club: "Вест Хэм", max_market_value: 120 },
  { id: 34, name_ru: "Бухары Ярмоленко", name_en: "Yarmolenko", country: "Украина", position: "Полузащитник", birth_year: 1989, current_club: "Динамо Киев", debut_club: "Динамо Киев", max_market_value: 35 },
  { id: 35, name_ru: "Александр Зинченко", name_en: "Alex Zinchenko", country: "Украина", position: "Защитник", birth_year: 1996, current_club: "Манчестер Сити", debut_club: "Динамо Киев", max_market_value: 50 },
  { id: 36, name_ru: "Доминик Собослаи", name_en: "Dominik Szoboszlai", country: "Венгрия", position: "Полузащитник", birth_year: 2000, current_club: "Ливерпуль", debut_club: "Ред Булл Зальцбург", max_market_value: 90 },
  { id: 37, name_ru: "Диего Мардона", name_en: "Diego Maradona", country: "Аргентина", position: "Полузащитник", birth_year: 1960, current_club: "Ретайрмент", debut_club: "Архентинос Хуниорс", max_market_value: 100 },
  { id: 38, name_ru: "Пеле", name_en: "Pelé", country: "Бразилия", position: "Нападающий", birth_year: 1940, current_club: "Ретайрмент", debut_club: "Сантос", max_market_value: 100 },
  { id: 39, name_ru: "Йохан Кройфф", name_en: "Johan Cruyff", country: "Нидерланды", position: "Нападающий", birth_year: 1947, current_club: "Ретайрмент", debut_club: "Аякс", max_market_value: 50 },
  { id: 40, name_ru: "Мишель Платини", name_en: "Michel Platini", country: "Франция", position: "Полузащитник", birth_year: 1955, current_club: "Ретайрмент", debut_club: "Сент-Этьен", max_market_value: 30 },
  { id: 41, name_ru: "Зинедин Зидан", name_en: "Zinedine Zidane", country: "Франция", position: "Полузащитник", birth_year: 1972, current_club: "Ретайрмент", debut_club: "Кан", max_market_value: 50 },
  { id: 42, name_ru: "Андрей Шевченко", name_en: "Andriy Shevchenko", country: "Украина", position: "Нападающий", birth_year: 1976, current_club: "Ретайрмент", debut_club: "Динамо Киев", max_market_value: 35 },
  { id: 43, name_ru: "Аленич Денис", name_en: "Denis Cheryshev", country: "Россия", position: "Полузащитник", birth_year: 1988, current_club: "Ретайрмент", debut_club: "Торпедо", max_market_value: 25 },
  { id: 44, name_ru: "Артём Дзюба", name_en: "Artem Dzyuba", country: "Россия", position: "Нападающий", birth_year: 1988, current_club: "Зенит", debut_club: "Анжи", max_market_value: 15 },
  { id: 45, name_ru: "Виктор Цыганков", name_en: "Viktor Tsygankov", country: "Украина", position: "Полузащитник", birth_year: 1997, current_club: "Шахтёр", debut_club: "Шахтёр", max_market_value: 18 },
  { id: 46, name_ru: "Доминик Калверт-Льюис", name_en: "Dominic Calvert-Lewin", country: "Англия", position: "Нападающий", birth_year: 1997, current_club: "Эвертон", debut_club: "Эвертон", max_market_value: 25 },
  { id: 47, name_ru: "Жан-Пьер Эффенберг", name_en: "Jean-Pierre Efemberg", country: "Бельгия", position: "Полузащитник", birth_year: 1995, current_club: "Брюгге", debut_club: "Брюгге", max_market_value: 12 },
  { id: 48, name_ru: "Харис Беккабек", name_en: "Haris Bekkabeck", country: "Норвегия", position: "Защитник", birth_year: 1998, current_club: "Боруссия Д", debut_club: "Лиллестрём", max_market_value: 20 },
];

export function pickRandomPlayer(excludeId?: number): Player {
  const pool = excludeId ? PLAYERS.filter((p) => p.id !== excludeId) : PLAYERS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function findPlayerByName(name: string): Player | undefined {
  const n = name.trim().toLowerCase();
  return (
    PLAYERS.find((p) => p.name_ru.toLowerCase() === n) ??
    PLAYERS.find((p) => p.name_en.toLowerCase() === n)
  );
}
