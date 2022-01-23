var Database = require('../api/helpers/database.js');

(async () => {
  await Database.query('DROP TRIGGER IF EXISTS squawk_counters_insert');
  await Database.query(
    'CREATE TRIGGER \`squawk_counters_insert\` BEFORE INSERT ON squawkdata.\`birdypets\` ' +
    'FOR EACH ROW BEGIN ' +
    '  DECLARE \`v_species\` VARCHAR(50); ' +
    '  DECLARE \`v_family\` VARCHAR(50); ' +
    '  DECLARE \`v_speciesCount\` INT DEFAULT 0; ' +

    '  SELECT variants.species INTO v_species FROM variants WHERE id = NEW.variant; ' +
    '  SELECT species.family INTO v_family FROM species WHERE code = v_species; ' +
    '  SELECT COUNT(*) INTO v_speciesCount FROM birdypets JOIN variants ON (birdypets.variant = variants.id) WHERE variants.species = v_species AND `member` = NEW.member; ' +

    '  INSERT INTO squawkdata.counters VALUES (NEW.member, "variant", NEW.variant, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +

    '  IF v_speciesCount = 0 THEN ' +
    '    INSERT INTO squawkdata.counters VALUES (NEW.member, "species", v_species, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '    INSERT INTO squawkdata.counters VALUES (NEW.member, "family", v_family, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '    INSERT INTO squawkdata.counters VALUES (NEW.member, "aviary", "total", 1) ON DUPLICATE KEY UPDATE \`count\`= \`count\` + 1; ' +
    '    INSERT INTO squawkdata.counters SELECT NEW.member, "eggs", adjective, 1 FROM species_adjectives WHERE species = v_species ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '  END IF; ' +
    'END');


  await Database.query('DROP TRIGGER IF EXISTS squawk_counters_update');
  await Database.query(
    'CREATE TRIGGER \`squawk_counters_update\` BEFORE UPDATE ON squawkdata.\`birdypets\` ' +
    'FOR EACH ROW BEGIN ' +
    '  DECLARE \`v_species\` VARCHAR(50); ' +
    '  DECLARE \`v_family\` VARCHAR(50); ' +
    '  DECLARE \`v_speciesCount\` INT DEFAULT 0; ' +

    '  SELECT species INTO v_species FROM variants WHERE id = NEW.variant; ' +
    '  SELECT family INTO v_family FROM species WHERE code = v_species; ' +

    '  INSERT INTO squawkdata.counters VALUES (NEW.member, "variant", NEW.variant, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '  INSERT INTO squawkdata.counters VALUES (OLD.member, "variant", OLD.variant, 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +

    '  IF NEW.member <> OLD.member THEN ' +
    '    SELECT COUNT(*) INTO v_speciesCount FROM birdypets JOIN variants ON (birdypets.variant = variants.id) WHERE variants.species = v_species AND `member` = OLD.member; ' +

    '    INSERT INTO squawkdata.counters VALUES (NEW.member, "aviary", "total", 1) ON DUPLICATE KEY UPDATE \`count\`= \`count\` + 1; ' +

    '    IF v_speciesCount = 0 THEN ' +
    '      INSERT INTO squawkdata.counters VALUES (NEW.member, "species", v_species, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '      INSERT INTO squawkdata.counters VALUES (NEW.member, "family", v_family, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '      INSERT INTO squawkdata.counters SELECT NEW.member, "eggs", adjective, 1 FROM species_adjectives WHERE species = v_species ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '    END IF; ' +

    '    SELECT COUNT(*) INTO v_speciesCount FROM birdypets JOIN variants ON (birdypets.variant = variants.id) WHERE variants.species = v_species AND `member` = NEW.member; ' +

    '    IF v_speciesCount = 1 THEN ' +
    '      INSERT INTO squawkdata.counters VALUES (OLD.member, "species", species, 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +
    '      INSERT INTO squawkdata.counters VALUES (OLD.member, "family", family, 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +
    '      INSERT INTO squawkdata.counters VALUES (OLD.member, "aviary", "total", 0) ON DUPLICATE KEY UPDATE \`count\`= \`count\` - 1; ' +

    '      INSERT INTO squawkdata.counters SELECT OLD.member, "eggs", adjective, 0 FROM species_adjectives WHERE species = v_species ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +
    '    END IF; ' +

    '  END IF; ' +
    'END');

  await Database.query('DROP TRIGGER IF EXISTS squawk_counters_delete');
  await Database.query(
    'CREATE TRIGGER \`squawk_counters_delete\` AFTER DELETE ON squawkdata.\`birdypets\` ' +
    'FOR EACH ROW BEGIN ' +
    '  DECLARE \`v_species\` VARCHAR(50); ' +
    '  DECLARE \`v_family\` VARCHAR(50); ' +
    '  DECLARE \`v_speciesCount\` INT DEFAULT 0; ' +

    '  SELECT species INTO v_species FROM variants WHERE id = OLD.variant; ' +
    '  SELECT family INTO v_family FROM species WHERE code = v_species; ' +
    '  SELECT COUNT(*) INTO v_speciesCount FROM birdypets JOIN variants ON (birdypets.variant = variants.id) WHERE variants.species = v_species AND `member` = OLD.member; ' +

    '  INSERT INTO squawkdata.counters VALUES (OLD.member, "variant", OLD.variant, 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +

    '  IF v_speciesCount = 1 THEN ' +
    '    INSERT INTO squawkdata.counters VALUES (OLD.member, "species", species, 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +
    '    INSERT INTO squawkdata.counters VALUES (OLD.member, "family", family, 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +
    '    INSERT INTO squawkdata.counters VALUES (OLD.member, "aviary", "total", 0) ON DUPLICATE KEY UPDATE \`count\`= \`count\` - 1; ' +
    '    INSERT INTO squawkdata.counters SELECT OLD.member, "eggs", adjective, 0 FROM species_adjectives WHERE species = v_species ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +
    '  END IF; ' +
    'END');

  process.exit(0);
})();
