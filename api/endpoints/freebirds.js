const {
  v1
} = require('@google-cloud/pubsub');
const subClient = new v1.SubscriberClient();

const BirdyPet = require('../models/birdypet.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      const formattedSubscription = subClient.subscriptionPath(
        'squawkoverflow',
        'free-birds'
      );

      const limit = req.query?.limit || 24;

      const request = {
        subscription: formattedSubscription,
        maxMessages: limit
      };

      var data = [];
      let ackIds = [];
      let tries = 0;

      do {
        const [response] = await subClient.pull(request);

        for (let queued of response.receivedMessages) {
          if (ackIds.indexOf(queued.ackId) === -1) {
            let birdypet = new BirdyPet(queued.message.attributes.birdypet);

            if (req.query?.loggedInUser) {
              await birdypet.fetchMemberData(req.query.loggedInUser);
            }

            birdypet.ackId = queued.ackId;

            data.push(birdypet);
            ackIds.push(queued.ackId);

            if (data.length == limit) {
              break;
            }
          }
        }
      }
      while (data.length < limit && tries++ < 5)

      return res.json({
        totalPages: 0,
        results: data
      });
      break;
    default:
      return res.sendStatus(405);
  }
};
