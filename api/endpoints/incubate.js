const Database = require('../helpers/database.js');

const Member = require('../models/member.js');
const Variant = require('../models/variant.js');

const {
  Storage
} = require('@google-cloud/storage');
const storage = new Storage();
const bucket = storage.bucket('squawkoverflow');

module.exports = async (req, res) => {
  if (!req.body?.loggedInUser && !req.query?.loggedInUser) {
    return res.sendStatus(401);
  }

  switch (req.method) {
    case "GET":
      let promises = [];

      var results = await Database.get('member_variants', {
        member: req.query.loggedInUser
      }).then((results) => {
        return results.map((result) => {
          result = new Variant(result.variant);

          promises.push(result.fetch());

          return result;
        });
      });

      Promise.all(promises).then(() => {
        res.json(results);
      });
      break;
    case "POST":
      var variant = new Variant(req.body.egg);

      await variant.fetch();

      return res.json(variant);
      break;
    default:
      return res.sendStatus(405);
  }
};
