const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  res.render('notifications/index', {
    page: 'notifications',
    notificationTypes: [{
      "id": "birdypet_gift",
      "label": "Gifts"
    }, {
      "id": "birdypet_gift-unthanked",
      "label": "Gifts (Not Thanked)"
    }, {
      "id": "birdypet_gift-thanked",
      "label": "Gifts (Thanked)"
    }, {
      "id": "gift_thanks",
      "label": "Thanks"
    }, {
      "id": "exchange_accepted",
      "label": "Exchanges"
    }, {
      "id": "site_update",
      "label": "Site Updates"
    }, {
      "id": "other",
      "label": "Other"
    }],
    currentPage: Math.max(req.query.page || 1, 1),
    sidebar: 'notifications'
  });
});

module.exports = router;
