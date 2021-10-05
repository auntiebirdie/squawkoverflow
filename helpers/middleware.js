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
  if (req.baseUrl == "/api") {
    req.entities = {};

    for (let kind in req.params) {
      let entity = await Redis.get(kind, req.params[kind]);

      if (!entity) {
        return next(`enttiy ${kind}:${req.params[kind]} not found`);
      }

      req.entities[kind] = entity;
    }

    next();
  } else {
    var kind;

    switch (req.baseUrl) {
      case "/aviary":
      case "/member":
      case "/members":
        kind = 'member';
        break;
      case "/birdypet":
        kind = "memberpet";
        break;
      case "/flocks":
        kind = "flock";
        break;
      default:
        return next(`unknown entity kind for ${req.baseUrl}`);
    };

    Redis.get(kind, req.params.id).then((entity) => {
      if (entity) {
        req.entity = entity;
        next();
      } else {
        next(`entity ${kind}:${req.params.id} not found`);
      }
    });
  }
}

Middleware.prototype.userOwnsEntity = function(req, res, next) {
  if (req.entity) {
    if (req.entity.member == req.session.user.id) {
      next();
    } else {
      next(`entity ${req.entity._id} does not belong to user ${req.session.user.id}`);
    }
  } else if (req.entities) {
    for (let kind in req.entities) {
      let entity = req.entities[kind];

      if (entity.member != req.session.user.id) {
        return next(`entity ${kind}:${entity[Datastore.KEY].id} does not belong to user ${req.session.user.id}`);
      }
    }

    return next();
  }
};

module.exports = new Middleware()
