var Database = require('../api/helpers/database.js');

(async () => {
  await Database.query('DROP TRIGGER IF EXISTS squawk_counters_insert');
  await Database.query(
    'CREATE TRIGGER \`squawk_counters_insert\` BEFORE INSERT ON squawkdata.\`birdypets\` ' +
    'FOR EACH ROW BEGIN ' +
    '  DECLARE \`v_species\` VARCHAR(50); ' +
    '  DECLARE \`v_family\` VARCHAR(50); ' +

    '  SELECT variants.species INTO v_species FROM variants WHERE id = NEW.variant; ' +
    '  SELECT species.family INTO v_family FROM species WHERE code = v_species; ' +

    '  INSERT INTO squawkdata.counters VALUES (NEW.member, "variant", NEW.variant, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '  INSERT INTO squawkdata.counters VALUES (NEW.member, "species", v_species, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '  INSERT INTO squawkdata.counters VALUES (NEW.member, "family", v_family, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '  INSERT INTO squawkdata.counters VALUES (NEW.member, "aviary", "total", 1) ON DUPLICATE KEY UPDATE \`count\`= \`count\` + 1; ' +
    '  REPLACE INTO squawkdata.counters SELECT NEW.member, "eggs", `adjective`, COUNT(DISTINCT species.code) FROM species_adjectives JOIN species ON (species_adjectives.species = species.code) JOIN variants ON (variants.species = species.code) JOIN birdypets ON (birdypets.variant = variants.id) WHERE birdypets.member = NEW.member GROUP BY adjective; ' +
    'END');


  await Database.query('DROP TRIGGER IF EXISTS squawk_counters_update');
  await Database.query(
    'CREATE TRIGGER \`squawk_counters_update\` AFTER UPDATE ON squawkdata.\`birdypets\` ' +
    'FOR EACH ROW BEGIN ' +
    '  DECLARE \`v_species\` VARCHAR(50); ' +
    '  DECLARE \`v_family\` VARCHAR(50); ' +

    '  SELECT species INTO v_species FROM variants WHERE id = NEW.variant; ' +
    '  SELECT family INTO v_family FROM species WHERE code = v_species; ' +

    '  INSERT INTO squawkdata.counters VALUES (NEW.member, "variant", NEW.variant, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '  INSERT INTO squawkdata.counters VALUES (OLD.member, "variant", OLD.variant, 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +

    '  IF NEW.member <> OLD.member THEN ' +
    '    INSERT INTO squawkdata.counters VALUES (NEW.member, "variant", NEW.variant, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '    INSERT INTO squawkdata.counters VALUES (NEW.member, "species", v_species, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '    INSERT INTO squawkdata.counters VALUES (NEW.member, "family", v_family, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '    INSERT INTO squawkdata.counters VALUES (NEW.member, "aviary", "total", 1) ON DUPLICATE KEY UPDATE \`count\`= \`count\` + 1; ' +
    '    REPLACE INTO squawkdata.counters SELECT NEW.member, "eggs", `adjective`, COUNT(DISTINCT species.code) FROM species_adjectives JOIN species ON (species_adjectives.species = species.code) JOIN variants ON (variants.species = species.code) JOIN birdypets ON (birdypets.variant = variants.id) WHERE birdypets.member = NEW.member GROUP BY adjective; ' +

    '    INSERT INTO squawkdata.counters VALUES (OLD.member, "variant", NEW.variant, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +
    '    INSERT INTO squawkdata.counters VALUES (OLD.member, "species", v_species, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +
    '    INSERT INTO squawkdata.counters VALUES (OLD.member, "family", v_family, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +
    '    INSERT INTO squawkdata.counters VALUES (OLD.member, "aviary", "total", 1) ON DUPLICATE KEY UPDATE \`count\`= \`count\` - 1; ' +
    '    REPLACE INTO squawkdata.counters SELECT OLD.member, "eggs", `adjective`, COUNT(DISTINCT species.code) FROM species_adjectives JOIN species ON (species_adjectives.species = species.code) JOIN variants ON (variants.species = species.code) JOIN birdypets ON (birdypets.variant = variants.id) WHERE birdypets.member = OLD.member GROUP BY adjective; ' +
    '  END IF; ' +
    'END');

  await Database.query('DROP TRIGGER IF EXISTS squawk_counters_delete');
  await Database.query(
    'CREATE TRIGGER \`squawk_counters_delete\` AFTER DELETE ON squawkdata.\`birdypets\` ' +
    'FOR EACH ROW BEGIN ' +
    '  DECLARE \`v_species\` VARCHAR(50); ' +
    '  DECLARE \`v_family\` VARCHAR(50); ' +

    '  SELECT species INTO v_species FROM variants WHERE id = OLD.variant; ' +
    '  SELECT family INTO v_family FROM species WHERE code = v_species; ' +

    '  INSERT INTO squawkdata.counters VALUES (OLD.member, "variant", OLD.variant, 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +
    '  INSERT INTO squawkdata.counters VALUES (OLD.member, "species", v_species, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +
    '  INSERT INTO squawkdata.counters VALUES (OLD.member, "family", v_family, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +
    '  INSERT INTO squawkdata.counters VALUES (OLD.member, "aviary", "total", 1) ON DUPLICATE KEY UPDATE \`count\`= \`count\` - 1; ' +
    '  REPLACE INTO squawkdata.counters SELECT OLD.member, "eggs", `adjective`, COUNT(DISTINCT species.code) FROM species_adjectives JOIN species ON (species_adjectives.species = species.code) JOIN variants ON (variants.species = species.code) JOIN birdypets ON (birdypets.variant = variants.id) WHERE birdypets.member = OLD.member GROUP BY adjective; ' +

    'END');

  await Database.query('UPDATE squawkdata.counters SET \`count\` = 0 WHERE type = "variant"');
  await Database.query('REPLACE INTO squawkdata.counters SELECT birdypets.member, "variant", birdypets.variant, COUNT(*) FROM birdypets GROUP BY \`member\`, \`variant\`');


  await Database.query('UPDATE squawkdata.counters SET \`count\` = 0 WHERE type = "species"');
  await Database.query('REPLACE INTO squawkdata.counters SELECT birdypets.member, "species", variants.species, COUNT(*) FROM birdypets JOIN variants ON (birdypets.variant = variants.id) GROUP BY \`member\`, variants.species');

  await Database.query('UPDATE squawkdata.counters SET \`count\` = 0 WHERE type = "family"');
  await Database.query('REPLACE INTO squawkdata.counters SELECT birdypets.member, "family", species.family, COUNT(*) FROM birdypets JOIN variants ON (birdypets.variant = variants.id) JOIN species ON (variants.species = species.code) GROUP BY \`member\`, species.family');

  await Database.query('UPDATE squawkdata.counters SET \`count\` = 0 WHERE type = "eggs"');
	await Database.query('REPLACE INTO squawkdata.counters SELECT birdypets.member, "eggs", `adjective`, COUNT(DISTINCT species.code) FROM species_adjectives JOIN species ON (species_adjectives.species = species.code) JOIN variants ON (variants.species = species.code) JOIN birdypets ON (birdypets.variant = variants.id) GROUP BY \`member\`, adjective');

	await Database.query('REPLACE INTO squawkdata.counters SELECT birdypets.member, "aviary", "total", COUNT(*) FROM birdypets GROUP BY birdypets.member');


  process.exit(0);
})();
