const Database = require('../helpers/database.js');

(async () => {
    /* New Day New Wishlist! */
    await Database.query('UPDATE counters SET `count` = 0 WHERE type = "wishlist"');

    /* Happy BirdDay! */
    let members = await Database.query('SELECT birthday_date.member id, birthday_date.value birthday_date, birthday_month.value birthday_month FROM member_settings AS birthday_date JOIN member_settings AS birthday_month ON (birthday_date.member = birthday_month.member) WHERE birthday_date.setting = "birthday_date" AND birthday_month.setting = "birthday_month"');

    for (let member of members) {
      let birthday = new Date();
      birthday.setMonth(member.birthday_month);
      birthday.setDate(member.birthday_date);

      if (birthday.toDateString() == new Date().toDateString()) {
        let claimed = await Database.getOne('counters', {
          member: member.id,
          type: 'birthday',
          id: new Date().getYear()
        });

        if (claimed != 1) {
          await Database.create('notifications', {
            id: Database.key(),
            member: member.id,
            type: 'birthday'
          });
        }
      }
    }

	process.exit(0);
})();
