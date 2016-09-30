var HELPERS = (function(){

  // generateUUID
  // 'unique string generator'
  // example use:

  // generateUUID() //=> "3831d0a4-5f80-419f-8be1-83bfc1fea6de"
  // TODO: add params to customize?

  var generateUUID = function(){
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (d + Math.random()*16)%16 | 0;
      d = Math.floor(d/16);
      return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
  };

  // slugify
  // 'turn any text into slug'
  // example use:

  // slugify('**Hello My Name is**!') //=> "hello-my-name-is"

  var slugify = function(text){
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
  };

  return {
    generateUUID: generateUUID,
    slugify: slugify
  }

}());

module.exports = HELPERS;