var endpoint = require('./endpoints/bird.js');

endpoint({ method : "GET", query : { id : "Malacocincla-abbotti", include: ['members'] } }, { json : console.log });
