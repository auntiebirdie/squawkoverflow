const mariadb = require('mariadb');
const secrets = require('./secrets.json');

const {
  Datastore
} = require('@google-cloud/datastore');

const datastore = new Datastore({
  namespace: 'squawkoverflow'
});

(async () => {
  let ENV = process.env.NODE_ENV ? 'PROD' : 'DEV';
  let promises = [];
  let total = 0;

  const conn = await mariadb.createConnection({
    host: secrets.DB[ENV].HOST,
    user: secrets.DB[ENV].USER,
    password: secrets.DB[ENV].PASS
  });

  try {
    await conn.query('CREATE DATABASE IF NOT EXISTS squawkdata');

    switch (process.argv[2]) {
      case "taxonomy":
        await conn.query('DROP TABLE IF EXISTS squawkdata.taxonomy');
        await conn.query('CREATE TABLE squawkdata.taxonomy (name VARCHAR(50) NOT NULL PRIMARY KEY, type ENUM("family","order") NOT NULL, parent VARCHAR(50))');

        await conn.query('DROP TABLE IF EXISTS squawkdata.species');
        await conn.query('CREATE TABLE squawkdata.species (code VARCHAR(10) PRIMARY KEY, taxonomy VARCHAR(50), commonName VARCHAR(75), scientificName VARCHAR(75))');

        await conn.query('DROP TABLE IF EXISTS squawkdata.species_adjectives');
        await conn.query('CREATE TABLE squawkdata.species_adjectives (species VARCHAR(10), adjective VARCHAR(25), PRIMARY KEY (species, adjective))');

        await datastore.runQuery(datastore.createQuery('Bird')).then(async ([results]) => {
          for (let result of results) {
            switch (result.type) {
              case "order":
                promises.push(conn.query('INSERT INTO squawkdata.taxonomy VALUES (?, ?, NULL)', [result.name, "order"]));
                break;
              case "family":
                promises.push(conn.query('INSERT INTO squawkdata.taxonomy VALUES (?, "family", ?)', [result.name, "family", result.order]));
                break;
              case "species":
                promises.push(conn.query('INSERT INTO squawkdata.species VALUES (?, ?, ?, ?)', [result.code, result.family, result.name, result.scientific]));

                for (let adjective of result.adjectives) {
                  promises.push(conn.query('INSERT INTO squawkdata.species_adjectives VALUES (?, ?)', [result.code, adjective]));
                }
                break;
            }

            if (promises.length >= 250) {
              total += 250;
              console.log(`Saving ${total}...`);

              await Promise.all(promises);

              promises = [];
            }
          }

          await Promise.all(promises).then(() => {
            console.log("Done!");
          });
        });
        break;
      case "variants":
        await conn.query('DROP TABLE IF EXISTS squawkdata.variants');
        await conn.query('CREATE TABLE squawkdata.variants (id VARCHAR(50) NOT NULL PRIMARY KEY, prefix VARCHAR(50), alias VARCHAR(50), species VARCHAR(10), label VARCHAR(100), credit VARCHAR(50), source VARCHAR(250), origin VARCHAR(250), filetype VARCHAR(10), full BOOLEAN, special BOOLEAN)');

        await datastore.runQuery(datastore.createQuery('Illustration')).then(async ([results]) => {
          for (let result of results) {
            promises.push(conn.query('INSERT INTO squawkdata.variants VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [result[datastore.KEY].name, result.prefix, result.alias || result.oldId, result.speciesCode, result.label, result.credit, result.source, result.url, result.filetype, result.full || true, result.special || false]));

            if (promises.length >= 250) {
              total += 250;
              console.log(`Saving ${total}...`);

              await Promise.all(promises);

              promises = [];
            }
          }
        });
        break;
      case "members":
        await conn.query('DROP TABLE IF EXISTS squawkdata.members');
        await conn.query(`CREATE TABLE squawkdata.members (id VARCHAR(50) NOT NULL PRIMARY KEY, username VARCHAR(32), avatar VARCHAR(250), settings VARCHAR(500) DEFAULT "{}", pronouns VARCHAR(250) DEFAULT "{}", tier int DEFAULT 0, birdyBuddy VARCHAR(100), featuredFlock VARCHAR(100), bugs int DEFAULT 0, joinedAt DATETIME, lastHatchAt DATETIME, lastLoginAt DATETIME)`);

        await datastore.runQuery(datastore.createQuery('Member')).then(async ([results]) => {
          for (let result of results) {
            promises.push(conn.query(`INSERT INTO squawkdata.members VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [result[datastore.KEY].name, result.username, result.avatar, result.settings ? JSON.stringify(result.settings) : "NULL", result.pronouns || "NULL", result.tier || 0, result.birdyBuddy || "NULL", result.flock || "NULL", result.bugs || 0, new Date(result.joinedAt).toISOString().slice(0, 19).replace('T', ' '), new Date(result.lastHatchedAt || result.joinedAt).toISOString().slice(0, 19).replace('T', ' '), new Date(result.lastLogin || result.joinedAt).toISOString().slice(0, 19).replace('T', ' ')]));
          }
        });

        await Promise.all(promises).then(() => {
          console.log("Done!");
        });
        break;
      case "wishlist":
        await conn.query('DROP TABLE IF EXISTS squawkdata.wishlist');
        await conn.query('CREATE TABLE squawkdata.wishlist (member VARCHAR(50), species VARCHAR(10), intensity INT DEFAULT 0, PRIMARY KEY (member, species))');

        await datastore.runQuery(datastore.createQuery('Wishlist')).then(async ([results]) => {
          for (let result of results) {
            let member = result[datastore.KEY].name;

            for (let family in result) {
              for (let species of result[family]) {
                promises.push(conn.query('INSERT INTO squawkdata.wishlist VALUES (?, ?, 1)', [member, species]));
              }
            }

            if (promises.length >= 250) {
              total += 250;
              console.log(`Saving ${total}...`);

              await Promise.all(promises);

              promises = [];
            }
          }

          await Promise.all(promises).then(() => {
            console.log("Done!");
          });
        });
        break;
      case "flocks":
        await conn.query('DROP TABLE IF EXISTS squawkdata.flocks');
        await conn.query('CREATE TABLE squawkdata.flocks (id VARCHAR(50) NOT NULL PRIMARY KEY, member VARCHAR(50), name VARCHAR(75), description VARCHAR(500), displayOrder INT)');

        await datastore.runQuery(datastore.createQuery('Flock')).then(async ([results]) => {
          var displayOrders = {};

          for (let result of results) {
            if (!displayOrders[result.member]) {
              displayOrders[result.member] = 0;
            }

            displayOrders[result.member] += 100;

            promises.push(conn.query('INSERT INTO squawkdata.flocks VALUES (?, ?, ?, ?, ?)', [result[datastore.KEY].name, result.member, result.name, result.description || "", displayOrders[result.member]]));
          }

          await Promise.all(promises).then(() => {
            console.log("Done!");
          });
        });
        break;
      case "birdypets":
        await conn.query('DROP TABLE IF EXISTS squawkdata.birdypets');
        await conn.query('CREATE TABLE squawkdata.birdypets (id VARCHAR(50) NOT NULL PRIMARY KEY, member VARCHAR(50), variant VARCHAR(50), nickname VARCHAR(75), description VARCHAR(500), friendship INT DEFAULT 0, hatchedAt DATETIME)');

        await conn.query('DROP TABLE IF EXISTS squawkdata.birdypet_flocks');
        await conn.query('CREATE TABLE squawkdata.birdypet_flocks (birdypet VARCHAR(50), flock VARCHAR(50), PRIMARY KEY (birdypet, flock))');

        await datastore.runQuery(datastore.createQuery('BirdyPet')).then(async ([results]) => {
          for (let result of results) {
            promises.push(conn.query('INSERT INTO squawkdata.birdypets VALUES (?, ?, ?, ?, ?, ?, ?)', [result[datastore.KEY].name, result.member, result.illustration, result.nickname || "", result.description || "", result.friendship || 0, new Date(result.hatchedAt * 1).toISOString().slice(0, 19).replace('T', ' ')]));

            if (result.flocks?.length > 0) {
              for (let flock of result.flocks) {
                if (flock != "NONE") {
                  promises.push(conn.query('INSERT INTO squawkdata.birdypet_flocks VALUES (?, ?)', [result[datastore.KEY].name, flock]));
                }
              }
            }

            if (promises.length >= 250) {
              total += 250;
              console.log(`Saving ${total}...`);

              await Promise.all(promises);

              promises = [];
            }
          }

          await Promise.all(promises).then(() => {
            console.log("Done!");
          });
        });
        break;
	    case "adjectives":
		    await conn.query('DROP TABLE IF EXISTS squawkdata.adjectives');
		    await conn.query('CREATE TABLE squawkdata.adjectives (adjective VARCHAR(25) NOT NULL PRIMARY KEY, numSpecies INT DEFAULT 0)');

		    await conn.query('INSERT INTO squawkdata.adjectives SELECT adjective, COUNT(*) AS numSpecies FROM squawkdata.species_adjectives GROUP BY adjective');
		    break;
      case "extra":
        await conn.query('DROP TABLE IF EXISTS squawkdata.konami');
        await conn.query('CREATE TABLE squawkdata.konami (code VARCHAR(50) NOT NULL PRIMARY KEY, member VARCHAR(50), used BOOLEAN DEFAULT false)');

        await conn.query('DROP TABLE IF EXISTS squawkdata.freebirds');
        await conn.query('CREATE TABLE squawkdata.freebirds (variant VARCHAR(50), freedAt DATETIME DEFAULT NOW())');
        break;
    }
  } catch (err) {
    console.log(err);
  } finally {
    conn.end();
  }
})();
