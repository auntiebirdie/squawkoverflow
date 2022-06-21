const Database = require('../helpers/database.js');
const Member = require('../models/member.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      var birdstory = await Database.query('SELECT * FROM birdypet_story WHERE birdypet = ? ORDER BY `when` DESC'), [req.query.birdypet]);
      let promises = [];

console.log(birdstory);

      for (let result of birdstory) {
        result.who = new Member(result.who);
        promises.push(result.who.fetch());
      }

      Promise.all(promises).then(() => {
        res.json(birdstory);
      });
      break;
    default:
      return res.error(405);
  }
};
