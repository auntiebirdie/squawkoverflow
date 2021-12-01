const Database = require('./database.js');
const Redis = require('./redis.js');

class Cache {
  get(args) {
	  console.log(args);
    return new Promise((resolve, reject) => {
      Redis.connect('cache').smembers(args.join(':'), (err, results) => {
        if (err || results.length == 0) {
          resolve(this.refresh(args));
        } else {
          resolve(results);
        }
      });
    });
  }

  refresh(args) {
    return new Promise(async (resolve, reject) => {
	    let data = {};
	    let promises = [];

	    console.log(args);

      switch (args[0]) {
        case 'eggs':
          let eggs = require('../data/eggs.json');

          for (let species in eggs[args[2]].species) {
          }

          resolve(data, 604800);

          break;
	      case 'species':

		      resolve(data, 604800);
		      break;
      }
    }).then( (data, expiration) => {
	    console.log(data, expiration);
    });
  }
}

module.exports = new Cache;
