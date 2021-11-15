const secrets = require('../secrets.json');

const {
  PubSub
} = require('@google-cloud/pubsub');
const pubSubClient = new PubSub();

function Queue() {}

Queue.prototype.add = function(channel, data) {
  return new Promise((resolve, reject) => {
    data.source = "WEB";

    pubSubClient.topic(`squawkoverflow-${channel}`).publish(Buffer.from(""), data).then((response) => {
      resolve();
    });
  });
};

module.exports = new Queue();