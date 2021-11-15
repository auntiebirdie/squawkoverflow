const Cache = require('../helpers/cache.js');
const Database = require('../helpers/database.js');
const Redis = require('../helpers/redis.js');

const secrets = require('../secrets.json');

const {
  v1
} = require('@google-cloud/pubsub');
const subClient = new v1.SubscriberClient();

async function refresh() {
  const formattedSubscription = subClient.subscriptionPath(
    process.env.GCP_PROJECT,
    'squawkoverflow-free-birds'
  );

  const request = {
    subscription: formattedSubscription,
    maxMessages: 100
  };

  const [response] = await subClient.pull(request);

  for (let queued of response.receivedMessages) {
    console.log(queued);

    Redis.databases['cache'].sadd(`cache:freebirds`, queued.ackId);

    Redis.databases['cache'].set(`freebird:${queued.ackId}`, queued.message.attributes.birdypet);
  }

  process.exit(0);
}

refresh();