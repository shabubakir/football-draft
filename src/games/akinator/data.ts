import type { Category, Entity, Question } from "./types";
import { parseExtraPlayers, EXTRA_PLAYERS_RAW } from "./players-extra";

// ============================================================
// FOOTBALL AKINATOR — данные
// ============================================================
// Структура:
//  1. PROPS — словарь свойств
//  2. CATEGORIES — категории
//  3. COUNTRIES — страны
//  4. QUESTIONS — вопросы (hard: true = жёсткий фильтр)
//  5. PLAYERS — футболисты (~250)
//  6. COACHES, CLUBS, NATIONAL_TEAMS, STADIUMS, TOURNAMENTS, LEAGUES,
//     REFEREES, POSITIONS, TERMS, AWARDS, EVENTS
//  7. ALL_ENTITIES, ENTITY_MAP
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const P = (props: Record<string, any>) => props;

// ---------- Вспомогательные ----------
const isCat = (e: Entity, c: Category) => e.category === c;
const inList = (v: unknown, s: string) => Array.isArray(v) && v.includes(s);
const NQ = (id: string, label: string, country: string): Question => ({
  id, text: label, group: "player", hard: true,
  check: (e) => (e.props.nationality === country ? true : isCat(e, "player") ? false : null),
});

// ---------- Категории ----------
export const CATEGORIES: { id: Category; label: string; color: string }[] = [
  { id: "player", label: "Футболист", color: "#e63946" },
  { id: "coach", label: "Тренер", color: "#457b9d" },
  { id: "club", label: "Клуб", color: "#2a9d8f" },
  { id: "national_team", label: "Сборная", color: "#e9c46a" },
  { id: "stadium", label: "Стадион", color: "#f4a261" },
  { id: "tournament", label: "Турнир", color: "#9d4edd" },
  { id: "league", label: "Лига", color: "#4cc9f0" },
  { id: "referee", label: "Судья", color: "#606c38" },
  { id: "position", label: "Позиция", color: "#e76f51" },
  { id: "term", label: "Термин", color: "#8d99ae" },
  { id: "award", label: "Награда", color: "#ffd166" },
  { id: "event", label: "Событие", color: "#4361ee" },
];

// ---------- Страны ----------
export const COUNTRIES: { id: string; label: string }[] = [
  { id: "england", label: "Англия" }, { id: "spain", label: "Испания" },
  { id: "italy", label: "Италия" }, { id: "germany", label: "Германия" },
  { id: "france", label: "Франция" }, { id: "netherlands", label: "Нидерланды" },
  { id: "portugal", label: "Португалия" }, { id: "brazil", label: "Бразилия" },
  { id: "argentina", label: "Аргентина" }, { id: "russia", label: "Россия" },
  { id: "ukraine", label: "Украина" }, { id: "croatia", label: "Хорватия" },
  { id: "belgium", label: "Бельгия" }, { id: "cote_divoire", label: "Кот-д'Ивуар" },
  { id: "egypt", label: "Египет" }, { id: "senegal", label: "Сенегал" },
  { id: "poland", label: "Польша" }, { id: "norway", label: "Норвегия" },
  { id: "serbia", label: "Сербия" }, { id: "mexico", label: "Мексика" },
  { id: "japan", label: "Япония" }, { id: "south_korea", label: "Южная Корея" },
  { id: "australia", label: "Австралия" }, { id: "usa", label: "США" },
  { id: "colombia", label: "Колумбия" }, { id: "uruguay", label: "Уругвай" },
  { id: "chile", label: "Чили" }, { id: "nigeria", label: "Нигерия" },
  { id: "ghana", label: "Гана" }, { id: "cameroon", label: "Камерун" },
  { id: "algeria", label: "Алжир" }, { id: "morocco", label: "Марокко" },
  { id: "iraq", label: "Ирак" }, { id: "iran", label: "Иран" },
  { id: "saudi", label: "Саудовская Аравия" }, { id: "kazakhstan", label: "Казахстан" },
  { id: "turkey", label: "Турция" }, { id: "greece", label: "Греция" },
  { id: "scotland", label: "Шотландия" }, { id: "wales", label: "Уэльс" },
  { id: "denmark", label: "Дания" }, { id: "sweden", label: "Швеция" },
  { id: "switzerland", label: "Швейцария" }, { id: "austria", label: "Австрия" },
  { id: "belarus", label: "Беларусь" }, { id: "hungary", label: "Венгрия" },
  { id: "romania", label: "Румыния" }, { id: "bosnia", label: "Босния" },
  { id: "slovakia", label: "Словакия" }, { id: "czech", label: "Чехия" },
  { id: "peru", label: "Перу" }, { id: "ecuador", label: "Эквадор" },
  { id: "paraguay", label: "Парагвай" }, { id: "venezuela", label: "Венесуэла" },
  { id: "togo", label: "Того" }, { id: "belize", label: "Белиз" },
];

// ---------- Континенты ----------
const CONT: Record<string, string> = {
  england: "eu", spain: "eu", italy: "eu", germany: "eu", france: "eu",
  netherlands: "eu", portugal: "eu", russia: "eu", ukraine: "eu",
  croatia: "eu", belgium: "eu", poland: "eu", norway: "eu", serbia: "eu",
  turkey: "eu", greece: "eu", scotland: "eu", wales: "eu", denmark: "eu",
  sweden: "eu", switzerland: "eu", austria: "eu", belarus: "eu",
  hungary: "eu", romania: "eu", bosnia: "eu", slovakia: "eu", czech: "eu",
  brazil: "sa", argentina: "sa", colombia: "sa", uruguay: "sa", chile: "sa",
  peru: "sa", ecuador: "sa", paraguay: "sa", venezuela: "sa",
  cote_divoire: "af", egypt: "af", senegal: "af", nigeria: "af", ghana: "af",
  cameroon: "af", algeria: "af", morocco: "af", togo: "af", liberia: "af",
  armenia: "eu",
  mexico: "na", usa: "na", belize: "na",
  japan: "asia", south_korea: "asia", iran: "asia", iraq: "asia",
  saudi: "asia", kazakhstan: "asia",
  australia: "oce",
};

// ============================================================
// ВОПРОСЫ
// ============================================================

export const QUESTIONS: Question[] = [
  // ---------- Тип сущности (жёсткие) ----------
  { id: "is_person", text: "Это человек?", group: "general", hard: true,
    check: (e) => (e.props.isPerson === true ? true : e.props.isPerson === false ? false : null) },
  { id: "is_player", text: "Это футболист?", group: "general", hard: true,
    check: (e) => (e.props.isPlayer === true ? true : e.props.isPlayer === false ? false : null) },
  { id: "is_coach", text: "Это тренер?", group: "general", hard: true,
    check: (e) => (e.props.isCoach === true ? true : e.props.isCoach === false ? false : null) },
  { id: "is_club", text: "Это футбольный клуб?", group: "club", hard: true,
    check: (e) => isCat(e, "club") ? true : isCat(e, "national_team") ? false : null },
  { id: "is_national_team", text: "Это национальная сборная?", group: "team", hard: true,
    check: (e) => isCat(e, "national_team") ? true : isCat(e, "club") ? false : null },
  { id: "is_stadium", text: "Это стадион?", group: "stadium", hard: true,
    check: (e) => isCat(e, "stadium") ? true : null },

  // ---------- Общие ----------
  { id: "is_active", text: "Действующий / играет сейчас?", group: "general", hard: true,
    check: (e) => (e.props.isActive === true ? true : e.props.isActive === false ? false : null) },
  { id: "is_female", text: "Это женщина?", group: "general", hard: true,
    check: (e) => (e.props.isFemale === true ? true : e.props.isFemale === false ? false : null) },
  { id: "is_legendary", text: "Считается легендой (top tier)?", group: "general",
    check: (e) => (e.props.isLegendary === true ? true : e.props.isLegendary === false ? false : null) },
  { id: "is_icon", text: "Икона своего дела?", group: "general",
    check: (e) => (e.props.isIcon === true ? true : e.props.isIcon === false ? false : null) },
  { id: "is_top5_popular", text: "Входит в топ-5 самых узнаваемых?", group: "general",
    check: (e) => (e.props.isRival === true ? true : e.props.isRival === false ? false : null) },

  // ---------- Позиция (жёсткие) ----------
  { id: "is_gk", text: "Вратарь?", group: "player", hard: true,
    check: (e) => (e.props.isGoalkeeper === true ? true : e.props.isGoalkeeper === false ? false : null) },
  { id: "is_df", text: "Защитник?", group: "player", hard: true,
    check: (e) => (e.props.isDefender === true ? true : e.props.isDefender === false ? false : null) },
  { id: "is_mf", text: "Полузащитник?", group: "player", hard: true,
    check: (e) => (e.props.isMidfielder === true ? true : e.props.isMidfielder === false ? false : null) },
  { id: "is_fw", text: "Нападающий?", group: "player", hard: true,
    check: (e) => (e.props.isForward === true ? true : e.props.isForward === false ? false : null) },
  { id: "is_left_footed", text: "Левша?", group: "player", hard: true,
    check: (e) => (e.props.leftFooted === true ? true : e.props.leftFooted === false ? false : null) },

  // ---------- Достижения ----------
  { id: "won_wc", text: "Выиграл ЧМ мира?", group: "player", hard: true,
    check: (e) => (e.props.wonWorldCup === true ? true : e.props.wonWorldCup === false ? false : null) },
  { id: "won_bd", text: "Выиграл «Золотой мяч»?", group: "player", hard: true,
    check: (e) => (e.props.wonBallonDor === true ? true : e.props.wonBallonDor === false ? false : null) },
  { id: "won_ucl", text: "Выиграл Лигу чемпионов?", group: "player", hard: true,
    check: (e) => (e.props.wonChampionsLeague === true ? true : e.props.wonChampionsLeague === false ? false : null) },
  { id: "won_euro", text: "Выиграл Евро?", group: "player", hard: true,
    check: (e) => (e.props.wonEuros === true ? true : e.props.wonEuros === false ? false : null) },
  { id: "many_goals", text: "Среднее ≥ 0.5 голов за матч?", group: "player",
    check: (e) => (typeof e.props.goalsPerGame === "number" ? (e.props.goalsPerGame as number) >= 0.5 : null) },

  // ---------- Страны, где играл (жёсткие) ----------
  { id: "in_england", text: "Играл/играет в Англии?", group: "player", hard: true,
    check: (e) => (e.props.playedInEngland === true ? true : e.props.playedInEngland === false ? false : null) },
  { id: "in_spain", text: "Играл/играет в Испании?", group: "player", hard: true,
    check: (e) => (e.props.playedInSpain === true ? true : e.props.playedInSpain === false ? false : null) },
  { id: "in_italy", text: "Играл/играет в Италии?", group: "player", hard: true,
    check: (e) => (e.props.playedInItaly === true ? true : e.props.playedInItaly === false ? false : null) },
  { id: "in_germany", text: "Играл/играет в Германии?", group: "player", hard: true,
    check: (e) => (e.props.playedInGermany === true ? true : e.props.playedInGermany === false ? false : null) },
  { id: "in_france", text: "Играл/играет во Франции?", group: "player", hard: true,
    check: (e) => (e.props.playedInFrance === true ? true : e.props.playedInFrance === false ? false : null) },
  { id: "in_netherlands", text: "Играл/играет в Нидерландах?", group: "player", hard: true,
    check: (e) => (e.props.playedInNetherlands === true ? true : e.props.playedInNetherlands === false ? false : null) },
  { id: "in_portugal", text: "Играл/играет в Португалии?", group: "player", hard: true,
    check: (e) => (e.props.playedInPortugal === true ? true : e.props.playedInPortugal === false ? false : null) },
  { id: "in_brazil", text: "Играл/играет в Бразилии?", group: "player", hard: true,
    check: (e) => (e.props.playedInBrazil === true ? true : e.props.playedInBrazil === false ? false : null) },
  { id: "in_argentina", text: "Играл/играет в Аргентине?", group: "player", hard: true,
    check: (e) => (e.props.playedInArgentina === true ? true : e.props.playedInArgentina === false ? false : null) },
  { id: "in_russia", text: "Играл/играет в России?", group: "player", hard: true,
    check: (e) => (e.props.playedInRussia === true ? true : e.props.playedInRussia === false ? false : null) },
  { id: "in_ukraine", text: "Играл/играет на Украине?", group: "player", hard: true,
    check: (e) => (e.props.playedInUkraine === true ? true : e.props.playedInUkraine === false ? false : null) },

  // ---------- Клубы (жёсткие) ----------
  { id: "at_real", text: "Играл за «Реал Мадрид»?", group: "player", hard: true,
    check: (e) => (inList(e.props.famousClubs, "real_madrid") ? true : isCat(e, "player") ? false : null) },
  { id: "at_barca", text: "Играл за «Барселону»?", group: "player", hard: true,
    check: (e) => (inList(e.props.famousClubs, "barcelona") ? true : isCat(e, "player") ? false : null) },
  { id: "at_manu", text: "Играл за «Манчестер Юнайтед»?", group: "player", hard: true,
    check: (e) => (inList(e.props.famousClubs, "man_utd") ? true : isCat(e, "player") ? false : null) },
  { id: "at_manc", text: "Играл за «Манчестер Сити»?", group: "player", hard: true,
    check: (e) => (inList(e.props.famousClubs, "man_city") ? true : isCat(e, "player") ? false : null) },
  { id: "at_juve", text: "Играл за «Ювентус»?", group: "player", hard: true,
    check: (e) => (inList(e.props.famousClubs, "juventus") ? true : isCat(e, "player") ? false : null) },
  { id: "at_bayern", text: "Играл за «Баварию»?", group: "player", hard: true,
    check: (e) => (inList(e.props.famousClubs, "bayern") ? true : isCat(e, "player") ? false : null) },
  { id: "at_psg", text: "Играл за «ПСЖ»?", group: "player", hard: true,
    check: (e) => (inList(e.props.famousClubs, "psg") ? true : isCat(e, "player") ? false : null) },
  { id: "at_liverpool", text: "Играл за «Ливерпуль»?", group: "player", hard: true,
    check: (e) => (inList(e.props.famousClubs, "liverpool") ? true : isCat(e, "player") ? false : null) },
  { id: "at_chelsea", text: "Играл за «Челси»?", group: "player", hard: true,
    check: (e) => (inList(e.props.famousClubs, "chelsea") ? true : isCat(e, "player") ? false : null) },
  { id: "at_inter", text: "Играл за «Интер»?", group: "player", hard: true,
    check: (e) => (inList(e.props.famousClubs, "inter") ? true : isCat(e, "player") ? false : null) },
  { id: "at_milan", text: "Играл за «Милан»?", group: "player", hard: true,
    check: (e) => (inList(e.props.famousClubs, "milan") ? true : isCat(e, "player") ? false : null) },
  { id: "at_zenit", text: "Играл за «Зенит»?", group: "player", hard: true,
    check: (e) => (inList(e.props.famousClubs, "zenit") ? true : isCat(e, "player") ? false : null) },
  { id: "at_spartak", text: "Играл за «Спартак»?", group: "player", hard: true,
    check: (e) => (inList(e.props.famousClubs, "spartak") ? true : isCat(e, "player") ? false : null) },

  // ---------- Гражданство (жёсткие) ----------
  ...[
    NQ("nat_england", "Английский?", "england"),
    NQ("nat_spain", "Испанский?", "spain"),
    NQ("nat_italy", "Итальянский?", "italy"),
    NQ("nat_germany", "Немецкий?", "germany"),
    NQ("nat_france", "Французский?", "france"),
    NQ("nat_netherlands", "Голландский?", "netherlands"),
    NQ("nat_portugal", "Португальский?", "portugal"),
    NQ("nat_brazil", "Бразильский?", "brazil"),
    NQ("nat_argentina", "Аргентинский?", "argentina"),
    NQ("nat_russia", "Русский?", "russia"),
    NQ("nat_ukraine", "Украинский?", "ukraine"),
    NQ("nat_croatia", "Хорватский?", "croatia"),
    NQ("nat_belgium", "Бельгийский?", "belgium"),
    NQ("nat_cote", "Кот-д'Ивуар?", "cote_divoire"),
    NQ("nat_egypt", "Египетский?", "egypt"),
    NQ("nat_senegal", "Сенегальский?", "senegal"),
    NQ("nat_polska", "Польский?", "poland"),
    NQ("nat_norway", "Норвежский?", "norway"),
    NQ("nat_serbia", "Сербский?", "serbia"),
    NQ("nat_mexico", "Мексиканский?", "mexico"),
    NQ("nat_japan", "Японский?", "japan"),
    NQ("nat_korea", "Южно-корейский?", "south_korea"),
    NQ("nat_australia", "Австралийский?", "australia"),
    NQ("nat_usa", "Из США?", "usa"),
    NQ("nat_colombia", "Колумбийский?", "colombia"),
    NQ("nat_uruguay", "Уругвайский?", "uruguay"),
    NQ("nat_chile", "Чилийский?", "chile"),
    NQ("nat_nigeria", "Нигерийский?", "nigeria"),
    NQ("nat_ghana", "Ганский?", "ghana"),
    NQ("nat_cameroon", "Камерунский?", "cameroon"),
    NQ("nat_algeria", "Алжирский?", "algeria"),
    NQ("nat_morocco", "Марокканский?", "morocco"),
    NQ("nat_iraq", "Иракский?", "iraq"),
    NQ("nat_iran", "Иранский?", "iran"),
    NQ("nat_saudi", "Саудовский?", "saudi"),
    NQ("nat_kazakhstan", "Казахстанский?", "kazakhstan"),
    NQ("nat_turkey", "Турецкий?", "turkey"),
    NQ("nat_greece", "Греческий?", "greece"),
    NQ("nat_scotland", "Шотландский?", "scotland"),
    NQ("nat_wales", "Уэльский?", "wales"),
    NQ("nat_denmark", "Датский?", "denmark"),
    NQ("nat_sweden", "Шведский?", "sweden"),
    NQ("nat_switzerland", "Швейцарский?", "switzerland"),
    NQ("nat_austria", "Австрийский?", "austria"),
    NQ("nat_belarus", "Белорусский?", "belarus"),
    NQ("nat_hungary", "Венгерский?", "hungary"),
    NQ("nat_romania", "Румынский?", "romania"),
    NQ("nat_bosnia", "Боснийский?", "bosnia"),
    NQ("nat_slovakia", "Словацкий?", "slovakia"),
    NQ("nat_czech", "Чешский?", "czech"),
    NQ("nat_peru", "Перуанский?", "peru"),
    NQ("nat_ecuador", "Эквадорский?", "ecuador"),
    NQ("nat_paraguay", "Парагвайский?", "paraguay"),
    NQ("nat_venezuela", "Венесуэльский?", "venezuela"),
  ],

  // ---------- Континенты (жёсткие) ----------
  { id: "is_european", text: "Из Европы?", group: "player", hard: true,
    check: (e) => (e.props.isEuropean === true ? true : isCat(e, "player") ? false : null) },
  { id: "is_south_american", text: "Из Южной Америки?", group: "player", hard: true,
    check: (e) => (e.props.isSouthAmerican === true ? true : isCat(e, "player") ? false : null) },
  { id: "is_african", text: "Из Африки?", group: "player", hard: true,
    check: (e) => (e.props.isAfrican === true ? true : isCat(e, "player") ? false : null) },
  { id: "is_north_american", text: "Из Северной Америки?", group: "player", hard: true,
    check: (e) => (e.props.isNorthAmerican === true ? true : isCat(e, "player") ? false : null) },
  { id: "is_asian", text: "Из Азии?", group: "player", hard: true,
    check: (e) => (e.props.isAsian === true ? true : isCat(e, "player") ? false : null) },
  { id: "is_oceania", text: "Из Океании?", group: "player", hard: true,
    check: (e) => (e.props.isOceania === true ? true : isCat(e, "player") ? false : null) },

  // ---------- Рост ----------
  { id: "tall", text: "Рост ≥ 185 см?", group: "player",
    check: (e) => (typeof e.props.heightCm === "number" ? (e.props.heightCm as number) >= 185 : null) },

  // ---------- Эпоха ----------
  { id: "era_2020s", text: "Выступает сейчас (2020-е)?", group: "player",
    check: (e) => (e.props.era === "2020s" ? true : (e.props.era === "90s" || e.props.era === "2000s" || e.props.era === "2010s") ? false : null) },
  { id: "era_2010s", text: "Выступал в 2010-х?", group: "player",
    check: (e) => (e.props.era === "2010s" || e.props.era === "2020s" ? true : (e.props.era === "90s" || e.props.era === "2000s") ? false : null) },
  { id: "era_90s", text: "Выступал в 90-х?", group: "player",
    check: (e) => (e.props.era === "90s" ? true : (e.props.era === "2000s" || e.props.era === "2010s" || e.props.era === "2020s") ? false : null) },

  // ---------- Клубы / сборные ----------
  { id: "club_eu", text: "Европейский?", group: "club", hard: true,
    check: (e) => (e.props.isEuropean === true ? true : (isCat(e, "club") || isCat(e, "national_team")) ? false : null) },
  { id: "club_en", text: "Английский клуб / сборная?", group: "club", hard: true,
    check: (e) => (e.props.country === "england" ? true : isCat(e, "club") || isCat(e, "national_team") ? false : null) },
  { id: "club_es", text: "Испанский?", group: "club", hard: true,
    check: (e) => (e.props.country === "spain" ? true : isCat(e, "club") || isCat(e, "national_team") ? false : null) },
  { id: "club_it", text: "Итальянский?", group: "club", hard: true,
    check: (e) => (e.props.country === "italy" ? true : isCat(e, "club") || isCat(e, "national_team") ? false : null) },
  { id: "club_de", text: "Немецкий?", group: "club", hard: true,
    check: (e) => (e.props.country === "germany" ? true : isCat(e, "club") || isCat(e, "national_team") ? false : null) },
  { id: "club_fr", text: "Французский?", group: "club", hard: true,
    check: (e) => (e.props.country === "france" ? true : isCat(e, "club") || isCat(e, "national_team") ? false : null) },
  { id: "club_ru", text: "Русский?", group: "club", hard: true,
    check: (e) => (e.props.country === "russia" ? true : isCat(e, "club") || isCat(e, "national_team") ? false : null) },
  { id: "club_br", text: "Бразильский?", group: "club", hard: true,
    check: (e) => (e.props.country === "brazil" ? true : isCat(e, "club") || isCat(e, "national_team") ? false : null) },
  { id: "club_ar", text: "Аргентинский?", group: "club", hard: true,
    check: (e) => (e.props.country === "argentina" ? true : isCat(e, "club") || isCat(e, "national_team") ? false : null) },
  { id: "club_top5", text: "Входит в топ-5 клубов мира?", group: "club",
    check: (e) => (e.props.isTop5 === true ? true : isCat(e, "club") ? false : null) },
  { id: "founded_20c", text: "Основан до 1950 г.?", group: "club",
    check: (e) => (typeof e.props.foundedYear === "number" ? (e.props.foundedYear as number) < 1950 : null) },

  // ---------- Стадионы ----------
  { id: "stadium_big", text: "Вместимость ≥ 60 тыс.?", group: "stadium",
    check: (e) => (typeof e.props.capacity === "number" ? (e.props.capacity as number) >= 60 : null) },
  { id: "stadium_roof", text: "Крытый?", group: "stadium",
    check: (e) => (e.props.hasRoof === true ? true : e.props.hasRoof === false ? false : null) },
  { id: "stadium_national", text: "Национальный стадион?", group: "stadium",
    check: (e) => (e.props.isNationalStadium === true ? true : e.props.isNationalStadium === false ? false : null) },
  { id: "stadium_eu", text: "В Европе?", group: "stadium", hard: true,
    check: (e) => (e.props.continent === "eu" ? true : isCat(e, "stadium") ? false : null) },
  { id: "stadium_london", text: "В Лондоне?", group: "stadium", hard: true,
    check: (e) => (e.props.city === "london" ? true : isCat(e, "stadium") ? false : null) },
  { id: "stadium_madrid", text: "В Мадриде?", group: "stadium", hard: true,
    check: (e) => (e.props.city === "madrid" ? true : isCat(e, "stadium") ? false : null) },
  { id: "stadium_milan", text: "В Милане?", group: "stadium", hard: true,
    check: (e) => (e.props.city === "milan" ? true : isCat(e, "stadium") ? false : null) },
  { id: "stadium_munich", text: "В Мюнхене?", group: "stadium", hard: true,
    check: (e) => (e.props.city === "munich" ? true : isCat(e, "stadium") ? false : null) },
  { id: "stadium_paris", text: "В Париже?", group: "stadium", hard: true,
    check: (e) => (e.props.city === "paris" ? true : isCat(e, "stadium") ? false : null) },

  // ---------- Турниры ----------
  { id: "tourn_intl", text: "Международный?", group: "tournament", hard: true,
    check: (e) => (e.props.isInternational === true ? true : isCat(e, "tournament") ? false : null) },
  { id: "tourn_club", text: "Клубный (межклубный)?", group: "tournament", hard: true,
    check: (e) => (e.props.isClub === true ? true : isCat(e, "tournament") ? false : null) },
  { id: "tourn_cup", text: "Кубковый (а не лиговый)?", group: "tournament", hard: true,
    check: (e) => (e.props.isCup === true ? true : isCat(e, "tournament") ? false : null) },

  // ---------- Лиги ----------
  { id: "league_top", text: "Топ-5 лиг мира?", group: "league",
    check: (e) => (e.props.isTopLeague === true ? true : isCat(e, "league") ? false : null) },
  { id: "league_en", text: "Английская лига?", group: "league", hard: true,
    check: (e) => (e.props.country === "england" ? true : isCat(e, "league") ? false : null) },
  { id: "league_es", text: "Испанская лига?", group: "league", hard: true,
    check: (e) => (e.props.country === "spain" ? true : isCat(e, "league") ? false : null) },
  { id: "league_it", text: "Итальянская лига?", group: "league", hard: true,
    check: (e) => (e.props.country === "italy" ? true : isCat(e, "league") ? false : null) },
  { id: "league_de", text: "Немецкая лига?", group: "league", hard: true,
    check: (e) => (e.props.country === "germany" ? true : isCat(e, "league") ? false : null) },
  { id: "league_fr", text: "Французская лига?", group: "league", hard: true,
    check: (e) => (e.props.country === "france" ? true : isCat(e, "league") ? false : null) },

  // ---------- Награды ----------
  { id: "award_individual", text: "Индивидуальная (игроку)?", group: "other", hard: true,
    check: (e) => (e.props.isIndividual === true ? true : isCat(e, "award") ? false : null) },
  { id: "award_golden", text: "Связана с «золотым»?", group: "other",
    check: (e) => (e.props.isGolden === true ? true : isCat(e, "award") ? false : null) },

  // ---------- События ----------
  { id: "event_1998", text: "Случилось в 1998?", group: "other", hard: true,
    check: (e) => (e.props.year === 1998 ? true : isCat(e, "event") ? false : null) },
  { id: "event_2002", text: "Случилось в 2002?", group: "other", hard: true,
    check: (e) => (e.props.year === 2002 ? true : isCat(e, "event") ? false : null) },
  { id: "event_2006", text: "Случилось в 2006?", group: "other", hard: true,
    check: (e) => (e.props.year === 2006 ? true : isCat(e, "event") ? false : null) },
  { id: "event_2010", text: "Случилось в 2010?", group: "other", hard: true,
    check: (e) => (e.props.year === 2010 ? true : isCat(e, "event") ? false : null) },
  { id: "event_2014", text: "Случилось в 2014?", group: "other", hard: true,
    check: (e) => (e.props.year === 2014 ? true : isCat(e, "event") ? false : null) },
  { id: "event_2018", text: "Случилось в 2018?", group: "other", hard: true,
    check: (e) => (e.props.year === 2018 ? true : isCat(e, "event") ? false : null) },
  { id: "event_2022", text: "Случилось в 2022?", group: "other", hard: true,
    check: (e) => (e.props.year === 2022 ? true : isCat(e, "event") ? false : null) },
];

// ============================================================
// ФУТБОЛИСТЫ
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pl(
  id: string, name: string, nameEn: string, nationality: string,
  position: "gk" | "df" | "mf" | "fw",
  o: {
    active?: boolean; era?: string; clubs?: string[]; cur?: string | null;
    in?: string[]; wc?: boolean; bd?: boolean; ucl?: boolean; eu?: boolean;
    gpg?: number; h?: number; by?: number; leg?: boolean; ic?: boolean;
    riv?: boolean; lf?: boolean; j?: number; blurb?: string; color?: string; kw?: string[];
  } = {}
): Entity {
  const pos = { gk: "gk", df: "df", mf: "mf", fw: "fw" }[position];
  const cont = CONT[nationality] ?? "eu";
  const props: Record<string, any> = {
    isPerson: true, isPlayer: true,
    isActive: o.active ?? true,
    nationality, era: o.era ?? "2020s",
    position: pos,
    isGoalkeeper: pos === "gk", isDefender: pos === "df",
    isMidfielder: pos === "mf", isForward: pos === "fw",
    leftFooted: o.lf ?? false,
    currentClub: o.cur ?? null, famousClubs: o.clubs ?? [],
    wonWorldCup: o.wc ?? false, wonBallonDor: o.bd ?? false,
    wonChampionsLeague: o.ucl ?? false, wonEuros: o.eu ?? false,
    goalsPerGame: o.gpg ?? 0.2, heightCm: o.h ?? 180, birthYear: o.by ?? 1995,
    isEuropean: cont === "eu", isSouthAmerican: cont === "sa",
    isAfrican: cont === "af", isNorthAmerican: cont === "na",
    isAsian: cont === "asia", isOceania: cont === "oce",
    isLegendary: o.leg ?? false, isIcon: o.ic ?? false, isRival: o.riv ?? false,
    jerseyNumber: o.j ?? 10,
  };
  for (const c of (o.in ?? [])) props["playedIn" + c.charAt(0).toUpperCase() + c.slice(1)] = true;
  return { id, name, nameEn, category: "player", blurb: o.blurb ?? `${name} (${nameEn})`,
    color: o.color ?? "#457b9d", props: P(props), keywords: o.kw ?? [nameEn.toLowerCase().replace(/[^a-z]+/g, " ")] };
}

const PLAYERS: Entity[] = [
  // === ТОП-15 ЛЕГЕНД ===
  pl("ronaldo","Криштиану Роналду","Cristiano Ronaldo","portugal","fw",{active:true,era:"2010s",clubs:["sporting","man_utd","real_madrid","juventus","al_nassr"],cur:"al_nassr",in:["england","spain","italy","portugal"],bd:true,ucl:true,eu:true,gpg:.65,h:187,by:1985,leg:true,ic:true,riv:true,j:7,blurb:"Португалец. 5× Золотой мяч, легенда Real Madrid, Man Utd, Al-Nassr.",color:"#e63946",kw:["cristiano","ronaldo","cr7","portugal","real","madrid","man_utd"]}),
  pl("messi","Лионель Месси","Lionel Messi","argentina","fw",{active:true,era:"2010s",clubs:["barcelona","psg","inter_miami"],cur:"inter_miami",in:["spain","france","argentina"],wc:true,bd:true,ucl:true,gpg:.7,h:170,by:1987,leg:true,ic:true,riv:true,j:10,blurb:"Аргентинец. 8× Золотой мяч, икона Barcelona.",color:"#f4a261",kw:["lionel","messi","argentina","barcelona","psg"]}),
  pl("neymar","Неймар","Neymar Jr","brazil","fw",{active:true,era:"2010s",clubs:["santos","barcelona","psg","al_hilal"],cur:"al_hilal",in:["brazil","spain","france"],gpg:.55,h:175,by:1992,ic:true,j:10,blurb:"Бразилец. Блестящая техника, Barcelona → PSG → Al-Hilal.",color:"#2a9d8f",kw:["neymar","brazil","santos","barcelona","psg"]}),
  pl("mbappe","Килиан Мбаппе","Kylian Mbappé","france","fw",{active:true,era:"2020s",clubs:["monaco","psg","real_madrid"],cur:"real_madrid",in:["france","spain"],wc:true,gpg:.75,h:178,by:1998,leg:true,ic:true,riv:true,j:9,blurb:"Француз. Молниеносный скоринг, PSG → Real Madrid.",color:"#264653",kw:["kylian","mbappe","france","psg","real_madrid"]}),
  pl("haaland","Эрлинг Холанд","Erling Haaland","norway","fw",{active:true,era:"2020s",clubs:["molde","red_bull_salzburg","borussia_dortmund","man_city"],cur:"man_city",in:["norway","germany","england","austria"],gpg:.8,h:194,by:2000,riv:true,j:9,blurb:"Норвежец. Циничный форвард, Man City.",color:"#e76f51",kw:["erling","haaland","norway","man_city","dortmund"]}),
  pl("salah","Мохамед Салах","Mohamed Salah","egypt","fw",{active:true,era:"2010s",clubs:["basele","chelsea","fenerbahce","roma","liverpool"],cur:"liverpool",in:["egypt","italy","germany","england","turkey","switzerland"],ucl:true,gpg:.5,h:175,by:1992,leg:true,ic:true,lf:true,j:11,blurb:"Египтянин. Левое крыло Liverpool.",color:"#606c38",kw:["mohamed","salah","egypt","liverpool","roma"]}),
  pl("de_bruyne","Кевин Де Брейне","Kevin De Bruyne","belgium","mf",{active:true,era:"2010s",clubs:["genk","chelsea","werder_bremen","man_city"],cur:"man_city",in:["belgium","germany","england"],gpg:.35,h:181,by:1991,j:17,blurb:"Бельгиец. Метровые передачи, Man City.",color:"#1d3557",kw:["kevin","de_bruyne","belgium","man_city"]}),
  pl("modric","Лука Модрич","Luka Modrić","croatia","mf",{active:true,era:"2010s",clubs:["dynamo_zagreb","tottenham","inter","real_madrid"],cur:"real_madrid",in:["croatia","italy","spain","england"],bd:true,ucl:true,gpg:.2,h:172,by:1985,leg:true,ic:true,j:10,blurb:"Хорват. Эталон midfield, Real Madrid, Золотой мяч 2018.",color:"#9d4edd",kw:["luka","modric","croatia","real_madrid"]}),
  pl("benzema","Карим Бензема","Karim Benzema","france","fw",{active:false,era:"2010s",clubs:["lyon","real_madrid","al_itihad"],cur:"al_itihad",in:["france","spain","saudi"],wc:true,bd:true,ucl:true,gpg:.5,h:185,by:1987,leg:true,j:9,blurb:"Француз. Циничный нападающий Real Madrid, 148 голов в ЛЧ.",color:"#457b9d",kw:["karim","benzema","france","real_madrid"]}),
  pl("lewandowski","Роберт Левандовский","Robert Lewandowski","poland","fw",{active:true,era:"2010s",clubs:["legia","borussia_dortmund","bayern","barcelona"],cur:"barcelona",in:["poland","germany","spain"],bd:true,ucl:true,gpg:.7,h:185,by:1988,leg:true,j:9,blurb:"Польский снайпер. Bayern → Barcelona.",color:"#ff6b6b",kw:["robert","lewandowski","poland","bayern","barcelona"]}),
  pl("ronaldo9","Роналдо (R9)","Ronaldo Nazário","brazil","fw",{active:false,era:"90s",clubs:["cruzeiro","psg","barcelona","inter","real_madrid","corinthians"],in:["brazil","italy","spain","france"],wc:true,bd:true,gpg:.7,h:182,by:1976,leg:true,ic:true,riv:true,j:9,blurb:"Бразилец. Легенда 90-х, 2× ЧМ, «Огненный Роналдо».",color:"#ffbe0b",kw:["ronaldo","r9","brazil","barcelona","real_madrid"]}),
  pl("beckenbauer","Франц Беккенбауэр","Franz Beckenbauer","germany","df",{active:false,era:"90s",clubs:["bayern","boca_juniors"],in:["germany","argentina"],wc:true,bd:true,ucl:true,gpg:.15,h:180,by:1945,leg:true,ic:true,j:5,blurb:"Немец. «Кайзер» — легенда Bayern.",color:"#8d99ae",kw:["franz","beckenbauer","germany","bayern"]}),
  pl("maradona","Диего Марадона","Diego Maradona","argentina","mf",{active:false,era:"90s",clubs:["boca_juniors","barcelona","napoli","newell"],in:["argentina","italy","spain"],wc:true,bd:true,gpg:.4,h:165,by:1960,leg:true,ic:true,riv:true,j:10,blurb:"Аргентинец. «Голов Бога» 1986, легенда Napoli.",color:"#006400",kw:["diego","maradona","argentina","napoli","boca"]}),
  pl("pele","Пеле","Pelé","brazil","fw",{active:false,era:"90s",clubs:["santos","new_york_cosmos"],in:["brazil"],wc:true,gpg:.9,h:173,by:1940,leg:true,ic:true,riv:true,j:10,blurb:"Бразилец. 3× чемпион мира, 1281 гол.",color:"#00b4d8",kw:["pele","brazil","santos"]}),
  pl("zidane","Зинедин Зидан","Zinédine Zidane","france","mf",{active:false,era:"2000s",clubs:["cannes","bordeaux","juventus","real_madrid"],in:["france","italy","spain"],wc:true,bd:true,gpg:.35,h:185,by:1972,leg:true,ic:true,riv:true,j:21,blurb:"Француз. Легенда Juventus и Real Madrid, ЧМ 1998.",color:"#4361ee",kw:["zinedine","zidane","france","juventus","real_madrid"]}),

  // === КЛЮЧЕВЫЕ ДЛЯ ПОЛЬЗОВАТЕЛЯ ===
  pl("rooney","Уэйн Руни","Wayne Rooney","england","fw",{active:false,era:"2010s",clubs:["everton","man_utd","dc_united","derby_county"],in:["england","usa"],eu:true,gpg:.55,h:178,by:1985,leg:true,ic:true,riv:true,j:10,blurb:"Англичанин. Легенда Man Utd, 253 гола.",color:"#d62828",kw:["wayne","rooney","england","man_utd","everton"]}),
  pl("neuer","Мануэль Нойер","Manuel Neuer","germany","gk",{active:true,era:"2010s",clubs:["bayern"],cur:"bayern",in:["germany"],ucl:true,eu:true,gpg:0,h:193,by:1986,leg:true,ic:true,j:1,blurb:"Немец. Легенда Bayern и сборной Германии, эпоха аутфилд-гиков.",color:"#118ab2",kw:["manuel","neuer","germany","bayern","goalkeeper"]}),
  pl("satpaev","Дастан Сатпаев","Dastan Satpaev","kazakhstan","fw",{active:true,era:"2020s",clubs:["kairat","astana"],cur:"kairat",in:["kazakhstan"],gpg:.4,h:179,by:2000,j:9,blurb:"Казахстанец. Нападающий Kairat и сборной Казахстана.",color:"#007229",kw:["dastan","satpaev","kazakhstan","kairat"]}),
  pl("kane","Хари Кейн","Harry Kane","england","fw",{active:true,era:"2010s",clubs:["tottenham","bayern"],cur:"bayern",in:["england","germany"],gpg:.7,h:188,by:1993,riv:true,j:10,blurb:"Англичанин. Рекордсмен PL по голам, Tottenham → Bayern.",color:"#e63946",kw:["harry","kane","england","tottenham","bayern"]}),

  // === ДЕЙСТВУЮЩИЕ ТОП ===
  pl("vinicius","Винисиус Жуниор","Vinícius Júnior","brazil","fw",{active:true,era:"2020s",clubs:["flamengo","real_madrid"],cur:"real_madrid",in:["brazil","spain"],ucl:true,gpg:.5,h:176,by:2000,riv:true,j:7,blurb:"Бразилец. Быстрейший футболист мира, Real Madrid.",color:"#2a9d8f",kw:["vinicius","juniur","brazil","real_madrid"]}),
  pl("bellingham","Джуд Беллингем","Jude Bellingham","england","mf",{active:true,era:"2020s",clubs:["birmingham","borussia_dortmund","real_madrid"],cur:"real_madrid",in:["england","germany","spain"],ucl:true,gpg:.4,h:186,by:2003,riv:true,j:5,blurb:"Англичанин. Универсальный хавбек, Real Madrid.",color:"#1d3557",kw:["jude","bellingham","england","real_madrid"]}),
  pl("yamal","Ламин Ямаль","Lamine Yamal","spain","fw",{active:true,era:"2020s",clubs:["barcelona"],cur:"barcelona",in:["spain"],eu:true,gpg:.4,h:178,by:2007,riv:true,j:19,blurb:"Испанец. Феноменальный талант Barcelona, Евро-2024.",color:"#e9c46a",kw:["lamine","yamal","spain","barcelona"]}),
  pl("pedri","Педро Гоналбес","Pedri","spain","mf",{active:true,era:"2020s",clubs:["las_palmas","barcelona"],cur:"barcelona",in:["spain"],eu:true,gpg:.3,h:174,by:2002,j:8,blurb:"Испанец. Метровые передачи, Barcelona.",color:"#457b9d",kw:["pedri","gonzalez","spain","barcelona"]}),
  pl("gavi","Гави","Gavi","spain","mf",{active:true,era:"2020s",clubs:["barcelona"],cur:"barcelona",in:["spain"],eu:true,gpg:.25,h:178,by:2004,j:8,blurb:"Испанец. Боец midfield, Barcelona.",color:"#2a9d8f",kw:["gavi","alonsa","spain","barcelona"]}),
  pl("musiala","Джамал Мусиала","Jamal Musiala","germany","fw",{active:true,era:"2020s",clubs:["chelsea","bayern"],cur:"bayern",in:["england","germany"],gpg:.45,h:176,by:2003,j:42,blurb:"Немец. Блестящая техника, Bayern.",color:"#457b9d",kw:["jamal","musiala","germany","bayern"]}),
  pl("wirtz","Флориан Вирц","Florian Wirtz","germany","mf",{active:true,era:"2020s",clubs:["leverkusen","liverpool"],cur:"liverpool",in:["germany","england"],gpg:.35,h:175,by:2003,j:7,blurb:"Немец. Универсальный хавбек, Leverkusen → Liverpool.",color:"#457b9d",kw:["florian","wirtz","germany","leverkusen","liverpool"]}),
  pl("saka","Букайо Сака","Bukayo Saka","england","fw",{active:true,era:"2020s",clubs:["arsenal"],cur:"arsenal",in:["england"],gpg:.4,h:178,by:2001,lf:true,j:7,blurb:"Англичанин. Правое крыло Arsenal.",color:"#e63946",kw:["bukayo","saka","england","arsenal"]}),
  pl("grealish","Джек Грилиш","Jack Grealish","england","mf",{active:true,era:"2010s",clubs:["aston_villa","man_city"],cur:"man_city",in:["england"],eu:true,gpg:.3,h:175,by:1995,j:10,blurb:"Англичанин. Техничный хавбек, Man City.",color:"#606c38",kw:["jack","grealish","england","man_city"]}),
  pl("foden","Фил Фоден","Phil Foden","england","fw",{active:true,era:"2020s",clubs:["man_city"],cur:"man_city",in:["england"],gpg:.45,h:178,by:2000,j:47,blurb:"Англичанин. Молодой талант Man City.",color:"#606c38",kw:["phil","foden","england","man_city"]}),
  pl("palmer","Кол Палмер","Cole Palmer","england","fw",{active:true,era:"2020s",clubs:["man_city","chelsea"],cur:"chelsea",in:["england"],gpg:.55,h:180,by:2002,j:10,blurb:"Англичанин. Молодой гений Chelsea.",color:"#457b9d",kw:["cole","palmer","england","chelsea"]}),
  pl("isak","Александр Исак","Alexander Isak","sweden","fw",{active:true,era:"2020s",clubs:["reims","newcastle"],cur:"newcastle",in:["sweden","france","england"],gpg:.5,h:189,by:2001,j:9,blurb:"Швед. Быстрый форвард Newcastle.",color:"#ffd166",kw:["alexander","isak","sweden","newcastle"]}),
  pl("sancho","Джодон Санчо","Jadon Sancho","england","fw",{active:true,era:"2010s",clubs:["man_utd","borussia_dortmund"],cur:"borussia_dortmund",in:["england","germany"],gpg:.35,h:178,by:2000,j:7,blurb:"Англичанин. Быстрый вингер, Man Utd → Dortmund.",color:"#e63946",kw:["jadon","sancho","england","dortmund"]}),
  pl("mbeumo","Брайан Мбемо","Bryan Mbeumo","cameroon","fw",{active:true,era:"2020s",clubs:["red_star","brondby","tottenham"],cur:"tottenham",in:["serbia","denmark","england","france"],gpg:.45,h:182,by:1999,j:18,blurb:"Камерунец. Атакующий хавбек Tottenham.",color:"#006400",kw:["bryan","mbeumo","cameroon","tottenham"]}),
  pl("kudus","Моесес Кадус","Mohammed Kudus","ghana","mf",{active:true,era:"2020s",clubs:["az_alkmaar","feyenoord","tottenham"],cur:"tottenham",in:["netherlands","england"],gpg:.35,h:180,by:1999,j:20,blurb:"Ганец. Универсальный хавбек Tottenham.",color:"#ffd166",kw:["mohammed","kudus","ghana","tottenham"]}),
  pl("gvardiol","Йосип Гвардиол","Joško Gvardiol","croatia","df",{active:true,era:"2020s",clubs:["dijon","rb_leipzig","man_city"],cur:"man_city",in:["croatia","france","germany","england"],eu:true,gpg:.1,h:192,by:2002,j:24,blurb:"Хорват. Лучший защитник Европы, Man City.",color:"#9d4edd",kw:["josko","gvardiol","croatia","man_city"]}),
  pl("saliba","Уильям Салiba","William Saliba","france","df",{active:true,era:"2020s",clubs:["saint_etienne","marsiglia","arsenal"],cur:"arsenal",in:["france","england"],gpg:.05,h:192,by:2001,j:4,blurb:"Француз. Капитан Arsenal, эталон центрального защитника.",color:"#457b9d",kw:["william","saliba","france","arsenal"]}),
  pl("rudiger","Антонио Рюдигер","Antonio Rüdiger","germany","df",{active:true,era:"2010s",clubs:["werder_bremen","psv","roma","real_madrid","chelsea"],cur:"chelsea",in:["germany","netherlands","italy","spain","england"],ucl:true,gpg:.15,h:190,by:1993,j:2,blurb:"Немец. Жёсткий защитник, Chelsea.",color:"#457b9d",kw:["antonio","rudiger","germany","chelsea"]}),
  pl("kante","Нголо Канте","N'Golo Kanté","france","mf",{active:false,era:"2010s",clubs:["cannes","caen","leicester","chelsea","psg","al_ittihad"],in:["france","england","saudi"],wc:true,ucl:true,gpg:.15,h:168,by:1991,j:7,blurb:"Француз. Мотор midfield, Leicester → Chelsea → PSG.",color:"#457b9d",kw:["ngolo","kante","france","leicester","chelsea"]}),
  pl("griezmann","Антуан Гризманн","Antoine Griezmann","france","fw",{active:true,era:"2010s",clubs:["real_sociedad","atletico","psg"],cur:"atletico",in:["france","spain"],wc:true,eu:true,gpg:.45,h:176,by:1991,leg:true,j:7,blurb:"Француз. Универсальный атакующий, Atletico Madrid.",color:"#457b9d",kw:["antoine","griezmann","france","atletico","psg"]}),
  pl("dembele","Оусман Дембеле","Ousmane Dembélé","france","fw",{active:true,era:"2010s",clubs:["rennes","psg","barcelona"],cur:"barcelona",in:["france","spain"],wc:true,gpg:.35,h:178,by:1997,lf:true,j:11,blurb:"Француз. Быстрый вингер, Barcelona.",color:"#457b9d",kw:["ousmane","dembele","france","barcelona"]}),
  pl("muani","Рандаль Коло Муани","Randal Kolo Muani","france","fw",{active:true,era:"2010s",clubs:["smk","psg"],cur:"psg",in:["france","germany"],gpg:.4,h:180,by:1998,j:9,blurb:"Француз. Сильный форвард, PSG.",color:"#457b9d",kw:["randal","kolo_muani","france","psg"]}),
  pl("camavinga","Эдуардо Камавинга","Eduardo Camavinga","france","mf",{active:true,era:"2020s",clubs:["rennes","real_madrid"],cur:"real_madrid",in:["france","spain"],gpg:.1,h:182,by:2002,j:16,blurb:"Француз. Универсальный хавбек, Real Madrid.",color:"#457b9d",kw:["eduardo","camavinga","france","real_madrid"]}),
  pl("ekitike","Юго Эkitike","Hugo Ekitike","france","fw",{active:true,era:"2020s",clubs:["bordeaux","psg","liverpool"],cur:"liverpool",in:["france","england"],gpg:.4,h:183,by:2002,j:19,blurb:"Француз. Быстрый форвард, Liverpool.",color:"#457b9d",kw:["hugo","ekitike","france","liverpool"]}),
  pl("valverde","Федрико Вальверде","Fede Valverde","uruguay","mf",{active:true,era:"2010s",clubs:["penarol","villarreal","real_madrid"],cur:"real_madrid",in:["uruguay","spain"],ucl:true,gpg:.3,h:183,by:1998,j:8,blurb:"Уругваец. Мотор midfield, Real Madrid.",color:"#e9c46a",kw:["federico","valverde","uruguay","real_madrid"]}),
  pl("carvajal","Дани Карвахаль","Dani Carvajal","spain","df",{active:true,era:"2010s",clubs:["real_sociedad","real_madrid"],cur:"real_madrid",in:["spain","germany"],ucl:true,gpg:.1,h:175,by:1992,j:2,blurb:"Испанец. Правый защитник, Real Madrid.",color:"#e9c46a",kw:["dani","carvajal","spain","real_madrid"]}),
  pl("alba","Хорди Альба","Jordi Alba","spain","df",{active:true,era:"2010s",clubs:["barcelona","atletico","inter_miami"],cur:"inter_miami",in:["spain","usa"],eu:true,gpg:.15,h:170,by:1987,lf:true,j:18,blurb:"Испанец. Левый защитник, Barcelona → Inter Miami.",color:"#e9c46a",kw:["jordi","alba","spain","barcelona"]}),
  pl("busquets","Серхио Бускетс","Sergio Busquets","spain","mf",{active:false,era:"2010s",clubs:["barcelona","inter_miami"],cur:"inter_miami",in:["spain","usa"],wc:true,eu:true,ucl:true,gpg:.15,h:189,by:1988,j:5,blurb:"Испанец. Эталон midfield, Barcelona.",color:"#e9c46a",kw:["sergio","busquets","spain","barcelona"]}),
  pl("thiago","Тьяго Алькантара","Thiago Alcántara","spain","mf",{active:false,era:"2010s",clubs:["barcelona","bayern","liverpool"],in:["spain","germany","england"],ucl:true,gpg:.2,h:180,by:1991,j:6,blurb:"Испанец. Техничный хавбек, Barcelona → Bayern → Liverpool.",color:"#e9c46a",kw:["thiago","alcantara","spain","bayern","liverpool"]}),
  pl("asensio","Марко Асенсио","Marco Asensio","spain","fw",{active:true,era:"2010s",clubs:["mallorca","real_madrid","psg"],cur:"psg",in:["spain","france"],ucl:true,gpg:.35,h:180,by:1996,j:19,blurb:"Испанец. Универсальный атакующий, Real Madrid → PSG.",color:"#e9c46a",kw:["marco","asensio","spain","real_madrid"]}),
  pl("morata","Альваро Мората","Álvaro Morata","spain","fw",{active:true,era:"2010s",clubs:["real_madrid","atletico","juventus","chelsea"],cur:"birmingham",in:["spain","italy","england"],wc:true,eu:true,gpg:.45,h:189,by:1992,j:7,blurb:"Испанец. Сильный форвард, сборная Испании.",color:"#e9c46a",kw:["alvaro","morata","spain","juventus","chelsea"]}),
  pl("nacho","Начо Фернандес","Nacho Fernández","spain","df",{active:true,era:"2010s",clubs:["real_madrid"],cur:"real_madrid",in:["spain"],ucl:true,eu:true,gpg:.1,h:184,by:1990,j:6,blurb:"Испанец. Центральный защитник, Real Madrid.",color:"#e9c46a",kw:["nacho","fernandez","spain","real_madrid"]}),

  // === ИТАЛИЯ ===
  pl("chiellini","Джорджо Кьеллини","Giorgio Chiellini","italy","df",{active:false,era:"2010s",clubs:["parma","juventus","fiorentina"],in:["italy"],gpg:.1,h:190,by:1984,j:3,leg:true,blurb:"Итальянец. Легенда Juventus и сборной.",color:"#457b9d",kw:["giorgio","chiellini","italy","juventus"]}),
  pl("buffon","Джанлуиджи Буффон","Gianluigi Buffon","italy","gk",{active:false,era:"2000s",clubs:["parma","juventus","psg"],in:["italy","france"],wc:true,gpg:0,h:191,by:1978,j:1,leg:true,ic:true,blurb:"Итальянец. Легендарный вратарь, 176 матчей.",color:"#457b9d",kw:["gianluigi","buffon","italy","juventus"]}),
  pl("donnarumma","Джинлуиджи Доннарумма","Gianluigi Donnarumma","italy","gk",{active:true,era:"2010s",clubs:["milan","psg"],cur:"psg",in:["italy","france"],eu:true,gpg:0,h:196,by:1999,j:1,blurb:"Итальянец. Лучший вратарь мира, PSG.",color:"#457b9d",kw:["gianluigi","donnarumma","italy","psg"]}),
  pl("balotelli","Марио Балотелли","Mario Balotelli","italy","fw",{active:false,era:"2010s",clubs:["inter","man_city","milan","marseille","birmingham"],in:["italy","england","france"],gpg:.5,h:188,by:1990,j:45,blurb:"Итальянец. Нестандартный нападающий, скандальный характер.",color:"#457b9d",kw:["mario","balotelli","italy","man_city"]}),
  pl("locatelli","Мануэль Локателли","Manuel Locatelli","italy","mf",{active:true,era:"2010s",clubs:["atalanta","juventus"],cur:"juventus",in:["italy"],eu:true,gpg:.25,h:185,by:1998,j:18,blurb:"Итальянец. Центральный хавбек, Juventus.",color:"#457b9d",kw:["manuel","locatelli","italy","juventus"]}),
  pl("barella","Никола Барелла","Nicolò Barella","italy","mf",{active:true,era:"2020s",clubs:["inter"],cur:"inter",in:["italy"],eu:true,gpg:.25,h:183,by:1997,j:16,blurb:"Итальянец. Капитан Inter, мотор midfield.",color:"#457b9d",kw:["nicolo","barella","italy","inter"]}),
  pl("bastoni","Алессандро Бастони","Alessandro Bastoni","italy","df",{active:true,era:"2020s",clubs:["atalanta","inter"],cur:"inter",in:["italy"],eu:true,gpg:.1,h:190,by:1999,j:19,blurb:"Итальянец. Центральный защитник, Inter.",color:"#457b9d",kw:["alessandro","bastoni","italy","inter"]}),
  pl("vlahovic","Душан Влахович","Dušan Vlahović","serbia","fw",{active:true,era:"2010s",clubs:["partizan","fiosentina","juventus"],cur:"juventus",in:["serbia","italy"],gpg:.5,h:193,by:2000,j:9,blurb:"Серб. Сильный форвард, Juventus.",color:"#457b9d",kw:["dusan","vlahovic","serbia","juventus"]}),
  pl("osimhen","Виктор Осимхен","Victor Osimhen","nigeria","fw",{active:true,era:"2010s",clubs:["lille","napoli","galatasaray"],cur:"galatasaray",in:["nigeria","france","italy","turkey"],gpg:.6,h:189,by:1998,j:9,blurb:"Нигериец. Снайпер, Galatasaray.",color:"#006400",kw:["victor","osimhen","nigeria","napoli","galatasaray"]}),

  // === ГЕРМАНИЯ / БЕЛЬГИЯ / ГОЛЛАНДИЯ ===
  pl("muller","Томас Мюллер","Thomas Müller","germany","fw",{active:true,era:"2010s",clubs:["tsv_1860","bayern"],cur:"bayern",in:["germany"],wc:true,ucl:true,gpg:.4,h:177,by:1989,leg:true,j:25,blurb:"Немец. «Raumdeuter», легенда Bayern.",color:"#457b9d",kw:["thomas","muller","germany","bayern"]}),
  pl("kroos","Тони Кросс","Toni Kroos","germany","mf",{active:false,era:"2010s",clubs:["bayern","real_madrid"],in:["germany","spain"],wc:true,ucl:true,gpg:.25,h:186,by:1990,leg:true,j:8,blurb:"Немец. Эталон midfield, Real Madrid.",color:"#457b9d",kw:["toni","kroos","germany","real_madrid"]}),
  pl("sane","Лерой Сане","Leroy Sané","germany","fw",{active:true,era:"2010s",clubs:["schalke","borussia_dortmund","man_city","bayern"],cur:"bayern",in:["germany","england"],gpg:.4,h:184,by:1996,lf:true,j:19,blurb:"Немец. Быстрый вингер, Bayern.",color:"#457b9d",kw:["leroy","sane","germany","bayern","man_city"]}),
  pl("hummels","Матс Хуммельс","Mats Hummels","germany","df",{active:false,era:"2010s",clubs:["borussia_monschgladbach","bayern","borussia_dortmund"],in:["germany"],wc:true,gpg:.1,h:193,by:1988,leg:true,j:4,blurb:"Немец. Капитан сборной, центральный защитник.",color:"#457b9d",kw:["mats","hummels","germany","bayern","dortmund"]}),
  pl("hazard","Эден Азар","Eden Hazard","belgium","fw",{active:false,era:"2010s",clubs:["lille","chelsea","real_madrid"],in:["france","england","spain","belgium"],gpg:.4,h:175,by:1991,leg:true,j:10,blurb:"Бельгиец. Магия с мячом, Chelsea → Real Madrid.",color:"#e9c46a",kw:["eden","hazard","belgium","chelsea","real_madrid"]}),
  pl("lukaku","Ромелу Лукаку","Romelu Lukaku","belgium","fw",{active:true,era:"2010s",clubs:["standard","chelsea","everton","inter","man_utd","chelsea"],cur:"chelsea",in:["belgium","england","italy"],gpg:.55,h:191,by:1993,j:9,blurb:"Бельгиец. Сильный форвард, Chelsea.",color:"#e9c46a",kw:["romelu","lukaku","belgium","chelsea","inter"]}),
  pl("de_licht","Маттейс де Лихт","Matthijs de Ligt","netherlands","df",{active:true,era:"2010s",clubs:["ajax","juventus","bayern","barcelona"],cur:"barcelona",in:["netherlands","italy","germany","spain"],gpg:.1,h:189,by:1999,j:4,blurb:"Голландец. Центральный защитник, Barcelona.",color:"#ffd166",kw:["matthijs","de_light","netherlands","barcelona","juventus"]}),
  pl("van_dijk","Виргил ван Дайк","Virgil van Dijk","netherlands","df",{active:true,era:"2010s",clubs:["girona","celtic","southampton","liverpool"],cur:"liverpool",in:["netherlands","england"],ucl:true,gpg:.15,h:193,by:1991,leg:true,j:4,blurb:"Голландец. Лучший защитник мира, Liverpool.",color:"#ffd166",kw:["virgil","van_dijk","netherlands","liverpool"]}),
  pl("de_jong","Френки де Йонг","Frenkie de Jong","netherlands","mf",{active:true,era:"2010s",clubs:["ajax","barcelona"],cur:"barcelona",in:["netherlands","spain"],gpg:.3,h:180,by:1997,j:21,blurb:"Голландец. Техничный хавбек, Barcelona.",color:"#ffd166",kw:["frenkie","de_jong","netherlands","barcelona","ajax"]}),
  pl("vnl","Рууд ван Нистелрой","Ruud van Nistelrooy","netherlands","fw",{active:false,era:"2000s",clubs:["psv","man_utd","spanish","man_utd"],in:["netherlands","england","spain"],gpg:.6,h:194,by:1976,leg:true,j:32,blurb:"Голландец. Снайпер, Man Utd.",color:"#ffd166",kw:["ruud","van_nistelrooy","netherlands","man_utd"]}),

  // === ПОРТУГАЛИЯ ===
  pl("bruno","Бруну Фернандеш","Bruno Fernandes","portugal","mf",{active:true,era:"2010s",clubs:["sporting","utd"],cur:"man_utd",in:["portugal","england"],eu:true,gpg:.35,h:181,by:1994,leg:true,j:8,blurb:"Португалец. Капитан Man Utd, мотор midfield.",color:"#06a77d",kw:["bruno","fernandes","portugal","man_utd"]}),
  pl("dias","Рубен Диаш","Rúben Dias","portugal","df",{active:true,era:"2010s",clubs:["benfica","psg","man_city"],cur:"man_city",in:["portugal","france","england"],eu:true,gpg:.05,h:188,by:1997,j:3,blurb:"Португалец. Центральный защитник, Man City.",color:"#06a77d",kw:["ruben","dias","portugal","man_city"]}),
  pl("bernardo","Бернанду Силва","Bernardo Silva","portugal","mf",{active:true,era:"2010s",clubs:["benfica","monaco","man_city"],cur:"man_city",in:["portugal","france","england"],eu:true,gpg:.3,h:172,by:1994,j:20,blurb:"Португалец. Универсальный хавбек, Man City.",color:"#06a77d",kw:["bernardo","silva","portugal","man_city"]}),
  pl("leao","Рафаэл Лео","Rafael Leão","portugal","fw",{active:true,era:"2010s",clubs:["lille","ac_milan"],cur:"ac_milan",in:["france","italy","portugal"],gpg:.45,h:172,by:1999,j:10,blurb:"Португалец. Быстрый атакующий, AC Milan.",color:"#06a77d",kw:["rafael","leao","portugal","ac_milan"]}),
  pl("jota","Диогу Жота","Diogo Jota","portugal","fw",{active:true,era:"2020s",clubs:["wolves","liverpool"],cur:"liverpool",in:["england"],gpg:.4,h:179,by:1999,j:20,blurb:"Португалец. Быстрый вингер, Liverpool.",color:"#06a77d",kw:["diogo","jota","portugal","liverpool"]}),
  pl("pepe","Пепе","Pepe","portugal","df",{active:false,era:"2000s",clubs:["sporting","real_madrid","feenbahce"],in:["portugal","spain","turkey"],eu:true,ucl:true,gpg:.1,h:188,by:1980,leg:true,j:3,blurb:"Португалец. Жёсткий защитник, Real Madrid.",color:"#06a77d",kw:["pepe","portugal","real_madrid"]}),
  pl("figo","Луиш Фигу","Luís Figo","portugal","mf",{active:false,era:"2000s",clubs:["sporting","barcelona","real_madrid","inter"],in:["portugal","spain","italy"],bd:true,ucl:true,gpg:.3,h:184,by:1972,leg:true,ic:true,j:7,blurb:"Португалец. Золотой мяч 2000, Real Madrid.",color:"#06a77d",kw:["luis","figo","portugal","real_madrid","barcelona"]}),
  pl("ricardo","Жозе Рикарду","José Ricardo","portugal","gk",{active:false,era:"2010s",clubs:["porto","sporting"],in:["portugal"],eu:true,gpg:0,h:188,by:1987,leg:true,j:1,blurb:"Португалец. Вратарь, Euro 2016.",color:"#06a77d",kw:["ricardo","portugal","porto"]}),

  // === АНГЛИЯ (легенды) ===
  pl("beckham","Дэвид Бекхэм","David Beckham","england","mf",{active:false,era:"2000s",clubs:["man_utd","real_madrid","la_galaxies","paris_saint_germain"],in:["england","spain","usa","france"],gpg:.25,h:180,by:1975,leg:true,ic:true,riv:true,j:7,blurb:"Англичанин. Магия free kicks, Man Utd → Real Madrid → LA Galaxy.",color:"#e63946",kw:["david","beckham","england","man_utd","real_madrid"]}),
  pl("cole","Эшли Коул","Ashley Cole","england","df",{active:false,era:"2000s",clubs:["arsenal","chelsea"],in:["england","france"],wc:true,gpg:.1,h:182,by:1980,lf:true,leg:true,j:3,blurb:"Англичанин. Лучший левый защитник 2000-х.",color:"#e63946",kw:["ashley","cole","england","chelsea","arsenal"]}),
  pl("lampard","Фрэнк Лампард","Frank Lampard","england","mf",{active:false,era:"2000s",clubs:["west_ham","chelsea","man_utd","miami"],in:["england","usa"],gpg:.4,h:185,by:1978,leg:true,ic:true,j:8,blurb:"Англичанин. Легенда Chelsea, 130+ голов.",color:"#e63946",kw:["frank","lampard","england","chelsea"]}),
  pl("shearer","Эл Шерер","Alan Shearer","england","fw",{active:false,era:"90s",clubs:["sunderland","blackburn","newcastle"],in:["england"],gpg:.6,h:186,by:1970,leg:true,ic:true,j:9,blurb:"Англичанин. Лучший бомбардир PL, 260 голов.",color:"#e63946",kw:["alan","shearer","england","newcastle","blackburn"]}),
  pl("gerrard","Стивен Джеррард","Steven Gerrard","england","mf",{active:false,era:"2000s",clubs:["liverpool"],in:["england"],ucl:true,gpg:.3,h:183,by:1980,leg:true,ic:true,j:8,blurb:"Англичанин. Капитан Liverpool, 700+ матчей.",color:"#e63946",kw:["steven","gerrard","england","liverpool"]}),
  pl("nedved","Павел Недвед","Pavel Nedved","czech","mf",{active:false,era:"2000s",clubs:["sparak","inter","juventus"],in:["czech","italy"],gpg:.35,h:182,by:1972,leg:true,j:15,blurb:"Чех. Легенда Juventus, 2005.",color:"#457b9d",kw:["pavel","nedved","czech","juventus"]}),
  pl("gallas","Вильям Галлас","William Gallas","france","df",{active:false,era:"2000s",clubs:["brest","monaco","arsenal","chelsea"],in:["france","england"],wc:true,gpg:.1,h:185,by:1977,j:4,blurb:"Француз. Жёсткий защитник, Arsenal.",color:"#457b9d",kw:["william","gallas","france","arsenal"]}),

  // === АФРИКА ===
  pl("toure_yaya","Яя Туре","Yaya Touré","cote_divoire","mf",{active:false,era:"2010s",clubs:["knightfield","barcelona","man_city"],in:["cote_divoire","france","spain","england"],gpg:.3,h:189,by:1983,leg:true,j:14,blurb:"Ивуариец. Мотор midfield, Man City.",color:"#ffd166",kw:["yaya","toure","cote_divoire","man_city"]}),
  pl("drogba","Дидье Дрогба","Didier Drogba","cote_divoire","fw",{active:false,era:"2000s",clubs:["le_mans","monaco","marseille","chelsea"],in:["cote_divoire","france","england"],gpg:.5,h:185,by:1978,leg:true,ic:true,j:11,blurb:"Ивуариец. Снайпер, Chelsea, капитан сборной.",color:"#ffd166",kw:["didier","drogba","cote_divoire","chelsea"]}),
  pl("etoo","Самуэль Это'о","Samuel Eto'o","cameroon","fw",{active:false,era:"2000s",clubs:["le_mans","real_sociedad","barcelona","inter","anji"],in:["cameroon","france","spain","italy","russia"],gpg:.5,h:175,by:1981,leg:true,ic:true,j:9,blurb:"Камерунец. Быстрый форвард, Barcelona → Inter.",color:"#006400",kw:["samuel","etoo","cameroon","barcelona","inter"]}),
  pl("kanu","Нвакаме Кану","Nwankwo Kanu","nigeria","mf",{active:false,era:"2000s",clubs:["coventry","arsenal","barcelona","inter"],in:["nigeria","england","spain","italy"],gpg:.3,h:173,by:1976,leg:true,j:18,blurb:"Нигериец. Универсальный хавбек, Arsenal.",color:"#006400",kw:["nwankwo","kanu","nigeria","arsenal"]}),
  pl("adebayor","Эммануэль Адебайор","Emmanuel Adebayor","togo","fw",{active:false,era:"2000s",clubs:["lille","monaco","arsenal","man_city","real_madrid"],in:["togo","france","england","spain"],gpg:.45,h:176,by:1984,j:10,blurb:"Тоголиец. Быстрый форвард, Arsenal → Man City.",color:"#006400",kw:["emmanuel","adebayor","togo","arsenal","man_city"]}),
  pl("mane","Сейду Мане","Sadio Mané","senegal","fw",{active:true,era:"2010s",clubs:["caen","rc_lens","southampton","sevilla","liverpool","bayern"],cur:"bayern",in:["senegal","france","england","spain","germany"],gpg:.5,h:178,by:1992,leg:true,j:10,blurb:"Сенегалец. Быстрый вингер, Liverpool → Bayern.",color:"#006400",kw:["sadio","mane","senegal","liverpool","bayern"]}),

  // === ЯПОНА / КОРЕЯ / АЗИЯ ===
  pl("minamino","Такуми Минамино","Takumi Minamino","japan","fw",{active:true,era:"2010s",clubs:["cerezo","saints","liverpool"],cur:"liverpool",in:["japan","england","france"],gpg:.35,h:178,by:1995,j:18,blurb:"Японец. Быстрый атакующий, Liverpool.",color:"#e63946",kw:["takumi","minamino","japan","liverpool"]}),
  pl("mitoma","Кахо Митомо","Kaoru Mitoma","japan","fw",{active:true,era:"2020s",clubs:["urawa","brighton"],cur:"brighton",in:["japan","england"],gpg:.4,h:176,by:1997,j:10,blurb:"Японец. Техничный вингер, Brighton.",color:"#e63946",kw:["kaoru","mitoma","japan","brighton"]}),
  pl("tanaka","Аои Танакэ","Aoi Tanaka","japan","mf",{active:true,era:"2020s",clubs:["urawa","bayer_leverkusen"],cur:"bayer_leverkusen",in:["japan","germany"],gpg:.25,h:178,by:1998,j:14,blurb:"Японец. Универсальный хавбек, Bayer Leverkusen.",color:"#e63946",kw:["aoi","tanaka","japan","bayer_leverkusen"]}),
  pl("ito","Джунья Ито","Junya Ito","japan","fw",{active:true,era:"2020s",clubs:["urawa","celtic"],cur:"celtic",in:["japan","scotland"],gpg:.35,h:175,by:1997,j:11,blurb:"Японец. Быстрый вингер, Celtic.",color:"#e63946",kw:["junya","ito","japan","celtic"]}),
  pl("son","Сон Хын Мин","Son Heung-min","south_korea","fw",{active:true,era:"2010s",clubs:["ham","bayer_leverkusen","tottenham"],cur:"tottenham",in:["south_korea","germany","england"],gpg:.5,h:183,by:1992,lf:true,leg:true,j:7,blurb:"Южнокореец. Легенда Tottenham, 90+ голов.",color:"#ffd166",kw:["son","heung_min","south_korea","tottenham"]}),
  pl("dae","Али Дайи","Ali Daei","iran","fw",{active:false,era:"90s",clubs:["persepolis","karlsruher"],in:["iran","germany"],gpg:.5,h:175,by:1969,leg:true,j:10,blurb:"Иранец. Рекордсмен по голам за сборную (109).",color:"#457b9d",kw:["ali","dae","iran","persepolis"]}),
  pl("salem","Салям Аль-Даса","Salem Al-Dawsari","saudi","fw",{active:true,era:"2010s",clubs:["al_ittihad","al_hilal"],cur:"al_hilal",in:["saudi"],gpg:.4,h:178,by:1990,j:10,blurb:"Саудовец. Капитан Al-Hilal, чемпион Азии 2023.",color:"#007229",kw:["salem","al_dawsari","saudi","al_hilal"]}),
  pl("khalil","Халил Ибрагимов","Khalil Ibrahimov","kazakhstan","mf",{active:true,era:"2020s",clubs:["kairat","astana"],cur:"kairat",in:["kazakhstan"],gpg:.3,h:180,by:1995,j:8,blurb:"Казахстанец. Универсальный хавбек, Kairat.",color:"#007229",kw:["khalil","ibrahimov","kazakhstan","kairat"]}),

  // === СЕВЕРНАЯ АМЕРИКА / ЮЖНАЯ АМЕРИКА ===
  pl("pulish","Клинтон Пулеш","Clint Dempsey","usa","fw",{active:false,era:"2000s",clubs:["newcastle","portsmouth","portland","new_york_red_bulls"],in:["usa","england"],gpg:.4,h:175,by:1983,j:10,blurb:"Американец. Лучший бомбардир MLS.",color:"#457b9d",kw:["clint","dempsey","usa","new_york_red_bulls"]}),
  pl("alderto","Андре Алдэрто","Andre Alderto","mexico","fw",{active:true,era:"2010s",clubs:["chivas","la_galaxies","chivas"],cur:"chivas",in:["mexico","usa"],gpg:.45,h:180,by:1993,j:9,blurb:"Мексиканец. Снайпер, Chivas.",color:"#e9c46a",kw:["andre","alderto","mexico","chivas"]}),
  pl("james","Родриго Хайме","Rodrigo Haimí","mexico","mf",{active:true,era:"2010s",clubs:["chivas","la_galaxies","chivas"],cur:"chivas",in:["mexico","usa"],gpg:.3,h:178,by:1995,j:10,blurb:"Мексиканец. Техничный хавбек, Chivas.",color:"#e9c46a",kw:["rodrigo","haimi","mexico","chivas"]}),
  pl("james2","Хаиме Хименес","Jaime Jiménez","mexico","fw",{active:true,era:"2010s",clubs:["america","la_galaxies"],cur:"la_galaxies",in:["mexico","usa"],gpg:.4,h:179,by:1994,j:9,blurb:"Мексиканец. Быстрый вингер, LA Galaxy.",color:"#e9c46a",kw:["jaime","jimenez","mexico","la_galaxies"]}),
  pl("quintero","Дубар Куинтеро","Duván Quiñones","colombia","fw",{active:true,era:"2010s",clubs:["atletico_nacional","chivas","la_galaxies"],cur:"la_galaxies",in:["colombia","mexico","usa"],gpg:.4,h:176,by:1996,j:11,blurb:"Колумбиец. Быстрый атакующий, LA Galaxy.",color:"#e9c46a",kw:["duvan","quinones","colombia","la_galaxies"]}),
  pl("james3","Хамес Родригес","James Rodríguez","colombia","mf",{active:true,era:"2010s",clubs:["portuguesa","psv","bayern","real_madrid","bayern","clube_brasilero"],cur:"clube_brasilero",in:["colombia","netherlands","germany","spain","brazil"],wc:false,gpg:.35,h:180,by:1991,leg:true,j:10,blurb:"Колумбиец. Золотой мяч ЧМ 2014, Real Madrid → Bayern.",color:"#e9c46a",kw:["james","rodriguez","colombia","bayern","real_madrid"]}),
  pl("sued","Мартинос Сюдес","Martín Cáceres","uruguay","df",{active:false,era:"2000s",clubs:["defensor","juventus","liverpool","inter"],in:["uruguay","italy","england"],wc:true,gpg:.1,h:184,by:1986,j:4,blurb:"Уругваец. Центральный защитник, Juventus → Liverpool → Inter.",color:"#e9c46a",kw:["martin","caceres","uruguay","juventus","liverpool"]}),
  pl("aranguiz","Артаур Арanguiz","Arturo Vidal","chile","mf",{active:false,era:"2010s",clubs:["colo colo","catania","juventus","bayern","barcelona","inter","boca"],in:["chile","italy","germany","spain","argentina"],wc:false,gpg:.3,h:183,by:1987,leg:true,j:22,blurb:"Чилец. Мотор midfield, Bayern → Barcelona → Inter.",color:"#e9c46a",kw:["arturo","vidal","chile","bayern","barcelona","inter"]}),
  pl("ariza","Ариэль Ариса","Ariel Ariza","peru","fw",{active:true,era:"2010s",clubs:["universidad","sporting_cristal","univ_lima"],cur:"univ_lima",in:["peru"],gpg:.45,h:178,by:1998,j:9,blurb:"Перуанец. Снайпер, Sporting Cristal.",color:"#e9c46a",kw:["ariel","ariza","peru","sporting_cristal"]}),
  pl("enca","Энкарнасан Энка","Enzo Fernández","argentina","mf",{active:true,era:"2020s",clubs:["river","benfica","chelsea"],cur:"chelsea",in:["argentina","portugal","england"],wc:true,gpg:.3,h:178,by:2001,j:14,blurb:"Аргентинец. Универсальный хавбек, Chelsea.",color:"#e9c46a",kw:["enzo","fernandez","argentina","chelsea"]}),
  pl("de_la_fuentes","Данни Олмос","Gonzalo Díaz","paraguay","fw",{active:true,era:"2020s",clubs:["olimpia","barcelona","barcelona"],cur:"barcelona",in:["paraguay","spain"],gpg:.4,h:178,by:1999,j:9,blurb:"Парагваец. Сильный форвард, Barcelona.",color:"#e9c46a",kw:["gonzalo","diaz","paraguay","barcelona"]}),
  pl("mendez","Мигель Мендес","Miguel Mendes","ecuador","fw",{active:true,era:"2010s",clubs:["emelec","barcelona_ec","independente"],cur:"independente",in:["ecuador"],gpg:.4,h:177,by:1997,j:9,blurb:"Эквадорец. Снайпер, Emelec.",color:"#e9c46a",kw:["miguel","mendes","ecuador","emelec"]}),

  // === АВСТРАЛИЯ / ОСТВАТЬСЯ ===
  pl("tressor","Кристиан Тресор","Curtis Good","australia","mf",{active:true,era:"2020s",clubs:["melbourne","adelaide","perth"],cur:"perth",in:["australia"],gpg:.3,h:180,by:1995,j:8,blurb:"Австралиец. Универсальный хавбек, Perth Glory.",color:"#007229",kw:["curtis","good","australia","perth"]}),
  pl("ingram","Мэттьус Инграм","Matthew Inkoom","australia","df",{active:true,era:"2020s",clubs:["sydney","melbourne","brentford"],cur:"brentford",in:["australia","england"],gpg:.1,h:185,by:1997,j:4,blurb:"Австралиец. Центральный защитник, Brentford.",color:"#007229",kw:["matthew","inkoom","australia","brentford"]}),
];

// ============================================================
// ДОПОЛНИТЕЛЬНЫЕ ИГРОКИ (из players-extra.ts)
// ============================================================
const EXTRA_PLAYERS: Entity[] = parseExtraPlayers(EXTRA_PLAYERS_RAW).map((p) => {
  const cont = CONT[p.nation] ?? "eu";
  const props: Record<string, any> = {
    isPerson: true, isPlayer: true,
    isActive: p.active,
    nationality: p.nation, era: p.era,
    position: p.pos,
    isGoalkeeper: p.pos === "gk", isDefender: p.pos === "df",
    isMidfielder: p.pos === "mf", isForward: p.pos === "fw",
    leftFooted: p.lf,
    currentClub: p.cur, famousClubs: p.clubs,
    wonWorldCup: p.wc, wonBallonDor: p.bd,
    wonChampionsLeague: p.ucl, wonEuros: p.eu,
    goalsPerGame: p.gpg, heightCm: p.h, birthYear: p.by,
    isEuropean: cont === "eu", isSouthAmerican: cont === "sa",
    isAfrican: cont === "af", isNorthAmerican: cont === "na",
    isAsian: cont === "asia", isOceania: cont === "oce",
    isLegendary: p.leg, isIcon: p.ic, isRival: p.riv,
    jerseyNumber: 10,
  };
  const id = "x_" + p.nameEn.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return {
    id, name: p.name, nameEn: p.nameEn, category: "player" as const,
    blurb: p.nameEn, color: "#457b9d", props: P(props),
    keywords: [p.nameEn.toLowerCase().replace(/[^a-z]+/g, " ")],
  };
});

// ============================================================
// НЕФУТБОЛИСТЫ (клубы, сборные, стадионы, турниры, лиги,
// судьи, позиции, термины, награды, события)
// ============================================================

const COACHES: Entity[] = [
  { id: "guardiola", name: "Пеп Гвардиола", nameEn: "Pep Guardiola", category: "coach", blurb: "Испанец. Тренер Man City, 17+ трофеев.", color: "#457b9d", props: P({ isPerson: true, isCoach: true, isActive: true, nationality: "spain" }), keywords: ["pep","guardiola","man_city"] },
  { id: "ancelotti", name: "Карло Анчелотти", nameEn: "Carlo Ancelotti", category: "coach", blurb: "Итальянец. Тренер Real Madrid, 5 ЛЧ.", color: "#457b9d", props: P({ isPerson: true, isCoach: true, isActive: true, nationality: "italy" }), keywords: ["carlo","ancelotti","real_madrid"] },
  { id: "klopp", name: "Юрген Клопп", nameEn: "Jürgen Klopp", category: "coach", blurb: "Немец. Бывший тренер Liverpool, ЛЧ 2019.", color: "#457b9d", props: P({ isPerson: true, isCoach: true, isActive: false, nationality: "germany" }), keywords: ["jurgen","klopp","liverpool"] },
  { id: "simeone", name: "Диего Симеоне", nameEn: "Diego Simeone", category: "coach", blurb: "Аргентинец. Тренер Atletico Madrid.", color: "#457b9d", props: P({ isPerson: true, isCoach: true, isActive: true, nationality: "argentina" }), keywords: ["diego","simeone","atletico"] },
];

const CLUBS: Entity[] = [
  { id: "real_madrid", name: "Real Madrid", nameEn: "Real Madrid CF", category: "club", blurb: "Испания. 15× ЛЧ, рекордсмен.", color: "#2a9d8f", props: P({ isEuropean: true, country: "spain", isTop5: true, foundedYear: 1902 }), keywords: ["real","madrid"] },
  { id: "barcelona", name: "Barcelona", nameEn: "FC Barcelona", category: "club", blurb: "Испания. Ла Масия, 5× ЛЧ.", color: "#2a9d8f", props: P({ isEuropean: true, country: "spain", isTop5: true, foundedYear: 1899 }), keywords: ["barcelona"] },
  { id: "man_city", name: "Manchester City", nameEn: "Manchester City FC", category: "club", blurb: "Англия. Платиновый клуб, 3× ЛЧ.", color: "#2a9d8f", props: P({ isEuropean: true, country: "england", isTop5: true, foundedYear: 1880 }), keywords: ["manchester","city"] },
  { id: "man_utd", name: "Manchester United", nameEn: "Manchester United FC", category: "club", blurb: "Англия. 20× чемпион PL, 3× ЛЧ.", color: "#2a9d8f", props: P({ isEuropean: true, country: "england", isTop5: true, foundedYear: 1878 }), keywords: ["manchester","united"] },
  { id: "liverpool", name: "Liverpool", nameEn: "Liverpool FC", category: "club", blurb: "Англия. 19× чемпион PL, 6× ЛЧ.", color: "#2a9d8f", props: P({ isEuropean: true, country: "england", isTop5: true, foundedYear: 1892 }), keywords: ["liverpool"] },
  { id: "chelsea", name: "Chelsea", nameEn: "Chelsea FC", category: "club", blurb: "Англия. 5× чемпион PL, 2× ЛЧ.", color: "#2a9d8f", props: P({ isEuropean: true, country: "england", isTop5: true, foundedYear: 1905 }), keywords: ["chelsea"] },
  { id: "juventus", name: "Juventus", nameEn: "Juventus FC", category: "club", blurb: "Италия. 36× чемпион, 2× ЛЧ.", color: "#2a9d8f", props: P({ isEuropean: true, country: "italy", isTop5: true, foundedYear: 1897 }), keywords: ["juventus"] },
  { id: "bayern", name: "Bayern Munich", nameEn: "Bayern Munich", category: "club", blurb: "Германия. 33× чемпион, 6× ЛЧ.", color: "#2a9d8f", props: P({ isEuropean: true, country: "germany", isTop5: true, foundedYear: 1900 }), keywords: ["bayern","munich"] },
  { id: "psg", name: "Paris Saint-Germain", nameEn: "Paris Saint-Germain", category: "club", blurb: "Франция. 12× чемпион, 1× ЛЧ.", color: "#2a9d8f", props: P({ isEuropean: true, country: "france", isTop5: true, foundedYear: 1970 }), keywords: ["psg","paris"] },
  { id: "inter", name: "Inter", nameEn: "Inter Milan", category: "club", blurb: "Италия. 20× чемпион, 3× ЛЧ.", color: "#2a9d8f", props: P({ isEuropean: true, country: "italy", isTop5: true, foundedYear: 1908 }), keywords: ["inter","milan"] },
  { id: "milan", name: "AC Milan", nameEn: "AC Milan", category: "club", blurb: "Италия. 19× чемпион, 7× ЛЧ.", color: "#2a9d8f", props: P({ isEuropean: true, country: "italy", isTop5: true, foundedYear: 1899 }), keywords: ["ac","milan"] },
  { id: "arsenal", name: "Arsenal", nameEn: "Arsenal FC", category: "club", blurb: "Англия. 13× чемпион PL, 1× ЛЧ.", color: "#2a9d8f", props: P({ isEuropean: true, country: "england", foundedYear: 1886 }), keywords: ["arsenal"] },
];

const NATIONAL_TEAMS: Entity[] = [
  { id: "england_nt", name: "Сборная Англии", nameEn: "England", category: "national_team", blurb: "Англия. 1× ЧМ 1966.", color: "#e9c46a", props: P({ isEuropean: true, country: "england" }), keywords: ["england"] },
  { id: "spain_nt", name: "Сборная Испании", nameEn: "Spain", category: "national_team", blurb: "Испания. 1× ЧМ 2010, 3× Евро.", color: "#e9c46a", props: P({ isEuropean: true, country: "spain" }), keywords: ["spain"] },
  { id: "germany_nt", name: "Сборная Германии", nameEn: "Germany", category: "national_team", blurb: "Германия. 4× ЧМ.", color: "#e9c46a", props: P({ isEuropean: true, country: "germany" }), keywords: ["germany"] },
  { id: "brazil_nt", name: "Сборная Бразилии", nameEn: "Brazil", category: "national_team", blurb: "Бразилия. 5× ЧМ.", color: "#e9c46a", props: P({ isSouthAmerican: true, country: "brazil" }), keywords: ["brazil"] },
  { id: "argentina_nt", name: "Сборная Аргентины", nameEn: "Argentina", category: "national_team", blurb: "Аргентина. 3× ЧМ.", color: "#e9c46a", props: P({ isSouthAmerican: true, country: "argentina" }), keywords: ["argentina"] },
  { id: "france_nt", name: "Сборная Франции", nameEn: "France", category: "national_team", blurb: "Франция. 2× ЧМ.", color: "#e9c46a", props: P({ isEuropean: true, country: "france" }), keywords: ["france"] },
  { id: "kazakhstan_nt", name: "Сборная Казахстана", nameEn: "Kazakhstan", category: "national_team", blurb: "Казахстан. Азия.", color: "#e9c46a", props: P({ isAsian: true, country: "kazakhstan" }), keywords: ["kazakhstan"] },
];

const STADIUMS: Entity[] = [
  { id: "wembley", name: "Вембли", nameEn: "Wembley Stadium", category: "stadium", blurb: "Лондон. 90,000 мест.", color: "#f4a261", props: P({ continent: "eu", city: "london", capacity: 90, hasRoof: true, isNationalStadium: true }), keywords: ["wembley","london"] },
  { id: "santiago", name: "Сантьяго Бернабеу", nameEn: "Santiago Bernabéu", category: "stadium", blurb: "Мадрид. 81,000 мест.", color: "#f4a261", props: P({ continent: "eu", city: "madrid", capacity: 81, hasRoof: true }), keywords: ["santiago","bernabeu","madrid"] },
  { id: "camp_nou", name: "Камп Ноу", nameEn: "Camp Nou", category: "stadium", blurb: "Барселона. 99,000 мест.", color: "#f4a261", props: P({ continent: "eu", city: "barcelona", capacity: 99, hasRoof: false }), keywords: ["camp","nou","barcelona"] },
  { id: "allianz", name: "Альянц Арена", nameEn: "Allianz Arena", category: "stadium", blurb: "Мюнхен. 75,000 мест.", color: "#f4a261", props: P({ continent: "eu", city: "munich", capacity: 75, hasRoof: true }), keywords: ["allianz","arena","munich"] },
  { id: "parc", name: "Парк Принсов", nameEn: "Parc des Princes", category: "stadium", blurb: "Париж. 48,000 мест.", color: "#f4a261", props: P({ continent: "eu", city: "paris", capacity: 48, hasRoof: false }), keywords: ["parc","princes","paris"] },
];

const TOURNAMENTS: Entity[] = [
  { id: "wc", name: "Чемпионат мира", nameEn: "FIFA World Cup", category: "tournament", blurb: "Раз в 4 года, 32 команды.", color: "#9d4edd", props: P({ isInternational: true, frequency: 4 }), keywords: ["world","cup"] },
  { id: "ucl", name: "Лига чемпионов", nameEn: "UEFA Champions League", category: "tournament", blurb: "Межклубный, 32 команды.", color: "#9d4edd", props: P({ isClub: true, isContinental: true }), keywords: ["champions","league"] },
  { id: "euro", name: "Евро", nameEn: "UEFA Euro", category: "tournament", blurb: "Раз в 4 года, 24 команды.", color: "#9d4edd", props: P({ isInternational: true, isContinental: true, frequency: 4 }), keywords: ["euro","europa"] },
  { id: "copa", name: "Кубок Америки", nameEn: "Copa América", category: "tournament", blurb: "Южноамериканский, 16 команд.", color: "#9d4edd", props: P({ isInternational: true, isContinental: true, frequency: 4 }), keywords: ["copa","america"] },
];

const LEAGUES: Entity[] = [
  { id: "pl", name: "Английская Премьер-лига", nameEn: "Premier League", category: "league", blurb: "Англия. 20 команд.", color: "#4cc9f0", props: P({ isTopLeague: true, country: "england", numTeams: 20 }), keywords: ["premier","league"] },
  { id: "laliga", name: "Ла Лига", nameEn: "La Liga", category: "league", blurb: "Испания. 20 команд.", color: "#4cc9f0", props: P({ isTopLeague: true, country: "spain", numTeams: 20 }), keywords: ["la","liga"] },
  { id: "seriea", name: "Серия А", nameEn: "Serie A", category: "league", blurb: "Италия. 20 команд.", color: "#4cc9f0", props: P({ isTopLeague: true, country: "italy", numTeams: 20 }), keywords: ["serie","a"] },
  { id: "bundesliga", name: "Бундеслига", nameEn: "Bundesliga", category: "league", blurb: "Германия. 18 команд.", color: "#4cc9f0", props: P({ isTopLeague: true, country: "germany", numTeams: 18 }), keywords: ["bundesliga"] },
  { id: "ligue", name: "Лига 1", nameEn: "Ligue 1", category: "league", blurb: "Франция. 18 команд.", color: "#4cc9f0", props: P({ isTopLeague: true, country: "france", numTeams: 18 }), keywords: ["ligue","1"] },
];

const REFEREES: Entity[] = [
  { id: "turpin", name: "Клеман Тирпен", nameEn: "Clement Turpin", category: "referee", blurb: "Франция. Судья финалов ЛЧ.", color: "#606c38", props: P({ isPerson: true, isActive: true, nationality: "france" }), keywords: ["clement","turpin","france"] },
  { id: "kloos", name: "Данни Макелли", nameEn: "Danny Makkelie", category: "referee", blurb: "Нидерланды. Один из топовых арбитров.", color: "#606c38", props: P({ isPerson: true, isActive: true, nationality: "netherlands" }), keywords: ["danny","makkelie"] },
];

const POSITIONS: Entity[] = [
  { id: "pos_gk", name: "Вратарь", nameEn: "Goalkeeper", category: "position", blurb: "Последняя линия обороны.", color: "#e76f51", props: P({ isPerson: false }), keywords: ["goalkeeper","gk"] },
  { id: "pos_df", name: "Защитник", nameEn: "Defender", category: "position", blurb: "Оборона, центральные и фланговые.", color: "#e76f51", props: P({ isPerson: false }), keywords: ["defender","df"] },
  { id: "pos_mf", name: "Полузащитник", nameEn: "Midfielder", category: "position", blurb: "Связующее звено, центр и фланги.", color: "#e76f51", props: P({ isPerson: false }), keywords: ["midfielder","mf"] },
  { id: "pos_fw", name: "Нападающий", nameEn: "Forward", category: "position", blurb: "Атака, форварды и вингеры.", color: "#e76f51", props: P({ isPerson: false }), keywords: ["forward","fw","striker","winger"] },
];

const TERMS: Entity[] = [
  { id: "term_offside", name: "Оффсайд", nameEn: "Offside", category: "term", blurb: "Положение вне игры.", color: "#8d99ae", props: P({ isPerson: false }), keywords: ["offside"] },
  { id: "term_pk", name: "Пенальти", nameEn: "Penalty", category: "term", blurb: "11-метровый удар.", color: "#8d99ae", props: P({ isPerson: false }), keywords: ["penalty","pk"] },
  { id: "term_violation", name: "Фол", nameEn: "Foul", category: "term", blurb: "Нарушение правил.", color: "#8d99ae", props: P({ isPerson: false }), keywords: ["foul","violation"] },
];

const AWARDS: Entity[] = [
  { id: "award_bd", name: "Золотой мяч", nameEn: "Ballon d'Or", category: "award", blurb: "Лучший футболист года по версии France Football.", color: "#ffd166", props: P({ isIndividual: true, isGolden: true }), keywords: ["ballon","dor","golden","ball"] },
  { id: "award_fifa_best", name: "FIFA Best", nameEn: "FIFA Best", category: "award", blurb: "Лучший футболист года по версии FIFA.", color: "#ffd166", props: P({ isIndividual: true, byFifa: true }), keywords: ["fifa","best"] },
  { id: "award_golden_boot", name: "Золотая бутса", nameEn: "Golden Boot", category: "award", blurb: "Лучший бомбардир сезона.", color: "#ffd166", props: P({ isIndividual: true, isGolden: true }), keywords: ["golden","boot"] },
];

const EVENTS: Entity[] = [
  { id: "event_wc_1998", name: "ЧМ 1998", nameEn: "1998 World Cup", category: "event", blurb: "Франция. Финал Франция vs Бразилия 3:0.", color: "#4361ee", props: P({ year: 1998, country: "france", continent: "eu" }), keywords: ["1998","world","cup","france"] },
  { id: "event_wc_2002", name: "ЧМ 2002", nameEn: "2002 World Cup", category: "event", blurb: "Корея/Япония. Бразилия — чемпион.", color: "#4361ee", props: P({ year: 2002, continent: "asia" }), keywords: ["2002","world","cup"] },
  { id: "event_wc_2006", name: "ЧМ 2006", nameEn: "2006 World Cup", category: "event", blurb: "Германия. Италия — чемпион.", color: "#4361ee", props: P({ year: 2006, country: "germany", continent: "eu" }), keywords: ["2006","world","cup","germany"] },
  { id: "event_wc_2010", name: "ЧМ 2010", nameEn: "2010 World Cup", category: "event", blurb: "ЮАР. Испания — чемпион.", color: "#4361ee", props: P({ year: 2010, continent: "af" }), keywords: ["2010","world","cup","south","africa"] },
  { id: "event_wc_2014", name: "ЧМ 2014", nameEn: "2014 World Cup", category: "event", blurb: "Бразилия. Германия — чемпион.", color: "#4361ee", props: P({ year: 2014, country: "brazil", continent: "sa" }), keywords: ["2014","world","cup","brazil"] },
  { id: "event_wc_2018", name: "ЧМ 2018", nameEn: "2018 World Cup", category: "event", blurb: "Россия. Франция — чемпион.", color: "#4361ee", props: P({ year: 2018, country: "russia", continent: "eu" }), keywords: ["2018","world","cup","russia"] },
  { id: "event_wc_2022", name: "ЧМ 2022", nameEn: "2022 World Cup", category: "event", blurb: "Катар. Аргентина — чемпион.", color: "#4361ee", props: P({ year: 2022, continent: "asia" }), keywords: ["2022","world","cup","qatar"] },
];

// ============================================================
// ВСЕ СУЩНОСТИ
// ============================================================

export const ALL_ENTITIES: Entity[] = [
  ...PLAYERS,
  ...EXTRA_PLAYERS,
  ...COACHES,
  ...CLUBS,
  ...NATIONAL_TEAMS,
  ...STADIUMS,
  ...TOURNAMENTS,
  ...LEAGUES,
  ...REFEREES,
  ...POSITIONS,
  ...TERMS,
  ...AWARDS,
  ...EVENTS,
];

export const ENTITY_MAP: Map<string, Entity> = new Map(
  ALL_ENTITIES.map((e) => [e.id, e])
);

export const CATEGORIES_INFO = CATEGORIES;
