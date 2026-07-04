window.allCards = [];
window.holeRules = [];

// ==========================================
// ELÄINTEN GRAFIIKAT JA SOLVAUKSET (80 kpl)
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
    "Ootko sä [Pelaaja] sokea vai muuten vaan sysip*ska?",
    "Toi sun putti [Pelaaja] on löysempi ku keitetty makaroni.",
    "Mitä v*ttua [Pelaaja]? Näyttää ku yrittäisit tappaa jonku oravan tolla kiekolla.",
    "Pelaatko sä [Pelaaja] golfia vai ootko vaan raivaamassa metsää?",
    "S**tana [Pelaaja], mun sokea tätikin heittää suorempaan.",
    "V*tun nyssykkä [Pelaaja], ota se hame pois päältä ja heitä!",
    "Onko sulla [Pelaaja] nakit silmillä vai miks et osu tohon katiskaan?",
    "Miten voi ihminen olla noin p*ska [Pelaaja]? Kysyn vaan.",
    "Heitä p*rkele kovempaa [Pelaaja], toi ei menis ees märkään paperiin läpi.",
    "Hieno heitto [Pelaaja]... jos oisit yrittäny osua tohon p*rkeleen kiveen.",
    "V*ttu sä oot [Pelaaja] hidas, heitä jo ennen ku me kaikki kuollaan vanhuuteen.",
    "Sä [Pelaaja] heität ku pikkutyttö, jolta on viety tikkari.",
    "Lopeta se itkeminen [Pelaaja] ja heitä se v*tun kiekko pönttöön.",
    "P*rkele [Pelaaja], sä et osuis edes ladon seinään sisäpuolelta.",
    "Säikähditkö sä [Pelaaja] omaa varjoos vai miks toi heitto lähti tohon suuntaan?",
    "Toi sun [Pelaaja] draivi on vitsi, ja vielä ihan v*tun huono sellainen.",
    "Mee [Pelaaja] kotiin kasvaan, toi sun tekniikka on sieltä syvimmältä ja poikittain.",
    "V*ttu mikä antsa [Pelaaja]! Pelaatko sä bumerangilla vai friballa?",
    "Onneks olkoon [Pelaaja], löysit taas väylän ainoan p*rkeleen puun.",
    "Sä [Pelaaja] puttaat ku sulla ois molemmat kädet poikki.",
    "Hienosti rullas [Pelaaja]... suoraan v*tun puskaan.",
    "Sä oot [Pelaaja] elävä todiste siitä, että friba ei sovi kaikille.",
    "Anna se kiekko mulle [Pelaaja], sä vaan häpäiset lajin.",
    "V*ttu sun heitot on yhtä sekaisin ku sun elämäs [Pelaaja].",
    "P*rkele [Pelaaja], mäkin heitän vasurilla paremmin ku sä sun vahvimmalla.",
    "Oot sä [Pelaaja] ihan v*tun varma että laitoit silmälasit päähän aamulla?",
    "Toi oli [Pelaaja] ehkä v*ttumaisin heitto mitä oon ikinä nähny.",
    "Sun [Pelaaja] rystyheitto on ku hidastettu junaonnettomuus.",
    "V*ttu herää [Pelaaja], sä oot radalla etkä missään p*rkeleen piknikillä.",
    "Miten helvetissä sä [Pelaaja] pystyt heittämään joka v*tun kerta outtiin?",
    "Ei saatana [Pelaaja], jopa mun koira hakis ton kiekon nopeemmin.",
    "Sä [Pelaaja] oot yhtä hyödyllinen radalla ku v*tun jarrupalat kottikärryissä.",
    "Heitä [Pelaaja] se kiekko äläkä vaan silittele sitä v*tun muovia.",
    "Toi [Pelaaja] oli niin p*ska heitto että mun sieluun sattuu.",
    "S**tanan alokas [Pelaaja], eikö äiti opettanu miten sitä kiekkoa pidetään?",
    "V*tun surkeeta [Pelaaja]. Ei mulla muuta.",
    "Sä [Pelaaja] heität ku oisit just vetäny litran viinaa.",
    "P*rkele [Pelaaja], sä et osuis koriin vaikka se ois kymmenen metriä leveä.",
    "Mitä sä [Pelaaja] mietit? Toi veto oli ihan v*tun älyvapaa.",
    "Sun [Pelaaja] draivi muistuttaa mua mun exästä: lähtee kovaa mut menee ihan väärään suuntaan.",
    "Ootsä [Pelaaja] v*ttu tosissas? Toi ei kantanu ees kymmentä metriä.",
    "Kuka s**tana sulle antoi luvan tulla radalle [Pelaaja]?",
    "P*skaa. Ihan puhdasta p*skaa [Pelaaja].",
    "Sä [Pelaaja] oot kyllä radan heikoin v*tun lenkki.",
    "Mee [Pelaaja] kotiin itkemään, sun peli on ohi.",
    "V*tun hyrrä [Pelaaja], heitä suoraan äläkä pyöri siinä.",
    "S**tana [Pelaaja] lopeta se puiden halaaminen ja pysy väylällä.",
    "Toi sun [Pelaaja] putti on huonompi vitsi ku mun palkkanauha.",
    "Sä [Pelaaja] oot yhtä tarkka ku v*tun haulikko pimeässä.",
    "Mee roskiin [Pelaaja], toi sun heitto kuuluu sinne.",
    "V*tun hieno ob-heitto [Pelaaja], sä oot luonnonystävä.",
    "P*rkele [Pelaaja], jopa tuuli nauraa tolle sun kiekon lennolle.",
    "Sun [Pelaaja] pelikirja on varmaan kirjotettu v*tun vessapaperille.",
    "Ei s**tana [Pelaaja], ota bägistä toinen kiekko, toi eka on selvästi rikki.",
    "V*ttu sä [Pelaaja] et osuis ees maapalloon jos hyppäisit lentokoneesta.",
    "Sä [Pelaaja] heität pahemmin outtiin ku mun elämänvalinnat.",
    "P*rkele [Pelaaja], sä oot pelkkä hidaste tällä radalla.",
    "Miten vitussa sä [Pelaaja] sait tosta asennosta noin pask*n heiton aikaseks?",
    "Sun [Pelaaja] grip-lockit on legendaarisia, s**tana.",
    "Ootsä [Pelaaja] varma ettet haluu vaihtaa lajia vaikka v*tun kuulantyöntöön?",
    "Toi [Pelaaja] oli niin sysip*ska heitto että mun tekee mieli oksentaa.",
    "V*ttu sä [Pelaaja] oot onneton tolla puttigriinillä.",
    "S**tana [Pelaaja] sun kiekko näyttää ku se haluais itsemurhan.",
    "Mee [Pelaaja] nurkkaan häpeemään ton heiton jälkeen.",
    "P*rkele [Pelaaja], sä oot yhtä hyödyllinen ku reikä kondomissa.",
    "V*ttu [Pelaaja], sä pelaat ku oisit vetäny silmät kiinni koko rundin.",
    "Toi sun [Pelaaja] tekniikka on v*tun loukkaus Isaac Newtonia kohtaan.",
    "Lopeta [Pelaaja] se räpeltäminen ja heitä ku mies s**tana."
];

// ==========================================
// KORTTIPERHEET (CONCEPT LOCKING & UPGRADES)
// ==========================================
const familyDefs = [
    // --- KATEGORIA A: FYYSISET SABOTAASIT ---
    {
        family: "weak_hand", name: "Heikompi käsi", type: "sabotage", isExpensive: true,
        levels: [
            { lvl: 1, d: "Kohteen on suoritettava SEURAAVA HEITTO kokonaan heikommalla kädellään." },
            { lvl: 2, d: "Kohteen on pelattava KOKO VÄYLÄ (pl. alle 10m putit) heikommalla kädellään." },
            { lvl: 3, d: "Kohteen on pelattava KOKO VÄYLÄ MUKAAN LUKIEN putit heikommalla kädellään." }
        ]
    },
    {
        family: "eyes_closed", name: "Silmät kiinni", type: "sabotage",
        levels: [
            { lvl: 1, d: "SEURAAVA HEITTO silmät kiinni. Turvamies ohjaa heittopaikalle ja kertoo suunnan." },
            { lvl: 2, d: "KOKO VÄYLÄ (pl. alle 10m putit) silmät kiinni. Turvamies ohjaa." },
            { lvl: 3, d: "KOKO VÄYLÄ MUKAAN LUKIEN putit silmät kiinni. Turvamies ohjaa." }
        ]
    },
    {
        family: "one_leg", name: "Yhdellä jalalla", type: "sabotage",
        levels: [
            { lvl: 1, d: "SEURAAVA HEITTO yhdellä jalalla (aloitettava jo ennen vauhdinottoa/heittoa)." },
            { lvl: 2, d: "KOKO VÄYLÄ (pl. C1-putit) yhdellä jalalla." },
            { lvl: 3, d: "KOKO VÄYLÄ MUKAAN LUKIEN putit yhdellä jalalla." }
        ]
    },
    {
        family: "knee", name: "Polvelta", type: "sabotage", isExpensive: true,
        levels: [
            { lvl: 1, d: "SEURAAVA HEITTO vähintään toinen polvi maassa." },
            { lvl: 2, d: "KOKO VÄYLÄ (pl. C1-putit) vähintään toinen polvi maassa." },
            { lvl: 3, d: "KOKO VÄYLÄ MUKAAN LUKIEN putit vähintään toinen polvi maassa." }
        ]
    },
    {
        family: "sitting", name: "Istualtaan", type: "sabotage", isExpensive: true,
        levels: [
            { lvl: 1, d: "SEURAAVA HEITTO istualtaan, pylly tukevasti maassa." },
            { lvl: 2, d: "KOKO VÄYLÄ (pl. C1-putit) istualtaan." },
            { lvl: 3, d: "KOKO VÄYLÄ MUKAAN LUKIEN putit istualtaan." }
        ]
    },
    {
        family: "forehand", name: "Kämmenpakko", type: "sabotage",
        levels: [
            { lvl: 1, d: "SEURAAVA HEITTO on pakko heittää forella (kämmenellä)." },
            { lvl: 2, d: "KOKO VÄYLÄ (pl. C1-putit) on pakko heittää forella." },
            { lvl: 3, d: "KOKO VÄYLÄ MUKAAN LUKIEN putit on pakko heittää forella." }
        ]
    },
    {
        family: "backhand", name: "Rystypakko", type: "sabotage",
        levels: [
            { lvl: 1, d: "SEURAAVA HEITTO on pakko heittää rystyllä." },
            { lvl: 2, d: "KOKO VÄYLÄ (pl. C1-putit) on pakko heittää rystyllä." },
            { lvl: 3, d: "KOKO VÄYLÄ MUKAAN LUKIEN putit on pakko heittää rystyllä." }
        ]
    },
    {
        family: "overhead", name: "Pystyheitto", type: "sabotage", isExpensive: true,
        levels: [
            { lvl: 1, d: "SEURAAVA HEITTO on heitettävä upsinä, tomahawkina tai thumberina." },
            { lvl: 2, d: "KOKO VÄYLÄ (pl. C1-putit) on heitettävä pystyheitolla." },
            { lvl: 3, d: "KOKO VÄYLÄ MUKAAN LUKIEN putit on heitettävä pystyheitolla." }
        ]
    },
    {
        family: "standstill", name: "Paikaltaan", type: "sabotage",
        levels: [
            { lvl: 1, d: "SEURAAVA HEITTO on suoritettava staattisesta haaraseisonnasta (ei vauhtia)." },
            { lvl: 2, d: "KOKO VÄYLÄ (pl. C1-putit) on heitettävä staattisesti paikaltaan." },
            { lvl: 3, d: "KOKO VÄYLÄ MUKAAN LUKIEN putit on heitettävä staattisesti paikaltaan." }
        ]
    },
    {
        family: "max_driver", name: "Maksimidraiveri", type: "sabotage",
        levels: [
            { lvl: 1, d: "SEURAAVA HEITTO on pakko heittää bägisi nopeimmalla kiekolla." },
            { lvl: 2, d: "KOKO VÄYLÄ (pl. C1-putit) on heitettävä bägisi nopeimmalla kiekolla." },
            { lvl: 3, d: "KOKO VÄYLÄ MUKAAN LUKIEN putit on heitettävä nopeimmalla kiekolla." }
        ]
    },
    {
        family: "putter_only", name: "Putteripakko", type: "sabotage",
        levels: [
            { lvl: 1, d: "SEURAAVA HEITTO (esim. avaus) on pakko heittää putterilla." },
            { lvl: 2, d: "KOKO VÄYLÄ on pelattava putterilla." },
            { lvl: 3, d: "KOKO VÄYLÄ on pelattava bägisi HITAAKSEMMALLA / alivakaimmalla putterilla." }
        ]
    },
    {
        family: "reverse_spin", name: "Vastakierre", type: "sabotage", isExpensive: true,
        levels: [
            { lvl: 1, d: "SEURAAVA HEITTO: Kiekon on pyörittävä väärään suuntaan (esim. kämmenkiekko rystyllä)." },
            { lvl: 2, d: "KOKO VÄYLÄ (pl. C1-putit): Kiekon on pyörittävä väärään suuntaan." },
            { lvl: 3, d: "KOKO VÄYLÄ MUKAAN LUKIEN putit: Kiekon on pyörittävä väärään suuntaan." }
        ]
    },
    {
        family: "no_thumb", name: "Peukalokielto", type: "sabotage", isExpensive: true,
        levels: [
            { lvl: 1, d: "SEURAAVA HEITTO: Peukalo ei saa koskea kiekon kanteen." },
            { lvl: 2, d: "KOKO VÄYLÄ (pl. C1-putit): Peukalo ei saa koskea kanteen." },
            { lvl: 3, d: "KOKO VÄYLÄ MUKAAN LUKIEN putit: Peukalo ei saa koskea kanteen." }
        ]
    },
    {
        family: "no_followthrough", name: "Ei saattoa", type: "sabotage",
        levels: [
            { lvl: 1, d: "SEURAAVA HEITTO: Heittokäden on pysähdyttävä kuin seinään irrotuksessa." },
            { lvl: 2, d: "KOKO VÄYLÄ (pl. C1-putit): Heittokäden on pysähdyttävä irrotuksessa." },
            { lvl: 3, d: "KOKO VÄYLÄ MUKAAN LUKIEN putit: Heittokäden on pysähdyttävä irrotuksessa." }
        ]
    },
    {
        family: "pizza_grip", name: "Pizza-grippi", type: "sabotage", isExpensive: true,
        levels: [
            { lvl: 1, d: "SEURAAVA HEITTO: Kiekkoa pidetään molemmin käsin kiinni ja heitetään alakautta." },
            { lvl: 2, d: "KOKO VÄYLÄ (pl. C1-putit): Heitettävä Pizza-gripillä alakautta." },
            { lvl: 3, d: "KOKO VÄYLÄ MUKAAN LUKIEN putit: Heitettävä Pizza-gripillä alakautta." }
        ]
    },
    {
        family: "fore_roller", name: "Fore-Rolleri", type: "sabotage", isExpensive: true,
        levels: [
            { lvl: 1, d: "SEURAAVA HEITTO on osuttava maahan ja rullattava eteenpäin kämmenpuolelta." },
            { lvl: 2, d: "KOKO VÄYLÄ (pl. C1-putit) on heitettävä fore-rollerina." }
        ]
    },
    {
        family: "shoe_off", name: "Kenkä pois", type: "sabotage",
        levels: [
            { lvl: 1, d: "SEURAAVA HEITTO: Toinen kenkä on riisuttava jalasta heiton ajaksi." },
            { lvl: 2, d: "KOKO VÄYLÄ (pl. C1-putit): Toinen kenkä on oltava irti jalasta heitettäessä." },
            { lvl: 3, d: "KOKO VÄYLÄ MUKAAN LUKIEN putit: Toinen kenkä pois jalasta." }
        ]
    },
    {
        family: "hand_pocket", name: "Käsi taskussa", type: "sabotage",
        levels: [
            { lvl: 1, d: "SEURAAVA HEITTO: Ei-heittokäden on oltava syvällä taskussa koko liikkeen ajan." },
            { lvl: 2, d: "KOKO VÄYLÄ (pl. C1-putit): Ei-heittokäsi on pidettävä taskussa." },
            { lvl: 3, d: "KOKO VÄYLÄ MUKAAN LUKIEN putit: Ei-heittokäsi on pidettävä taskussa." }
        ]
    },
    {
        family: "back_to_basket", name: "Selin koriin", type: "sabotage",
        levels: [
            { lvl: 1, d: "SEURAAVA HEITTO: Rintamasuunnan on oltava poispäin korista irrotushetkellä." },
            { lvl: 2, d: "KOKO VÄYLÄ (pl. C1-putit): Rintamasuunta poispäin korista." },
            { lvl: 3, d: "KOKO VÄYLÄ MUKAAN LUKIEN putit: Rintamasuunta poispäin korista." }
        ]
    },
    {
        family: "slow_mo", name: "Hidasliike", type: "sabotage",
        levels: [
            { lvl: 1, d: "SEURAAVA HEITTO: Vauhdinotto ja heitto on tehtävä korostetun hitaasti." },
            { lvl: 2, d: "KOKO VÄYLÄ (pl. C1-putit): Suoritettava korostetun hitaasti." },
            { lvl: 3, d: "KOKO VÄYLÄ MUKAAN LUKIEN putit: Suoritettava korostetun hitaasti." }
        ]
    },
    {
        family: "devil_shoulder", name: "Piru olkapäällä", type: "sabotage",
        levels: [
            { lvl: 1, d: "SEURAAVA HEITTO: Vastustaja saa seistä vieressä ja häiritä kovaäänisesti." },
            { lvl: 2, d: "KOKO VÄYLÄ (pl. C1-putit): Vastustaja saa seistä vieressä ja häiritä." },
            { lvl: 3, d: "KOKO VÄYLÄ MUKAAN LUKIEN putit: Vastustaja saa seistä vieressä ja häiritä." }
        ]
    },

    // --- KATEGORIA B: ERIKOISSABOTAASIT ---
    {
        family: "turbo_putt", name: "Turboputti", type: "sabotage", isExpensive: true,
        levels: [
            { lvl: 1, d: "Kohteen SEURAAVA PUTTI on heitettävä turboputtina." },
            { lvl: 2, d: "Kohteen KAIKKI C1 & C2 alueen putit tällä väylällä on heitettävä turboputtina." },
            { lvl: 3, d: "Kohteen KOKO VÄYLÄ (avauksesta alkaen) on heitettävä turboputtina." }
        ]
    },
    {
        family: "c2_max", name: "C2 Täysiä", type: "sabotage", isExpensive: true,
        levels: [
            { lvl: 1, d: "Kohteen seuraava 10-20m (C2) heitto on vedettävä 100% maksimiteholla." },
            { lvl: 2, d: "Kohteen KAIKKI 10-20m heitot tällä väylällä on vedettävä 100% teholla." },
            { lvl: 3, d: "Kohteen KAIKKI 10-20m heitot SEKÄ C1 PUTIT on vedettävä 100% teholla." }
        ]
    },

    // --- KATEGORIA C: TALOUS / TULOS ---
    // (Piste-sakot 69, 70, 71 on poistettu toiveiden mukaisesti)
    {
        family: "deny_income", name: "Tulojen eväys", type: "sabotage",
        levels: [
            { lvl: 1, d: "Kohde menettää peruspalkan (passiivisen tulon) tältä väylältä.", mech: "deny_passive" },
            { lvl: 2, d: "Kohde menettää peruspalkan SEKÄ mahdollisen väylävoiton rahat.", mech: "deny_win" },
            { lvl: 3, d: "Kohde menettää KAIKKI tulot (palkka, voitto, tehtävä, bonus).", mech: "deny_all_income" }
        ]
    },

    // --- KATEGORIA D: EDUT & PELASTUKSET ---
    {
        family: "mulligan_throw", name: "Mulligan (Heitot)", type: "buff", isExpensive: true,
        levels: [
            { lvl: 1, d: "Uusi 1 epäonnistunut lähestymisheitto rangaistuksetta." },
            { lvl: 2, d: "Uusi 1 avausheitto tiiltä rangaistuksetta." },
            { lvl: 3, d: "Tupla-avaus: Saat avata tiiltä kahdella kiekolla ja valita niistä kummalla jatkat." }
        ]
    },
    {
        family: "mulligan_putt", name: "Mulligan (Putit)", type: "buff",
        levels: [
            { lvl: 1, d: "Uusi 1 epäonnistunut putti rangaistuksetta." },
            { lvl: 2, d: "Uusi 2 epäonnistunutta puttia rangaistuksetta (samaan yritykseen)." },
            { lvl: 3, d: "Magneettikori: Seuraava alle 10m putti lasketaan automaattisesti sisään menneeksi." }
        ]
    },
    {
        family: "move_lie", name: "Siirto", type: "buff", isExpensive: true,
        levels: [
            { lvl: 1, d: "Siirrä omaa kiekkoasi rangaistuksetta +2 metriä mihin tahansa suuntaan." },
            { lvl: 2, d: "Siirrä omaa kiekkoasi rangaistuksetta +5 metriä mihin tahansa suuntaan." },
            { lvl: 3, d: "Siirrä omaa kiekkoasi rangaistuksetta +10 metriä mihin tahansa suuntaan!" }
        ]
    },
    {
        family: "cancel_sabo", name: "Kumous", type: "buff", isExpensive: true,
        levels: [
            { lvl: 1, d: "Peruuta sinuun kohdistettu Tason 1 sabotaasi automaattisesti.", mech: "cancel_1" },
            { lvl: 2, d: "Peruuta sinuun kohdistettu Tason 1 tai 2 sabotaasi automaattisesti.", mech: "cancel_2" },
            { lvl: 3, d: "Peruuta MIKÄ TAHANSA sinuun kohdistettu sabotaasi automaattisesti.", mech: "cancel_3" }
        ]
    },
    {
        family: "happy_mulligan", name: "Best Shot", type: "buff", isExpensive: true,
        levels: [
            { lvl: 1, d: "Saat heittää yhden heiton kahteen kertaan ja jatkaa paremmasta tuloksesta." },
            { lvl: 2, d: "Saat tehdä saman BEST SHOT -edun kaksi kertaa tällä väylällä." },
            { lvl: 3, d: "Saat tehdä saman BEST SHOT -edun kolme kertaa tällä väylällä." }
        ]
    },

    // --- KATEGORIA E: YKSITTÄISET / VAJAAT TASOT ---
    {
        family: "ob_rescue", name: "OB-Pelastus", type: "buff",
        levels: [
            { lvl: 2, d: "Jos heität OB:lle, jatka rangaistuksetta samasta heittopaikasta." }
        ]
    },
    {
        family: "mando_bypass", name: "Mando-ohitus", type: "buff",
        levels: [
            { lvl: 3, d: "Saat jättää pakollisen kierron (mandon) huomioimatta ilman rangaistusta." }
        ]
    },
    {
        family: "reflect", name: "Peilaus", type: "buff",
        levels: [
            { lvl: 3, d: "Käännä MIKÄ TAHANSA sinuun kohdistettu sabotaasi takaisin sen heittäjälle.", mech: "reflect" }
        ]
    },
    {
        family: "triple_bounty", name: "Triplatehtävä", type: "buff",
        levels: [
            { lvl: 3, d: "Jos voitat väylällä olevan sääntö/bounty-tehtävän, saat rahan triplana (x3)." }
        ]
    },
    {
        family: "card_deny", name: "Korttikato", type: "sabotage",
        levels: [
            { lvl: 2, d: "Kohde ei saa nostaa kortteja väylän lopussa.", mech: "deny_draw" }
        ]
    },
    {
        family: "early_start", name: "Varaslähtö", type: "buff", isExpensive: true,
        levels: [
            { lvl: 2, d: "Saat aloittaa tämän väylän 5 metriä tiipadin etupuolelta." },
            { lvl: 3, d: "Saat aloittaa tämän väylän 10 metriä tiipadin etupuolelta." }
        ]
    }
];

// ==========================================
// RAKENNETAAN window.allCards ARRAY
// ==========================================
const baseCostT1 = 2;
const baseCostT2 = 4;
const baseCostT3 = 6;
const expensiveBump = 2; // +2 P kalliimmat kortit

familyDefs.forEach(fam => {
    let maxLvl = Math.max(...fam.levels.map(l => l.lvl));
    
    fam.levels.forEach((lvDef, index) => {
        let cardId = `${fam.family}_t${lvDef.lvl}`;
        
        let p = baseCostT1;
        if(lvDef.lvl === 2) p = baseCostT2;
        if(lvDef.lvl === 3) p = baseCostT3;

        // Kallistetaan määritetyt korttiperheet (+2P)
        if (fam.isExpensive) {
            p += expensiveBump;
        }

        let nextLvlDef = fam.levels.find(l => l.lvl === lvDef.lvl + 1);
        let upgradeText = "";
        let nextIdStr = null;

        if (nextLvlDef) {
            nextIdStr = `${fam.family}_t${nextLvlDef.lvl}`;
            // Päivitys maksaa periaatteessa erotuksen tai vakiokorotuksen. Määritellään se simppelisti:
            let uCost = (lvDef.lvl === 1) ? 3 : 5;
            upgradeText = `Päivitys Tasolle ${nextLvlDef.lvl} (Hinta: ${uCost} P): ${nextLvlDef.d}`;
        }

        window.allCards.push({
            id: cardId,
            family: fam.family,
            n: `${fam.name} (Taso ${lvDef.lvl})`,
            d: lvDef.d,
            level: lvDef.lvl,
            maxLevel: maxLvl,
            upgradeDesc: upgradeText,
            nextId: nextIdStr,
            tier: "normal", 
            type: fam.type,
            price: p, // TÄMÄ MÄÄRITTÄÄ NYT KAIKEN HINNAN (Kauppa ja Peluu)
            mech: lvDef.mech || null
        });
    });
});

window.getCardPlayCost = function(cId) {
    let cDef = window.allCards.find(c => c.id === cId);
    if(!cDef) return 0;
    return cDef.price; 
};

// ==========================================
// LAATUTARKISTETUT VÄYLÄSÄÄNNÖT & TEHTÄVÄT
// ==========================================
window.holeRules = [
    // Säilytetyt alkuperäiset
    { type: "rule", n: "Putteriväylä", d: "Koko väylä on pelattava pelkillä puttereilla (mukaan lukien avaus)." },
    { type: "rule", n: "Midariväylä", d: "Avaus ja lähestymiset on pakko heittää midareilla." },
    { type: "rule", n: "Haaraputti-pakko", d: "Kaikki putit on suoritettava haaraputtina." },
    { type: "rule", n: "Vain vakain", d: "Väylä on pelattava bägisi vakaimmalla kiekolla." },
    
    // Uudet luovat säännöt
    { type: "rule", n: "Äänetön Griini", d: "C1-alueella (10m korista) ei saa puhua sanaakaan. Puhumisesta +1 tulokseen." },
    { type: "rule", n: "Vasuri-avaus", d: "Kaikkien on pakko heittää avausheitto heikommalla kädellään." },
    { type: "rule", n: "Sokkoputti", d: "Jokaisen pelaajan ensimmäinen putti on suoritettava silmät kiinni." },
    { type: "rule", n: "Kiekko-ruletti", d: "Nosta bägistäsi sokkona satunnainen kiekko ja avaa väylä sillä." },
    { type: "rule", n: "Rolleri-pakko", d: "Avausheitto on pakko heittää rollerina (kiekon osuttava maahan pystyssä)." },
    { type: "rule", n: "Ei vauhtia", d: "Kaikki heitot koko väylällä on suoritettava täysin paikaltaan." },
    { type: "rule", n: "Kiekkopoika", d: "Huonoimman avauksen heittänyt joutuu hakemaan muiden kiekot koria kohti käveltäessä." },
    { type: "rule", n: "Tuplaputit", d: "Jos ensimmäinen putti ei mene sisään, saat heti yrittää toisella kiekolla uudestaan." },

    // Säilytetyt bountyt
    { type: "bounty", n: "Tarkka-ampuja", d: "Pelaaja, kenen avausheitto on lähimpänä koria, voittaa tehtävän." },
    { type: "bounty", n: "Pelastaja", d: "Ensimmäinen pelaaja, joka tekee onnistuneen pitkän putin (C2), voittaa." },
    { type: "bounty", n: "Puu-magneetti", d: "Pelaaja, jolla on eniten puuosumia tällä väylällä, MUTTA joka pelaa väylän silti Par-tulokseen tai paremmin, voittaa." },
    
    // Uudet luovat bountyt
    { type: "bounty", n: "Pituusputti", d: "Pelaaja, joka puttaa kaikkein pisimmältä sisään (yli 5m), voittaa tehtävän." },
    { type: "bounty", n: "Grip-lock Pelastus", d: "Pelaaja, joka heittää ilmiselvän gripparin tai epäonnistuneen avauksen, mutta pelastaa silti parin, voittaa." },
    { type: "bounty", n: "Kakkosen Kuningas", d: "Pelaaja, jonka toinen heitto on väylän pisin ja tarkin, voittaa." },
    { type: "bounty", n: "Parkkeeraaja", d: "Pelaaja, jonka avausheitto jää alle 3 metrin päähän korista, voittaa." },
    { type: "bounty", n: "Tolppa-apina", d: "Ensimmäinen pelaaja, joka osuu putatessa rautoihin menemättä sisään, voittaa säälinapin." }
];
