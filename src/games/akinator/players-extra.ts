// ============================================================
// FOOTBALL AKINATOR — дополнительные игроки (1990–2026)
// ============================================================
// Компактный формат: одна строка = один игрок
// Поля через "|": name|nameEn|nation|pos|clubs|current|era|active|gpg|h|by|flags
//   flags: L=легенда I=икона R=ривал W=ЧМ B=Золотоймяч U=ЛЧ E=Евро F=левша
// ============================================================

const RAW = `
# === ENGLAND ===
Деклан Райс|Declan Rice|england|mf|west_ham,arsenal|arsenal|2020s|1|0.2|189|1999|
Джеймс Мэддисон|James Maddison|england|mf|leicester,tottenham|tottenham|2020s|1|0.35|178|1996|
Кайл Уокер|Kyle Walker|england|df|tottenham,man_city|man_city|2010s|0|0.05|190|1991|
Джон Стоунз|John Stones|england|df|everton,man_city|man_city|2010s|1|0.05|188|1994|
Гарри Магуайр|Harry Maguire|england|df|leicester,man_utd|man_utd|2010s|1|0.1|194|1993|
Маркус Рэшфорд|Marcus Rashford|england|fw|man_utd|man_utd|2020s|1|0.5|183|1997|
Конор Галлагер|Conor Gallagher|england|mf|chelsea,aston_villa|aston_villa|2020s|1|0.25|185|1999|
Мэйсон Маунт|Mason Mount|england|mf|chelsea,man_utd|man_utd|2020s|1|0.35|180|1999|
Бен Уайт|Ben White|england|df|brighton,arsenal|arsenal|2020s|1|0.05|186|1997|
Рис Джеймс|Reece James|england|df|chelsea|chelsea|2020s|1|0.1|185|1999|
Доминик Соланке|Dominic Solanke|england|fw|tottenham|tottenham|2020s|1|0.45|185|1997|
Олли Уоткинс|Ollie Watkins|england|fw|brentford,aston_villa|aston_villa|2020s|1|0.5|185|1997|
Эберечи Эзе|Eberechi Eze|england|mf|chelsea|chelsea|2020s|1|0.35|180|2000|
Морган Гиббс-Уайт|Morgan Gibbs-White|england|mf|leicester|leicester|2020s|1|0.3|180|1999|
Энью Гордин|Anthony Gordon|england|mf|newcastle|newcastle|2020s|1|0.3|180|2001|
Курт Зума|Kurt Zouma|england|df|chelsea|chelsea|2010s|0|0.05|191|1991|
Дэнни Дринкуотер|Danny Drinkwater|england|mf|leicester,chelsea|chelsea|2010s|0|0.15|180|1990|
Люк Шоу|Luke Shaw|england|df|southampton,man_utd|man_utd|2010s|1|0.1|187|1995|
Фил Джонс|Phil Jones|england|df|man_utd|man_utd|2010s|0|0.05|191|1992|
Крис Смоллинг|Chris Smalling|england|df|west_ham,man_utd|man_utd|2010s|0|0.05|188|1989|
Дэйли Блинд|Daley Blind|netherlands|mf|ajax,man_utd|man_utd|2010s|0|0.15|179|1991|
Маркос Рохо|Marcos Rojo|argentina|df|man_utd|man_utd|2010s|0|0.05|188|1990|
Майкл Каррик|Michael Carrick|england|mf|tottenham,man_utd|man_utd|2000s|0|0.15|180|1981|I
Рио Фердинанд|Rio Ferdinand|england|df|man_utd|man_utd|2000s|0|0.05|188|1978|I
Райан Гиггз|Ryan Giggs|england|mf|man_utd|man_utd|2000s|0|0.35|173|1973|LI
Пол Шулес|Paul Scholes|england|mf|man_utd|man_utd|2000s|0|0.3|173|1974|I
Робби Кин|Robbie Keane|england|fw|coventry,man_utd,celtic|celtic|2000s|0|0.5|183|1981|I
Неманья Видич|Nemanja Vidic|serbia|df|partizan,inter,man_utd|man_utd|2000s|0|0.05|190|1981|LI
Винсент Компани|Vincent Kompany|cote_divoire|df|genk,barcelona,man_city|man_city|2010s|0|0.05|190|1987|I
Рияд Махрез|Riyad Mahrez|algeria|fw|leicester,man_city|man_city|2010s|0|0.45|178|1991|L
Габриэл Жезус|Gabriel Jesus|brazil|fw|man_city|man_city|2020s|1|0.4|183|1997|
Эдерсон|Ederson|brazil|gk|benfica,man_city|man_city|2010s|1|0|188|1993|
Габриэл Магальянэш|Gabriel Magalhaes|brazil|df|lille,arsenal|arsenal|2020s|1|0.05|189|1997|
Мартин Одегард|Martin Odegaard|norway|mf|real_madrid,arsenal|arsenal|2020s|1|0.35|172|1998|

# === SPAIN ===
Серхио Рамос|Sergio Ramos|spain|df|sevilla,real_madrid,psg|psg|2010s|0|0.15|184|1986|LI
Андريس Иньеста|Andres Iniesta|spain|mf|barcelona|barcelona|2000s|0|0.2|172|1984|LI
Давид Сильва|David Silva|spain|mf|man_city|man_city|2010s|0|0.2|179|1986|L
Жерар Пике|Gerard Pique|spain|df|barcelona|barcelona|2010s|0|0.05|192|1987|L
Икер Касильяс|Iker Casillas|spain|gk|real_sociedad,real_madrid|real_madrid|2000s|0|0|183|1981|LIW
Давид Де Хеа|David de Gea|spain|gk|man_utd|man_utd|2010s|1|0|193|1990|L
Ферран Торрес|Ferran Torres|spain|fw|barcelona,man_city|man_city|2020s|1|0.35|176|2000|
Дани Ольмо|Dani Olmo|spain|mf|rb_leipzig,barcelona|barcelona|2020s|1|0.3|181|1998|
Нико Уильямс|Nico Williams|spain|fw|real_sociedad|real_sociedad|2020s|1|0.4|175|2002|
Сесар Азпилькуэта|Cesar Azpilicueta|spain|df|sevilla,chelsea|chelsea|2010s|0|0.1|184|1989|
Хави Мартинес|Javi Martinez|spain|df|bayern|bayern|2010s|0|0.05|188|1988|
Пако Алькасер|Paco Alcacer|spain|fw|barcelona,sevilla|sevilla|2010s|1|0.45|185|1993|
Унаи Симен|Unai Simon|spain|gk|real_sociedad|real_sociedad|2020s|1|0|190|1997|
Родри|Rodri|spain|mf|villarreal,man_city|man_city|2020s|1|0.25|188|1996|
Серхио Каналес|Sergio Canales|spain|mf|sevilla|sevilla|2010s|0|0.2|172|1991|
Сес Фабрегас|Cesc Fabregas|spain|mf|barcelona,arsenal,inter_miami|inter_miami|2000s|0|0.25|171|1987|L
Пабло Сарабия|Pablo Sarabia|spain|fw|sevilla,psg|psg|2020s|1|0.3|181|1993|F
Иаго Аспас|Iago Aspas|spain|fw|sevilla|sevilla|2010s|1|0.4|176|1987|
Микель Ойарсабал|Mikel Oyarzabal|spain|fw|real_sociedad|real_sociedad|2020s|1|0.35|180|1997|
Эмерик Ляпорт|Aymeric Laporte|france|df|man_city|man_city|2010s|0|0.05|190|1994|
Серхио Агуэро|Sergio Aguero|argentina|fw|man_city|man_city|2010s|0|0.55|173|1988|LI
Хуан Мата|Juan Mata|spain|mf|chelsea,man_utd|man_utd|2010s|0|0.25|170|1988|F
Альваро Арбелоа|Alvaro Arbeloa|spain|df|real_madrid|real_madrid|2000s|0|0.05|189|1983|
Хави Алонсо|Xabi Alonso|spain|mf|real_sociedad,real_madrid,liverpool|liverpool|2000s|0|0.2|189|1981|LI

# === ITALY ===
Франческо Тотти|Francesco Totti|italy|fw|roma|roma|2000s|0|0.45|180|1976|LI
Фабио Каннаваро|Fabio Cannavaro|italy|df|napoli,ac_milan,juventus|juventus|2000s|0|0.05|186|1973|LIW
Джанлука Виалли|Gianluca Vialli|italy|fw|juventus,ac_milan,parma,chelsea|chelsea|90s|0|0.5|180|1964|L
Роберто Баджо|Roberto Baggio|italy|fw|fiorentina,juventus,ac_milan|ac_milan|90s|0|0.5|180|1967|LI
Паоло Мальдини|Paolo Maldini|italy|df|ac_milan|ac_milan|90s|0|0.05|186|1968|LIW
Алессандро Дель Пьеро|Alessandro Del Piero|italy|fw|juventus|juventus|90s|0|0.45|174|1974|LIW
Анджела Пирло|Andrea Pirlo|italy|mf|inter,ac_milan,juventus|juventus|2000s|0|0.25|186|1979|LIW
Марко Матерацци|Marco Materazzi|italy|df|inter|inter|2000s|0|0.05|184|1973|W
Кристиан Вьери|Christian Vieri|italy|fw|inter,juventus|juventus|90s|0|0.55|193|1973|W
Лоренцо Инсинье|Lorenzo Insigne|italy|fw|napoli|napoli|2010s|1|0.35|164|1991|I
Федерико Кьеза|Federico Chiesa|italy|fw|fiorentina,juventus|juventus|2020s|1|0.4|178|2001|
Андреа Белотти|Andrea Belotti|italy|fw|inter,aston_villa|aston_villa|2010s|1|0.45|185|1993|
Лоренцо Пеллегрини|Lorenzo Pellegrini|italy|mf|roma|roma|2020s|1|0.25|185|1996|
Чиро Иммобиле|Ciro Immobile|italy|fw|tottenham|tottenham|2010s|0|0.55|185|1990|I
Федерико Бернардески|Federico Bernardeschi|italy|fw|fiorentina,ac_milan|ac_milan|2010s|0|0.35|180|1994|
Маттиа Де Сильо|Mattia De Sciglio|italy|df|juventus,ac_milan|ac_milan|2010s|0|0.05|185|1992|
Симоне Джаза|Simone Zaza|italy|fw|juventus,aston_villa|aston_villa|2010s|0|0.4|185|1991|
Эдер|Eder|italy|fw|ac_milan,juventus|juventus|2010s|0|0.4|188|1987|W
Марко Верратти|Marco Verratti|france|mf|psg|psg|2010s|1|0.25|165|1991|I
Хоржиньо|Jorginho|brazil|mf|napoli,chelsea|chelsea|2020s|1|0.2|181|1991|W
Жиаго|Tiago|portugal|mf|sporting,juventus|juventus|2000s|0|0.2|183|1981|
Марко Пароло|Marco Parolo|italy|mf|inter|inter|2000s|0|0.15|185|1985|
Антонио Кандрева|Antonio Candreva|italy|fw|inter,roma|roma|2010s|1|0.3|180|1987|
Стефано Сензи|Stefano Sensi|italy|mf|roma,inter|inter|2020s|1|0.25|185|1995|
Джанлука Скаматча|Gianluca Scamacca|italy|fw|aston_villa|aston_villa|2020s|1|0.45|190|2000|
Маттео Дармиан|Matteo Darmian|italy|df|ac_milan,man_utd|man_utd|2010s|0|0.1|183|1989|
Кристиан Телло|Cristian Tello|spain|fw|barcelona|barcelona|2010s|0|0.3|175|1990|F
Самюэль Умтити|Samuel Umtiti|france|df|lille,barcelona|barcelona|2010s|0|0.05|186|1993|
Рафаэль Варан|Raphael Varane|france|df|rennes,real_madrid,man_utd|man_utd|2010s|0|0.05|191|1993|

# === MORE SPAIN ===
Сесар Касерес|Cesar Caceres|uruguay|df|juventus,barcelona|barcelona|2010s|0|0.05|188|1986|
Томас Вермален|Thomas Vermaelen|belgium|df|arsenal,barcelona|barcelona|2010s|0|0.05|188|1987|
Адриан|Adrian|spain|gk|liverpool|liverpool|2010s|0|0|191|1987|
Виктор Вальдес|Victor Valdes|spain|gk|barcelona|barcelona|2000s|0|0|184|1982|L
Альваро Негредо|Alvaro Negredo|spain|fw|man_utd,sevilla|sevilla|2010s|0|0.4|190|1985|
Рубен Кастро|Ruben Castro|spain|fw|sevilla|sevilla|2010s|0|0.35|180|1984|
Борха Валеро|Borja Valero|spain|mf|sevilla,juventus,inter|inter|2010s|0|0.2|180|1983|
Хави Гарсия|Javi Garcia|spain|df|atletico,barcelona,man_city,psg|psg|2010s|1|0.05|185|1987|
Микель Артета|Mikel Arteta|spain|mf|arsenal|arsenal|2000s|0|0.15|183|1982|
Карлос Вела|Carlos Vela|mexico|fw|real_sociedad,arsenal|arsenal|2000s|0|0.3|170|1985|F
Хуан Бернат|Juan Bernat|spain|df|barcelona,bayern,inter_miami|inter_miami|2010s|1|0.1|172|1993|
Андер Эррера|Ander Herrera|spain|mf|man_utd,psg|psg|2010s|1|0.15|185|1989|
Сантьяго Казорла|Santi Cazorla|spain|mf|arsenal,celtic|celtic|2010s|0|0.2|168|1984|F
Иско|Isco|spain|mf|real_madrid,sevilla|sevilla|2010s|1|0.2|172|1994|F
Хесус Навас|Jesús Navas|spain|fw|sevilla,man_city|man_city|2010s|0|0.3|171|1985|
Пеп Рейна|Pep Reina|spain|gk|liverpool,napoli|napoli|2000s|0|0|188|1982|

# === GERMANY ===
Бастиан Швайнштайгер|Bastian Schweinsteiger|germany|mf|schalke,bayern,man_utd|man_utd|2000s|0|0.25|180|1984|L
Лукас Подольски|Lukas Podolski|germany|fw|liverpool,galatasaray|galatasaray|2000s|0|0.4|182|1985|L
Месут Озил|Mesut Ozil|germany|mf|werder_bremen,real_madrid,arsenal,fenerbahce|fenerbahce|2010s|0|0.25|180|1988|L
Пер Мертесакер|Per Mertesacker|germany|df|werder_bremen,arsenal|arsenal|2000s|0|0.05|191|1984|
Ларс Бендер|Lars Bender|germany|mf|leverkusen,bayern,borussia_dortmund|borussia_dortmund|2010s|1|0.15|185|1989|
Свен Бендер|Sven Bender|germany|df|leverkusen,bayern|bayern|2010s|0|0.05|188|1987|
Андре Шюррле|Andre Schurrle|germany|fw|borussia_dortmund,chelsea,bayern|bayern|2010s|0|0.35|180|1992|
Тимо Вернер|Timo Werner|germany|fw|leverkusen,rb_leipzig,chelsea|chelsea|2020s|1|0.5|185|1996|
Юлиан Брандт|Julian Brandt|germany|mf|borussia_dortmund|borussia_dortmund|2020s|1|0.25|180|1993|
Никлас Зюле|Niklas Sule|germany|df|bayern|bayern|2020s|1|0.05|192|1995|
Леон Горецка|Leon Goretzka|germany|mf|schalke,rb_leipzig,bayern|bayern|2020s|1|0.25|187|1995|
Серж Гнабри|Serge Gnabry|germany|fw|bayern|bayern|2010s|1|0.35|188|1995|
Йонатан Тах|Jonathan Tah|germany|df|bayer_leverkusen|bayer_leverkusen|2020s|1|0.05|191|1996|
Кай Хаверц|Kai Havertz|germany|fw|bayer_leverkusen,chelsea|chelsea|2020s|1|0.4|193|1999|
Кристофер Нкунку|Christopher Nkunku|france|fw|leicester,rb_leipzig,chelsea|chelsea|2020s|1|0.4|180|1997|
Нико Шлоттербек|Nico Schlotterbeck|germany|df|borussia_dortmund|borussia_dortmund|2020s|1|0.05|190|2000|
Паскаль Граус|Pascal Gross|germany|mf|borussia_monschgladbach,brighton|brighton|2010s|1|0.2|178|1991|
Макс Крузе|Max Kruse|germany|mf|borussia_monschgladbach,galatasaray||2010s|0|0.3|180|1988|
Марко Ройс|Marco Reus|germany|fw|borussia_dortmund|borussia_dortmund|2010s|1|0.35|180|1989|L
Кевин Трапп|Kevin Trapp|germany|gk|rb_leipzig,psg|psg|2010s|1|0|188|1990|
Робин Кок|Robin Koch|germany|df|bayer_leverkusen,everton|everton|2020s|1|0.05|188|1997|
Флориан Нойхаус|Florian Neuhaus|germany|mf|borussia_monschgladbach|borussia_monschgladbach|2020s|1|0.2|180|1998|
Йонас Хёфман|Jonas Hofmann|germany|mf|borussia_monschgladbach,rb_leipzig|rb_leipzig|2010s|1|0.25|185|1993|
Себастьян Руди|Sebastian Rudy|germany|mf|bayern||2010s|0|0.15|185|1990|
Карим Беллараби|Karim Bellarabi|germany|fw|bayer_leverkusen,leverkusen|leverkusen|2010s|1|0.25|180|1990|
Сергей Рибалька|Sergey Rybalka|france|fw|brest,psg|psg|2020s|1|0.3|180|2000|

# === FRANCE ===
Тьерри Анри|Thierry Henry|france|fw|monaco,juventus,barcelona,arsenal|arsenal|90s|0|0.5|180|1977|LIW
Патрик Вьере|Patrick Vieira|france|mf|juventus,arsenal|arsenal|90s|0|0.15|191|1976|LIW
Зинедина Зидан|Zinedine Zidane|france|mf|cannes,bordeaux,juventus,real_madrid|real_madrid|90s|0|0.35|185|1972|LIWUE
Николас Анелька|Nicolas Anelka|france|fw|paris_saint_germain,juventus,real_madrid,man_utd|man_utd|90s|0|0.4|185|1979|
Марсель Десайи|Marcel Desailly|france|df|barcelona,man_utd|man_utd|90s|0|0.05|183|1968|LI
Эрик Абидал|Eric Abidal|france|df|bordeaux,barcelona,lyon|lyon|2000s|0|0.05|185|1979|L
Франк Рибери|Franck Ribery|france|mf|psg,bayern|bayern|2000s|0|0.35|182|1983|LI
Лорик Ремэ|Loic Remy|france|fw|rennes,chelsea|chelsea|2010s|0|0.4|185|1988|
Бафетимбо Гомис|Bafetimbo Gomis|france|fw|rennes,lyon|lyon|2010s|0|0.4|185|1985|
Юго Льори|Hugo Lloris|france|gk|southampton,tottenham|tottenham|2010s|1|0|188|1986|I
Презнел Кимембе|Presnel Kimpembe|france|df|psg|psg|2020s|1|0.05|190|1995|
Ориен Тшомини|Aurelien Tchouameni|france|mf|monaco,real_madrid|real_madrid|2020s|1|0.2|190|2000|
Амин Гурис|Amine Gouiri|algeria|fw|rennes,lyon|lyon|2020s|1|0.35|178|2001|
Хаким Зийех|Hakim Ziyech|morocco|fw|brondby,arsenal|arsenal|2020s|1|0.35|178|1993|
Деннис Аппиа|Dennis Appiah|france|df|rennes,psg|psg|2020s|1|0.05|185|1998|
Оливье Жиру|Olivier Giroud|france|fw|arsenal,chelsea,ac_milan|ac_milan|2010s|1|0.45|192|1986|
Поле Погба|Paul Pogba|france|mf|juventus,man_utd|man_utd|2010s|0|0.25|191|1993|I
Блейз Матюиди|Blaise Matuidi|france|mf|psg,juventus|juventus|2010s|0|0.2|180|1987|
Мусса Сиссоко|Moussa Sissoko|france|mf|tottenham,barcelona|barcelona|2010s|0|0.25|185|1989|
Левин Курзава|Layvin Kurzawa|france|df|monaco,psg|psg|2010s|1|0.05|185|1992|
Адил Рами|Adil Rami|france|df|lille,sevilla,monaco|monaco|2010s|0|0.05|186|1985|
Матье Дебюши|Mathieu Debuchy|france|df|lille,newcastle|newcastle|2010s|0|0.05|183|1985|
Жереми Мена|Jérémy Ménez|france|fw|parma,inter,psg|psg|2000s|0|0.3|175|1987|
Васси Бен Йеддер|Wassni Ben Yedder|france|fw|sevilla|sevilla|2010s|1|0.4|178|1987|
Флориан Товен|Florian Thauvin|france|fw|monaco,marseille|marseille|2010s|1|0.3|170|1993|F
Осман Дембеле|Ousmane Dembele|france|fw|borussia_dortmund,barcelona,psg|psg|2010s|1|0.35|178|1997|
Набиль Фекир|Nabil Fekir|france|fw|lyon,marseille|marseille|2010s|1|0.35|175|1993|
Корентин Толиссо|Corentin Tolisso|france|mf|lyon,bayern|bayern|2010s|1|0.2|180|1994|
Александр Лаказетт|Alexandre Lacazette|france|fw|lille,arsenal|arsenal|2010s|1|0.35|180|1991|
Роме Кабелла|Remy Cabella|france|mf|sevilla|sevilla|2010s|1|0.25|180|1990|
Димитри Пайет|Dimitri Payet|france|mf|west_ham|west_ham|2010s|1|0.25|175|1987|F

# === NETHERLANDS / BELGIUM ===
Арджен Роббен|Arjen Robben|netherlands|fw|psv,man_utd,bayern|bayern|2000s|0|0.4|180|1984|LI
Уэсли Снейдер|Wesley Sneijder|netherlands|mf|ajax,inter,galatasaray|galatasaray|2000s|0|0.25|180|1984|LI
Джованни ван Бронкхорст|Giovanni van Bronckhorst|netherlands|df|psv,feyenoord,barcelona|barcelona|2000s|0|0.1|180|1975|LI
Робин ван Перси|Robin van Persie|netherlands|fw|feyenoord,arsenal,man_utd|man_utd|2010s|0|0.5|185|1983|LI
Эдвин ван дер Сар|Edwin van der Sar|netherlands|gk|feyenoord,man_utd|man_utd|2000s|0|0|197|1970|LI
Деннис Бергкамп|Dennis Bergkamp|netherlands|fw|feyenoord,inter,arsenal|arsenal|90s|0|0.4|180|1969|LI
Патрик Клуиверт|Patrick Kluivert|netherlands|fw|ajax,barcelona,psg|psg|90s|0|0.5|185|1976|LI
Руд Гуллит|Ruud Gullit|netherlands|df|feyenoord,ac_milan,chelsea|chelsea|90s|0|0.25|190|1962|LI
Рональд Комен|Ronald Koeman|netherlands|df|psv,barcelona,bayern|bayern|90s|0|0.15|188|1963|L
Дирк Куйт|Dirk Kuyt|netherlands|fw|psv,celtic,liverpool|liverpool|2000s|0|0.4|180|1980|
Марк ван Боммель|Mark van Bommel|netherlands|mf|feyenoord,barcelona,ac_milan|ac_milan|2000s|0|0.15|190|1977|LI
Найхел де Йонг|Nigel de Jong|netherlands|df|psv,man_city|man_city|2010s|0|0.05|188|1987|
Вут Вегхорст|Wout Weghorst|netherlands|fw|psv,bayern,galatasaray|galatasaray|2020s|1|0.45|193|1992|
Тюн Купмейнерс|Teun Koopmeiners|netherlands|mf|ajax,psv,atalanta,man_utd|man_utd|2020s|1|0.25|185|1998|
Матс Вейналдум|Mats Wijnaldum|netherlands|mf|psv,newcastle,barcelona|barcelona|2010s|1|0.2|181|1991|
Георгиньо Вейналдум|Georginio Wijnaldum|netherlands|mf|psv,newcastle,barcelona,aston_villa|aston_villa|2010s|1|0.2|181|1991|
Стефан де Врей|Stefan de Vrij|netherlands|df|feyenoord,inter,aston_villa|aston_villa|2010s|1|0.05|188|1992|
Мемфис Депай|Memphis Depay|netherlands|fw|psv,man_utd,barcelona,lyon|lyon|2010s|1|0.4|183|1994|
Квинси Промес|Quincy Promes|netherlands|fw|psv,sevilla|sevilla|2010s|1|0.35|178|1992|F
Джошуа Зиркзе|Joshua Zirkzee|netherlands|fw|psv,borussia_dortmund,man_utd|man_utd|2020s|1|0.35|188|2001|
Хави Симонс|Xavi Simons|netherlands|mf|psv,psg|psg|2020s|1|0.3|172|2003|
Джереми Фримпонг|Jeremie Frimpong|netherlands|df|feyenoord,juventus|juventus|2020s|1|0.15|180|2000|
Доньель Мален|Donyell Malen|netherlands|fw|psv,psg,aston_villa|aston_villa|2020s|1|0.35|183|1999|
Лерой Сане|Leroy Sane|netherlands|fw|schalke,man_city,bayern|bayern|2010s|1|0.3|180|1996|
Дарил Янмаат|Daryl Janmaat|netherlands|df|az_alkmaar,celtic,newcastle,barcelona,marseille|marseille|2010s|0|0.1|180|1987|
Огенекаро Этебо|Oghenekaro Etebo|nigeria|df|feyenoord,inter|inter|2020s|1|0.05|185|1997|
Дрис Мертенс|Dries Mertens|belgium|fw|genk,napoli,fenerbahce|fenerbahce|2010s|1|0.45|175|1987|L
Ян Вертонген|Jan Vertonghen|belgium|df|standard,tottenham|tottenham|2010s|0|0.1|189|1987|
Аксель Витсель|Axel Witsel|belgium|mf|standard,psv,borussia_dortmund|borussia_dortmund|2010s|0|0.15|187|1989|
Тоби Альдервейрелд|Toby Alderweireld|belgium|df|standard,tottenham,inter|inter|2010s|1|0.05|191|1989|
Кевин Мираллас|Kevin Mirallas|belgium|fw|standard,everton,man_utd|man_utd|2010s|0|0.3|178|1987|
Юри Тилеманс|Youri Tielemans|belgium|mf|monaco,aston_villa,leicester|leicester|2020s|1|0.2|182|1997|
Торган Азар|Thorgan Hazard|belgium|mf|borussia_dortmund,psg,celtic|celtic|2010s|1|0.25|175|1993|
Брайан Гиль|Bryan Gil|belgium|fw|psv,celtic||2020s|1|0.35|180|1999|
Доди Люкебакио|Dodi Lukebakio|belgium|fw|psv,borussia_monschgladbach,celtic|celtic|2020s|1|0.35|188|1997|
Амаду Онан|Amadou Onana|belgium|mf|standard,aston_villa|aston_villa|2020s|1|0.15|180|2001|
Амаду Диалло|Amadou Diallo|belgium|df|psv,celtic|celtic|2020s|1|0.05|185|1997|
Лорик Бад|Loic Bade|belgium|df|psv|psv|2020s|1|0.05|180|2000|
Чарльз Дегительер|Charles De Ketelaere|belgium|fw|atalanta,everton|everton|2020s|1|0.3|180|1997|
Деннис Прат|Dennis Praet|belgium|mf|celtic,aston_villa|aston_villa|2010s|1|0.2|185|1994|
Леандро Троссард|Leandro Trossard|belgium|fw|brighton|brighton|2020s|1|0.35|180|1992|

# === CROATIA / SCANDINAVIA / EAST EUROPE ===
Иван Ракитич|Ivan Rakitic|croatia|mf|dynamo_zagreb,sevilla,barcelona,inter|inter|2010s|0|0.25|184|1988|
Марсело Брозович|Marcelo Brozovic|croatia|mf|dynamo_zagreb,inter,ac_milan|ac_milan|2010s|1|0.25|185|1992|
Матео Ковачич|Mateo Kovacic|croatia|mf|inter,real_madrid,chelsea|chelsea|2020s|1|0.25|180|1994|
Марио Пасалич|Mario Pasalic|croatia|fw|inter|inter|2020s|1|0.2|180|1995|
Доминик Ливакович|Dominik Livakovic|croatia|gk|dynamo_zagreb,girona|girona|2020s|1|0|192|1995|
Йосип Брекало|Josip Brekalo|croatia|fw|schalke|schalke|2020s|1|0.3|185|1998|
Андрей Крамарич|Andrej Kramaric|croatia|fw|dynamo_zagreb|dynamo_zagreb|2020s|1|0.4|185|1991|
Лука Иванушеч|Luka Ivanusec|croatia|df|inter,galatasaray|galatasaray|2010s|1|0.1|185|1991|
Мартин Батурина|Martin Baturina|croatia|df|dynamo_zagreb|dynamo_zagreb|2020s|1|0.05|185|1996|
Ловро Майер|Lovro Majer|croatia|mf|dynamo_zagreb,celtic|celtic|2020s|1|0.25|180|1999|
Петр Шик|Petr Schick|czech|fw|ac_milan,red_bull_salzburg|red_bull_salzburg|2010s|1|0.45|190|1995|
Лукаш Писччек|Lukasz Piszczek|poland|df|borussia_dortmund|borussia_dortmund|2000s|0|0.1|185|1985|
Камиль Гросицки|Kamil Grosicki|poland|fw|brighton|brighton|2010s|1|0.25|175|1988|F
Якуб Бłaszczykowski|Jakub Błaszczykowski|poland|fw|borussia_dortmund,galatasaray|galatasaray|2010s|0|0.3|180|1985|
Аркадиуш Милик|Arkadiusz Milik|poland|fw|bayern,napoli,barcelona|barcelona|2010s|1|0.45|190|1994|
Пржемыслав Пляхета|Przemyslaw Placheta|poland|mf|legia,celtic|celtic|2020s|1|0.2|185|1999|
Никола Влаович|Nikola Vlaovic|serbia|fw|partizan,fiorentina,juventus|juventus|2020s|1|0.5|193|2000|
Александр Митрович|Aleksandar Mitrovic|serbia|fw|partizan,everton|everton|2020s|1|0.55|189|1994|
Лука Йович|Luka Jovic|serbia|fw|partizan,everton,real_madrid|real_madrid|2020s|1|0.35|190|1997|
Душан Тадич|Dusan Tadic|serbia|mf|partizan,psv,ajax|ajax|2010s|0|0.35|180|1988|I
Милан Барич|Milan Baric|serbia|fw|partizan|partizan|2000s|0|0.45|185|1981|
Стефан Савич|Stefan Savic|serbia|df|partizan,inter,atletico|atletico|2010s|1|0.05|190|1992|
Александр Сёрлот|Alexander Sorloth|norway|fw|galatasaray|galatasaray|2020s|1|0.5|190|1998|
Маркус Педерсен|Marcus Pedersen|norway|fw|red_bull_salzburg|red_bull_salzburg|2020s|1|0.4|185|1999|
Виктор Гьекерес|Viktor Gyokeres|sweden|fw|celtic,arsenal|arsenal|2020s|1|0.5|190|1998|
Александр Скоф|Alexander Skov|denmark|mf|celtic|celtic|2020s|1|0.25|185|1998|
Андерс Дальсгаард|Anders Dalsgaard|denmark|mf|celtic|celtic|2020s|1|0.2|180|1999|
Каспер Дольберг|Kasper Dolberg|denmark|fw|ajax,lyon,sevilla|sevilla|2010s|1|0.4|190|1997|
Юсуф Пульсен|Yussuf Poulsen|denmark|mf|rb_leipzig|rb_leipzig|2010s|1|0.3|188|1994|
Андреас Корнелиус|Andreas Cornelius|denmark|fw|atalanta||2010s|1|0.35|188|1989|
Йоханнес Андерсен|Joachim Andersen|denmark|df|brondby,celtic,everton|everton|2020s|1|0.05|190|1996|
Рамус Хёйглунд|Rasmus Højlund|denmark|fw|atalanta,man_utd|man_utd|2020s|1|0.45|195|2003|
Пьер-Эмил Хёйбьерг|Pierre-Emile Højbjerg|denmark|mf|schalke,celtic,tottenham|tottenham|2010s|1|0.15|185|1995|
Христиан Эриксен|Christian Eriksen|denmark|mf|ajax,inter,tottenham,man_utd|man_utd|2010s|1|0.25|180|1989|L
Уильям Квист|William Kvist|denmark|mf|brondby,celtic|celtic|2010s|0|0.15|178|1986|
Даниэль Васс|Daniel Wass|denmark|mf|brondby,celtic|celtic|2010s|1|0.2|180|1986|
Йонас Ванд|Jonas Wind|denmark|fw|brondby,celtic|celtic|2010s|0|0.35|185|1988|
Виктор Фишер|Viktor Fischer|denmark|fw|brondby,celtic|celtic|2010s|0|0.3|180|1986|
Лассе Шене|Lasse Schone|denmark|mf|brondby,celtic|celtic|2010s|0|0.2|185|1986|

# === SWEDEN / PORTUGAL / TURKEY ===
Златан Ибрагимович|Zlatan Ibrahimovic|sweden|fw|ajax,psv,inter,ac_milan,barcelona,psg,man_utd,inter_miami|inter_miami|2000s|0|0.55|195|1981|LIW
Хенрик Ларссон|Henrik Larsson|sweden|fw|celtic,arsenal|arsenal|90s|0|0.45|185|1979|LI
Олоф Меллберг|Olof Mellberg|sweden|df|psv,celtic,liverpool|liverpool|2000s|0|0.05|185|1977|
Андреас Исаксон|Andreas Isaksson|sweden|gk|||2000s|0|0|190|1981|
Ким Аллстрем|Kim Källström|sweden|mf|celtic,tottenham,barcelona|barcelona|2000s|0|0.2|175|1982|F
Маркус Берг|Marcus Berg|sweden|fw|celtic,psv|celtic|2010s|1|0.4|188|1986|
Йон Гвидетти|John Guidetti|sweden|fw|celtic,az_alkmaar|az_alkmaar|2010s|1|0.4|185|1992|
Виктор Линделёф|Victor Lindelöf|sweden|df|man_utd|man_utd|2010s|1|0.05|188|1994|
Деян Кулушевски|Dejan Kulusevski|sweden|mf|celtic,inter,man_utd,ac_milan|ac_milan|2020s|1|0.3|180|2000|
Виктор Кляссон|Viktor Claesson|sweden|fw|celtic|celtic|2010s|0|0.3|175|1986|
Себастьян Ларссон|Sebastian Larsson|sweden|mf|celtic|celtic|2010s|0|0.2|180|1985|
Олле Линделёф|Olle Lindelof|sweden|df|celtic|celtic|2010s|0|0.05|185|1988|
Никлас Муяндер|Niklas Moisander|finland|df|celtic|celtic|2010s|0|0.05|185|1985|
Яри Литманен|Jari Litmanen|finland|fw|celtic|celtic|90s|0|0.35|175|1971|I
Эбе Скоф|Ebbe Skov|finland|fw|celtic|celtic|2010s|0|0.3|180|1988|
Пекка Исаксон|Pekka Isaksson|finland|gk|celtic|celtic|2010s|0|0|190|1985|
Микко Лехтонен|Mikko Lehtonen|finland|df|celtic|celtic|2010s|0|0.05|185|1988|
Хенрик Тойвонен|Henrik Toivonen|finland|fw|celtic|celtic|2010s|0|0.3|180|1990|
Роналдо|Ronaldo Nazario|brazil|fw|santos,barcelona,real_madrid,inter,ac_milan,corinthians|corinthians|90s|0|0.55|180|1976|LIWB

Роналдиньо|Ronaldinho|brazil|fw|cruzeiro,barcelona,ac_milan,corinthians|corinthians|2000s|0|0.4|180|1980|LIW
Ривалдо|Rivaldo|brazil|mf|barcelona,ac_milan|ac_milan|90s|0|0.35|180|1972|LIW
Кака|Kaka|brazil|mf|santos,ac_milan,real_madrid,corinthians|corinthians|2000s|0|0.35|185|1982|LIWU
Кафу|Cafu|brazil|df|santos,ac_milan,barcelona,corinthians|corinthians|90s|0|0.1|175|1970|LIW
Роберто Карлос|Roberto Carlos|brazil|df|ac_milan,real_madrid|real_madrid|90s|0|0.2|178|1973|LIWF
Эдмундо|Edmundo|brazil|fw|inter,barcelona|barcelona|90s|0|0.5|180|1966|
Жуниньо|Juninho|brazil|mf|santos,ac_milan,barcelona|barcelona|2000s|0|0.3|180|1980|W
Луиш Фигу|Luis Figo|portugal|mf|sporting,barcelona,real_madrid,inter|inter|90s|0|0.3|180|1972|LIW
Деку|Deco|portugal|mf|porto,barcelona,chelsea|chelsea|2000s|0|0.25|180|1977|LI
Рикарду Куарежма|Ricardo Quaresma|portugal|fw|porto,chelsea,galatasaray|galatasaray|2000s|0|0.35|175|1983|
Нани|Nani|portugal|fw|porto,barcelona,man_utd|man_utd|2010s|0|0.3|180|1986|
Элдер Поштига|Helder Postiga|portugal|fw|sporting,celtic|celtic|2000s|0|0.4|185|1982|
Жоау Мутиньо|Joao Moutinho|portugal|mf|sporting,porto,monaco,rennes|rennes|2010s|0|0.2|170|1986|
Руи Коста|Rui Costa|portugal|mf|sporting,porto,ac_milan|ac_milan|90s|0|0.3|180|1972|LI
Сикандро Сена|Sicandro Ceana|portugal|fw|sporting,porto|porto|90s|0|0.4|180|1973|
Паулу Футре|Paulo Futre|portugal|fw|porto,barcelona,galatasaray|galatasaray|90s|0|0.35|175|1957|I
Бету|Beto|portugal|gk|sporting,benfica|benfica|2000s|0|0|190|1969|
Рикарду|Ricardo|portugal|gk|sporting,benfica|benfica|2000s|0|0|185|1976|
Мануэл Фернандеш|Manuel Fernandes|portugal|mf|benfica,porto|porto|2000s|0|0.15|180|1978|
Силвио|Silvio|brazil|df|santos,barcelona|barcelona|2000s|0|0.05|180|1975|
Майкон|Maicon|brazil|df|inter,man_city,parma|parma|2000s|0|0.05|180|1981|LI
Люсио|Lucio|brazil|df|santos,barcelona,inter,bayern|bayern|2000s|0|0.05|188|1978|LIW
Диего|Diego|brazil|fw|santos,porto,real_madrid|real_madrid|2000s|0|0.35|170|1985|
Адриано|Adriano|brazil|fw|inter,barcelona|barcelona|2000s|0|0.45|188|1982|I
Роберто Фирмино|Roberto Firmino|brazil|fw|fenerbahce,liverpool|liverpool|2010s|1|0.4|181|1991|
Филипе Кутиньо|Philippe Coutinho|brazil|mf|inter,liverpool,barcelona|barcelona|2010s|1|0.25|170|1992|
Каземиро|Casemiro|brazil|mf|corinthians,real_madrid|real_madrid|2010s|1|0.1|188|1992|
Фернандиньо|Fernandinho|brazil|mf|corinthians,man_city|man_city|2010s|1|0.1|183|1985|
Данило|Danilo|brazil|df|flamengo,man_city,real_madrid|real_madrid|2010s|1|0.1|179|1991|
Фабиньо|Fabinho|brazil|mf|monaco,liverpool|liverpool|2010s|1|0.1|188|1993|
Алиссон Бекер|Alisson Becker|brazil|gk|inter,liverpool|liverpool|2010s|1|0|191|1992|
Маркиньос|Marquinhos|brazil|df|corinthians,psg|psg|2010s|1|0.05|188|1994|
Алекс Сандру|Alex Sandro|brazil|df|corinthians,juventus|juventus|2010s|1|0.15|175|1991|
Дуглас Коста|Douglas Costa|brazil|fw|schalke,bayern,real_madrid,juventus|juventus|2010s|1|0.3|180|1990|F
Уиллиан|Willian|brazil|fw|anji,chelsea,psg|psg|2010s|1|0.25|180|1988|
Габриэл Барбоза|Gabriel Barbosa|brazil|fw|corinthians,inter,flamengo,psg|psg|2010s|1|0.35|175|1994|
Габриэл|Gabriel|brazil|df|flamengo,man_city,arsenal|arsenal|2020s|1|0.05|189|1997|
Винисиус Джуниор|Vinicius Junior|brazil|fw|flamengo,real_madrid|real_madrid|2020s|1|0.35|175|2000|I
Родриго|Rodrygo|brazil|fw|santos,real_madrid|real_madrid|2020s|1|0.3|180|2001|
Габриэль Эйнсе|Gabriel Heinze|argentina|df|river,barcelona,man_utd,sevilla|sevilla|2000s|0|0.05|185|1978|W
Хуан Себастьян Верон|Juan Sebastian Veron|argentina|mf|river,inter,man_utd,parma,juventus|juventus|90s|0|0.25|180|1975|LI
Габриэль Батистута|Gabriel Batistuta|argentina|fw|river,fiorentina,roma,inter|inter|90s|0|0.5|190|1969|LI
Эрнесто Креспо|Hernan Crespo|argentina|fw|inter,barcelona,roma|roma|2000s|0|0.45|185|1974|
Карлос Тевес|Carlos Tevez|argentina|fw|west_ham,man_utd,barcelona,juventus,inter,river|river|2010s|0|0.4|180|1984|I
Гонсало Игуаин|Gonzalo Higuain|argentina|fw|real_madrid,napoli,juventus,inter_miami|inter_miami|2010s|1|0.5|184|1987|L
Карлос Луна|Carlos Luna|argentina|mf|river|river|2020s|1|0.25|180|1998|
Эсекьель Паласиос|Exequiel Palacios|argentina|mf|benfica,bayern|bayern|2020s|1|0.25|180|1998|
Николас Тальяфико|Nicolas Tagliafico|argentina|df|river,ajax,barcelona|barcelona|2010s|1|0.15|180|1992|
Кристан Ромаро|Cristian Romero|argentina|df|tottenham|tottenham|2020s|1|0.05|185|1998|
Хавьер Массерано|Javier Mascherano|argentina|df|corinthians,west_ham,liverpool,barcelona||2000s|0|0.1|184|1984|L
Кристан Ансальди|Cristian Ansaldi|argentina|df|inter||2010s|0|0.15|180|1986|
Энцо Фернандес|Enzo Fernandez|argentina|mf|river,psg|psg|2020s|1|0.2|180|2001|

# === URUGUAY / CHILE / COLOMBIA ===
Диего Форлан|Diego Forlan|uruguay|fw|inter,atletico|atletico|2000s|0|0.45|178|1979|LIW
Луис Суарес|Luis Suarez|uruguay|fw|liverpool,barcelona,atletico|atletico|2010s|1|0.55|184|1987|LIW
Эдинсон Кавани|Edinson Cavani|uruguay|fw|napoli,paris_saint_germain,man_utd|man_utd|2010s|1|0.5|188|1987|
Мартин Кампа|Martin Campa|uruguay|fw|penarol|penarol|2020s|1|0.35|180|1998|
Матиас Вина|Matias Vina|uruguay|fw|penarol||2020s|1|0.35|180|1999|
Федерико Вардес|Federico Valverde|uruguay|mf|penarol,real_madrid|real_madrid|2020s|1|0.25|181|1998|
Дарвин Нуньес|Darwin Nunez|uruguay|fw|penarol,benfica,liverpool|liverpool|2020s|1|0.45|188|1998|
Гонсало Васкес|Gonzalo Vazquez|uruguay|gk|penarol,benfica|benfica|2010s|1|0|190|1992|
Диего Годин|Diego Godin|uruguay|df|penarol,atletico|atletico|2010s|0|0.05|184|1986|L
Хосе Хименес|Jose Gimenez|uruguay|df|penarol,atletico|atletico|2010s|1|0.05|185|1995|
Матиас Вецино|Mathias Vecino|uruguay|mf|penarol,inter|inter|2010s|1|0.2|185|1992|
Николас де ла Крусь|Nicolas De La Cruz|uruguay|mf|penarol,benfica,real_madrid|real_madrid|2020s|1|0.25|180|2001|
Макси Гомес|Maxi Gomez|uruguay|fw|penarol,celtic||2010s|1|0.4|180|1997|
Валентин Лискан|Valentin Liscano|uruguay|fw|penarol|penarol|2020s|1|0.35|180|1999|
Брайан Родригес|Brian Rodriguez|uruguay|fw|penarol|penarol|2020s|1|0.3|178|2000|
Аугустин Канобио|Agustin Canobbio|uruguay|fw|penarol,defensor|defensor|2020s|1|0.35|175|1999|
Фасундо Торрес|Facundo Torres|uruguay|fw|penarol|penarol|2020s|1|0.3|180|2000|

# === CHILE / COLOMBIA / PARAGUAY ===
Алексис Санчес|Alexis Sanchez|chile|fw|barcelona,arsenal,man_utd,inter|inter|2010s|1|0.4|172|1988|L
Гари Мел|Gary Medel|chile|mf|galatasaray,flamengo|flamengo|2010s|0|0.15|185|1987|
Эдуардо Варгас|Eduardo Vargas|chile|fw|bayern||2010s|1|0.4|183|1989|
Чарльз Арангуис|Charles Aránguiz|chile|mf|schalke,bayern||2010s|1|0.15|175|1990|
Диего Беналья|Diego Benaglio|chile|gk|celtic,leicester|leicester|2010s|0|0|190|1987|
Маурисио Исла|Mauricio Isla|chile|df|inter,juventus,corinthians|corinthians|2010s|0|0.1|175|1988|
Жан Боасжур|Jean Beausejour|chile|fw|sevilla,flamengo|flamengo|2010s|0|0.3|180|1986|
Клаудио Браво|Claudio Bravo|chile|gk|celtic,barcelona,psg,sevilla|sevilla|2010s|1|0|185|1983|L
Матиас Фернандес|Matias Fernandez|chile|mf|schalke,barcelona,sevilla|sevilla|2010s|0|0.2|180|1985|
Франсиско Сильва|Francisco Silva|chile|fw|schalke,flamengo|flamengo|2010s|0|0.35|180|1985|
Марсело Диас|Marcelo Diaz|chile|fw|sevilla,juventus|juventus|2010s|0|0.35|180|1987|
Исак Бризуэла|Isaac Brizuela|chile|fw|sevilla,juventus|juventus|2010s|0|0.35|180|1987|
Фелипе Контрерас|Felipe Contreras|chile|df|sevilla,juventus|juventus|2010s|0|0.05|185|1990|
Никлас|Niklas|chile|fw|sevilla,juventus|juventus|2010s|0|0.35|180|1990|

# === COLOMBIA / PARAGUAY / ECUADOR ===
Радамель Фалькао|Radamel Falcao|colombia|fw|river,atletico,man_utd|man_utd|2010s|1|0.5|185|1986|LI
Хамес Родригес|James Rodriguez|colombia|mf|psg,real_madrid,barcelona|barcelona|2010s|1|0.3|180|1991|L
Карлос Бакка|Carlos Bacca|colombia|fw|sevilla,ac_milan|ac_milan|2010s|1|0.45|175|1986|
Абель Агилар|Abel Aguilar|colombia|df|galatasaray|galatasaray|2010s|0|0.05|180|1986|
Фреди Гварин|Fredy Guarin|colombia|mf|porto,inter,galatasaray|galatasaray|2010s|0|0.15|180|1986|
Хуан Фернандо Кинтеро|Juan Fernando Quintero|colombia|mf|flamengo|flamengo|2010s|1|0.25|175|1990|
Дайро Морено|Dayro Moreno|colombia|fw|flamengo|flamengo|2020s|1|0.45|185|1990|
Харрисон Кавани|Harrison Cavani|colombia|fw|galatasaray|galatasaray|2020s|1|0.4|185|1998|
Луис Диас|Luis Diaz|colombia|fw|atletico_nacional,liverpool|liverpool|2020s|1|0.35|175|1997|
Ерри Мина|Yerri Mina|colombia|df|barcelona,atletico,sevilla|sevilla|2020s|1|0.1|193|1998|
Давинсон Санчес|Davinson Sanchez|colombia|df|everton,tottenham,napoli|napoli|2020s|1|0.05|190|1998|
Мигель Борха|Miguel Borja|colombia|fw|atalanta|atalanta|2020s|1|0.45|185|1997|
Имми Чара|Yimmi Chara|colombia|fw|atalanta|atalanta|2020s|1|0.4|180|1998|
Хон Дуран|Jhon Duran|colombia|fw|river,aston_villa|aston_villa|2020s|1|0.35|180|2004|

# === TURKEY / GREECE ===
Хакан Шукюр|Hakan Sukur|turkey|fw|galatasaray,ac_milan|ac_milan|90s|0|0.4|180|1974|L
Арда Туран|Arda Turan|turkey|mf|galatasaray,barcelona,atletico|galatasaray|2010s|0|0.25|178|1987|I
Мехмет Аурелио|Aurelio|turkey|mf|galatasaray,barcelona|barcelona|2000s|0|0.15|180|1981|
Эмре Белезоглу|Emre Belozoglu|turkey|mf|galatasaray|galatasaray|2000s|0|0.15|180|1980|
Сами Хедира|Sami Khedira|germany|mf|schalke,real_madrid,ac_milan,juventus|juventus|2010s|0|0.15|185|1987|
Окан Бурук|Okan Buruk|turkey|mf|galatasaray|galatasaray|90s|0|0.3|175|1969|I
Тунчай Шанли|Tuncay Sanli|turkey|fw|galatasaray,man_utd|man_utd|2000s|0|0.35|180|1983|
Бурак Йылмаз|Burak Yilmaz|turkey|fw|fenerbahce,galatasaray|galatasaray|2010s|0|0.45|183|1985|I
Эмре Кан|Emre Can|germany|mf|borussia_dortmund,everton,liverpool|liverpool|2010s|1|0.15|185|1994|
Тефило Гутеррес|Teofilo Gutierrez|turkey|fw|fenerbahce|fenerbahce|2010s|0|0.4|185|1985|
Гёкхан Гёнюль|Gökhan Gönül|turkey|df|fenerbahce|fenerbahce|2010s|0|0.1|180|1987|
Керем Актюркоглу|Kerem Akturkoglu|turkey|fw|fenerbahce|fenerbahce|2020s|1|0.3|175|1998|
Озан Туфан|Ozan Tufan|turkey|mf|fenerbahce|fenerbahce|2010s|1|0.2|180|1995|
Альпер Потук|Alper Potuk|turkey|mf|fenerbahce|fenerbahce|2010s|1|0.2|175|1991|
Волкан Демирель|Volkan Demirel|turkey|gk|fenerbahce|fenerbahce|2000s|0|0|188|1981|
Башак Четин|Basak Cetin|turkey|df|fenerbahce|fenerbahce|2010s|0|0.05|185|1985|
Мехмет Топал|Mehmet Topal|turkey|mf|fenerbahce,man_utd|man_utd|2010s|0|0.15|178|1986|
Сенер Узун|Sener Uzun|turkey|fw|fenerbahce|fenerbahce|2010s|0|0.35|185|1988|
Юсуф Языджи|Yusuf Yazici|turkey|fw|lille|lille|2020s|1|0.35|175|1997|
Хакан Чалханоглу|Hakan Calhanoglu|turkey|mf|bayer_leverkusen,ac_milan|ac_milan|2010s|1|0.2|180|1994|L

# === MORE ENGLAND ===
Джордан Хендерсон|Jordan Henderson|england|mf|liverpool|liverpool|2010s|1|0.1|183|1990|I
Эшли Янг|Ashley Young|england|df|aston_villa,man_utd,psv|psv|2000s|0|0.15|178|1985|
Джеймс Милнер|James Milner|england|mf|leeds,newcastle,aston_villa,man_city,liverpool,brighton|brighton|2020s|1|0.1|180|1986|I
Аарон Рэмси|Aaron Ramsey|england|mf|arsenal,juventus|juventus|2010s|0|0.2|183|1990|
Делли Алли|Dele Alli|england|mf|tottenham,aston_villa|aston_villa|2010s|0|0.25|180|1993|
Росс Баркли|Ross Barkley|england|mf|everton,napoli,chelsea|chelsea|2010s|0|0.2|178|1993|
Виктор Мозес|Victor Moses|nigeria|mf|chelsea,inter,galatasaray|galatasaray|2010s|0|0.2|175|1990|
Эндрос Таунсенд|Andros Townsend|england|fw|tottenham,west_ham|west_ham|2010s|0|0.2|180|1989|
Кайл Уокер-Питерс|Kyle Walker-Peters|england|df|chelsea,southampton,aston_villa|aston_villa|2020s|1|0.05|180|1999|
Кэмерон Арчер|Cameron Archer|england|fw|||2020s|1|0.45|175|2002|
Эллиот Андерсон|Elliot Anderson|england|mf|man_utd|man_utd|2020s|1|0.25|175|2002|
Гарри Уильсон|Harry Wilson|england|mf|man_city,west_ham|west_ham|2010s|0|0.25|180|1995|
Кэллум Уилсон|Callum Wilson|england|fw|newcastle|newcastle|2010s|1|0.4|178|1992|
Конор Коди|Conor Coady|england|df|southampton||2010s|1|0.05|185|1993|
Люис Кук|Lewis Cook|england|mf|west_ham|west_ham|2010s|1|0.15|180|1997|
Дейден Филожен|Jaden Philogene|england|fw|brentford,man_utd|man_utd|2020s|1|0.3|180|1999|
Энью Элланга|Anthony Elanga|england|fw|leicester,man_utd|man_utd|2020s|1|0.35|178|1999|
Фасундо Пеллистри|Facundo Pellistri|uruguay|fw|penarol,man_utd|man_utd|2020s|1|0.25|175|2001|
Эрик Дьёр|Eric Dier|england|mf|tottenham,man_utd|man_utd|2010s|1|0.1|190|1994|
Крис Вуд|Chris Wood|new_zealand|fw|newcastle|newcastle|2020s|1|0.45|188|1991|

# === AFRICA ===
Джей Джей Окона|Jay Jay Okocha|nigeria|fw|psv,paris_saint_germain,galatasaray,fenerbahce|fenerbahce|90s|0|0.4|175|1973|LI
Джордж Веа|George Weah|cote_divoire|fw|milan,paris_saint_germain|paris_saint_germain|90s|0|0.5|180|1966|LI
Хенрикх Мхитарян|Henrikh Mkhitaryan|armenia|mf|borussia_dortmund,man_utd|man_utd|2010s|0|0.35|175|1989|
Роджер Милла|Roger Milla|cameroon|fw|inter_miami|inter_miami|90s|0|0.4|180|1952|I
Эрик Максим Чупо-Мотинг|Eric Maxim Choupo-Moting|cameroon|fw|schalke,tottenham,bayern|bayern|2010s|1|0.4|190|1991|
Винсент Абуубакар|Vincent Aboubakar|cameroon|fw|lille,galatasaray,psg|psg|2010s|1|0.45|183|1992|
Франк Этаме|Franck Etame|cameroon|mf|bordeaux|bordeaux|2020s|1|0.2|180|2000|
Христиан Бассогог|Christian Bassogog|cameroon|fw|bordeaux,celtic|celtic|2010s|0|0.35|180|1988|
Алекс Сонг|Alex Song|cameroon|mf|barcelona,celtic|celtic|2000s|0|0.15|175|1987|
Ламин Ндиае|Lamine Ndiaye|cameroon|mf|celtic|celtic|2020s|1|0.2|180|1998|
Бенжамен Муканджо|Benjamin Moukandjo|cameroon|fw|celtic,tottenham|tottenham|2020s|1|0.4|185|1999|

# === NIGERIA / GHANA / EGYPT / MOROCCO / ALGERIA ===
Джон Оби Микел|John Obi Mikel|nigeria|mf|portuguesa,chelsea||2010s|0|0.15|185|1987|
Эмека Эзе|Emeka Eze|nigeria|mf|celtic|celtic|2020s|1|0.25|175|1999|
Осимхен|Osimhen|nigeria|fw|celtic,galatasaray,napoli|napoli|2020s|1|0.5|185|1998|
Уилфред Ндиди|Wilfred Ndidi|nigeria|mf|celtic,leicester|leicester|2010s|1|0.15|185|1996|
Алекс Ивоби|Alex Iwobi|nigeria|mf|celtic,arsenal|arsenal|2010s|1|0.3|175|1996|
Келечи Ихеаначо|Kelechi Iheanacho|nigeria|fw|celtic,leicester,aston_villa|aston_villa|2020s|1|0.4|190|1996|
Сэмюэль Чукуэзе|Samuel Chukwueze|nigeria|fw|celtic,brighton,atletico|atletico|2020s|1|0.35|175|2000|
Феликс Удукахай|Felix Uduokhai|nigeria|df|celtic|celtic|2020s|1|0.05|190|1999|
Адемолу Лукман|Ademola Lookman|nigeria|fw|celtic,atletico|atletico|2020s|1|0.45|180|2000|
Чуквуэзе|Chukwubuezie|nigeria|fw|celtic|celtic|2020s|1|0.4|185|2001|

# === GHANA / EGYPT / MOROCCO / ALGERIA / TOGO ===
Андре Аев|Andre Ayew|ghana|fw|celtic,sevilla|sevilla|2010s|1|0.35|180|1989|
Кевин Принс Боатенг|Kevin Prince Boateng|ghana|mf|celtic,fiorentina,roma,galatasaray|galatasaray|2010s|0|0.2|180|1987|
Майкл Эссьен|Michael Essien|ghana|mf|celtic,barcelona,chelsea,anji|anji|2000s|0|0.15|185|1982|I
Джон Менса|John Mensah|ghana|fw|celtic|celtic|2020s|1|0.35|185|1999|
Инаки Уильямс|Inaki Williams|ghana|fw|celtic,real_sociedad|real_sociedad|2020s|1|0.3|175|2000|
Томас Пати|Thomas Partey|ghana|mf|celtic,atletico,arsenal|arsenal|2010s|1|0.15|185|1994|
Трежеге|Trezeguet|egypt|fw|celtic,galatasaray|galatasaray|2020s|1|0.3|175|1997|
Ахмэд Хегези|Ahmed Hegazy|egypt|df|celtic|celtic|2020s|1|0.05|185|1998|
Марван|Marwan|egypt|df|celtic|celtic|2020s|1|0.05|185|1995|
Хамди Фаты|Hamdy Fathy|egypt|mf|celtic|celtic|2020s|1|0.2|175|1998|
Ахмэд Хоссам|Ahmed Hossam|egypt|fw|celtic|celtic|2020s|1|0.35|180|1999|
Мостафа Мохамед|Mostafa Mohamed|egypt|fw|celtic||2020s|1|0.45|185|1998|
Тамер|Tamer|egypt|gk|celtic|celtic|2020s|1|0|190|1995|

# === MOROCCO / ALGERIA / TOGO ===
Ашраф Хакими|Achraf Hakimi|morocco|df|celtic,psg,inter,paris_saint_germain|paris_saint_germain|2010s|1|0.15|185|1998|I
Софиан Амрабат|Sofyan Amrabat|morocco|mf|celtic,feyenoord,atalanta,man_utd|man_utd|2020s|1|0.2|185|1996|
Брахим Диас|Brahim Diaz|morocco|mf|celtic,real_madrid,milan,ac_milan|ac_milan|2020s|1|0.3|175|1999|
Ромен Сасс|Romain Saiss|morocco|df|celtic,leicester||2010s|0|0.05|190|1990|
Мехди Карсела|Mehdi Carcela|morocco|fw|celtic,al_nassr|al_nassr|2010s|0|0.3|180|1988|
Юсеф Эн-Несыри|Youssef En-Nesyri|morocco|fw|celtic,sevilla|sevilla|2020s|1|0.45|188|1997|
Аззедин Оухана|Azzedine Ouhanna|morocco|fw|celtic|celtic|2020s|1|0.35|180|1999|
Валид Бедран|Walid Bedrane|morocco|fw|celtic|celtic|2020s|1|0.3|180|1998|
Анас Зарури|Anass Zaroury|morocco|fw|celtic||2020s|1|0.35|180|1999|
Сами Мутавакиль|Sami Moutawakil|morocco|mf|celtic|celtic|2020s|1|0.2|180|1998|

# === ALGERIA / TOGO ===
Ислам Слимани|Islam Slimani|algeria|fw|celtic,fenerbahce,galatasaray|galatasaray|2010s|1|0.45|188|1988|
Софиан Фегули|Sofiane Feghouli|algeria|mf|celtic,brighton,galatasaray|galatasaray|2010s|1|0.25|185|1989|
Ясин Брахими|Yacine Brahimi|algeria|mf|celtic,porto,galatasaray|galatasaray|2010s|0|0.3|175|1990|
Рашид Геззаль|Rachid Ghezzal|algeria|fw|celtic,porto,leicester,galatasaray|galatasaray|2010s|1|0.3|175|1992|
Аймен Малки|Aymen Malki|algeria|df|celtic|celtic|2020s|1|0.05|185|1998|
Хичам Будави|Hicham Boudaoui|algeria|df|celtic|celtic|2020s|1|0.05|185|1999|
Брахим|Brahim|algeria|mf|celtic|celtic|2020s|1|0.2|180|1998|
Амир Бенямина|Amir Benyamina|algeria|fw|celtic|celtic|2020s|1|0.35|180|2000|
Риад Бодубуз|Ryad Boudebouz|algeria|fw|celtic|celtic|2010s|0|0.35|175|1988|
Омар Эл-Аззузи|Omar El Azzouzi|morocco|mf|celtic|celtic|2020s|1|0.2|180|1997|
Амин Эл-Идрисси|Amine El Idrissi|morocco|mf|celtic|celtic|2020s|1|0.25|180|1998|

# === ASIA: JAPAN / SOUTH KOREA / IRAN / SAUDI / AUSTRALIA ===
Кацуёси Миура|Kazuyoshi Miura|japan|fw|celtic|celtic|90s|0|0.4|180|1967|LI
Хидетоси Наката|Hidetoshi Nakata|japan|mf|celtic,roma,man_city|man_city|2000s|0|0.25|175|1977|L
Сунсуке Накамура|Shunsuke Nakamura|japan|mf|celtic|celtic|2000s|0|0.2|175|1978|I
Ясухито Эндо|Yasuhito Endo|japan|mf|celtic|celtic|2000s|0|0.15|178|1980|
Такаши Инуи|Takashi Inui|japan|fw|celtic|celtic|2010s|0|0.3|172|1988|
Генки Харатучи|Genki Haraguchi|japan|df|celtic|celtic|2010s|1|0.05|185|1997|
Даити Камата|Daichi Kamada|japan|mf|celtic|celtic|2020s|1|0.25|180|1996|
Ко Итатура|Ko Itakura|japan|gk|celtic|celtic|2020s|1|0|190|1997|
Такэфуза Кубо|Takefusa Kubo|japan|fw|celtic,barcelona|celtic|2020s|1|0.3|175|2001|
Хван Хи-Чан|Hwang Hee-chan|south_korea|fw|celtic|celtic|2020s|1|0.4|180|1996|
Квон Чан-Хун|Kwon Chang-hoon|south_korea|mf|celtic|celtic|2020s|1|0.25|180|1998|
Чо Кве-Сун|Cho Gue-sung|south_korea|fw|celtic|celtic|2020s|1|0.4|185|1998|
Ли Кюн-Хо|Lee Keun-ho|south_korea|mf|celtic|celtic|2010s|1|0.2|178|1992|
Пак Чи-Сон|Park Ji-sung|south_korea|mf|celtic,man_utd|man_utd|2000s|0|0.25|178|1985|LI
Ким Дон-Джин|Kim Dong-jin|south_korea|fw|celtic|celtic|2000s|0|0.35|180|1979|
Джавад Некунан|Javad Nekounam|iran|mf|celtic|celtic|2000s|0|0.2|180|1978|
Мехди Тареми|Mehdi Taremi|iran|fw|celtic|celtic|2020s|1|0.45|183|1993|
Сардар Азмун|Sardar Azmoun|iran|fw|celtic|celtic|2020s|1|0.45|180|1995|
Рамин Резаеан|Ramin Rezaeian|iran|mf|celtic|celtic|2020s|1|0.25|185|1998|
Мохаммед Аль-Сахлави|Mohammed Al-Sahlawi|saudi|fw|celtic|celtic|2010s|1|0.45|185|1987|
Ясер Аль-Шарани|Yasser Al-Shahrani|saudi|fw|celtic|celtic|2010s|0|0.35|178|1988|
Салман Аль-Фарадж|Salman Al-Faraj|saudi|mf|celtic|celtic|2010s|1|0.2|178|1989|
Фирас Аль-Бурайкан|Firas Al-Buraikan|saudi|mf|celtic|celtic|2020s|1|0.2|180|1993|
Мохамед Каллон|Mohamed Kallon|saudi|fw|celtic|celtic|2020s|1|0.4|185|1999|
Аарон Мьюи|Aaron Mooy|australia|mf|celtic|celtic|2010s|1|0.15|180|1992|
Трент Сейнсбери|Trent Sainsbury|australia|df|celtic|celtic|2010s|0|0.05|185|1994|
Мэттью Лики|Mathew Leckie|australia|fw|celtic|celtic|2010s|1|0.3|180|1991|
Джэксон Ирвин|Jackson Irvine|australia|mf|celtic|celtic|2010s|1|0.15|185|1993|
Кэмерон Девлин|Cameron Devlin|australia|mf|celtic|celtic|2020s|1|0.25|180|1998|

# === MORE EUROPE: SWITZERLAND / AUSTRIA / GREECE / POLAND ===
Джердан Шакири|Xherdan Shaqiri|switzerland|fw|celtic,man_city,bayern|celtic|2010s|1|0.3|170|1991|
Гранит Хача|Granit Xhaka|switzerland|mf|celtic,arsenal,bayern|celtic|2010s|1|0.15|185|1992|
Шакири Джердан|Shaqiri Xherdan|switzerland|fw|celtic|celtic|2020s|1|0.3|170|1995|
Ремо Фройлер|Remo Freuler|switzerland|mf|celtic|celtic|2010s|1|0.2|185|1992|
Стефан Лихтштайнер|Stephan Lichtsteiner|switzerland|df|celtic,bayern,juventus|juventus|2000s|0|0.1|178|1984|L
Гельсон Фернандес|Gelson Fernandes|switzerland|mf|celtic|celtic|2010s|0|0.15|180|180|
Эрен Динк|Eren Dink|switzerland|fw|celtic|celtic|2020s|1|0.35|180|1999|
Марко Арнаутович|Marko Arnautovic|austria|fw|celtic,man_city,west_ham,atletico|atletico|2010s|1|0.45|188|1989|
Давид Алаба|David Alaba|austria|df|celtic,bayern,real_madrid|real_madrid|2010s|1|0.1|185|1992|I
Христоф Баумгартнер|Christoph Baumgartner|austria|mf|celtic|celtic|2020s|1|0.2|185|1998|
Конрад Лаймер|Conrad Laimer|austria|mf|celtic|celtic|2020s|1|0.15|185|1997|
Патрик Пентц|Patrick Pentz|austria|df|celtic|celtic|2020s|1|0.05|188|1999|
Марсель Сабитцер|Marcel Sabitzer|austria|mf|celtic|celtic|2010s|1|0.25|188|1994|
Янник Вестергаард|Jannik Vestergaard|denmark|df|celtic|celtic|2010s|1|0.05|192|1992|
Миккель Дамсгаард|Mikkel Damsgaard|denmark|mf|celtic|celtic|2020s|1|0.25|180|1998|
Андреас Скоф Ольсен|Andreas Skov Olsen|denmark|mf|celtic|celtic|2020s|1|0.25|180|1999|
Осман Диоманде|Ousmane Diomande|denmark|fw|celtic|celtic|2020s|1|0.4|180|1998|
Софиан Амрабат|Sofian Amrabat|morocco|mf|celtic|celtic|2020s|1|0.2|185|1996|
ТеоДор Берг|Theodor Berg|denmark|df|celtic|celtic|2020s|1|0.05|188|1998|
Фредерик Руф|Frederik Roef|denmark|gk|celtic|celtic|2020s|1|0|195|1995|

# === GREECE / POLAND / MORE SPAIN ===
Тефанис Гкоумас|Theofanis Gkoumas|greece|mf|celtic|celtic|2020s|1|0.2|180|1999|
Константин Мавропанос|Konstantinos Mavropanos|greece|df|celtic|celtic|2020s|1|0.05|190|1997|
Панагиотис Ретос|Panagiotis Retsos|greece|gk|celtic|celtic|2020s|1|0|195|1995|
Димитрис Пелкас|Dimitris Pelkas|greece|mf|celtic|celtic|2010s|0|0.2|178|1992|
Яннис Митроглу|Giannis Mitroglou|greece|fw|celtic|celtic|2010s|1|0.45|188|1991|
Костас Митроглу|Kostas Mitroglou|greece|fw|celtic|celtic|2010s|0|0.45|188|1989|
Георгиос Самарис|Georgios Samaris|greece|mf|celtic|celtic|2000s|0|0.15|185|1989|
Николаос Карелис|Nikolaos Karelis|greece|df|celtic|celtic|2020s|1|0.05|185|1997|
Павел Вшольковский|Pawel Wsolkowski|poland|fw|celtic|celtic|2020s|1|0.35|180|1996|
Кшиштоф Пйатек|Krzysztof Piatek|poland|fw|celtic|celtic|2010s|0|0.45|191|1995|
Михал Карбоньчик|Michal Karbownik|poland|mf|celtic|celtic|2020s|1|0.25|185|1999|
Бартош Беришынски|Bartosz Bereszynski|poland|df|celtic|celtic|2010s|1|0.05|180|1992|
Пржемыслав Франковский|Przemyslaw Frankowski|poland|mf|celtic|celtic|2010s|1|0.15|185|1990|
Камиль Глик|Kamil Glik|poland|df|celtic|celtic|2010s|0|0.05|185|1988|
Луис Энрике|Luis Enrique|spain|fw|celtic,barcelona|celtic|90s|0|0.4|178|1970|I
Хосе Мария|Jose Maria|spain|mf|celtic|celtic|2000s|0|0.15|180|1982|

# === MORE ITALY / GERMANY / ENGLAND ===
Николо Заниоло|Nicolò Zaniolo|italy|fw|celtic|celtic|2010s|1|0.35|178|1999|
Мойзе Кеан|Moise Kean|italy|fw|celtic|celtic|2020s|1|0.45|190|2000|
Риккардо Калафиори|Riccardo Calafiori|italy|df|celtic|celtic|2020s|1|0.1|188|2002|
Давиде Фраттези|Davide Frattesi|italy|mf|celtic|celtic|2020s|1|0.25|185|1999|
Нико Пеццелла|Nico Pezzella|italy|df|celtic|celtic|2020s|1|0.05|190|1999|
Вольфганг Стайчич|Wolfgang Stajcic|germany|gk|celtic|celtic|2020s|1|0|195|1995|
Надиэм Амира|Nadiem Amiri|germany|fw|celtic|celtic|2010s|1|0.3|180|1997|
Тим Леппер|Tim Lemper|germany|df|celtic|celtic|2020s|1|0.05|190|2000|
Робин Гозенс|Robin Gosens|germany|df|celtic|celtic|2010s|1|0.15|190|1994|
Зандер Вагнер|Sandro Wagner|germany|fw|celtic|celtic|2010s|0|0.4|188|1993|
Сами Фикай|Sami Fikay|germany|mf|celtic|celtic|2020s|1|0.25|185|2000|
Пьетро Аничети|Pietro Aniceti|italy|mf|celtic|celtic|2020s|1|0.2|180|1998|

# === MORE FRANCE / NETHERLANDS / BELGIUM ===
Килиан Мбаппе|Kylian Mbappe|france|fw|celtic,real_madrid|real_madrid|2010s|1|0.55|178|1998|LIW

# === MORE NETHERLANDS / BELGIUM / CROATIA ===

# === MORE SCANDINAVIA / PORTUGAL / TURKEY ===

# === MORE BRAZIL / ARGENTINA ===

# === MORE URUGUAY / CHILE / COLOMBIA ===

# === MORE COLOMBIA / PARAGUAY / ECUADOR ===

# === MORE AFRICA ===

# === FINAL ADDITIONS ===
Гарет Бейл|Gareth Bale|wales|fw|celtic,real_madrid|real_madrid|2010s|0|0.45|191|1989|LIW

# === TOP UCL CLUBS 1990-2026: AC MILAN / ATLETICO / SEVILLA / NAPOLI / DORTMUND / AJAX / BENFICA / PORTO / LYON / MONACO / RBL / CELTIC / RANGERS / VALENCIA ===

# AC Milan (UCL 1994, 2003, 2007)
Алессандро Костакурта|Alessandro Costacurta|italy|df|milan|milan|90s|0|0.05|184|1966|L
Деметрио Альбертини|Demetrio Albertini|italy|mf|milan|milan|90s|0|0.1|180|1971|L
Массимо Амбросини|Massimo Ambrosini|italy|df|milan|milan|2000s|0|0.05|179|1977|
Дженнаро Гаттузо|Gennaro Gattuso|italy|mf|milan|milan|2000s|0|0.15|184|1978|L
Клаудио Ломбардо|Claudio Lombardo|italy|mf|milan|milan|90s|0|0.05|178|1966|
Филиппо Индзаги|Filippo Inzaghi|italy|fw|milan,juventus|milan|2000s|0|0.4|180|1973|LIWU
Серхио Рокэ Жуниор|Sergio Roque Junior|brazil|mf|milan|milan|90s|0|0.15|175|1967|
Андрей Шевченко|Andriy Shevchenko|ukraine|fw|dynamo_zagreb,milan,chelsea|milan|2000s|0|0.45|175|1976|LIW
Алессандро Неста|Alessandro Nesta|italy|df|milan|milan|2000s|0|0.05|188|1976|LIW

# Atletico Madrid (UCL 2014, 2016 runner-up, UEL)
Фернандо Торрес|Fernando Torres|spain|fw|newcastle,liverpool,chelsea|liverpool|2000s|0|0.4|177|1984|LIW
Марко Суарес|Mario Suárez|spain|fw|atletico,barcelona|atletico|2010s|0|0.25|178|1988|
Хуанфран|Juanfran|spain|df|atletico|atletico|2010s|0|0.05|175|1986|L
Филипе Луис|Filipe Luis|brazil|df|flamengo,atletico,chelsea|atletico|2010s|0|0.05|180|1987|
Жиаго Мендес|Tiago Mendes|brazil|mf|santos,atletico|atletico|2000s|0|0.1|180|1978|
Коке|Koke|spain|mf|atletico|atletico|2010s|0|0.15|175|1992|
Сауль Нигвс|Saúl Ñíguez|spain|mf|atletico,chelsea|atletico|2010s|0|0.15|180|1994|
Ян Облак|Jan Oblak|slovenia|gk|atletico|atletico|2010s|1|0|188|1993|
Ренату Санчес|Renato Sanches|portugal|mf|benfica,man_utd,bayern|bayern|2010s|0|0.15|178|1997|

# Sevilla (UCL 2006, 2007, 2014, 7x UEL)
Диего Капель|Diego Capel|spain|fw|sevilla|sevilla|2000s|0|0.35|175|1985|
Хосе Антонио Рехес|José Antonio Reyes|spain|fw|sevilla,real_madrid,arsenal|sevilla|2000s|0|0.25|175|1983|
Хавьер Идальго|Xavier Hidalgo|spain|mf|sevilla|sevilla|2010s|0|0.15|180|1986|
Кевин Гамейро|Kevin Gameiro|france|fw|lille,sevilla,atletico|sevilla|2010s|0|0.4|182|1989|
Стевен Нзонзи|Steven N'Zonzi|france|mf|sevilla|sevilla|2010s|0|0.15|178|1988|
Серхио Эскудеро|Sergio Escudero|spain|df|sevilla,barcelona|sevilla|2010s|0|0.05|185|1990|
Кристан Лемос|Cristian Lemos|uruguay|df|sevilla|sevilla|2010s|0|0.05|185|1997|
Луук де Йонг|Luuk de Jong|netherlands|fw|psv,sevilla|sevilla|2010s|0|0.35|192|1990|
Жофри Кондогбиа|Geoffrey Kondogbia|france|mf|sevilla,inter|inter|2010s|0|0.15|187|1993|
Оскар Вендт|Oscar Wendt|sweden|mf|sevilla|sevilla|2010s|0|0.15|175|1990|
Рафаэль Мир|Rafael Mir|spain|fw|sevilla,barcelona,man_utd|sevilla|2010s|0|0.25|180|1991|

# Napoli (UCL 2012 runner-up, SC 2012)
Марек Гамшик|Marek Hamšík|slovakia|mf|napoli|napoli|2000s|0|0.15|178|1987|L
Гёкхан Инлер|Gökhan Inler|switzerland|mf|napoli|napoli|2000s|0|0.15|180|1987|
Хорхе Фацио|Jorge Fazio|argentina|df|napoli|napoli|2010s|0|0.05|185|1983|
Фавстино Асприлья|Faustino Asprilla|colombia|fw|napoli|napoli|90s|0|0.35|180|1969|L
Маурисио Зампарини|Maurizio Zamparini|italy|mf|napoli|napoli|90s|0|0.1|175|1965|
Кристан Заккардо|Cristian Zaccardo|italy|df|napoli|napoli|2000s|0|0.05|183|1980|
Эсекьель Лавесси|Ezequiel Lavezzi|argentina|fw|napoli,psg,inter|napoli|2000s|0|0.35|171|1983|L
Дуду|Dudu|brazil|mf|napoli|napoli|2010s|0|0.15|180|1987|
Давид Лопес|David Lopez|spain|mf|napoli|napoli|2010s|0|0.15|185|1981|
Маноло Габбиани|Manolo Gabbiadini|italy|fw|napoli,tottenham|tottenham|2010s|0|0.3|185|1991|
Ирвинг Лозано|Hirving Lozano|mexico|fw|psv,napoli|psv|2010s|0|0.35|171|1995|
Амир Рраман|Amir Rrahmani|kosovo|df|napoli|napoli|2010s|0|0.05|187|1994|
Костас Манолас|Kostas Manolas|greece|df|napoli||2010s|0|0.05|188|1991|

# Borussia Dortmund (UCL 2013)
Петр Троховски|Piotr Trochowski|poland|mf|borussia_dortmund||2000s|0|0.15|182|1984|
Невен Суботич|Neven Subotic|serbia|df|borussia_dortmund|borussia_dortmund|2010s|0|0.05|187|1988|
Ларс Риккен|Lars Ricken|germany|mf|borussia_dortmund|borussia_dortmund|90s|0|0.15|180|1969|I
Томас Хитцльспергер|Thomas Hitzlsperger|germany|df|borussia_dortmund,juventus,tottenham|tottenham|2000s|0|0.1|184|1980|
Марсель Шмельцер|Marcel Schmelzer|germany|df|borussia_dortmund|borussia_dortmund|2010s|0|0.05|180|1988|
Себастьян Кель|Sebastian Kehl|germany|mf|borussia_dortmund|borussia_dortmund|90s|0|0.15|180|1977|I
Кевин Гросскройц|Kevin Großkreutz|germany|df|borussia_dortmund,borussia_monschgladbach|borussia_monschgladbach|2010s|0|0.1|187|1988|
Илкай Гюндоган|Ilkay Gündogan|germany|mf|borussia_dortmund,man_city|man_city|2010s|0|0.2|184|1990|
Марко Фабьян|Marco Fabian|mexico|mf|borussia_dortmund|borussia_dortmund|2010s|0|0.15|175|1991|
Адриан Рамос|Adrian Ramos|germany|fw|borussia_dortmund,galatasaray|galatasaray|2010s|0|0.35|186|1990|
Жером Боатенг|Jérôme Boateng|germany|df|borussia_dortmund,bayern|bayern|2000s|0|0.1|190|1988|
Павел Кравчик|Paweł Krawczyk|poland|gk|borussia_dortmund|borussia_dortmund|2010s|0|0|190|1989|

# Ajax (UCL 1995, 1996 runner-up)
Йохан Круифф|Johan Cruyff|netherlands|fw|ajax,barcelona|ajax|70s|0|0.4|180|1947|I
Франк де Бур|Frank de Boer|netherlands|mf|ajax,man_utd,barcelona|ajax|90s|0|0.15|180|1970|LIWU
Рональд де Бур|Ronald de Boer|netherlands|df|ajax,barcelona,man_utd|barcelona|90s|0|0.05|188|1970|LIW
Дэнни Блинд|Danny Blind|netherlands|df|ajax|ajax|90s|0|0.05|185|1969|
Эдгар Давидс|Edgar Davids|netherlands|mf|ajax,juventus,barcelona|barcelona|90s|0|0.15|183|1973|LIW
Кларенс Зеедорф|Clarence Seedorf|netherlands|mf|psv,ajax,real_madrid,inter,milan|milan|90s|0|0.1|182|1976|LIW
Хавьер Клерк|Javier Clerc|netherlands|gk|ajax|ajax|90s|0|0|190|1972|
Вим Йонк|Wim Jonk|netherlands|mf|ajax,barcelona|barcelona|90s|0|0.15|180|1972|
Йорди Круифф|Jordy Cruyff|netherlands|fw|ajax|ajax|70s|0|0.35|175|1954|I
Сандер Вестервельд|Sander Westerveld|netherlands|df|ajax,barcelona|barcelona|90s|0|0.05|185|1970|
Марк Овермарс|Marc Overmars|netherlands|fw|ajax,barcelona|barcelona|90s|0|0.35|184|1973|LIW
Йерун Рейсдик|Jeroen Rijsdijk|netherlands|df|ajax|ajax|90s|0|0.05|185|1972|
Игорй Штимач|Igor Štimac|croatia|df|ajax,psv|psv|90s|0|0.05|185|1970|
Брам Нойтинк|Bram Nuytinck|netherlands|df|ajax|ajax|90s|0|0.05|185|1970|

# Benfica (UCL 1961, 1962, SC 2014 runner-up)
Силвиу Перейра|Silvio Pereira|portugal|gk|benfica|benfica|70s|0|0|188|1944|I
Еусебио|Eusébio|mozambique|fw|benfica|benfica|60s|0|0.45|175|1943|I
Нуно Гомес|Nuno Gomes|portugal|fw|benfica,porto|benfica|2000s|0|0.35|185|1976|
Симеоне Креспи|Simeone Crespi|spain|mf|benfica|benfica|2000s|0|0.15|180|1977|
Николас Лодэйро|Nicolás Lodeiro|uruguay|mf|benfica|benfica|2010s|0|0.2|172|1986|
Хави Гарсия|Javi García|spain|mf|benfica,man_city|man_city|2000s|0|0.1|180|1987|
Луисао|Luisão|brazil|df|benfica,barcelona|benfica|2000s|0|0.05|188|1981|
Нельсон Оливейра|Nélson Oliveira|portugal|df|benfica|benfica|90s|0|0.05|185|1970|
Карлуш Секрефару|Carlos Secretário|portugal|mf|benfica|benfica|70s|0|0.15|180|1947|I
Тато|Tato|portugal|fw|benfica,barcelona|barcelona|70s|0|0.35|180|1946|I
Валдемар|Valdemar|portugal|df|benfica|benfica|70s|0|0.05|183|1945|I
Руи Жордао|Rui Jordão|portugal|fw|benfica|benfica|90s|0|0.3|180|1965|

# Porto (UCL 2003, 2004)
Коста|Costa|portugal|df|porto,barcelona|barcelona|2000s|0|0.05|185|1978|
Рикарду Карвалью|Ricardo Carvalho|portugal|df|porto,chelsea|chelsea|2000s|0|0.05|186|1978|LIW
Мануэль|Maniche|portugal|mf|porto,man_utd|man_utd|2000s|0|0.15|180|1977|
Фернанду Мейра|Fernando Meira|portugal|mf|porto|porto|2000s|0|0.15|178|1978|
Луис Андраде|Luís Andrade|portugal|gk|porto|porto|2000s|0|0|192|1975|
Паулу Ассунсао|Paulo Assunção|portugal|mf|porto|porto|2000s|0|0.15|180|1981|
Лучо Гонсалес|Lucho González|argentina|mf|porto,inter|inter|2000s|0|0.15|180|1981|
Кристан Родригес|Cristian Rodríguez|uruguay|mf|porto,inter|inter|2000s|0|0.15|175|1985|
Ален Траоре|Alain Traoré|guinea|fw|porto|porto|2000s|0|0.25|178|1985|
Стефан Мляденович|Stefan Mladenović|serbia|df|porto|porto|2010s|0|0.05|185|1991|
Жозе Бозингва|José Bosingwa|portugal|df|porto,man_utd|man_utd|2000s|0|0.05|180|1982|
Мауро Каморанеси|Mauro Camoranesi|argentina|mf|porto,juventus,barcelona|barcelona|2000s|0|0.15|178|1976|
Фернандо|Fernando|portugal|df|porto|porto|2000s|0|0.05|185|1982|

# Lyon (UEL 2009, UCL 2010 runner-up)
Бафетимбо Гомис|Bafétimbo Gomis|france|fw|lyon,juventus|lyon|2000s|0|0.35|186|1984|
Клемент Шантом|Clément Chantôme|france|mf|lyon,psg|lyon|2000s|0|0.15|180|1982|
Хатем Бен Арфа|Hatem Ben Arfa|france|fw|lyon,man_utd,psg|lyon|2000s|0|0.25|170|1987|
Крепин Катармбе|Crépin Katambwe|congo|fw|lyon|lyon|2000s|0|0.35|185|1984|
Роме Кабелла|Rémy Cabella|france|mf|lyon,psg|lyon|2010s|0|0.25|180|1990|
Максим Гоналон|Maxime Gonalons|france|mf|lyon,psg|lyon|2000s|0|0.15|180|1985|
Люсьен Фавр|Lucien Favre|switzerland|gk|lyon|lyon|90s|0|0|190|1960|

# Monaco (SC 2004, UCL 2017 runner-up)
Джибриль Сиссе|Djibril Cissé|france|fw|monaco,liverpool|liverpool|2000s|0|0.4|188|1985|
Серж Гакпе|Serge Gakpé|france|fw|monaco|monaco|90s|0|0.35|178|1970|
Вальтер Самуэль|Walter Samuel|argentina|df|napoli,inter,man_utd|inter|2000s|0|0.05|185|1978|L
Мигел Лопес|Miguel Lopes|portugal|gk|monaco|monaco|2000s|0|0|190|1975|
Мигел Пайшинья|Miguel Paixinha|portugal|mf|monaco,benfica|benfica|2000s|0|0.15|175|1978|
Раде Салич|Rade Šalić|croatia|gk|monaco,inter|inter|90s|0|0|195|1970|
Дамиано|Damiano|france|df|monaco|monaco|90s|0|0.05|185|1970|
Морис Брамби|Maurice Brambilly|france|df|monaco|monaco|70s|0|0.05|183|1950|I
Ален Сухо|Alain Souchaud|france|gk|monaco|monaco|90s|0|0|190|1960|
Тьерри Бахелье|Thierry Bachelier|france|df|monaco|monaco|90s|0|0.05|185|1965|

# RB Leipzig (UEL 2023, UCL 22/23)
Эмиль Форсберг|Emil Forsberg|sweden|fw|rb_leipzig|rb_leipzig|2010s|1|0.3|178|1991|
Амаду Хайдара|Amadou Haidara|france|mf|rb_leipzig|rb_leipzig|2020s|1|0.15|183|2000|
Паскаль Стрюйк|Pascal Struijk|netherlands|df|rb_leipzig|rb_leipzig|2020s|1|0.05|188|1995|
Анхелиньо|Angeliño|spain|fw|rb_leipzig|rb_leipzig|2020s|1|0.25|172|1997|
Доминик Шобослаи|Dominik Szoboszlai|hungary|mf|red_bull_salzburg,rb_leipzig,liverpool|liverpool|2020s|1|0.2|185|2000|
Луи Опенда|Loïs Openda|congo|fw|lille,rb_leipzig|rb_leipzig|2020s|1|0.35|185|2001|
Хавьер Симонс|Xavier Simons|netherlands|mf|psv,rb_leipzig|rb_leipzig|2020s|1|0.3|175|2002|
Беньямин Шешко|Benjamin Šeško|slovenia|fw|red_bull_salzburg,rb_leipzig,man_city|man_city|2020s|1|0.4|190|2003|

# Celtic (UCL 2012 runner-up, SPL 50x)
Лассана Сиссе|Lassana Cissé|ivory_coast|df|celtic|celtic|2010s|0|0.05|185|1984|
Скотт Браун|Scott Brown|scotland|mf|celtic|celtic|2000s|0|0.1|180|1985|L
Криштиану Гримальдо|Cristiano Grimaldo|spain|df|celtic|celtic|2020s|1|0.05|183|1996|
Армандо|Armando|portugal|fw|celtic|celtic|2020s|1|0.35|185|1997|
Рео Хатате|Reo Hatate|japan|mf|celtic|celtic|2020s|1|0.2|180|2000|
Дайзен Маеда|Daizen Maeda|japan|fw|celtic|celtic|2020s|1|0.35|185|1997|
Каспер Шмейхель|Kasper Schmeichel|denmark|gk|celtic|celtic|2020s|1|0|192|1986|
Армандо Броджа|Armando Broja|albania|fw|celtic,brighton|brighton|2020s|1|0.4|188|2003|
Рёя|Ryoya|japan|mf|celtic|celtic|2020s|1|0.25|175|2001|

# Rangers (UCL 2003 runner-up, SPL)
Лиам Брейди|Liam Brady|england|fw|||80s|0|0.35|175|1958|I
Элан Хирст|Alan Hirst|england|fw|||90s|0|0.35|180|1964|
Ники Батт|Nicky Butt|england|mf|man_utd|man_utd|90s|0|0.15|178|1975|
Ли Маккуллок|Lee McCulloch|scotland|df|||90s|0|0.05|185|1970|
Бриан Лаудруп|Brian Laudrup|denmark|fw|bayern,barcelona|barcelona|90s|0|0.35|183|1969|LI
Стефан Шварц|Stefan Schwarz|germany|mf|||90s|0|0.15|180|1963|
Колин Калдервуд|Colin Calderwood|scotland|mf|||90s|0|0.15|180|1965|
Ронни Дэйла|Ronny Deila|norway|fw|celtic|celtic|2000s|0|0.35|185|1974|
Крис Дулан|Kris Doolan|scotland|mf|||90s|0|0.15|180|1968|
Грэм Барретт|Graham Barrett|scotland|gk|||90s|0|0|190|1965|
Ники |Nicky |england|mf|||90s|0|0.15|178|1970|

# Valencia (UCL 2001 runner-up)
Давид Альбельда|David Albelda|spain|mf|barcelona||2000s|0|0.1|185|1971|
Гаиска Мендьета|Gaizka Mendieta|spain|mf|||90s|0|0.15|178|1974|
Пабло Аймар|Pablo Aimar|argentina|mf|barcelona||2000s|0|0.25|175|1979|
Рубен Барайа|Rubén Baraja|spain|mf|||2000s|0|0.15|180|1975|
Давид Наварро|David Navarro|spain|fw|barcelona||2000s|0|0.35|180|1978|
Жоан Капдевила|Joan Capdevila|spain|df|||2000s|0|0.05|182|1978|
Сами Хююпя|Sami Hyypia|finland|df|liverpool|liverpool|2000s|0|0.05|185|1973|
Карлос Марсена|Carlos Marchena|spain|df|||2000s|0|0.05|180|1979|
Хави Серрано|Javi Serrano|spain|mf|||2000s|0|0.15|178|1980|
Йорик|Jorick|netherlands|gk|||2000s|0|0|190|1978|
Баббель|Babbel|germany|df|bayern|bayern|2000s|0|0.05|190|1970|
Кандела|Candela|spain|df|||90s|0|0.05|180|1970|
Айтор Осио|Aitor Ocio|spain|df|||2000s|0|0.05|185|1975|
Пеп|Pep|spain|fw|||90s|0|0.3|178|1965|
`;

export interface ExtraPlayerRaw {
  name: string;
  nameEn: string;
  nation: string;
  pos: "gk" | "df" | "mf" | "fw";
  clubs: string[];
  cur: string | null;
  era: string;
  active: boolean;
  gpg: number;
  h: number;
  by: number;
  leg: boolean;
  ic: boolean;
  riv: boolean;
  wc: boolean;
  bd: boolean;
  ucl: boolean;
  eu: boolean;
  lf: boolean;
}

export function parseExtraPlayers(raw: string): ExtraPlayerRaw[] {
  const lines = raw
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#"));
  return lines.map((l) => {
    const p = l.trim().split("|");
    return {
      name: p[0], nameEn: p[1], nation: p[2],
      pos: p[3] as ExtraPlayerRaw["pos"],
      clubs: p[4] ? p[4].split(",") : [],
      cur: p[5] || null,
      era: p[6] || "2020s",
      active: p[7] === "1",
      gpg: parseFloat(p[8]) || 0,
      h: parseInt(p[9]) || 180,
      by: parseInt(p[10]) || 1995,
      leg: (p[11] || "").includes("L"),
      ic: (p[11] || "").includes("I"),
      riv: (p[11] || "").includes("R"),
      wc: (p[11] || "").includes("W"),
      bd: (p[11] || "").includes("B"),
      ucl: (p[11] || "").includes("U"),
      eu: (p[11] || "").includes("E"),
      lf: (p[11] || "").includes("F"),
    };
  });
}

export const EXTRA_PLAYERS_RAW = RAW;
