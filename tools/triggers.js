var Database = require('../api/helpers/database.js');

(async () => {
  await Database.query('DROP TRIGGER IF EXISTS squawk_birdypets_insert');
  await Database.query(
    'CREATE TRIGGER \`squawk_birdypets_insert\` BEFORE INSERT ON squawkdata.\`birdypets\` ' +
    'FOR EACH ROW BEGIN ' +
    '  DECLARE \`v_species\` VARCHAR(50); ' +
    '  DECLARE \`v_family\` VARCHAR(50); ' +
    '  DECLARE \`v_newSpecies\` INT DEFAULT 0; '+

    '  SELECT variants.species INTO v_species FROM variants WHERE id = NEW.variant; ' +

    '  IF NEW.member IS NOT NULL THEN ' +
    '    SELECT species.family INTO v_family FROM species WHERE id = v_species; ' +
    '    SELECT IFNULL(\`count\`, 0) INTO v_newSpecies FROM counters WHERE \`member\` = NEW.member AND type = "species" AND id = v_species; ' +

    '    INSERT INTO counters VALUES (NEW.member, "aviary", "total", 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '    INSERT INTO counters VALUES (NEW.member, "variant", NEW.variant, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '    INSERT INTO counters VALUES (NEW.member, "species", v_species, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +

    '    IF v_newSpecies = 0 THEN ' +
    '      INSERT INTO counters VALUES (NEW.member, "family", v_family, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '      INSERT INTO counters VALUES (NEW.member, "species", "total", 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '      INSERT INTO counters SELECT NEW.member, "eggs", adjective, 1 FROM species_adjectives WHERE species = v_species ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '    END IF; ' +
    '  ELSE ' +
    '    INSERT INTO counters VALUES ("freebirds", "species", v_species, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '  END IF; ' +
    'END');


  await Database.query('DROP TRIGGER IF EXISTS squawk_birdypets_update');
  await Database.query(
    'CREATE TRIGGER \`squawk_birdypets_update\` BEFORE UPDATE ON squawkdata.\`birdypets\` ' +
    'FOR EACH ROW BEGIN ' +
    '  DECLARE \`v_species\` VARCHAR(50); ' +
    '  DECLARE \`v_family\` VARCHAR(50); ' +
    '  DECLARE \`v_newSpecies\` INT DEFAULT 0; '+

    '  SELECT species INTO v_species FROM variants WHERE id = NEW.variant; ' +
    '  SELECT family INTO v_family FROM species WHERE id = v_species; ' +

    '  IF NEW.member IS NOT NULL THEN ' +
    '    INSERT INTO counters VALUES (NEW.member, "variant", NEW.variant, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '  ELSE ' +
    '    INSERT INTO counters VALUES ("freebirds", "species", v_species, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '  END IF; ' +

    '  IF OLD.member IS NOT NULL THEN ' +
    '    INSERT INTO counters VALUES (OLD.member, "variant", OLD.variant, 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +
    '  ELSE ' +
    '    INSERT INTO counters VALUES ("freebirds", "species", v_species, 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +
    '  END IF; ' +

    '  IF NOT (NEW.member <=> OLD.member) THEN ' +
    '    IF NEW.member IS NOT NULL THEN ' +
    '      SELECT IFNULL(\`count\`, 0) INTO v_newSpecies FROM counters WHERE \`member\` = NEW.member AND type = "species" AND id = v_species; ' +

    '      INSERT INTO counters VALUES (NEW.member, "aviary", "total", 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '      INSERT INTO counters VALUES (NEW.member, "species", v_species, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +

    '      IF v_newSpecies = 0 THEN ' +
    '        INSERT INTO counters VALUES (NEW.member, "family", v_family, 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '        INSERT INTO counters VALUES (NEW.member, "species", "total", 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '        INSERT INTO counters SELECT NEW.member, "eggs", adjective, 1 FROM species_adjectives WHERE species = v_species ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '      END IF; ' +
    '    END IF; ' +

    '    IF OLD.member IS NOT NULL THEN ' +
    '      INSERT INTO squawkdata.counters VALUES (OLD.member, "aviary", "total", 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +
    '      INSERT INTO squawkdata.counters VALUES (OLD.member, "species", v_species, 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +

    '      SELECT IFNULL(\`count\`, 0) INTO v_newSpecies FROM counters WHERE \`member\` = OLD.member AND type = "species" AND id = v_species; ' +

    '      IF v_newSpecies = 0 THEN ' +
    '        INSERT INTO counters VALUES (OLD.member, "family", v_family, 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +
    '        INSERT INTO counters VALUES (OLD.member, "species", "total", 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +
    '        INSERT INTO counters SELECT OLD.member, "eggs", adjective, 0 FROM species_adjectives WHERE species = v_species ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +
    '      END IF; ' +
    '    END IF; ' +
    '  END IF; ' +
    'END');

  await Database.query('UPDATE squawkdata.counters SET \`count\` = 0 WHERE type = "variant"');
  await Database.query('REPLACE INTO squawkdata.counters SELECT birdypets.member, "variant", birdypets.variant, COUNT(*) FROM birdypets WHERE birdypets.member IS NOT NULL GROUP BY \`member\`, \`variant\`');

  await Database.query('UPDATE squawkdata.counters SET \`count\` = 0 WHERE type = "species"');
  await Database.query('REPLACE INTO squawkdata.counters SELECT birdypets.member, "species", variants.species, COUNT(*) FROM birdypets JOIN variants ON (birdypets.variant = variants.id) WHERE birdypets.member IS NOT NULL GROUP BY \`member\`, variants.species');
  await Database.query('REPLACE INTO squawkdata.counters SELECT IFNULL(birdypets.member, "freebirds"), "species", "total", COUNT(DISTINCT variants.species) FROM birdypets JOIN variants ON (birdypets.variant = variants.id) GROUP BY \`member\`');

  await Database.query('UPDATE squawkdata.counters SET \`count\` = 0 WHERE type = "family"');
  await Database.query('REPLACE INTO squawkdata.counters SELECT birdypets.member, "family", species.family, COUNT(DISTINCT variants.species) FROM birdypets JOIN variants ON (birdypets.variant = variants.id) JOIN species ON (variants.species = species.id) WHERE birdypets.member IS NOT NULL GROUP BY \`member\`, species.family');

  await Database.query('UPDATE squawkdata.counters SET \`count\` = 0 WHERE type = "eggs"');
  await Database.query('REPLACE INTO squawkdata.counters SELECT birdypets.member, "eggs", adjective, COUNT(DISTINCT variants.species) FROM species_adjectives JOIN variants ON (variants.species = species_adjectives.species) JOIN birdypets ON (birdypets.variant = variants.id) WHERE birdypets.member IS NOT NULL GROUP BY \`member\`, adjective');

  await Database.query('REPLACE INTO squawkdata.counters SELECT birdypets.member, "friendship", "total", COUNT(*) FROM birdypets WHERE friendship = 100 GROUP BY birdypets.member');

  await Database.query('REPLACE INTO squawkdata.counters SELECT birdypets.member, "aviary", "total", COUNT(*) FROM birdypets WHERE birdypets.member IS NOT NULL GROUP BY birdypets.member');


  await Database.query('DROP TRIGGER IF EXISTS squawk_exchanges_update');
  await Database.query(
    'CREATE TRIGGER \`squawk_exchanges_update\` AFTER UPDATE ON squawkdata.\`exchanges\` ' +
    'FOR EACH ROW BEGIN ' +
    '  DECLARE \`v_statusOld\` VARCHAR(4); ' +
    '  DECLARE \`v_statusNew\` VARCHAR(4); ' +

    ' SET v_statusOld := CONCAT(OLD.statusA, OLD.statusB); ' +
    ' SET v_statusNew := CONCAT(NEW.statusA, NEW.statusB); ' +

    ' IF v_statusOld = "21" AND v_statusNew IN ("22", "2-1", "-11") THEN ' +
    '  INSERT INTO squawkdata.counters VALUES (NEW.memberB, "exchanges", "waitingOnMe", 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +

    ' ELSEIF v_statusOld = "21" AND v_statusNew = "11" THEN ' +
    '  INSERT INTO squawkdata.counters VALUES (NEW.memberA, "exchanges", "waitingOnMe", 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '  INSERT INTO squawkdata.counters VALUES (NEW.memberB, "exchanges", "waitingOnMe", 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +

    ' ELSEIF v_statusOld = "20" AND v_statusNew = "12" THEN ' +
    '  INSERT INTO squawkdata.counters VALUES (NEW.memberA, "exchanges", "waitingOnMe", 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '  INSERT INTO squawkdata.counters VALUES (NEW.memberB, "exchanges", "waitingOnMe", 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +

    ' ELSEIF v_statusOld = "20" AND v_statusNew IN ("22", "-10", "2-1") THEN ' +
    '  INSERT INTO squawkdata.counters VALUES (NEW.memberB, "exchanges", "waitingOnMe", 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +

    ' ELSEIF v_statusOld = "12" AND v_statusNew IN ("22", "-12", "1-1") THEN ' +
    '  INSERT INTO squawkdata.counters VALUES (NEW.memberA, "exchanges", "waitingOnMe", 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +

    ' ELSEIF v_statusOld = "11" AND v_statusNew = "21" THEN ' +
    '  INSERT INTO squawkdata.counters VALUES (NEW.memberA, "exchanges", "waitingOnMe", 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +
    '  INSERT INTO squawkdata.counters VALUES (NEW.memberB, "exchanges", "waitingOnMe", 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +

    ' ELSEIF v_statusOld = "11" AND v_statusNew IN ("-11", "1-1") THEN ' +
    '  INSERT INTO squawkdata.counters VALUES (NEW.memberA, "exchanges", "waitingOnMe", 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +

    ' ELSEIF v_statusOld = "20" AND v_statusNew IN ("22", "-10", "2-1") THEN ' +
    '  INSERT INTO squawkdata.counters VALUES (NEW.memberB, "exchanges", "waitingOnMe", 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +

    ' ELSEIF v_statusOld = "10" AND v_statusNew = "12" THEN ' +
    '  INSERT INTO squawkdata.counters VALUES (NEW.memberA, "exchanges", "waitingOnMe", 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +
    '  INSERT INTO squawkdata.counters VALUES (NEW.memberB, "exchanges", "waitingOnMe", 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +

    ' ELSEIF v_statusOld = "10" AND v_statusNew IN ("-10", "1-1") THEN ' +
    '  INSERT INTO squawkdata.counters VALUES (NEW.memberB, "exchanges", "waitingOnMe", 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +

    ' ELSEIF v_statusOld = "00" AND v_statusNew IN ("20", "10") THEN ' +
    '  INSERT INTO squawkdata.counters VALUES (NEW.memberB, "exchanges", "waitingOnMe", 1) ON DUPLICATE KEY UPDATE \`count\` = \`count\` + 1; ' +

    ' END IF; ' +
    'END');

  await Database.query('DROP TRIGGER IF EXISTS squawk_exchanges_delete');
  await Database.query(
    'CREATE TRIGGER \`squawk_exchanges_delete\` AFTER DELETE ON squawkdata.\`exchanges\` ' +
    'FOR EACH ROW BEGIN ' +
    '  DECLARE \`v_statusOld\` VARCHAR(4); ' +

    ' SET v_statusOld := CONCAT(OLD.statusA, OLD.statusB); ' +

    ' IF v_statusOld = "21" THEN ' +
    '  INSERT INTO squawkdata.counters VALUES (OLD.memberB, "exchanges", "waitingOnMe", 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +

    ' ELSEIF v_statusOld = "21" THEN ' +
    '  INSERT INTO squawkdata.counters VALUES (OLD.memberB, "exchanges", "waitingOnMe", 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +

    ' ELSEIF v_statusOld = "20" THEN ' +
    '  INSERT INTO squawkdata.counters VALUES (OLD.memberB, "exchanges", "waitingOnMe", 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +

    ' ELSEIF v_statusOld = "20" THEN ' +
    '  INSERT INTO squawkdata.counters VALUES (OLD.memberB, "exchanges", "waitingOnMe", 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +

    ' ELSEIF v_statusOld = "12" THEN ' +
    '  INSERT INTO squawkdata.counters VALUES (OLD.memberA, "exchanges", "waitingOnMe", 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +

    ' ELSEIF v_statusOld = "11" THEN ' +
    '  INSERT INTO squawkdata.counters VALUES (OLD.memberA, "exchanges", "waitingOnMe", 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +

    ' ELSEIF v_statusOld = "11" THEN ' +
    '  INSERT INTO squawkdata.counters VALUES (OLD.memberA, "exchanges", "waitingOnMe", 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +

    ' ELSEIF v_statusOld = "20" THEN ' +
    '  INSERT INTO squawkdata.counters VALUES (OLD.memberB, "exchanges", "waitingOnMe", 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +

    ' ELSEIF v_statusOld = "10" THEN ' +
    '  INSERT INTO squawkdata.counters VALUES (OLD.memberB, "exchanges", "waitingOnMe", 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +

    ' ELSEIF v_statusOld = "10" THEN ' +
    '  INSERT INTO squawkdata.counters VALUES (OLD.memberB, "exchanges", "waitingOnMe", 0) ON DUPLICATE KEY UPDATE \`count\` = \`count\` - 1; ' +

    ' END IF; ' +
    'END');

    await Database.query('UPDATE squawkdata.counters SET \`count\` = 0 WHERE type = "exchanges"');
    await Database.query('REPLACE INTO squawkdata.counters SELECT exchanges.memberA, "exchanges", "waitingOnMe", COUNT(*) FROM exchanges WHERE (statusA = 1 AND statusB = 1) OR (statusA = 1 AND statusB = 2) GROUP BY memberA');
    await Database.query('REPLACE INTO squawkdata.counters SELECT exchanges.memberB, "exchanges", "waitingOnMe", COUNT(*) FROM exchanges WHERE (statusA = 2 AND statusB = 1) OR (statusA = 2 AND statusB = 0) OR (statusA = 1 AND statusB = 0) GROUP BY memberB');


  await Database.query('DROP TRIGGER IF EXISTS squawk_adjectives_insert');
  await Database.query(
    'CREATE TRIGGER \`squawk_adjectives_insert\` AFTER INSERT ON squawkdata.\`species_adjectives\` ' +
    'FOR EACH ROW BEGIN ' +
    ' UPDATE adjectives SET numSpecies = (SELECT COUNT(DISTINCT species) FROM species_adjectives WHERE adjective = NEW.adjective AND species IN (SELECT species FROM variants)) WHERE adjective = NEW.adjective; ' +
    ' REPLACE INTO squawkdata.counters SELECT birdypets.member, "eggs", adjective, COUNT(DISTINCT variants.species) FROM species_adjectives JOIN variants ON (variants.species = species_adjectives.species) JOIN birdypets ON (birdypets.variant = variants.id) WHERE species_adjectives.adjective = NEW.adjective AND `member` IS NOT NULL GROUP BY \`member\`, adjective; ' +
    'END'
  );

  await Database.query('DROP TRIGGER IF EXISTS squawk_adjectives_update');
  await Database.query(
    'CREATE TRIGGER \`squawk_adjectives_update\` AFTER UPDATE ON squawkdata.\`species_adjectives\` ' +
    'FOR EACH ROW BEGIN ' +
    ' UPDATE adjectives SET numSpecies = (SELECT COUNT(DISTINCT species) FROM species_adjectives WHERE adjective = NEW.adjective AND species IN (SELECT species FROM variants)) WHERE adjective = NEW.adjective; ' +
    ' REPLACE INTO squawkdata.counters SELECT birdypets.member, "eggs", adjective, COUNT(DISTINCT variants.species) FROM species_adjectives JOIN variants ON (variants.species = species_adjectives.species) JOIN birdypets ON (birdypets.variant = variants.id) WHERE species_adjectives.adjective = NEW.adjective AND `member` IS NOT NULL GROUP BY \`member\`, adjective; ' +
    'END'
  );

  await Database.query('DROP TRIGGER IF EXISTS squawk_adjectives_delete');
  await Database.query(
    'CREATE TRIGGER \`squawk_adjectives_delete\` AFTER DELETE ON squawkdata.\`species_adjectives\` ' +
    'FOR EACH ROW BEGIN ' +
    ' UPDATE adjectives SET numSpecies = (SELECT COUNT(DISTINCT species) FROM species_adjectives WHERE adjective = OLD.adjective AND species IN (SELECT species FROM variants)) WHERE adjective = OLD.adjective; ' +
    ' REPLACE INTO squawkdata.counters SELECT birdypets.member, "eggs", adjective, COUNT(DISTINCT variants.species) FROM species_adjectives JOIN variants ON (variants.species = species_adjectives.species) JOIN birdypets ON (birdypets.variant = variants.id) WHERE species_adjectives.adjective = OLD.adjective AND birdypets.member IS NOT NULL GROUP BY \`member\`, adjective; ' +  
    'END'
  );

  process.exit(0);
})();
