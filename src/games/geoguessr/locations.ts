// ============================================================
// GEOGUESSR LITE — банк локаций (300 вопросов)
//
// ВАЖНО: photo и координаты обязаны соответствовать друг другу.
// Координаты — точка, которую показывает фото (установлены
// вручную по известным достопримечательностям).
//
// Источник фото: Wikimedia Commons (CC). Все 300 файлов
// проверены через Commons imageinfo API — гарантированно существуют.
//
// Структура: { id, image, latitude, longitude, country, city, description, kind }
// Будущие режимы фильтруются через поле `kind` и селекторы ниже.
// ============================================================

import { shuffle, type GeoLocation } from "./geo-engine";

// Прямой URL оригинала с лимитом ширины (Commons отдаёт JPEG).
const commonsUrl = (title: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
    title
  )}?width=1600`;

// URL через наш прокси /api/geo-image — обходит hotlink-защиту
// Commons (403 на referrer с Vercel/локалки). img-теги должны
// использовать именно geoImageUrl, плюс referrerPolicy="no-referrer".
export const geoImageUrl = (commonsUri: string) =>
  `/api/geo-image?url=${encodeURIComponent(commonsUri)}`;

// Для локации: прокси-URL её фото.
export const geoImageSrc = (location: { image: string }) =>
  geoImageUrl(location.image);

// Внутренний прямой URL (используется прокси и в тестах).
const orig = (title: string) => commonsUrl(title);

export const LOCATIONS: GeoLocation[] = [
  // ==================== КАЗАХСТАН (8) ====================
  { id: "kz-astana-bayterek", image: orig("Astana-2021-10 - 12.jpg"), latitude: 51.1643, longitude: 71.4645, country: "Казахстан", city: "Астана", description: "Панорама Астаны", kind: "city" },
  { id: "kz-almaty-koktobe", image: orig("Sunset over the Almaty seen from Kok Tobe mountain, pic 2.jpg"), latitude: 43.235, longitude: 76.923, country: "Казахстан", city: "Алматы", description: "Алматы со смотровой Кок-Тобе", kind: "city" },
  { id: "kz-burabay", image: orig("Lake Burabai 2.jpg"), latitude: 53.1525, longitude: 69.7361, country: "Казахстан", city: "Бурабай", description: "Озеро Бурабай", kind: "nature" },
  { id: "kz-almaty-cathedral", image: orig("Ascension Cathedral, Almaty KZ.JPG"), latitude: 43.229, longitude: 76.875, country: "Казахстан", city: "Алматы", description: "Вознесенский собор Алматы", kind: "landmark" },
  { id: "kz-shymkent", image: orig("Ordabasy Plaza (Shymkent).jpg"), latitude: 42.3142, longitude: 69.5758, country: "Казахстан", city: "Шымкент", description: "Площадь Ордабасы", kind: "city" },
  { id: "kz-astana-khanshatyr", image: orig("Хан Шатыр 2012 2.jpg"), latitude: 51.144, longitude: 71.454, country: "Казахстан", city: "Астана", description: "Хан Шатыр", kind: "landmark" },
  { id: "kg-bishkek", image: orig("Bishkek 03-2016 img11 Chuy Prospekt.jpg"), latitude: 42.8746, longitude: 74.5698, country: "Кыргызстан", city: "Бишкек", description: "Проспект Чуй", kind: "city" },
  { id: "uz-tashkent", image: orig("Aerial view of Tashkent, Uzbekistan.JPG"), latitude: 41.2995, longitude: 69.2401, country: "Узбекистан", city: "Ташкент", description: "Ташкент с высоты", kind: "city" },

  // ==================== ЕВРОПА (100) ====================
  // Франция (12)
  { id: "fr-paris-eiffel", image: orig("Champ de Mars from the Eiffel Tower - July 2006 edit.jpg"), latitude: 48.8584, longitude: 2.2945, country: "Франция", city: "Париж", description: "Шам-де-Марс у Эйфелевой башни", kind: "landmark" },
  { id: "fr-paris-arcdetriomphe", image: orig("Arc Triomphe.jpg"), latitude: 48.8738, longitude: 2.295, country: "Франция", city: "Париж", description: "Арка де Триомф", kind: "landmark" },
  { id: "fr-paris-notredame", image: orig("Paris, Notre Dame -- 2014 -- 1458-65.jpg"), latitude: 48.853, longitude: 2.3499, country: "Франция", city: "Париж", description: "Собор Парижской Богоматери", kind: "landmark" },
  { id: "fr-paris-louvre", image: orig("Louvre Museum Wikimedia Commons.jpg"), latitude: 48.8606, longitude: 2.3376, country: "Франция", city: "Париж", description: "Лувр", kind: "landmark" },
  { id: "fr-paris-champs", image: orig("Avenue des Champs-Elysées, Paris 12 December 2020.jpg"), latitude: 48.8698, longitude: 2.2937, country: "Франция", city: "Париж", description: "Шанз-Элизе", kind: "city" },
  { id: "fr-paris-sacrecoeur", image: orig("Paris, Sacré-Cœur de Montmartre -- 2014 -- 1193.jpg"), latitude: 48.8867, longitude: 2.3421, country: "Франция", city: "Париж", description: "Сакре-Кёр на Монмартре", kind: "landmark" },
  { id: "fr-marseille", image: orig("Vieux-Port de Marseille, France.jpg"), latitude: 43.2929, longitude: 5.3698, country: "Франция", city: "Марсель", description: "Старая гавань Марселя", kind: "city" },
  { id: "fr-lyon", image: orig("Place Bellecour Lyon 3.jpg"), latitude: 45.7578, longitude: 4.832, country: "Франция", city: "Лион", description: "Пляс Беллекур", kind: "plaza" },
  { id: "fr-toulouse", image: orig("Toulouse Capitole Night Wikimedia Commons.jpg"), latitude: 43.6045, longitude: 1.4442, country: "Франция", city: "Тулуза", description: "Капитолий Тулузы", kind: "landmark" },
  { id: "fr-strasbourg", image: orig("Strasbourg cathedral facade.jpg"), latitude: 48.5845, longitude: 7.7531, country: "Франция", city: "Страсбург", description: "Страсбургский собор", kind: "landmark" },
  { id: "fr-nice", image: orig("Nice Promenade des Anglais.jpg"), latitude: 43.6961, longitude: 7.2658, country: "Франция", city: "Ницца", description: "Променад д'Англе", kind: "city" },
  { id: "fr-lille", image: orig("Lille Grand-Place 01.jpg"), latitude: 50.6292, longitude: 3.057, country: "Франция", city: "Лилль", description: "Гранд-Плас Лилля", kind: "plaza" },

  // Великобритания (12)
  { id: "gb-london-bigben", image: orig("Big Ben Elizabeth Tower London 2023 01.jpg"), latitude: 51.5007, longitude: -0.1246, country: "Великобритания", city: "Лондон", description: "Большой Бен", kind: "landmark" },
  { id: "gb-london-tower", image: orig("Tower of London White Tower.jpg"), latitude: 51.5081, longitude: -0.0759, country: "Великобритания", city: "Лондон", description: "Белая башня Тауэра", kind: "landmark" },
  { id: "gb-london-westminster", image: orig("Westminster Palace London.jpg"), latitude: 51.4995, longitude: -0.1244, country: "Великобритания", city: "Лондон", description: "Вестминстерский дворец", kind: "landmark" },
  { id: "gb-london-eye", image: orig("London Eye at night.jpg"), latitude: 51.5033, longitude: -0.1196, country: "Великобритания", city: "Лондон", description: "Колесо обозрения", kind: "landmark" },
  { id: "gb-london-tatemodern", image: orig("Tate Modern London June 2016.jpg"), latitude: 51.5076, longitude: -0.0994, country: "Великобритания", city: "Лондон", description: "Тейт Модерн", kind: "landmark" },
  { id: "gb-edinburgh", image: orig("Edinburgh Castle from below.jpg"), latitude: 55.9486, longitude: -3.1999, country: "Великобритания", city: "Эдинбург", description: "Эдинбургский замок", kind: "landmark" },
  { id: "gb-brighton", image: orig("Brighton pier.jpg"), latitude: 50.8225, longitude: -0.1392, country: "Великобритания", city: "Брайтон", description: "Пирс в Брайтоне", kind: "nature" },
  { id: "gb-oxford", image: orig("Bodleian Library Oxford.jpg"), latitude: 51.7542, longitude: -1.2544, country: "Великобритания", city: "Оксфорд", description: "Бодлианская библиотека", kind: "landmark" },
  { id: "gb-birmingham", image: orig("Modern architecture - The Bull Ring, Birmingham - geograph.org.uk - 5293830.jpg"), latitude: 52.4795, longitude: -1.8972, country: "Великобритания", city: "Бирмингем", description: "Центральная библиотека", kind: "landmark" },
  { id: "gb-manifest", image: orig("Manchester town hall.jpg"), latitude: 53.4785, longitude: -2.2416, country: "Великобритания", city: "Манчестер", description: "Городская ратуша", kind: "landmark" },
  { id: "gb-cambridge", image: orig("Cambridge - King's College, founded in 1441 - Back Lawn - View SSW on River Cam & King's College Bridge 1819 by William Wilkins.jpg"), latitude: 52.2053, longitude: 0.1218, country: "Великобритания", city: "Кембридж", description: "Кембридж", kind: "city" },
  { id: "gb-cardiff", image: orig("Cardiff Wales.jpg"), latitude: 51.4816, longitude: -3.1791, country: "Великобритания", city: "Кардифф", description: "Кардифф, Уэльс", kind: "city" },

  // Италия (14)
  { id: "it-rome-colosseum", image: orig("Colosseo 2020.jpg"), latitude: 41.8902, longitude: 12.4922, country: "Италия", city: "Рим", description: "Колизей", kind: "landmark" },
  { id: "it-rome-trevi", image: orig("Trevi Fountain, Rome, Italy 2 - May 2007.jpg"), latitude: 41.9009, longitude: 12.4833, country: "Италия", city: "Рим", description: "Фонтан Треви", kind: "landmark" },
  { id: "it-rome-stpeters", image: orig("Basilica di San Pietro in Vaticano September 2015-1a.jpg"), latitude: 41.9022, longitude: 12.4539, country: "Италия", city: "Рим", description: "Собор Святого Петра", kind: "landmark" },
  { id: "it-venice-rialto", image: orig("Canal Grande and Ponte di Rialto, Venice - September 2017.jpg"), latitude: 45.4341, longitude: 12.3385, country: "Италия", city: "Венеция", description: "Мост Риальто", kind: "landmark" },
  { id: "it-venice-stmarks", image: orig("Saint Mark's Square, Venice P1809.jpg"), latitude: 45.434, longitude: 12.339, country: "Италия", city: "Венеция", description: "Площадь Святого Марка", kind: "plaza" },
  { id: "it-venice-doge", image: orig("(Venice) Doge's Palace facing the sea.jpg"), latitude: 45.4335, longitude: 12.3398, country: "Италия", city: "Венеция", description: "Дворец дожей", kind: "landmark" },
  { id: "it-milan-duomo", image: orig("20110724 Milan Cathedral 5266.jpg"), latitude: 45.4642, longitude: 9.1902, country: "Италия", city: "Милан", description: "Собор Милана", kind: "landmark" },
  { id: "it-florence-duomo", image: orig("Florence Duomo from Michelangelo hill.jpg"), latitude: 43.7731, longitude: 11.2562, country: "Италия", city: "Флоренция", description: "Собор Флоренции", kind: "landmark" },
  { id: "it-florence-ponte", image: orig("Ponte Vecchio Florence.jpg"), latitude: 43.7688, longitude: 11.2548, country: "Италия", city: "Флоренция", description: "Мост Веккьо", kind: "landmark" },
  { id: "it-naples", image: orig("Naples Cathedral - Duomo di Napoli, Façade (5315-Pan).jpg"), latitude: 40.8487, longitude: 14.2564, country: "Италия", city: "Неаполь", description: "Собор Неаполя", kind: "landmark" },
  { id: "it-pisa", image: orig("The Leaning Tower of Pisa SB.jpeg"), latitude: 43.723, longitude: 10.3966, country: "Италия", city: "Пиза", description: "Пизанская башня", kind: "landmark" },
  { id: "it-amalfi", image: orig("Positano (Italy) 04.jpg"), latitude: 40.6281, longitude: 14.485, country: "Италия", city: "Позитано", description: "Позитано, Амальфи", kind: "nature" },
  { id: "it-cinqueterre", image: orig("Manarola NW Cinque Terre Sep23 A7C 07233.jpg"), latitude: 44.1195, longitude: 9.8272, country: "Италия", city: "Манарола", description: "Чинкве-Терре", kind: "nature" },
  { id: "it-sardinia", image: orig("Nuraghe Su Nuraxi - Barumini - Sardinia - Italy - 23.jpg"), latitude: 39.6892, longitude: 8.9511, country: "Италия", city: "Барумини", description: "Нураг Су-Нуракси, Сардиния", kind: "landmark" },

  // Испания (10)
  { id: "es-madrid-prado", image: orig("Museo del Prado - Madrid 02.jpg"), latitude: 40.4138, longitude: -3.6921, country: "Испания", city: "Мадрид", description: "Музей Прадо", kind: "landmark" },
  { id: "es-madrid-puerta", image: orig("Puerta del Sol Madrid.jpg"), latitude: 40.4169, longitude: -3.7034, country: "Испания", city: "Мадрид", description: "Пуэрта-дель-Соль", kind: "plaza" },
  { id: "es-barcelona-sagrada", image: orig("Exterior of the Sagrada Família 20171225.jpg"), latitude: 41.4036, longitude: 2.1744, country: "Испания", city: "Барселона", description: "Сagrada Фамилия", kind: "landmark" },
  { id: "es-barcelona-batllo", image: orig("Casa Batlló, Barcelona.jpg"), latitude: 41.3917, longitude: 2.1649, country: "Испания", city: "Барселона", description: "Дом Батльо", kind: "landmark" },
  { id: "es-granada-alhambra", image: orig("Alhambra in the evening.jpg"), latitude: 37.1761, longitude: -3.5881, country: "Испания", city: "Гранада", description: "Альгамбра", kind: "landmark" },
  { id: "es-bilbao-guggenheim", image: orig("Bilbao - Museo Guggenheim 01.jpg"), latitude: 43.2687, longitude: -2.934, country: "Испания", city: "Бильбао", description: "Музей Гуггенхайма", kind: "landmark" },
  { id: "es-seville", image: orig("Giralda cathedral from Alcazar Seville Spain.jpg"), latitude: 37.3838, longitude: -5.9906, country: "Испания", city: "Севилья", description: "Хиральда, собор Севильи", kind: "landmark" },
  { id: "es-valencia", image: orig("Ciudad de las Artes y las Ciencias, Valencia, España, 2014-06-29, DD 39.JPG"), latitude: 39.4699, longitude: -0.3763, country: "Испания", city: "Валенсия", description: "Центр Валенсии", kind: "city" },
  { id: "es-mallorca", image: orig("Cala Estància (Palma) - 1.jpg"), latitude: 39.5857, longitude: 2.6507, country: "Испания", city: "Майорка", description: "Пляж Майорки", kind: "nature" },
  { id: "es-madrid-plaza", image: orig("Plaza Mayor Madrid.jpg"), latitude: 40.4154, longitude: -3.7074, country: "Испания", city: "Мадрид", description: "Пласа-Майор", kind: "plaza" },

  // Германия (10)
  { id: "de-berlin-brandenburg", image: orig("Brandenburger Tor morgens.jpg"), latitude: 52.5163, longitude: 13.3777, country: "Германия", city: "Берлин", description: "Бранденбургские ворота", kind: "landmark" },
  { id: "de-berlin-tvtower", image: orig("Fernsehturm, Berlín, Alemania, 2016-04-22, DD 40-42 HDR.jpg"), latitude: 52.515, longitude: 13.3889, country: "Германия", city: "Берлин", description: "Берлинская телебашня", kind: "landmark" },
  { id: "de-munich-marienplatz", image: orig("Overview Marienplatz Rathaus Munich.jpg"), latitude: 48.1374, longitude: 11.5755, country: "Германия", city: "Мюнхен", description: "Мариаенплац", kind: "plaza" },
  { id: "de-hamburg", image: orig("Hamburg Elbphilharmonie.jpg"), latitude: 53.5413, longitude: 9.9925, country: "Германия", city: "Гамбург", description: "Эльбфилармония", kind: "landmark" },
  { id: "de-cologne", image: orig("Cologne Germany Exterior-view-of-Cologne-Cathedral-08.jpg"), latitude: 50.9413, longitude: 6.9583, country: "Германия", city: "Кёльн", description: "Кёльнский собор", kind: "landmark" },
  { id: "de-stuttgart", image: orig("Neues Schloss Schlossplatz Stuttgart 2015 01.jpg"), latitude: 48.7784, longitude: 9.1824, country: "Германия", city: "Штутгарт", description: "Новый дворец", kind: "landmark" },
  { id: "de-munich-englischer", image: orig("2012-07-17 - Landtagsprojekt München - Englischer Garten - Chinesischer-Turm - 7362.jpg"), latitude: 48.1603, longitude: 11.5812, country: "Германия", city: "Мюнхен", description: "Английский сад", kind: "nature" },
  { id: "de-berlin-potsdamer", image: orig("Potsdamer Platz Berlin.jpg"), latitude: 52.5083, longitude: 13.3755, country: "Германия", city: "Берлин", description: "Потсдамская площадь", kind: "plaza" },
  { id: "de-munich-nymphenburg", image: orig("20220410 Nymphenburg Palace 02.jpg"), latitude: 48.1567, longitude: 11.5158, country: "Германия", city: "Мюнхен", description: "Замок Нимфенбург", kind: "landmark" },
  { id: "de-freiburg", image: orig("00 2023 Freiburger Münster.jpg"), latitude: 47.999, longitude: 7.8421, country: "Германия", city: "Фрайбург", description: "Фрайбург", kind: "city" },

  // Нидерланды (6)
  { id: "nl-amsterdam-dam", image: orig("Amsterdam Dam Square.jpg"), latitude: 52.3743, longitude: 4.8956, country: "Нидерланды", city: "Амстердам", description: "Площадь Дам", kind: "plaza" },
  { id: "nl-amsterdam-rijks", image: orig("Rijksmuseum Amsterdam.jpg"), latitude: 52.3602, longitude: 4.8852, country: "Нидерланды", city: "Амстердам", description: "Риксмузеум", kind: "landmark" },
  { id: "nl-amsterdam-canals", image: orig("Canals, Amsterdam, Netherlands (333687020).jpg"), latitude: 52.3702, longitude: 4.9042, country: "Нидерланды", city: "Амстердам", description: "Каналы Амстердама", kind: "city" },
  { id: "nl-utrecht", image: orig("DomTorenUtrechtNederland.jpg"), latitude: 52.0908, longitude: 5.1214, country: "Нидерланды", city: "Утрехт", description: "Дом-турн Утрехта", kind: "landmark" },
  { id: "nl-rotterdam", image: orig("Markthal-Rotterdam.jpg"), latitude: 51.9106, longitude: 4.4777, country: "Нидерланды", city: "Роттердам", description: "Маркthal", kind: "landmark" },
  { id: "nl-haague", image: orig("Binnenhof Den Haag centrum.JPG"), latitude: 52.0705, longitude: 4.3007, country: "Нидерланды", city: "Гаага", description: "Гаага", kind: "city" },

  // Португалия (4)
  { id: "pt-lisbon-tram28", image: orig("The famous Lisbon tram line 28E (28751566927).jpg"), latitude: 38.7139, longitude: -9.1334, country: "Португалия", city: "Лиссабон", description: "Трам 28 в Лиссабоне", kind: "city" },
  { id: "pt-lisbon-belem", image: orig("Belem's Tower (3132267544).jpg"), latitude: 38.6916, longitude: -9.2169, country: "Португалия", city: "Лиссабон", description: "Белемская башня", kind: "landmark" },
  { id: "pt-lisbon-alfama", image: orig("Street Scene with Church and Festive Bunting - Alfama District - Lisbon, Portugal (4632893563).jpg"), latitude: 38.7111, longitude: -9.1297, country: "Португалия", city: "Лиссабон", description: "Дистрикт Алфамы", kind: "city" },
  { id: "pt-sintra-pena", image: orig("Pena Palace, Sintra, Portugal, 20250606 1037 0005.jpg"), latitude: 38.7876, longitude: -9.3902, country: "Португалия", city: "Синтра", description: "Дворец Пена", kind: "landmark" },

  // Греция (8)
  { id: "gr-athens-acropolis", image: orig("Attica 06-13 Athens 50 View from Philopappos - Acropolis Hill.jpg"), latitude: 37.9715, longitude: 23.7267, country: "Греция", city: "Афины", description: "Акрополис", kind: "landmark" },
  { id: "gr-santorini-oia", image: orig("Oia Santorini Greece.jpg"), latitude: 36.4618, longitude: 25.3753, country: "Греция", city: "Ойя, Санторини", description: "Ойя на Санторини", kind: "city" },
  { id: "gr-santorini-pano", image: orig("Panoramic view of Oia, Santorini island (Thira), Greece.jpg"), latitude: 36.4618, longitude: 25.3753, country: "Греция", city: "Ойя, Санторини", description: "Панорама Санторини", kind: "city" },
  { id: "gr-mykonos", image: orig("GREECE Mykonos.jpg"), latitude: 37.3932, longitude: 25.3177, country: "Греция", city: "Миконос", description: "Миконос", kind: "city" },
  { id: "gr-crete", image: orig("Crete Panorama.jpg"), latitude: 35.3387, longitude: 25.162, country: "Греция", city: "Крит", description: "Крит", kind: "nature" },
  { id: "gr-thessaloniki", image: orig("Thessaloniki, Greece, Feb 2023 - Western Walls.jpg"), latitude: 40.6401, longitude: 22.9444, country: "Греция", city: "Салоники", description: "Салоники", kind: "city" },
  { id: "gr-rhodes", image: orig("Gate of the Virgin (Rhodes) 1.jpg"), latitude: 36.4352, longitude: 28.2245, country: "Греция", city: "Родос", description: "Родос", kind: "landmark" },
  { id: "gr-parthenon", image: orig("Acropolis Parthenon Athens Greece.jpg"), latitude: 37.9715, longitude: 23.7267, country: "Греция", city: "Афины", description: "Парфенон", kind: "landmark" },

  // Центральная/Восточная Европа (34)
  { id: "cz-prague-charles", image: orig("Charles Bridge Prague.jpg"), latitude: 50.0865, longitude: 14.4115, country: "Чехия", city: "Прага", description: "Карлов мост", kind: "landmark" },
  { id: "cz-prague-oldtown", image: orig("Prague Old Town Square, Czech Republic - Oct 2010.jpg"), latitude: 50.0875, longitude: 14.4213, country: "Чехия", city: "Прага", description: "Староместская площадь", kind: "plaza" },
  { id: "cz-prague-castle", image: orig("Czech-2013-Prague-Prague Castle at dusk.jpg"), latitude: 50.0911, longitude: 14.4001, country: "Чехия", city: "Прага", description: "Пражский град", kind: "landmark" },
  { id: "cz-brno", image: orig("Cathedral of St. Peter and Paul (Brno).jpg"), latitude: 49.1951, longitude: 16.6068, country: "Чехия", city: "Брно", description: "Брно", kind: "city" },
  { id: "cz-plzen", image: orig("Plzeň - Náměstí Republiky - View ENE towards Baroque Marian column 1681 by Kristian Widman & Town Hall 1559 by Giovanni de Statia - Renaissance architecture.jpg"), latitude: 49.7384, longitude: 13.3764, country: "Чехия", city: "Пльзень", description: "Пльзень", kind: "city" },
  { id: "sk-bratislava", image: orig("Catedral de San Martín, Bratislava, Eslovaquia, 2020-02-01, DD 75-77 HDR.jpg"), latitude: 48.1494, longitude: 17.1077, country: "Словакия", city: "Братислава", description: "Костёл Святого Мартина", kind: "landmark" },
  { id: "sk-bratislava-castle", image: orig("Bratislava Castle and Cathedral 01.jpg"), latitude: 48.1436, longitude: 17.1038, country: "Словакия", city: "Братислава", description: "Братиславский замок", kind: "landmark" },
  { id: "hu-budapest-parliament", image: orig("Hungarian Parliament Budapest.jpg"), latitude: 47.5076, longitude: 19.0486, country: "Венгрия", city: "Будапешт", description: "Парламент Венгрии", kind: "landmark" },
  { id: "hu-budapest-chainbridge", image: orig("Széchenyi Chain Bridge in Budapest at night.jpg"), latitude: 47.4958, longitude: 19.0408, country: "Венгрия", city: "Будапешт", description: "Цепной мост", kind: "landmark" },
  { id: "hu-budapest-budacastle", image: orig("Buda Castle September 2013.jpg"), latitude: 47.497, longitude: 19.0413, country: "Венгрия", city: "Будапешт", description: "Будинский замок", kind: "landmark" },
  { id: "hu-debrecen", image: orig("Debrecen KCSV6 504 villamos Kossuth tér Nagytemplom.jpg"), latitude: 47.5316, longitude: 21.6273, country: "Венгрия", city: "Дебрецен", description: "Дебрецен", kind: "city" },
  { id: "ro-bucharest", image: orig("Palace of the Parliament in Bucharest (51878975552).jpg"), latitude: 44.4268, longitude: 26.0961, country: "Румыния", city: "Бухарест", description: "Дворец Народного собора", kind: "landmark" },
  { id: "ro-cluj", image: orig("City Cluj Napoca (1).jpg"), latitude: 46.7702, longitude: 23.5881, country: "Румыния", city: "Клуж-Напока", description: "Клуж-Напока", kind: "city" },
  { id: "ro-brasov", image: orig("Old town of Brasov, Romania (30368319163).jpg"), latitude: 45.6505, longitude: 25.5973, country: "Румыния", city: "Брашов", description: "Старый город Брашова", kind: "city" },
  { id: "rs-belgrade", image: orig("Kalemegdan, a04.jpg"), latitude: 44.8172, longitude: 20.4562, country: "Сербия", city: "Белград", description: "Калемегдан", kind: "landmark" },
  { id: "bg-sofia", image: orig("Alexander Nevsky Cathedral, Sofia (by Pudelek).JPG"), latitude: 42.6933, longitude: 23.3341, country: "Болгария", city: "София", description: "Храм Александра Невского", kind: "landmark" },
  { id: "bg-plovdiv", image: orig("Plovdiv Old Town.jpg"), latitude: 42.145, longitude: 24.7456, country: "Болгария", city: "Пловдив", description: "Старый город Пловдива", kind: "city" },
  { id: "pl-warsaw", image: orig("Old Town Market Square, ..2026, Warsaw, Poland.jpg"), latitude: 52.2497, longitude: 21.0077, country: "Польша", city: "Варшава", description: "Старое городо Варшавы", kind: "city" },
  { id: "pl-warsaw-palace", image: orig("Palace of Culture and Science Warsaw 1.jpg"), latitude: 52.2369, longitude: 21.0086, country: "Польша", city: "Варшава", description: "Дворец культуры и науки", kind: "landmark" },
  { id: "pl-krakow", image: orig("Krakow - Cloth Hall from Basilica - 1.jpg"), latitude: 50.0613, longitude: 19.9392, country: "Польша", city: "Краков", description: "Клячечная площадь", kind: "plaza" },
  { id: "pl-wawel", image: orig("Wawel Castle view from south. Krakow, Poland.jpg"), latitude: 50.0549, longitude: 19.9442, country: "Польша", city: "Краков", description: "Вавельский замок", kind: "landmark" },
  { id: "pl-gdansk", image: orig("Gdansk - Straganiarska gate at night.jpg"), latitude: 54.3455, longitude: 18.6477, country: "Польша", city: "Гданьск", description: "Старый город Гданьска", kind: "city" },
  { id: "pl-wroclaw", image: orig("Archikatedra św. Jana Chrzciciela we Wrocławiu.jpg"), latitude: 51.1079, longitude: 17.0385, country: "Польша", city: "Вроцлав", description: "Вроцлав", kind: "city" },
  { id: "hr-zagreb", image: orig("Zagreb (29255640143).jpg"), latitude: 45.815, longitude: 15.9819, country: "Хорватия", city: "Загреб", description: "Загреб", kind: "city" },
  { id: "hr-split", image: orig("View of Diocletian's Palace, Split 01.jpg"), latitude: 43.5081, longitude: 16.4402, country: "Хорватия", city: "Сплит", description: "Дворец Диоклетиана", kind: "landmark" },
  { id: "hr-dubrovnik", image: orig("Casco viejo de Dubrovnik, Croacia, 2014-04-14, DD 07.JPG"), latitude: 42.6507, longitude: 18.0944, country: "Хорватия", city: "Дубровник", description: "Старый город Дубровника", kind: "city" },
  { id: "hr-plitvice", image: orig("Plitvice Lakes1.jpg"), latitude: 44.8658, longitude: 15.583, country: "Хорватия", city: "Плитвице", description: "Плитвицкие озёра", kind: "nature" },
  { id: "hr-zadar", image: orig("Church of Saint Donatus, Zadar - September 2017.jpg"), latitude: 44.1197, longitude: 15.2311, country: "Хорватия", city: "Задар", description: "Задар", kind: "landmark" },
  { id: "si-bleed", image: orig("Lake Bled Slovenia.jpg"), latitude: 46.3671, longitude: 14.0919, country: "Словения", city: "Блед", description: "Озеро Блед", kind: "nature" },
  { id: "si-piran", image: orig("Piran Slovenia.jpg"), latitude: 45.6358, longitude: 13.6303, country: "Словения", city: "Пирани", description: "Пирани", kind: "city" },
  { id: "si-ljubljana", image: orig("Dragons Bridge, Ljubljana 2.jpg"), latitude: 46.0569, longitude: 14.5058, country: "Словения", city: "Любляна", description: "Старый город Любляны", kind: "city" },
  { id: "lt-vilnius", image: orig("Vilnius Old Town.jpg"), latitude: 54.6872, longitude: 25.2797, country: "Литва", city: "Вильнюс", description: "Старый город Вильнюса", kind: "city" },
  { id: "lt-trakai", image: orig("Trakai Peninsula Castle and balloon.jpg"), latitude: 54.8167, longitude: 25.0025, country: "Литва", city: "Тракай", description: "Тракайский замок", kind: "landmark" },
  { id: "lv-riga", image: orig("Latvia, Riga, Old Town, Street Scene 150502-26.jpg"), latitude: 56.9456, longitude: 24.1052, country: "Латвия", city: "Рига", description: "Старая Рига", kind: "city" },

  // Скандинавия (10)
  { id: "se-stockholm", image: orig("Panorama, Stockholm, Sweden.jpg"), latitude: 59.3293, longitude: 18.0686, country: "Швеция", city: "Стокгольм", description: "Панорама Стокгольма", kind: "city" },
  { id: "se-stockholm-gamla", image: orig("Skeppsbrokajen Gamla Stan from Skeppsholmen Stockholm 2016 01.jpg"), latitude: 59.325, longitude: 18.0669, country: "Швеция", city: "Стокгольм", description: "Гамла-Стан", kind: "city" },
  { id: "no-oslo-opera", image: orig("Oslo Opera House.jpg"), latitude: 59.9086, longitude: 10.7547, country: "Норвегия", city: "Осло", description: "Оперный театр Осло", kind: "landmark" },
  { id: "no-oslo-city", image: orig("Aker Brygge Stranden Oslo Rådhus Oslo Norway (2021.08.28).jpg"), latitude: 59.9139, longitude: 10.7522, country: "Норвегия", city: "Осло", description: "Осло", kind: "city" },
  { id: "no-bergen", image: orig("Vista de Bergen desde la montaña Fløyen, Noruega, 2019-09-08, DD 27-31 PAN.jpg"), latitude: 60.3913, longitude: 5.3221, country: "Норвегия", city: "Берген", description: "Берген с Флойена", kind: "city" },
  { id: "no-lofoten", image: orig("Lofoten, Norway (Unsplash).jpg"), latitude: 68.15, longitude: 13.6083, country: "Норвегия", city: "Лёфотены", description: "Лёфотены", kind: "nature" },
  { id: "no-tromso", image: orig("Catedral, Tromsø, Noruega, 2019-09-04, DD 61-63 HDR.jpg"), latitude: 69.6496, longitude: 18.956, country: "Норвегия", city: "Тромсё", description: "Тромсё", kind: "city" },
  { id: "dk-copenhagen-tivoli", image: orig("Tivoli Gardens Copenhagen.jpg"), latitude: 55.683, longitude: 12.6037, country: "Дания", city: "Копенгаген", description: "Тиволи", kind: "nature" },
  { id: "dk-copenhagen-mermaid", image: orig("The Little Mermaid home.jpg"), latitude: 55.6667, longitude: 12.594, country: "Дания", city: "Копенгаген", description: "Маленькая мёрзкая", kind: "landmark" },
  { id: "dk-arhus", image: orig("Aarhus Cathedral.jpg"), latitude: 56.1629, longitude: 10.2039, country: "Дания", city: "Орхус", description: "Орхус", kind: "city" },

  // Прибалтика/Балтика (4)
  { id: "ee-tallinn", image: orig("Tallinna vanalinn päikesetõusu ajal.jpg"), latitude: 59.437, longitude: 24.7536, country: "Эстония", city: "Таллин", description: "Старый город Таллина", kind: "city" },
  { id: "ee-tartu", image: orig("Old Town Street Scene - Tartu - Estonia - 01 (36132922875).jpg"), latitude: 58.378, longitude: 26.729, country: "Эстония", city: "Тарту", description: "Тарту", kind: "city" },
  { id: "fi-helsinki-cath", image: orig("Helsinki Cathedral.jpg"), latitude: 60.1713, longitude: 24.9406, country: "Финляндия", city: "Хельсинки", description: "Хельсинкский собор", kind: "landmark" },
  { id: "fi-lapland", image: orig("Winter at Jäniskoski in Inari, Lapland, Finland, 2018 March.jpg"), latitude: 69.115, longitude: 27.35, country: "Финляндия", city: "Лappland", description: "Лапландия", kind: "nature" },

  // Бельгия/Люксембург (4)
  { id: "be-brussels-atome", image: orig("Atomium Brussels.jpg"), latitude: 50.8332, longitude: 4.3653, country: "Бельгия", city: "Брюссель", description: "Атомиум", kind: "landmark" },
  { id: "be-brussels-grandplace", image: orig("Grand-Place, Brussels - panorama, June 2018.jpg"), latitude: 50.8464, longitude: 4.3517, country: "Бельгия", city: "Брюссель", description: "Гранд-Плас Брюсселя", kind: "plaza" },
  { id: "be-bruges", image: orig("Belfry at Grand Market Square at rainy day dusk Bruges Belgium.jpg"), latitude: 51.2083, longitude: 3.2247, country: "Бельгия", city: "Брюгге", description: "Рыночная площадь Брюгге", kind: "plaza" },
  { id: "be-antwerp", image: orig("Antwerp Belgium Tower-of-Onze-Lieve-Vrouwekathedraal-01.jpg"), latitude: 51.2194, longitude: 4.4025, country: "Бельгия", city: "Антверпен", description: "Антверпен", kind: "city" },

  // Швейцария (6)
  { id: "ch-zurich-grossmunster", image: orig("Grossmünster Zurich.jpg"), latitude: 47.3693, longitude: 8.5382, country: "Швейцария", city: "Цюрих", description: "Гроссмюнстер", kind: "landmark" },
  { id: "ch-zurich-pano", image: orig("Zurich from Felsenegg blue hour 20210126.jpg"), latitude: 47.3769, longitude: 8.5417, country: "Швейцария", city: "Цюрих", description: "Цюрих", kind: "city" },
  { id: "ch-lucerne", image: orig("Lucerne Chapel Bridge.jpg"), latitude: 47.0502, longitude: 8.3093, country: "Швейцария", city: "Люцерн", description: "Капельмост", kind: "landmark" },
  { id: "ch-geneva", image: orig("Jet d'eau, Geneva.jpg"), latitude: 46.2044, longitude: 6.1432, country: "Швейцария", city: "Женева", description: "Женева, фонтан", kind: "landmark" },
  { id: "ch-interlaken", image: orig("River Aare, Interlaken, Switzerland (Ank Kumar) 01.jpg"), latitude: 46.6863, longitude: 7.8632, country: "Швейцария", city: "Интерлакен", description: "Интерлакен, река Аара", kind: "nature" },
  { id: "ch-bern", image: orig("Bern Parliament Plaza Flagged Wide 2019-09-13 23-11.jpg"), latitude: 46.9481, longitude: 7.4474, country: "Швейцария", city: "Берн", description: "Берн", kind: "city" },

  // Австрия (4)
  { id: "at-vienna-prater", image: orig("Prater Vienna.jpg"), latitude: 48.1928, longitude: 16.4167, country: "Австрия", city: "Вена", description: "Парк Пратер", kind: "nature" },
  { id: "at-vienna-stephansdom", image: orig("Wien - Stephansdom (1).JPG"), latitude: 48.2082, longitude: 16.3738, country: "Австрия", city: "Вена", description: "Штефансдом", kind: "landmark" },
  { id: "at-vienna-hofburg", image: orig("Hofburg Burgplatz.jpg"), latitude: 48.2049, longitude: 16.3806, country: "Австрия", city: "Вена", description: "Хофбург", kind: "landmark" },
  { id: "at-innsbruck", image: orig("Aerial view of Innsbruck 02.jpg"), latitude: 47.2692, longitude: 11.4041, country: "Австрия", city: "Инсбрук", description: "Инсбрук", kind: "city" },

  // Ирландия (4)
  { id: "ie-dublin-dock", image: orig("Dublin Docklands.jpg"), latitude: 53.3441, longitude: -6.2455, country: "Ирландия", city: "Дублин", description: "Доклендс", kind: "city" },
  { id: "ie-dublin-oconn", image: orig("O'Connell Street Dublin.jpg"), latitude: 53.3485, longitude: -6.26, country: "Ирландия", city: "Дублин", description: "Улица О'Коннелл", kind: "city" },
  { id: "ie-cliffsofmoher", image: orig("Cliffs of Moher 20160818-1.jpg"), latitude: 52.9685, longitude: -9.4275, country: "Ирландия", city: "Клиффы Моэра", description: "Клиффы Моэра", kind: "nature" },
  { id: "ie-galway", image: orig("Eyre Square, Galway, Ireland 15 May 2022.jpg"), latitude: 53.2706, longitude: -9.0554, country: "Ирландия", city: "Голуэй", description: "Голуэй", kind: "city" },

  // Мальта/Кипр (4)
  { id: "mt-valletta", image: orig("Valletta Malta.jpg"), latitude: 35.8998, longitude: 14.5147, country: "Мальта", city: "Валлетта", description: "Валлетта", kind: "city" },
  { id: "mt-mdina", image: orig("Mdina Malta.jpg"), latitude: 35.8858, longitude: 14.4747, country: "Мальта", city: "Мдина", description: "Мдина", kind: "city" },
  { id: "cy-nicosia", image: orig("Nicosia Skyline from old town.jpg"), latitude: 35.1675, longitude: 33.377, country: "Кипр", city: "Никосия", description: "Никосия", kind: "city" },
  { id: "cy-larnaca", image: orig("2022 03 Larnaca Saint Lazarus Church.jpg"), latitude: 34.9167, longitude: 33.6167, country: "Кипр", city: "Ларнака", description: "Ларнака", kind: "city" },

  // Исландия/Балканы (4)
  { id: "is-reykjavik", image: orig("Old Harbour of Reykjavik (5897420133).jpg"), latitude: 64.1466, longitude: -21.9426, country: "Исландия", city: "Рейкьявик", description: "Гавань Рейкьявика", kind: "city" },
  { id: "is-blue-lagoon", image: orig("Blue Lagoon Geothermal pool 03.jpg"), latitude: 63.8803, longitude: -22.4495, country: "Исландия", city: "Блу-Лагуна", description: "Голубая лагуна", kind: "nature" },
  { id: "me-kotor", image: orig("Kotor and Boka kotorska - view from city wall.jpg"), latitude: 42.4211, longitude: 18.7781, country: "Чёрногория", city: "Котор", description: "Которский залив", kind: "nature" },
  { id: "mk-skopje", image: orig("Statue of Alexander the Great - Skopje - Macedonia.jpg"), latitude: 41.9981, longitude: 21.4254, country: "Северная Македония", city: "Скопье", description: "Скопье", kind: "city" },

  // ==================== АЗИЯ (50) ====================
  // Япония (10)
  { id: "jp-tokyo-skytree", image: orig("Tokyo Skytree night.jpg"), latitude: 35.6586, longitude: 139.7454, country: "Япония", city: "Токио", description: "Токио Скайтрей", kind: "landmark" },
  { id: "jp-tokyo-tower", image: orig("Tokyo Tower, Minato City.jpg"), latitude: 35.6586, longitude: 139.7454, country: "Япония", city: "Токио", description: "Токио-Тар", kind: "landmark" },
  { id: "jp-tokyo-shibuya", image: orig("Tokyo Shibuya Scramble Crossing 2018-10-09.jpg"), latitude: 35.6595, longitude: 139.7004, country: "Япония", city: "Токио", description: "Перекрёсток Сибуя", kind: "city" },
  { id: "jp-kyoto-fushimi", image: orig("Torii path with lantern at Fushimi Inari Taisha Shrine, Kyoto, Japan.jpg"), latitude: 34.9671, longitude: 135.7727, country: "Япония", city: "Киото", description: "ФуСИМИ Инари", kind: "landmark" },
  { id: "jp-kyoto-bamboo", image: orig("Bamboo Grove, Arashiyama, Kyoto, Japan.jpg"), latitude: 35.017, longitude: 135.6723, country: "Япония", city: "Киото", description: "Бамбуковая роща Арасияма", kind: "nature" },
  { id: "jp-kyoto-kinkakuji", image: orig("Golden Pavilion Kinkaku-ji 2024.jpg"), latitude: 35.0394, longitude: 135.7292, country: "Япония", city: "Киото", description: "Кинкаку-дзи (Золотой павильон)", kind: "landmark" },
  { id: "jp-osaka-castle", image: orig("Osaka Castle.jpg"), latitude: 34.687, longitude: 135.5262, country: "Япония", city: "Осака", description: "Осака-замок", kind: "landmark" },
  { id: "jp-fuji", image: orig("Mount Fuji from Mount Aino.jpg"), latitude: 35.3606, longitude: 138.7274, country: "Япония", city: "Фудзи", description: "Гора Фудзи", kind: "nature" },
  { id: "jp-hokkaido", image: orig("140829 Ichiko of Shiretoko Goko Lakes Hokkaido Japan04s3.jpg"), latitude: 43.1998, longitude: 145.5625, country: "Япония", city: "Хоккайдо", description: "Озёра Сиретко, Хоккайдо", kind: "nature" },
  { id: "jp-nara", image: orig("Sika Deer in Nara, Japan, 20240819 1546 4782.jpg"), latitude: 34.6851, longitude: 135.8416, country: "Япония", city: "Нара", description: "Олени в Нарe", kind: "nature" },

  // Китай (6)
  { id: "cn-greatwall-mutianyu", image: orig("The Mutianyu section of the Great Wall of China.jpg"), latitude: 40.4319, longitude: 116.5704, country: "Китай", city: "Великая Китайская стена", description: "Мутянью, Великая стена", kind: "landmark" },
  { id: "cn-greatwall-badaling", image: orig("Badaling China Great-Wall-of-China-01.jpg"), latitude: 40.3599, longitude: 116.0181, country: "Китай", city: "Бадялин", description: "Бадялин, Великая стена", kind: "landmark" },
  { id: "cn-beijing-forbidden", image: orig("Sunset of the Forbidden City 2006.JPG"), latitude: 39.9163, longitude: 116.3972, country: "Китай", city: "Пекин", description: "Запретный город", kind: "landmark" },
  { id: "cn-shanghai-bund", image: orig("Pudong Shanghai November 2017 panorama.jpg"), latitude: 31.2397, longitude: 121.4998, country: "Китай", city: "Шанхай", description: "Панорама Шанхая", kind: "city" },
  { id: "cn-shanghai-pudong", image: orig("Pudong Shanghai November 2017.jpg"), latitude: 31.2397, longitude: 121.4998, country: "Китай", city: "Шанхай", description: "Пудун", kind: "city" },
  { id: "cn-xian", image: orig("Xi'an city walls.jpg"), latitude: 34.3416, longitude: 108.9398, country: "Китай", city: "Сиань", description: "Сиань", kind: "city" },

  // Индия (8)
  { id: "in-agra-taj", image: orig("Taj Mahal Agra.jpg"), latitude: 27.1751, longitude: 78.0421, country: "Индия", city: "Агра", description: "Тадж-Махал", kind: "landmark" },
  { id: "in-delhi-redfort", image: orig("Red Fort Delhi.jpg"), latitude: 28.6562, longitude: 77.241, country: "Индия", city: "Дели", description: "Красная крепость", kind: "landmark" },
  { id: "in-mumbai-gateway", image: orig("Gateway of India Mumbai.jpg"), latitude: 18.922, longitude: 72.8337, country: "Индия", city: "Мумбаи", description: "Ворота Индии", kind: "landmark" },
  { id: "in-mumbai-marine", image: orig("Marine Drive Mumbai.jpg"), latitude: 18.942, longitude: 72.8225, country: "Индия", city: "Мумбаи", description: "Морин Драйв", kind: "city" },
  { id: "in-jodhpur", image: orig("20191210 Mehrangarh Fort, Jodhpur 1016 7834.jpg"), latitude: 26.2887, longitude: 73.0243, country: "Индия", city: "Джодпур", description: "Крепость Мерангарх", kind: "landmark" },
  { id: "in-varanasi", image: orig("Ghats of Varanasi During Night 23.jpg"), latitude: 25.3109, longitude: 83.0095, country: "Индия", city: "Варанаси", description: "Гхаты Варанаси", kind: "city" },
  { id: "in-goa", image: orig("Vagator Beach, Goa, India, Palms.jpg"), latitude: 15.2993, longitude: 74.124, country: "Индия", city: "Гоа", description: "Пляж Гоа", kind: "nature" },
  { id: "in-kerala", image: orig("Alleppey Boat houses.jpg"), latitude: 10.8505, longitude: 76.2655, country: "Индия", city: "Керала", description: "Бэквотеры Керы", kind: "nature" },

  // Корея (4)
  { id: "kr-seoul-gyeongbok", image: orig("Front view of the Imperial Throne Hall Geunjeongjeon at Gyeongbokgung Palace with blue sky in Seoul.jpg"), latitude: 37.5783, longitude: 126.9984, country: "Корея (Южная)", city: "Сеул", description: "Дворец Кёнбоккун", kind: "landmark" },
  { id: "kr-seoul-skyline", image: orig("Namsan Tower sunset, Seoul.jpg"), latitude: 37.5665, longitude: 126.978, country: "Корея (Южная)", city: "Сеул", description: "Сеул, панорама", kind: "city" },
  { id: "kr-busan", image: orig("Haeundae Beach in Busan.jpg"), latitude: 35.1692, longitude: 129.1613, country: "Корея (Южная)", city: "Пусан", description: "Пляж Хэундэ", kind: "nature" },
  { id: "kr-jeju", image: orig("Jeju Island.jpg"), latitude: 33.4996, longitude: 126.5312, country: "Корея (Южная)", city: "Чеджу", description: "Остров Чеджу", kind: "nature" },

  // Юго-Восточная Азия (10)
  { id: "th-bangkok-grandpalace", image: orig("Grand Palace Bangkok.jpg"), latitude: 13.75, longitude: 100.4913, country: "Таиланд", city: "Бангкок", description: "Королёвский дворец", kind: "landmark" },
  { id: "th-bangkok-emerald", image: orig("Wat Phra Kaew Bangkok.jpg"), latitude: 13.7499, longitude: 100.4914, country: "Таиланд", city: "Бангкок", description: "Храм Изумрудного Будды", kind: "landmark" },
  { id: "th-phuket", image: orig("Banana beach Phuket 2017 - 02.jpg"), latitude: 7.8804, longitude: 98.3959, country: "Таиланд", city: "Пхукет", description: "Пхукет", kind: "nature" },
  { id: "id-bali-rice", image: orig("Bali rice terraces.jpg"), latitude: -8.5069, longitude: 115.2625, country: "Индонезия", city: "Бали", description: "Рисовые террасы Бали", kind: "nature" },
  { id: "id-bali-uluwatu", image: orig("Kuta Bali Indonesia Pura-Luhur-Uluwatu-03.jpg"), latitude: -8.8292, longitude: 115.0819, country: "Индонезия", city: "Улувату, Бали", description: "Храм Улувату", kind: "landmark" },
  { id: "id-bali-kuta", image: orig("Kuta Beach, Bali, 20220825 1706 0864.jpg"), latitude: -8.7143, longitude: 115.1668, country: "Индонезия", city: "Кута, Бали", description: "Пляж Кута", kind: "nature" },
  { id: "vn-hanoi", image: orig("Hoan Kiem Lake, Hanoi (37781151024).jpg"), latitude: 21.0285, longitude: 105.8542, country: "Вьетнам", city: "Ханой", description: "Озеро Хуан Киэм", kind: "landmark" },
  { id: "vn-hoian", image: orig("Japanese Bridge in Hoi An.jpg"), latitude: 15.8801, longitude: 108.338, country: "Вьетнам", city: "Хойан", description: "Старый город Хойан", kind: "city" },
  { id: "my-kualalumpur", image: orig("Kuala Lumpur skyline.jpg"), latitude: 3.139, longitude: 101.6869, country: "Малайзия", city: "Куала-Лумпур", description: "Куала-Лумпур, панорама", kind: "city" },
  { id: "my-langkawi", image: orig("Langkawi 20230317.jpg"), latitude: 6.3519, longitude: 99.808, country: "Малайзия", city: "Лангкави", description: "Лангкави", kind: "nature" },

  // Сингапур/Камбоджа/Лаос (4)
  { id: "sg-singapore-mbs", image: orig("Marina Bay Sands Singapore.jpg"), latitude: 1.2839, longitude: 103.8607, country: "Сингапур", city: "Сингапур", description: "Марина Бей Сэндс", kind: "landmark" },
  { id: "sg-singapore-gardens", image: orig("Singapore (SG), Gardens By The Bay -- 2019 -- 4725.jpg"), latitude: 1.2816, longitude: 103.8636, country: "Сингапур", city: "Сингапур", description: "Гарденс Бэй", kind: "landmark" },
  { id: "kh-angkor", image: orig("Angkor Wat with its reflection (cropped).jpg"), latitude: 13.4125, longitude: 103.867, country: "Камбоджа", city: "Ангкор-Ват", description: "Ангкор-Ват", kind: "landmark" },
  { id: "la-luangprabang", image: orig("Pirogue and boat on the Mekong with colorful sky at sunset in Luang Prabang Laos.jpg"), latitude: 19.8947, longitude: 102.1387, country: "Лаос", city: "Луанг-Прабанг", description: "Луанг-Прабанг", kind: "city" },

  // Ближний Восток (12)
  { id: "tr-istanbul-blue", image: orig("Blue Mosque Istanbul.jpg"), latitude: 41.0054, longitude: 28.9768, country: "Турция", city: "Стамбул", description: "Синяя мечеть", kind: "landmark" },
  { id: "tr-istanbul-hagia", image: orig("Hagia Sophia Mars 2013.jpg"), latitude: 41.0086, longitude: 28.9802, country: "Турция", city: "Стамбул", description: "Собор Святой Софии", kind: "landmark" },
  { id: "tr-istanbul-bosphorus", image: orig("Bosphorus Bridge, Istanbul - Turkey.jpg"), latitude: 41.1802, longitude: 29.0677, country: "Турция", city: "Стамбул", description: "Босфор", kind: "nature" },
  { id: "tr-cappadocia", image: orig("Hot air balloon ride at sunrise in Cappadocia.JPG"), latitude: 38.6431, longitude: 34.8289, country: "Турция", city: "Каппадокия", description: "Шары в Каппадокии", kind: "nature" },
  { id: "tr-pamukkale", image: orig("TR Pamukkale White Terraces asv2020-02 img16.jpg"), latitude: 37.9204, longitude: 29.1212, country: "Турция", city: "Памуккале", description: "Памуккале", kind: "nature" },
  { id: "tr-antalya", image: orig("Kaleiçi Old Town, Antalya, Turkey 26 Feb 2022.jpg"), latitude: 36.8969, longitude: 30.7133, country: "Турция", city: "Анталья", description: "Анталья", kind: "city" },
  { id: "tr-izmir", image: orig("Izmir Turkey.jpg"), latitude: 38.4237, longitude: 27.1428, country: "Турция", city: "Измир", description: "Измир", kind: "city" },
  { id: "ae-dubai-skyline", image: orig("Dubai Skyline mit Burj Khalifa (18241030269).jpg"), latitude: 25.2048, longitude: 55.2708, country: "ОАЭ", city: "Дубай", description: "Дубай, Бурдж-Халифа", kind: "city" },
  { id: "ae-dubai-marina", image: orig("UAE Dubai Marina img1 asv2018-01.jpg"), latitude: 25.0805, longitude: 55.1403, country: "ОАЭ", city: "Дубай", description: "Дубай Марина", kind: "city" },
  { id: "ae-abudhabi-city", image: orig("Abu Dhabi city.jpg"), latitude: 24.4539, longitude: 54.3773, country: "ОАЭ", city: "Абу-Даби", description: "Абу-Даби", kind: "city" },
  { id: "sa-jeddah-corniche", image: orig("Jeddah Corniche.jpg"), latitude: 21.5433, longitude: 39.1728, country: "Саудовская Аравия", city: "Джидда", description: "Джидда, Кординш", kind: "city" },
  { id: "qa-doha", image: orig("Doha skyline in the morning (12544910974).jpg"), latitude: 25.2854, longitude: 51.531, country: "Катар", city: "Доха", description: "Доха", kind: "city" },

  // Южная/Центральная Азия (2)
  { id: "uz-samarkand", image: orig("Registan Samarkand Uzbekistan.JPG"), latitude: 39.6547, longitude: 66.9758, country: "Узбекистан", city: "Самарканд", description: "Регистан", kind: "landmark" },
  { id: "mn-ulaanbaatar", image: orig("2024-10-18 View of Ulaanbaatar.jpg"), latitude: 47.8864, longitude: 106.9057, country: "Монголия", city: "Улан-Батор", description: "Улан-Батор", kind: "city" },

  // ==================== АМЕРИКИ (42) ====================
  // США (20)
  { id: "us-nyc-liberty", image: orig("Statue of Liberty, NY.jpg"), latitude: 40.6892, longitude: -74.0445, country: "США", city: "Нью-Йорк", description: "Статуя Свободы", kind: "landmark" },
  { id: "us-nyc-timessquare", image: orig("New York City (New York, USA), Times Square-Duffy Square -- 2012 -- 6380.jpg"), latitude: 40.758, longitude: -73.9855, country: "США", city: "Нью-Йорк", description: "Таймс-сквер", kind: "city" },
  { id: "us-nyc-brooklyn", image: orig("Brooklyn Bridge at Night.jpg"), latitude: 40.7061, longitude: -73.9969, country: "США", city: "Нью-Йорк", description: "Бруклинский мост", kind: "landmark" },
  { id: "us-nyc-centralpark", image: orig("Central Park New York October 2016 panorama 1.jpg"), latitude: 40.7712, longitude: -73.9742, country: "США", city: "Нью-Йорк", description: "Центральный парк", kind: "nature" },
  { id: "us-nyc-manhattan", image: orig("Lower Manhattan from Jersey City November 2014 panorama 3.jpg"), latitude: 40.7128, longitude: -74.006, country: "США", city: "Нью-Йорк", description: "Нижний Манхэттен", kind: "city" },
  { id: "us-sf-goldengate", image: orig("Golden Gate Bridge SF.jpg"), latitude: 37.8199, longitude: -122.4783, country: "США", city: "Сан-Франциско", description: "Золотые ворота", kind: "landmark" },
  { id: "us-sf-union", image: orig("Union Square San Francisco.jpg"), latitude: 37.788, longitude: -122.4075, country: "США", city: "Сан-Франциско", description: "Юнион-сквер", kind: "plaza" },
  { id: "us-la-hollywood", image: orig("Hollywood Sign.jpg"), latitude: 34.1341, longitude: -118.3215, country: "США", city: "Голливуд", description: "Голливудский знак", kind: "landmark" },
  { id: "us-chicago", image: orig("Chicago Skyline Hi-Res.jpg"), latitude: 41.8781, longitude: -87.6298, country: "США", city: "Чикаго", description: "Панорама Чикаго", kind: "city" },
  { id: "us-lasvegas", image: orig("Las Vegas (Nevada, USA), The Strip -- 2012 -- 6232.jpg"), latitude: 36.1147, longitude: -115.1728, country: "США", city: "Лас-Вегас", description: "Стрип", kind: "city" },
  { id: "us-miami", image: orig("Miami skyline (1).jpg"), latitude: 25.7617, longitude: -80.1918, country: "США", city: "Майами", description: "Майами", kind: "city" },
  { id: "us-grandcanyon", image: orig("Grand Canyon South Rim at Sunset.jpg"), latitude: 36.1069, longitude: -112.1129, country: "США", city: "Гранд-Каньон", description: "Гранд-Каньон", kind: "nature" },
  { id: "us-yellowstone", image: orig("Yellowstone National Park (WY, USA), Old Faithful Geyser -- 2022 -- 2599.jpg"), latitude: 44.46, longitude: -110.8278, country: "США", city: "Йеллоустон", description: "Олд Фейтфул", kind: "nature" },
  { id: "us-niagara", image: orig("Niagara-Falls-Horseshoe-Falls-view.jpg"), latitude: 43.086, longitude: -79.0638, country: "США", city: "Ниагара", description: "Ниагарский водопад", kind: "nature" },
  { id: "us-dc-capitol", image: orig("US Capitol west side.JPG"), latitude: 38.8899, longitude: -77.0091, country: "США", city: "Вашингтон", description: "Капитолий", kind: "landmark" },
  { id: "us-dc-whitehouse", image: orig("WhiteHouseSouthFacade.JPG"), latitude: 38.8977, longitude: -77.0365, country: "США", city: "Вашингтон", description: "Белый дом", kind: "landmark" },
  { id: "us-dc-lincoln", image: orig("Exterior of the Lincoln Memorial (north side) 20240601.jpg"), latitude: 38.8893, longitude: -77.0502, country: "США", city: "Вашингтон", description: "Мемориал Линкольна", kind: "landmark" },
  { id: "us-boston", image: orig("Boston Freedom Trail.jpg"), latitude: 42.3601, longitude: -71.0589, country: "США", city: "Бостон", description: "Фридом-Трейл", kind: "city" },
  { id: "us-seattle", image: orig("Seattle (WA, USA), Space Needle -- 2022 -- 1523.jpg"), latitude: 47.6205, longitude: -122.3493, country: "США", city: "Сиэтл", description: "Спейс-Нидл", kind: "landmark" },
  { id: "us-denver", image: orig("Denver skyline.jpg"), latitude: 39.7392, longitude: -104.9903, country: "США", city: "Денвер", description: "Денвер", kind: "city" },

  // Канада (8)
  { id: "ca-toronto-cntower", image: orig("CN Tower, Toronto, Canada (Unsplash DJ kOgH5u0o).jpg"), latitude: 43.6426, longitude: -79.3871, country: "Канада", city: "Торонто", description: "Канэда-тауэр", kind: "landmark" },
  { id: "ca-toronto-skyline", image: orig("Sunset Toronto Skyline Panorama Crop from Snake Island.jpg"), latitude: 43.6532, longitude: -79.3832, country: "Канада", city: "Торонто", description: "Торонто, панорама", kind: "city" },
  { id: "ca-vancouver", image: orig("Vancouver Skyline 04.jpg"), latitude: 49.2827, longitude: -123.1207, country: "Канада", city: "Ванкувер", description: "Ванкувер", kind: "city" },
  { id: "ca-montreal", image: orig("Old Port of Montreal-2017.jpg"), latitude: 45.5017, longitude: -73.557, country: "Канада", city: "Монреаль", description: "Старый порт Монреаля", kind: "city" },
  { id: "ca-ottawa", image: orig("Parliament Hill Ottawa Ontario Canada.jpg"), latitude: 45.4165, longitude: -75.7044, country: "Канада", city: "Оттава", description: "Парламентский холм", kind: "landmark" },
  { id: "ca-louise", image: orig("Banff National Park (AB, Canada), Lake Louise -- 2022 -- 2197.jpg"), latitude: 51.4254, longitude: -116.1773, country: "Канада", city: "Озеро Луиза", description: "Озеро Луиза, Банфф", kind: "nature" },
  { id: "ca-quebec", image: orig("Older Part Of Quebec City (39422966225).jpg"), latitude: 46.8139, longitude: -71.2082, country: "Канада", city: "Квебек", description: "Старый город Квебека", kind: "city" },
  { id: "ca-halifax", image: orig("2022-08-15 01 Wide angle view of Halifax skyline, Nova Scotia, Canada.jpg"), latitude: 44.6488, longitude: -63.5752, country: "Канада", city: "Галифакс", description: "Галифакс", kind: "city" },

  // Мексика (4)
  { id: "mx-cd-mx-zocalo", image: orig("Mexico City Zocalo.jpg"), latitude: 19.4326, longitude: -99.1332, country: "Мексика", city: "Мехико", description: "Сокало", kind: "plaza" },
  { id: "mx-cd-mx-cathedral", image: orig("Mexico City Cathedral.jpg"), latitude: 19.433, longitude: -99.1308, country: "Мексика", city: "Мехико", description: "Собор Мехико", kind: "landmark" },
  { id: "mx-cd-mx-angel", image: orig("Angel de la Independencia.jpg"), latitude: 19.427, longitude: -99.1677, country: "Мексика", city: "Мехико", description: "Анхель де ла Индепенденсия", kind: "landmark" },
  { id: "mx-cancun", image: orig("Cancun Beach.jpg"), latitude: 21.1619, longitude: -86.794, country: "Мексика", city: "Канкун", description: "Канкун", kind: "nature" },

  // Южная Америка (10)
  { id: "br-rio-risto", image: orig("Christ the Redeemer - Cristo Redentor.jpg"), latitude: -22.9519, longitude: -43.2105, country: "Бразилия", city: "Рио-де-Жанейро", description: "Христос-Искупитель", kind: "landmark" },
  { id: "ar-buenosaires-obelisco", image: orig("Buenos Aires Obelisco.jpg"), latitude: -34.6037, longitude: -58.3816, country: "Аргентина", city: "Буэнос-Айрес", description: "Обелиск", kind: "landmark" },
  { id: "ar-buenosaires-laboca", image: orig("Calle Caminito in La Boca, Buenos Aires-1.JPG"), latitude: -34.6469, longitude: -58.3752, country: "Аргентина", city: "Буэнос-Айрес", description: "Ла-Бока", kind: "city" },
  { id: "pe-machupicchu", image: orig("Machu Picchu, Perú, 2015-07-30, DD 47.JPG"), latitude: -13.1631, longitude: -72.545, country: "Перу", city: "Мачу-Пикчу", description: "Мачу-Пикчу", kind: "landmark" },
  { id: "pe-lima", image: orig("Lima Plaza Mayor.jpg"), latitude: -12.0464, longitude: -77.0428, country: "Перу", city: "Лима", description: "Пласа-Майор Лимы", kind: "plaza" },
  { id: "pe-cusco", image: orig("Cusco Plaza de Armas.jpg"), latitude: -13.516, longitude: -71.9787, country: "Перу", city: "Куско", description: "Пласа-де-Армас Куско", kind: "plaza" },
  { id: "cl-santiago", image: orig("Santiago de Chile, Desde Cerro San Cristóbal (cropped).jpg"), latitude: -33.4489, longitude: -70.6693, country: "Чили", city: "Сантьяго", description: "Сантьяго, панорама", kind: "city" },
  { id: "cl-valparaiso", image: orig("In Valparaiso - panoramio.jpg"), latitude: -33.0472, longitude: -71.6127, country: "Чили", city: "Вальпараисо", description: "Вальпараисо", kind: "city" },
  { id: "ec-quito", image: orig("Quito Plaza Grande.jpg"), latitude: -0.2235, longitude: -78.5187, country: "Эквадор", city: "Кито", description: "Пласа-Гранде Кито", kind: "plaza" },
  { id: "co-cartagena", image: orig("City walls of Cartagena 01.jpg"), latitude: 10.4236, longitude: -75.5375, country: "Колумбия", city: "Картахена", description: "Картахена", kind: "city" },

  // ==================== АФРИКА (24) ====================
  // Египет (5)
  { id: "eg-giza-pyramids", image: orig("Giza pyramid complex - 360.jpg"), latitude: 29.9792, longitude: 31.1342, country: "Египет", city: "Гиза", description: "Пирамиды Гизы", kind: "landmark" },
  { id: "eg-giza-sphinx", image: orig("Great Sphinx of Giza.jpg"), latitude: 29.9753, longitude: 31.1376, country: "Египет", city: "Гиза", description: "Большой сфинкс", kind: "landmark" },
  { id: "eg-cairo", image: orig("Cairo Skyline (2020).jpg"), latitude: 30.0444, longitude: 31.2357, country: "Египет", city: "Каир", description: "Каир", kind: "city" },
  { id: "eg-luxor", image: orig("Templo de Karnak, Luxor, Egipto, 2022-04-03, DD 144.jpg"), latitude: 25.7188, longitude: 32.6573, country: "Египет", city: "Луксор", description: "Храм Карнак", kind: "landmark" },
  { id: "eg-alexandria", image: orig("Alexandria egypt.jpg"), latitude: 31.2001, longitude: 29.9187, country: "Египет", city: "Александрия", description: "Александрия", kind: "city" },

  // Магриб (6)
  { id: "ma-marrakech-riad", image: orig("Marrakech riad.jpg"), latitude: 31.6295, longitude: -7.9811, country: "Марокко", city: "Марракеш", description: "Риад Марракеша", kind: "city" },
  { id: "ma-marrakech-koutoubia", image: orig("Kutubiyya Mosque, Marrakesh, Morocco, 20250124 1834 7027.jpg"), latitude: 31.6237, longitude: -7.9938, country: "Марокко", city: "Марракеш", description: "Мечеть Кутубия", kind: "landmark" },
  { id: "ma-casablanca", image: orig("Sunshine on mosque Hassan II in Casablanca, Morocco - Flickr - Milamber's portfolio.jpg"), latitude: 33.6086, longitude: -7.6329, country: "Марокко", city: "Касабланка", description: "Мечеть Хасана II", kind: "landmark" },
  { id: "ma-fez", image: orig("Medina of Fes, Marocco.jpg"), latitude: 34.0331, longitude: -5.0003, country: "Марокко", city: "Фес", description: "Медина Феса", kind: "city" },
  { id: "ma-sahara", image: orig("Erg Chebbi sunset.jpg"), latitude: 31.15, longitude: -3.9833, country: "Марокко", city: "Эрг-Шебби", description: "Сасара, Эрг-Шебби", kind: "nature" },
  { id: "tn-sidibousaid", image: orig("Tunisie Sidi Bou Said 10.jpg"), latitude: 36.8026, longitude: 10.3408, country: "Тунис", city: "Сиди-Бу-Саид", description: "Сиди-Бу-Саид", kind: "city" },

  // Африка к югу от Сахары (8)
  { id: "za-capetown-table", image: orig("Table Mountain Cape Town.jpg"), latitude: -33.9628, longitude: 18.4092, country: "ЮАР", city: "Кейптаун", description: "Столовая гора", kind: "nature" },
  { id: "za-capetown-city", image: orig("Cape Town, South Africa - panoramic view.jpg"), latitude: -33.9249, longitude: 18.4241, country: "ЮАР", city: "Кейптаун", description: "Кейптаун", kind: "city" },
  { id: "za-johannesburg", image: orig("Johannesburg skyline.jpg"), latitude: -26.2041, longitude: 28.0473, country: "ЮАР", city: "Йоханнесбург", description: "Йоханнесбург", kind: "city" },
  { id: "ke-nairobi", image: orig("Nairobi city.jpg"), latitude: -1.2921, longitude: 36.8219, country: "Кения", city: "Найроби", description: "Найроби", kind: "city" },
  { id: "ke-mara", image: orig("Wildebeest Migration Masai mara.jpg"), latitude: -1.4927, longitude: 35.1625, country: "Кения", city: "Масаи-Мара", description: "Масаи-Мара", kind: "nature" },
  { id: "tz-kilimanjaro", image: orig("Clouds Over Mount Kilimanjaro (Unsplash).jpg"), latitude: -3.0674, longitude: 37.3556, country: "Танзания", city: "Килиманджаро", description: "Килиманджаро", kind: "nature" },
  { id: "ng-lagos", image: orig("Busy city of Lagos-Nigeria.jpg"), latitude: 6.5244, longitude: 3.3792, country: "Нигерия", city: "Лагос", description: "Лагос", kind: "city" },
  { id: "gh-accra", image: orig("Accra Skyline - Ghana.jpg"), latitude: 5.6037, longitude: -0.187, country: "Гана", city: "Аккра", description: "Аккра", kind: "city" },

  // Восточная/Южная Африка (5)
  { id: "et-addis", image: orig("Addis Ababa City in Ethiopia.jpg"), latitude: 9.0222, longitude: 38.7468, country: "Эфиопия", city: "Аддис-Абеба", description: "Аддис-Абеба", kind: "city" },
  { id: "mg-antananarivo", image: orig("Lake Anosy, Central Antananarivo, Capital of Madagascar, Photo by Sascha Grabow.jpg"), latitude: -18.8792, longitude: 47.5079, country: "Мадагаскар", city: "Антананариву", description: "Антананариву", kind: "city" },
  { id: "mu-portlouis", image: orig("Port Louis harbour, Mauritius from the mountain Le Pouce.jpg"), latitude: -20.1578, longitude: 57.5011, country: "Маврикий", city: "Порт-Луи", description: "Порт-Луи", kind: "city" },
  { id: "zm-victoriafalls", image: orig("Victoria Falls Zambia.jpg"), latitude: -17.924, longitude: 25.8591, country: "Замбия", city: "Виктория-Фолс", description: "Виктория-Фолс", kind: "nature" },
  { id: "mw-lilongwe", image: orig("Lilongwe, Malawi - panoramio.jpg"), latitude: -13.9896, longitude: 33.7823, country: "Малави", city: "Лилонгве", description: "Лилонгве", kind: "city" },

  // ==================== ОКЕАНИЯ (16) ====================
  // Австралия (10)
  { id: "au-sydney-opera", image: orig("Sydney Opera House and Harbour Bridge Dusk (3) 2019-06-21.jpg"), latitude: -33.8568, longitude: 151.2153, country: "Австралия", city: "Сидней", description: "Оперный театр Сиднея", kind: "landmark" },
  { id: "au-sydney-harbour", image: orig("Sydney Harbour Bridge from Circular Quay.jpg"), latitude: -33.8523, longitude: 151.2108, country: "Австралия", city: "Сидней", description: "Гавань-Бридж", kind: "landmark" },
  { id: "au-melbourne", image: orig("Melbourne City Skyline From Northcote.JPG"), latitude: -37.8136, longitude: 144.9631, country: "Австралия", city: "Мельбурн", description: "Мельбурн", kind: "city" },
  { id: "au-brisbane", image: orig("Brisbane skyline.jpg"), latitude: -27.4698, longitude: 153.0251, country: "Австралия", city: "Брисбен", description: "Брисбен", kind: "city" },
  { id: "au-adelaide", image: orig("Adelaide city.jpg"), latitude: -34.9285, longitude: 138.6007, country: "Австралия", city: "Аделаида", description: "Аделаида", kind: "city" },
  { id: "au-perth", image: orig("Perth skyline.jpg"), latitude: -31.9505, longitude: 115.8605, country: "Австралия", city: "Перт", description: "Перт", kind: "city" },
  { id: "au-greatbarrier", image: orig("Aerial View of Great Barrier Reef (Ank Kumar) 02.jpg"), latitude: -18.2861, longitude: 147.6992, country: "Австралия", city: "Большой Барьерный риф", description: "Большой Барьерный риф", kind: "nature" },
  { id: "au-uluru", image: orig("Petermann Ranges (AU), Uluru-Kata Tjuta National Park, Uluru -- 2019 -- 3688.jpg"), latitude: -25.3444, longitude: 131.0369, country: "Австралия", city: "Улуру", description: "Улуру", kind: "nature" },
  { id: "au-kakadu", image: orig("Kakadu (AU), Kakadu National Park, Nadap Lookout -- 2019 -- 4190.jpg"), latitude: -12.8536, longitude: 132.3903, country: "Австралия", city: "Какаду", description: "Нацпарк Какаду", kind: "nature" },
  { id: "au-canberra", image: orig("Canberra (AU), Parliament House -- 2019 -- 1745.jpg"), latitude: -35.3009, longitude: 149.1293, country: "Австралия", city: "Канберра", description: "Парламент", kind: "landmark" },

  // Новая Зеландия (6)
  { id: "nz-auckland", image: orig("Auckland Skyline from Mission Bay.jpg"), latitude: -36.8485, longitude: 174.7633, country: "Новая Зеландия", city: "Окленд", description: "Панорама Окленда", kind: "city" },
  { id: "nz-queenstown", image: orig("Queenstown from Bob's Peak.jpg"), latitude: -45.0312, longitude: 168.6626, country: "Новая Зеландия", city: "Квинстаун", description: "Квинстаун", kind: "city" },
  { id: "nz-queenstown-lake", image: orig("Lake Wakatipu Queenstown.jpg"), latitude: -45.0312, longitude: 168.6626, country: "Новая Зеландия", city: "Квинстаун", description: "Озеро Вакаити", kind: "nature" },
  { id: "nz-rotorua", image: orig("Pohutu Geyser, Rotorua.jpg"), latitude: -38.1368, longitude: 176.2497, country: "Новая Зеландия", city: "Роторуа", description: "Гейзер Pohutu", kind: "nature" },
  { id: "nz-milford", image: orig("Milford Sound in Fiordland National Park 01.jpg"), latitude: -44.6717, longitude: 167.9375, country: "Новая Зеландия", city: "Милфорд-Саунд", description: "Милфорд-Саунд", kind: "nature" },
  { id: "nz-wellington", image: orig("Wellington City Night.jpg"), latitude: -41.2866, longitude: 174.7756, country: "Новая Зеландия", city: "Веллингтон", description: "Веллингтон", kind: "city" },

  // Довесок до 300 (проверенные файлы)
  { id: "tr-efesus", image: orig("Ephesus Celsus Library Façade.jpg"), latitude: 37.9411, longitude: 27.3592, country: "Турция", city: "Эфес", description: "Библиотека Келлеса", kind: "landmark" },
  { id: "om-muscat", image: orig("Old Muscat City View, Muscat, Oman3.jpg"), latitude: 23.588, longitude: 58.3829, country: "Оман", city: "Маскат", description: "Маскат", kind: "city" },
  { id: "jo-amman", image: orig("Amman Night Down Town.JPG"), latitude: 31.9454, longitude: 35.9284, country: "Иордания", city: "Амман", description: "Амман", kind: "city" },
  { id: "ir-tehran", image: orig("Tehran in a clean day.jpg"), latitude: 35.6892, longitude: 51.389, country: "Иран", city: "Тегеран", description: "Тегеран", kind: "city" },
];

// ==================== Селекторы (подготовка к будущим режимам) ====================

/** DAILY: детерминированная сетка по дате — все игроки получают
 *  одни и те же 5 локаций. Зарезервировано: пока не используется. */
export function dailyLocations(date = new Date()): GeoLocation[] {
  const d =
    date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const step = Math.floor(LOCATIONS.length / 5);
  const out: GeoLocation[] = [];
  for (let i = 0; i < 5; i++) {
    const idx = (d * 7 + i * step) % LOCATIONS.length;
    out.push(LOCATIONS[idx]);
  }
  return out;
}

/** CITIES: только города/центры. Зарезервировано. */
export function cityLocations(): GeoLocation[] {
  return LOCATIONS.filter((l) => l.kind === "city" || l.kind === "plaza");
}

/** FOOTBALL_STADIUMS: только стадионы. Зарезервировано. */
export function stadiumLocations(): GeoLocation[] {
  return LOCATIONS.filter((l) => l.kind === "stadium");
}
