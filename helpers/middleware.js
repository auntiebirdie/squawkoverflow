const Redis = require('./redis.js');

function Middleware() {}

Middleware.prototype.isLoggedIn = function(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
}

Middleware.prototype.entityExists = async function(req, res, next) {
  req.entities = {};

  for (let kind in req.params) {
    let entity = await Redis.get(kind, req.params[kind]);

    if (!entity) {
      return next(`entity ${kind}:${req.params[kind]} not found`);
    }

    switch (kind) {
      case "member":
        var Members = require('./members.js');
        entity = Members.format(entity);
        break;
    }

    req.entities[kind] = entity;
  }

  next();
}

Middleware.prototype.userOwnsEntity = function(req, res, next) {
  for (let kind in req.entities) {
    let entity = req.entities[kind];

    if (entity.member != req.session.user) {
      return next(`entity ${kind}:${entity._id} does not belong to user ${req.session.user}`);
    }
  }

  return next();
};

module.exports = new Middleware()
