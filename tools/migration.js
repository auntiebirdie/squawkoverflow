const mariadb = require('mariadb');
const secrets = require('../api/secrets.json');

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
        await conn.query('CREATE TABLE squawkdata.taxonomy (name VARCHAR(50) NOT NULL PRIMARY KEY, display VARCHAR(100), type ENUM("family","order") NOT NULL, parent VARCHAR(50))');

        await conn.query('DROP TABLE IF EXISTS squawkdata.species');
        await conn.query('CREATE TABLE squawkdata.species (code VARCHAR(10) PRIMARY KEY, family VARCHAR(50), commonName VARCHAR(75), scientificName VARCHAR(75))');

        await conn.query('DROP TABLE IF EXISTS squawkdata.species_adjectives');
        await conn.query('CREATE TABLE squawkdata.species_adjectives (species VARCHAR(10), adjective VARCHAR(25), PRIMARY KEY (species, adjective))');

        await datastore.runQuery(datastore.createQuery('Bird')).then(async ([results]) => {
          for (let result of results) {
            switch (result.type) {
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

          await Promise.all(promises).then(async () => {
            await conn.query('DROP TABLE IF EXISTS squawkdata.adjectives');
            await conn.query('CREATE TABLE squawkdata.adjectives (adjective VARCHAR(25) NOT NULL PRIMARY KEY, numSpecies INT DEFAULT 0)');

            await conn.query('INSERT INTO squawkdata.adjectives SELECT adjective, COUNT(*) AS numSpecies FROM squawkdata.species_adjectives GROUP BY adjective');

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
        await conn.query('CREATE TABLE squawkdata.flocks (id VARCHAR(50) NOT NULL PRIMARY KEY, `member` VARCHAR(50), name VARCHAR(75), description VARCHAR(500), displayOrder INT)');

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
        await conn.query('CREATE TABLE squawkdata.birdypets (id VARCHAR(50) NOT NULL PRIMARY KEY, `member` VARCHAR(50), variant VARCHAR(50), nickname VARCHAR(75), description VARCHAR(500), friendship INT DEFAULT 0, hatchedAt DATETIME)');

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
      case "extra":
        await conn.query('DROP TABLE IF EXISTS squawkdata.konami');
        await conn.query('CREATE TABLE squawkdata.konami (code VARCHAR(50) NOT NULL PRIMARY KEY, `member` VARCHAR(50), used BOOLEAN DEFAULT false)');

        await conn.query('DROP TABLE IF EXISTS squawkdata.freebirds');
        await conn.query('CREATE TABLE squawkdata.freebirds (id VARCHAR(50) NOT NULL PRIMARY KEY, variant VARCHAR(50), freedAt DATETIME DEFAULT NOW())');
        break;
	    case "tiers":
		    await conn.query('DROP TABLE IF EXISTS squawkdata.tiers');
		    await conn.query('CREATE TABLE squawkdata.tiers (`id` INT PRIMARY KEY, `name` VARCHAR(25), `eggTimer` INT, `aviaryLimit` INT, `extraInsights` BOOLEAN, `member` VARCHAR(50) NULL)');

		    await conn.query('INSERT INTO squawkdata.tiers VALUES (0, "Birder", 10, 11000, FALSE, NULL)');
                    await conn.query('INSERT INTO squawkdata.tiers VALUES (1, "Bird Lover", 0, 11000, FALSE, NULL)');
                    await conn.query('INSERT INTO squawkdata.tiers VALUES (2, "Bird Fanatic", 0, 0, FALSE, NULL)');
                    await conn.query('INSERT INTO squawkdata.tiers VALUES (3, "Bird Collector", 0, 0, TRUE, NULL)');
                    await conn.query('INSERT INTO squawkdata.tiers VALUES (4, "V.I.B.", 0, 0, TRUE, NULL)');


                    await conn.query('INSERT INTO squawkdata.tiers VALUES (100, "Owlpha Squad", 0, 0, TRUE, NULL)');
                    await conn.query('INSERT INTO squawkdata.tiers VALUES (101, "Owlpha Squad", 10, 0, TRUE, NULL)');


                    await conn.query('INSERT INTO squawkdata.tiers VALUES (1205, "Auntie Birdie", 0, 0, TRUE, "121294882861088771")');
		    break;
	    case "counters":
		    await conn.query('USE squawkdata');
		    await conn.query('DROP TABLE IF EXISTS squawkdata.counters');
		    await conn.query('CREATE TABLE squawkdata.counters (`member` VARCHAR(50), `type` VARCHAR(25), `id` VARCHAR(50), `count` INT DEFAULT 0, PRIMARY KEY(`member`, `type`, `id`))');

		    await conn.query('DROP TRIGGER IF EXISTS squawk_counters_insert');
		    await conn.query(
		    'CREATE TRIGGER \`squawk_counters_insert\` AFTER INSERT ON squawkdata.\`birdypets\` ' +
		    'FOR EACH ROW BEGIN ' +
		    '  DECLARE \`v_species\` VARCHAR(50); ' +
		    '  DECLARE \`v_family\` VARCHAR(50); ' +

                    '  SELECT variants.species INTO v_species FROM variants WHERE id = NEW.variant; ' +
                    '  SELECT species.family INTO v_family FROM species WHERE code = v_species; ' +

		    '  INSERT INTO squawkdata.counters VALUES (NEW.member, "variant", NEW.variant, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
		    '  INSERT INTO squawkdata.counters VALUES (NEW.member, "species", v_species, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
		    '  INSERT INTO squawkdata.counters VALUES (NEW.member, "family", v_family, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
                    '  INSERT INTO squawkdata.counters VALUES (NEW.member, "aviary", "total", 1) ON DUPLICATE KEY UPDATE \`count\`= \`count\` + 1; ' +
                    '  INSERT INTO squawkdata.counters SELECT NEW.member, "eggs", adjective, 1 FROM species_adjectives WHERE species = v_species ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
		    'END');


                    await conn.query('DROP TRIGGER IF EXISTS squawk_counters_update');
                    await conn.query(
                    'CREATE TRIGGER \`squawk_counters_update\` AFTER UPDATE ON squawkdata.\`birdypets\` ' +
                    'FOR EACH ROW BEGIN '+
                    '  DECLARE \`v_species\` VARCHAR(50); ' +
                    '  DECLARE \`v_family\` VARCHAR(50); ' +
		    '  DECLARE \`speciesCount\` INT DEFAULT 0; ' +
		    '  DECLARE \`familyCount\` INT DEFAULT 0; ' +

                    '  SELECT species INTO v_species FROM variants WHERE id = NEW.variant; ' +
                    '  SELECT family INTO v_family FROM species WHERE code = v_species; ' +

                    '  INSERT INTO squawkdata.counters VALUES (NEW.member, "variant", NEW.variant, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
		    '  INSERT INTO squawkdata.counters VALUES (OLD.member, "variant", OLD.variant, 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +

                    '  IF NEW.member <> OLD.member THEN ' +
		    '    SELECT COUNT(DISTINCT birdypets.variant) INTO speciesCount FROM birdypets JOIN variants ON (birdypets.variant = variants.id) WHERE birdypets.member = NEW.member AND variants.species = v_species; ' +
                    '    SELECT COUNT(DISTINCT species.code) INTO familyCount FROM birdypets JOIN variants ON (birdypets.variant = variants.id) JOIN species ON (variants.species = species.code) WHERE birdypets.member = NEW.member AND species.family = v_family; ' +

                    '    INSERT INTO squawkdata.counters VALUES (NEW.member, "species", v_species, 1) ON DUPLICATE KEY UPDATE \`count\` = speciesCount; ' +
                    '    INSERT INTO squawkdata.counters VALUES (NEW.member, "family", v_family, 1) ON DUPLICATE KEY UPDATE \`count\` = familyCount; ' +
                    '    INSERT INTO squawkdata.counters VALUES (NEW.member, "aviary", "total", 1) ON DUPLICATE KEY UPDATE \`count\`= \`count\` + 1; ' +
                    '    INSERT INTO squawkdata.counters SELECT NEW.member, "eggs", adjective, 1 FROM species_adjectives WHERE species = v_species ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +

                    '    SELECT COUNT(DISTINCT birdypets.variant) INTO speciesCount FROM birdypets JOIN variants ON (birdypets.variant = variants.id) WHERE birdypets.member = OLD.member AND variants.species = v_species; ' +
                    '    SELECT COUNT(DISTINCT species.code) INTO familyCount FROM birdypets JOIN variants ON (birdypets.variant = variants.id) JOIN species ON (variants.species = species.code) WHERE birdypets.member = OLD.member AND species.family = v_family; ' +

                    '    INSERT INTO squawkdata.counters VALUES (OLD.member, "species", species, 0) ON DUPLICATE KEY UPDATE \`count\` = speciesCount; ' + 
                    '    INSERT INTO squawkdata.counters VALUES (OLD.member, "family", family, 0) ON DUPLICATE KEY UPDATE \`count\` = familyCount; ' + 
                    '    INSERT INTO squawkdata.counters VALUES (OLD.member, "aviary", "total", 0) ON DUPLICATE KEY UPDATE \`count\`= \`count\` - 1; ' +
                    '    INSERT INTO squawkdata.counters SELECT OLD.member, "eggs", adjective, 1 FROM species_adjectives WHERE species = v_species ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
                    '  END IF; ' +
                    'END');

                    await conn.query('DROP TRIGGER IF EXISTS squawk_counters_delete');
                    await conn.query(
                    'CREATE TRIGGER \`squawk_counters_delete\` AFTER DELETE ON squawkdata.\`birdypets\` ' +
                    'FOR EACH ROW BEGIN ' +
                    '  DECLARE \`v_species\` VARCHAR(50); ' +
                    '  DECLARE \`v_family\` VARCHAR(50); ' +
                    '  DECLARE \`speciesCount\` INT DEFAULT 0; ' +
                    '  DECLARE \`familyCount\` INT DEFAULT 0; ' +

                    '  SELECT species INTO v_species FROM variants WHERE id = OLD.variant; ' +
                    '  SELECT family INTO v_family FROM species WHERE code = v_species; ' +

                    '  INSERT INTO squawkdata.counters VALUES (OLD.member, "variant", OLD.variant, 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +

                    '  SELECT COUNT(DISTINCT birdypets.variant) INTO speciesCount FROM birdypets JOIN variants ON (birdypets.variant = variants.id) WHERE birdypets.member = OLD.member AND variants.species = v_species; ' +
                    '  SELECT COUNT(DISTINCT species.code) INTO familyCount FROM birdypets JOIN variants ON (birdypets.variant = variants.id) JOIN species ON (variants.species = species.code) WHERE birdypets.member = OLD.member AND species.family = v_family; ' +

                    '  INSERT INTO squawkdata.counters VALUES (OLD.member, "species", species, 0) ON DUPLICATE KEY UPDATE \`count\` = speciesCount; ' +
                    '  INSERT INTO squawkdata.counters VALUES (OLD.member, "family", family, 0) ON DUPLICATE KEY UPDATE \`count\` = familyCount; ' +
                    '  INSERT INTO squawkdata.counters VALUES (OLD.member, "aviary", "total", 0) ON DUPLICATE KEY UPDATE \`count\`= \`count\` - 1; ' +
                    '  INSERT INTO squawkdata.counters SELECT OLD.member, "eggs", adjective, 0 FROM species_adjectives WHERE species = v_species ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +
                    'END');

                    await conn.query('INSERT INTO squawkdata.counters SELECT `member`, "variant", variant, COUNT(*) FROM birdypets GROUP BY `member`, `variant`');
		    await conn.query('INSERT INTO squawkdata.counters SELECT `member`, "species", species, COUNT(DISTINCT variant) FROM birdypets JOIN variants ON (birdypets.variant = variants.id) GROUP BY `member`, `species`');
		    await conn.query('INSERT INTO squawkdata.counters SELECT `member`, "family", family, COUNT(DISTINCT species.code) FROM birdypets JOIN variants ON (birdypets.variant = variants.id) JOIN species ON (variants.species = species.code) GROUP BY `member`, `family`');
		    await conn.query('INSERT INTO squawkdata.counters SELECT `member`, "aviary", "total", COUNT(*) FROM birdypets GROUP BY `member`');
		    await conn.query('INSERT INTO squawkdata.counters SELECT `member`, "eggs", adjective, COUNT(DISTINCT variants.species) FROM birdypets JOIN variants ON (birdypets.variant = variants.id) JOIN species_adjectives ON (variants.species = species_adjectives.species) GROUP BY `member`, `adjective`');
    }
  } catch (err) {
    console.log(err);
  } finally {
    conn.end();
  }
})();
