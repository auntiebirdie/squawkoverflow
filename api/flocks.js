const Flocks = require('../collections/flocks.js');
const Database = require('../helpers/database.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      var flocks = await Flocks.all(req.query.id, { include: ['totals'] });

      res.json(flocks);
      break;
    case "PUT":
      var flocks = req.body.flocks;
      var promises = [];

      for (let flock in flocks) {
        promises.push(Database.set('flocks', {
          id: flock,
          member: req.body.loggedInUser
        }, {
          displayOrder: flocks[flock]
        }));
      }

      Promise.all(promises).then(() => {
        res.ok();
      });
      break;
  }
};
