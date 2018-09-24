module.exports = function() {
  var w = 1;
  var h = Math.pow(2, 10);

  var canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;

  var context = canvas.getContext('2d');
  var image = context.getImageData(0, 0, w, h);

  var col = 0,
    x = 0,
    y = 0;
  var stripes = Math.pow(2, 6);

  for (var i = 0, j = 0, l = image.data.length; i < l; i += 4, j++) {

    x = j % w;
    y = x == 0 ? y + 1 : y;

    col = ((y / h) * stripes) % 1;
    col = col >= 0.5 ? 0 : 255;

    image.data[i] = col;
    image.data[i + 1] = col;
    image.data[i + 2] = col;
    image.data[i + 3] = 255;

  }

  context.putImageData(image, 0, 0);

  return canvas;
};
