const Database = require('../helpers/database.js');
const Member = require('../models/member.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      var badges = await Database.get('badges', null, { order : 'displayOrder' });

      var member = new Member(req.query.member);

      await member.fetch({
        include: ['badges']
      }).catch((err) => {
        console.log(err);
      });

      if (req.query.format == "html") {
        var html = "";

        for (let badge of badges) {
          let memberBadge = member.badges.find((bdg) => bdg.id == badge.id);

          html += '<div class="row align-items-center mb-2">';
          html += '<div class="col-2 text-center">';
          html += `<img src="https://storage.googleapis.com/squawkoverflow/badges/${badge.id}.png" class="${memberBadge ? '' : 'grayscale'}">`;
          html += '</div>';
          html += `<div class="col-10 ${memberBadge ? '' : 'text-muted'}">`;
          html += badge.name.replace(' ([COUNTER])', '');
          html += '</div>';
          html += '</div>';
        }

        res.send(html);
      } else {
        return res.json(badges);
      }
      break;
    default:
      return res.sendStatus(405);
  }
};
