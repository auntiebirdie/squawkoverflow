let endpoint = require('./endpoints/memberpet.js');

endpoint({
  method: "PUT",
  body: {
    "memberpet": "neY9B2nbW5PUDuSrCEVq56",
    "loggedInUser": "121294882861088771",
    "flock": "t4MVaJVuFvck2wZbPHMmBg"
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
