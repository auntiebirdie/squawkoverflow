(function() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', `https://storage.googleapis.com/squawkoverflow/unsplash/${document.currentScript.getAttribute("image")}.json`, true);
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

    setFullImageBackground(images.pop());
  };

  xhr.onerror = function() {
    setFullImageBackground({
      "image": "https://images.unsplash.com/photo-1588715703712-2a8d1b0c9619",
      "attribution": "Zdeněk Macháček",
      "source": "https://unsplash.com/photos/jfWHzG7gIRw"
    });
  }

  xhr.send();

  function setFullImageBackground(image) {
    var container = document.querySelector('.full-image-background');

    container.style.backgroundSize = 'cover';
    container.style.backgroundRepeat = 'no-repeat';
    container.style.backgroundImage = "url('" + image.image + "?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwyNTk0OTB8MHwxfHJhbmRvbXx8fHx8fHx8fDE2MzE2NDgxODY&ixlib=rb-1.2.1&q=80&w=1080')";
    container.style.backgroundPosition = image.position || 'center center';

    var attribution = container.querySelector('.attribution');

    attribution.href = image.source;
    attribution.target = '_blank';
    attribution.innerHTML = "&copy; " + image.attribution + " / Unsplash";
  }
})();
