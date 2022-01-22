const Counters = require('../helpers/counters.js');

module.exports = (req, res) => {
  Counters.get(req.query.kind, req.query.member, req.query.id).then((count) => {
    res.json(count);
  });
};
