const xlsx = require("xlsx");
const https = require('https');
const mariadb = require('mariadb');
const uuid = require('short-uuid');
const secrets = require('../api/secrets.json');

(async () => {
  let ENV = process.env.NODE_ENV ? 'PROD' : 'DEV';
  let families = {};
  let promises = [];
  let total = 0;

  const conn = await mariadb.createConnection({
    host: secrets.DB[ENV].HOST,
    user: secrets.DB[ENV].USER,
    password: secrets.DB[ENV].PASS
  });

  const request = https.get('https://worldbirdnames.org/Multiling%20IOC%2012.1c.xlsx', (response) => {
    var body = [];

    response.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', async () => {
      var workbook = xlsx.read(Buffer.concat(body), {
        type: "buffer"
      });

      var data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

      // ioc : ebird
      var translations = {
        'Zanda funerea': 'Calyptorhynchus funereus',
        'Melaenornis microrhynchus': 'Bradornis microrhynchus',
        'Pogonotriccus lanyoni': 'Phylloscartes lanyoni',
        'Aethomyias nigrorufus': 'Crateroscelis nigrorufa',
        'Afrotis afra': 'Eupodotis afra',
        'Bubo blakistoni': 'Ketupa blakistoni',
        'Devioeca papuana': 'Microeca papuana',
        'Pogonotriccus chapmani': 'Phylloscartes chapmani',
        'Kempiella griseoceps': 'Microeca griseoceps',
        'Cryptomicroeca flaviventris': 'Eopsaltria flaviventris',
        'Monticola semirufus': 'Thamnolaea semirufa',
        'Rallicula leucospila': 'Rallina leucospila',
        'Zanda baudinii': 'Calyptorhynchus baudinii',
        'Afrotis afraoides': 'Eupodotis afraoides',
        'Pampusana jobiensis': 'Alopecoenas jobiensis',
        'Pogonotriccus venezuelanus': 'Phylloscartes venezuelanus',
        'Pogonotriccus poecilotis': 'Phylloscartes poecilotis',
        'Sugomel lombokius': 'Lichmera lombokia',
        'Hypsipetes longirostris': 'Alophoixus longirostris',
        'Chlorophoneus sulfureopectus': 'Telophorus sulfureopectus',
        'Pogonotriccus orbitalis': 'Phylloscartes orbitalis',
        'Melionyx fuscus': 'Melidectes fuscus',
        'Hoploxypterus cayanus': 'Vanellus cayanus',
        'Chlorophoneus bocagei': 'Telophorus bocagei',
        'Menelikornis ruspolii': 'Tauraco ruspolii',
        'Nesoenas picturatus': 'Streptopelia picturata',
        'Aethomyias arfakianus': 'Sericornis arfakianus',
        'Ixodia cyaniventris': 'Rubigula cyaniventris',
        'Rallicula rubra': 'Rallina rubra',
        'Rallicula mayri': 'Rallina mayri',
        'Rallicula forbesi': 'Rallina forbesi',
        'Ptilinopus gularis': 'Ptilinopus epius',
        'Pseudobulweria rupinarum': 'Pterodroma rupinarum',
        'Aegithalos exilis': 'Psaltria exilis',
        'Gennaeodryas placens': 'Poecilodryas placens',
        'Pogonotriccus ophthalmicus': 'Phylloscartes ophthalmicus',
        'Pogonotriccus eximius': 'Phylloscartes eximius',
        'Athene jacquinoti': 'Ninox jacquinoti',
        'Stizorhina fraseri': 'Neocossyphus fraseri',
        'Stizorhina finschi': 'Neocossyphus finschi',
        'Melionyx princeps': 'Melidectes princeps',
        'Melionyx nouhuysi': 'Melidectes nouhuysi',
        'Psittacula bensoni': 'Lophopsittacus bensoni',
        'Lichmera indistincta': 'Lichmera limbata',
        'Hydrobates macrodactylus': 'Hydrobates macrodactyla',
        'Glycifohia notabilis': 'Gliciphila notabilis',
        'Hypotaenidia sylvestris': 'Gallirallus sylvestris',
        'Cabalus modestus': 'Gallirallus modestus',
        'Hypotaenidia insignis': 'Gallirallus insignis',
        'Myioparus plumbeus': 'Fraseria plumbea',
        'Myioparus griseigularis': 'Fraseria griseigularis',
        'Lophotis ruficrista': 'Eupodotis ruficrista',
        'Circaetus spectabilis': 'Dryotriorchis spectabilis',
        'Crinifer concolor': 'Corythaixoides concolor',
        'Coloeus monedula': 'Corvus monedula',
        'Ceblepyris caesius': 'Coracina caesia',
        'Cincloramphus mariae': 'Cincloramphus mariei',
        'Dendropicos spodocephalus': 'Chloropicus spodocephalus',
        'Dendropicos goertae': 'Chloropicus goertae',
        'Dendropicos elachus': 'Chloropicus elachus',
        'Zanda latirostris': 'Calyptorhynchus latirostris',
        'Melaenornis mariquensis': 'Bradornis mariquensis',
        'Geobiastes squamiger': 'Brachypteracias squamiger',
        'Myiothlypis griseiceps': 'Basileuterus griseiceps',
        'Pampusana stairi': 'Alopecoenas stairi',
        'Pampusana rubescens': 'Alopecoenas rubescens',
        'Pampusana kubaryi': 'Alopecoenas kubaryi',
        'Sicalis uropigyalis': 'Sicalis uropygialis',
        'Hypsipetes affinis': 'Alophoixus affinis',
        'Hypsipetes mysticalis': 'Alophoixus mystacalis',
        'Rhamphocharis crassirostris': 'Melanocharis crassirostris',
        'Origma murina': 'Crateroscelis murina',
        'Origma robusta': 'Crateroscelis robusta',
        'Diphyllodes magnificus': 'Cicinnurus magnificus',
        'Diphyllodes respublica': 'Cicinnurus respublica',
        'Paradisornis rudolphi': 'Paradisaea rudolphi'
      };

      // ioc : ebird
      var subspecies = {
        'Ploceus holoxanthus': 'afgwea1',
        'Saxicola sibilla': 'afrsto1',
        'Apus sladeniae': 'afrswi1',
        'Otus feae': 'afsowl1',
        'Heliangelus clarisse': 'amtsun1',
        'Heliangelus spencei': 'amtsun1',
        'Irena tweeddalii': 'asfblu1',
        'Gracupica floweri': 'aspsta2',
        'Gracupica jalla': 'aspsta2',
        'Anthus australis': 'auspip1',
        'Tanygnathus everetti': 'azrpar1',
        'Prinia melanops': 'banpri1',
        'Spermestes nigriceps': 'bawman1',
        'Merops lafresnayii': 'bbbeat2',
        'Zosterops chrysolaemus': 'bfweye1',
        'Terpsiphone smithii': 'bhpfly1',
        'Accipiter chilensis': 'bichaw1',
        'Thalassarche impavida': 'bkbalb',
        'Aegithalos bonvaloti': 'bkbtit3',
        'Aegithalos sharpei': 'bkbtit3',
        'Pterodroma caribbaea': 'bkcpet',
        'Himantopus melanurus': 'bknsti',
        'Milvus aegyptius': 'blakit1',
        'Platysmurus aterrimus': 'blamag1',
        'Coracopsis sibilans': 'blapar1',
        'Lalage leucoptera': 'blbtri1',
        'Pellorneum capistratoides': 'blcbab1',
        'Pellorneum nigrocapitatum': 'blcbab1',
        'Sterrhoptilus affinis': 'blcbab3',
        'Kleinothraupis auricularis': 'blchem1',
        'Sphenopsis ochracea': 'blehem1',
        'Sphenopsis piurae': 'blehem1',
        'Emberiza personata': 'blfbun1',
        'Dacnis egregia': 'blfdac1',
        'Psittinus abbotti': 'blrpar1',
        'Amaurospiza aequatorialis': 'blusee1',
        'Chloropsis cochinchinensis': 'blwlea1',
        'Terpsiphone floris': 'blypaf1',
        'Sheppardia poensis': 'bocaka1',
        'Ocreatus addae': 'bortai1',
        'Ocreatus peruanus': 'bortai1',
        'Riccordia elegans': 'braeme1',
        'Tyto furcata': 'brnowl',
        'Tyto javanica': 'brnowl',
        'Molothrus armenti': 'brocow',
        'Leucocarbo stewarti': 'brosha1',
        'Cacomantis sepulcralis': 'brucuc1',
        'Pyrocephalus dubius': 'brufly1',
        'Pseudocolaptes johnsoni': 'buftuf1',
        'Phyllastrephus placidus': 'cabgre1',
        'Zosterops crookshanki': 'capwhe3',
        'Bubulcus coromandus': 'categr',
        'Pomatorhinus bornensis': 'cbsbab1',
        'Muscicapa itombwensis': 'chafly1',
        'Ramphastos citreolaemus': 'chbtou1',
        'Arborophila diversa': 'chhpar1',
        'Cyornis ocularis': 'chtjuf1',
        'Cyornis ruficrissa': 'chtjuf1',
        'Cyanoderma bicolor': 'chwbab1',
        'Edolisoma insperatum': 'cicada1',
        'Edolisoma monacha': 'cicada1',
        'Edolisoma nesiotis': 'cicada1',
        'Edolisoma remotum': 'cicada1',
        'Delichon lagopodum': 'cohmar1',
        'Pteroglossus erythropygius': 'colara1',
        'Pteroglossus sanguineus': 'colara1',
        'Melanopareia bitorquata': 'colcre1',
        'Pycnonotus dodsoni': 'combul2',
        'Pycnonotus somaliensis': 'combul2',
        'Pycnonotus tricolor': 'combul2',
        'Calonectris borealis': 'corshe',
        'Asthenes arequipae': 'crbcan1',
        'Asthenes huancavelicae': 'crbcan1',
        'Paramythia olivacea': 'creber1',
        'Colinus leucopogon': 'crebob1',
        'Silvicultrix spodionota': 'crocht1',
        'Zosterops dehaani': 'crtwhe1',
        'Rhodopechys alienus': 'crwfin2',
        'Trachyphonus usambiro': 'darbar1',
        'Pachycephala johni': 'drawhi1',
        'Myiagra cervinicolor': 'dulfly1',
        'Myiagra eichhorni': 'dulfly1',
        'Myzomela rubrobrunnea': 'dusmyz1',
        'Myzomela rubrotincta': 'dusmyz1',
        'Myzomela simplex': 'dusmyz1',
        'Arizelocichla kikuyuensis': 'easmog1',
        'Streptopelia xanthocycla': 'eucdov',
        'Sitta arctica': 'eurnut2',
        'Estrilda ochrogaster': 'fabwax1',
        'Gerygone citrina': 'fatger1',
        'Pterodroma deserta': 'feapet1',
        'Pycnonotus leucops': 'flabul1',
        'Dicaeum kampalili': 'flcflo1',
        'Cyornis stresemanni': 'flojuf1',
        'Ramphocelus icteronotus': 'flrtan1',
        'Passerella megarhyncha': 'foxspa',
        'Passerella schistacea': 'foxspa',
        'Passerella unalaschcensis': 'foxspa',
        'Anas carolinensis': 'gnwtea',
        'Myiothlypis chlorophrys': 'gobwar2',
        'Zimmerius minimus': 'goftyr1',
        'Melanerpes santacruzi': 'gofwoo',
        'Colaptes aeruginosus': 'goowoo1',
        'Antrostomus ekmani': 'granig1',
        'Pachyramphus xanthogenys': 'grbbec1',
        'Camaroptera brevicaudata': 'grbcam1',
        'Merops cyanophrys': 'grbeat1',
        'Merops viridissimus': 'grbeat1',
        'Phalacrocorax lucidus': 'grecor',
        'Chrysocolaptes socialis': 'grefla1',
        'Psittacus timneh': 'grepar',
        'Anthreptes tephrolaemus': 'gresun1',
        'Leucolia wagneri': 'grfhum1',
        'Bubo magellanicus': 'grhowl',
        'Cyanocorax yncas': 'grnjay',
        'Psittacara rubritorquis': 'grnpar',
        'Pezoporus flaviventris': 'gropar1',
        'Pampa pampa': 'grpfin1',
        'Cincloramphus whitneyi': 'guathi1',
        'Gelochelidon macrotarsa': 'gubter1',
        'Picus dedemi': 'gyfwoo1',
        'Ptilinopus chrysogaster': 'gygfrd1',
        'Leptotila battyi': 'gyhdov1',
        'Heteromyias armiti': 'gyhrob1',
        'Zosterops hamlini': 'gytwhe1',
        'Zosterops oblitus': 'gytwhe1',
        'Dicrurus palawanensis': 'hacdro1',
        'Philemon novaeguineae': 'helfri1',
        'Philemon yorki': 'helfri1',
        'Piranga hepatica': 'heptan',
        'Piranga lutea': 'heptan',
        'Larus smithsonianus': 'hergul',
        'Larus vegae': 'hergul',
        'Chondrohierax wilsonii': 'hobkit',
        'Upupa africana': 'hoopoe',
        'Pteroglossus mariae': 'ivbara1',
        'Corvus culminatus': 'labcro1',
        'Corvus levaillantii': 'labcro1',
        'Parotia helenae': 'lawpar1',
        'Lamprotornis elisabeth': 'lbesta1',
        'Bleda ugandae': 'lesbri2',
        'Curruca althaea': 'leswhi4',
        'Curruca minula': 'leswhi4',
        'Cittura sanghirensis': 'lilkin1',
        'Egretta dimorpha': 'litegr',
        'Tachybaptus tricolor': 'litgre1',
        'Carpodacus lepidus': 'lotros1',
        'Amblyornis germanus': 'macbow2',
        'Vireo approximans': 'manvir1',
        'Geothlypis auricularis': 'masyel1',
        'Geothlypis velata': 'masyel1',
        'Cinnyris whytei': 'mdcsun3',
        'Amazona guatemalae': 'meapar',
        'Aplonis circumscripta': 'metsta1',
        'Atlapetes meridae': 'mobfin1',
        'Thamnolaea coronata': 'moccha1',
        'Phaeomyias tumbezana': 'moctyr1',
        'Ducula cuprea': 'moipig1',
        'Myiopsitta luchsi': 'monpar',
        'Scleroptila elgonensis': 'moofra2',
        'Otus tempestatis': 'mosowl1',
        'Cacicus leucoramphus': 'moucac1',
        'Chrysocorythus mindanensis': 'mouser1',
        'Phylloscopus nigrorum': 'mouwar2',
        'Oenanthe halophila': 'mouwhe2',
        'Oenanthe warriae': 'mouwhe2',
        'Scepomycter rubehoensis': 'mrmwar1',
        'Glaucidium californicum': 'nopowl',
        'Glaucidium cobanense': 'nopowl',
        'Glaucidium hoskinsii': 'nopowl',
        'Aulacorhynchus caeruleogularis': 'noremt1',
        'Aulacorhynchus wagleri': 'noremt1',
        'Rhipidura kordensis': 'norfan1',
        'Oenanthe seebohmi': 'norwhe',
        'Xiphorhynchus chunchotambo': 'ocewoo1',
        'Geothlypis chiriquensis': 'olcyel1',
        'Chlorothraupis frenata': 'olitan1',
        'Chloropsis lazulina': 'orblea1',
        'Icterus fuertesi': 'orcori',
        'Chloris kittlitzi': 'origre',
        'Pandion cristatus': 'osprey',
        'Illadopsis distans': 'pabill1',
        'Petroica polymorpha': 'pacrob1',
        'Turnix novaecaledoniae': 'paibut',
        'Pyrrhura emma': 'paipar1',
        'Corvus minutus': 'palcro2',
        'Furnarius cinnamomeus': 'palhor2',
        'Furnarius longirostris': 'palhor2',
        'Charmosyna stellae': 'paplor1',
        'Lycocorax obiensis': 'parcro1',
        'Zimmerius flavidifrons': 'pertyr1',
        'Centropus spilopterus': 'phecou2',
        'Trichoglossus rosenbergii': 'railor4',
        'Myzomela longirostris': 'recmyz1',
        'Myzomela erythrina': 'redmyz1',
        'Cyanoramphus erythrotis': 'refpar4',
        'Cyanoramphus subflavescens': 'refpar4',
        'Crithagra striatipectus': 'reisee1',
        'Amazona diadema': 'relpar',
        'Cecropis domicella': 'rerswa1',
        'Phasianus versicolor': 'rinphe',
        'Ptyonoprogne obsoleta': 'rocmar2',
        'Cisticola emini': 'rolcis2',
        'Phyllomyias zeledoni': 'roltyr1',
        'Diomedea sanfordi': 'royalb1',
        'Onychorhynchus mexicanus': 'royfly1',
        'Onychorhynchus occidentalis': 'royfly1',
        'Onychorhynchus swainsoni': 'royfly1',
        'Melaniparus pallidiventris': 'rubtit3',
        'Phacellodomus inornatus': 'ruftho1',
        'Campylorhynchus capistratus': 'runwre1',
        'Campylorhynchus humilis': 'runwre1',
        'Hypnelus bicinctus': 'rutpuf1',
        'Larvivora namiyei': 'ryurob1',
        'Thalasseus acuflavidus': 'santer1',
        'Ochthoeca nigrita': 'sbctyr1',
        'Ochthoeca thoracica': 'sbctyr1',
        'Picumnus nigropunctatus': 'scapic1',
        'Capito fitzpatricki': 'scbbar2',
        'Psittacara frontatus': 'scfpar1',
        'Cacicus uropygialis': 'scrcac1',
        'Anthus brevirostris': 'shbpip1',
        'Arizelocichla kakamegae': 'shegre1',
        'Cinnyris hofmanni': 'shesun2',
        'Cinnyris hellmayri': 'shisun3',
        'Laniisoma buckleyi': 'shlcot1',
        'Accipiter chionogaster': 'shshaw',
        'Accipiter erythronemius': 'shshaw',
        'Accipiter ventralis': 'shshaw',
        'Batis reichenowi': 'shtbat1',
        'Corvus pusillus': 'slbcro1',
        'Corvus samarensis': 'slbcro1',
        'Athene granti': 'solhao1',
        'Athene malaitae': 'solhao1',
        'Athene roseoaxillaris': 'solhao1',
        'Tyto multipunctata': 'sooowl1',
        'Aulacorhynchus atrogularis': 'souemt1',
        'Cinnyris abbotti': 'sousun2',
        'Nystalus striatipectus': 'spbpuf1',
        'Symposiachrus bimaculatus': 'spemon1',
        'Symposiachrus melanopterus': 'spemon1',
        'Pionus seniloides': 'spfpar1',
        'Ducula geelvinkiana': 'spipig1',
        'Muscicapa tyrrhenica': 'spofly1',
        'Alaudala athensis': 'sstlar1',
        'Arizelocichla olivaceiceps': 'stcgre1',
        'Arizelocichla striifacies': 'stcgre1',
        'Trochilus scitulus': 'stream1',
        'Butorides sundevalli': 'strher',
        'Automolus virgatus': 'strwoo1',
        'Cyornis djampeanus': 'subfly1',
        'Myzomela batjanensis': 'sulmyz1',
        'Ixos sumatranus': 'sunbul2',
        'Myiomela sumatrana': 'sunrob1',
        'Otus mendeni': 'susowl1',
        'Phibalura boliviana': 'swtcot1',
        'Dicaeum aeruginosum': 'thbflo1',
        'Basileuterus punctipectus': 'thswar1',
        'Phylloscopus floresianus': 'tilwar2',
        'Oriolus finschi': 'timori1',
        'Atlapetes crassus': 'trbfin1',
        'Contopus punensis': 'tropew1',
        'Campethera taeniolaema': 'tulwoo1',
        'Myiothlypis roraimae': 'twbwar1',
        'Xenoperdix obscuratus': 'udzpar1',
        'Hylexetastes brigidai': 'uniwoo1',
        'Pyrocephalus obscurus': 'verfly',
        'Megascops vermiculatus': 'vesowl',
        'Phoeniculus granti': 'viowoo1',
        'Rallus aequatorialis': 'virrai',
        'Niltava oatesi': 'vivnil1',
        'Cisticola distinctus': 'waicis1',
        'Diomedea amsterdamensis': 'wanalb',
        'Diomedea antipodensis': 'wanalb',
        'Diomedea dabbenena': 'wanalb',
        'Psophodes leucogaster': 'weswhi1',
        'Centropus burchellii': 'whbcou1',
        'Sericornis maculatus': 'whbscr1',
        'Elaenia chilensis': 'whcela1',
        'Enicurus borneensis': 'whcfor1',
        'Formicivora intermedia': 'whfant1',
        'Myrmotherula luctuosa': 'whfant2',
        'Treron permagnus': 'whgpig1',
        'Numenius hudsonicus': 'whimbr',
        'Copsychus stricklandii': 'whrsha',
        'Turdus daguae': 'whtrob1',
        'Lampornis cinereicauda': 'wtmgem1',
        'Ptilinopus speciosus': 'ybfdov1',
        'Apalis flavocincta': 'yebapa1',
        'Atlapetes nigrifrons': 'yebbrf1',
        'Tolmomyias viridiceps': 'yebfly1',
        'Amazona tresmariae': 'yehpar',
        'Hypsipetes catarmanensis': 'yelbul1',
        'Setophaga aestiva': 'yelwar',
        'Tolmomyias flavotectus': 'yemfly1',
        'Thalassarche carteri': 'yenalb',
        'Pogoniulus makawai': 'yertin1',
        'Setophaga auduboni': 'yerwar',
        'Setophaga goldmani': 'yerwar',
        'Phyllastrephus alfredi': 'yesbul1',
        'Taeniopygia castanotis': 'zebfin2',
        'Phylloscopus sarasinorum': 'sulwar1'
      };

      var results = await conn.query('SELECT code, commonName, scientificName FROM squawkdata.species');
      var promises = [];

      for (let i = 0, len = data.length; i < len; i++) {
        let row = data[i];
        let scientificName = row['IOC_12.1'];

        let result = results.find((result) => result.commonName == row['English'] || result.scientificName == (translations[scientificName] || scientificName));

        console.log(row['Seq.'], '/', len);

        families[row['Family']] = row['Order'].slice(0, 1) + row['Order'].slice(1).toLowerCase();

        if (!result) {
          promises.push(conn.query('INSERT INTO squawkdata.species VALUES (?, ?, ?, ?, ?)', [scientificName, (subspecies[scientificName] || 'AAAA') + '-' + row['Seq.'], row['Family'], row['English'], scientificName]));

          if (subspecies[scientificName]) {
            promises.push(conn.query('UPDATE squawkdata.variants SET species = ?, subspecies = "" WHERE species = ? AND subspecies = ?', [scientificName, subspecies[scientificName], scientificName.split(' ').pop()]));
            promises.push(conn.query('INSERT INTO squawkdata.species_adjectives SELECT ?, adjective FROM squawkdata.species_adjectives WHERE species = ?', [scientificName, subspecies[scientificName]]));
            promises.push(conn.query('INSERT INTO squawkdata.wishlist SELECT `member`, ?, intensity, NOW() FROM squawkdata.wishlist WHERE species = ?', [scientificName, subspecies[scientificName]]));
          }
        } else {
          promises.push(conn.query('UPDATE squawkdata.species SET id = ?, family = ?, commonName = ? WHERE code = ?', [scientificName, row['Family'], row['English'], result.code]));
        }

        if (promises.length >= 500) {
          console.log('flush promises');
          await Promise.all(promises);

          promises = [];
        }
      }

      await Promise.all(promises);

      for (let [family, order] of Object.entries(families)) {
        await conn.query('INSERT INTO squawkdata.taxonomy VALUES (?, ?, "family", ?) ON DUPLICATE KEY UPDATE parent = ?', [family, family, order, order]);
        await conn.query('INSERT INTO squawkdata.taxonomy VALUES (?, ?, "order", NULL) ON DUPLICATE KEY UPDATE parent = parent', [order, order]);
      }

      promises = [];

      for (let [ioc, ebird] of Object.entries(subspecies)) {
        let species = await conn.query('SELECT species.id, species.code, MAX(variants.id) AS variant FROM squawkdata.species JOIN squawkdata.variants ON (species.id = variants.species) WHERE species.code LIKE ? GROUP BY species.code', [`${ebird}%`]);
        let birdypets = await conn.query('SELECT birdypets.member, GROUP_CONCAT(species.code) code FROM squawkdata.birdypets JOIN squawkdata.variants ON (birdypets.variant = variants.id) JOIN squawkdata.species ON (variants.species = species.id) WHERE species.code LIKE ? GROUP BY birdypets.member', [`${ebird}%`]);

        for (let birdypet of birdypets) {
          let codes = birdypet.code.split(',');
          let toAdd = species.filter((specie) => !codes.includes(specie.code));

          for (let add of toAdd) {
            promises.push(await conn.query('INSERT INTO squawkdata.birdypets VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [uuid.generate(), birdypet.member, add.variant, "", "", 0, new Date(), new Date()]));
          }

          if (promises.length >= 500) {
            console.log('flush promises');
            await Promise.all(promises);

            promises = [];
          }
        }
      }

      await Promise.all(promises);

      // ebird : ioc
      var subspecies = {
        'Ceyx rufidorsa': 'Ceyx erithaca',
        'Lonchura nigerrima': 'Lonchura hunsteini',
        'Caprimulgus ruwenzorii': 'Caprimulgus poliocephalus',
        'Lichmera limbata': 'Lichmera indistincta',
        'Megapodius forsteni': 'Megapodius freycinet',
        'Zoothera atrigena': 'Zoothera talaseae',
        'Myadestes woahensis': 'Myadestes lanaiensis',
        'Phylloscopus occisinensis': 'Phylloscopus affinis',
        'Zosterops anjuanensis': 'Zosterops maderaspatanus',
        'Aegotheles archboldi': 'Aegotheles albertisi',
        'Myzomela nigriventris': 'Myzomela cardinalis',
        'Glaucidium castaneum': 'Glaucidium capense',
        'Prunella fagani': 'Prunella ocularis',
        'Ceyx uropygialis': 'Ceyx lepidus',
        'Ceyx pallidus': 'Ceyx meeki',
        'Alophoixus aureus': 'Hypsipetes longirostris',
        'Aethopyga tibolii': 'Aethopyga boltoni',
        'Erythropitta splendida': 'Erythropitta novaehibernicae',
        'Zosterops comorensis': 'Zosterops maderaspatanus',
        'Tyto almae': 'Tyto sororcula',
        'Formicivora littoralis': 'Formicivora serrana',
        'Erythropitta gazellae': 'Erythropitta novaehibernicae',
        'Alophoixus platenae': 'Hypsipetes longirostris',
        'Alophoixus mystacalis': 'Hypsipetes longirostris',
        'Alophoixus lucasi': 'Hypsipetes longirostris',
        'Alophoixus chloris': 'Hypsipetes longirostris',
        'Alophoixus affinis': 'Hypsipetes longirostris'
      };

      for (let [ebird, ioc] of Object.entries(subspecies)) {
        await conn.query('UPDATE squawkdata.variants SET species = ?, subspecies = ? WHERE species = (SELECT code FROM squawkdata.species WHERE scientificName = ?)', [ioc, ebird.split(' ').pop(), ebird]);
        await conn.query('DELETE FROM squawkdata.species WHERE scientificName = ?', [ebird]);
      }

      let specials = [{
          scientificName: 'Gallus gallus domesticus',
          commonName: 'Chicken',
          family: 'Phasianidae',
          code: 'redjun1'
        },
        {
          scientificName: 'Tribonyx hodgenorum',
          commonName: "Hodgen's Waterhen",
          family: 'Rallidae',
          code: 'hodwat1'

        },
        {
          scientificName: 'Psittacara labati',
          commonName: 'Guadeloupe Parakeet',
          family: 'Psittacidae',
          code: 'guapar2'
        },
        {
          scientificName: 'Porphyrio paepae',
          commonName: 'Marquesas Swamphen',
          family: 'Rallidae',
          code: 'marswa1'
        },
        {
          scientificName: 'Porphyrio kukwiedei',
          commonName: 'New Caledonian Takahe',
          family: 'Rallidae',
          code: 'necgal1'
        },
        {
          scientificName: 'Porphyrio caerulescens',
          commonName: 'Réunion Swamphen',
          family: 'Rallidae',
          code: 'reugal1'
        },
        {
          scientificName: 'Nesoenas duboisi',
          commonName: 'Réunion Pink Pigeon',
          family: 'Columbidae',
          code: 'reupig1'
        },
        {
          scientificName: 'Nesoenas cicur',
          commonName: 'Mauritius Turtle-Dove',
          family: 'Columbidae',
          code: 'mautud1'
        },
        {
          scientificName: 'Foudia delloni',
          commonName: 'Réunion Fody',
          family: 'Ploceidae',
          code: 'reufod1'
        },
        {
          scientificName: 'Eclectus infectus',
          commonName: 'Oceanic Parrot',
          family: 'Psittaculidae',
          code: 'ocepar1'
        },
        {
          scientificName: 'Columba thiriouxi',
          commonName: 'Mauritius Wood-Pigeon',
          family: 'Columbidae',
          code: 'mauwop1'
        },
        {
          scientificName: 'Chenonetta finschi',
          commonName: "Finsch's Duck",
          family: 'Anatidae',
          code: 'finduc1'
        },
        {
          scientificName: 'Aplonis ulietensis',
          commonName: 'Raiatea Starling',
          family: 'Sturnidae',
          code: 'raista2'
        },
        {
          scientificName: 'Amazona violacea',
          commonName: 'Guadeloupe Parrot',
          family: 'Psittacidae',
          code: 'guapar1'
        },
        {
          scientificName: 'Amazona martinicana',
          commonName: 'Martinique Parrot',
          family: 'Psittacidae',
          code: 'marpar1'
        },
        {
          scientificName: 'Alectroenas payandeei',
          commonName: 'Rodrigues Blue-Pigeon',
          family: 'Columbidae',
          code: 'rodblp1'
        }
      ];

      for (let special of specials) {
        await conn.query('INSERT INTO squawkdata.species VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = ?, family = ?, commonName = ?, scientificName = ?', [special.scientificName, special.code, special.family, special.commonName, special.scientificName, special.scientificName, special.family, special.commonName, special.scientificName]);
      }

      await conn.query('UPDATE squawkdata.wishlist SET wishlist.species = (SELECT species.id FROM squawkdata.species WHERE species.code = wishlist.species) WHERE wishlist.species IN (SELECT species.code FROM squawkdata.species)');
      await conn.query('UPDATE squawkdata.variants SET variants.species = (SELECT species.id FROM squawkdata.species WHERE species.code = variants.species) WHERE variants.species IN (SELECT species.code FROM squawkdata.species)');
      await conn.query('UPDATE squawkdata.species_adjectives SET species_adjectives.species = (SELECT species.id FROM squawkdata.species WHERE species.code = species_adjectives.species) WHERE species_adjectives.species IN (SELECT species.code FROM squawkdata.species)');

      console.log('Done!');
      process.exit(0);
    });
  });
})();