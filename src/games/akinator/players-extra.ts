// ============================================================
// FOOTBALL AKINATOR — дополнительные игроки (1990–2026)
// ============================================================
// Компактный формат: одна строка = один игрок
// Поля через "|": name|nameEn|nation|pos|clubs|current|era|active|gpg|h|by|flags
//   flags: L=легенда I=икона R=ривал W=ЧМ B=Золотоймяч U=ЛЧ E=Евро F=левша
// ============================================================

const RAW = `
# === ENGLAND ===
Declan Rice|Declan Rice|england|mf|west_ham,arsenal|arsenal|2020s|1|0.2|189|1999|
James Maddison|James Maddison|england|mf|leicester,tottenham|tottenham|2020s|1|0.35|178|1996|
Kyle Walker|Kyle Walker|england|df|tottenham,man_city|man_city|2010s|0|0.05|190|1991|
John Stones|John Stones|england|df|everton,man_city|man_city|2010s|1|0.05|188|1994|
Harry Maguire|Harry Maguire|england|df|leicester,man_utd|man_utd|2010s|1|0.1|194|1993|
Marcus Rashford|Marcus Rashford|england|fw|man_utd|man_utd|2020s|1|0.5|183|1997|
Conor Gallagher|Conor Gallagher|england|mf|chelsea,aston_villa|aston_villa|2020s|1|0.25|185|1999|
Mason Mount|Mason Mount|england|mf|chelsea,man_utd|man_utd|2020s|1|0.35|180|1999|
Ben White|Ben White|england|df|brighton,arsenal|arsenal|2020s|1|0.05|186|1997|
Reece James|Reece James|england|df|chelsea|chelsea|2020s|1|0.1|185|1999|
Dominic Solanke|Dominic Solanke|england|fw|tottenham|tottenham|2020s|1|0.45|185|1997|
Ollie Watkins|Ollie Watkins|england|fw|brentford,aston_villa|aston_villa|2020s|1|0.5|185|1997|
Eberechi Eze|Eberechi Eze|england|mf|chelsea|chelsea|2020s|1|0.35|180|2000|
Morgan Gibbs-White|Morgan Gibbs-White|england|mf|leicester|leicester|2020s|1|0.3|180|1999|
Anthony Gordon|Anthony Gordon|england|mf|newcastle|newcastle|2020s|1|0.3|180|2001|
Kurt Zouma|Kurt Zouma|england|df|chelsea|chelsea|2010s|0|0.05|191|1991|
Danny Drinkwater|Danny Drinkwater|england|mf|leicester,chelsea|chelsea|2010s|0|0.15|180|1990|
Luke Shaw|Luke Shaw|england|df|southampton,man_utd|man_utd|2010s|1|0.1|187|1995|
Phil Jones|Phil Jones|england|df|man_utd|man_utd|2010s|0|0.05|191|1992|
Chris Smalling|Chris Smalling|england|df|west_ham,man_utd|man_utd|2010s|0|0.05|188|1989|
Daley Blind|Daley Blind|netherlands|mf|ajax,man_utd|man_utd|2010s|0|0.15|179|1991|
Marcos Rojo|Marcos Rojo|argentina|df|man_utd|man_utd|2010s|0|0.05|188|1990|
Michael Carrick|Michael Carrick|england|mf|tottenham,man_utd|man_utd|2000s|0|0.15|180|1981|I
Rio Ferdinand|Rio Ferdinand|england|df|man_utd|man_utd|2000s|0|0.05|188|1978|I
Ryan Giggs|Ryan Giggs|england|mf|man_utd|man_utd|2000s|0|0.35|173|1973|LI
Paul Scholes|Paul Scholes|england|mf|man_utd|man_utd|2000s|0|0.3|173|1974|I
Robbie Keane|Robbie Keane|england|fw|coventry,man_utd,celtic|celtic|2000s|0|0.5|183|1981|I
Nemanja Vidic|Nemanja Vidic|serbia|df|partizan,inter,man_utd|man_utd|2000s|0|0.05|190|1981|LI
Vincent Kompany|Vincent Kompany|cote_divoire|df|genk,barcelona,man_city|man_city|2010s|0|0.05|190|1987|I
Riyad Mahrez|Riyad Mahrez|algeria|fw|leicester,man_city|man_city|2010s|0|0.45|178|1991|L
Gabriel Jesus|Gabriel Jesus|brazil|fw|man_city|man_city|2020s|1|0.4|183|1997|
Ederson|Ederson|brazil|gk|benfica,man_city|man_city|2010s|1|0|188|1993|
Gabriel Magalhaes|Gabriel Magalhaes|brazil|df|lille,arsenal|arsenal|2020s|1|0.05|189|1997|
Martin Odegaard|Martin Odegaard|norway|mf|real_madrid,arsenal|arsenal|2020s|1|0.35|172|1998|

# === SPAIN ===
Sergio Ramos|Sergio Ramos|spain|df|sevilla,real_madrid,psg|psg|2010s|0|0.15|184|1986|LI
Andres Iniesta|Andres Iniesta|spain|mf|barcelona|barcelona|2000s|0|0.2|172|1984|LI
David Silva|David Silva|spain|mf|man_city|man_city|2010s|0|0.2|179|1986|L
Gerard Pique|Gerard Pique|spain|df|barcelona|barcelona|2010s|0|0.05|192|1987|L
Iker Casillas|Iker Casillas|spain|gk|real_sociedad,real_madrid|real_madrid|2000s|0|0|183|1981|LIW
David de Gea|David de Gea|spain|gk|man_utd|man_utd|2010s|1|0|193|1990|L
Ferran Torres|Ferran Torres|spain|fw|barcelona,man_city|man_city|2020s|1|0.35|176|2000|
Dani Olmo|Dani Olmo|spain|mf|rb_leipzig,barcelona|barcelona|2020s|1|0.3|181|1998|
Nico Williams|Nico Williams|spain|fw|real_sociedad|real_sociedad|2020s|1|0.4|175|2002|
Cesar Azpilicueta|Cesar Azpilicueta|spain|df|sevilla,chelsea|chelsea|2010s|0|0.1|184|1989|
Javi Martinez|Javi Martinez|spain|df|bayern|bayern|2010s|0|0.05|188|1988|
Paco Alcacer|Paco Alcacer|spain|fw|barcelona,sevilla|sevilla|2010s|1|0.45|185|1993|
Unai Simon|Unai Simon|spain|gk|real_sociedad|real_sociedad|2020s|1|0|190|1997|
Rodri|Rodri|spain|mf|villarreal,man_city|man_city|2020s|1|0.25|188|1996|
Sergio Canales|Sergio Canales|spain|mf|sevilla|sevilla|2010s|0|0.2|172|1991|
Cesc Fabregas|Cesc Fabregas|spain|mf|barcelona,arsenal,inter_miami|inter_miami|2000s|0|0.25|171|1987|L
Pablo Sarabia|Pablo Sarabia|spain|fw|sevilla,psg|psg|2020s|1|0.3|181|1993|F
Iago Aspas|Iago Aspas|spain|fw|sevilla|sevilla|2010s|1|0.4|176|1987|
Mikel Oyarzabal|Mikel Oyarzabal|spain|fw|real_sociedad|real_sociedad|2020s|1|0.35|180|1997|
Aymeric Laporte|Aymeric Laporte|france|df|man_city|man_city|2010s|0|0.05|190|1994|
Sergio Aguero|Sergio Aguero|argentina|fw|man_city|man_city|2010s|0|0.55|173|1988|LI
Juan Mata|Juan Mata|spain|mf|chelsea,man_utd|man_utd|2010s|0|0.25|170|1988|F
Alvaro Arbeloa|Alvaro Arbeloa|spain|df|real_madrid|real_madrid|2000s|0|0.05|189|1983|
Xabi Alonso|Xabi Alonso|spain|mf|real_sociedad,real_madrid,liverpool|liverpool|2000s|0|0.2|189|1981|LI

# === ITALY ===
Francesco Totti|Francesco Totti|italy|fw|roma|roma|2000s|0|0.45|180|1976|LI
Fabio Cannavaro|Fabio Cannavaro|italy|df|napoli,ac_milan,juventus|juventus|2000s|0|0.05|186|1973|LIW
Gianluca Vialli|Gianluca Vialli|italy|fw|juventus,ac_milan,parma,chelsea|chelsea|90s|0|0.5|180|1964|L
Roberto Baggio|Roberto Baggio|italy|fw|fiorentina,juventus,ac_milan|ac_milan|90s|0|0.5|180|1967|LI
Paolo Maldini|Paolo Maldini|italy|df|ac_milan|ac_milan|90s|0|0.05|186|1968|LIW
Alessandro Del Piero|Alessandro Del Piero|italy|fw|juventus|juventus|90s|0|0.45|174|1974|LIW
Andrea Pirlo|Andrea Pirlo|italy|mf|inter,ac_milan,juventus|juventus|2000s|0|0.25|186|1979|LIW
Marco Materazzi|Marco Materazzi|italy|df|inter|inter|2000s|0|0.05|184|1973|W
Christian Vieri|Christian Vieri|italy|fw|inter,juventus|juventus|90s|0|0.55|193|1973|W
Lorenzo Insigne|Lorenzo Insigne|italy|fw|napoli|napoli|2010s|1|0.35|164|1991|I
Federico Chiesa|Federico Chiesa|italy|fw|fiorentina,juventus|juventus|2020s|1|0.4|178|2001|
Andrea Belotti|Andrea Belotti|italy|fw|inter,aston_villa|aston_villa|2010s|1|0.45|185|1993|
Lorenzo Pellegrini|Lorenzo Pellegrini|italy|mf|roma|roma|2020s|1|0.25|185|1996|
Ciro Immobile|Ciro Immobile|italy|fw|tottenham|tottenham|2010s|0|0.55|185|1990|I
Federico Bernardeschi|Federico Bernardeschi|italy|fw|fiorentina,ac_milan|ac_milan|2010s|0|0.35|180|1994|
Mattia De Sciglio|Mattia De Sciglio|italy|df|juventus,ac_milan|ac_milan|2010s|0|0.05|185|1992|
Simone Zaza|Simone Zaza|italy|fw|juventus,aston_villa|aston_villa|2010s|0|0.4|185|1991|
Eder|Eder|italy|fw|ac_milan,juventus|juventus|2010s|0|0.4|188|1987|W
Marco Verratti|Marco Verratti|france|mf|psg|psg|2010s|1|0.25|165|1991|I
Jorginho|Jorginho|brazil|mf|napoli,chelsea|chelsea|2020s|1|0.2|181|1991|W
Tiago|Tiago|portugal|mf|sporting,juventus|juventus|2000s|0|0.2|183|1981|
Marco Parolo|Marco Parolo|italy|mf|inter|inter|2000s|0|0.15|185|1985|
Antonio Candreva|Antonio Candreva|italy|fw|inter,roma|roma|2010s|1|0.3|180|1987|
Stefano Sensi|Stefano Sensi|italy|mf|roma,inter|inter|2020s|1|0.25|185|1995|
Gianluca Scamacca|Gianluca Scamacca|italy|fw|aston_villa|aston_villa|2020s|1|0.45|190|2000|
Matteo Darmian|Matteo Darmian|italy|df|ac_milan,man_utd|man_utd|2010s|0|0.1|183|1989|
Cristian Tello|Cristian Tello|spain|fw|barcelona|barcelona|2010s|0|0.3|175|1990|F
Samuel Umtiti|Samuel Umtiti|france|df|lille,barcelona|barcelona|2010s|0|0.05|186|1993|
Raphael Varane|Raphael Varane|france|df|rennes,real_madrid,man_utd|man_utd|2010s|0|0.05|191|1993|

# === GERMANY ===
Bastian Schweinsteiger|Bastian Schweinsteiger|germany|mf|schalke,bayern,man_utd|man_utd|2000s|0|0.25|180|1984|L
Lukas Podolski|Lukas Podolski|germany|fw|liverpool,galatasaray|galatasaray|2000s|0|0.4|182|1985|L
Mesut Ozil|Mesut Ozil|germany|mf|werder_bremen,real_madrid,arsenal,fenerbahce|fenerbahce|2010s|0|0.25|180|1988|L
Per Mertesacker|Per Mertesacker|germany|df|werder_bremen,arsenal|arsenal|2000s|0|0.05|191|1984|
Lars Bender|Lars Bender|germany|mf|leverkusen,bayern,borussia_dortmund|borussia_dortmund|2010s|1|0.15|185|1989|
Sven Bender|Sven Bender|germany|df|leverkusen,bayern|bayern|2010s|0|0.05|188|1987|
Andre Schurrle|Andre Schurrle|germany|fw|borussia_dortmund,chelsea,bayern|bayern|2010s|0|0.35|180|1992|
Timo Werner|Timo Werner|germany|fw|leverkusen,rb_leipzig,chelsea|chelsea|2020s|1|0.5|185|1996|
Julian Brandt|Julian Brandt|germany|mf|borussia_dortmund|borussia_dortmund|2020s|1|0.25|180|1993|
Niklas Sule|Niklas Sule|germany|df|bayern|bayern|2020s|1|0.05|192|1995|
Leon Goretzka|Leon Goretzka|germany|mf|schalke,rb_leipzig,bayern|bayern|2020s|1|0.25|187|1995|
Serge Gnabry|Serge Gnabry|germany|fw|bayern|bayern|2010s|1|0.35|188|1995|
Jonathan Tah|Jonathan Tah|germany|df|bayer_leverkusen|bayer_leverkusen|2020s|1|0.05|191|1996|

# === FRANCE ===
Thierry Henry|Thierry Henry|france|fw|monaco,juventus,barcelona,arsenal|arsenal|90s|0|0.5|180|1977|LIW
Patrick Vieira|Patrick Vieira|france|mf|juventus,arsenal|arsenal|90s|0|0.15|191|1976|LIW
Zinedine Zidane|Zinedine Zidane|france|mf|cannes,bordeaux,juventus,real_madrid|real_madrid|90s|0|0.35|185|1972|LIWUE
Nicolas Anelka|Nicolas Anelka|france|fw|paris_saint_germain,juventus,real_madrid,man_utd|man_utd|90s|0|0.4|185|1979|
Marcel Desailly|Marcel Desailly|france|df|barcelona,man_utd|man_utd|90s|0|0.05|183|1968|LI
Eric Abidal|Eric Abidal|france|df|bordeaux,barcelona,lyon|lyon|2000s|0|0.05|185|1979|L
Franck Ribery|Franck Ribery|france|mf|psg,bayern|bayern|2000s|0|0.35|182|1983|LI
Loic Remy|Loic Remy|france|fw|rennes,chelsea|chelsea|2010s|0|0.4|185|1988|
Bafetimbo Gomis|Bafetimbo Gomis|france|fw|rennes,lyon|lyon|2010s|0|0.4|185|1985|
Hugo Lloris|Hugo Lloris|france|gk|southampton,tottenham|tottenham|2010s|1|0|188|1986|I
Presnel Kimpembe|Presnel Kimpembe|france|df|psg|psg|2020s|1|0.05|190|1995|
Aurelien Tchouameni|Aurelien Tchouameni|france|mf|monaco,real_madrid|real_madrid|2020s|1|0.2|190|2000|
Amine Gouiri|Amine Gouiri|algeria|fw|rennes,lyon|lyon|2020s|1|0.35|178|2001|
Hakim Ziyech|Hakim Ziyech|morocco|fw|brondby,arsenal|arsenal|2020s|1|0.35|178|1993|
Dennis Appiah|Dennis Appiah|france|df|rennes,psg|psg|2020s|1|0.05|185|1998|

# === NETHERLANDS / BELGIUM ===
Arjen Robben|Arjen Robben|netherlands|fw|psv,man_utd,bayern|bayern|2000s|0|0.4|180|1984|LI
Wesley Sneijder|Wesley Sneijder|netherlands|mf|ajax,inter,galatasaray|galatasaray|2000s|0|0.25|180|1984|LI
Giovanni van Bronckhorst|Giovanni van Bronckhorst|netherlands|df|psv,feyenoord,barcelona|barcelona|2000s|0|0.1|180|1975|LI
Robin van Persie|Robin van Persie|netherlands|fw|feyenoord,arsenal,man_utd|man_utd|2010s|0|0.5|185|1983|LI
Edwin van der Sar|Edwin van der Sar|netherlands|gk|feyenoord,man_utd|man_utd|2000s|0|0|197|1970|LI
Dennis Bergkamp|Dennis Bergkamp|netherlands|fw|feyenoord,inter,arsenal|arsenal|90s|0|0.4|180|1969|LI
Patrick Kluivert|Patrick Kluivert|netherlands|fw|ajax,barcelona,psg|psg|90s|0|0.5|185|1976|LI
Ruud Gullit|Ruud Gullit|netherlands|df|feyenoord,ac_milan,chelsea|chelsea|90s|0|0.25|190|1962|LI
Ronald Koeman|Ronald Koeman|netherlands|df|psv,barcelona,bayern|bayern|90s|0|0.15|188|1963|L
Dirk Kuyt|Dirk Kuyt|netherlands|fw|psv,celtic,liverpool|liverpool|2000s|0|0.4|180|1980|
Mark van Bommel|Mark van Bommel|netherlands|mf|feyenoord,barcelona,ac_milan|ac_milan|2000s|0|0.15|190|1977|LI
Nigel de Jong|Nigel de Jong|netherlands|df|psv,man_city|man_city|2010s|0|0.05|188|1987|
Wout Weghorst|Wout Weghorst|netherlands|fw|psv,bayern,galatasaray|galatasaray|2020s|1|0.45|193|1992|
Teun Koopmeiners|Teun Koopmeiners|netherlands|mf|ajax,psv,atalanta,man_utd|man_utd|2020s|1|0.25|185|1998|
Dries Mertens|Dries Mertens|belgium|fw|genk,napoli,fenerbahce|fenerbahce|2010s|1|0.45|175|1987|L
Jan Vertonghen|Jan Vertonghen|belgium|df|standard,tottenham|tottenham|2010s|0|0.1|189|1987|
Axel Witsel|Axel Witsel|belgium|mf|standard,psv,borussia_dortmund|borussia_dortmund|2010s|0|0.15|187|1989|
Toby Alderweireld|Toby Alderweireld|belgium|df|standard,tottenham,inter|inter|2010s|1|0.05|191|1989|
Kevin Mirallas|Kevin Mirallas|belgium|fw|standard,everton,man_utd|man_utd|2010s|0|0.3|178|1987|

# === CROATIA / SCANDINAVIA / EAST EUROPE ===
Ivan Rakitic|Ivan Rakitic|croatia|mf|dynamo_zagreb,sevilla,barcelona,inter|inter|2010s|0|0.25|184|1988|
Marcelo Brozovic|Marcelo Brozovic|croatia|mf|dynamo_zagreb,inter,ac_milan|ac_milan|2010s|1|0.25|185|1992|
Mateo Kovacic|Mateo Kovacic|croatia|mf|inter,real_madrid,chelsea|chelsea|2020s|1|0.25|180|1994|
Mario Pasalic|Mario Pasalic|croatia|fw|inter|inter|2020s|1|0.2|180|1995|
Dominik Livakovic|Dominik Livakovic|croatia|gk|dynamo_zagreb,girona|girona|2020s|1|0|192|1995|
Josip Brekalo|Josip Brekalo|croatia|fw|schalke|schalke|2020s|1|0.3|185|1998|
Andrej Kramaric|Andrej Kramaric|croatia|fw|dynamo_zagreb|dynamo_zagreb|2020s|1|0.4|185|1991|
Nikola Vlaovic|Nikola Vlaovic|serbia|fw|partizan,fiorentina,juventus|juventus|2020s|1|0.5|193|2000|
Aleksandar Mitrovic|Aleksandar Mitrovic|serbia|fw|partizan,everton|everton|2020s|1|0.55|189|1994|
Luka Jovic|Luka Jovic|serbia|fw|partizan,everton,real_madrid|real_madrid|2020s|1|0.35|190|1997|
Dusan Tadic|Dusan Tadic|serbia|mf|partizan,psv,ajax|ajax|2010s|0|0.35|180|1988|I
Milan Baric|Milan Baric|serbia|fw|partizan|partizan|2000s|0|0.45|185|1981|
Stefan Savic|Stefan Savic|serbia|df|partizan,inter,atletico|atletico|2010s|1|0.05|190|1992|
Alexander Sorloth|Alexander Sorloth|norway|fw|galatasaray|galatasaray|2020s|1|0.5|190|1998|
Marcus Pedersen|Marcus Pedersen|norway|fw|red_bull_salzburg|red_bull_salzburg|2020s|1|0.4|185|1999|
Viktor Gyokeres|Viktor Gyokeres|sweden|fw|celtic,arsenal|arsenal|2020s|1|0.5|190|1998|
Alexander Skov|Alexander Skov|denmark|mf|celtic|celtic|2020s|1|0.25|185|1998|

# === SOUTH AMERICA ===
Ronaldinho|Ronaldinho|brazil|fw|cruzeiro,barcelona,ac_milan,corinthians|corinthians|2000s|0|0.4|180|1980|LIW
Rivaldo|Rivaldo|brazil|mf|barcelona,ac_milan|ac_milan|90s|0|0.35|180|1972|LIW
Kaka|Kaka|brazil|mf|santos,ac_milan,real_madrid,corinthians|corinthians|2000s|0|0.35|185|1982|LIWU
Cafu|Cafu|brazil|df|santos,ac_milan,barcelona,corinthians|corinthians|90s|0|0.1|175|1970|LIW
Roberto Carlos|Roberto Carlos|brazil|df|ac_milan,real_madrid|real_madrid|90s|0|0.2|178|1973|LIWF
Edmundo|Edmundo|brazil|fw|inter,barcelona|barcelona|90s|0|0.5|180|1966|
Juninho|Juninho|brazil|mf|santos,ac_milan,barcelona|barcelona|2000s|0|0.3|180|1980|W
Luis Figo|Luis Figo|portugal|mf|sporting,barcelona,real_madrid,inter|inter|90s|0|0.3|180|1972|LIW
Deco|Deco|portugal|mf|porto,barcelona,chelsea|chelsea|2000s|0|0.25|180|1977|LI
Ricardo Quaresma|Ricardo Quaresma|portugal|fw|porto,chelsea,galatasaray|galatasaray|2000s|0|0.35|175|1983|
Nani|Nani|portugal|fw|porto,barcelona,man_utd|man_utd|2010s|0|0.3|180|1986|
Helder Postiga|Helder Postiga|portugal|fw|sporting,celtic|celtic|2000s|0|0.4|185|1982|
Silvio|Silvio|brazil|df|santos,barcelona|barcelona|2000s|0|0.05|180|1975|
Maicon|Maicon|brazil|df|inter,man_city,parma|parma|2000s|0|0.05|180|1981|LI
Lucio|Lucio|brazil|df|santos,barcelona,inter,bayern|bayern|2000s|0|0.05|188|1978|LIW
Gabriel Heinze|Gabriel Heinze|argentina|df|river,barcelona,man_utd,sevilla|sevilla|2000s|0|0.05|185|1978|W
Juan Sebastian Veron|Juan Sebastian Veron|argentina|mf|river,inter,man_utd,parma,juventus|juventus|90s|0|0.25|180|1975|LI
Gabriel Batistuta|Gabriel Batistuta|argentina|fw|river,fiorentina,roma,inter|inter|90s|0|0.5|190|1969|LI
Hernan Crespo|Hernan Crespo|argentina|fw|inter,barcelona,roma|roma|2000s|0|0.45|185|1974|

# === AFRICA ===
Jay Jay Okocha|Jay Jay Okocha|nigeria|fw|psv,paris_saint_germain,galatasaray,fenerbahce|fenerbahce|90s|0|0.4|175|1973|LI
George Weah|George Weah|cote_divoire|fw|milan,paris_saint_germain|paris_saint_germain|90s|0|0.5|180|1966|LI
Henrikh Mkhitaryan|Henrikh Mkhitaryan|armenia|mf|borussia_dortmund,man_utd|man_utd|2010s|0|0.35|175|1989|
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
