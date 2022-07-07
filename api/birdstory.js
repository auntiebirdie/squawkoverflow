const Database = require('../helpers/database.js');
const Member = require('../models/member.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      var birdstory = await Database.query('SELECT * FROM birdypet_story WHERE birdypet = ? ORDER BY `when` DESC', [req.query.birdypet]);
      let promises = [];

      for (let result of birdstory) {
	      console.log(result);
        if (result.who == "SQUAWK") {
          result.who = {
            username: 'SQUAWKoverflow'
          };
        } else {
          result.who = new Member(result.who);
          promises.push(result.who.fetch().catch((err) => { }));
        }

        if (result.who2) {
          result.who2 = new Member(result.who2);
          promises.push(result.who2.fetch());
        }
      }

      Promise.all(promises).then(() => {
        res.json(birdstory);
      });
      break;
    default:
      return res.error(405);
  }
};
