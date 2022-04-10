const API = require('../helpers/api.js');

const fs = require('fs');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  API.call('notifications', "GET", {
    loggedInUser: req.session.user,
    page: req.query.page
  }, res).then((response) => {
    const notifications = response.results;
    const stickers = ["bird_4359609.png", "bird_4359669.png", "bird_4359689.png", "bird_4359824.png", "bird_4433234.png", "cactus_4359655.png", "duck_4359767.png", "love-birds_4289413.png", "love-birds_4403057.png", "parrot_4359923.png"];

    for (let notification of notifications) {
      notification.text = '<p class="mt-3">';

      switch (notification.type) {
        case 'site_update':
          notification.icon = '<img src="/img/SQUAWK.png">';
          notification.text += `<a href="${notification.data.url}" target="_blank">Site Update - ${notification.data.title}</a>`;
          break;
        case 'birdypet_gift':
          notification.icon = '🎁';
          notification.text += notification.data.from.username ? `<a href="/members/${notification.data.from.id}">${notification.data.from.username}</a>` : 'Someone';
          notification.text += ' sent you ';
          notification.text += notification.data.birdypet.variant ? `<a href="/birdypet/${notification.data.birdypet.id}">${notification.data.birdypet.nickname || notification.data.birdypet.bird.commonName}</a>` : 'a gift';
          notification.text += '!';

          if (!notification.data.thanked) {
            notification.text += `</p><p>`;

            notification.text += `
                <div class="dropdown">
                  <button class="btn btn-secondary dropdown-toggle" type="button" id="thanksDropdown_${notification.id}" data-bs-toggle="dropdown" aria-expanded="false">
                    Say Thanks!
                  </button>
                  <ul class="dropdown-menu" aria-labelledby="thanksDropdown_${notification.id}">
              `;

            for (let sticker of stickers) {
              notification.text += `<li class="d-inline-block m-3" role="button" data-action="thank" data-json-flair="${sticker}"><img src="https://storage.googleapis.com/squawkoverflow/stickers/${sticker}" width="100"></li>`;
            }

            notification.text += `
                  </ul>
                </div>
              `;
          }
          break;
        case 'gift_thanks':
          if (notification.data.flair) {
            notification.icon = `<img src="https://storage.googleapis.com/squawkoverflow/stickers/${notification.data.flair}">`;
          } else {
            notification.icon = '❤️';
          }
          notification.text += notification.data.from.username ? `<a href="/members/${notification.data.from.id}">${notification.data.from.username}</a>` : 'Someone';
          notification.text += ` thanks you for a gift you sent ${notification.data.from.username ? notification.data.from.preferredPronoun.cases.object : 'them'}!`;
          break;
        case 'birthday':
          notification.icon = '<img src="https://storage.googleapis.com/squawkoverflow/stickers/unboxing_5784126.png">';
          notification.text += 'Head to the <a href="/birdypedia">Birdypedia</a> to pick your celebratory BirdyPet!';
          break;
        case 'birthday_retro':
          notification.icon = '<img src="https://storage.googleapis.com/squawkoverflow/stickers/unboxing_5784126.png">';
          notification.text += 'You had a birthday this year!  Head to the <a href="/birdypedia">Birdypedia</a> to pick your celebratory BirdyPet!';
          break;
        case 'other':
          notification.icon = `<img src="https://storage.googleapis.com/squawkoverflow/stickers/${notification.data.flair}">`;

          notification.text += notification.data.text;
          break;
      }

      notification.text += '</p>';
    }

    res.render('notifications/index', {
      notifications: notifications,
      totalPages: Math.ceil(response.totalResults / 25),
      currentPage: Math.max(req.query.page || 1, 1)
    });
  }).catch((err) => {
    console.log(err);
    res.render('error/404', {
      error: true
    });
  });
});

module.exports = router;
