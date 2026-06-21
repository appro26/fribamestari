// Kaupan yhteinen korttivalikoima. Näistä arvotaan 3 satunnaista kauppaan joka väylällä.
const allCards = [
    // Helpotukset (Buff)
    { id: "c1", n: "Mulligan", d: "Uusi yksi epäonnistunut heitto ilmaiseksi.", type: "buff", price: 5 },
    { id: "c2", n: "Tähtäin", d: "Saat heittää putin yhden askeleen lähempää koria.", type: "buff", price: 4 },
    { id: "c3", n: "Haamu", d: "Voit poistaa yhden puuosuman/virheen tuloksestasi.", type: "buff", price: 6 },
    { id: "c4", n: "Kiekkopoika", d: "Kohde joutuu hakemaan kiekkosi korista puolestasi.", type: "buff", price: 3 },
    
    // Vaikeutukset (Sabotaasi)
    { id: "c5", n: "Puusilmä", d: "Kohde heittää seuraavan avauksensa silmät kiinni.", type: "sabotage", price: 6 },
    { id: "c6", n: "Väärä käsi", d: "Kohteen on heitettävä seuraava heitto heikommalla kädellä.", type: "sabotage", price: 5 },
    { id: "c7", n: "Kiekkosade", d: "Valitse yksi kiekko, jota kohde EI saa käyttää tällä väylällä.", type: "sabotage", price: 7 },
    { id: "c8", n: "Tuulimylly", d: "Kohteen on pyörähdettävä 3 kertaa ympäri juuri ennen puttaamista.", type: "sabotage", price: 4 }
];

// Väyläsäännöt (GM arpoo nämä tiillä)
const holeRules = [
    { type: "rule", n: "Hiljaisuus", d: "Väylän aikana ei saa puhua. Rikkomuksesta huikka." },
    { type: "rule", n: "Fore-kuningas", d: "Kaikki heitot (paitsi putit) on heitettävä kämmenellä." },
    { type: "bounty", n: "CTP (Closest to Pin)", d: "Avaus lähimmäksi koria palkitaan +3 pisteellä." },
    { type: "rule", n: "Pikajuoksu", d: "Heiton jälkeen omalle kiekolle on juostava. Hidas ottaa huikan." },
    { type: "bounty", n: "Pitkä Putti", d: "Pisimmän onnistuneen putin tekijä saa +4 pistettä." }
];
