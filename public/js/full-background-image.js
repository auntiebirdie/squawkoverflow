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

    var image = images.pop();


    document.querySelector('.full-image-background').style.backgroundImage = "url('" + image.image + "')";

    if (image.position) {
      document.querySelector('.full-image-background').style.backgroundPosition = image.position;
    }

    document.getElementById('attribution').href = image.source;
    document.getElementById('attribution').innerHTML = "background &copy; " + image.attribution + " / Unsplash";
  };

  xhr.send();
})();
