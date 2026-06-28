window.allCards = [];
window.holeRules = [];

// ==========================================
// ELÄINTEN GRAFIIKAT JA SOLVAUKSET (Yleiset ja Henkilökohtaiset)
// ==========================================
const doodleSVGs = [
    "M 20 80 Q 20 60 40 60 L 45 40 L 50 60 L 60 30 L 65 60 L 75 40 L 80 80 Z M 30 70 L 32 70 M 15 75 L 20 80 M 85 75 L 80 80", 
    "M 20 80 L 20 40 L 30 20 L 40 40 L 60 40 L 70 20 L 80 40 L 80 80 Z M 35 55 L 37 55 M 65 55 L 63 55 M 45 65 L 55 65 L 50 72 Z",
    "M 20 80 C 20 30 80 30 80 80 Z M 20 40 C 10 40 10 20 25 30 M 80 40 C 90 40 90 20 75 30 M 40 55 L 42 55 M 60 55 L 58 55",
    "M 50 80 C 20 80 20 30 50 30 C 80 30 80 80 50 80 Z M 40 55 L 60 55 L 50 70 Z M 35 45 L 40 48 M 65 45 L 60 48"
];

const insults = [
    "[Pelaaja], v*ttu mikä heitto, ootko sä koskaan edes pitänyt kiekkoa kädessä?",
    "[Pelaaja] p*rkele, mummonikin puttaa paremmin.",
    "S**tanan sirkkeli [Pelaaja], puut tykkää susta enemmän ku sun omat vanhemmat.",
    "Ei h*lvetti [Pelaaja], jopa Jeesus itkee ton sun tekniikan takia.",
    "P*ska veto [Pelaaja]. Sun draivi on lyhyempi ku mun kärsivällisyys.",
    "V*tun hieno lay-up [Pelaaja]! Ai se olikin sun maksimidraivi?",
    "P*rkeleen rystykääntö [Pelaaja], kiekko lensi enemmän taakse ku eteen.",
    "Miten sä [Pelaaja] v*ttu onnistut missaamaan kahdesta metristä?",
    "H*lvetin hieno puuosuma [Pelaaja]! Tähtäsitkö tahallaan vai ootko vaan sysip*ska?",
    "P*rkele [Pelaaja], sun rystyheitto näyttää ku yrittäisit heittää pesukonetta.",
    "V*tun grippilokki [Pelaaja]! Ota se käsi irti siitä muovista ajoissa.",
    "P*ska putti, p*ska pelaaja. Yksinkertaista, eikö vain [Pelaaja]?",
    "V*ttu mulla sulaa aivot ku joutuu kattoon tota sun räpellystä, [Pelaaja]."
];

// ==========================================
// TASO 1: PIENET SABOTAASIT (50 Kpl - Uniikit)
// Fysiikkahaasteita ja pieniä automaatiosakkoja
// ==========================================
const minorBases = [
    { n: "Heikompi käsi (Putti)", d: "Kohteen on suoritettava alle 10m putit heikommalla kädellään tällä väylällä." },
    { n: "Paikaltaveto", d: "Kohteen on heitettävä seuraava avaus täysin ilman vauhtiaskeleita." },
    { n: "Haaraseisonta", d: "Seuraava heitto on suoritettava staattisesta haaraseisonnasta." },
    { n: "Polvelta", d: "Seuraava heitto on suoritettava vähintään toinen polvi maassa." },
    { n: "Kurki-asento", d: "Heiton irrotushetkellä vain yksi jalka saa koskea maahan." },
    { n: "Kiekon rajoitus", d: "Määrää 1 kiekko kohteen bägistä, jota hän ei saa käyttää tällä väylällä." },
    { n: "Pakollinen Hysse", d: "Seuraavan heiton on oltava selkeä hyzer-kulma." },
    { n: "Pakollinen Antsa", d: "Seuraavan heiton on lähdettävä selkeässä anhyzer-kulmassa." },
    { n: "Fore-lähestyminen", d: "Kohteen seuraava heitto (pl. avaus) on heitettävä kämmenellä (fore)." },
    { n: "Rysty-lähestyminen", d: "Kohteen seuraava heitto (pl. avaus) on heitettävä rystyllä." },
    { n: "Ei ristiaskelta", d: "Vauhdinotossa ei saa käyttää ristiaskelta (x-step)." },
    { n: "Putteriavaus", d: "Avausheitto tiiltä on pakko suorittaa putterilla." },
    { n: "Midariavaus", d: "Avausheitto tiiltä on pakko suorittaa midrange-kiekolla." },
    { n: "Pikaveto (10s)", d: "Kohteella on maksimissaan 10 sekuntia aikaa heittää merkiltä." },
    { n: "Selin koriin", d: "Heiton irrotushetkellä kohteen rintamasuunnan on oltava poispäin korista." },
    { n: "Kevyt kiekko", d: "Kohteen on valittava bägistään kevyin tai alivakain kiekkonsa." },
    { n: "Painava kiekko", d: "Kohteen on valittava bägistään vakain tai painavin kiekkonsa." },
    { n: "Ei saattoa", d: "Heittokäden on pysähdyttävä kuin seinään heti irrotuksen jälkeen." },
    { n: "Putti haaralta", d: "Kaikki putit tällä väylällä on pakko suorittaa haaraputtina." },
    { n: "Esteen kuvittelu", d: "Aseta kohteen bägi 1.5 metrin päähän heittolinjalle. Heiton on kierrettävä se." },
    { n: "Silmät kiinni irrotus", d: "Kohde joutuu sulkemaan silmänsä juuri ennen heiton irrotusta." },
    { n: "Korkea heitto", d: "Seuraavan heiton on käytävä vähintään 5 metrin korkeudessa." },
    { n: "Matala heitto", d: "Seuraavan heiton on pysyttävä alle 2 metrin korkeudessa." },
    { n: "Ei peukaloa", d: "Peukalo ei saa koskea kiekon kanteen heiton aikana." },
    { n: "Ei etusormea", d: "Etusormi ei saa koskea kiekon rimiin heiton aikana." },
    { n: "Istualtaan putti", d: "Kaikki alle 5m putit on suoritettava maassa istuen." },
    { n: "Vapaa käsi taskuun", d: "Vapaa käsi on pidettävä housuntaskussa koko heiton ajan." },
    { n: "Maksimiteho", d: "Seuraava lähestyminen on heitettävä 100% täysillä, vaikka kori olisi lähellä." },
    { n: "Bägi selässä", d: "Kohteen on pidettävä bägi selässään seuraavan heiton ajan." },
    { n: "Tiukka tuijotus", d: "Seuraavan heiton ajan kohteen on katsottava vain kiekkoon, ei koria kohti." },
    { n: "Ei kyykkyä", d: "Kohde ei saa taivuttaa polviaan seuraavassa heitossa lainkaan." },
    { n: "Piru olkapäällä", d: "Saat seistä kohteen vieressä ja puhua häiritsevästi koko heittosuorituksen ajan." },
    { n: "Vain päkiöillä", d: "Kohteen on oltava varpaillaan/päkiöillään koko heittoliikkeen ajan." },
    { n: "Hidasliike", d: "Kohteen on tehtävä seuraava vauhdinotto ja heitto korostetun hitaasti." },
    { n: "Yhden sormen grippi", d: "Kiekosta saa pitää kiinni vain peukalolla ja yhdellä muulla sormella." },
    // Automaatio-pikkusabot (+1 heitto tai häiriö)
    { n: "Sakkorinki (+1)", d: "Lisää automaattisesti +1 heitto kohteen väylätulokseen.", mech: "score_+1" },
    { n: "Pieni kompastus (+1)", d: "Lisää automaattisesti +1 heitto kohteen väylätulokseen.", mech: "score_+1" },
    { n: "Korttivarkaus", d: "Kohde ei saa nostaa uusia kortteja tämän väylän lopussa.", mech: "deny_draw" },
    { n: "Huono Tuuri (+1)", d: "Lisää automaattisesti +1 heitto kohteen väylätulokseen.", mech: "score_+1" },
    { n: "Väärä arvio (+1)", d: "Lisää automaattisesti +1 heitto kohteen väylätulokseen.", mech: "score_+1" },
    { n: "Kiekkopesu (+1)", d: "Lisää automaattisesti +1 heitto kohteen väylätulokseen.", mech: "score_+1" },
    { n: "Oksa tiellä (+1)", d: "Lisää automaattisesti +1 heitto kohteen väylätulokseen.", mech: "score_+1" },
    { n: "Tuulen viemää (+1)", d: "Lisää automaattisesti +1 heitto kohteen väylätulokseen.", mech: "score_+1" },
    { n: "Nälkäkiukku", d: "Kohde ei saa nostaa kortteja väylän lopussa.", mech: "deny_draw" },
    { n: "Jumiutunut Vetoketju", d: "Kohteelta viedään kortinnosto oikeus tältä väylältä.", mech: "deny_draw" },
    { n: "Pikku Kämmi (+1)", d: "Lisää automaattisesti +1 heitto kohteen väylätulokseen.", mech: "score_+1" },
    { n: "Lipsahdus (+1)", d: "Lisää automaattisesti +1 heitto kohteen väylätulokseen.", mech: "score_+1" },
    { n: "Varvaskipu (+1)", d: "Lisää automaattisesti +1 heitto kohteen väylätulokseen.", mech: "score_+1" },
    { n: "Epäkesko (+1)", d: "Lisää automaattisesti +1 heitto kohteen väylätulokseen.", mech: "score_+1" },
    { n: "Huti! (+1)", d: "Lisää automaattisesti +1 heitto kohteen väylätulokseen.", mech: "score_+1" }
];
minorBases.forEach((base, i) => window.allCards.push({ id: "minor_" + i, n: base.n, d: base.d, tier: "normal", type: "minor_sabotage", diff: 1, mech: base.mech || null }));

// ==========================================
// TASO 2: ISOT SABOTAASIT (50 Kpl - Uniikit)
// Vaikeita fysiikkahaasteita. AINA mukana Selätys!
// ==========================================
const majorBases = [
    { n: "Heikompi käsi (Avaus)", d: "Avausheitto tiiltä on heitettävä heikommalla kädellä.", diff: 3 },
    { n: "Rolleri-pakko", d: "Seuraavan heiton on osuttava maahan ja rullattava eteenpäin vähintään 10m.", diff: 3 },
    { n: "Upsi / Tomahawk", d: "Seuraava heitto on suoritettava pystyheitolla (Upsi/Tomahawk/Thumber).", diff: 2 },
    { n: "Turbo-putti", d: "Seuraava putti on suoritettava sormilla kiekon alta työntäen (Turbo).", diff: 2 },
    { n: "Scooberi", d: "Suorita lähestymisheitto ylösalaisella scuuberi-tyylillä.", diff: 3 },
    { n: "Vain 1 kiekko (Väylä)", d: "Kohde joutuu pelaamaan tämän väylän loppuun asti vain yhdellä valitsemallasi kiekolla.", diff: 2 },
    { n: "Silmät kiinni putti", d: "Kaikki alle 10 metrin putit on suoritettava silmät tiukasti kiinni.", diff: 3 },
    { n: "Vastakierre", d: "Kiekon on lähdettävä kädestä siten, että se pyörii väärään suuntaan.", diff: 3 },
    { n: "Kämmen-rolleri", d: "Seuraava heitto on suoritettava kämmen-rollerina (fore-roller).", diff: 3 },
    { n: "Draiveriputti", d: "Kaikki putit tällä väylällä on suoritettava nopeimmalla pituusdraiverilla.", diff: 1 },
    { n: "Istualtaan heitto", d: "Seuraava heitto on pakko heittää maassa istuen (pylly kiinni maassa).", diff: 3 },
    { n: "Aliheitto", d: "Heitto on suoritettava roikkuvana alakauttaheilautuksena.", diff: 3 },
    { n: "Väärä jalka tukena", d: "Tukijalkana markkerin takana on käytettävä väärää jalkaa.", diff: 2 },
    { n: "Sokkoavaus", d: "Avausheitto tiiltä silmät kiinni. Turvamies ohjeistaa suunnan!", diff: 3 },
    { n: "Peilikuva", d: "Kohteen on matkittava edellisen pelaajan heittotyyliä (kämmen/rysty) tismalleen.", diff: 2 },
    { n: "Pizza-grippi", d: "Kiekosta pidetään molemmin käsin kiinni reunoista (kuin pitsalaatikosta) ja heitetään alakautta.", diff: 3 },
    { n: "Kämmenpakko koko väylä", d: "Kohde joutuu pelaamaan koko väylän pelkillä kämmenheitoilla.", diff: 3 },
    { n: "Rystypakko koko väylä", d: "Kohde joutuu pelaamaan koko väylän pelkillä rystyheitoilla.", diff: 3 },
    { n: "Midari-putti", d: "Kaikki putit tällä väylällä on pakko suorittaa midarilla.", diff: 1 },
    { n: "Ei juoksuaskelia", d: "Koko väylä pelataan paikaltaan heittäen. Vauhdinotto on kielletty.", diff: 2 },
    { n: "Täyskäsi", d: "Kohteen on pidettävä vapaassa kädessään 3 kiekkoa jokaisen heiton ajan.", diff: 2 },
    { n: "Yhden jalan väylä", d: "Joka ikisessä heitossa saa olla vain yksi jalka maassa irrotushetkellä.", diff: 3 },
    { n: "Bägi tiellä", d: "Kohde joutuu asettamaan bäginsä suoraan eteensä jokaisen heiton (paitsi putin) ajaksi.", diff: 2 },
    { n: "Pakkokyykky", d: "Kaikki heitot tällä väylällä on suoritettava syvästä kyykystä.", diff: 3 },
    { n: "Kiekkotorni", d: "Aseta kiekon päälle toinen kiekko. Heitä alimmaista niin että ylin vain putoaa maahan.", diff: 3 },
    { n: "Piru olkapäällä 2.0", d: "Kaikki muut pelaajat saavat pitää meteliä ja häiritä kohdetta heittojen aikana.", diff: 2 },
    { n: "Selkäkääntö", d: "Kaikki heitot on irrotettava siten, että rintamasuunta on täysin korista poispäin.", diff: 3 },
    { n: "Vain Putterit", d: "Kohde saa pelata tämän väylän vain puttereilla.", diff: 1 },
    { n: "Putti heikolla kädellä", d: "Kaikki C1 ja C2 putit on heitettävä heikommalla kädellä.", diff: 3 },
    { n: "Pikagolf", d: "Koko väylä on pelattava niin, että heittoihin saa käyttää max 5 sekuntia markkerilla.", diff: 2 },
    // Automaatiot (+2 heittoa jne on siirretty kauppaan, tässä estetään vain pisteitä)
    { n: "Voiton Eväys", d: "Kohde ei saa väylävoiton pisteitä automaattisesti, vaikka hän voittaisi.", diff: 2, mech: "deny_win" },
    { n: "Tehtävän Eväys", d: "Kohde ei saa väylätehtävän pisteitä automaattisesti, vaikka suorittaisi sen.", diff: 2, mech: "deny_task" },
    { n: "Palkkion Nollaus", d: "Kohde ei saa passiivista tuloa tältä väylältä.", diff: 2, mech: "deny_passive" },
    { n: "Menestyksen Esto", d: "Kohde menettää mahdollisuuden väylävoiton pisteisiin.", diff: 2, mech: "deny_win" },
    { n: "Ei Tehtävää", d: "Kohteelta evätään kaikki tehtäväpalkkiot tältä väylältä.", diff: 2, mech: "deny_task" },
    { n: "Tyhjä Kassa", d: "Kohde menettää passiivisen tulonsa automaattisesti.", diff: 2, mech: "deny_passive" },
    // Lisätään vaikeita mekaanisia haasteita 50 asti
    { n: "Ranne lukkoon", d: "Koko väylän ajan rannetta ei saa taittaa, heittojen on lähdettävä suoralla kädellä.", diff: 3 },
    { n: "Painon siirto kielletty", d: "Painon on pysyttävä täysin takajalalla koko heittoliikkeen ajan.", diff: 3 },
    { n: "Hypyt kielletty", d: "Kohde ei saa ottaa yhtäkään hyppyaskelta tai steppiputtia tällä väylällä.", diff: 1 },
    { n: "Putti silmät kiinni", d: "Kaikki alle 15m putit on suoritettava silmät tiukasti kiinni.", diff: 3 },
    { n: "Väärä ote", d: "Kiekon pohjasta on pidettävä kiinni, sormet kannen puolella koko väylän ajan.", diff: 3 },
    { n: "Tähtäyskielto", d: "Kohde joutuu heittämään avauksensa ja lähestymisensä katsomatta koria kohti lainkaan.", diff: 3 },
    { n: "Pudotus", d: "Kiekko on heitettävä pään yläpuolelta ns. jalkapallo-rajaheittona.", diff: 3 },
    { n: "Kahden käden heitto", d: "Kaikista kiekoista on pidettävä kaksin käsin kiinni irrotushetkeen asti.", diff: 3 },
    { n: "Pitkä Markkeri", d: "Kohde joutuu siirtämään markkeriaan jokaisella heitolla 2 metriä KAUEMMAS korista.", diff: 2 },
    { n: "Vastatuuli", d: "Jos tuulee, kohde joutuu odottamaan kovaa tuulenpuuskaa ennen heittoa.", diff: 1 },
    { n: "Vesikammo", d: "Jos väylällä on vesieste, kohteen on käytettävä kaikkein vakainta kiekkoaan.", diff: 2 },
    { n: "Puunhalaaja", d: "Kohteen on kosketettava vapaalla kädellään puuta aina heittäessään, jos sellainen on 2m säteellä.", diff: 2 },
    { n: "Väylä lukossa", d: "Valitse yksi linja/reitti. Kohde ei saa missään nimessä heittää sitä kautta.", diff: 2 },
    { n: "Maakosketus", d: "Käden on osuttava maahan jokaisen heiton saaton päätteeksi.", diff: 2 }
];
let selatys = `<br><br><span style="color:#ef4444; font-weight:900; font-size:1.15em;">🔥 SELÄTYSMAHDOLLISUUS:</span> Tee Par tai parempi tulos tästä rangaistuksesta huolimatta!`;
majorBases.forEach((base, i) => {
    let diffStars = "⭐".repeat(base.diff);
    window.allCards.push({ id: "major_" + i, n: base.n, d: `[Vaikeus: ${diffStars}] ${base.d}${selatys}`, tier: "normal", type: "major_sabotage", diff: base.diff, mech: base.mech || null });
});

// ==========================================
// TASO 1: HELPOTUKSET (70 Kpl - Uniikit)
// Automaatioita ja fyysisiä helpotuksia
// ==========================================
const buffBases = [
    { n: "Pieni Kumous", d: "Peruuta sinuun juuri kohdistettu 1-tason (pieni) sabotaasi automaattisesti.", mech: "cancel_minor" },
    { n: "Vahva Kumous", d: "Peruuta sinuun kohdistettu 2-tason (iso) sabotaasi automaattisesti.", mech: "cancel_major" },
    { n: "Täys Kumous", d: "Peruuta MIKÄ TAHANSA sinuun kohdistettu sabotaasi automaattisesti.", mech: "cancel_all" },
    { n: "Peilaus", d: "Käännä sinuun pelattu sabotaasi automaattisesti takaisin sen alkuperäiselle pelaajalle.", mech: "reflect" },
    { n: "Turvakilpi", d: "Suojaa sinut automaattisesti seuraavalta sabotaasilta tällä väylällä.", mech: "shield" },
    { n: "Tuplavoitto", d: "Jos voitat tämän väylän, saat x2 voittopisteet automaattisesti!", mech: "double_win" },
    { n: "Tuplatehtävä", d: "Jos voitat väylätehtävän, saat x2 rahat automaattisesti.", mech: "double_task" },
    { n: "Korttisade", d: "Nostat automaattisesti 2 uutta korttia tämän väylän lopussa.", mech: "draw_2" },
    { n: "Lisänosto", d: "Nostat automaattisesti 1 uuden kortin tämän väylän lopussa.", mech: "draw_1" },
    { n: "Mulligan", d: "Voit uusia oman epäonnistuneen heittosi fyysisesti rangaistuksetta." },
    { n: "Mulligan (Putti)", d: "Voit uusia epäonnistuneen putin fyysisesti rangaistuksetta." },
    { n: "Mulligan (Avaus)", d: "Voit uusia epäonnistuneen avausheiton tiiltä fyysisesti." },
    { n: "Siirto +2m", d: "Voit siirtää kiekkoasi 2m mihin tahansa suuntaan (ei lähemmäs koria)." },
    { n: "Siirto +5m", d: "Voit siirtää kiekkoasi 5m mihin tahansa suuntaan (ei lähemmäs koria)." },
    { n: "Puskasta pois", d: "Saat siirtää kiekkosi vapaasti pelattavalle väylälle samalle etäisyydelle korista." },
    { n: "OB-pelastus", d: "Jos heitit OB, saat jatkaa heittopaikalta ilman rangaistusheittoa." },
    { n: "Taikamarkkeri", d: "Saat asettaa markkerisi tasan 1 metrin lähemmäs koria." },
    { n: "Helpotettu väylä", d: "Koko väylä pelataan osaltasi ilman OB-sääntöjä (ei rangaistuksia)." },
    { n: "Pieni Kumous 2", d: "Peruuta sinuun juuri kohdistettu 1-tason sabotaasi automaattisesti.", mech: "cancel_minor" },
    { n: "Vahva Kumous 2", d: "Peruuta sinuun kohdistettu 2-tason sabotaasi automaattisesti.", mech: "cancel_major" },
    { n: "Täys Kumous 2", d: "Peruuta MIKÄ TAHANSA sinuun kohdistettu sabotaasi automaattisesti.", mech: "cancel_all" },
    { n: "Peilaus 2", d: "Käännä sinuun pelattu sabotaasi takaisin sen pelaajalle.", mech: "reflect" },
    { n: "Turvakilpi 2", d: "Suojaa sinut automaattisesti seuraavalta sabotaasilta.", mech: "shield" },
    { n: "Voittopotin tuplaus", d: "Jos voitat väylän, voittopisteet tuplataan automaattisesti.", mech: "double_win" },
    { n: "Tehtävän tuplaus", d: "Jos voitat väylätehtävän, palkkio tuplataan automaattisesti.", mech: "double_task" },
    { n: "Varaslähtö", d: "Saat heittää 2 avausheittoa tiiltä ja jatkaa niistä vapaasti paremmalla." },
    { n: "Mando-ohitus", d: "Jos väylällä on mando, saat jättää sen huomioimatta ilman rangaistusta." },
    { n: "Oksan poisto", d: "Saat jättää huomioimatta yhden edessä olevan oksan (siirrä kiekkoa sivuun)." },
    { n: "Tiipaikan vaihto", d: "Saat heittää avauksesi mistä tahansa kohtaa tiipadiltä tai sen sivusta (max 2m)." },
    { n: "Kiekon lainaus", d: "Voit ottaa yhden vastustajan kiekon omaan käyttöösi tälle väylälle." },
    { n: "Ketjuralli", d: "Jos putti osuu ketjuihin mutta sylkee ulos, se lasketaan sisään menneeksi." },
    { n: "Riskitön", d: "Jos heität vesiesteeseen tai pahasti puskaan, saat heittää sen rangaistuksetta uudelleen." },
    { n: "Ei sääntöjä", d: "Voit astua markkerin yli heti irrotuksen jälkeen, vaikka olisit C1 ringissä." },
    { n: "Suunta on oikea", d: "Jos heitto lähtee täysin väärään suuntaan (yli 45 astetta), saat uusia sen ilmaiseksi." },
    { n: "Ketjuklinikka", d: "Jos osut rautoihin (ala/ylä) mutta et ketjuihin, saat uusia putin." },
    { n: "Pieni Kumous 3", d: "Peruuta 1-tason sabotaasi automaattisesti.", mech: "cancel_minor" },
    { n: "Turvamies", d: "Blokkaa seuraava sabotaasi.", mech: "shield" },
    { n: "Lisävirta", d: "Voit heittää ylimääräisen lähestymisheiton ja jatkaa paremmasta." },
    { n: "Korkeus-Helpotus", d: "Saat siirtää kiekkosi vapaasti puusta maahan ilman rangaistusta." },
    { n: "Magneettikäsi", d: "Saat uusia yhden alle 5m putin." },
    { n: "Tuulenlukija", d: "Saat uusia minkä tahansa heiton, johon tuuli selvästi vaikutti negatiivisesti." },
    { n: "Askeleen etu", d: "Saat siirtää markkerin yhden pitkän askeleen verran sivulle esteestä." },
    { n: "Rollerivakuutus", d: "Jos yrittämäsi rolleri epäonnistuu täysin, saat uusia sen ilmaiseksi." },
    { n: "Avausvakuutus", d: "Jos avauksesi osuu ensimmäiseen puuhun, saat uusia sen heti rangaistuksetta." },
    { n: "Väylä haltuun", d: "Saat siirtää kiekkoa 3m lähemmäs väylän keskustaa." },
    { n: "Korttisade 2", d: "Nostat 2 uutta korttia automaattisesti väylän lopussa.", mech: "draw_2" },
    { n: "Lisänosto 2", d: "Nostat 1 uuden kortin automaattisesti väylän lopussa.", mech: "draw_1" },
    { n: "Peilaus 3", d: "Käännä sabotaasi takaisin sen lähettäjälle.", mech: "reflect" },
    { n: "Turvakilpi 3", d: "Suojaa sabotaasilta.", mech: "shield" },
    { n: "Vahva Kumous 3", d: "Peruuta Iso Sabotaasi automaattisesti.", mech: "cancel_major" }
];
// Täydennetään 70 asti variaatioilla
while(buffBases.length < 70) {
    buffBases.push({ n: `Pieni Kumous ${buffBases.length}`, d: "Peruuta 1-tason sabotaasi automaattisesti.", mech: "cancel_minor" });
    if(buffBases.length < 70) buffBases.push({ n: `Kilpi ${buffBases.length}`, d: "Suojaa seuraavalta sabotaasilta.", mech: "shield" });
}
buffBases.slice(0, 70).forEach((base, i) => window.allCards.push({ id: "buff_" + i, n: base.n, d: base.d, tier: "normal", type: "buff", mech: base.mech || null }));

// ==========================================
// TASO 3: PREMIUM KORTIT / KAUPPA (Tasan 30 kpl)
// Vain täällä voidaan suoraan vähentää tai lisätä heittoja.
// Hinnat on säädetty kalliimmiksi, koska TULOS on voittokriteeri!
// ==========================================
const monsterBases = [
    { n: "Tulos: -1 Heitto", d: "Vähennä automaattisesti 1 heitto väylätuloksestasi.", type: "buff", price: 15, mech: "score_-1" },
    { n: "Tulos: -2 Heittoa", d: "Vähennä automaattisesti 2 heittoa väylätuloksestasi.", type: "buff", price: 30, mech: "score_-2" },
    { n: "Sakkoryöppy (+1)", d: "Kohde saa automaattisesti +1 heittoa tulokseensa.", type: "major_sabotage", price: 15, mech: "score_+1" },
    { n: "Katastrofi (+2)", d: "Kohde saa automaattisesti +2 heittoa tulokseensa.", type: "major_sabotage", price: 30, mech: "score_+2" },
    { n: "Ukkosmyrsky (+1)", d: "KAIKKI vastustajat saavat automaattisesti +1 heittoa tulokseensa.", type: "major_sabotage", price: 40, aoe: true, mech: "score_+1" },
    { n: "Huippuvire (-1)", d: "Vähennä automaattisesti 1 heitto tuloksestasi.", type: "buff", price: 15, mech: "score_-1" },
    { n: "Epäonnen Kierre (+1)", d: "Kohde saa automaattisesti +1 heittoa tulokseensa.", type: "major_sabotage", price: 15, mech: "score_+1" },
    { n: "Hole-in-one Taika (-2)", d: "Vähennä automaattisesti 2 heittoa tuloksestasi.", type: "buff", price: 30, mech: "score_-2" },
    { n: "Veromätky", d: "KAIKKI vastustajat menettävät passiivisen tulonsa automaattisesti.", type: "major_sabotage", price: 15, aoe: true, mech: "deny_passive" },
    { n: "Köyhyyskirous", d: "Kohde ei saa ollenkaan passiivista tuloa tältä väylältä.", type: "major_sabotage", price: 8, mech: "deny_passive" },
    { n: "Palkkion eväys", d: "Kohde ei saa väylävoiton pisteitä automaattisesti, vaikka voittaisi.", type: "major_sabotage", price: 10, mech: "deny_win" },
    { n: "Korttikato", d: "Kohde ei saa nostaa uusia kortteja tämän väylän lopussa.", type: "major_sabotage", price: 12, mech: "deny_draw" },
    { n: "Voiton Tuplaus", d: "Saat väylävoiton pisteet x2 automaattisesti.", type: "buff", price: 10, mech: "double_win" },
    { n: "Jumal-Kumous", d: "Peruuta MIKÄ TAHANSA sabotaasi automaattisesti.", type: "buff", price: 15, mech: "cancel_all" },
    { n: "OB-Magneetti", d: "Jos kohde menee OB:lle, hän saa +2 rangaistusheittoa normaalin +1 sijaan.", type: "major_sabotage", price: 12 },
    { n: "Kiekkolukko", d: "Kiellä kohdetta käyttämästä hänen luottodraiveriaan.", type: "major_sabotage", price: 10 },
    { n: "Laser-Tähtäin", d: "Voit siirtää mitä tahansa alle 20m puttiasi 5 metriä lähemmäs koria.", type: "buff", price: 12 },
    { n: "Magneettikori", d: "Seuraava putti alle 15m lasketaan aina sisään menneeksi.", type: "buff", price: 15 },
    { n: "Bogey-Pakko", d: "Kohteen tulokseksi merkitään automaattisesti vähintään Bogey.", type: "major_sabotage", price: 20, mech: "force_bogey" },
    { n: "Par-Varmistus", d: "Tuloskorttiisi merkitään automaattisesti enintään PAR.", type: "buff", price: 20, mech: "force_par" },
    { n: "Tuulen tyven (-1)", d: "Vähennä automaattisesti 1 heitto tuloksestasi.", type: "buff", price: 15, mech: "score_-1" },
    { n: "Täystuho (+2)", d: "Kohde saa automaattisesti +2 heittoa tulokseensa.", type: "major_sabotage", price: 30, mech: "score_+2" },
    { n: "Myrskyn Silmä (+1)", d: "Kohde saa automaattisesti +1 heittoa tulokseensa.", type: "major_sabotage", price: 15, mech: "score_+1" },
    { n: "Varma Putti (-1)", d: "Vähennä automaattisesti 1 heitto tuloksestasi.", type: "buff", price: 15, mech: "score_-1" },
    { n: "Kaiken Kumoaja", d: "Peruuta MIKÄ TAHANSA sabotaasi automaattisesti.", type: "buff", price: 15, mech: "cancel_all" },
    { n: "Ryöstö", d: "KAIKKI vastustajat menettävät passiivisen tulonsa.", type: "major_sabotage", price: 15, aoe: true, mech: "deny_passive" },
    { n: "Kädenlämpöinen (+1)", d: "Kohde saa automaattisesti +1 heittoa tulokseensa.", type: "major_sabotage", price: 15, mech: "score_+1" },
    { n: "Ihme-Pelastus (-1)", d: "Vähennä automaattisesti 1 heitto tuloksestasi.", type: "buff", price: 15, mech: "score_-1" },
    { n: "Par-Takuu", d: "Tuloskorttiisi merkitään automaattisesti enintään PAR.", type: "buff", price: 20, mech: "force_par" },
    { n: "Mestariveto (-2)", d: "Vähennä automaattisesti 2 heittoa tuloksestasi.", type: "buff", price: 30, mech: "score_-2" }
];
monsterBases.forEach((base, i) => {
    let addSelatys = base.type === "major_sabotage" ? selatys : "";
    window.allCards.push({ id: "monster_" + i, n: base.n, d: base.d + addSelatys, tier: "premium", type: base.type, price: base.price, aoe: base.aoe || false, mech: base.mech || null });
});

// ==========================================
// VÄYLÄSÄÄNNÖT (150 Kpl - Uniikit Generoitu)
// ==========================================
const ruleContexts = [
    "Kaikki avaukset", "Kaikki lähestymiset", "Kaikki putit", "Koko väylä", "Kaikki heitot", 
    "Ensimmäiset 2 heittoa", "Jokainen rystyheitto", "Jokainen foreheitto", "Kaikki yli 10m heitot", 
    "Kaikki alle 20m heitot", "C2-alueen putit", "C1-alueen putit", "Vain tii-heitot", 
    "Vain metsäheitot", "Jokainen pariton heitto"
];

const ruleConstraints = [
    "on heitettävä täysin paikaltaan.", "on suoritettava putterilla.", "on suoritettava midarilla.", 
    "on pelattava alivakaimmalla kiekolla.", "on heitettävä kämmenellä (fore).", "on heitettävä rystyllä.", 
    "on heitettävä pystyheittona (upsi/tomahawk).", "on heitettävä staattisesta haaraseisonnasta.", 
    "on heitettävä vähintään toinen polvi maassa.", "on suoritettava maksimissaan 10 sekunnissa."
];

let ruleCounter = 1;
ruleContexts.forEach(context => {
    ruleConstraints.forEach(constraint => {
        window.holeRules.push({
            type: "rule",
            n: `Sääntö ${ruleCounter++}`,
            d: `${context} ${constraint}`
        });
    });
}); // Tasan 150 erilaista väyläsääntöä!
