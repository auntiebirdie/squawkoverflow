"use strict";

const Counters = require('../helpers/counters.js');

const Members = require('../collections/members.js');

module.exports = async (req, res) => {
  // confirm this came from cloud scheduler
  return new Promise((resolve, reject) => {
    let members = new Members();

    members.all().then(async (members) => {
      var birds = require('../data/birds.json');
      var eggs = require('../data/eggs.json');

      for (let member of members) {
        if (member.active) {
          let promises = [];
          console.log(`Refreshing cache for ${member.id}`);

          for (let bird of birds) {
            promises.push(Counters.refresh('species', member.id, bird.speciesCode));
          }

          await Promise.all(promises);

          promises = [];

          for (let egg in eggs) {
            promises.push(Counters.refresh('eggs', member.id, egg));
          }

          await Promise.all(promises);
        }
      }

      resolve();
    });
  }).then(() => {
    console.log("DONE!");
    return res.sendStatus(200);
  });
};