  function fetchJson(file) {
	  console.log('fetch json');
    new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', `/data/${file}.json`, true);
      xhr.responseType = 'json';

      xhr.onload = function() {
	      console.log('response');
        resolve(xhr.response);
      };

      xhr.send();
    });
  }

  var birds = [];
  var birdypets = {};

  async function fetchBirds(order, family) {
    if (birds.length == 0) {
	    console.log('await');
      birds = await fetchJson('birds');
      birdypets = await fetchJson('birdypets');
    }
	  console.log('return');

    return birds[order][family].children;
  }
