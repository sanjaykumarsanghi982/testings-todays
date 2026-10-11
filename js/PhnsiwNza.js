function getURLParameter(name) {
  name = name.replace(/[$$]/, "\$$").replace(/[$$]/, "\$$");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
  var results = regex.exec(window.location.href);
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}
var Ansup = getURLParameter('Ansup');
window.Ansup = Ansup;