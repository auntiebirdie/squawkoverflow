const {
  v1
} = require('@google-cloud/pubsub');
const subClient = new v1.SubscriberClient();

const BirdyPet = require('../models/birdypet.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "GET":
      const formattedSubscription = subClient.subscriptionPath(
        'bot-central',
        'squawkoverflow-free-birds'
      );

      const request = {
        subscription: formattedSubscription,
        maxMessages: req.query.limit || 24
      };

      const [response] = await subClient.pull(request);

      var data = [];

      for (let queued of response.receivedMessages) {
        let birdypet = new BirdyPet(queued.message.attributes.birdypet);

	if (req.query.loggedInUser) {
          await birdypet.fetchMemberData(req.query.loggedInUser);
	}

        birdypet.ackId = queued.ackId;

        data.push(birdypet);
      }

      return res.json({
	      totalPages: 0,
	      results: data
      });
      break;
    default:
      return res.sendStatus(405);
  }
};
