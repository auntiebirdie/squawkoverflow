const Bird = require('./bird.js');
const Member = require('./member.js');
const Counters = require('../helpers/counters.js');
const Database = require('../helpers/database.js');
const Redis = require('../helpers/redis.js');

class Variant {
  constructor(id) {
    this.id = id;
  }

  fetch(params = {}) {
    return new Promise(async (resolve, reject) => {

      var result = await Database.getOne('variants', {
        id: this.id
      });

      if (!result) {
        return reject();
      }

      for (let key in result) {
        if (!params.fields || params.fields.includes(key)) {
          this[key] = result[key];
        }
      }

      let bird = null;

      if (!params.bird) {
        bird = new Bird(this.species);

        await bird.fetch({
          include: params.include
        });

        this.bird = bird;
      } else {
        bird = params.bird;
      }

      if (this.source.startsWith('https://birdsoftheworld') || this.source == "n/a") {
        switch (bird.family) {
          case "Acanthisittidae":
          case "Acanthizidae":
          case "Acrocephalidae":
          case "Aegithalidae":
          case "Aegithinidae":
          case "Aegothelidae":
          case "Alaudidae":
          case "Alcedinidae":
          case "Alcidae":
          case "Alcippeidae":
          case "Anatidae":
          case "Anhingidae":
          case "Apodidae":
          case "Apterygidae":
          case "Ardeidae":
          case "Artamidae":
          case "Balaenicipitidae":
          case "Bernieridae":
          case "Bucconidae":
          case "Bucerotidae":
          case "Bucorvidae":
          case "Buphagidae":
          case "Burhinidae":
          case "Cacatuidae":
          case "Calcariidae":
          case "Callaeidae":
          case "Calyptomenidae":
          case "Campephagidae":
          case "Capitonidae":
          case "Caprimulgidae":
          case "Cardinalidae":
          case "Casuariidae":
          case "Cathartidae":
          case "Certhiidae":
          case "Cettiidae":
          case "Chaetopidae":
          case "Charadriidae":
          case "Chloropseidae":
          case "Ciconiidae":
          case "Cisticolidae":
          case "Coliidae":
          case "Columbidae":
          case "Corvidae":
          case "Cotingidae":
          case "Cracidae":
          case "Cuculidae":
          case "Diomedeidae":
          case "Estrildidae":
          case "Falconidae":
          case "Falcunculidae":
          case "Fregatidae":
          case "Fringillidae":
          case "Furnariidae":
          case "Galbulidae":
          case "Grallariidae":
          case "Gruidae":
          case "Haematopodidae":
          case "Hirundinidae":
          case "Hydrobatidae":
          case "Icteridae":
          case "Indicatoridae":
          case "Laniidae":
          case "Laridae":
          case "Leiothrichidae":
          case "Locustellidae":
          case "Lybiidae":
          case "Malaconotidae":
          case "Maluridae":
          case "Meliphagidae":
          case "Megapodiidae":
          case "Meropidae":
          case "Mimidae":
          case "Momotidae":
          case "Monarchidae":
          case "Motacillidae":
          case "Muscicapidae":
          case "Musophagidae":
          case "Nectariniidae":
          case "Oceanitidae":
          case "Odontophoridae":
          case "Oriolidae":
          case "Otididae":
          case "Pachycephalidae":
          case "Paradisaeidae":
          case "Paradoxornithidae":
          case "Paridae":
          case "Parulidae":
          case "Passerellidae":
          case "Passeridae":
          case "Pellorneidae":
          case "Petroicidae":
          case "Phaethontidae":
          case "Phalacrocoracidae":
          case "Phasianidae":
          case "Phylloscopidae":
          case "Picidae":
          case "Pipridae":
          case "Pittidae":
          case "Platysteiridae":
          case "Ploceidae":
          case "Pluvianidae":
          case "Podargidae":
          case "Podicipedidae":
          case "Polioptilidae":
          case "Procellariidae":
          case "Psittacidae":
          case "Psittaculidae":
          case "Pteroclidae":
          case "Ptilonorhynchidae":
          case "Pycnonotidae":
          case "Rallidae":
          case "Ramphastidae":
          case "Rhinocryptidae":
          case "Rhipiduridae":
          case "Sagittariidae":
          case "Sarothruridae":
          case "Scolopacidae":
          case "Scopidae":
          case "Sittidae":
          case "Spheniscidae":
          case "Strigidae":
          case "Sturnidae":
          case "Sylviidae":
          case "Thamnophilidae":
          case "Thraupidae":
          case "Threskiornithidae":
          case "Timaliidae":
          case "Tinamidae":
          case "Tityridae":
          case "Todidae":
          case "Trochilidae":
          case "Troglodytidae":
          case "Trogonidae":
          case "Turdidae":
          case "Turnicidae":
          case "Tyrannidae":
          case "Tytonidae":
          case "Vangidae":
          case "Viduidae":
          case "Vireonidae":
          case "Zosteropidae":
            this.image = `https://storage.googleapis.com/squawkoverflow/birds/${bird.family}.png`;
            break;
          case "Accipitridae":
            if (bird.commonName.includes('Vulture') || bird.commonName.includes('Condor')) {
              this.image = `https://storage.googleapis.com/squawkoverflow/birds/${bird.family}2.png`;
            } else {
              this.image = `https://storage.googleapis.com/squawkoverflow/birds/${bird.family}.png`;
            }
            break;
          default:
            this.image = 'https://squawkoverflow.com/img/placeholder.jpeg';
            break;
        }
      } else {
        this.image = `https://storage.googleapis.com/squawkoverflow/birds/${this.id.slice(0, 1)}/${this.id.slice(0, 2)}/${this.id}.${this.filetype ? this.filetype : "jpg"}?u=${new Date(this.updatedAt).getTime()}`;
      }

      if (params.include?.includes('memberData') && params.member) {
        await this.fetchMemberData(params.member);
      }

      if (params.include?.includes('artist')) {
        let artist = await Database.getOne('member_variants', {
          variant: this.id,
          type: 'artist'
        });

        if (artist) {
          this.artist = new Member(artist.member);

          await this.artist.fetch().catch((err) => this.artist = null);
        }
      }

      if (params.include?.includes('contributor')) {
        let contributor = await Database.getOne('member_variants', {
          variant: this.id,
          type: 'contributor'
        });

        if (contributor) {
          this.contributor = new Member(contributor.member);

          await this.contributor.fetch().catch((err) => this.contributor = null);
        }
      }

      resolve(this);
    });
  }

  fetchMemberData(memberId) {
    return new Promise(async (resolve, reject) => {
      if (this.bird) {
        await this.bird.fetchMemberData(memberId);

        this.wishlisted = this.bird.wishlisted;
        this.owned = this.bird.owned;
      }

      this.hatched = await Counters.get('variant', memberId, this.id);
      this.discovered = this.special ? await Counters.get('birdypedia', memberId, this.id) : null;

      resolve(this);
    });
  }
}

module.exports = Variant;