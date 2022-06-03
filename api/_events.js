const secrets = require('../secrets.json');

const Database = require('../helpers/database.js');
const https = require('https');

module.exports = async (req, res) => {
  return new Promise((resolve, reject) => {
    var timeMin = new Date();
    var timeMax = new Date();

    timeMax.setMonth(timeMin.getMonth() + 1);

    https.get(`https://www.googleapis.com/calendar/v3/calendars/rlcqglcgbhotqam5inja7jttjc@group.calendar.google.com/events?key=${secrets.GOOGLE.API_KEY}&timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}`, (response) => {
      var data = "";

      response
        .on('data', (chunk) => {
          return data += chunk;
        })
        .on('end', async () => {
          let promises = [];

          data = JSON.parse(data);

          for (let item of data.items) {
            promises.push(Database.replace('events', {
              id: item.iCalUID,
              name: item.summary,
              description: item.description.replace(/\<em\>\<i\>/g, '*').replace(/\<\/i\>\<\/em\>/g, '*').replace(/\<br\>/g, "\r\n"),
              startDate: item.start.date,
              endDate: item.end.date
            }));
          }

          Promise.all(promises).then(() => {
            res.json();
          });
        });
    });
  });
};
