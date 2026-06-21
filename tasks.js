const allCards = [];

// 1. NORMAALIT KORTIT (Pelaajille jaettavat, arki-sabotaasit ja haasteet, n. 120 kpl valikoima)
const normalBases = [
    { n: "Kämmenpakko", d: "Heitä seuraava heitto pakollisella kämmenellä (forehand)." },
    { n: "Rystypakko", d: "Heitä seuraava heitto pakollisella rystyllä (backhand)." },
    { n: "Upsipakko", d: "Seuraava heitto on suoritettava pystyheitolla (Upsi/Tomahawk)." },
    { n: "Rolleripakko", d: "Kiekon on kosketettava maata nopeasti ja rullattava." },
    { n: "Putteridraivi", d: "Seuraava avausheitto on suoritettava puhtaalla putterilla." },
    { n: "Midari-only", d: "Et saa käyttää tällä väylällä mitään nopeita draivereita." },
    { n: "Väärä käsi", d: "Heitä seuraava heitto väärällä/heikommalla kädelläsi." },
    { n: "Sokko-Heitto", d: "Sulje silmät juuri ennen vetoa ja heitä sokkona." },
    { n: "Kurki-Asento", d: "Tukijalka ei saa koskea maahan heittohetkellä (yhdellä jalalla)." },
    { n: "Polviltaan", d: "Seuraava heitto on suoritettava vähintään toinen polvi maassa." },
    { n: "Pyörähdys", d: "Pyörähdä 3 kertaa ympäri ja heitä heti perään ilman tähtäystä." },
    { n: "Sammakko", d: "Mene syvään kyykkyyn ja suorita heitto siitä asennosta." },
    { n: "Turbo-Putt", d: "Seuraava putti on suoritettava sormilla kiekon alta työntäen." },
    { n: "Scooberi", d: "Suorita lähestymisheitto ylösalaisella scuuberi-tyylillä." },
    { n: "Grenade", d: "Kiekko on pidettävä kädessä täysin ylösalaisin peukalo urassa." },
    { n: "Reppuselkä", d: "Heitä seuraava heitto bägi/reppu selässä (tai sylissä)." },
    { n: "Paikaltaan", d: "Heitä seuraava draivi täysin paikaltaan ilman vauhtiaskeleita." },
    { n: "Kiekon Pakkovalinta", d: "Valitse bägistäsi 3 kiekkoa, ja kohde joutuu heittämään yhdellä niistä." },
    { n: "Lainaväline", d: "Heitä seuraava heitto oikealla puolellasi olevan pelaajan kiekolla." },
    { n: "Kiekonvaihtokielto", d: "Joudut pelaamaan koko väylän alusta loppuun vain yhdellä ja samalla kiekolla." },
    { n: "Selkäkääntö", d: "Heitä putti selkä kohti koria yhdellä kädellä sokkona taaksepäin." },
    { n: "Puuhullu", d: "Jos osut puuhun tällä väylällä, ota heti rangaistushuikka." },
    { n: "Choke-Paine", d: "Koko ryhmä kerääntyy aivan viereen huutamaan vetohetkellä." },
    { n: "Hätäinen heitto", d: "Sinulla on tasan 5 sekuntia aikaa heittää kun astut kiekolle." },
    { n: "Jäätynyt ranne", d: "Älä käytä rannetta ollenkaan seuraavassa heitossa (pelkkä kyynärvarsi jäykkänä)." },
    { n: "Laser-linja", d: "Kiekon on pysyttävä alle 2 metrin korkeudella koko lennon ajan." },
    { n: "Korkea taivas", d: "Heitä seuraava heitto tarkoituksella liian korkeana hyssenä." },
    { n: "Anhyzer-pakko", d: "Kiekon on lähdettävä kädestä selkeässä antsakulmassa." },
    { n: "Vastatuuli-Simulaattori", d: "Kohde joutuu puhaltamaan/huutamaan täysiä heittäessään." },
    { n: "Kiekkopoika", d: "Hae kaikkien ryhmäläisten avaukset takaisin jos ne menevät metsään." }
];

// Luodaan normaaleja kortteja pakkaan
for(let i = 1; i <= 120; i++) {
    const base = normalBases[(i - 1) % normalBases.length];
    allCards.push({ id: "n_" + i, n: base.n, d: base.d, tier: "normal", type: "sabotage" });
}

// 2. PREMIUM-KORTIT (Kaupasta ostettavat, selvästi paremmat buffit, 45 kpl valikoima)
const premiumBases = [
    { n: "Kuningas Mulligan", d: "Voit uusia minkä tahansa epäonnistuneen heiton tällä väylällä ilmaiseksi." },
    { n: "Par-Varmistus", d: "Tuloksesi tältä väylältä ei voi millään olla huonompi kuin PAR." },
    { n: "Laser-Tähtäin", d: "Voit siirtää heittopaikkaasi 5 metriä suoraan lähemmäksi koria." },
    { n: "Mando-Ohitus", d: "Saat skipata radan virallisen mandon täysin ilman rangaistusheittoa." },
    { n: "OB-Armahdus", d: "Jos kiekkosi menee OB-alueelle, saat jatkaa siitä ilman lisälyöntejä." },
    { n: "Pistevaras", d: "Varasta valitsemaltasi vastustajalta tasan 5 resurssipistettä omaan pussiisi." },
    { n: "Tuplapotti", d: "Jos voitat tämän väylän tai suoritat tehtävän, saat tuplamäärän (+10) pisteitä." },
    { n: "Kiekkolukko", d: "Lukitse vastustajan paras draiveri. Hän ei saa koskea siihen tällä väylällä." },
    { n: "Ilmainen Droppi", d: "Saat siirtää kiekkosi pusikosta keskelle väylää ilman rangaistusta." },
    { n: "Keskirauta", d: "Jos osut tällä väylällä mihin tahansa korin metalliin, tuloksesi on Birdie (-1)." },
    { n: "Varaslähtö", d: "Saat heittää kaksi avausta tiiltä ja valita niistä vapaasti paremman." },
    { n: "Korttivaras", d: "Ryöstä satunnainen kortti valitsemasi vastustajan kädestä omaan käyttöösi." }
];

// Luodaan premium-kortteja pakkaan
for(let i = 1; i <= 45; i++) {
    const base = premiumBases[(i - 1) % premiumBases.length];
    allCards.push({ id: "p_" + i, n: `🔥 ${base.n}`, d: base.d, tier: "premium", type: "buff", price: Math.floor(Math.random() * 4) + 5 }); // Hinnat 5-8 P
}

// Väyläsäännöt / Tehtävät
const holeRules = [
    { type: "rule", n: "Hiljainen väylä", d: "Väylän aikana kukaan ei saa puhua tai kiroilla. Rikkomuksesta huikka." },
    { type: "bounty", n: "CTP-Kisa", d: "Tiiltä lähimmäksi korijalkaa osunut avaus voittaa väylätehtävän." },
    { type: "rule", n: "Pikaväylä", d: "Heiton jälkeen omalle kiekolle on juostava. Viimeinen ottaa huikan." },
    { type: "bounty", n: "Pitkä Putti", d: "Väylän pisimmän onnistuneen putin tekijä voittaa väylätehtävän." },
    { type: "rule", n: "Putteri-Ruletti", d: "Koko väylä pelataan pelkillä puttereilla. Draiverit on täysin kielletty." },
    { type: "bounty", n: "Puun Halaaja", d: "Ensimmäinen pelaaja, joka osuu puuhun, mutta pelastaa silti Par-tuloksen, voittaa tehtävän." }
];
