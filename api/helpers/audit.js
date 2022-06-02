const Database = require('./database.js');
const Member = require('../models/member.js');
const Webhook = require('./webhook.js');

class Audit {
  log(action, data) {
    return new Promise((resolve, reject) => {
      Database.create('audit', {
        action: action,
        data: data
      }).then(async (result) => {
        var member = new Member(data.loggedInUser);

        await member.fetch();

        delete data.loggedInUser;

        Webhook('audit', {
          content: " ",
          embeds: [{
            title: member.username + ' - ' + action,
            url: `https://squawkoverflow.com/members/${member.id}`,
            fields: Object.entries(data).map(([key, value]) => {
              return {
                name: key,
                value: value,
                inline: false
              }
            })
          }]
        });

        resolve();
      });
    });
  }
}

module.exports = new Audit;
