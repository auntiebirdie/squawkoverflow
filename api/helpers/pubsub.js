const {
  PubSub
} = require('@google-cloud/pubsub');

module.exports = function(topic, action, body) {
  return new Promise((resolve, reject) => {
    const pubsub = new PubSub();

    const data = {
      ...body,
      action
    };

    pubsub.topic(topic).publish(Buffer.from(JSON.stringify(data))).then(() => {
      resolve();
    });
  });
}
