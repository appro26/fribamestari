// --- FRIBAMESTARI: TIETORAKENTEET ---

// 1. Sabotaasikortit (Kosto-kortit)
// Näitä arvotaan automaattisesti häviäjille / huonoimman tuloksen heittäjille.
const sabotageCards = [
    { id: "s1", n: "Väärä raaja", d: "Vastustajan on heitettävä seuraava avausheitto 'heikommalla' kädellään.", price: 0, k: 'sabotaasi' },
    { id: "s2", n: "Puusilmä", d: "Vastustaja joutuu puttaamaan silmät kiinni (max 5 metrin putti).", price: 0, k: 'sabotaasi' },
    { id: "s3", n: "Kallioinen kimpoilu", d: "Pakota vastustaja heittämään seuraava heitto fore-rollerina (kämmenrolleri). Meilahden kallioilla täyttä arpapeliä!", price: 0, k: 'sabotaasi' },
    { id: "s4", n: "Aikakone", d: "Käytä heti kun vastustaja on heittänyt. Hänen on peruttava heitto ja heitettävä täsmälleen samasta paikasta uudelleen.", price: 0, k: 'sabotaasi' },
    { id: "s5", n: "Jäähy", d: "Anna vastustajalle välitön jäähy. Hänen on otettava heti 3 huikkaa vapautuakseen takaisin peliin.", price: 0, k: 'sabotaasi' },
    { id: "s6", n: "Kiekkosika", d: "Saat valita omasta tai vastustajan bägistä, millä kiekolla hän joutuu heittämään seuraavan heittonsa.", price: 0, k: 'sabotaasi' },
    { id: "s7", n: "Puu-magneetti", d: "Jos vastustaja osuu tällä väylällä puuhun, hänen on otettava 2 ylimääräistä huikkaa rangaistuksena.", price: 0, k: 'sabotaasi' }
];

// 2. Resurssikauppa (Ostettavat edut)
// Pelaajat ostavat näitä voittamillaan resurssipisteillä.
const shopItems = [
    { id: "i1", n: "Mulligan", d: "Heitä uusi heitto ilman rangaistusta. Vanha heitto mitätöidään kokonaan.", price: 15, k: 'etu' },
    { id: "i2", n: "Mekaanikko", d: "Korjaa huono makuu. Saat siirtää kiekkoa kaksi metriä mihin tahansa suuntaan (mutta et lähemmäs koria).", price: 10, k: 'etu' },
    { id: "i3", n: "Panssarivaunu", d: "Täysi immuniteetti koko väylän ajaksi. Vastustajat eivät voi pelata sinuun sabotaasikortteja.", price: 20, k: 'etu' },
    { id: "i4", n: "Caddy", d: "Pakota hävinnyt vastustaja kantamaan bägiäsi / kiekkojasi koko seuraavan väylän ajan.", price: 5, k: 'etu' },
    { id: "i5", n: "Nesteytys", d: "Osta itsesi ulos yhdestä juomarangaistuksesta TAI jaa 3 huikkaa vapaavalintaiselle pelaajalle.", price: 8, k: 'etu' },
    { id: "i6", n: "Väyläsäännön Kumoaja", d: "Osta itsellesi vapautus Tii-paikan Väyläruletin asettamasta erikoissäännöstä (esim. putteripakosta).", price: 12, k: 'etu' }
];

// 3. Väyläruletti (Säännöt ja Bountyt)
// Arvotaan kaikille pelaajille aina uudella Tii-paikalla.
const holeRules = [
    { id: "r1", type: "rule", n: "Kapea ränni", d: "Kaikkien on heitettävä koko väylä pelkällä putterilla." },
    { id: "r2", type: "rule", n: "Fore-väylä", d: "Vain kämmenheitot (fore) on sallittu tällä väylällä." },
    { id: "r3", type: "rule", n: "Standstill", d: "Avausheitossa ei saa ottaa vauhtia. Heitto on tapahduttava tiukasti paikaltaan." },
    { id: "r4", type: "bounty", n: "Puunhalaaja", d: "BOUNTY: Se, joka osuu ensimmäisenä puuhun, ottaa 1 huikan, mutta tienaa heti 10 resurssipistettä." },
    { id: "r5", type: "bounty", n: "CTP (Closest to Pin)", d: "BOUNTY: Se, jonka avausheitto pysähtyy lähimpänä koria, saa ylimääräiset 5 resurssipistettä." },
    { id: "r6", type: "rule", n: "Johtajan taakka", d: "Kierroksen tämänhetkisen johtajan on heitettävä avausheitto vastakkaisella kädellä. (Jos tasapeli, koskee kaikkia johtajia)." },
    { id: "r7", type: "rule", n: "Hiljainen metsä", d: "Tällä väylällä ei saa puhua sanaakaan. Ensimmäinen puhuja saa välittömän rangaistuksen (2 huikkaa)." },
    { id: "r8", type: "bounty", n: "Birdie-jahti", d: "BOUNTY: Ensimmäinen, joka onnistuu heittämään birdien (1 alle par), saa ilmaisen Mulliganin käteensä." }
];
