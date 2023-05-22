const secrets = require('../secrets.json');
const Database = require('../helpers/database.js');

const https = require('https');

(async () => {
  +
  let siteMembers = await Database.query('SELECT members.id `member`, members.username, members.supporter, member_auth.id FROM members LEFT JOIN member_auth ON (members.id = member_auth.member AND member_auth.provider = "patreon")');

  function fetchPatrons(url, patrons = []) {
    let confirmedPatrons = [];

    return new Promise((resolve, reject) => {
      var request = https.request(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Bearer ' + secrets.PATREON.CLIENT_TOKEN
          },
        },
        (response) => {
          var data = "";

          response.on('data', (chunk) => {
            data += chunk;
          });

          response.on('end', () => {
            resolve(JSON.parse(data));
          });
        });

      request.end();
    }).then((response) => {
      patrons = [...patrons, ...response.data];

      if (response.links?.next) {
        return fetchPatrons(response.links.next, patrons);
      } else {
        return patrons;
      }
    });
  }

  fetchPatrons("https://api.patreon.com/oauth2/v2/campaigns/7271266/members?include=user&fields%5Bmember%5D=patron_status").then(async (patrons) => {
    for (let patron of patrons) {
      let siteMember = siteMembers.find((siteMember) => siteMember.id == patron.relationships.user.data.id);

      if (siteMember) {
        confirmedPatrons.push(siteMember.member);

        if (patron.attributes.patron_status == 'active_patron') {
          await Promise.all([
            Database.query('UPDATE members SET supporter = 1 WHERE id = ? AND supporter < 5', [siteMember.member]),
            Database.query('INSERT IGNORE INTO member_badges VALUES (?, "patreon", NOW())', [siteMember.member]),
            Database.query('INSERT IGNORE INTO member_titles VALUES (?, 5)', [siteMember.member])
          ]);
        } else {
          await Promise.all([
            Database.query('UPDATE members SET supporter = 0 WHERE id = ? AND supporter < 5', [siteMember.member]),
            Database.query('DELETE FROM member_badges WHERE `member` = ? AND `badge` = "patreon"', [siteMember.member])
          ]);
        }
      } else if (patron.attributes.patron_status == 'active_patron') {
        console.log(`https://www.patreon.com/user/creators?u=${patron.relationships.user.data.id}`);
      }
    }

    let expiredPatrons = siteMembers.filter((siteMember) => siteMember.supporter == 1 && !confirmedPatrons.includes(siteMember.member));

    for (let siteMember of expiredPatrons) {
      await Promise.all([
        Database.query('UPDATE members SET supporter = 0 WHERE id = ? AND supporter < 5', [siteMember.member]),
        Database.query('DELETE FROM member_badges WHERE `member` = ? AND `badge` = "patreon"', [siteMember.member])
      ]);
    }

    process.exit(0);
  }).catch((err) => {
    console.error(err);

    process.exit(0);
  });
})();