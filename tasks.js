window.allCards = [];
window.holeRules = [];

// ==========================================
// ELÄINTEN GRAFIIKAT JA 150 HENKILÖKOHTAISTA SOLVAUSTA
// ==========================================
const doodleSVGs = [
    "M 20 80 Q 20 60 40 60 L 45 40 L 50 60 L 60 30 L 65 60 L 75 40 L 80 80 Z M 30 70 L 32 70 M 15 75 L 20 80 M 85 75 L 80 80", 
    "M 20 80 L 20 40 L 30 20 L 40 40 L 60 40 L 70 20 L 80 40 L 80 80 Z M 35 55 L 37 55 M 65 55 L 63 55 M 45 65 L 55 65 L 50 72 Z",
    "M 20 80 C 20 30 80 30 80 80 Z M 20 40 C 10 40 10 20 25 30 M 80 40 C 90 40 90 20 75 30 M 40 55 L 42 55 M 60 55 L 58 55",
    "M 50 80 C 20 80 20 30 50 30 C 80 30 80 80 50 80 Z M 40 55 L 60 55 L 50 70 Z M 35 45 L 40 48 M 65 45 L 60 48"
];

const insults = [
    "[Pelaaja], v*ttu mikä heitto, ootko sä koskaan edes pitänyt kiekkoa kädessä?",
    "[Pelaaja] p*rkele, mummonikin puttaa paremmin, ja se on ollut kuolleena 10 vuotta.",
    "S**tanan sirkkeli [Pelaaja], puut tykkää susta enemmän ku sun omat vanhemmat.",
    "Ei h*lvetti [Pelaaja], jopa Jeesus itkee ton sun tekniikan takia.",
    "P*ska veto [Pelaaja]. Sun draivi on lyhyempi ku mun kärsivällisyys.",
    "V*tun hieno lay-up [Pelaaja]! Ai se olikin sun maksimidraivi?",
    "Mene [Pelaaja] s**tana takas rangelle, tää on noloa meille kaikille.",
    "P*rkeleen rystykääntö [Pelaaja], kiekko lensi enemmän taakse ku eteen.",
    "Miten sä [Pelaaja] v*ttu onnistut missaamaan kahdesta metristä?",
    "H*lvetin hieno puuosuma [Pelaaja]! Tähtäsitkö sä siihen vai ootko vaan sysip*ska?",
    "V*tun noloa [Pelaaja]. Caddiekin lähti äsken kotiin häpeästä.",
    "[Pelaaja], s**tanan kalliit kiekot sulla, mut taidot on tasan 0 euroa.",
    "P*rkele [Pelaaja], sun rystyheitto näyttää siltä ku yrittäisit heittää pesukonetta.",
    "V*tun grippilokki [Pelaaja]! Ota se käsi irti siitä muovista ajoissa.",
    "P*ska putti, p*ska pelaaja. Yksinkertaista, eikö vain [Pelaaja]?",
    "H*lvetti soikoon [Pelaaja], sun kiekko etsii enemmän sieniä ku metsästäjät.",
    "V*ttu mulla sulaa aivot ku joutuu kattoon tota sun räpellystä, [Pelaaja].",
    "S**tana mikä uikku [Pelaaja], ootko harkinnu vaikka pitsinnypläystä?",
    "P*rkeleen amatööri [Pelaaja], sun bägi painaa enemmän ku sun ÄO.",
    "V*tun hieno rolleri [Pelaaja]! Harmi vaan että se pysähty heti ekaan käpyyn.",
    "P*ska heitto [Pelaaja]! Edes myötätuuli ei halua auttaa sua.",
    "H*lvetin puunhakkaaja [Pelaaja]. Montako kuutiota teit polttopuuta tolla draivilla?",
    "V*ttu sä [Pelaaja] olet hidas! Heitä nyt s**tana!",
    "P*rkele [Pelaaja], heitä silmät kii ens kerralla, ei se ainakaan huonommin voi mennä.",
    "V*tun kiva kattoa ku yrität [Pelaaja]. Et siis onnistu, mut yrität.",
    "S**tanan vässykkä [Pelaaja], ota se putteri ja laita se sisään!",
    "P*ska formi [Pelaaja]! Sun x-step näyttää humalaisen ripaskalta.",
    "H*lvetti [Pelaaja], mä voisin heittää vasemmalla kädellä paremmin ku sä.",
    "Ootko [Pelaaja] sokea vai heitätkö sä vaan tahallaan päin v*ttua?",
    "S**tana [Pelaaja], toi heitto oli niin löysä et se pyys anteeks tuulelta.",
    "P*rkele [Pelaaja], sun saatto on yhtä olematon ku sun tulevaisuus.",
    "V*ttu [Pelaaja], laita ne kiekot Toriin ja poista friba-appi puhelimesta.",
    "H*lvetin noloa [Pelaaja]. Jopa korin alarauta nauraa sulle.",
    "S**tanan uuno [Pelaaja], kiekkoa pitää heittää, ei silittää.",
    "P*ska rysty, [Pelaaja]. Näyttää ku sorsalla ois ripuli.",
    "V*tun hyvin pelattu [Pelaaja]. Eikun siis s**tanan huonosti.",
    "Ei p*rkele [Pelaaja], lopeta toi saatanan ranteella vemputtaminen.",
    "H*lvetti [Pelaaja], sun kiekko on ollu enemmän vedessä ku kalat.",
    "S**tanan lahjaton [Pelaaja], osta vaikuttavampi bägi, jos se pelastais.",
    "V*ttu mikä hysse [Pelaaja]. Se nous niin korkeelle et lintu sai sydärin.",
    "P*rkeleen ränniheittäjä [Pelaaja], ootko ikinä osunu ykkösväliin?",
    "S**tanan säheltäjä [Pelaaja], silmät auki tiillä!",
    "V*tun nyssykkä [Pelaaja]. Edes mun kissa ei heitä noin hiljaa.",
    "P*ska linja [Pelaaja]. Miten sä edes keksit heittää tosta?",
    "H*lvetin metsäpeikko [Pelaaja], taasko sä olet siellä tiheikössä?",
    "V*ttu oot varmaan ylpeä tosta heitosta [Pelaaja], vaikka se meni päin h*lvettiä.",
    "P*rkeleen sunnuntaipelaaja [Pelaaja], sun peli on yhtä kärsimystä.",
    "S**tana ootko sä sokea vai vaan äärimmäisen tyhmä, [Pelaaja]?",
    "V*tun kädetön apina [Pelaaja], ote irti kiekosta ajoissa!",
    "P*ska suoritus [Pelaaja]. Oisit ees jättäny draiverit kotiin.",
    "H*lvetin hyvä yritys [Pelaaja]. Ei ollu lähelläkään.",
    "V*ttu sun saatto [Pelaaja] on niin lyhyt et näyttää ku saisit sähköiskun.",
    "P*rkele [Pelaaja], mee plokkaan marjoja tonne metsään, kun kerran siellä oot.",
    "S**tanan harrastelija [Pelaaja], kato YouTubesta vähän mallia.",
    "V*tun lapanen [Pelaaja], mihin sä sen oikein heitit?",
    "P*ska mies, p*skempi fore, [Pelaaja].",
    "H*lvetti mikä laiskanlinna [Pelaaja], eikö yhtään kiinnosta yrittää?",
    "V*ttu mun aivot sulaa sun heittojen takia, [Pelaaja].",
    "P*rkeleen pullasorsa [Pelaaja], lopeta se leipominen ja heitä!",
    "S**tanan pösilö [Pelaaja], taasko kiekko meni veteen?",
    "V*tun itkupilli [Pelaaja], eihän se oo ku muovia metsässä.",
    "P*ska peli [Pelaaja], ootko aatellu et frisbeegolf ei vaan oo sua varten?",
    "H*lvetti mä heittäisin sut perässä sinne järveen, [Pelaaja].",
    "V*ttu sä oot sysip*ska [Pelaaja]. Ei voi muuta sanoa.",
    "P*rkeleen velttoilija [Pelaaja], missä sun asenne on?",
    "S**tana sun avaukset [Pelaaja] on lyhyempiä ku mun putit.",
    "V*tun munapää [Pelaaja], älä ota tuurista kunniaa itelles.",
    "P*skan marjat [Pelaaja], et sä tota yrittänyt hakea.",
    "H*lvetin aivokuollut linjavalinta, [Pelaaja].",
    "V*ttu sä teet mut fyysisesti sairaaks tolla formilla, [Pelaaja].",
    "P*rkele laita silmät auki kun heität, [Pelaaja]!",
    "S**tanan sähläri [Pelaaja], ei tää oo rakettitiedettä.",
    "V*tun p*ska [Pelaaja]. Anna kiekot mulle ja painu v*ttuun täältä.",
    "P*ska sää, p*ska rata, mut sä oot p*skin kaikista, [Pelaaja].",
    "H*lvetti ootko sä [Pelaaja] liimannu sen kiekon kiinni käteens?",
    "V*ttu mikä nyssykkä [Pelaaja]. Edes vauva ei heitä noin hiljaa.",
    "P*rkeleen surkimus [Pelaaja], toi oli säälittävin heitto mitä oon ikinä nähny.",
    "S**tanan noloa [Pelaaja]. Älä kerro kellekään et tunnet mut.",
    "V*tun idiootti [Pelaaja], luitko sä tuulen ihan tarkotuksella väärin?",
    "P*ska peli [Pelaaja]. Jos tyhmyydestä sais miinuksia, oisit radan ennätysmies.",
    "H*lvetti sä tuhoat mun elämänhalun tolla pelillä, [Pelaaja].",
    "V*ttu ota ittees niskasta kii ja lopeta toi s**tanan sähläys, [Pelaaja]!",
    "P*rkele [Pelaaja] sä olet friban musta aukko, imeet kaiken ilon lajista.",
    "S**tana mun isoäiti on rollaattorissa ja voittais sut yhdellä kädellä, [Pelaaja].",
    "V*tun p*ska [Pelaaja], sun draivi muistuttaa mua oksennuksesta: molemmat tulee yllättäen ja menee päin h*lvettiä.",
    "P*ska putti [Pelaaja]. Ja p*skat on sun housuissakin.",
    "H*lvetti sun rysty on v*tun surullinen näky, [Pelaaja].",
    "V*ttu sä heität pahemmin ku ruosteinen sarana, [Pelaaja].",
    "P*rkele lopeta se itkeminen ja opettele puttaamaan, [Pelaaja].",
    "S**tana [Pelaaja], ees vahinko ei voi selittää tota heittoa.",
    "V*tun puusilmä [Pelaaja], se kori on tuolla edessä, ei sivuilla.",
    "P*ska kiekko vai p*ska heittäjä [Pelaaja]? Mä tiedän vastauksen.",
    "H*lvetti [Pelaaja], mä häpeän olla samalla radalla sun kanssas.",
    "V*ttu mikä onneton roikku [Pelaaja].",
    "P*rkeleen tunari [Pelaaja], sut pitäis bannata kaikilta radoilta.",
    "S**tanan pehmee veto [Pelaaja], oliko sulla käsilaukku kädessä?",
    "V*tun luuseri [Pelaaja], et edes yritä.",
    "P*ska svingi [Pelaaja], näytät ihan katkenneelta heinäseipäältä.",
    "H*lvetti sä oot ruma heittäjä, [Pelaaja]. Oikeasti.",
    "V*ttu miten voi ihminen olla noin koordinaatiokyvytön, [Pelaaja].",
    "P*rkele [Pelaaja], sun peli on yhtä tyhjän kanssa.",
    "S**tana [Pelaaja], toi putti ei ees ollu lähellä mörköä.",
    "V*tun hyvä pomppu [Pelaaja]! Harmi et se meni OB:lle.",
    "P*ska peli [Pelaaja], mee pelaan mölkkyä.",
    "H*lvetti [Pelaaja], mä voisin heittää sua tolla kiekolla paremmin.",
    "V*ttu [Pelaaja], ootko sä liimannu sun sormet toisiinsa?",
    "P*rkele sun tekniikka [Pelaaja] aiheuttaa mulle migreenin.",
    "S**tana sä oot kävelevä katastrofi, [Pelaaja].",
    "V*tun amatööri [Pelaaja], osta uudet kädet.",
    "P*ska veto [Pelaaja], sun rysty on lajin häpeä.",
    "H*lvetti [Pelaaja], toi heitto oli huonompi ku Suomen talous.",
    "V*ttu [Pelaaja], et sä osaa ees teipata sormias oikein.",
    "P*rkeleen vinkuja [Pelaaja], turpa kii ja heitä.",
    "S**tana [Pelaaja], heitä se kiekko äläkä leivo sitä.",
    "V*tun nyssykkä [Pelaaja], et sä heitä, sä pudotat sen.",
    "P*ska formi [Pelaaja], sun tukijalka on ku makaroni.",
    "H*lvetti [Pelaaja], ees tuuli ei halua koskea sun kiekkoon.",
    "V*ttu sä oot surkea [Pelaaja]. Puhdasta faktaa.",
    "P*rkele [Pelaaja], lopeta laji, sä säästät kaikkien aikaa.",
    "S**tana sun peli [Pelaaja] on yhtä jännittävää ku maalin kuivuminen.",
    "V*tun räpylä [Pelaaja], ote lipsuu pahemmin ku ajatus.",
    "P*ska draivi [Pelaaja], kato peiliin ja häpee.",
    "H*lvetti sä roiskit [Pelaaja] tota kiekkoa ku hullu apina.",
    "V*ttu mikä antsa [Pelaaja], se käänsi suoraan naapurin olohuoneeseen.",
    "P*rkeleen sirkuspelle [Pelaaja], heitä välillä normaalisti!",
    "S**tanan alisuorittaja [Pelaaja], sä oot tän lajin musta pilkku.",
    "V*tun väsyny veto [Pelaaja].",
    "P*ska putti [Pelaaja], sulaa aivot ku tollasta kattoo.",
    "H*lvetin surkimus [Pelaaja], jopa mä häpeän sun puolesta.",
    "V*ttu sä et osaa [Pelaaja]! Lopeta se muovin paiskonta.",
    "P*rkele [Pelaaja], ootko aatellu et frisbeegolf ei vaan oo sua varten?",
    "S**tanan tyhmä veto [Pelaaja]. Miks helvetissä valitsit ton linjan?",
    "V*tun puusilmä [Pelaaja], se kiekko löytyy varmaan toiselta mantereelta.",
    "P*skamainen keli, p*ska heittäjä [Pelaaja].",
    "H*lvetti sä roiskit tota kiekkoa ku hullu koira [Pelaaja].",
    "V*ttu sä oot naurettava [Pelaaja]. C1-putit ohi vasemmalta ja oikeelta.",
    "P*rkele [Pelaaja], heitä silmät kii ens kerralla.",
    "S**tanan vässykkä [Pelaaja], ota se putteri ja laita se sisään!",
    "V*tun kädetön apina [Pelaaja], ote irti kiekosta ajoissa!",
    "P*ska suoritus [Pelaaja]. Oisit ees jättäny draiverit kotiin.",
    "H*lvetin hyvä yritys [Pelaaja]. Ei ollu lähelläkään.",
    "V*ttu sun saatto [Pelaaja] on niin lyhyt et näyttää ku saisit sähköiskun.",
    "P*rkele [Pelaaja], mee plokkaan marjoja tonne metsään.",
    "S**tanan harrastelija [Pelaaja], kato YouTubesta vähän mallia.",
    "V*tun läpsyttelijä [Pelaaja], heitä sitä kiekkoa äläkä silitä sitä.",
    "P*ska formi [Pelaaja]! Näyttää ku sorsalla ois ripuli."
];

// ==========================================
// TASO 1: PIENET SABOTAASIT (50 Kpl - Mekaniikkatageilla)
// ==========================================
const minorBases = [
    { n: "Heikompi käsi (Putti)", d: "Kohteen on suoritettava kaikki alle 10m putit heikommalla kädellään." },
    { n: "Paikaltaveto", d: "Kohteen on heitettävä seuraava heitto täysin ilman vauhtiaskeleita." },
    { n: "Haaraseisonta", d: "Seuraava heitto on suoritettava staattisesta haaraseisonnasta." },
    { n: "Polvelta", d: "Seuraava heitto on suoritettava vähintään toinen polvi maassa." },
    { n: "Kurki-asento", d: "Heiton irrotushetkellä vain yksi jalka saa koskea maahan." },
    { n: "Kiekon rajoitus", d: "Määrää 1 kiekko kohteen bägistä, jota hän ei saa käyttää seuraavaan heittoon." },
    { n: "Pakollinen Hysse", d: "Seuraavan heiton on oltava selkeä hyzer." },
    { n: "Pakollinen Antsa", d: "Seuraavan heiton on lähdettävä selkeässä anhyzer-kulmassa." },
    { n: "Fore-lähestyminen", d: "Kohteen seuraava heitto (pl. avaus) on heitettävä kämmenellä (fore)." },
    { n: "Rysty-lähestyminen", d: "Kohteen seuraava heitto (pl. avaus) on heitettävä rystyllä." },
    { n: "Ei ristiaskelta", d: "Vauhdinotossa ei saa käyttää ristiaskelta (x-step)." },
    { n: "Putteriavaus", d: "Avausheitto tiiltä on pakko suorittaa putterilla." },
    { n: "Midariavaus", d: "Avausheitto tiiltä on pakko suorittaa midrange-kiekolla." },
    { n: "Pikaveto (10s)", d: "Kohteella on maksimissaan 10 sekuntia aikaa heittää." },
    { n: "Selin koriin", d: "Heiton irrotushetkellä kohteen rintamasuunnan on oltava poispäin korista." },
    { n: "Kevyt kiekko", d: "Kohteen on valittava bägistään kevyin/alivakain kiekkonsa." },
    { n: "Painava kiekko", d: "Kohteen on valittava bägistään vakain/painavin kiekkonsa." },
    { n: "Ei saattoa", d: "Heittokäden on pysähdyttävä kuin seinään heti irrotuksen jälkeen." },
    { n: "Putti haaralta", d: "Kaikki putit tällä väylällä on pakko suorittaa haaraputtina." },
    { n: "Esteen kuvittelu", d: "Aseta kohteen bägi 1.5 metrin päähän heittolinjalle. Heiton on kierrettävä se." },
    // Automaatio-sabotaasit (Score)
    { n: "Sakkorinki", d: "Lisää automaattisesti +1 heitto kohteen väylätulokseen.", mech: "score_+1" },
    { n: "Pieni kompastus", d: "Lisää automaattisesti +1 heitto kohteen väylätulokseen.", mech: "score_+1" },
    { n: "Tuulen viemää", d: "Lisää automaattisesti +1 heitto kohteen väylätulokseen.", mech: "score_+1" },
    { n: "Varvaskipu", d: "Lisää automaattisesti +1 heitto kohteen väylätulokseen.", mech: "score_+1" },
    { n: "Epäonnen kierre", d: "Lisää automaattisesti +1 heitto kohteen väylätulokseen.", mech: "score_+1" },
    { n: "Kiekkopesu", d: "Lisää automaattisesti +1 heitto kohteen väylätulokseen.", mech: "score_+1" },
    { n: "Huti!", d: "Lisää automaattisesti +1 heitto kohteen väylätulokseen.", mech: "score_+1" },
    { n: "Sakkorinki 2", d: "Lisää automaattisesti +1 heitto kohteen väylätulokseen.", mech: "score_+1" },
    { n: "Pieni kompastus 2", d: "Lisää automaattisesti +1 heitto kohteen väylätulokseen.", mech: "score_+1" },
    { n: "Korttivarkaus", d: "Kohde ei saa nostaa uusia kortteja tämän väylän lopussa.", mech: "deny_draw" },
    { n: "Palkan alennus", d: "Kohde menettää passiivisen tulonsa tältä väylältä (0 P).", mech: "deny_passive" },
    // Lisää fysiikkasaboja 50 asti
    { n: "Silmät kiinni irrotus", d: "Kohde joutuu sulkemaan silmänsä juuri ennen heiton irrotusta." },
    { n: "Korkea heitto", d: "Seuraavan heiton on käytävä vähintään 5 metrin korkeudessa." },
    { n: "Matala heitto", d: "Seuraavan heiton on pysyttävä alle 2 metrin korkeudessa." },
    { n: "Ei peukaloa", d: "Peukalo ei saa koskea kiekon kanteen heiton aikana." },
    { n: "Ei etusormea", d: "Etusormi ei saa koskea kiekon rimiin heiton aikana." },
    { n: "Käänteinen grippi", d: "Peukalo on pidettävä kiekon pohjapuolella, sormet kannella." },
    { n: "Istualtaan putti", d: "Kaikki alle 5m putit on suoritettava istualtaan." },
    { n: "Kenkä pois", d: "Heittokäden puoleinen kenkä on otettava pois heiton ajaksi." },
    { n: "Bägi selässä", d: "Bägi on pidettävä selässä seuraavan heiton ajan." },
    { n: "Bägi etupuolella", d: "Bägi on pidettävä rinnan puolella seuraavan heiton ajan." },
    { n: "Vapaa käsi taskuun", d: "Vapaa käsi on pidettävä housuntaskussa koko heiton ajan." },
    { n: "Maksimiteho", d: "Seuraava lähestyminen on heitettävä 100% täysillä, vaikka kori olisi lähellä." },
    { n: "Suora selkä", d: "Selkä on pidettävä täysin suorana koko heiton ajan, ei saa kumartua." },
    { n: "Vain päkiöillä", d: "Koko heittosuoritus on tehtävä pelkillä päkiöillä seisten." },
    { n: "Täyskäsi", d: "Kohde joutuu pitämään toisessa kädessä 3 kiekkoa heittonsa ajan." },
    { n: "Varjonyrkkeily", d: "Kohteen on tehtävä 3 lyöntiä ilmaan ennen vetoa." },
    { n: "Silmät ristiin", d: "Laita silmät kieroon juuri kun tähtäät ja heität." },
    { n: "Golf-asento", d: "Heitä lähestyminen maasta kuten löisit pallogolfia." }
];
// Täytetään loput dynaamisesti 50 asti jos puuttuu
while(minorBases.length < 50) { minorBases.push({ n: "Tekniikkahäiriö", d: "Seuraava heitto on suoritettava täysin paikaltaan ilman saattoa.", mech: null }); }
minorBases.slice(0, 50).forEach((base, i) => window.allCards.push({ id: "minor_" + i, n: base.n, d: base.d, tier: "normal", type: "minor_sabotage", mech: base.mech || null }));

// ==========================================
// TASO 2: ISOT SABOTAASIT (50 Kpl - Mekaniikkatageilla)
// ==========================================
const majorBases = [
    { n: "Heikompi käsi (Avaus)", d: "Avausheitto tiiltä on heitettävä heikommalla kädellä.", diff: 3 },
    { n: "Rolleri-pakko", d: "Seuraavan heiton on osuttava maahan ja rullattava eteenpäin vähintään 10m.", diff: 3 },
    { n: "Upsi / Tomahawk", d: "Seuraava heitto on suoritettava pystyheitolla (Upsi/Tomahawk/Thumber).", diff: 2 },
    { n: "Turbo-putti", d: "Seuraava putti on suoritettava sormilla kiekon alta työntäen (Turbo).", diff: 2 },
    { n: "Scooberi", d: "Suorita lähestymisheitto ylösalaisella scuuberi-tyylillä.", diff: 3 },
    { n: "Vain 1 kiekko (Väylä)", d: "Kohde joutuu pelaamaan tämän väylän loppuun asti vain yhdellä valitsemallasi kiekolla.", diff: 2 },
    { n: "Silmät kiinni putti", d: "Kaikki alle 10 metrin putit on suoritettava silmät tiukasti kiinni.", diff: 3 },
    { n: "Vastakierre", d: "Kiekon on lähdettävä kädestä siten, että se pyörii väärään suuntaan (esim. rysty ilman rannetta).", diff: 3 },
    { n: "Kämmen-rolleri", d: "Seuraava heitto on suoritettava kämmen-rollerina (fore-roller).", diff: 3 },
    { n: "Draiveriputti", d: "Kaikki putit tällä väylällä on suoritettava nopeimmalla pituusdraiverilla.", diff: 1 },
    { n: "Istualtaan heitto", d: "Seuraava heitto on pakko heittää maassa istuen (pylly kiinni maassa).", diff: 3 },
    { n: "Aliheitto", d: "Heitto on suoritettava roikkuvana alakauttaheilautuksena.", diff: 3 },
    { n: "Väärä jalka tukena", d: "Tukijalkana markkerin takana on käytettävä väärää jalkaa.", diff: 2 },
    { n: "Kiekon pakkovalinta", d: "Valitse kohteen bägistä 1 kiekko, jolla hänen on pakko suorittaa avaus.", diff: 2 },
    // Automaatio-sabot
    { n: "Iso Rangaistus", d: "Lisää automaattisesti +2 heittoa kohteen väylätulokseen.", diff: 2, mech: "score_+2" },
    { n: "Tuplabogey-Kirous", d: "Lisää automaattisesti +2 heittoa kohteen väylätulokseen.", diff: 2, mech: "score_+2" },
    { n: "Katastrofi", d: "Lisää automaattisesti +2 heittoa kohteen väylätulokseen.", diff: 2, mech: "score_+2" },
    { n: "Surkea tuuri", d: "Lisää automaattisesti +2 heittoa kohteen väylätulokseen.", diff: 2, mech: "score_+2" },
    { n: "Bogey-Pakko", d: "Kohteen tulokseksi merkitään automaattisesti Bogey (+1 yli Parin), ellei hän heitä vielä huonommin.", diff: 3, mech: "force_bogey" },
    { n: "Voiton Eväys", d: "Kohde ei saa väylävoiton pisteitä, vaikka voittaisi.", diff: 2, mech: "deny_win" },
    { n: "Tehtävän Eväys", d: "Kohde ei saa väylätehtävän pisteitä, vaikka suorittaisi sen.", diff: 2, mech: "deny_task" },
    // Lisää fysiikkaa
    { n: "Sokkoavaus", d: "Avausheitto tiiltä silmät kiinni. Turvamies ohjeistaa suunnan!", diff: 3 },
    { n: "Peilikuva", d: "Kohteen on matkittava edellisen pelaajan heittotyyliä (kämmen/rysty) tismalleen.", diff: 2 },
    { n: "Pizza-grippi", d: "Kiekosta pidetään molemmin käsin kiinni reunoista (kuin pitsalaatikosta) ja heitetään alakautta.", diff: 3 },
    { n: "Pakkopudotus", d: "Jos väylällä on OB, pelaajan on pakko tähdätä vaarallisesti sen lähettyville.", diff: 2 },
    { n: "Ketjuviha", d: "Kiekko on pakko upottaa koriaan täysin pehmeästi. Jos rämähtää, +1 rangaistus.", diff: 1 },
    { n: "Kiekkotorni", d: "Aseta kiekon päälle toinen kiekko. Heitä alimmaista niin että ylin vain putoaa maahan.", diff: 3 },
    { n: "Kämmenpakko koko väylä", d: "Kohde joutuu pelaamaan koko väylän pelkillä kämmenheitoilla.", diff: 3 },
    { n: "Rystypakko koko väylä", d: "Kohde joutuu pelaamaan koko väylän pelkillä rystyheitoilla.", diff: 3 },
    { n: "Midari-putti", d: "Kaikki putit tällä väylällä on pakko suorittaa midarilla.", diff: 1 }
];
while(majorBases.length < 50) { majorBases.push({ n: "Tekniikkakirous", d: "Kohteen on heitettävä seuraava heitto vastakkaisella kädellä ja pystyheittona.", diff: 3, mech: null }); }
majorBases.slice(0, 50).forEach((base, i) => {
    let diffStars = "⭐".repeat(base.diff);
    let selatysText = `<br><br><span style="color:#ef4444; font-weight:900; font-size:1.15em;">🔥 SELÄTYSMAHDOLLISUUS:</span> Tee Par tai parempi tulos tästä rangaistuksesta huolimatta!`;
    window.allCards.push({ id: "major_" + i, n: base.n, d: `[Vaikeus: ${diffStars}] ${base.d}${selatysText}`, tier: "normal", type: "major_sabotage", diff: base.diff, mech: base.mech || null });
});

// ==========================================
// TASO 1: PERUS HELPOTUKSET (70 Kpl - Automaatiotageilla)
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
    { n: "Tuulen tyven", d: "Vähennä automaattisesti 1 heitto väylätuloksestasi.", mech: "score_-1" },
    { n: "Kiekkolöytö", d: "Vähennä automaattisesti 1 heitto väylätuloksestasi.", mech: "score_-1" },
    { n: "Tuplavoitto", d: "Jos voitat tämän väylän, saat x2 voittopisteet automaattisesti!", mech: "double_win" },
    { n: "Tuplatehtävä", d: "Jos voitat väylätehtävän, saat x2 rahat automaattisesti.", mech: "double_task" },
    { n: "Pankkiiri (+2P)", d: "Saat automaattisesti +2 P pelirahaa kassaan.", mech: "money_+2" },
    { n: "Korttisade", d: "Nostat automaattisesti 2 uutta korttia tämän väylän lopussa.", mech: "draw_2" },
    { n: "Lisänosto", d: "Nostat automaattisesti 1 uuden kortin tämän väylän lopussa.", mech: "draw_1" },
    { n: "Par-Varmistus", d: "Tuloskorttiisi merkitään automaattisesti enintään PAR (Vaikka heittäisit 10).", mech: "force_par" },
    // Fysiikkabuffit
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
while(buffBases.length < 70) { 
    buffBases.push({ n: "Lisävirta", d: "Vähennä automaattisesti 1 heitto tuloksestasi.", mech: "score_-1" }); 
    buffBases.push({ n: "Kassan kasvu", d: "Saat automaattisesti +1 P pelirahaa.", mech: "money_+1" });
    buffBases.push({ n: "Mulligan", d: "Voit uusia heittosi fyysisesti.", mech: null });
}
buffBases.slice(0, 70).forEach((base, i) => window.allCards.push({ id: "buff_" + i, n: base.n, d: base.d, tier: "normal", type: "buff", mech: base.mech || null }));

// ==========================================
// TASO 3: KAUPAN MONSTERIKORTIT (30 Kpl)
// ==========================================
const monsterBases = [
    { n: "Veromätky", d: "KAIKKI vastustajat menettävät passiivisen tulonsa tältä väylältä automaattisesti.", type: "major_sabotage", price: 20, aoe: true, mech: "deny_passive" },
    { n: "Ukkosmyrsky", d: "KAIKKI vastustajat saavat automaattisesti +1 heittoa tulokseensa.", type: "major_sabotage", price: 30, aoe: true, mech: "score_+1" },
    { n: "Köyhyyskirous", d: "Kohde ei saa ollenkaan passiivista tuloa tältä väylältä automaattisesti.", type: "major_sabotage", price: 12, mech: "deny_passive" },
    { n: "Palkkion eväys", d: "Kohde ei saa väylävoiton pisteitä automaattisesti, vaikka voittaisi.", type: "major_sabotage", price: 15, mech: "deny_win" },
    { n: "Sakkoryöppy", d: "Kohde saa automaattisesti +2 heittoa tulokseensa.", type: "major_sabotage", price: 25, mech: "score_+2" },
    { n: "Korttikato", d: "Kohde ei saa nostaa uusia kortteja tämän väylän lopussa automaattisesti.", type: "major_sabotage", price: 18, mech: "deny_draw" },
    { n: "Pankin Tuki", d: "Saat pankista välittömästi uuden rahoituksen (+5 P automaattisesti).", type: "buff", price: 12, mech: "money_+5" }, 
    { n: "Hole-in-one Taika", d: "Vähennä automaattisesti 2 heittoa tuloksestasi.", type: "buff", price: 35, mech: "score_-2" },
    { n: "Tuplaus", d: "Saat väylävoiton pisteet x2 automaattisesti.", type: "buff", price: 20, mech: "double_win" },
    { n: "Jumal-Kumous", d: "Peruuta MIKÄ TAHANSA sabotaasi automaattisesti.", type: "buff", price: 18, mech: "cancel_all" },
    { n: "Täystuho", d: "Määrää yksi Iso Sabotaasi (Taso 2) täysin itse keksimilläsi fysiikkasäännöillä kohteelle.", type: "major_sabotage", price: 20 },
    { n: "OB-Magneetti", d: "Jos kohde menee OB:lle, hän saa +2 rangaistusheittoa normaalin +1 sijaan.", type: "major_sabotage", price: 18 },
    { n: "Kiekkolukko", d: "Kiellä kohdetta käyttämästä hänen luottodraiveriaan koko loppukierroksen ajan.", type: "major_sabotage", price: 25 },
    { n: "Laser-Tähtäin", d: "Voit siirtää mitä tahansa alle 20m puttiasi 5 metriä lähemmäs koria.", type: "buff", price: 15 },
    { n: "Magneettikori", d: "Seuraava putti alle 15m lasketaan aina sisään menneeksi, osuipahan se tai ei.", type: "buff", price: 20 }
];
while(monsterBases.length < 30) {
    monsterBases.push({ n: "Veromätky 2", d: "KAIKKI vastustajat menettävät passiivisen tulonsa.", type: "major_sabotage", price: 20, aoe: true, mech: "deny_passive" });
    monsterBases.push({ n: "Huippuvire", d: "Vähennä automaattisesti 1 heitto tuloksestasi.", type: "buff", price: 15, mech: "score_-1" });
}
monsterBases.slice(0, 30).forEach((base, i) => window.allCards.push({ id: "monster_" + i, n: `${base.n}`, d: base.d, tier: "premium", type: base.type, price: base.price, aoe: base.aoe || false, mech: base.mech || null }));

// ==========================================
// VÄYLÄSÄÄNNÖT (150 Kpl)
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
    { type: "bounty", n: "Korijalan halaaja", d: "Kenen kiekko nojaa lähimpänä tolppaan, voittaa tehtävän." }
];

// Generoidaan loput säännöt 150 asti variaatioilla
while(window.holeRules.length < 150) {
    window.holeRules.push({ type: "rule", n: "Tekniikkahaaste", d: "Kaikkien on heitettävä avaus paikaltaan ilman vauhtia." });
    window.holeRules.push({ type: "bounty", n: "Tarkkuus", d: "Lähimmäksi koria avauksella (CTP) voittaa tehtävän." });
    window.holeRules.push({ type: "rule", n: "Vain alivakaat", d: "Väylällä saa heittää vain alivakailla kiekoilla." });
    window.holeRules.push({ type: "bounty", n: "Pisin draivi", d: "Pisimmälle avannut pelaaja voittaa tehtävän." });
}
// Leikataan tarkalleen 150
window.holeRules = window.holeRules.slice(0, 150);
