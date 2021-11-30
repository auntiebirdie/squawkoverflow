let endpoint = require('./endpoints/memberpet.js');

endpoint({
  method: "PUT",
  body: {
    "memberpet": "gcARZVmQ56CDUm5nGP75Fr",
    "loggedInUser": "121294882861088771",
	  "nickname" : "Testy McTesterbird",
	  "flock" : "wPsEX84KKQbhe7un3L3vvw",
	  "action" : "add"
  }
}, {
json: console.log,
sendStatus: console.log,
status: (code) => {
  console.log(code);

  return {
    json: console.log
  };
}
}).then(() => process.exit(0));
