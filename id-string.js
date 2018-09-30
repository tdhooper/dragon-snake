
module.exports = function(str) {
  var hash = 0, i;
  for (i in str) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  var id = (hash % 255) / 255;
  return id;
};
