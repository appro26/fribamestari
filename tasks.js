// --- VALTAVA 150+ KORTIN FRISBEEGOLF-PAKKA ---
const allCards = [];

// 1. NORMAALIT KORTIT (Pelaajille arvottavat haasteet ja rangaistukset, 110 kpl)
const normalBases = [
    { n: "Kämmenpakko", d: "Heitä seuraava heitto pakollisella kämmenellä (forehand)." },
    { n: "Rystypakko", d: "Heitä seuraava heitto pakollisella rystyllä (backhand)." },
    { n: "Upsipakko", d: "Seuraava heitto on suoritettava pystyheitolla (Upsi/Tomahawk)." },
    { n: "Rolleripakko", d: "Kiekon on kosketettava maata 5 metrin sisällä ja rullattava." },
    { n: "Putteridraivi", d: "Seuraava avausheitto on suoritettava puhtaalla putterilla." },
    { n: "Midari-only", d: "Et saa käyttää tällä väylällä mitään draivereita." },
    { n: "Heikompi käsi", d: "Heitä seuraava heitto väärällä/heikommalla kädelläsi." },
    { n: "Silmät kiinni", d: "Sulje silmät juuri ennen vetoa ja heitä sokkona." },
    { n: "Yhdellä jalalla", d: "Tukijalka ei saa koskea maahan heittohetkellä (kurkiasento)." },
    { n: "Polviltaan", d: "Seuraava heitto on suoritettava vähintään toinen polvi maassa." },
    { n: "Pyörähdys", d: "Pyörähdä 3 kertaa ympäri ja heitä heti perään ilman tähtäystä." },
    { n: "Sammakko", d: "Mene kyykkyyn ja suorita heitto syvältä kyykkyasennosta." },
    { n: "Turbo-Putt", d: "Seuraava putti on suoritettava sormilla kiekon alta työntäen." },
    { n: "Scoober-lähestyminen", d: "Suorita lähestymisheitto ylösalaisella scuuberi-tyylillä." },
    { n: "Grenade-heitto", d: "Kiekko on pidettävä kädessä ylösalaisin peukalo urassa." },
    { n: "Reppuselkä", d: "Heitä seuraava heitto reppu selässä (tai jonkun muun reppu sylissä)." },
    { n: "Ei vauhtia", d: "Heitä seuraava heitto täysin paikaltaan ilman vauhtiaskeleita." },
    { n: "Väärä kiekko", d: "Ryhmä valitsee bägistäsi kiekon, jolla sinun on pakko heittää." },
    { n: "Lainaväline", d: "Heitä seuraava heitto oikealla puolellasi olevan pelaajan kiekolla." },
    { n: "Kiekonvaihto", d: "Joudut pelaamaan koko väylän alusta loppuun yhdellä ja samalla kiekolla." },
    { n: "Sokko-putti", d: "Heitä putti selkä kohti koria yhdellä kädellä taaksepäin." },
    { n: "Mando-peloite", d: "Kuvittele puu mandoksi. Jos osut siihen, +1 rangaistusheitto." },
    { n: "OB-vaara", d: "Jos seuraava heittosi osuu nurmikkoon/väylään, olet valemando-OB:lla." },
    { n: "Choke-paine", d: "Koko ryhmä kerääntyy 1 metrin päähän sinusta huutamaan vetohetkellä." },
    { n: "Hidas heitto", d: "Sinulla on tasan 5 sekuntia aikaa heittää kun astut kiekolle." },
    { n: "Jäätynyt ranne", d: "Älä käytä rannetta ollenkaan seuraavassa heitossa (pelkkä kyynärvarsi)." },
    { n: "Laser-linja", d: "Kiekon on pysyttävä alle 2 metrin korkeudella koko lennon ajan." },
    { n: "Korkea taivas", d: "Heitä seuraava heitto korkeana hyssenä puiden yli." },
    { n: "Anhyzer-pakko", d: "Kiekon on lähdettävä kädestä selkeässä antsakulmassa." },
    { n: "Hyzer-flippi", d: "Valitse alivakaa kiekko ja yritä kääntää se suoraksi." },
    { n: "Puu-magneetti", d: "Jos osut puuhun tällä väylällä, ota heti 1 huikka rangaistusta." },
    { n: "Kiekkopoika", d: "Hae kaikkien ryhmäläisten avaukset takaisin jos ne menevät metsään." },
    { n: "Caddie-palvelu", d: "Kanna valitsemasi vastustajan bägiä seuraavalle tiille saakka." },
    { n: "Keskittymishäiriö", d: "Laita puhelimestasi soimaan jokin biisi täysille heittosi ajaksi." },
    { n: "Rauhoittava huikka", d: "Ota kaksi isoa huikkaa juomaasi juuri ennen tiille astumista." }
];

// Luodaan automaattisesti 110 uniikkia korttia variaatioilla normaaliin pakkaan
for(let i = 1; i <= 110; i++) {
    const base = normalBases[(i - 1) % normalBases.length];
    allCards.push({
        id: "n_" + i,
        n: `${base.n} v.${Math.ceil(i/base.length)}`,
        d: base.d,
        tier: "normal",
        type: "sabotage"
    });
}

// 2. PREMIUM-KORTIT (Kaupan selvästi paremmat ja tehokkaammat edut, 45 kpl)
const premiumBases = [
    { n: "Kuningas Mulligan", d: "Voit uusia minkä tahansa heiton tällä väylällä ja valita paremman." },
    { n: "Par-Varmistus", d: "Tuloksesi tältä väylältä ei voi olla huonompi kuin PAR." },
    { n: "Laser-Tähtäin", d: "Voit siirtää heittopaikkaasi 5 metriä lähemmäksi koria ilman heittoa." },
    { n: "Mando-Ohitus", d: "Saat skipata radan virallisen mandon ilman rangaistusheittoa." },
    { n: "OB-Armahdus", d: "Jos kiekkosi menee OB-alueelle, saat jatkaa siitä ilman rangaistusta." },
    { n: "Tuloksensekoittaja", d: "Vaihda tällä väylällä tuloksesi parhaan pelaajan tuloksen kanssa." },
    { n: "Pistevaras", d: "Varasta valitsemaltasi vastustajalta 5 resurssipistettä omaan pussiisi." },
    { n: "Tuplapotti", d: "Jos voitat tämän väylän, saat tuplamäärän (+10) resurssipisteitä." },
    { n: "Kosto-Isku", d: "Anna valitsemallesi pelaajalle +2 tulokseen tältä väylältä." },
    { n: "Kiekkolukko", d: "Lukitse vastustajan paras draiveri. Hän ei saa koskea siihen tällä väylällä." },
    { n: "Ilmainen Droppi", d: "Saat siirtää kiekkosi pusikosta keskelle väylää ilman rangaistusta." },
    { n: "Keskirauta", d: "Jos osut tällä väylällä metalliin, tuloksesi merkataan automaattisesti -1 (Birdie)." },
    { n: "Häiriösalama", d: "Pakota vastustaja suorittamaan heittonsa selkä koria kohti." },
    { n: "Varaslähtö", d: "Saat heittää kaksi avausta tiiltä ja valita niistä paljon paremman." },
    { n: "Korttivaras", d: "Ryöstä satunnainen kortti valitsemasi vastustajan kädestä omaan käyttöösi." }
];

// Luodaan automaattisesti 45 tehokasta Premium-korttia kauppaan
for(let i = 1; i <= 45; i++) {
    const base = premiumBases[(i - 1) % premiumBases.length];
    allCards.push({
        id: "p_" + i,
        n: `🔥 ${base.n} (${Math.ceil(i/base.length)})`,
        d: base.d,
        tier: "premium",
        type: "buff",
        price: Math.floor(Math.random() * 4) + 4 // Hinta 4-7 pistettä
    });
}

// Väyläsäännöt (Tehtävät)
const holeRules = [
    { type: "rule", n: "Hiljainen väylä", d: "Väylän aikana kukaan ei saa puhua. Puhumisesta otetaan huikka." },
    { type: "rule", n: "Forehand-pakko", d: "Kaikki lähestymiset ja draivit on heitettävä kämmeneltä." },
    { type: "bounty", n: "CTP-Kisa", d: "Tiiltä lähimmäksi korijalkaa osunut avaus palkitaan +5 pisteellä." },
    { type: "rule", n: "Pikaväylä", d: "Heiton jälkeen omalle kiekolle on juostava. Viimeinen ottaa huikan." },
    { type: "bounty", n: "Pitkä Putti", d: "Väylän pisimmän onnistuneen putin tekijä kuittaa +5 pistettä." },
    { type: "rule", n: "Putteri-Ruletti", d: "Koko väylä pelataan pelkillä puttereilla. Draiverit on kielletty." }
];
