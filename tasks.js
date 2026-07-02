window.allCards = [];
window.holeRules = [];

// ==========================================
// ELÄINTEN GRAFIIKAT JA SOLVAUKSET
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

let cId = 1; // Pidetään ID-laskuri sataprosenttisen täsmällisenä

// ==========================================
// TASO 1: PIENET SABOTAASIT (50 KPL - 100% UNIIKKEJA)
// ==========================================

// 25x Mekaaniset automaatiosakot (+1 tulokseen jne)
const minorMechs = [
    "Sakkorinki", "Kompastus", "Oksaosuma", "Tuulen viemää", "Varvaskipu", 
    "Lipsahdus", "Kiekkopesu", "Huono Tuuri", "Väärä Arvio", "Nyssykkä", 
    "Puunhalaaja", "Vesikammo", "Kivenkolo", "Tuulenvire", "Grippari", 
    "Aikavirhe", "Jalkavika", "Kämmi", "Huti", "Alarauta", 
    "Ylärauta", "Sylky", "Rollaway", "Skipin puute", "Liukastuminen"
];
minorMechs.forEach((name) => {
    window.allCards.push({ id: "minor_" + cId++, n: `Pikkusako: ${name}`, d: "Lisää automaattisesti +1 heitto kohteen väylätulokseen.", tier: "normal", type: "minor_sabotage", diff: 1, mech: "score_+1" });
});

// 25x Fyysiset pikkuhäiriöt (5 Tointa x 5 Rajoitetta = 25 uniikkia)
const minorActions = ["Seuraava heitto", "Seuraava putti", "Seuraava avausheitto", "Väylän seuraavat 2 heittoa", "Kaikki alle 10m putit"];
const minorConstraints = ["staattisesta haaraseisonnasta.", "yhdellä jalalla seisten.", "täysin paikaltaan ilman vauhtiaskeleita.", "vähintään toinen polvi maassa.", "ilman ristiaskelta (x-step)."];
minorActions.forEach(action => {
    minorConstraints.forEach(constraint => {
        window.allCards.push({ id: "minor_" + cId++, n: `Häiriö: ${action}`, d: `Kohteen on suoritettava ${action.toLowerCase()} ${constraint}`, tier: "normal", type: "minor_sabotage", diff: 1, mech: null });
    });
});

// ==========================================
// TASO 2: ISOT SABOTAASIT (50 KPL - 100% UNIIKKEJA)
// Täällä on VAIN fyysisiä haasteita, kaikki +2 sakot on siirretty Premium-kauppaan.
// ==========================================
const majorActions = ["Avausheitto tiiltä", "Kaikki väylän putit", "Seuraava lähestyminen", "Koko loppuväylä", "Kaksi ensimmäistä heittoa"];
const majorConstraints = [
    "heitettävä pystyheittona (upsi/thumber).", "suoritettava pelkällä kämmenellä (fore).", 
    "suoritettava pelkällä rystyllä.", "heitettävä silmät tiukasti kiinni.", 
    "heitettävä istualtaan maassa.", "heitettävä täysin heikommalla kädellä.", 
    "heitettävä vain putterilla.", "heitettävä bägisi nopeimmalla draiverilla.", 
    "heitettävä vastakierteellä (väärä pyörimissuunta).", "heitettävä siten, että peukalo ei koske kiekkoon."
];
let selatys = `<br><br><span style="color:#ef4444; font-weight:900; font-size:1.1em;">🔥 SELÄTYS:</span> Tee Par tai parempi!`;

majorActions.forEach(action => {
    majorConstraints.forEach(constraint => {
        window.allCards.push({ id: "major_" + cId++, n: `Iso Haaste: ${action}`, d: `[Vaikeus: ⭐⭐] ${action} on ${constraint}${selatys}`, tier: "normal", type: "major_sabotage", diff: 2, mech: null });
    });
});

// ==========================================
// TASO 1: HELPOTUKSET (70 KPL - 100% UNIIKKEJA)
// Huom! Ei lainkaan "ilmaista rahaa" tuovia kortteja. 
// ==========================================

// 60x Mekaaniset automaatio-buffit
for(let i=1; i<=15; i++) window.allCards.push({ id: "buff_" + cId++, n: `Pieni Kumous V${i}`, d: "Peruuta sinuun juuri kohdistettu 1-tason sabotaasi automaattisesti.", tier: "normal", type: "buff", mech: "cancel_minor" });
for(let i=1; i<=10; i++) window.allCards.push({ id: "buff_" + cId++, n: `Vahva Kumous V${i}`, d: "Peruuta sinuun kohdistettu 2-tason sabotaasi automaattisesti.", tier: "normal", type: "buff", mech: "cancel_major" });
for(let i=1; i<=5; i++) window.allCards.push({ id: "buff_" + cId++, n: `Täys Kumous V${i}`, d: "Peruuta MIKÄ TAHANSA sinuun kohdistettu sabotaasi automaattisesti.", tier: "normal", type: "buff", mech: "cancel_all" });
for(let i=1; i<=10; i++) window.allCards.push({ id: "buff_" + cId++, n: `Turvakilpi V${i}`, d: "Suojaa sinut automaattisesti seuraavalta sabotaasilta tällä väylällä.", tier: "normal", type: "buff", mech: "shield" });
for(let i=1; i<=5; i++) window.allCards.push({ id: "buff_" + cId++, n: `Peilaus V${i}`, d: "Käännä sinuun pelattu sabotaasi automaattisesti takaisin sen alkuperäiselle pelaajalle.", tier: "normal", type: "buff", mech: "reflect" });
for(let i=1; i<=5; i++) window.allCards.push({ id: "buff_" + cId++, n: `Tuplavoitto V${i}`, d: "Jos voitat tämän väylän, saat x2 voittopisteet automaattisesti!", tier: "normal", type: "buff", mech: "double_win" });
for(let i=1; i<=5; i++) window.allCards.push({ id: "buff_" + cId++, n: `Tuplatehtävä V${i}`, d: "Jos voitat väylätehtävän, saat x2 rahat automaattisesti.", tier: "normal", type: "buff", mech: "double_task" });
for(let i=1; i<=5; i++) window.allCards.push({ id: "buff_" + cId++, n: `Lisänosto V${i}`, d: "Nostat automaattisesti 1 uuden kortin tämän väylän lopussa.", tier: "normal", type: "buff", mech: "draw_1" });

// 10x Fyysiset helpotukset
const buffPhys = ["Mulligan", "Siirto +2m", "Puskasta pois", "OB-pelastus", "Taikamarkkeri", "Oksan poisto", "Tiipaikan vaihto", "Kiekon lainaus", "Ketjuralli", "Suunta on oikea"];
buffPhys.forEach((name) => {
    window.allCards.push({ id: "buff_" + cId++, n: `Erikoisetu: ${name}`, d: `Voit käyttää fyysisen edun: '${name}' rangaistuksetta tällä väylällä.`, tier: "normal", type: "buff", mech: null });
});

// ==========================================
// TASO 3: PREMIUM KORTIT / KAUPPA (30 KPL - UNIIKIT JA KALLIIT)
// Nämä vaikuttavat voimakkaasti itse tulokseen.
// ==========================================

// 10x Score -1
const premMinus1 = ["Huippuvire", "Varma Putti", "Ihme-Pelastus", "Tuulen tyven", "Mestariveto", "Täydellinen linja", "Keskittyminen", "Onnenkantamoinen", "Zone-tila", "Täydellinen irrotus"];
premMinus1.forEach(n => window.allCards.push({ id: "premium_" + cId++, n: `Premium: ${n} (-1)`, d: "Vähennä automaattisesti 1 heitto väylätuloksestasi.", tier: "premium", type: "buff", price: 15, mech: "score_-1" }));

// 5x Score -2 (Pelin kovimmat kortit!)
const premMinus2 = ["Hole-in-one Taika", "Kotka-lento", "Tupla-Mestari", "Jumal-Heitto", "Albatrossi"];
premMinus2.forEach(n => window.allCards.push({ id: "premium_" + cId++, n: `Premium: ${n} (-2)`, d: "Vähennä automaattisesti huimat 2 heittoa väylätuloksestasi.", tier: "premium", type: "buff", price: 30, mech: "score_-2" }));

// 5x Tulos +1 Vastustajalle
const premPlus1 = ["Sakkoryöppy", "Epäonnen Kierre", "Myrskyn Silmä", "Kädenlämpöinen", "Paineen alla"];
premPlus1.forEach(n => window.allCards.push({ id: "premium_" + cId++, n: `Premium: ${n} (+1)`, d: "Kohde saa automaattisesti +1 heittoa tulokseensa.", tier: "premium", type: "major_sabotage", price: 15, mech: "score_+1" }));

// 1x AOE +1 Score
window.allCards.push({ id: "premium_" + cId++, n: `Premium: Ukkosmyrsky (AOE +1)`, d: "KAIKKI vastustajat saavat automaattisesti +1 heittoa tulokseensa.", tier: "premium", type: "major_sabotage", aoe: true, price: 40, mech: "score_+1" });

// 2x Tulos +2 Vastustajalle
const premPlus2 = ["Katastrofi", "Täystuho"];
premPlus2.forEach(n => window.allCards.push({ id: "premium_" + cId++, n: `Premium: ${n} (+2)`, d: "Kohde saa automaattisesti +2 heittoa tulokseensa.", tier: "premium", type: "major_sabotage", price: 30, mech: "score_+2" }));

// 2x Passiivisen tulon eväys
const premDenyPass = ["Köyhyyskirous", "Ryöstö"];
premDenyPass.forEach(n => window.allCards.push({ id: "premium_" + cId++, n: `Premium: ${n}`, d: "Kohde ei saa ollenkaan passiivista tuloa tältä väylältä.", tier: "premium", type: "major_sabotage", price: 8, mech: "deny_passive" }));

// 1x AOE Passiivisen eväys
window.allCards.push({ id: "premium_" + cId++, n: `Premium: Veromätky (AOE)`, d: "KAIKKI vastustajat menettävät passiivisen tulonsa automaattisesti.", tier: "premium", type: "major_sabotage", aoe: true, price: 15, mech: "deny_passive" });

// 2x Voiton/Korttien eväys
window.allCards.push({ id: "premium_" + cId++, n: `Premium: Palkkion Eväys`, d: "Kohde ei saa väylävoiton pisteitä automaattisesti, vaikka voittaisi.", tier: "premium", type: "major_sabotage", price: 10, mech: "deny_win" });
window.allCards.push({ id: "premium_" + cId++, n: `Premium: Korttikato`, d: "Kohde ei saa nostaa uusia kortteja tämän väylän lopussa.", tier: "premium", type: "major_sabotage", price: 12, mech: "deny_draw" });

// 2x Pakotetut tulokset (Pelastus tai tuho)
window.allCards.push({ id: "premium_" + cId++, n: `Premium: Bogey-Pakko`, d: "Kohteen tulokseksi merkitään automaattisesti vähintään Bogey (+1).", tier: "premium", type: "major_sabotage", price: 25, mech: "force_bogey" });
window.allCards.push({ id: "premium_" + cId++, n: `Premium: Par-Varmistus`, d: "Omaan tuloskorttiisi merkitään automaattisesti enintään PAR.", tier: "premium", type: "buff", price: 20, mech: "force_par" });

// ==========================================
// VÄYLÄSÄÄNNÖT (150 Kpl - Uniikit matriisilla generoituna)
// ==========================================
let ruleCounter = 1;

// Säännöt (10 Kontekstia x 10 Rajoitetta = 100 Sääntöä)
const ruleContexts = ["Kaikki avaukset", "Kaikki lähestymiset", "Kaikki putit", "Koko väylä", "Ensimmäiset 2 heittoa", "Jokainen rystyheitto", "Jokainen foreheitto", "Kaikki yli 10m heitot", "Kaikki alle 20m heitot", "Vain tii-heitot"];
const ruleConstraints = ["on heitettävä paikaltaan ilman vauhtia.", "suoritetaan pakolla putterilla.", "suoritetaan midarilla.", "pelataan alivakaimmalla kiekolla.", "heitetään kämmenellä (fore).", "heitetään rystyllä.", "heitetään pystyheittona (upsi).", "heitetään staattisesta haaraseisonnasta.", "heitetään toinen polvi maassa.", "suoritetaan max 10 sekunnissa merkiltä."];

ruleContexts.forEach(ctx => {
    ruleConstraints.forEach(con => {
        window.holeRules.push({ type: "rule", n: `Väyläsääntö #${ruleCounter++}`, d: `${ctx} ${con}` });
    });
});

// Tehtävät / Bountyt (5 Tehtävää x 10 Ehtoa = 50 Tehtävää)
const bountyConds = ["Lähimmäksi koria osunut", "Pisimmälle heitetty", "Nopeiten suoritettu", "Ensimmäinen onnistunut", "Ainut täydellisesti suoritettu"];
const bountyActs = ["avausheitto voittaa.", "putti voittaa.", "puuosuma (rangaistuksetta) voittaa.", "OB-pelastus voittaa.", "midari-lähestyminen voittaa.", "Par-pelastus voittaa.", "Birdie-tulos voittaa.", "fore-heitto voittaa.", "rysty-heitto voittaa.", "rolleri voittaa."];

bountyConds.forEach(cond => {
    bountyActs.forEach(act => {
        window.holeRules.push({ type: "bounty", n: `Erikoistehtävä #${ruleCounter++}`, d: `${cond} ${act}` });
    });
});
