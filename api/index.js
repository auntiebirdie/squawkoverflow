exports.api = (req, res) => {
  const bunyan = require('bunyan');
  const {
    LoggingBunyan
  } = require('@google-cloud/logging-bunyan');
  const loggingBunyan = new LoggingBunyan();

  req.logger = bunyan.createLogger({
    name: process.env.NODE_ENV == 'PROD' ? 'squawkoverflow' : 'squawkdev',
    streams: [{
      stream: process.stdout,
      level: 'info'
    }, loggingBunyan.stream('info')]
  });

  try {
    let route = req.path.match(/\/?(\b[A-Za-z\_]+\b)/)[0];

    var data = (req.method == "GET" || req.method == "HEAD") ? req.query : req.body;

    for (let key in data) {
      data[key] = JSON.parse(data[key]);
    }

    req.logger.info({
      req: {
	      method: req.method,
	      url: req.path,
	      headers: req.headers,
	      data: data
      }
    }, `/${req.method} ${req.path} ${JSON.stringify(Object.fromEntries(Object.entries(data).filter((a) => ["id", "member", "loggedInUser"].includes(a[0]) )))}`);

    require(`./endpoints/${route}.js`)(req, res);
  } catch (err) {
    console.error(err);
    res.sendStatus(404);
  }
}

exports.background = (message, context) => {
  const PubSub = require('./helpers/pubsub.js');

  return PubSub.receive(message, context);
}

exports.bug = async (req, res) => {
  const header = `
  <!DOCTYPE html>
  <html lang="en" style="height: 100%; margin: 0; padding: 0;">

  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SQUAWKoverflow</title>
    <link href="https://fonts.googleapis.com/css?family=Open+Sans:300,300i,400,400i,600,600i,700,700i|Raleway:300,300i,400,400i,500,500i,600,600i,700,700i|Poppins:300,300i,400,400i,500,500i,600,600i,700,700i" rel="stylesheet">
  </head>
  <body style="height: 100%; margin: 0; padding: 0; color: #eeeeee; font-size: calc(1.3rem + .6vw); background-size: cover; background-repeat: no-repeat; background-image: url('https://images.unsplash.com/photo-1591123383324-9f67589669ca?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwyNTk0OTB8MHwxfHJhbmRvbXx8fHx8fHx8fDE2MzE2NDgxODY&ixlib=rb-1.2.1&q=80&w=1080'); background-position: center center; font-family: system-ui,-apple-system,\"Segoe UI\",Roboto,\"Helvetica Neue\",Arial,\"Noto Sans\",\"Liberation Sans\",sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\",\"Segoe UI Symbol\",\"Noto Color Emoji\";">
  `;

  const footer = `
    </div>
  </body>
  </html>
	`;

  var content = '<div style="padding: 1em; margin: 1.5rem auto 3rem; max-width: 720px; background-color: #202123; text-align: center;">';

  console.log(req.method, req.headers['x-appengine-user-ip'], req.headers['user-agent']);

  function printForm(req) {
    return new Promise(async (resolve, reject) => {
      var output = '<h1 style="padding: .5rem; margin: 0; border-bottom: 5px solid #DDF600; font-size: calc(1.375rem + 1.5vw); font-family: "Raleway", sans-serif;">A Bug!!</h1>';

      output += '<p>Report the bug you found using this form to receive a bug on SQUAWKoverflow that you can feed to your birds or use as bait to attract wishlisted birds.</p>';

      output += '<form method="POST">';

      output += '<p>The bug will be awarded to: ';

      if (req.query.member) {
        try {
          const Database = require('./helpers/database.js');

          await Database.getOne('members', {
            id: req.query.member
          }).then((member) => {
            output += `<strong>${member.username} (${member.id})</strong>`;
            output += `<input type="hidden" value="${member.username}" name="memberName">`;
            output += `<input type="hidden" value="${member.id}" name="memberId">`;
          });
        } catch (err) {
          output += '<em>No member detected.</em>';
          output += '<input type="hidden" value="unknown member" name="memberName">';
          output += `<input type="hidden" value="${req.headers["x-appengine-user-ip"]}" name="memberId">`;
        }
      } else {
        output += '<em>No member detected.</em>';
      }

      output += '</p>';
      output += '<p>Please try to describe what happened or share any other information about the bug you found. <em>(at least 25 characters)</em></p>';

      if (req.method == "POST") {
        output += '<p><em>Sorry, but please include a few words describing the bug so it can be tracked down.</em></p>';
      }

      output += '<p><textarea name="description" minlength="25" style="min-width: 250px; width: 50%; height: 150px; filter: brightness(.80); border-radius: .25rem;"></textarea></p>';

      output += '<p><button style="background-color: #444D00; border-color: #444D00; padding: .5rem 1rem; font-size: 1.25rem; border-radius: .3rem; color: #fff;">🐛 Submit Bug Report</button></p>';
      output += '</form>';

      return resolve(output);
    });
  }

  switch (req.method) {
    case "GET":
      content += await printForm(req);
      break;
    case "POST":
      if (req.body.description) {
        const secrets = require('./secrets.json');
        const Trello = require("node-trello");

        const trello = new Trello(secrets.TRELLO.KEY, secrets.TRELLO.TOKEN);

        content += await new Promise((resolve, reject) => {
          trello.post("/1/cards", {
            name: req.body.description,
            desc: req.body.description + `\r\n\r\nReported by ${req.body.memberName} (${req.body.memberId})`,
            idList: '616863d9071f1c88feb22769'
          }, async function(err, card) {
            var output = `<p style="text-align: center;">Thank you for your report!`;

            if (req.body.memberId) {
              const Database = require('./helpers/database.js');

              await Database.getOne('members', {
                id: req.body.memberId
              }).then(async (member) => {
                if (member.id) {
                  await Database.set('members', {
                    id: member.id
                  }, {
                    bugs: (member.bugs * 1) + 1
                  });

                  output += ' Enjoy your bug! You can feed it to one of your birds or use it as bait to attract wishlisted birds.';

                  const Webhook = require('./helpers/webhook.js');

                  var bugs = [
                    "https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/openmoji/292/bug_1f41b.png",
                    "https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/openmoji/292/ant_1f41c.png",
                    "https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/openmoji/292/beetle_1fab2.png",
                    "https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/openmoji/292/lady-beetle_1f41e.png",
                    "https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/openmoji/292/cricket_1f997.png",
                    "https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/openmoji/292/mosquito_1f99f.png"
                  ];

                  Webhook('bugs', {
                    content: " ",
                    embeds: [{
                      title: "A bug!!",
                      description: `<@${member.id}> found a bug!!\r\n\r\n\`${req.body.description}\``,
                      url: card.url,
                      thumbnail: {
                        url: bugs.sort(() => .5 - Math.random())[0]
                      }
                    }]
                  });
                }
              });
            }
            output += '</p>';

            output += `<p class="text-align: center;">You can <a href="${card.url}" style="text-decoration: none; color: #a0b300;">track the progress of your report on Trello</a> (no account required).</p>`;

            return resolve(output);
          });
        });
      } else {
        content += await printForm(req);
      }
      break;
  }

  res.status(200).send(header + content + footer);
};
