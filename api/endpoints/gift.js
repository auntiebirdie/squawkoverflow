const Member = require('../models/member.js');
const MemberPet = require('../models/memberpet.js');

const Webhook = require('../helpers/webhook.js');

module.exports = async (req, res) => {
  if (!req.body.loggedInUser) {
    return res.sendStatus(401);
  }

  let memberpet = new MemberPet(req.body.memberpet);

  await memberpet.fetch();

  let fromMember = new Member(req.body.loggedInUser);
  let toMember = new Member(req.body.member);

  if (memberpet.member == fromMember.id) {
    await Promise.all([
      fromMember.fetch(),
      toMember.fetch()
    ]);

    if (toMember.settings.general?.includes('updateWishlist')) {
      await toMember.updateWishlist(memberpet.species.speciesCode, "remove");
    }

    await memberpet.set({
      member: toMember.id,
      flocks: "NONE",
      friendship: 0
    });

    await Webhook('exchange', {
      content: `${fromMember.username} has sent <@${toMember.id}> a gift!`,
      embeds: [{
        title: memberpet.species.commonName,
        description: memberpet.label || " ",
        url: `https://squawkoverflow.com/birdypet/${memberpet.id}`,
        image: {
          url: memberpet.image
        }
      }]
    });

    return res.sendStatus(200);
  } else {
    return res.sendStatus(404);
  }
};