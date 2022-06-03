const {
  Storage
} = require('@google-cloud/storage');

const storage = new Storage();
const bucket = storage.bucket('squawkoverflow');
const jimp = require('jimp');
const hash = require('object-hash');
const Database = require('./database.js');

class Birdatar {
  generate(member) {
    return new Promise((resolve, reject) => {
      Database.getOne('member_settings', {
        member: member,
        setting: 'birdatar'
      }).then(async (settings) => {
        var url = 'https://storage.googleapis.com/squawkoverflow';
        var filename = `birdatar/users/${member.charAt(0)}/${member}.png`;
        var file = bucket.file(filename);
        var layers = require('../data/birdatar.json');

        var base = await new jimp(256, 256);
        var selectedComponents = {};

        try {
          selectedComponents = JSON.parse(settings.value);
        } catch (err) {
          var rand = require('random-seed').create(member);

          for (let layer of layers) {
            selectedComponents[layer.id] = rand(layer.components - 1) + 1;
          }
        }

        for (let layer of layers) {
          layer = await jimp.read(`${url}/birdatar/${layer.id}/${selectedComponents[layer.id]}.png`);

          base.composite(layer, 0, 0);
        }

        base.getBuffer(jimp[`MIME_PNG`], async (err, buff) => {
          await file.save(buff);

          await Database.set('members', {
            id: member
          }, {
            avatar: `${url}/${filename}?${hash(selectedComponents)}`
          });

          resolve();
        });
      });
    });
  }
}

module.exports = new Birdatar;
