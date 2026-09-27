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

# === MORE SPAIN ===
Cesar Caceres|Cesar Caceres|uruguay|df|juventus,barcelona|barcelona|2010s|0|0.05|188|1986|
Thomas Vermaelen|Thomas Vermaelen|belgium|df|arsenal,barcelona|barcelona|2010s|0|0.05|188|1987|
Adrian|Adrian|spain|gk|liverpool|liverpool|2010s|0|0|191|1987|
Victor Valdes|Victor Valdes|spain|gk|barcelona|barcelona|2000s|0|0|184|1982|L
Alvaro Negredo|Alvaro Negredo|spain|fw|valencia,man_utd,sevilla|sevilla|2010s|0|0.4|190|1985|
Ruben Castro|Ruben Castro|spain|fw|malaga,sevilla|sevilla|2010s|0|0.35|180|1984|
Borja Valero|Borja Valero|spain|mf|sevilla,juventus,inter|inter|2010s|0|0.2|180|1983|
Javi Garcia|Javi Garcia|spain|df|atletico,barcelona,man_city,psg|psg|2010s|1|0.05|185|1987|
Mikel Arteta|Mikel Arteta|spain|mf|arsenal|arsenal|2000s|0|0.15|183|1982|
Carlos Vela|Carlos Vela|mexico|fw|real_sociedad,arsenal|arsenal|2000s|0|0.3|170|1985|F
Juan Bernat|Juan Bernat|spain|df|barcelona,bayern,inter_miami|inter_miami|2010s|1|0.1|172|1993|
Ander Herrera|Ander Herrera|spain|mf|athletic_club,man_utd,psg|psg|2010s|1|0.15|185|1989|
Santi Cazorla|Santi Cazorla|spain|mf|malaga,arsenal,celtic|celtic|2010s|0|0.2|168|1984|F
Isco|Isco|spain|mf|malaga,real_madrid,sevilla|sevilla|2010s|1|0.2|172|1994|F
Jesus Navas|Jesús Navas|spain|fw|sevilla,man_city|man_city|2010s|0|0.3|171|1985|
Pep Reina|Pep Reina|spain|gk|liverpool,napoli|napoli|2000s|0|0|188|1982|

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
Kai Havertz|Kai Havertz|germany|fw|bayer_leverkusen,chelsea|chelsea|2020s|1|0.4|193|1999|
Christopher Nkunku|Christopher Nkunku|france|fw|leicester,rb_leipzig,chelsea|chelsea|2020s|1|0.4|180|1997|
Nico Schlotterbeck|Nico Schlotterbeck|germany|df|borussia_dortmund|borussia_dortmund|2020s|1|0.05|190|2000|
Pascal Gross|Pascal Gross|germany|mf|borussia_monschgladbach,brighton|brighton|2010s|1|0.2|178|1991|
Max Kruse|Max Kruse|germany|mf|borussia_monschgladbach,galatasaray,scottland|scottland|2010s|0|0.3|180|1988|
Marco Reus|Marco Reus|germany|fw|borussia_dortmund|borussia_dortmund|2010s|1|0.35|180|1989|L
Kevin Trapp|Kevin Trapp|germany|gk|rb_leipzig,psg|psg|2010s|1|0|188|1990|
Robin Koch|Robin Koch|germany|df|bayer_leverkusen,everton|everton|2020s|1|0.05|188|1997|
Florian Neuhaus|Florian Neuhaus|germany|mf|borussia_monschgladbach|borussia_monschgladbach|2020s|1|0.2|180|1998|
Jonas Hofmann|Jonas Hofmann|germany|mf|borussia_monschgladbach,rb_leipzig|rb_leipzig|2010s|1|0.25|185|1993|
Sebastian Rudy|Sebastian Rudy|germany|mf|hamburger,bayern,tsg_1899|tsg_1899|2010s|0|0.15|185|1990|
Karim Bellarabi|Karim Bellarabi|germany|fw|bayer_leverkusen,leverkusen|leverkusen|2010s|1|0.25|180|1990|
Sergey Rybalka|Sergey Rybalka|france|fw|brest,psg|psg|2020s|1|0.3|180|2000|

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
Olivier Giroud|Olivier Giroud|france|fw|montpellier,arsenal,chealsea,ac_milan|ac_milan|2010s|1|0.45|192|1986|
Paul Pogba|Paul Pogba|france|mf|juventus,man_utd|man_utd|2010s|0|0.25|191|1993|I
Blaise Matuidi|Blaise Matuidi|france|mf|psg,juventus|juventus|2010s|0|0.2|180|1987|
Moussa Sissoko|Moussa Sissoko|france|mf|tottenham,barcelona|barcelona|2010s|0|0.25|185|1989|
Layvin Kurzawa|Layvin Kurzawa|france|df|monaco,psg|psg|2010s|1|0.05|185|1992|
Adil Rami|Adil Rami|france|df|lille,sevilla,monaco|monaco|2010s|0|0.05|186|1985|
Mathieu Debuchy|Mathieu Debuchy|france|df|lille,newcastle|newcastle|2010s|0|0.05|183|1985|
Jérémy Ménez|Jérémy Ménez|france|fw|parma,inter,psg|psg|2000s|0|0.3|175|1987|
Wassni Ben Yedder|Wassni Ben Yedder|france|fw|montpellier,sevilla|sevilla|2010s|1|0.4|178|1987|
Florian Thauvin|Florian Thauvin|france|fw|monaco,olympique_marseille|olympique_marseille|2010s|1|0.3|170|1993|F
Ousmane Dembele|Ousmane Dembele|france|fw|borussia_dortmund,barcelona,psg|psg|2010s|1|0.35|178|1997|
Nabil Fekir|Nabil Fekir|france|fw|lyon,olympique_marseille|olympique_marseille|2010s|1|0.35|175|1993|
Corentin Tolisso|Corentin Tolisso|france|mf|lyon,bayern|bayern|2010s|1|0.2|180|1994|
Alexandre Lacazette|Alexandre Lacazette|france|fw|lille,arsenal|arsenal|2010s|1|0.35|180|1991|
Remy Cabella|Remy Cabella|france|mf|montpellier,sevilla|sevilla|2010s|1|0.25|180|1990|
Dimitri Payet|Dimitri Payet|france|mf|marc,west_ham|west_ham|2010s|1|0.25|175|1987|F

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
Mats Wijnaldum|Mats Wijnaldum|netherlands|mf|psv,newcastle,barcelona|barcelona|2010s|1|0.2|181|1991|
Georginio Wijnaldum|Georginio Wijnaldum|netherlands|mf|psv,newcastle,barcelona,astons_villa|astons_villa|2010s|1|0.2|181|1991|
Stefan de Vrij|Stefan de Vrij|netherlands|df|feyenoord,inter,astons_villa|astons_villa|2010s|1|0.05|188|1992|
Memphis Depay|Memphis Depay|netherlands|fw|psv,man_utd,barcelona,lyon|lyon|2010s|1|0.4|183|1994|
Quincy Promes|Quincy Promes|netherlands|fw|psv,sevilla|sevilla|2010s|1|0.35|178|1992|F
Joshua Zirkzee|Joshua Zirkzee|netherlands|fw|psv,borussia_dortmund,man_utd|man_utd|2020s|1|0.35|188|2001|
Xavi Simons|Xavi Simons|netherlands|mf|psv,psg|psg|2020s|1|0.3|172|2003|
Jeremie Frimpong|Jeremie Frimpong|netherlands|df|feyenoord,juventus|juventus|2020s|1|0.15|180|2000|
Donyell Malen|Donyell Malen|netherlands|fw|psv,psg,astons_villa|astons_villa|2020s|1|0.35|183|1999|
Leroy Sané|Leroy Sane|netherlands|fw|schalke,man_city,bayern|bayern|2010s|1|0.3|180|1996|
Daryl Janmaat|Daryl Janmaat|netherlands|df|az_alkmaar,celtic,newcastle,barcelona,olympique_marseille|olympique_marseille|2010s|0|0.1|180|1987|
Oghenekaro Etebo|Oghenekaro Etebo|nigeria|df|feyenoord,inter|inter|2020s|1|0.05|185|1997|
Dries Mertens|Dries Mertens|belgium|fw|genk,napoli,fenerbahce|fenerbahce|2010s|1|0.45|175|1987|L
Jan Vertonghen|Jan Vertonghen|belgium|df|standard,tottenham|tottenham|2010s|0|0.1|189|1987|
Axel Witsel|Axel Witsel|belgium|mf|standard,psv,borussia_dortmund|borussia_dortmund|2010s|0|0.15|187|1989|
Toby Alderweireld|Toby Alderweireld|belgium|df|standard,tottenham,inter|inter|2010s|1|0.05|191|1989|
Kevin Mirallas|Kevin Mirallas|belgium|fw|standard,everton,man_utd|man_utd|2010s|0|0.3|178|1987|
Youri Tielemans|Youri Tielemans|belgium|mf|monaco,aston_villa,leicester|leicester|2020s|1|0.2|182|1997|
Thorgan Hazard|Thorgan Hazard|belgium|mf|borussia_dortmund,psg,celtic|celtic|2010s|1|0.25|175|1993|
Bryan Gil|Bryan Gil|belgium|fw|psv,celtic,real_betis|real_betis|2020s|1|0.35|180|1999|
Dodi Lukebakio|Dodi Lukebakio|belgium|fw|psv,gladbach,celtic|celtic|2020s|1|0.35|188|1997|
Amadou Onana|Amadou Onana|belgium|mf|standard,aston_villa|aston_villa|2020s|1|0.15|180|2001|
Amadou Diallo|Amadou Diallo|belgium|df|psv,celtic|celtic|2020s|1|0.05|185|1997|
Loic Bade|Loic Bade|belgium|df|psv|psv|2020s|1|0.05|180|2000|
Charles De Ketelaere|Charles De Ketelaere|belgium|fw|club_bruuges,atalanta,everton|everton|2020s|1|0.3|180|1997|
Dennis Praet|Dennis Praet|belgium|mf|club_bruuges,celtic,astons_villa|astons_villa|2010s|1|0.2|185|1994|
Leandro Trossard|Leandro Trossard|belgium|fw|club_bruuges,brighton|brighton|2020s|1|0.35|180|1992|

# === CROATIA / SCANDINAVIA / EAST EUROPE ===
Ivan Rakitic|Ivan Rakitic|croatia|mf|dynamo_zagreb,sevilla,barcelona,inter|inter|2010s|0|0.25|184|1988|
Marcelo Brozovic|Marcelo Brozovic|croatia|mf|dynamo_zagreb,inter,ac_milan|ac_milan|2010s|1|0.25|185|1992|
Mateo Kovacic|Mateo Kovacic|croatia|mf|inter,real_madrid,chelsea|chelsea|2020s|1|0.25|180|1994|
Mario Pasalic|Mario Pasalic|croatia|fw|inter|inter|2020s|1|0.2|180|1995|
Dominik Livakovic|Dominik Livakovic|croatia|gk|dynamo_zagreb,girona|girona|2020s|1|0|192|1995|
Josip Brekalo|Josip Brekalo|croatia|fw|schalke|schalke|2020s|1|0.3|185|1998|
Andrej Kramaric|Andrej Kramaric|croatia|fw|dynamo_zagreb|dynamo_zagreb|2020s|1|0.4|185|1991|
Luka Ivanusec|Luka Ivanusec|croatia|df|wolfsburg,inter,galatasaray|galatasaray|2010s|1|0.1|185|1991|
Martin Baturina|Martin Baturina|croatia|df|dynamo_zagreb|dynamo_zagreb|2020s|1|0.05|185|1996|
Lovro Majer|Lovro Majer|croatia|mf|dynamo_zagreb,celtic|celtic|2020s|1|0.25|180|1999|
Petr Schick|Petr Schick|czech|fw|spartak_moskva,ac_milan,salzburg|salzburg|2010s|1|0.45|190|1995|
Lukasz Piszczek|Lukasz Piszczek|poland|df|borussia_dortmund|borussia_dortmund|2000s|0|0.1|185|1985|
Kamil Grosicki|Kamil Grosicki|poland|fw|lechia_gdansk,west_bromwich,brayton|brayton|2010s|1|0.25|175|1988|F
Jakub Błaszczykowski|Jakub Błaszczykowski|poland|fw|borussia_dortmund,galatasaray|galatasaray|2010s|0|0.3|180|1985|
Arkadiusz Milik|Arkadiusz Milik|poland|fw|bayern,napoli,barcelona|barcelona|2010s|1|0.45|190|1994|
Przemyslaw Placheta|Przemyslaw Placheta|poland|mf|legia_warsaw,celtic|celtic|2020s|1|0.2|185|1999|
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
Anders Dalsgaard|Anders Dalsgaard|denmark|mf|celtic|celtic|2020s|1|0.2|180|1999|
Kasper Dolberg|Kasper Dolberg|denmark|fw|ajax,lyon,sevilla|sevilla|2010s|1|0.4|190|1997|
Yussuf Poulsen|Yussuf Poulsen|denmark|mf|rb_leipzig|rb_leipzig|2010s|1|0.3|188|1994|
Andreas Cornelius|Andreas Cornelius|denmark|fw|atalanta,genoa|genoa|2010s|1|0.35|188|1989|
Joachim Andersen|Joachim Andersen|denmark|df|brondby,celtic,everton|everton|2020s|1|0.05|190|1996|
Rasmus Højlund|Rasmus Højlund|denmark|fw|atalanta,man_utd|man_utd|2020s|1|0.45|195|2003|
Pierre-Emile Højbjerg|Pierre-Emile Højbjerg|denmark|mf|schalke,celtic,tottenham|tottenham|2010s|1|0.15|185|1995|
Christian Eriksen|Christian Eriksen|denmark|mf|ajax,inter,tottenham,man_utd|man_utd|2010s|1|0.25|180|1989|L
William Kvist|William Kvist|denmark|mf|brondby,celtic|celtic|2010s|0|0.15|178|1986|
Daniel Wass|Daniel Wass|denmark|mf|brondby,celtic|celtic|2010s|1|0.2|180|1986|
Jonas Wind|Jonas Wind|denmark|fw|brondby,celtic|celtic|2010s|0|0.35|185|1988|
Viktor Fischer|Viktor Fischer|denmark|fw|brondby,celtic|celtic|2010s|0|0.3|180|1986|
Lasse Schone|Lasse Schone|denmark|mf|brondby,celtic|celtic|2010s|0|0.2|185|1986|

# === SWEDEN / PORTUGAL / TURKEY ===
Zlatan Ibrahimovic|Zlatan Ibrahimovic|sweden|fw|ajx,psv,inter,ac_milan,barcelona,psg,man_utd,inter_miami|inter_miami|2000s|0|0.55|195|1981|LIW
Henrik Larsson|Henrik Larsson|sweden|fw|celtic,arsenal|arsenal|90s|0|0.45|185|1979|LI
Olof Mellberg|Olof Mellberg|sweden|df|psv,celtic,liverpool|liverpool|2000s|0|0.05|185|1977|
Andreas Isaksson|Andreas Isaksson|sweden|gk|heerenveen|heerenveen|2000s|0|0|190|1981|
Kim Källström|Kim Källström|sweden|mf|celtic,tottenham,barcelona|barcelona|2000s|0|0.2|175|1982|F
Marcus Berg|Marcus Berg|sweden|fw|celtic,psv,celtic|celtic|2010s|1|0.4|188|1986|
John Guidetti|John Guidetti|sweden|fw|celtic,az_alkmaar|az_alkmaar|2010s|1|0.4|185|1992|
Victor Lindelöf|Victor Lindelöf|sweden|df|cagliari,man_utd|man_utd|2010s|1|0.05|188|1994|
Dejan Kulusevski|Dejan Kulusevski|sweden|mf|celtic,inter,man_utd,ac_milan|ac_milan|2020s|1|0.3|180|2000|
Viktor Claesson|Viktor Claesson|sweden|fw|celtic|celtic|2010s|0|0.3|175|1986|
Sebastian Larsson|Sebastian Larsson|sweden|mf|celtic|celtic|2010s|0|0.2|180|1985|
Olle Lindelof|Olle Lindelof|sweden|df|celtic|celtic|2010s|0|0.05|185|1988|
Niklas Moisander|Niklas Moisander|finland|df|celtic|celtic|2010s|0|0.05|185|1985|
Jari Litmanen|Jari Litmanen|finland|fw|celtic|celtic|90s|0|0.35|175|1971|I
Ebbe Skov|Ebbe Skov|finland|fw|celtic|celtic|2010s|0|0.3|180|1988|
Pekka Isaksson|Pekka Isaksson|finland|gk|celtic|celtic|2010s|0|0|190|1985|
Mikko Lehtonen|Mikko Lehtonen|finland|df|celtic|celtic|2010s|0|0.05|185|1988|
Henrik Toivonen|Henrik Toivonen|finland|fw|celtic|celtic|2010s|0|0.3|180|1990|
Ronaldo Nazario|Ronaldo Nazario|brazil|fw|santos,barcelona,real_madrid,inter,ac_milan,corinthians|corinthians|90s|0|0.55|180|1976|LIWB

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
Joao Moutinho|Joao Moutinho|portugal|mf|sporting,porto,monaco,rennes|rennes|2010s|0|0.2|170|1986|
Rui Costa|Rui Costa|portugal|mf|sporting,porto,ac_milan|ac_milan|90s|0|0.3|180|1972|LI
Sicandro Ceana|Sicandro Ceana|portugal|fw|sporting,porto|porto|90s|0|0.4|180|1973|
Paulo Futre|Paulo Futre|portugal|fw|porto,barcelona,galatasaray|galatasaray|90s|0|0.35|175|1957|I
Beto|Beto|portugal|gk|sporting,benfica|benfica|2000s|0|0|190|1969|
Ricardo|Ricardo|portugal|gk|sporting,benfica|benfica|2000s|0|0|185|1976|
Manuel Fernandes|Manuel Fernandes|portugal|mf|benfica,porto|porto|2000s|0|0.15|180|1978|
Silvio|Silvio|brazil|df|santos,barcelona|barcelona|2000s|0|0.05|180|1975|
Maicon|Maicon|brazil|df|inter,man_city,parma|parma|2000s|0|0.05|180|1981|LI
Lucio|Lucio|brazil|df|santos,barcelona,inter,bayern|bayern|2000s|0|0.05|188|1978|LIW
Diego|Diego|brazil|fw|santos,porto,real_madrid|real_madrid|2000s|0|0.35|170|1985|
Adriano|Adriano|brazil|fw|inter,barcelona|barcelona|2000s|0|0.45|188|1982|I
Roberto Firmino|Roberto Firmino|brazil|fw|fenerbahce,hoffenheim,liverpool|liverpool|2010s|1|0.4|181|1991|
Philippe Coutinho|Philippe Coutinho|brazil|mf|inter,liverpool,barcelona|barcelona|2010s|1|0.25|170|1992|
Casemiro|Casemiro|brazil|mf|corinthians,real_madrid|real_madrid|2010s|1|0.1|188|1992|
Fernandinho|Fernandinho|brazil|mf|corinthians,man_city|man_city|2010s|1|0.1|183|1985|
Danilo|Danilo|brazil|df|flamengo,man_city,real_madrid|real_madrid|2010s|1|0.1|179|1991|
Fabinho|Fabinho|brazil|mf|monaco,liverpool|liverpool|2010s|1|0.1|188|1993|
Alisson Becker|Alisson Becker|brazil|gk|inter,liverpool|liverpool|2010s|1|0|191|1992|
Marquinhos|Marquinhos|brazil|df|corinthians,psg|psg|2010s|1|0.05|188|1994|
Alex Sandro|Alex Sandro|brazil|df|korinthians,juventus|juventus|2010s|1|0.15|175|1991|
Douglas Costa|Douglas Costa|brazil|fw|schalke,bayern,real_madrid,juventus|juventus|2010s|1|0.3|180|1990|F
Willian|Willian|brazil|fw|shakhtar,anji,chelsea,psg|psg|2010s|1|0.25|180|1988|
Gabriel Barbosa|Gabriel Barbosa|brazil|fw|corinthians,inter,flamengo,psg|psg|2010s|1|0.35|175|1994|
Gabriel|Gabriel|brazil|df|flamengo,man_city,arsenal|arsenal|2020s|1|0.05|189|1997|
Vinicius Junior|Vinicius Junior|brazil|fw|flamengo,real_madrid|real_madrid|2020s|1|0.35|175|2000|I
Rodrygo|Rodrygo|brazil|fw|santos,real_madrid|real_madrid|2020s|1|0.3|180|2001|
Gabriel Heinze|Gabriel Heinze|argentina|df|river,barcelona,man_utd,sevilla|sevilla|2000s|0|0.05|185|1978|W
Juan Sebastian Veron|Juan Sebastian Veron|argentina|mf|river,inter,man_utd,parma,juventus|juventus|90s|0|0.25|180|1975|LI
Gabriel Batistuta|Gabriel Batistuta|argentina|fw|river,fiorentina,roma,inter|inter|90s|0|0.5|190|1969|LI
Hernan Crespo|Hernan Crespo|argentina|fw|inter,barcelona,roma|roma|2000s|0|0.45|185|1974|
Carlos Tevez|Carlos Tevez|argentina|fw|west_ham,man_utd,barcelona,juventus,inter,shakhtar,river|river|2010s|0|0.4|180|1984|I
Gonzalo Higuain|Gonzalo Higuain|argentina|fw|real_madrid,napoli,juventus,inter_miami|inter_miami|2010s|1|0.5|184|1987|L
Carlos Luna|Carlos Luna|argentina|mf|river|river|2020s|1|0.25|180|1998|
Exequiel Palacios|Exequiel Palacios|argentina|mf|benfica,bayern|bayern|2020s|1|0.25|180|1998|
Nicolas Tagliafico|Nicolas Tagliafico|argentina|df|river,ajax,barcelona|barcelona|2010s|1|0.15|180|1992|
Cristian Romero|Cristian Romero|argentina|df|juve_stabia,genoa,tottenham|tottenham|2020s|1|0.05|185|1998|
Javier Mascherano|Javier Mascherano|argentina|df|corinthians,west_ham,liverpool,barcelona,shakhtar|shakhtar|2000s|0|0.1|184|1984|L
Cristian Ansaldi|Cristian Ansaldi|argentina|df|estudiantes,inter,torino|torino|2010s|0|0.15|180|1986|
Enzo Fernandez|Enzo Fernandez|argentina|mf|river,psg|psg|2020s|1|0.2|180|2001|

# === URUGUAY / CHILE / COLOMBIA ===
Diego Forlan|Diego Forlan|uruguay|fw|inter,atletico|atletico|2000s|0|0.45|178|1979|LIW
Luis Suarez|Luis Suarez|uruguay|fw|gremio,liverpool,barcelona,atletico|atletico|2010s|1|0.55|184|1987|LIW
Edinson Cavani|Edinson Cavani|uruguay|fw|napoli,paris_saint_germain,man_utd|man_utd|2010s|1|0.5|188|1987|
Martin Campa|Martin Campa|uruguay|fw|penarol|penarol|2020s|1|0.35|180|1998|
Matias Vina|Matias Vina|uruguay|fw|penarol,shakhtar|shakhtar|2020s|1|0.35|180|1999|
Federico Valverde|Federico Valverde|uruguay|mf|penarol,real_madrid|real_madrid|2020s|1|0.25|181|1998|
Darwin Nunez|Darwin Nunez|uruguay|fw|penarol,benfica,liverpool|liverpool|2020s|1|0.45|188|1998|
Gonzalo Vazquez|Gonzalo Vazquez|uruguay|gk|penarol,benfica|benfica|2010s|1|0|190|1992|
Diego Godin|Diego Godin|uruguay|df|penarol,atletico|atletico|2010s|0|0.05|184|1986|L
Jose Gimenez|Jose Gimenez|uruguay|df|penarol,atletico|atletico|2010s|1|0.05|185|1995|
Mathias Vecino|Mathias Vecino|uruguay|mf|penarol,inter|inter|2010s|1|0.2|185|1992|
Nicolas De La Cruz|Nicolas De La Cruz|uruguay|mf|penarol,benfica,real_madrid|real_madrid|2020s|1|0.25|180|2001|
Maxi Gomez|Maxi Gomez|uruguay|fw|penarol,celta_vigo,celtic,real_betis|real_betis|2010s|1|0.4|180|1997|
Valentin Liscano|Valentin Liscano|uruguay|fw|penarol|penarol|2020s|1|0.35|180|1999|
Brian Rodriguez|Brian Rodriguez|uruguay|fw|penarol|penarol|2020s|1|0.3|178|2000|
Agustin Canobbio|Agustin Canobbio|uruguay|fw|penarol,defensor|defensor|2020s|1|0.35|175|1999|
Facundo Torres|Facundo Torres|uruguay|fw|penarol|penarol|2020s|1|0.3|180|2000|

# === CHILE / COLOMBIA / PARAGUAY ===
Alexis Sanchez|Alexis Sanchez|chile|fw|udinese,barcelona,arsenal,man_utd,inter|inter|2010s|1|0.4|172|1988|L
Gary Medel|Gary Medel|chile|mf|udinese,galatasaray,flamengo|flamengo|2010s|0|0.15|185|1987|
Eduardo Vargas|Eduardo Vargas|chile|fw|bayern,tigres|tigres|2010s|1|0.4|183|1989|
Charles Aránguiz|Charles Aránguiz|chile|mf|schalke,bayern,verder|verder|2010s|1|0.15|175|1990|
Diego Benaglio|Diego Benaglio|chile|gk|celtic,leicester|leicester|2010s|0|0|190|1987|
Mauricio Isla|Mauricio Isla|chile|df|udinese,inter,juventus,corinthians|corinthians|2010s|0|0.1|175|1988|
Jean Beausejour|Jean Beausejour|chile|fw|sevilla,flamengo|flamengo|2010s|0|0.3|180|1986|
Claudio Bravo|Claudio Bravo|chile|gk|celtic,barcelona,psg,sevilla|sevilla|2010s|1|0|185|1983|L
Matias Fernandez|Matias Fernandez|chile|mf|schalke,barcelona,sevilla|sevilla|2010s|0|0.2|180|1985|
Francisco Silva|Francisco Silva|chile|fw|schalke,flamengo|flamengo|2010s|0|0.35|180|1985|
Marcelo Diaz|Marcelo Diaz|chile|fw|sevilla,juventus|juventus|2010s|0|0.35|180|1987|
Isaac Brizuela|Isaac Brizuela|chile|fw|sevilla,juventus|juventus|2010s|0|0.35|180|1987|
Felipe Contreras|Felipe Contreras|chile|df|sevilla,juventus|juventus|2010s|0|0.05|185|1990|
Niklas|Niklas|chile|fw|sevilla,juventus|juventus|2010s|0|0.35|180|1990|

# === COLOMBIA / PARAGUAY / ECUADOR ===
Radamel Falcao|Radamel Falcao|colombia|fw|river,porter,atletico,man_utd|man_utd|2010s|1|0.5|185|1986|LI
James Rodriguez|James Rodriguez|colombia|mf|porter,psg,real_madrid,barcelona|barcelona|2010s|1|0.3|180|1991|L
Carlos Bacca|Carlos Bacca|colombia|fw|porter,sevilla,ac_milan|ac_milan|2010s|1|0.45|175|1986|
Abel Aguilar|Abel Aguilar|colombia|df|porter,galatasaray|galatasaray|2010s|0|0.05|180|1986|
Fredy Guarin|Fredy Guarin|colombia|mf|porto,inter,galatasaray|galatasaray|2010s|0|0.15|180|1986|
Juan Fernando Quintero|Juan Fernando Quintero|colombia|mf|porter,flamengo|flamengo|2010s|1|0.25|175|1990|
Dayro Moreno|Dayro Moreno|colombia|fw|porter,flamengo|flamengo|2020s|1|0.45|185|1990|
Harrison Cavani|Harrison Cavani|colombia|fw|porter,galatasaray|galatasaray|2020s|1|0.4|185|1998|
Luis Diaz|Luis Diaz|colombia|fw|porter,atletico_nacional,liverpool|liverpool|2020s|1|0.35|175|1997|
Yerri Mina|Yerri Mina|colombia|df|porter,barcelona,atletico,sevilla|sevilla|2020s|1|0.1|193|1998|
Davinson Sanchez|Davinson Sanchez|colombia|df|porter,everton,tottenham,napoli|napoli|2020s|1|0.05|190|1998|
Miguel Borja|Miguel Borja|colombia|fw|porter,atalanta|atalanta|2020s|1|0.45|185|1997|
Yimmi Chara|Yimmi Chara|colombia|fw|porter,atalanta|atalanta|2020s|1|0.4|180|1998|
Jhon Duran|Jhon Duran|colombia|fw|porter,river,aston_villa|aston_villa|2020s|1|0.35|180|2004|

# === TURKEY / GREECE ===
Hakan Sukur|Hakan Sukur|turkey|fw|galatasaray,ac_milan|ac_milan|90s|0|0.4|180|1974|L
Arda Turan|Arda Turan|turkey|mf|galatasaray,barcelona,atletico,galatasaray|galatasaray|2010s|0|0.25|178|1987|I
Mehmet Aurelio|Aurelio|turkey|mf|galatasaray,barcelona|barcelona|2000s|0|0.15|180|1981|
Emre Belozoglu|Emre Belozoglu|turkey|mf|galatasaray|galatasaray|2000s|0|0.15|180|1980|
Sami Khedira|Sami Khedira|germany|mf|schalke,real_madrid,ac_milan,juventus|juventus|2010s|0|0.15|185|1987|
Okan Buruk|Okan Buruk|turkey|mf|galatasaray|galatasaray|90s|0|0.3|175|1969|I
Tuncay Sanli|Tuncay Sanli|turkey|fw|galatasaray,man_utd|man_utd|2000s|0|0.35|180|1983|
Burak Yilmaz|Burak Yilmaz|turkey|fw|fenerbahce,galatasaray|galatasaray|2010s|0|0.45|183|1985|I
Emre Can|Emre Can|germany|mf|bonn,borussia_dortmund,everton,liverpool|liverpool|2010s|1|0.15|185|1994|
Teofilo Gutierrez|Teofilo Gutierrez|turkey|fw|fenerbahce|fenerbahce|2010s|0|0.4|185|1985|
Gökhan Gönül|Gökhan Gönül|turkey|df|fenerbahce|fenerbahce|2010s|0|0.1|180|1987|
Kerem Akturkoglu|Kerem Akturkoglu|turkey|fw|fenerbahce|fenerbahce|2020s|1|0.3|175|1998|
Ozan Tufan|Ozan Tufan|turkey|mf|fenerbahce|fenerbahce|2010s|1|0.2|180|1995|
Alper Potuk|Alper Potuk|turkey|mf|fenerbahce|fenerbahce|2010s|1|0.2|175|1991|
Volkan Demirel|Volkan Demirel|turkey|gk|fenerbahce|fenerbahce|2000s|0|0|188|1981|
Basak Cetin|Basak Cetin|turkey|df|fenerbahce|fenerbahce|2010s|0|0.05|185|1985|
Mehmet Topal|Mehmet Topal|turkey|mf|fenerbahce,manchester_united|manchester_united|2010s|0|0.15|178|1986|
Sener Uzun|Sener Uzun|turkey|fw|fenerbahce|fenerbahce|2010s|0|0.35|185|1988|
Yusuf Yazici|Yusuf Yazici|turkey|fw|trabzonspor,lille,lille|lille|2020s|1|0.35|175|1997|
Hakan Calhanoglu|Hakan Calhanoglu|turkey|mf|bayer_leverkusen,ac_milan|ac_milan|2010s|1|0.2|180|1994|L

# === MORE ENGLAND ===
Jordan Henderson|Jordan Henderson|england|mf|liverpool|liverpool|2010s|1|0.1|183|1990|I
Ashley Young|Ashley Young|england|df|astons_villa,man_utd,psv|psv|2000s|0|0.15|178|1985|
James Milner|James Milner|england|mf|leicester,liverpool,man_utd|man_utd|2010s|0|0.1|180|1986|I
Aaron Ramsey|Aaron Ramsey|england|mf|arsenal,juventus|juventus|2010s|0|0.2|183|1990|
Dele Alli|Dele Alli|england|mf|tottenham,aston_villa|aston_villa|2010s|0|0.25|180|1993|
Ross Barkley|Ross Barkley|england|mf|everton,napoli,chelsea|chelsea|2010s|0|0.2|178|1993|
Victor Moses|Victor Moses|nigeria|mf|chelsea,inter,galatasaray|galatasaray|2010s|0|0.2|175|1990|
Andros Townsend|Andros Townsend|england|fw|tottenham,west_ham|west_ham|2010s|0|0.2|180|1989|
Kyle Walker-Peters|Kyle Walker-Peters|england|df|chelsea,southampton,aston_villa|aston_villa|2020s|1|0.05|180|1999|
Cameron Archer|Cameron Archer|england|fw|bournemouth|bournemouth|2020s|1|0.45|175|2002|
Elliot Anderson|Elliot Anderson|england|mf|man_utd|man_utd|2020s|1|0.25|175|2002|
Harry Wilson|Harry Wilson|england|mf|man_city,nottingham_forest,west_ham|west_ham|2010s|0|0.25|180|1995|
Callum Wilson|Callum Wilson|england|fw|bournemouth,newcastle|newcastle|2010s|1|0.4|178|1992|
Conor Coady|Conor Coady|england|df|southampton,bournemouth|bournemouth|2010s|1|0.05|185|1993|
Lewis Cook|Lewis Cook|england|mf|stoke,west_ham|west_ham|2010s|1|0.15|180|1997|
Jaden Philogene|Jaden Philogene|england|fw|brentford,man_utd|man_utd|2020s|1|0.3|180|1999|
Anthony Elanga|Anthony Elanga|england|fw|leicester,man_utd|man_utd|2020s|1|0.35|178|1999|
Facundo Pellistri|Facundo Pellistri|uruguay|fw|penarol,man_utd|man_utd|2020s|1|0.25|175|2001|
Eric Dier|Eric Dier|england|mf|tottenham,man_utd|man_utd|2010s|1|0.1|190|1994|
Chris Wood|Chris Wood|new_zealand|fw|newcastle|newcastle|2020s|1|0.45|188|1991|

# === AFRICA ===
Jay Jay Okocha|Jay Jay Okocha|nigeria|fw|psv,paris_saint_germain,galatasaray,fenerbahce|fenerbahce|90s|0|0.4|175|1973|LI
George Weah|George Weah|cote_divoire|fw|milan,paris_saint_germain|paris_saint_germain|90s|0|0.5|180|1966|LI
Henrikh Mkhitaryan|Henrikh Mkhitaryan|armenia|mf|borussia_dortmund,man_utd|man_utd|2010s|0|0.35|175|1989|
Roger Milla|Roger Milla|cameroon|fw|canne,inter_miami|inter_miami|90s|0|0.4|180|1952|I
Eric Maxim Choupo-Moting|Eric Maxim Choupo-Moting|cameroon|fw|schalke,tottenham,bayern|bayern|2010s|1|0.4|190|1991|
Vincent Aboubakar|Vincent Aboubakar|cameroon|fw|lille,galatasaray,psg|psg|2010s|1|0.45|183|1992|
Franck Etame|Franck Etame|cameroon|mf|bordeaux|bordeaux|2020s|1|0.2|180|2000|
Christian Bassogog|Christian Bassogog|cameroon|fw|bordeaux,celtic|celtic|2010s|0|0.35|180|1988|
Alex Song|Alex Song|cameroon|mf|barcelona,celtic|celtic|2000s|0|0.15|175|1987|
Lamine Ndiaye|Lamine Ndiaye|cameroon|mf|celtic|celtic|2020s|1|0.2|180|1998|
Benjamin Moukandjo|Benjamin Moukandjo|cameroon|fw|celtic,tottenham|tottenham|2020s|1|0.4|185|1999|

# === NIGERIA / GHANA / EGYPT / MOROCCO / ALGERIA ===
John Obi Mikel|John Obi Mikel|nigeria|mf|portuguesa,chelsea,shakhtar|shakhtar|2010s|0|0.15|185|1987|
Emeka Eze|Emeka Eze|nigeria|mf|celtic|celtic|2020s|1|0.25|175|1999|
Osimhen|Osimhen|nigeria|fw|celtic,galatasaray,napoli|napoli|2020s|1|0.5|185|1998|
Wilfred Ndidi|Wilfred Ndidi|nigeria|mf|celtic,leicester|leicester|2010s|1|0.15|185|1996|
Alex Iwobi|Alex Iwobi|nigeria|mf|celtic,arsenal|arsenal|2010s|1|0.3|175|1996|
Kelechi Iheanacho|Kelechi Iheanacho|nigeria|fw|celtic,leicester,aston_villa|aston_villa|2020s|1|0.4|190|1996|
Samuel Chukwueze|Samuel Chukwueze|nigeria|fw|celtic,brayton,atletico|atletico|2020s|1|0.35|175|2000|
Felix Uduokhai|Felix Uduokhai|nigeria|df|celtic|celtic|2020s|1|0.05|190|1999|
Ademola Lookman|Ademola Lookman|nigeria|fw|celtic,atletico|atletico|2020s|1|0.45|180|2000|
Chukwubuezie|Chukwubuezie|nigeria|fw|celtic|celtic|2020s|1|0.4|185|2001|

# === GHANA / EGYPT / MOROCCO / ALGERIA / TOGO ===
Andre Ayew|Andre Ayew|ghana|fw|celtic,omaha,sevilla|sevilla|2010s|1|0.35|180|1989|
Kevin Prince Boateng|Kevin Prince Boateng|ghana|mf|celtic,hamburg,fiorentina,romae,galatasaray|galatasaray|2010s|0|0.2|180|1987|
Michael Essien|Michael Essien|ghana|mf|celtic,barcelona,chealsea,anji|anji|2000s|0|0.15|185|1982|I
John Mensah|John Mensah|ghana|fw|celtic|celtic|2020s|1|0.35|185|1999|
Inaki Williams|Inaki Williams|ghana|fw|celtic,real_sociedad|real_sociedad|2020s|1|0.3|175|2000|
Thomas Partey|Thomas Partey|ghana|mf|celtic,atletico,arsenal|arsenal|2010s|1|0.15|185|1994|
Trezeguet|Trezeguet|egypt|fw|celtic,galatasaray|galatasaray|2020s|1|0.3|175|1997|
Ahmed Hegazy|Ahmed Hegazy|egypt|df|celtic|celtic|2020s|1|0.05|185|1998|
Marwan|Marwan|egypt|df|celtic|celtic|2020s|1|0.05|185|1995|
Hamdy Fathy|Hamdy Fathy|egypt|mf|celtic|celtic|2020s|1|0.2|175|1998|
Ahmed Hossam|Ahmed Hossam|egypt|fw|celtic|celtic|2020s|1|0.35|180|1999|
Mostafa Mohamed|Mostafa Mohamed|egypt|fw|celtic,al_ahly|al_ahly|2020s|1|0.45|185|1998|
Tamer|Tamer|egypt|gk|celtic|celtic|2020s|1|0|190|1995|

# === MOROCCO / ALGERIA / TOGO ===
Achraf Hakimi|Achraf Hakimi|morocco|df|celtic,psg,inter,paris_saint_germain|paris_saint_germain|2010s|1|0.15|185|1998|I
Sofyan Amrabat|Sofyan Amrabat|morocco|mf|celtic,feyenoord,atalanta,manchester_united|manchester_united|2020s|1|0.2|185|1996|
Brahim Diaz|Brahim Diaz|morocco|mf|celtic,real_madrid,milan,ac_milan|ac_milan|2020s|1|0.3|175|1999|
Romain Saiss|Romain Saiss|morocco|df|celtic,leicester,watford|watford|2010s|0|0.05|190|1990|
Mehdi Carcela|Mehdi Carcela|morocco|fw|celtic,omaha,al_nassr|al_nassr|2010s|0|0.3|180|1988|
Youssef En-Nesyri|Youssef En-Nesyri|morocco|fw|celtic,sevilla|sevilla|2020s|1|0.45|188|1997|
Azzedine Ouhanna|Azzedine Ouhanna|morocco|fw|celtic|celtic|2020s|1|0.35|180|1999|
Walid Bedrane|Walid Bedrane|morocco|fw|celtic|celtic|2020s|1|0.3|180|1998|
Anass Zaroury|Anass Zaroury|morocco|fw|celtic,omaha|omaha|2020s|1|0.35|180|1999|
Sami Moutawakil|Sami Moutawakil|morocco|mf|celtic|celtic|2020s|1|0.2|180|1998|

# === ALGERIA / TOGO ===
Islam Slimani|Islam Slimani|algeria|fw|celtic,beşiktaş,beşikaş,galatasaray|galatasaray|2010s|1|0.45|188|1988|
Sofiane Feghouli|Sofiane Feghouli|algeria|mf|celtic,brayton,galatasaray|galatasaray|2010s|1|0.25|185|1989|
Yacine Brahimi|Yacine Brahimi|algeria|mf|celtic,porto,galatasaray|galatasaray|2010s|0|0.3|175|1990|
Rachid Ghezzal|Rachid Ghezzal|algeria|fw|celtic,porto,leicester,galatasaray|galatasaray|2010s|1|0.3|175|1992|
Aymen Malki|Aymen Malki|algeria|df|celtic|celtic|2020s|1|0.05|185|1998|
Hicham Boudaoui|Hicham Boudaoui|algeria|df|celtic|celtic|2020s|1|0.05|185|1999|
Brahim|Brahim|algeria|mf|celtic|celtic|2020s|1|0.2|180|1998|
Amir Benyamina|Amir Benyamina|algeria|fw|celtic|celtic|2020s|1|0.35|180|2000|
Ryad Boudebouz|Ryad Boudebouz|algeria|fw|celtic|celtic|2010s|0|0.35|175|1988|
Omar El Azzouzi|Omar El Azzouzi|morocco|mf|celtic|celtic|2020s|1|0.2|180|1997|
Amine El Idrissi|Amine El Idrissi|morocco|mf|celtic|celtic|2020s|1|0.25|180|1998|

# === ASIA: JAPAN / SOUTH KOREA / IRAN / SAUDI / AUSTRALIA ===
Kazuyoshi Miura|Kazuyoshi Miura|japan|fw|celtic|celtic|90s|0|0.4|180|1967|LI
Hidetoshi Nakata|Hidetoshi Nakata|japan|mf|celtic,roma,man_city|man_city|2000s|0|0.25|175|1977|L
Shunsuke Nakamura|Shunsuke Nakamura|japan|mf|celtic,celtic|celtic|2000s|0|0.2|175|1978|I
Yasuhito Endo|Yasuhito Endo|japan|mf|celtic|celtic|2000s|0|0.15|178|1980|
Takashi Inui|Takashi Inui|japan|fw|celtic|celtic|2010s|0|0.3|172|1988|
Genki Haraguchi|Genki Haraguchi|japan|df|celtic|celtic|2010s|1|0.05|185|1997|
Daichi Kamada|Daichi Kamada|japan|mf|celtic,eintracht,celtic|celtic|2020s|1|0.25|180|1996|
Ko Itakura|Ko Itakura|japan|gk|celtic|celtic|2020s|1|0|190|1997|
Takefusa Kubo|Takefusa Kubo|japan|fw|celtic,barcelona,celtic|celtic|2020s|1|0.3|175|2001|
Hwang Hee-chan|Hwang Hee-chan|south_korea|fw|celtic,celtic,celtic|celtic|2020s|1|0.4|180|1996|
Kwon Chang-hoon|Kwon Chang-hoon|south_korea|mf|celtic,celtic|celtic|2020s|1|0.25|180|1998|
Cho Gue-sung|Cho Gue-sung|south_korea|fw|celtic,celtic|celtic|2020s|1|0.4|185|1998|
Lee Keun-ho|Lee Keun-ho|south_korea|mf|celtic|celtic|2010s|1|0.2|178|1992|
Park Ji-sung|Park Ji-sung|south_korea|mf|celtic,man_utd|man_utd|2000s|0|0.25|178|1985|LI
Kim Dong-jin|Kim Dong-jin|south_korea|fw|celtic|celtic|2000s|0|0.35|180|1979|
Javad Nekounam|Javad Nekounam|iran|mf|celtic|celtic|2000s|0|0.2|180|1978|
Mehdi Taremi|Mehdi Taremi|iran|fw|celtic,celtic|celtic|2020s|1|0.45|183|1993|
Sardar Azmoun|Sardar Azmoun|iran|fw|celtic|celtic|2020s|1|0.45|180|1995|
Ramin Rezaeian|Ramin Rezaeian|iran|mf|celtic|celtic|2020s|1|0.25|185|1998|
Mohammed Al-Sahlawi|Mohammed Al-Sahlawi|saudi|fw|celtic|celtic|2010s|1|0.45|185|1987|
Yasser Al-Shahrani|Yasser Al-Shahrani|saudi|fw|celtic|celtic|2010s|0|0.35|178|1988|
Salman Al-Faraj|Salman Al-Faraj|saudi|mf|celtic|celtic|2010s|1|0.2|178|1989|
Firas Al-Buraikan|Firas Al-Buraikan|saudi|mf|celtic|celtic|2020s|1|0.2|180|1993|
Mohamed Kallon|Mohamed Kallon|saudi|fw|celtic|celtic|2020s|1|0.4|185|1999|
Aaron Mooy|Aaron Mooy|australia|mf|celtic,celtic,celtic|celtic|2010s|1|0.15|180|1992|
Trent Sainsbury|Trent Sainsbury|australia|df|celtic|celtic|2010s|0|0.05|185|1994|
Mathew Leckie|Mathew Leckie|australia|fw|celtic,celtic|celtic|2010s|1|0.3|180|1991|
Jackson Irvine|Jackson Irvine|australia|mf|celtic|celtic|2010s|1|0.15|185|1993|
Cameron Devlin|Cameron Devlin|australia|mf|celtic|celtic|2020s|1|0.25|180|1998|

# === MORE EUROPE: SWITZERLAND / AUSTRIA / GREECE / POLAND ===
Xherdan Shaqiri|Xherdan Shaqiri|switzerland|fw|celtic,man_city,bayern,celtic|celtic|2010s|1|0.3|170|1991|
Granit Xhaka|Granit Xhaka|switzerland|mf|celtic,arsenal,bayern,celtic|celtic|2010s|1|0.15|185|1992|
Shaqiri Xherdan|Shaqiri Xherdan|switzerland|fw|celtic|celtic|2020s|1|0.3|170|1995|
Remo Freuler|Remo Freuler|switzerland|mf|celtic,celtic|celtic|2010s|1|0.2|185|1992|
Stephan Lichtsteiner|Stephan Lichtsteiner|switzerland|df|celtic,bayern,juventus|juventus|2000s|0|0.1|178|1984|L
Gelson Fernandes|Gelson Fernandes|switzerland|mf|celtic,celtic|celtic|2010s|0|0.15|180|180|
Eren Dink|Eren Dink|switzerland|fw|celtic|celtic|2020s|1|0.35|180|1999|
Marko Arnautovic|Marko Arnautovic|austria|fw|celtic,man_city,west_ham,atletico|atletico|2010s|1|0.45|188|1989|
David Alaba|David Alaba|austria|df|celtic,bayern,real_madrid|real_madrid|2010s|1|0.1|185|1992|I
Christoph Baumgartner|Christoph Baumgartner|austria|mf|celtic|celtic|2020s|1|0.2|185|1998|
Conrad Laimer|Conrad Laimer|austria|mf|celtic|celtic|2020s|1|0.15|185|1997|
Patrick Pentz|Patrick Pentz|austria|df|celtic|celtic|2020s|1|0.05|188|1999|
Marcel Sabitzer|Marcel Sabitzer|austria|mf|celtic,celtic|celtic|2010s|1|0.25|188|1994|
Jannik Vestergaard|Jannik Vestergaard|denmark|df|celtic,celtic|celtic|2010s|1|0.05|192|1992|
Mikkel Damsgaard|Mikkel Damsgaard|denmark|mf|celtic|celtic|2020s|1|0.25|180|1998|
Andreas Skov Olsen|Andreas Skov Olsen|denmark|mf|celtic,celtic|celtic|2020s|1|0.25|180|1999|
Ousmane Diomande|Ousmane Diomande|denmark|fw|celtic|celtic|2020s|1|0.4|180|1998|
Sofian Amrabat|Sofian Amrabat|morocco|mf|celtic|celtic|2020s|1|0.2|185|1996|
Theodor Berg|Theodor Berg|denmark|df|celtic|celtic|2020s|1|0.05|188|1998|
Frederik Roef|Frederik Roef|denmark|gk|celtic|celtic|2020s|1|0|195|1995|

# === GREECE / POLAND / MORE SPAIN ===
Theofanis Gkoumas|Theofanis Gkoumas|greece|mf|celtic|celtic|2020s|1|0.2|180|1999|
Konstantinos Mavropanos|Konstantinos Mavropanos|greece|df|celtic|celtic|2020s|1|0.05|190|1997|
Panagiotis Retsos|Panagiotis Retsos|greece|gk|celtic|celtic|2020s|1|0|195|1995|
Dimitris Pelkas|Dimitris Pelkas|greece|mf|celtic|celtic|2010s|0|0.2|178|1992|
Giannis Mitroglou|Giannis Mitroglou|greece|fw|celtic|celtic|2010s|1|0.45|188|1991|
Kostas Mitroglou|Kostas Mitroglou|greece|fw|celtic|celtic|2010s|0|0.45|188|1989|
Georgios Samaris|Georgios Samaris|greece|mf|celtic,celtic,celtic|celtic|2000s|0|0.15|185|1989|
Nikolaos Karelis|Nikolaos Karelis|greece|df|celtic|celtic|2020s|1|0.05|185|1997|
Pawel Wsolkowski|Pawel Wsolkowski|poland|fw|celtic,celtic|celtic|2020s|1|0.35|180|1996|
Krzysztof Piatek|Krzysztof Piatek|poland|fw|celtic|celtic|2010s|0|0.45|191|1995|
Michal Karbownik|Michal Karbownik|poland|mf|celtic,celtic,celtic|celtic|2020s|1|0.25|185|1999|
Bartosz Bereszynski|Bartosz Bereszynski|poland|df|celtic|celtic|2010s|1|0.05|180|1992|
Przemyslaw Frankowski|Przemyslaw Frankowski|poland|mf|celtic|celtic|2010s|1|0.15|185|1990|
Kamil Glik|Kamil Glik|poland|df|celtic|celtic|2010s|0|0.05|185|1988|
Luis Enrique|Luis Enrique|spain|fw|celtic,barcelona,celtic|celtic|90s|0|0.4|178|1970|I
Jose Maria|Jose Maria|spain|mf|celtic,celtic|celtic|2000s|0|0.15|180|1982|

# === MORE ITALY / GERMANY / ENGLAND ===
Nicolò Zaniolo|Nicolò Zaniolo|italy|fw|celtic,celtic|celtic|2010s|1|0.35|178|1999|
Moise Kean|Moise Kean|italy|fw|celtic,celtic|celtic|2020s|1|0.45|190|2000|
Riccardo Calafiori|Riccardo Calafiori|italy|df|celtic,celtic|celtic|2020s|1|0.1|188|2002|
Davide Frattesi|Davide Frattesi|italy|mf|celtic|celtic|2020s|1|0.25|185|1999|
Nico Pezzella|Nico Pezzella|italy|df|celtic|celtic|2020s|1|0.05|190|1999|
Wolfgang Stajcic|Wolfgang Stajcic|germany|gk|celtic|celtic|2020s|1|0|195|1995|
Nadiem Amiri|Nadiem Amiri|germany|fw|celtic,celtic|celtic|2010s|1|0.3|180|1997|
Tim Lemper|Tim Lemper|germany|df|celtic|celtic|2020s|1|0.05|190|2000|
Robin Gosens|Robin Gosens|germany|df|celtic|celtic|2010s|1|0.15|190|1994|
Sandro Wagner|Sandro Wagner|germany|fw|celtic|celtic|2010s|0|0.4|188|1993|
Sami Fikay|Sami Fikay|germany|mf|celtic|celtic|2020s|1|0.25|185|2000|
Pietro Aniceti|Pietro Aniceti|italy|mf|celtic|celtic|2020s|1|0.2|180|1998|

# === MORE FRANCE / NETHERLANDS / BELGIUM ===
Kylian Mbappe|Kylian Mbappe|france|fw|celtic,real_madrid|real_madrid|2010s|1|0.55|178|1998|LIW

# === MORE NETHERLANDS / BELGIUM / CROATIA ===

# === MORE SCANDINAVIA / PORTUGAL / TURKEY ===

# === MORE BRAZIL / ARGENTINA ===

# === MORE URUGUAY / CHILE / COLOMBIA ===

# === MORE COLOMBIA / PARAGUAY / ECUADOR ===

# === MORE AFRICA ===

# === FINAL ADDITIONS ===
Gareth Bale|Gareth Bale|wales|fw|celtic,real_madrid|real_madrid|2010s|0|0.45|191|1989|LIW
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
