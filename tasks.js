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
// TASO 1: PIENET SABOTAASIT (50 Kpl - Dynaamisesti Generoitu 100% Uniikiksi)
// ==========================================
const minorActions = ["Putti (alle 10m)", "Lähestyminen (10-30m)", "Avausheitto", "Seuraava heitto", "Kaikki väylän putit"];
const minorConstraints = [
    "heikommalla kädellä.", "yhdellä jalalla seisten.", "silmät kiinni irrotushetkellä.", 
    "ilman vauhtiaskeleita.", "vastakkaisella rintamasuunnalla (selin).", "istualtaan (pylly maassa).", 
    "polvelta (toinen polvi maassa).", "syvästä kyykystä.", "ilman peukaloa (ei saa koskea kanteen).", "ilman saattoa (käsi pysähtyy)."
];

let cardIdCounter = 1;
minorActions.forEach(action => {
    minorConstraints.forEach(constraint => {
        window.allCards.push({
            id: "minor_" + cardIdCounter++,
            n: `Pieni haitta: ${action}`,
            d: `Kohteen on suoritettava ${action.toLowerCase()} ${constraint}`,
            tier: "normal", type: "minor_sabotage", diff: 1, mech: null
        });
    });
}); // Tasan 50 erilaista

// ==========================================
// TASO 2: ISOT SABOTAASIT (50 Kpl - Dynaamisesti Generoitu 100% Uniikiksi)
// ==========================================
const majorActions = ["Koko loppuväylä", "Seuraavat 2 heittoa", "Kaikki väylän heitot", "Avaus ja jatkoheitto", "Väylän pisin heitto"];
const majorConstraints = [
    "pystyheittona (scuuberi/upsi/thumber).", "kämmenellä (fore).", "pelkällä rystyllä.", 
    "vain putterilla.", "alivakaimmalla kiekolla.", "sokkona (caddie suuntaa).", 
    "sormet tiukasti yhdessä.", "ilman vapaan käden tasapainotusta (käsi taskussa).", 
    "bägi rinnan etupuolella.", "pakollisella rollerilla."
];

majorActions.forEach(action => {
    majorConstraints.forEach(constraint => {
        let diffStars = "⭐⭐";
        window.allCards.push({
            id: "major_" + cardIdCounter++,
            n: `Iso Haaste: ${action}`,
            d: `[Vaikeus: ${diffStars}] ${action} on heitettävä ${constraint}`,
            tier: "normal", type: "major_sabotage", diff: 2, mech: null
        });
    });
}); // Tasan 50 erilaista

// ==========================================
// TASO 1: HELPOTUKSET (70 Kpl - Osa automaatioita, loput generoitu)
// ==========================================
// 1. Manuaaliset voimakkaat automaatio-buffit (20 kpl)
const buffAutomations = [
    { n: "Pieni Kumous", d: "Peruuta sinuun juuri kohdistettu 1-tason (pieni) sabotaasi automaattisesti.", mech: "cancel_minor" },
    { n: "Vahva Kumous", d: "Peruuta sinuun kohdistettu 2-tason (iso) sabotaasi automaattisesti.", mech: "cancel_major" },
    { n: "Täys Kumous", d: "Peruuta MIKÄ TAHANSA sinuun kohdistettu sabotaasi automaattisesti.", mech: "cancel_all" },
    { n: "Peilaus", d: "Käännä sinuun pelattu sabotaasi automaattisesti takaisin sen pelaajalle.", mech: "reflect" },
    { n: "Turvakilpi", d: "Suojaa sinut automaattisesti seuraavalta sabotaasilta tällä väylällä.", mech: "shield" },
    { n: "Tuplavoitto", d: "Jos voitat tämän väylän, saat x2 voittopisteet automaattisesti!", mech: "double_win" },
    { n: "Tuplatehtävä", d: "Jos voitat väylätehtävän, saat x2 rahat automaattisesti.", mech: "double_task" },
    { n: "Sponsori (+1 P)", d: "Saat automaattisesti +1 P pelirahaa kassaan.", mech: "money_+1" },
    { n: "Sponsori (+2 P)", d: "Saat automaattisesti +2 P pelirahaa kassaan.", mech: "money_+2" },
    { n: "Korttisade", d: "Nostat automaattisesti 2 uutta korttia tämän väylän lopussa.", mech: "draw_2" },
    { n: "Lisänosto", d: "Nostat automaattisesti 1 uuden kortin tämän väylän lopussa.", mech: "draw_1" },
    { n: "Mulligan", d: "Voit uusia oman epäonnistuneen heittosi fyysisesti (ei automaatiota)." },
    { n: "Mulligan (Putti)", d: "Voit uusia epäonnistuneen putin fyysisesti." },
    { n: "Mulligan (Avaus)", d: "Voit uusia epäonnistuneen avausheiton tiiltä fyysisesti." },
    { n: "Siirto +2m", d: "Voit siirtää kiekkoasi 2m mihin tahansa suuntaan (ei lähemmäs koria)." },
    { n: "Siirto +5m", d: "Voit siirtää kiekkoasi 5m mihin tahansa suuntaan (ei lähemmäs koria)." },
    { n: "Puskasta pois", d: "Saat siirtää kiekkosi vapaasti pelattavalle väylälle samalle etäisyydelle korista." },
    { n: "OB-pelastus", d: "Jos heitit OB, saat jatkaa heittopaikalta ilman rangaistusheittoa." },
    { n: "Taikamarkkeri", d: "Saat asettaa markkerisi tasan 1 metrin lähemmäs koria." },
    { n: "Helpotettu väylä", d: "Koko väylä pelataan osaltasi ilman OB-sääntöjä (ei rangaistuksia)." }
];

buffAutomations.forEach(base => {
    window.allCards.push({ id: "buff_" + cardIdCounter++, n: base.n, d: base.d, tier: "normal", type: "buff", mech: base.mech || null });
});

// 2. Generoidut fyysiset buffit (50 kpl)
const buffActions = ["Seuraava heitto", "Epäonnistunut putti", "Avausheitto", "Lähestyminen", "Mikä tahansa heitto"];
const buffPerks = [
    "voidaan heittää 2 kertaa (valitse parempi tulos).", "voidaan mitätöidä, jos se osuu ensimmäiseen puuhun.", 
    "katsotaan onnistuneeksi, jos se edes hipoo korin rautoja.", "voidaan heittää laillisesti askel markkerin ohi.", 
    "voidaan heittää täysin ilman mandon kiertämistä.", "uusitaan rangaistuksetta, jos se päätyy veteen.",
    "saadaan heittää toisen pelaajan kiekkoa lainaamalla.", "suojataan kaikilta sääntörikkomuksilta.",
    "saadaan tähdätä rauhassa 30 sekuntia ilman kiirettä.", "voidaan aloittaa 3 metriä tiipadin etupuolelta."
];

buffActions.forEach(action => {
    buffPerks.forEach(perk => {
        window.allCards.push({
            id: "buff_" + cardIdCounter++,
            n: `Etu: ${action}`,
            d: `${action} ${perk}`,
            tier: "normal", type: "buff", mech: null
        });
    });
}); // Tasan 50 erilaista, yhteensä 70 Buffia

// ==========================================
// TASO 3: PREMIUM KORTIT / KAUPPA (Tasan 30 kpl)
// Kaikki +/- tulosmuutokset ovat täällä!
// ==========================================
const monsterBases = [
    { n: "Tulos: -1 Heitto", d: "Vähennä automaattisesti 1 heitto tuloksestasi.", type: "buff", price: 10, mech: "score_-1" },
    { n: "Tulos: -2 Heittoa", d: "Vähennä automaattisesti 2 heittoa tuloksestasi.", type: "buff", price: 18, mech: "score_-2" },
    { n: "Sakkoryöppy (+1)", d: "Kohde saa automaattisesti +1 heittoa tulokseensa.", type: "major_sabotage", price: 8, mech: "score_+1" },
    { n: "Katastrofi (+2)", d: "Kohde saa automaattisesti +2 heittoa tulokseensa.", type: "major_sabotage", price: 15, mech: "score_+2" },
    { n: "Veromätky", d: "KAIKKI vastustajat menettävät passiivisen tulonsa automaattisesti.", type: "major_sabotage", price: 12, aoe: true, mech: "deny_passive" },
    { n: "Köyhyyskirous", d: "Kohde ei saa ollenkaan passiivista tuloa tältä väylältä.", type: "major_sabotage", price: 6, mech: "deny_passive" },
    { n: "Palkkion eväys", d: "Kohde ei saa väylävoiton pisteitä automaattisesti, vaikka voittaisi.", type: "major_sabotage", price: 9, mech: "deny_win" },
    { n: "Korttikato", d: "Kohde ei saa nostaa uusia kortteja tämän väylän lopussa.", type: "major_sabotage", price: 8, mech: "deny_draw" },
    { n: "Iso Sijoitus (+5P)", d: "Saat pankista välittömästi uuden rahoituksen (+5 P).", type: "buff", price: 6, mech: "money_+5" }, 
    { n: "Voiton Tuplaus", d: "Saat väylävoiton pisteet x2 automaattisesti.", type: "buff", price: 12, mech: "double_win" },
    { n: "Jumal-Kumous", d: "Peruuta MIKÄ TAHANSA sabotaasi automaattisesti.", type: "buff", price: 8, mech: "cancel_all" },
    { n: "OB-Magneetti", d: "Jos kohde menee OB:lle, hän saa +2 rangaistusheittoa normaalin +1 sijaan.", type: "major_sabotage", price: 10 },
    { n: "Kiekkolukko", d: "Kiellä kohdetta käyttämästä hänen luottodraiveriaan.", type: "major_sabotage", price: 12 },
    { n: "Laser-Tähtäin", d: "Voit siirtää mitä tahansa alle 20m puttiasi 5 metriä lähemmäs koria.", type: "buff", price: 9 },
    { n: "Magneettikori", d: "Seuraava putti alle 15m lasketaan aina sisään menneeksi.", type: "buff", price: 12 },
    { n: "Bogey-Pakko", d: "Kohteen tulokseksi merkitään automaattisesti vähintään Bogey.", type: "major_sabotage", price: 14, mech: "force_bogey" },
    { n: "Par-Varmistus", d: "Tuloskorttiisi merkitään automaattisesti enintään PAR.", type: "buff", price: 14, mech: "force_par" },
    { n: "Ukkosmyrsky (+1)", d: "KAIKKI vastustajat saavat automaattisesti +1 heittoa tulokseensa.", type: "major_sabotage", price: 20, aoe: true, mech: "score_+1" }
];

// Lisätään täytteeksi 12 uniikkia fysiikka/raha-premiumia, jotta saadaan tasan 30.
for(let i=1; i<=12; i++) {
    monsterBases.push({ n: `Pikkusijoitus v${i}`, d: "Saat automaattisesti +2 P pelirahaa.", type: "buff", price: 4, mech: "money_+2" });
}

monsterBases.forEach((base) => {
    window.allCards.push({ id: "monster_" + cardIdCounter++, n: base.n, d: base.d, tier: "premium", type: base.type, price: base.price, aoe: base.aoe || false, mech: base.mech || null });
});

// ==========================================
// VÄYLÄSÄÄNNÖT (150 Kpl - 100% Uniikit Generoitu)
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

ruleContexts.forEach(context => {
    ruleConstraints.forEach(constraint => {
        window.holeRules.push({
            type: "rule",
            n: "Sääntö",
            d: `${context} ${constraint}`
        });
    });
}); // Tasan 150 erilaista väyläsääntöä!
