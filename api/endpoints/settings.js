const Database = require('../helpers/database.js');

module.exports = async (req, res) => {
  switch (req.method) {
    case "PUT":
      Database.replace('member_settings', {
        member: req.body.loggedInUser,
        setting: req.body.setting,
        value: req.body.value || 1
      }).then(() => {

        return res.sendStatus(200);
      });
      break;
    case "DELETE":
      Database.delete('member_settings', {
        member: req.body.loggedInUser,
        setting: req.body.setting
      }).then(() => {
        return res.sendStatus(200);
      });
		  break;
    default:
      return res.sendStatus(405);
  }
};
