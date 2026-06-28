window.allCards = [];
window.holeRules = [];

// ==========================================
// ELÄINTEN GRAFIIKAT JA SOLVAUKSET (100% Uniikit)
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
// TASO 1: PIENET SABOTAASIT (100% Uniikit)
// ==========================================
const minorBases = [
    { n: "Heikompi käsi (Putti)", d: "Kohteen on suoritettava alle 10m putit heikommalla kädellään." },
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
    { n: "Sakkorinki (+1)", d: "Lisää automaattisesti +1 heitto kohteen väylätulokseen.", mech: "score_+1" },
    { n: "Pieni kompastus (+1)", d: "Lisää automaattisesti +1 heitto kohteen väylätulokseen.", mech: "score_+1" },
    { n: "Korttivarkaus", d: "Kohde ei saa nostaa uusia kortteja tämän väylän lopussa.", mech: "deny_draw" },
    { n: "Silmät kiinni irrotus", d: "Kohde joutuu sulkemaan silmänsä juuri ennen heiton irrotusta." },
    { n: "Korkea heitto", d: "Seuraavan heiton on käytävä vähintään 5 metrin korkeudessa." },
    { n: "Matala heitto", d: "Seuraavan heiton on pysyttävä alle 2 metrin korkeudessa." },
    { n: "Ei peukaloa", d: "Peukalo ei saa koskea kiekon kanteen heiton aikana." },
    { n: "Ei etusormea", d: "Etusormi ei saa koskea kiekon rimiin heiton aikana." },
    { n: "Istualtaan putti", d: "Kaikki alle 5m putit on suoritettava maassa istuen." },
    { n: "Vapaa käsi taskuun", d: "Vapaa käsi on pidettävä housuntaskussa koko heiton ajan." },
    { n: "Maksimiteho", d: "Seuraava lähestyminen on heitettävä 100% täysillä, vaikka kori olisi lähellä." }
];
minorBases.forEach((base, i) => window.allCards.push({ id: "minor_" + i, n: base.n, d: base.d, tier: "normal", type: "minor_sabotage", mech: base.mech || null }));

// ==========================================
// TASO 2: ISOT SABOTAASIT (100% Uniikit, Ei enää +2 heittoa täällä)
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
    { n: "Bogey-Pakko", d: "Kohteen tulokseksi merkitään automaattisesti Bogey (+1 yli Parin), ellei hän heitä vielä huonommin.", diff: 3, mech: "force_bogey" },
    { n: "Voiton Eväys", d: "Kohde ei saa väylävoiton pisteitä automaattisesti, vaikka hän voittaisi.", diff: 2, mech: "deny_win" },
    { n: "Tehtävän Eväys", d: "Kohde ei saa väylätehtävän pisteitä automaattisesti, vaikka suorittaisi sen.", diff: 2, mech: "deny_task" },
    { n: "Sokkoavaus", d: "Avausheitto tiiltä silmät kiinni. Turvamies ohjeistaa suunnan!", diff: 3 },
    { n: "Peilikuva", d: "Kohteen on matkittava edellisen pelaajan heittotyyliä (kämmen/rysty) tismalleen.", diff: 2 },
    { n: "Pizza-grippi", d: "Kiekosta pidetään molemmin käsin kiinni reunoista (kuin pitsalaatikosta) ja heitetään alakautta.", diff: 3 },
    { n: "Kämmenpakko koko väylä", d: "Kohde joutuu pelaamaan koko väylän pelkillä kämmenheitoilla.", diff: 3 },
    { n: "Rystypakko koko väylä", d: "Kohde joutuu pelaamaan koko väylän pelkillä rystyheitoilla.", diff: 3 },
    { n: "Midari-putti", d: "Kaikki putit tällä väylällä on pakko suorittaa midarilla.", diff: 1 }
];
majorBases.forEach((base, i) => {
    let diffStars = "⭐".repeat(base.diff);
    window.allCards.push({ id: "major_" + i, n: base.n, d: `[Vaikeus: ${diffStars}] ${base.d}`, tier: "normal", type: "major_sabotage", diff: base.diff, mech: base.mech || null });
});

// ==========================================
// TASO 1: PERUS HELPOTUKSET (100% Uniikit)
// ==========================================
const buffBases = [
    { n: "Mulligan", d: "Voit uusia oman epäonnistuneen heittosi fyysisesti." },
    { n: "Mulligan (Putti)", d: "Voit uusia epäonnistuneen putin fyysisesti." },
    { n: "Mulligan (Avaus)", d: "Voit uusia epäonnistuneen avausheiton tiiltä fyysisesti." },
    { n: "Siirto +2m", d: "Voit siirtää kiekkoasi 2 metriä mihin tahansa suuntaan (ei lähemmäs koria)." },
    { n: "Siirto +5m", d: "Voit siirtää kiekkoasi 5 metriä mihin tahansa suuntaan (ei lähemmäs koria)." },
    { n: "Kumous", d: "Peruuta sinuun juuri kohdistettu 1-tason (pieni) sabotaasi automaattisesti.", mech: "cancel_minor" },
    { n: "Vahva Kumous", d: "Peruuta sinuun kohdistettu 2-tason (iso) sabotaasi automaattisesti.", mech: "cancel_major" },
    { n: "Täys Kumous", d: "Peruuta MIKÄ TAHANSA sinuun kohdistettu sabotaasi automaattisesti.", mech: "cancel_all" },
    { n: "Peilaus", d: "Käännä sinuun pelattu sabotaasi automaattisesti takaisin sen pelaajalle.", mech: "reflect" },
    { n: "Turvamies", d: "Suojaa sinut automaattisesti seuraavalta sabotaasilta tällä väylällä.", mech: "shield" },
    { n: "Tuulen tyven (-1)", d: "Vähennä automaattisesti 1 heitto väylätuloksestasi.", mech: "score_-1" },
    { n: "Kiekkolöytö (-1)", d: "Vähennä automaattisesti 1 heitto väylätuloksestasi.", mech: "score_-1" },
    { n: "Tuplavoitto", d: "Jos voitat tämän väylän, saat x2 voittopisteet automaattisesti!", mech: "double_win" },
    { n: "Tuplatehtävä", d: "Jos voitat väylätehtävän, saat x2 rahat automaattisesti.", mech: "double_task" },
    { n: "Pankkiiri (+2P)", d: "Saat automaattisesti +2 P pelirahaa kassaan.", mech: "money_+2" },
    { n: "Korttisade", d: "Nostat automaattisesti 2 uutta korttia tämän väylän lopussa.", mech: "draw_2" },
    { n: "Lisänosto", d: "Nostat automaattisesti 1 uuden kortin tämän väylän lopussa.", mech: "draw_1" },
    { n: "Par-Varmistus", d: "Tuloskorttiisi merkitään automaattisesti enintään PAR (Vaikka heittäisit 10).", mech: "force_par" },
    { n: "Puskasta pois", d: "Saat siirtää kiekkosi vapaasti pelattavalle väylälle samalle etäisyydelle korista." },
    { n: "Varaslähtö", d: "Saat heittää 2 avausheittoa tiiltä ja jatkaa niistä vapaasti paremmalla." },
    { n: "Mando-ohitus", d: "Jos väylällä on mando, saat jättää sen huomioimatta ilman rangaistusta." },
    { n: "OB-pelastus", d: "Jos heitit OB, saat jatkaa heittopaikalta ilman rangaistusheittoa." },
    { n: "Oksan poisto", d: "Saat jättää huomioimatta yhden edessä olevan oksan (siirrä kiekkoa sivuun)." },
    { n: "Tiipaikan vaihto", d: "Saat heittää avauksesi mistä tahansa kohtaa tiipadiltä tai sen sivusta (max 2m)." },
    { n: "Taikamarkkeri", d: "Saat asettaa markkerisi ETEENPÄIN (tasan 1 metri lähemmäs koria)." },
    { n: "Kiekon lainaus", d: "Voit ottaa yhden vastustajan kiekon omaan käyttöösi tälle väylälle." },
    { n: "Ketjuralli", d: "Jos putti osuu ketjuihin mutta sylkee ulos, se lasketaan sisään menneeksi." },
    { n: "Riskitön", d: "Jos heität vesiesteeseen tai pahasti puskaan, saat heittää sen rangaistuksetta uudelleen." },
    { n: "Ei sääntöjä", d: "Voit astua markkerin yli heti irrotuksen jälkeen, vaikka olisit C1 ringissä." },
    { n: "Suunta on oikea", d: "Jos heitto lähtee täysin väärään suuntaan (yli 45 astetta), saat uusia sen ilmaiseksi." },
    { n: "Ketjuklinikka", d: "Jos osut rautoihin (ala/ylä) mutta et ketjuihin, saat uusia putin." },
    { n: "Helpotettu väylä", d: "Koko väylä pelataan ilman OB-sääntöjä (ei rangaistuksia)." }
];
buffBases.forEach((base, i) => window.allCards.push({ id: "buff_" + i, n: base.n, d: base.d, tier: "normal", type: "buff", mech: base.mech || null }));

// ==========================================
// TASO 3: KAUPAN MONSTERIKORTIT (Kaikki +2 rangaistukset siirretty tänne)
// ==========================================
const monsterBases = [
    { n: "Sakkoryöppy (+2)", d: "Kohde saa automaattisesti +2 heittoa tulokseensa.", type: "major_sabotage", price: 25, mech: "score_+2" },
    { n: "Katastrofi (+2)", d: "Kohde saa automaattisesti +2 heittoa tulokseensa.", type: "major_sabotage", price: 25, mech: "score_+2" },
    { n: "Veromätky", d: "KAIKKI vastustajat menettävät passiivisen tulonsa tältä väylältä automaattisesti.", type: "major_sabotage", price: 20, aoe: true, mech: "deny_passive" },
    { n: "Ukkosmyrsky (+1)", d: "KAIKKI vastustajat saavat automaattisesti +1 heittoa tulokseensa.", type: "major_sabotage", price: 30, aoe: true, mech: "score_+1" },
    { n: "Köyhyyskirous", d: "Kohde ei saa ollenkaan passiivista tuloa tältä väylältä automaattisesti.", type: "major_sabotage", price: 12, mech: "deny_passive" },
    { n: "Palkkion eväys", d: "Kohde ei saa väylävoiton pisteitä automaattisesti, vaikka voittaisi.", type: "major_sabotage", price: 15, mech: "deny_win" },
    { n: "Korttikato", d: "Kohde ei saa nostaa uusia kortteja tämän väylän lopussa automaattisesti.", type: "major_sabotage", price: 18, mech: "deny_draw" },
    { n: "Iso Sijoitus (+5P)", d: "Saat pankista välittömästi uuden rahoituksen (+5 P automaattisesti).", type: "buff", price: 12, mech: "money_+5" }, 
    { n: "Hole-in-one Taika (-2)", d: "Vähennä automaattisesti 2 heittoa tuloksestasi.", type: "buff", price: 35, mech: "score_-2" },
    { n: "Voiton Tuplaus", d: "Saat väylävoiton pisteet x2 automaattisesti.", type: "buff", price: 20, mech: "double_win" },
    { n: "Jumal-Kumous", d: "Peruuta MIKÄ TAHANSA sabotaasi automaattisesti.", type: "buff", price: 18, mech: "cancel_all" },
    { n: "OB-Magneetti", d: "Jos kohde menee OB:lle, hän saa +2 rangaistusheittoa normaalin +1 sijaan.", type: "major_sabotage", price: 18 },
    { n: "Kiekkolukko", d: "Kiellä kohdetta käyttämästä hänen luottodraiveriaan koko loppukierroksen ajan.", type: "major_sabotage", price: 25 },
    { n: "Laser-Tähtäin", d: "Voit siirtää mitä tahansa alle 20m puttiasi 5 metriä lähemmäs koria.", type: "buff", price: 15 },
    { n: "Magneettikori", d: "Seuraava putti alle 15m lasketaan aina sisään menneeksi, osuipahan se tai ei.", type: "buff", price: 20 }
];
monsterBases.forEach((base, i) => window.allCards.push({ id: "monster_" + i, n: `${base.n}`, d: base.d, tier: "premium", type: base.type, price: base.price, aoe: base.aoe || false, mech: base.mech || null }));

// ==========================================
// VÄYLÄSÄÄNNÖT (100% Uniikit)
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
    { type: "rule", n: "Kääntöjärjestys", d: "Heittojärjestys on täysin päinvastainen. Huonoiten edellisellä väylällä pelannut avaa ensin." },
    { type: "rule", n: "Bägi selässä", d: "Kaikki pelaavat koko väylän bägi tai reppu tiukasti selässä." },
    { type: "rule", n: "Vasen laita", d: "Kaikki avaukset on pyrittävä heittämään väylän vasenta laitaa pitkin (hyzer-reitti)." },
    { type: "rule", n: "Kiekkoswap", d: "Jokainen ojentaa koko bäginsä seuraavalle pelaajalle oikealle tällä väylällä." },
    { type: "rule", n: "Aina markkeri", d: "Joka ikinen heitto (myös tap-in) on merkattava markkerilla ennen heittoa." },
    { type: "rule", n: "Silmät kiinni putti", d: "Kaikki alle 5 metrin putit on vedettävä silmät visusti kiinni." },
    { type: "rule", n: "Pakkohysse", d: "Jokaisen heiton on pakko kaartaa alkuperäiseen kaarresuuntaansa." },
    { type: "rule", n: "Vain sivuittain", d: "Vauhtiaskeleet saa ottaa vain suoraan sivuttain (ristiaskel ilman eteenpäinmenoa)." },
    { type: "rule", n: "Tekniikkahaaste", d: "Kaikkien on heitettävä avaus paikaltaan ilman vauhtia." },
    { type: "rule", n: "Vain alivakaat", d: "Väylällä saa heittää vain alivakailla kiekoilla." },
    
    // Bountyt
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
    { type: "bounty", n: "Nopein heittäjä", d: "Se pelaaja, joka pelaa oman vuoronsa poikkeuksetta nopeimmin, voittaa tehtävän." },
    { type: "bounty", n: "Sweet Spot", d: "Kuka pääsee avauksella parhaaseen pelattavaan paikkaan, voittaa tehtävän." },
    { type: "bounty", n: "Riskinottaja", d: "Se, joka yrittää rohkeinta ja vaikeinta linjaa (onnistui tai ei), voittaa tehtävän (ryhmä äänestää)." },
    { type: "bounty", n: "Midarikuningas", d: "Pelaaja, joka pääsee Mid-range -kiekolla lähimmäksi koria avauksellaan, voittaa tehtävän." },
    { type: "bounty", n: "Kiekon etsijä", d: "Se, joka ensimmäisenä löytää toisen pelaajan kadonneen kiekon, voittaa tehtävän." },
    { type: "bounty", n: "Kierrekone", d: "Kenellä kiekko skippaa/pomppaa pisimmälle maahanosumisen jälkeen, voittaa tehtävän." },
    { type: "bounty", n: "Korijalan halaaja", d: "Kenen kiekko nojaa lähimpänä tolppaan, voittaa tehtävän." },
    { type: "bounty", n: "Tarkkuus", d: "Lähimmäksi koria avauksella (CTP) voittaa tehtävän." },
    { type: "bounty", n: "Pisin draivi", d: "Pisimmälle avannut pelaaja (pelattavalla alueella) voittaa tehtävän." }
];
