const allCards = [];

// 1. NORMAALIT KORTIT (Vain fribaan liittyvät, ei NaN-virheitä)
const normalBases = [
    { n: "Kämmenpakko", d: "Heitä seuraava heittosi pakollisella kämmenellä (forehand)." },
    { n: "Rystypakko", d: "Heitä seuraava heittosi pakollisella rystyllä (backhand)." },
    { n: "Pystyheitto", d: "Seuraava heitto on suoritettava pystyheitolla (Upsi/Tomahawk)." },
    { n: "Rolleripakko", d: "Kiekon on osuttava maahan kovaa ja rullattava eteenpäin." },
    { n: "Putteridraivi", d: "Seuraava avausheitto tiiltä on suoritettava putterilla." },
    { n: "Midari-only", d: "Et saa käyttää tällä väylällä ollenkaan nopeita draivereita." },
    { n: "Väärä käsi", d: "Heitä seuraava heitto väärällä/heikommalla kädelläsi." },
    { n: "Sokkoheitto", d: "Sulje silmät juuri ennen vetoa ja heitä avaus täysin sokkona." },
    { n: "Kurki-Asento", d: "Heiton aikana toinen jalka ei saa koskea maahan." },
    { n: "Polviltaan", d: "Seuraava heitto on suoritettava vähintään toinen polvi maassa." },
    { n: "Pyörähdys", d: "Pyörähdä 360 astetta vauhdissa ja heitä heti perään." },
    { n: "Sammakko", d: "Mene syvään kyykkyyn ja suorita heitto siitä asennosta." },
    { n: "Turbo-Putt", d: "Seuraava putti on suoritettava sormilla kiekon alta työntäen (Turbo)." },
    { n: "Scooberi", d: "Suorita lähestymisheitto ylösalaisella scuuberi-tyylillä." },
    { n: "Grenade", d: "Kiekko on pidettävä kädessä ylösalaisin peukalo urassa." },
    { n: "Paikaltaveto", d: "Seuraavassa heitossa et saa ottaa yhtään vauhtiaskelta." },
    { n: "Kiekon Pakkovalinta", d: "Valitse bägistäsi 3 kiekkoa, ja kohde joutuu heittämään yhdellä niistä." },
    { n: "Lainakiekko", d: "Heitä seuraava heitto vastustajan satunnaisesti valitsemalla kiekolla." },
    { n: "Kiekonvaihtokielto", d: "Pelaa koko väylä alusta loppuun vain yhdellä ja samalla kiekolla." },
    { n: "Selkäheitto", d: "Heitä putti selkä koria kohti yhdellä kädellä taaksepäin." },
    { n: "Jäätynyt ranne", d: "Rannetta ei saa kääntää lainkaan seuraavassa heitossa (jäykkä käsi)." },
    { n: "Laser-linja", d: "Kiekon on pysyttävä koko lennon ajan alle 2 metrin korkeudella." },
    { n: "Korkea hysse", d: "Heitä seuraava heitto tarkoituksella liian korkeana hyssenä." },
    { n: "Anhyzer-pakko", d: "Kiekon on lähdettävä kädestä selkeässä ja jyrkässä antsakulmassa." },
    { n: "Hyzer-flippi", d: "Valitse alivakaa kiekko ja yritä kääntää se väkisin suoraksi." },
    { n: "Kävelyvauhti", d: "Vauhtia saa ottaa, mutta vain hitaasti kävellen (ei juoksua)." },
    { n: "Vauhtijarru", d: "Pysähdy kokonaan 1 sekunniksi tukijalalle juuri ennen vetoa." },
    { n: "Matala asento", d: "Heitä siten, että hartiasi ovat maksimissaan metrin korkeudella maasta." },
    { n: "Kiekkopoika", d: "Kohde joutuu hakemaan kaikkien muiden avaamat kiekot takaisin väylälle." },
    { n: "Erikoisgrippi", d: "Heitä seuraava heitto niin, että peukalosi on kiekon pohjapuolella." }
];

// Luodaan 120 kpl normaalipakkaa (4 versiota jokaisesta peruskortista)
for(let i = 1; i <= 120; i++) {
    const base = normalBases[(i - 1) % normalBases.length];
    // Puhdas nimeäminen, jotta ei tule NaN-virheitä
    allCards.push({ id: "n_" + i, n: base.n, d: base.d, tier: "normal", type: "sabotage" });
}

// 2. PREMIUM-KORTIT (30 kpl, Hinnat 7-12 P)
const premiumBases = [
    { n: "Kuningas Mulligan", d: "Voit uusia minkä tahansa epäonnistuneen heiton tällä väylällä." },
    { n: "Par-Varmistus", d: "Tuloksesi tältä väylältä kirjataan suoraan maksimissaan PAR-tulokseksi." },
    { n: "Laser-Tähtäin", d: "Voit siirtää kiekkosi paikkaa 5 metriä suoraan lähemmäksi koria." },
    { n: "Mando-Ohitus", d: "Saat skipata radan virallisen mandon täysin ilman rangaistusheittoa." },
    { n: "OB-Armahdus", d: "Jos kiekkosi menee OB-alueelle, saat jatkaa pelistä ilman lisälyöntejä." },
    { n: "Pistevaras", d: "Varasta valitsemaltasi vastustajalta tasan 5 resurssipistettä." },
    { n: "Tuplapotti", d: "Jos voitat tämän väylän tai suoritat tehtävän, saat tuplamäärän (+10) pisteitä." },
    { n: "Kiekkolukko", d: "Kiellä yhtä vastustajaa käyttämästä hänen luottodraiveriaan tällä väylällä." },
    { n: "Ilmainen Droppi", d: "Saat siirtää kiekkosi pahasta puskasta keskelle väylää ilman rangaistusta." },
    { n: "Keskirauta", d: "Jos osut tällä väylällä mihin tahansa korin metalliin, tuloksesi on Birdie (-1)." },
    { n: "Varaslähtö", d: "Saat heittää kaksi avausheittoa tiiltä ja jatkaa niistä vapaasti paremmalla." },
    { n: "Korttivaras", d: "Ryöstä satunnainen kortti valitsemasi vastustajan kädestä omaan käyttöösi." },
    { n: "Puttiapu", d: "Voit siirtää mitä tahansa alle 15m puttiasi 3 metriä lähemmäs koria." },
    { n: "Kumous", d: "Pelaa tämä peruuttaaksesi mihin tahansa pelaajaan juuri kohdistetun sabotaasin." },
    { n: "Vaihtokauppa", d: "Vaihda huono avausheittosi paikkaa vastustajan hyvän avauksen kanssa." }
];

// Luodaan 30 kpl preemiopakkaa (2 versiota jokaisesta)
for(let i = 1; i <= 30; i++) {
    const base = premiumBases[(i - 1) % premiumBases.length];
    allCards.push({ id: "p_" + i, n: `🔥 ${base.n}`, d: base.d, tier: "premium", type: "buff", price: Math.floor(Math.random() * 6) + 7 }); 
}

// 3. VÄYLÄSÄÄNNÖT (Ei NaN, bounty-merkintä)
const holeRules = [
    { type: "bounty", n: "CTP-Kisa", d: "Tiiltä lähimmäksi korijalkaa osunut avaus voittaa väylätehtävän." },
    { type: "bounty", n: "Pitkä Putti", d: "Väylän pisimmän onnistuneen putin tekijä voittaa väylätehtävän." },
    { type: "rule", n: "Putteri-Ruletti", d: "Koko väylä pelataan pelkillä puttereilla. Draiverit on täysin kielletty kaikilta." },
    { type: "bounty", n: "Pelastaja", d: "Ensimmäinen pelaaja, joka osuu puuhun tai menee OB:lle, mutta pelastaa silti Par-tuloksen, voittaa tehtävän." },
    { type: "rule", n: "Seisova Avaus", d: "Kukaan ei saa ottaa yhtään vauhtiaskelta avausheitossaan tiiltä." },
    { type: "rule", n: "Kämmenväylä", d: "Kaikki yli 10 metrin lähestymiset ja avaukset on pakko heittää kämmeneltä (forehand)." }
];
