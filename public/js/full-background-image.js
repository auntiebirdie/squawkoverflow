(function() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', `/data/${document.currentScript.getAttribute("image")}Images.json`, true);
  xhr.responseType = 'json';

  xhr.onload = function() {
    var images = xhr.response;

    var currentIndex = images.length;
    var temporaryValue, randomIndex;

    while (0 !== currentIndex) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      temporaryValue = images[currentIndex];
      images[currentIndex] = images[randomIndex];
      images[randomIndex] = temporaryValue;
    }

    var containers = document.querySelectorAll('.full-image-background');

    for (var i = 0, len = containers.length; i < len; i++) {
      var image = images.pop();

      containers[i].style.backgroundImage = "url('" + image.image + "')";

      if (image.position) {
        containers[i].style.backgroundPosition = image.position;
      }

      var attribution = containers[i].querySelector('.attribution');
	    
      attribution.href = image.source;
      attribution.target = '_blank';
      attribution.innerHTML = "&copy; " + image.attribution + " / Unsplash";
    }
  };

  xhr.send();
})();
