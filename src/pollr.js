//BROWSERIFY//////////////////////
require('./pollr.css');
var Pollr = require('./../scripts/poll.js');
//////////////////////////////////

if(window.Pollr){
  throw 'Pollr already exists in the global namespace';
  // TODO: allow user to choose global name?
} else {
  window.Pollr = Pollr;
}