const BirdyPet = require('../models/birdypet.js');
const Database = require('../helpers/database.js');
const Member = require('../models/member.js');
const PubSub = require('../helpers/pubsub.js');

module.exports = (req, res) => {
  let promises = [];

  return new Promise(async (resolve, reject) => {
    let member = new Member(req.body.loggedInUser);

    await member.fetch({
      include: ['auth']
    });

    if (member.happyBirdday && member.birthdayPresentClaimed != 1) {
      promises.push(Database.query('INSERT INTO counters VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE count = 1', [member.id, 'birthday', new Date().getYear(), 1]));

      let birdypet = new BirdyPet();
      let variant = await Database.getOne('variants', {
        species: req.body.birthday,
        special: 0
      });

      await birdypet.create({
        variant: variant.id,
        member: member.id
      });

      PubSub.publish('background', 'COLLECT', {
        member: member.id,
        birdypet: birdypet.id,
        variant: variant.id,
        birthday: true
      });

      await Promise.all(promises).then(() => {
        res.json(birdypet.id);
      });
    } else {
      res.status(404).send("It's not your birthday!");
    }
  });
};
