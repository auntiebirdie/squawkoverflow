let url = 'https://us-central1-bot-central.cloudfunctions.net/api';
const targetAudience = url;
url += '/member';
const {GoogleAuth} = require('google-auth-library');
const auth = new GoogleAuth();

async function request() {
 const client = await auth.getIdTokenClient(targetAudience);
	url += '?id=121294882861088771'
 const res = await client.request({
	 url,
	 method: "GET"
 });
 console.info(res.data);
}

request().catch(err => {
 console.error(err.message);
 process.exitCode = 1;
});
