const {
  PubSub
} = require('@google-cloud/pubsub');

module.exports = function(topic, action, body) {
  return new Promise((resolve, reject) => {
    const pubsub = new PubSub();

    const data = JSON.stringify({
      ...body,
      action
    });

    pubsub.topic(topic).publish(Buffer.from(data)).then(() => {
      resolve();
    });
  });
}
