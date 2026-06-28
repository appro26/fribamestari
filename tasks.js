window.allCards = [];

// ==========================================
// ELÄINTEN GRAFIIKAT (Tunnistettavammat) JA HENKILÖKOHTAISET SOLVAUKSET
// ==========================================
const doodleSVGs = [
    // 1. Kiroileva Siili (Piikit, nenä, vihainen silmä)
    "M 20 80 Q 20 60 40 60 L 45 40 L 50 60 L 60 30 L 65 60 L 75 40 L 80 80 Z M 30 70 L 32 70 M 15 75 L 20 80 M 85 75 L 80 80", 
    // 2. Vihainen Kissa (Terävät korvat, viikset, hampaat)
    "M 20 80 L 20 40 L 30 20 L 40 40 L 60 40 L 70 20 L 80 40 L 80 80 Z M 35 55 L 37 55 M 65 55 L 63 55 M 45 65 L 55 65 L 50 72 Z M 10 50 L 25 55 M 10 60 L 25 60 M 90 50 L 75 55 M 90 60 L 75 60",
    // 3. Äkäinen Karhu (Isot pyöreät korvat, leveä kuono)
    "M 20 80 C 20 30 80 30 80 80 Z M 20 40 C 10 40 10 20 25 30 M 80 40 C 90 40 90 20 75 30 M 40 55 L 42 55 M 60 55 L 58 55 M 45 65 C 45 75 55 75 55 65",
    // 4. Vittuuntunut Pöllö/Lintu (Iso nokka, siivet)
    "M 50 80 C 20 80 20 30 50 30 C 80 30 80 80 50 80 Z M 40 55 L 60 55 L 50 70 Z M 35 45 L 40 48 M 65 45 L 60 48 M 20 50 L 10 60 M 80 50 L 90 60",
    // 5. Kyllästynyt Koira (Luppakorvat, iso nenä)
    "M 30 80 C 30 50 70 50 70 80 Z M 30 55 C 10 50 15 80 25 80 M 70 55 C 90 50 85 80 75 80 M 40 60 L 43 60 M 60 60 L 57 60 M 45 70 C 45 75 55 75 55 70"
];

const insults = [
    "[Pelaaja], v*ttu mikä heitto, ootko sä koskaan edes pitänyt kiekkoa kädessä?",
    "[Pelaaja] p*rkele, mummonikin puttaa paremmin, ja se on ollut kuolleena 10 vuotta.",
    "S**tanan sirkkeli [Pelaaja], puut tykkää susta enemmän ku sun omat vanhemmat.",
    "Ei h*lvetti [Pelaaja], jopa Jeesus itkee ton sun tekniikan takia.",
    "P*ska veto [Pelaaja]. Sun draivi on lyhyempi ku mun kärsivällisyys.",
    "V*tun hieno lay-up [Pelaaja]! Ai se olikin sun maksimidraivi?",
    "Mene [Pelaaja] s**tana takas rangelle, tää on noloa meille kaikille.",
    "P*rkeleen rystykääntö [Pelaaja], kiekko lensi enemmän taakse ku eteen.",
    "Miten sä [Pelaaja] v*ttu onnistut missaamaan kahdesta metristä?",
    "H*lvetin hieno puuosuma [Pelaaja]! Tähtäsitkö sä siihen vai ootko vaan sysip*ska?",
    "V*tun noloa [Pelaaja]. Caddiekin lähti äsken kotiin häpeästä.",
    "[Pelaaja], s**tanan kalliit kiekot sulla, mut taidot on tasan 0 euroa.",
    "P*rkele [Pelaaja], sun rystyheitto näyttää siltä ku yrittäisit heittää pesukonetta.",
    "V*tun grippilokki [Pelaaja]! Ota se käsi irti siitä muovista ajoissa.",
    "P*ska putti, p*ska pelaaja. Yksinkertaista, eikö vain [Pelaaja]?",
    "H*lvetti soikoon [Pelaaja], sun kiekko etsii enemmän sieniä ku metsästäjät.",
    "V*ttu mulla sulaa aivot ku joutuu kattoon tota sun räpellystä, [Pelaaja].",
    "S**tana mikä uikku [Pelaaja], ootko harkinnu vaikka pitsinnypläystä?",
    "P*rkeleen amatööri [Pelaaja], sun bägi painaa enemmän ku sun ÄO.",
    "V*tun hieno rolleri [Pelaaja]! Harmi vaan että se pysähty heti ekaan käpyyn.",
    "P*ska heitto [Pelaaja]! Edes myötätuuli ei halua auttaa sua.",
    "H*lvetin puunhakkaaja [Pelaaja]. Montako kuutiota teit polttopuuta tolla draivilla?",
    "V*ttu sä [Pelaaja] olet hidas! Heitä nyt s**tana!",
    "P*rkele [Pelaaja], heitä silmät kii ens kerralla, ei se ainakaan huonommin voi mennä.",
    "V*tun kiva kattoa ku yrität [Pelaaja]. Et siis onnistu, mut yrität.",
    "S**tanan vässykkä [Pelaaja], ota se putteri ja laita se sisään!",
    "P*ska formi [Pelaaja]! Sun x-step näyttää humalaisen ripaskalta.",
    "H*lvetti [Pelaaja], mä voisin heittää vasemmalla kädellä paremmin ku sä."
];

// ==========================================
// TASO 1: PIENET SABOTAASIT (Aitoja mekaniikkahaasteita, max 2 per väylä)
// ==========================================
const minorBases = [
    { n: "Heikompi käsi (Putti)", d: "Kohteen on suoritettava kaikki alle 10m putit heikommalla kädellään tällä väylällä." },
    { n: "Paikaltaveto", d: "Seuraavassa heitössä kohde ei saa ottaa yhtään vauhtiaskelta." },
    { n: "Haaraseisonta", d: "Seuraava heitto on suoritettava pakollisesta ja staattisesta haaraseisonnasta." },
    { n: "Polvelta", d: "Seuraava heitto on suoritettava siten, että vähintään toinen polvi on maassa irrotushetkellä." },
    { n: "Kurki-asento", d: "Heiton irrotushetkellä vain yksi jalka saa koskea maahan." },
    { n: "Kiekon rajoitus", d: "Määrää yksi kiekko kohteen bägistä, jota hän ei saa käyttää seuraavaan heittoon." },
    { n: "Pakollinen Hysse", d: "Seuraavan heiton on oltava selkeä hyzer. Jos kiekko kääntää yli, heitto uusitaan rangaistuksella (+1)." },
    { n: "Pakollinen Antsa", d: "Seuraavan heiton on lähdettävä selkeässä anhyzer-kulmassa." },
    { n: "Fore-lähestyminen", d: "Kohteen seuraava heitto (pl. avaus) on heitettävä kämmenellä (fore)." },
    { n: "Rysty-lähestyminen", d: "Kohteen seuraava heitto (pl. avaus) on heitettävä rystyllä." },
    { n: "Ei ristiaskelta", d: "Vauhdinotossa ei saa käyttää ristiaskelta (x-step)." },
    { n: "Putteriavaus", d: "Avausheitto tiiltä on pakko suorittaa putterilla." },
    { n: "Midariavaus", d: "Avausheitto tiiltä on pakko suorittaa midrange-kiekolla." },
    { n: "Pikaveto (10s)", d: "Kohteella on maksimissaan 10 sekuntia aikaa heittää saavuttuaan markkerille." },
    { n: "Selin koriin irrotus", d: "Heiton irrotushetkellä kohteen rintamasuunnan on oltava poispäin korista." },
    { n: "Kevyt kiekko", d: "Kohteen on valittava bägistään kevyin tai alivakain kiekkonsa seuraavaan heittoon." },
    { n: "Painava kiekko", d: "Kohteen on valittava bägistään vakain tai painavin kiekkonsa seuraavaan heittoon." },
    { n: "Ei saattoa", d: "Heittokäden on pysähdyttävä kuin seinään välittömästi irrotuksen jälkeen." },
    { n: "Putti haaralta", d: "Kaikki putit tällä väylällä on pakko suorittaa leveänä haaraputtina." },
    { n: "Esteen kuvittelu", d: "Aseta kohteen bägi 1,5 metrin päähän suoraan heittolinjalle. Heiton on kierrettävä tai ylitettävä se." }
];
minorBases.forEach((base, i) => window.allCards.push({ id: "minor_" + i, n: base.n, d: base.d, tier: "normal", type: "minor_sabotage" }));

// ==========================================
// TASO 2: ISOT SABOTAASIT (Muuttavat fysiikkaa radikaalisti)
// Lisätty 🔥 SELÄTYSMAHDOLLISUUS suoraan kuvaukseen (Task 7)
// ==========================================
const majorBases = [
    { n: "Heikompi käsi (Avaus)", d: "Avausheitto tiiltä on heitettävä heikommalla kädellä.", diff: 3 },
    { n: "Rolleri-pakko", d: "Seuraavan heiton on osuttava maahan ja rullattava eteenpäin vähintään 10m.", diff: 3 },
    { n: "Upsi / Tomahawk", d: "Seuraava heitto on suoritettava pystyheitolla (Upsi/Tomahawk/Thumber).", diff: 2 },
    { n: "Turbo-putti", d: "Seuraava putti on suoritettava sormilla kiekon alta työntäen (Turbo).", diff: 2 },
    { n: "Scooberi", d: "Suorita lähestymisheitto ylösalaisella scuuberi-tyylillä.", diff: 3 },
    { n: "Vain 1 kiekko (Väylä)", d: "Kohde joutuu pelaamaan tämän väylän loppuun asti vain yhdellä valitsemallasi kiekolla.", diff: 2 },
    { n: "Silmät kiinni putti", d: "Kaikki alle 10 metrin putit on suoritettava silmät tiukasti kiinni.", diff: 3 },
    { n: "Vastakierre", d: "Kiekon on lähdettävä kädestä siten, että se pyörii väärään suuntaan (esim. rysty ilman rannetta).", diff: 3 },
    { n: "Kämmen-rolleri", d: "Seuraava heitto on suoritettava kämmen-rollerina (fore-roller).", diff: 3 },
    { n: "Draiveriputti", d: "Kaikki putit tällä väylällä on suoritettava nopeimmalla pituusdraiverilla.", diff: 1 },
    { n: "Istualtaan heitto", d: "Seuraava heitto on pakko heittää maassa istuen (pylly kiinni maassa).", diff: 3 },
    { n: "Aliheitto", d: "Heitto on suoritettava roikkuvana alakauttaheilautuksena.", diff: 3 },
    { n: "Väärä jalka tukena", d: "Tukijalkana markkerin takana on käytettävä väärää jalkaa (oikeakätisellä oikea jalka takana).", diff: 2 },
    { n: "Kiekon pakkovalinta", d: "Valitse kohteen bägistä 1 kiekko, jolla hänen on pakko suorittaa avaus.", diff: 2 }
];
majorBases.forEach((base, i) => {
    let diffStars = "⭐".repeat(base.diff);
    let selatysText = `<br><br><span style="color:#ef4444; font-weight:900; font-size:1.15em;">🔥 SELÄTYSMAHDOLLISUUS:</span> Tee Par tai parempi tulos tästä rangaistuksesta huolimatta!`;
    window.allCards.push({ id: "major_" + i, n: base.n, d: `[Vaikeus: ${diffStars}] ${base.d}${selatysText}`, tier: "normal", type: "major_sabotage", diff: base.diff });
});

// ==========================================
// TASO 1: PERUS HELPOTUKSET (Buffit)
// ==========================================
const buffBases = [
    { n: "Mulligan", d: "Voit uusia oman epäonnistuneen heittosi." },
    { n: "Mulligan (Putti)", d: "Voit uusia epäonnistuneen putin (alle 10m)." },
    { n: "Mulligan (Avaus)", d: "Voit uusia epäonnistuneen avausheiton tiiltä." },
    { n: "Siirto +2m", d: "Voit siirtää kiekkoasi 2 metriä mihin tahansa suuntaan (ei lähemmäs koria)." },
    { n: "Siirto +5m", d: "Voit siirtää kiekkoasi 5 metriä mihin tahansa suuntaan (ei lähemmäs koria)." },
    { n: "Kumous", d: "Peruuta sinuun juuri kohdistettu 1-tason (pieni) sabotaasi." },
    { n: "Vahva Kumous", d: "Peruuta sinuun kohdistettu 2-tason (iso) sabotaasi." },
    { n: "Peilaus", d: "Jos joku pelaa sinuun sabotaasin, voit kääntää sen välittömästi takaisin häneen itseensä." },
    { n: "Puskasta pois", d: "Saat siirtää kiekkosi vapaasti pelattavalle väylälle samalle etäisyydelle korista." },
    { n: "Varaslähtö", d: "Saat heittää 2 avausheittoa tiiltä ja jatkaa niistä vapaasti paremmalla." },
    { n: "Mando-ohitus", d: "Jos väylällä on mando, saat jättää sen huomioimatta ilman rangaistusta." },
    { n: "OB-pelastus", d: "Jos heitit Out of Bounds (OB), saat jatkaa heittopaikalta ilman rangaistusheittoa." },
    { n: "Oksan poisto", d: "Kuvitteellinen oksasaha: Saat jättää huomioimatta yhden edessä olevan oksan tai pensaan (siirrä kiekkoa hieman sivuun)." },
    { n: "Turvamies", d: "Suojaa sinut kaikilta sabotaaseilta koko tämän väylän ajan. Pelattava ennen avausheittoa." },
    { n: "Lähinnä koria", d: "Jos olet lähimpänä koria avauksen jälkeen (CTP), saat +1 pelirahaa kassaan." },
    { n: "Tuplavoitto", d: "Jos voitat tämän väylän (yksin tai jaettuna), saat x2 väylävoiton pisteet!", mech: "double_win" },
    { n: "Tuplatehtävä", d: "Jos voitat väylätehtävän, saat siitä tuplamäärän (x2) rahaa automaattisesti.", mech: "double_task" },
    { n: "Pankkiiri", d: "Saat ottaa pankista yhden satunnaisen 1-tason (pienen) sabotaasin itsellesi ilmaiseksi." },
    { n: "Tiipaikan vaihto", d: "Saat heittää avauksesi mistä tahansa kohtaa tiipadiltä tai sen sivusta (max 2m säteellä)." },
    { n: "Taikamarkkeri", d: "Saat asettaa markkerisi ETEENPÄIN (tasan 1 metri lähemmäs koria)." },
    { n: "Kilpi", d: "Aktivoituu heti kun se pelataan. Seuraava sinuun kohdistuva sabotaasi mitätöityy automaattisesti." },
    { n: "Kiekon lainaus", d: "Voit ottaa yhden vastustajan kiekon omaan käyttöösi tälle väylälle." },
    { n: "Ketjuralli", d: "Jos putti osuu ketjuihin mutta sylkee ulos, se lasketaan sisään menneeksi." },
    { n: "Riskitön", d: "Jos heität seuraavan heittosi vesiesteeseen tai pahasti puskaan, saat heittää sen rangaistuksetta uudelleen." },
    { n: "Ei sääntöjä", d: "Voit astua markkerin yli heti irrotuksen jälkeen, vaikka olisit alle 10m ringissä." },
    { n: "Parantaja", d: "Poista valitsemaltasi pelaajalta yksi rangaistusheitto tuloskortista (voi käyttää myös itseensä)." },
    { n: "Suunta on oikea", d: "Jos heitto lähtee täysin väärään suuntaan (yli 45 astetta tavoitteesta), saat uusia sen ilmaiseksi." },
    { n: "Ketjuklinikka", d: "Jos osut rautoihin (ala/ylä) mutta et ketjuihin, saat uusia putin." },
    { n: "Helpotettu väylä", d: "Jos väylällä on OB, koko väylä pelataan ilman OB-sääntöjä (ei rangaistusta)." }
];
buffBases.forEach((base, i) => window.allCards.push({ id: "buff_" + i, n: base.n, d: base.d, tier: "normal", type: "buff", mech: base.mech || null }));

// ==========================================
// TASO 3: KAUPAN MONSTERIKORTIT (Premium)
// ==========================================
const monsterBases = [
    { n: "Köyhyyskirous", d: "Kohde ei saa ollenkaan passiivista tuloa tältä väylältä.", type: "major_sabotage", price: 12, mech: "deny_passive" },
    { n: "Veromätky", d: "KAIKKI vastustajat menettävät passiivisen tulonsa tältä väylältä.", type: "major_sabotage", price: 20, aoe: true, mech: "deny_passive" },
    { n: "Palkkion eväys", d: "Kohde ei saa väylävoiton pisteitä, vaikka hän voittaisi tämän väylän.", type: "major_sabotage", price: 15, mech: "deny_win" },
    { n: "Täystuho", d: "Määrää yksi Iso Sabotaasi (Taso 2) täysin itse keksimilläsi säännöillä kohteelle.", type: "major_sabotage", price: 20 },
    { n: "OB-Magneetti", d: "Valitse kohde. Jos hän menee OB:lle tällä väylällä, hän saa +2 rangaistusheittoa normaalin +1 sijaan.", type: "major_sabotage", price: 18 },
    { n: "Pankin Tuki", d: "Saat pankista välittömästi uuden rahoituksen (+8 P).", type: "buff", price: 12 }, 
    { n: "Kiekkolukko", d: "Kiellä kohdetta käyttämästä hänen luottodraiveriaan koko loppukierroksen ajan.", type: "major_sabotage", price: 25 },
    { n: "Laser-Tähtäin", d: "Voit siirtää mitä tahansa alle 20m puttiasi 5 metriä lähemmäs koria.", type: "buff", price: 15 },
    { n: "Vaihtokauppa", d: "Vaihda huono avausheittosi paikkaa kohteen hyvän avauksen kanssa.", type: "major_sabotage", price: 25 },
    { n: "Jumal-Kumous", d: "Pelaa tämä peruuttaaksesi MIKÄ TAHANSA sabotaasi (myös monsteri).", type: "buff", price: 18 },
    { n: "Par-Varmistus", d: "Heitä normaalisti. Tuloskorttiisi merkitään automaattisesti enintään PAR (Vaikka heittäisit 10).", type: "buff", price: 22, mech: "force_par" },
    { n: "Korttijäädytys", d: "Kohde ei saa pelata yhtäkään korttia kädestään seuraavien 3 väylän aikana.", type: "major_sabotage", price: 20 },
    { n: "Ukkosmyrsky", d: "KAIKKI vastustajat heittävät avauksensa väärällä kädellä tällä väylällä.", type: "major_sabotage", price: 30, aoe: true },
    { n: "Haamukiekko", d: "Koko loppukierroksen ajan, kerran väylässä saat peruuttaa yhden heittosi ilmaiseksi.", type: "buff", price: 35 },
    { n: "Korttikato", d: "Kohde ei saa nostaa uusia kortteja tämän väylän tulosten jaon yhteydessä.", type: "major_sabotage", price: 18, mech: "deny_draw" },
    { n: "Magneettikori", d: "Seuraava putti alle 15m lasketaan aina sisään menneeksi, osuipahan se tai ei.", type: "buff", price: 20 }
];
monsterBases.forEach((base, i) => window.allCards.push({ id: "monster_" + i, n: `${base.n}`, d: base.d, tier: "premium", type: base.type, price: base.price, aoe: base.aoe || false, mech: base.mech || null }));

// ==========================================
// VÄYLÄSÄÄNNÖT (Koko porukan tehtävät & säännöt)
// ==========================================
window.holeRules = [
    { type: "rule", n: "Putteri-Ruletti", d: "Koko väylä pelataan pelkillä puttereilla. Muut kiekot kielletty." },
    { type: "rule", n: "Kämmenväylä", d: "Kaikki yli 10 metrin lähestymiset ja avaukset on pakko heittää kämmeneltä (forehand)." },
    { type: "rule", n: "Rystyn kielto", d: "Rystyheitot ovat täysin kiellettyjä tällä väylällä." },
    { type: "rule", n: "Heikompi käsi avaus", d: "Kaikkien on suoritettava avausheitto heikommalla kädellään." },
    { type: "rule", n: "Yhden kiekon taktiikka", d: "Jokaisen on valittava vain YKSI kiekko, jolla pelataan väylä alusta loppuun." },
    { type: "rule", n: "Rolleriavaus", d: "Kaikkien on pakko yrittää roller-avausta tiiltä." },
    { type: "rule", n: "Midari-Only", d: "Väylä on pakko pelata vain ja ainoastaan midareilla." },
    { type: "rule", n: "Aina haaraseisonta", d: "Kaikki heitot (myös avaus) on heitettävä paikaltaan haaraseisonnasta." },
    { type: "rule", n: "Upsi-avaus", d: "Kaikkien pelaajien on pakko avata tiiltä pystyheitolla (Upsi tai Thumber)." },
    { type: "rule", n: "Speed Golf", d: "Tätä väylää ei mietitä. Jokaisella on vain 5 sekuntia aikaa heittää omalla vuorollaan." },
    { type: "rule", n: "Väärä liikerata", d: "Kaikki vauhdinotto tapahtuu peruuttaen tiille päin." },
    { type: "rule", n: "Fore-putti", d: "Kaikki putit tällä väylällä on suoritettava kämmenellä (fore)." },
    { type: "rule", n: "Ei hyppyputteja", d: "Kaikki hyppy- tai steppiputit on kielletty tällä väylällä." },
    { type: "rule", n: "Kyykkyputti", d: "Kaikki C1 (10m) sisällä olevat putit on heitettävä syvästä kyykystä." },
    { type: "rule", n: "Pitkä saatto", d: "Käden on osoitettava koria kohti 3 sekuntia irrotuksen jälkeen." },
    { type: "bounty", n: "CTP-Kisa", d: "Tiiltä lähimmäksi koria osunut avaus voittaa väylätehtävän." },
    { type: "bounty", n: "Pitkä Putti", d: "Väylän pisimmän onnistuneen putin tekijä voittaa väylätehtävän." },
    { type: "bounty", n: "Pelastaja", d: "Ensimmäinen pelaaja, joka menee ryteikköön tai OB:lle, mutta pelastaa silti Par-tuloksen, voittaa tehtävän." },
    { type: "bounty", n: "Puu-Kuningas", d: "Se pelaaja, joka osuu eniten puihin tällä väylällä mutta EI saa eniten heittoja, voittaa tehtävän." },
    { type: "bounty", n: "Ensimmäinen rauta", d: "Ensimmäinen pelaaja joka puttaa alarautaan tai ylärautaan (ei sisään), voittaa tehtävän." },
    { type: "bounty", n: "Parkkeeraus", d: "Se pelaaja, jonka avaus jää alle 2 metrin päähän korista, voittaa tehtävän." },
    { type: "bounty", n: "Ei sirkkeliä", d: "Pelaaja, joka selviää koko väylän osumatta kertaakaan puuhun, voittaa tehtävän." },
    { type: "bounty", n: "Bullseye Putti", d: "Ensimmäinen, joka upottaa putin yli 10 metrin (C1) rajalta, voittaa tehtävän." },
    { type: "bounty", n: "Nosto", d: "Se pelaaja, jolla on lyhyin putti ('nosto') jäljellä, voittaa tehtävän." },
    { type: "bounty", n: "Birdie-jahti", d: "Kaikki ketkä tekevät tällä väylällä Birdien (alle parin), voittavat tehtävän." },
    { type: "bounty", n: "Bogey-Vapaa", d: "Kaikki jotka pelaavat väylän ilman Bogeya (yli par), jakavat tehtävän voiton." },
    { type: "bounty", n: "Nopein heittäjä", d: "Se pelaaja, joka pelaa oman vuoronsa poikkeuksetta nopeimmin (ilman viivyttelyä), voittaa tehtävän." },
    { type: "bounty", n: "Sweet Spot", d: "Kuka pääsee avauksella parhaaseen 'sweet spottiin' (pelattavimpaan paikkaan), voittaa tehtävän." },
    { type: "bounty", n: "Riskinottaja", d: "Se, joka yrittää rohkeinta ja vaikeinta linjaa (onnistui tai ei), voittaa tehtävän (ryhmä äänestää)." }
];
