function Middleware() {}

Middleware.prototype.isLoggedIn = function(req, res, next) {
  if (req.session.user || req.headers['user-agent'] == 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)') {
    next();
  } else {
    res.redirect('/login');
  }
}

module.exports = new Middleware()
