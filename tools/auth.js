var Database = require('../api/helpers/database.js');

(async () => {
  await Database.query('DROP TABLE IF EXISTS member_auth');
  await Database.query('CREATE TABLE member_auth (`member` VARCHAR(50), provider VARCHAR(10), id VARCHAR(75), PRIMARY KEY (member, provider))');

  await Database.query('INSERT INTO member_auth SELECT id, "discord", id FROM members');

  await Database.query('DROP TRIGGER IF EXISTS squawk_counters_update');
  await Database.query('DROP TRIGGER IF EXISTS squawk_birdypets_update');
  await Database.query('DROP TRIGGER IF EXISTS squawk_exchanges_update');


  let members = await Database.query('SELECT id FROM members');

  for (let member of members) {
    let id = Database.key();
    await Database.query('UPDATE members SET id = ? WHERE id = ?', [id, member.id]),
    await Database.query('UPDATE member_auth SET `member` = ? WHERE `member` = ?', [id, member.id]);

    await Database.query('UPDATE birdypets SET `member` = ? WHERE `member` = ?', [id, member.id]);
    await Database.query('UPDATE exchange_birdypets SET `member` = ? WHERE `member` = ?', [id, member.id]);
    await Database.query('UPDATE exchanges SET `memberA` = ? WHERE `memberA` = ?', [id, member.id]);
    await Database.query('UPDATE exchanges SET `memberB` = ? WHERE `memberB` = ?', [id, member.id]);
    await Database.query('UPDATE flocks SET `member` = ? WHERE `member` = ?', [id, member.id]);
    await Database.query('UPDATE member_settings SET `member` = ? WHERE ?', [id, member.id]);
    await Database.query('UPDATE member_variants SET `member` = ? WHERE ?', [id, member.id]);
    await Database.query('UPDATE tiers SET `member` = ? WHERE `member` = ?', [id, member.id]);
    await Database.query('UPDATE wishlist SET `member` = ? WHERE `member` = ?', [id, member.id]);
  }

  process.exit(0);
})();
