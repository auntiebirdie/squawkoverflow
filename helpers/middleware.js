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
      return next(`enttiy ${kind}:${req.params[kind]} not found`);
    }

    req.entities[kind] = entity;
  }

  next();
}

Middleware.prototype.userOwnsEntity = function(req, res, next) {
  for (let kind in req.entities) {
    let entity = req.entities[kind];

    if (entity.member != req.session.user.id) {
      return next(`entity ${kind}:${entity[Datastore.KEY].id} does not belong to user ${req.session.user.id}`);
    }
  }

  return next();
};

module.exports = new Middleware()
