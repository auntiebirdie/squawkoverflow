const Database = require('./database.js');
const Redis = require('./redis.js');

function Search() {}

Search.prototype.get = function(args) {
  let hash = [
	  args.family,
	  args.flock,
	  args.sort
  ];

  return new Promise((resolve, reject) => {
    Redis.connect("search").smembers(`${kind}:${id}`, (err, results) => {
      if (err || typeof results == 'undefined' || results == null || results.length == 0) {
        resolve(this.refresh(kind, id));
      } else {
        resolve(results);
      }
    });
  });
}

Search.prototype.refresh = function(kind = 'cache', id, type) {
  var expiration = 604800 // 1 week;

  return new Promise(async (resolve, reject) => {
    var data = {};

    switch (kind) {
      case 'cache':
        if (id == 'members') {
          Database.fetch({
            kind: 'Member',
            keysOnly: true
          }).then((members) => {
            resolve(members.map((member) => member[Database.KEY].name));
          });
        }
        break;
      case 'flocks':
        Database.fetch({
          kind: 'Flock',
          filters: [
            ['member', '=', id]
          ],
          keysOnly: true
        }).then((flocks) => {
          resolve(flocks.map((flock) => flock[Database.KEY].name));
        });
        break;
      case 'member':
        Database.get('Member', id).then((member) => {
          resolve(member);
        });
        break;
      case 'wishlist':
        Database.get('Wishlist', id).then((wishlist) => {
          if (wishlist && wishlist._id) {
            delete wishlist._id;
          }

          resolve(wishlist);
        });
        break;
      case 'memberpet':
        Database.get('MemberPet', id).then((birdypet) => {
          resolve(birdypet);
        });
        break;
      case 'flock':
        Database.get('Flock', id).then((flock) => {
          resolve(flock);
        });
        break;
      case 'aviaryTotals':
      case 'flockTotals':
        var filters = [];

        if (kind == 'aviaryTotals') {
          filters.push(['member', '=', id]);
        } else if (kind == 'flockTotals') {
          if (id.startsWith('NONE-')) {
            let tmp = id.split('-');

            filters.push(['member', '=', tmp[1]]);
            filters.push(['flocks', '=', 'NONE']);
          } else {
            filters.push(['flocks', '=', id]);
          }
        }

        Database.fetch({
          kind: 'MemberPet',
          filters: filters
        }).then((response) => {
          data._total = 0;

          for (var memberpet of response.results) {
		  let birdypet = new BirdyPet(memberpet.birdypetId);

            if (!data[birdypet.species.family]) {
              data[birdypet.species.family] = 0;
            }

            data._total++;
            data[birdypet.species.family]++;
          }

          resolve(data);
        });
        break;
      case 'eggTotals':
        Database.fetch({
		kind: 'MemberPet',
		filters: [
			['member', '=', id]
		]
        }).then((response) => {
          for (var egg in eggs) {
            let tmp = eggs[egg].species;

            if (tmp) {
              data[egg] = response.results.filter((memberpet) => {
		      let birdypet = new BirdyPet(memberpet.birdypetId);
		      
		      return tmp.includes(memberpet.birdypetSpecies);
	      }).length;
            }
          }

          resolve(data);
        });
        break;
      default:
        if (kind.startsWith('species-')) {
          let speciesCode = kind.split('-')[1];

          data = [];

		Database.fetch({
			kind: 'MemberPet',
			filters: [
				['member', '=', id]
			]
		}).then(async (response) => {
			let birdypet = new BirdyPet(memberpet.birdypetId);

            for (var memberpet of response.results) {
		    if (birdypet.species.speciesCode = speciesCode) {
              data.push(memberpet.birdypetId);
		    }
            }

            resolve(data);
          });
        } else if (kind.startsWith('eggs-')) {
          let egg = kind.split('-')[1];
          let species = eggs[egg].species;

          data = [];

          for (let speciesCode of species) {
            let tmp = await this.get(`species-${speciesCode}`, id, "s");

            if (tmp.length > 0) {
              data.push(speciesCode);
            }
          }

          resolve(data);
        } else {
          resolve(null);
        }
    }
  }).then(async (results) => {
    await Redis.connect("cache").del(`${kind}:${id}`);

    if (results && results[Database.KEY]) {
      delete results[Database.KEY];
    }

    switch (typeof results) {
      case "object":
        for (let key in results) {
          let data = results[key];

          switch (typeof data) {
            case "object":
            case "array":
              results[key] = JSON.stringify(data);
          }

          await Redis.connect("cache").hset(`${kind}:${id}`, key, results[key]);
        }
        break;
      case "array":
        if (results.length > 0) {
          await Redis.connect("cache").sadd(`${kind}:${id}`, results);
        }
        break;
      default:
        return results;
    }

    await Redis.connect("cache").sendCommand('EXPIRE', [`${kind}:${id}`, expiration]);

    return results;
  });
}

module.exports = new Cache();
