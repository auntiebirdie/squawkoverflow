const Flock = require('../models/flock.js');

const Redis = require('../helpers/redis.js');

module.exports = async (req, res) => {
  let flock = new Flock(req.query?.id || req.body?.id);

  switch (req.method) {
    case "GET":
      await flock.fetch(req.query);

      res.json(flock);
      break;
    case "PUT":
      await flock.set(req.body);

      res.sendStatus(200);
      break;
    case "POST":
      if (!req.body.loggedInUser) {
        return res.sendStatus(401);
      }

      await flock.create({
        name: req.body.name,
        description: req.body.description,
        member: req.body.loggedInUser
      });

      res.json(flock.id);
      break;
    case "DELETE":
      await flock.fetch();

      if (flock.member == req.body.loggedInUser) {
        await Redis.delete('flock', req.body.id);

        res.sendStatus(200);
      } else {
        res.sendStatus(403);
      }
      break;
  }
};
