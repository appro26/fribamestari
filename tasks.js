window.allCards = [];

// ==========================================
// TASO 1: PIENET SABOTAASIT (Halpoja pelata, pientä kiusaa)
// ==========================================
const minorBases = [
    { n: "Silmät kiinni", d: "Kohde joutuu laittamaan silmät kiinni juuri ennen heiton irrotusta." },
    { n: "Kurki-Asento", d: "Heiton aikana toinen jalka ei saa koskea maahan." },
    { n: "Sammakko", d: "Mene syvään kyykkyyn ja suorita heitto siitä asennosta." },
    { n: "Pyörähdys", d: "Pyörähdä 360 astetta vauhdissa ja heitä heti perään." },
    { n: "Vauhtijarru", d: "Pysähdy kokonaan 1 sekunniksi tukijalalle juuri ennen vetoa." },
    { n: "Häirintä", d: "Saat seisoa 2 metrin päässä kohteesta ja huutaa häirintää heiton aikana." },
    { n: "Paikaltaveto", d: "Seuraavassa heitössä et saa ottaa yhtään vauhtiaskelta." },
    { n: "Matala asento", d: "Heitä siten, että hartiasi ovat maksimissaan metrin korkeudella maasta." },
    { n: "Selin koriin", d: "Putti tai lähestyminen on heitettävä täysin selkä koria kohden." },
    { n: "Kävelyvauhti", d: "Vauhtia saa ottaa, mutta vain hitaasti kävellen (ei juoksua)." },
    { n: "Väärä käsi putti", d: "Jos kohde on alle 15m päässä, putti on heitettävä väärällä kädellä." },
    { n: "10 sekuntia", d: "Kohteella on tasan 10 sekuntia aikaa suorittaa heitto siitä kun saapuu kiekolle." },
    { n: "Laukku selässä", d: "Bägi on pidettävä selässä koko heittosuorituksen ajan." },
    { n: "Polviltaan", d: "Seuraava heitto on suoritettava vähintään toinen polvi maassa." },
    { n: "Erikoisgrippi", d: "Heitä seuraava heitto niin, että peukalosi on kiekon pohjapuolella." }
];

for(let i = 1; i <= 60; i++) {
    const base = minorBases[(i - 1) % minorBases.length];
    window.allCards.push({ id: "minor_" + i, n: base.n, d: base.d, tier: "minor_sabotage", type: "sabotage" });
}

// ==========================================
// TASO 2: ISOT SABOTAASIT (Kalliita pelata, muuttavat fysiikkaa. Antavat vastustajalle pisteitä jos hän onnistuu!)
// ==========================================
const majorBases = [
    { n: "Kämmenpakko", d: "Heitä seuraava heittosi tiiltä pakollisella kämmenellä (forehand)." },
    { n: "Rystypakko", d: "Heitä seuraava heittosi tiiltä pakollisella rystyllä (backhand)." },
    { n: "Pystyheitto", d: "Seuraava heitto on suoritettava pystyheitolla (Upsi/Tomahawk/Thumber)." },
    { n: "Rolleripakko", d: "Kiekon on osuttava maahan kovaa ja rullattava eteenpäin vähintään 10m." },
    { n: "Putteridraivi", d: "Avausheitto tiiltä on suoritettava putterilla." },
    { n: "Väärä käsi avaus", d: "Avausheitto on heitettävä täysin väärällä/heikommalla kädellä." },
    { n: "Kiekon Pakkovalinta", d: "Valitse kohteen bägistä 3 kiekkoa, joista hänen on pakko valita avauskiekko." },
    { n: "Lainakiekko", d: "Anna kohteelle oma kiekkosi. Hänen on pakko heittää avaus sillä." },
    { n: "Laser-linja", d: "Kiekon on pysyttävä koko lennon ajan alle 2 metrin korkeudella maasta." },
    { n: "Korkea Hysse", d: "Heitä seuraava heitto jyrkkänä ja korkeana hyzerinä." },
    { n: "Antsapoliisi", d: "Kiekon on lähdettävä kädestä selkeässä ja jyrkässä anhyzer-kulmassa." },
    { n: "Scooberi", d: "Suorita lähestymisheitto ylösalaisella scuuberi-tyylillä." },
    { n: "Turbo-Putt", d: "Seuraava putti on suoritettava sormilla kiekon alta työntäen (Turbo)." },
    { n: "Grenade", d: "Kiekko on pidettävä kädessä ylösalaisin peukalo urassa ja heitettävä rystyllä." },
    { n: "Vain yksi kiekko", d: "Pelaa tämä väylä alusta loppuun vain yhdellä kiekolla." }
];

for(let i = 1; i <= 60; i++) {
    const base = majorBases[(i - 1) % majorBases.length];
    window.allCards.push({ id: "major_" + i, n: base.n, d: base.d, tier: "major_sabotage", type: "sabotage" });
}

// ==========================================
// TASO 1: PERUS HELPOTUKSET (Buffit)
// ==========================================
const buffBases = [
    { n: "Mulligan", d: "Voit uusia oman epäonnistuneen heittosi." },
    { n: "Siirto +3m", d: "Voit siirtää kiekkoasi 3 metriä mihin tahansa suuntaan (ei lähemmäs koria)." },
    { n: "Kumous", d: "Peruuta sinuun juuri kohdistettu 1-tason (pieni) sabotaasi." },
    { n: "Puskasta pois", d: "Saat siirtää kiekkosi vapaasti pelattavalle väylälle samalle etäisyydelle korista." },
    { n: "Varaslähtö", d: "Saat heittää 2 avausheittoa tiiltä ja jatkaa niistä vapaasti paremmalla." },
    { n: "Mando-ohitus", d: "Jos väylällä on mando, saat jättää sen huomioimatta ilman rangaistusta." }
];

for(let i = 1; i <= 40; i++) {
    const base = buffBases[(i - 1) % buffBases.length];
    window.allCards.push({ id: "buff_" + i, n: base.n, d: base.d, tier: "buff", type: "buff" });
}

// ==========================================
// TASO 3: KAUPAN MONSTERIKORTIT (Maksaa paljon rahaa ostaa. Oston jälkeen peluu on ilmaista 0 P!)
// ==========================================
const monsterBases = [
    { n: "Varas", d: "Ryöstä 6 P (tai kaikki jos alle) haluamaltasi vastustajalta tilillesi.", type: "sabotage", price: 15 },
    { n: "Täystuho", d: "Määrää yksi 2-tason iso sabotaasi itse keksimilläsi säännöillä kohteelle.", type: "sabotage", price: 20 },
    { n: "OB-Magneetti", d: "Valitse kohde. Jos hän menee OB:lle, hän saa +2 rangaistusheittoa normaalin +1 sijaan.", type: "sabotage", price: 18 },
    { n: "Pisteiden Tuplaus", d: "Jos voitat tämän väylän yksin, saat tuplamäärän (x2) pelirahaa.", type: "buff", price: 12 },
    { n: "Kiekkolukko", d: "Kiellä kohdetta käyttämästä hänen luottodraiveriaan koko kierroksen loppuun asti.", type: "sabotage", price: 25 },
    { n: "Laser-Tähtäin", d: "Voit siirtää mitä tahansa alle 20m puttiasi 5 metriä lähemmäs koria.", type: "buff", price: 15 },
    { n: "Vaihtokauppa", d: "Vaihda huono avausheittosi paikkaa kohteen hyvän avauksen kanssa.", type: "sabotage", price: 25 },
    { n: "Jumal-Kumous", d: "Pelaa tämä peruuttaaksesi MIKÄ TAHANSA sabotaasi (myös monsteri).", type: "buff", price: 18 },
    { n: "Par-Varmistus", d: "Heitä normaalisti. Jos saat tulokseksi enemmän kuin PAR, tuloksesi korjataan tasan PAR:iksi.", type: "buff", price: 22 }
];

monsterBases.forEach((base, i) => {
    window.allCards.push({ id: "monster_" + i, n: `👹 ${base.n}`, d: base.d, tier: "monster", type: base.type, price: base.price }); 
});

// ==========================================
// VÄYLÄSÄÄNNÖT
// ==========================================
window.holeRules = [
    { type: "bounty", n: "CTP-Kisa", d: "Tiiltä lähimmäksi korijalkaa osunut avaus voittaa väylätehtävän." },
    { type: "bounty", n: "Pitkä Putti", d: "Väylän pisimmän onnistuneen putin tekijä voittaa väylätehtävän." },
    { type: "rule", n: "Putteri-Ruletti", d: "Koko väylä pelataan pelkillä puttereilla. Draiverit on täysin kielletty kaikilta." },
    { type: "bounty", n: "Pelastaja", d: "Ensimmäinen pelaaja, joka menee ryteikköön tai OB:lle, mutta pelastaa silti Par-tuloksen, voittaa tehtävän." },
    { type: "rule", n: "Seisova Avaus", d: "Kukaan ei saa ottaa yhtään vauhtiaskelta avausheitossaan tiiltä." },
    { type: "rule", n: "Kämmenväylä", d: "Kaikki yli 10 metrin lähestymiset ja avaukset on pakko heittää kämmeneltä (forehand)." }
];
