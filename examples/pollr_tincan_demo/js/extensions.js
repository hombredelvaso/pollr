var unique = function(array){
  for(var i = 0; i < array.length; i++){
    if( array.indexOf(array[i], i+1) != -1 ){
      array.splice(i,1);
      i--;
    }
  }

  return array;
};

var slugify = function(text){
  return text.toString().toLowerCase()
      .replace(/\s+/g, '-')           // Replace spaces with -
      .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
      .replace(/\-\-+/g, '-')         // Replace multiple - with single -
      .replace(/^-+/, '')             // Trim - from start of text
      .replace(/-+$/, '');            // Trim - from end of text
};

var timer = (function(){
  var timers = {};

  var _timer = (function(){
    return {
      create: function(){
        var start = null;
        var end = null;
        return {
          start: function(){
            start = new Date();
            return start.toISOString();
          },
          stop: function(){
            end = new Date();
            return {
              start: start.toISOString(),
              end: end.toISOString(),
              elapsed: (end - start) //ms
            };
          }
        }
      }
    }
  }());

  return {
    start: function(namespace){
      var existingTimer = timers[namespace];
      if(existingTimer){
        // noop
      } else {
        timers[namespace] = _timer.create();
        return timers[namespace].start();
      }
    },
    stop: function(namespace){
      var existingTimer = timers[namespace];
      if(existingTimer){
        var time = existingTimer.stop();
        delete timers[namespace];
        return time;
      } else {
        // noop
      }
    }
  }

}());