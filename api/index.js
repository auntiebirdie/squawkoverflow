exports.api = (req, res) => {
  if (req.query?.sort && req.query.sort == "[null]") {
    delete req.query.sort;
  }

  try {
    let route = req.path.match(/\/?(\b[A-Za-z\_]+\b)/)[0];

    var data = (req.method == "GET" || req.method == "HEAD") ? req.query : req.body;

    for (let key in data) {
      data[key] = JSON.parse(data[key]);
    }

    console.log(req.method, route, data);

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
  </head>
  <body style="height: 100%; margin: 0; padding: 0; background-size: cover; background-repeat: no-repeat; background-image: url('https://images.unsplash.com/photo-1591123383324-9f67589669ca?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwyNTk0OTB8MHwxfHJhbmRvbXx8fHx8fHx8fDE2MzE2NDgxODY&ixlib=rb-1.2.1&q=80&w=1080'); background-position: center center;">
  `;

  const footer = `
    </div>
  </body>
  </html>
	`;

  var content = `
    <div style="display: flex; justify-content: center; align-items: center; text-align: center; min-height: 100%;">
      <div style="padding: 2em; background: rgba(200, 200, 200, .90);">
  `;

  console.log(req.method, req.headers['x-appengine-user-ip'], req.headers['user-agent']);

  function printForm(req) {
    return new Promise(async (resolve, reject) => {
      var output = `
      <h3>A bug!!</h3>
      
      <p>Report the bug you found using this form to receive a bug on SQUAWKoverflow that you can feed to your birds or use as bait to attract wishlisted birds.</p>

      <form method="POST">

      <p>The bug will be awarded to:
      `;

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

      output += `
        </p>
	<br>
        <p>Please try to describe what happened or share any other information about the bug you found. <em>(at least 25 characters)</em></p>
    `;

      if (req.method == "POST") {
        output += '<p><em>Sorry, but please include a few words describing the bug so it can be tracked down.</em></p>';
      }

      output += `
        <p><textarea name="description" minlength="25" style="min-width: 250px; width: 50%; height: 150px;"></textarea></p>

        <button>Submit Bug Report</button>
      </form>
     `;

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

            output += `<p class="text-align: center;">You can <a href="${card.url}">track the progress of your report on Trello</a> (no account required).</p>`;

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
