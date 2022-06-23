const API = require('./helpers/api.js');
const express = require('express');
const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({
  extended: true
}));

app.use(require('./helpers/session.js'));

app.use(async function(req, res, next) {
  if (req.session.user) {
    res.locals.loggedInUser = await API.call('member', 'GET', {
      id: req.session.user,
      include: ['exchangeData']
    }).catch((err) => {
      console.log(err);
    });
  }

  res.locals.siteMenu = [{
    "icon": "🏠",
    "label": "Home",
    "href": "https://squawkoverflow.com"
  }, {
    "icon": "💬",
    "label": "Discord",
    "href": "https://discord.com/invite/h87wansdg2",
    "newWindow": true
  }];

  next();
});

app.get('/', (req, res) => {
  res.render('bugs/index.ejs', {
    title: 'Report a Bug'
  });
});

app.post('/', (req, res) => {
  const secrets = require('./secrets.json');
  const Database = require('./helpers/database.js');
  const Trello = require('node-trello');
  const trello = new Trello(secrets.TRELLO.KEY, secrets.TRELLO.TOKEN);

  new Promise(async (resolve, reject) => {
    var member = null;

    if (req.body.memberId) {
      member = await Database.query('SELECT members.id, member_auth.id discord, members.bugs FROM members LEFT JOIN member_auth ON (members.id = member_auth.member AND member_auth.provider = "discord") WHERE members.id = ? LIMIT 1', [req.body.memberId]);

      if (member.id) {
        await Database.set('members', {
          id: member.id
        }, {
          bugs: (member.bugs * 1) + 1
        });

        await Database.query('INSERT IGNORE INTO member_badges VALUES (?, "bug", NOW())', [member.id]);
      }
    }

    trello.post("/1/cards", {
      name: req.body.description,
      desc: req.body.description + `\r\n\r\nReported by ${req.body.memberName} (${req.body.memberId})`,
      idList: '616863d9071f1c88feb22769'
    }, async function(err, card) {
      if (member) {
        const Webhook = require('./api/helpers/webhook.js');

        var bugs = require('./api/data/bugs.json');

        Webhook('bugs', {
          content: " ",
          embeds: [{
            title: "A bug!!",
            description: `<@${member.discord}> found a bug!!\r\n\r\n\`${req.body.description}\``,
            url: card.url,
            thumbnail: {
              url: bugs.sort(() => .5 - Math.random())[0]
            }
          }]
        });
      }

      res.render('bugs/reported.ejs', {
        title: 'Bug Reported',
        member: member,
        card: card
      });
    });
  }).catch((err) => {
    console.error(err);

    res.render('bugs/index.ejs', {
      title: 'Report a Bug',
      displayError: 'Something went wrong saving your bug report, but the developer has been alerted and will find your report in the logs!'
    });
  });
});

app.listen(8065);
