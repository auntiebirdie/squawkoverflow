DROP TRIGGER IF EXISTS squawk_birdypets_update;

DELIMITER //
CREATE TRIGGER `squawk_birdypets_update` BEFORE UPDATE
ON squawkdata.birdypets FOR EACH ROW
BEGIN
  DECLARE `v_species` VARCHAR(50);
  DECLARE `v_family` VARCHAR(50);
  DECLARE `v_newSpecies` INT DEFAULT 0;

  SELECT species INTO v_species FROM variants WHERE id = NEW.variant;
  SELECT family INTO v_family FROM species WHERE id = v_species;

  IF NEW.member IS NOT NULL THEN
    INSERT INTO counters VALUES (NEW.member, "variant", NEW.variant, 1) ON DUPLICATE KEY UPDATE `count` = `count` + 1;
  ELSE
    INSERT INTO counters VALUES ("freebirds", "species", v_species, 1) ON DUPLICATE KEY UPDATE `count` = `count` + 1;
  END IF;

  IF OLD.member IS NOT NULL THEN
    INSERT INTO counters VALUES (OLD.member, "variant", OLD.variant, 0) ON DUPLICATE KEY UPDATE `count` = `count` - 1;
  ELSE
    INSERT INTO counters VALUES ("freebirds", "species", v_species, 0) ON DUPLICATE KEY UPDATE `count` = `count` - 1;
  END IF;

  IF NOT (NEW.member <=> OLD.member) THEN
    IF NEW.member IS NOT NULL THEN
      SELECT IFNULL(`count`, 0) INTO v_newSpecies FROM counters WHERE `member` = NEW.member AND type = "species" AND id = v_species;

      INSERT INTO counters VALUES (NEW.member, "aviary", "total", 1) ON DUPLICATE KEY UPDATE `count` = `count` + 1;
      INSERT INTO counters VALUES (NEW.member, "species", v_species, 1) ON DUPLICATE KEY UPDATE `count` = `count` + 1;
      INSERT INTO counters VALUES (NEW.member, "birdypedia", NEW.variant, 1) ON DUPLICATE KEY UPDATE `count` = `count`;

      IF v_newSpecies = 0 THEN
        INSERT INTO counters VALUES (NEW.member, "birdypedia", v_species, 1) ON DUPLICATE KEY UPDATE `count` = `count`;
        INSERT INTO counters VALUES (NEW.member, "family", v_family, 1) ON DUPLICATE KEY UPDATE `count` = `count` + 1;
        INSERT INTO counters VALUES (NEW.member, "species", "total", 1) ON DUPLICATE KEY UPDATE `count` = `count` + 1;
        INSERT INTO counters SELECT NEW.member, "eggs", adjective, 1 FROM species_adjectives WHERE species = v_species ON DUPLICATE KEY UPDATE `count` = `count` + 1;
        INSERT IGNORE INTO member_unlocks VALUES (NEW.member, v_species, NEW.id, NOW());
      END IF;
    END IF;

    IF OLD.member IS NOT NULL THEN
      INSERT INTO squawkdata.counters VALUES (OLD.member, "aviary", "total", 0) ON DUPLICATE KEY UPDATE `count` = `count` - 1;
      INSERT INTO squawkdata.counters VALUES (OLD.member, "species", v_species, 0) ON DUPLICATE KEY UPDATE `count` = `count` - 1;
    END IF;
  END IF;
END//
