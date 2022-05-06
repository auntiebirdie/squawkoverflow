const Bird = require('./bird.js');
const Member = require('./member.js');
const Counters = require('../helpers/counters.js');
const Database = require('../helpers/database.js');

class Variant {
  constructor(id) {
    this.id = id;
  }

  fetch(params = {}) {
    return new Promise((resolve, reject) => {
      Database.getOne('variants', {
        id: this.id
      }).then(async (variant) => {
        for (let key in variant) {
          if (!params.fields || params.fields.includes(key)) {
            this[key] = variant[key];
          }
        }

        let bird = null;

        if (!params.bird) {
          bird = new Bird(variant.species);

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
            case "Aegothelidae":
            case "Alaudidae":
            case "Alcedinidae":
            case "Alcidae":
            case "Alcippeidae":
            case "Cathartidae":
            case "Coliidae":
            case "Columbidae":
            case "Corvidae":
            case "Diomedeidae":
            case "Falconidae":
            case "Falcunculidae":
            case "Laniidae":
            case "Laridae":
            case "Momotidae":
            case "Oriolidae":
            case "Phasianidae":
            case "Psittaculidae":
            case "Sagittariidae":
            case "Scopidae":
            case "Spheniscidae":
            case "Threskiomithidae":
            case "Timaliidae":
            case "Tinamidae":
            case "Tityridae":
            case "Todidae":
            case "Trochilidae":
            case "Troglodytidae":
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
          this.image = `https://storage.googleapis.com/squawkoverflow/birds/${this.id.slice(0, 1)}/${this.id.slice(0, 2)}/${this.id}.${variant.filetype ? variant.filetype : "jpg"}`;
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

            await this.artist.fetch();
          }
        }

        resolve(this);
      });
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