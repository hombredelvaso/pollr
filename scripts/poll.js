//BROWSERIFY//////////////////////
//////////////////////////////////
var HELPERS = require('./helpers.js');
var jQuery = require('jquery');
require('./../vendor/jquery.flip.js');
var R = require('ramda');
var jss = require('jss');
var Chartist = require('chartist');
//////////////////////////////////
//////////////////////////////////

///////////
// DATA //
/////////

var POLLS = {};
var DATA = {}; // { submission: '', submissions: [] }

////////////////////
// FUNCTIONALITY //
//////////////////

var embedPoll = function(mountSelector, pollId, poll, existingData){

  DATA[pollId] = {};
  DATA[pollId]['submission'] = R.propOr(null, 'submission', existingData);
  DATA[pollId]['submissions'] = R.propOr([], 'submissions', existingData);

  var question = R.propOr(null, 'question', poll);
  var changeType = R.propOr('standard', 'changeType', poll);
  var answerType = R.propOr('listing', 'answerType', poll);
  var input = R.propOr(null, 'input', poll);
  var continueAction = R.propOr(null, 'continue', poll);
  var frontClass = R.compose(R.replace(/data-pollr-front/, 'data-pollr-front-' + pollId), R.pathOr('pollr-poll-front', ['markup', 'front', 'class']))(poll);
  var backClass = R.compose(R.replace(/data-pollr-back/, 'data-pollr-back-' + pollId), R.pathOr('pollr-poll-back', ['markup', 'back', 'class']))(poll);
  var questionHtml = R.compose(R.replace(/data-pollr-question/, 'data-pollr-question-' + pollId), R.pathOr('<p data-pollr-question></p>', ['markup', 'front', 'question']))(poll);
  var submissionHtml = R.compose(R.replace(/data-pollr-submission/, 'data-pollr-submission-' + pollId), R.pathOr('<button data-pollr-submission>Submit</button>', ['markup', 'front', 'submission']))(poll);
  var yourAnswerHtml = R.compose(R.replace(/data-pollr-your-answer/, 'data-pollr-your-answer-' + pollId), R.pathOr('<p>You chose: <span data-pollr-your-answer></span></p>', ['markup', 'back', 'yourAnswer']))(poll);
  var continueHtml = R.compose(R.replace(/data-pollr-continue/, 'data-pollr-continue-' + pollId), R.pathOr('<button data-pollr-continue>Continue</button>', ['markup', 'back', 'continue']))(poll);

  if(!question){ console.error('Pollr: No question text.') }
  if(!input){ console.error('Pollr: No input.') }

  /////////////////
  // build page //
  ///////////////

  var buildSubmissionSection = function(input, pollId, submissionHtml){
    if(input['type'] === 'button'){
      return '';
    } else {
      return '<div class="pollr-submission-section" data-submission-value-' + pollId + '>' + submissionHtml + '</div>';
    }
  };

  /** input -> pollId -> HTML (sideeffect: set delegated events) **/
  var buildInputHtmlAndBehavior = function(input, pollId){
    var tempStoreSubmission = function(submission){
      DATA[pollId]['submission'] = submission;
    };

    var radio = function(){
      $(document).on('click', '#pollr-input-' + pollId + ' > label', function(e){
        var $target = $(e.target);
        if($target.prop('type') === 'radio'){ tempStoreSubmission($target.val()); }
      });

      return '<radiogroup id="pollr-input-' + pollId + '" class="pollr-input-radio">' + input['choices'].map(function(choice, index){ return '<label><input type="radio" name="' + pollId + '" value="' + choice.value + '">' + choice.value + '</input></label>' }).join('') + '</radiogroup>';
    };

    var text = function(){
      $(document).on('keyup', '#pollr-input-' + pollId, function(e){
        var $target = $(e.target);
        tempStoreSubmission(R.trim($target.val()));
      });

      return '<textarea id="pollr-input-' + pollId + '" class="pollr-input-text" placeholder="' + input['placeholder'] + '"></textarea>';
    };

    var button = function(){
      $(document).on('click', '#pollr-input-' + pollId + ' > .pollr-poll-button', function(e){
        var $target = $(e.target);
        tempStoreSubmission($target.attr('value'));
        $(document).trigger('POLLR::submission', [pollId]);
      });

      return '<div id="pollr-input-' + pollId + '" class="button-group">' + input['choices'].map(function(choice){ return '<' + choice.element + ' class="pollr-poll-button ' + choice.classes + '" value="'+ choice.value +'">' + choice.value + '</' + choice.element + '>' }).join('') + '</div>';
    };

    switch(input['type']){
      case 'radio': return radio();
        break;
      case 'text': return text();
        break;
      case 'button': return button();
        break;
      default: return (function(){
        // noop
      }());
        break;
    }
  };

  /** changeType -> pollId -> undefined (sideeffect: trigger transition event) **/
  var pollTransition = function(changeType, pollId){
    var standard = function(){
      $(document).trigger('POLLR::transition', [pollId]);
    };

    var flip = function(){
      //return '<div class="front">' +
      //    '<div class="front-content">' +
      //    '<div id="question">' +
      //    '</div>' +
      //    '</div>' +
      //    '</div>' +
      //    '<div class="back">' +
      //    '<p class="back-title"></p>' +
      //    '<div class="back-content hidden">' +
      //    '<div class="chart"></div>' +
      //    '<div class="survey-link"></div>' +
      //    '</div>' +
      //    '</div>';
      jQuery('[data-pollr-poll-' + pollId + ']').flip({ trigger: 'manual' });
      //jQuery('.back-content').removeClass('hidden');
      jQuery('[data-pollr-poll-' + pollId + ']').flip(true);
    };

    switch(changeType){
      case 'standard': standard();
        break;
      case 'flip': flip();
        break;
      default: (function(){
        // noop
      }());
        break;
    }
  };

  var buildAllAnswers = function(answerType, pollId, allAnswersMount){
    var data = DATA[pollId]['submissions'];

    var listing = function(){
      var answers = '<div class="pollr-all-answers"><ul class="pollr-all-answers-list">' + data.map(function(answer){ return '<li>' + answer.value + '</li>' }).join('') + '</ul></div>';
      $(allAnswersMount).html(answers);
    };

    var chart = function(){
      var id = 'pollr-' + HELPERS.generateUUID();
      $(allAnswersMount).html('<div class="pollr-all-answers"><div id="' + id + '" class="pollr-all-answers-chart"></div></div>');
      //console.log(id)
      var _chart = new Chartist.Bar('#' + id, {
        labels: DATA[pollId]['submissions'].map(function(choice){ return choice.value }),
        series: [ data.map(function(choice){ return choice.count }) ]
      }, {
        seriesBarDistance: 10,
        reverseData: true,
        horizontalBars: true,
        axisY: {
          offset: 70
        }
      });

    };

    switch(answerType){
      case 'listing': return listing();
        break;
      case 'chart': return chart();
        break;
      default: return (function(){
        // noop
      }());
        break;
    }
  };

  var front = '<div class="' + frontClass + '">' +
      '<div class="pollr-question-section">' + questionHtml + '</div>' +
      '<div class="pollr-input-section">' + buildInputHtmlAndBehavior(input, pollId) + '</div>' +
      buildSubmissionSection(input, pollId, submissionHtml) +
      '</div>';

  var back = '<div class="' + backClass + '">' +
      '<div class="pollr-your-answer-section">' + yourAnswerHtml + '</div>' +
      '<div class="pollr-all-answers-section"><div data-pollr-all-answers-' + pollId + '></div></div>' +
      '<div class="pollr-continue-section">' + (continueAction ? continueHtml : '') + '</div>' +
      '</div>';

  $(mountSelector).html('<div class="pollr-poll" data-pollr-poll-' + pollId + '></div>');

  $(document).on('POLLR::drawFront', function(event, id){
    if(pollId === id){
      $(mountSelector + '> .pollr-poll').html(front);
      $('[data-pollr-question-' + pollId + ']').html(question);
    }
  });

  $(document).on('POLLR::drawBack', function(event, id){
    if(pollId === id){
      $(mountSelector + ' > .pollr-poll').html(back);
      $('[data-pollr-your-answer-' + pollId + ']').html(DATA[pollId]['submission']);
      buildAllAnswers(answerType, pollId, '[data-pollr-all-answers-' + pollId + ']')
    }
  });

  $(document).on('POLLR::transition', function(event, id){
    if(pollId === id){
      $(document).trigger('POLLR::drawBack', [pollId]);
    }
  });

  $(document).on('POLLR::submitted', function(event, id){
    if(pollId === id){
      pollTransition(changeType, pollId)
    }
  });

  $(document).on('POLLR::submission', function(event, id){
    if(pollId === id) {
      var value = R.pathOr('unknown', [pollId, 'submission'], DATA);
      var type = R.pathOr('unknown', [pollId, 'input', 'type'], POLLS);
      var question = R.pathOr('unknown', [pollId, 'question'], POLLS);
      if (value) {
        // TODO: ... update DATA[pollId]['submissions'] with your submission...
        $(document).trigger('POLLR::shareSubmission', [pollId, type, question, value]);
        $(document).trigger('POLLR::submitted', [pollId]);
      } else {
        alert('need to answer');
      }
    }
  });

  ///////////
  // init //
  /////////

  if(DATA[pollId]['submission']){
    $(document).trigger('POLLR::drawBack', [pollId]);
  } else {
    $(document).trigger('POLLR::drawFront', [pollId]);
  }

  /////////////
  // events //
  ///////////

  $(document).on('click', '[data-pollr-submission-' + pollId + ']', function(event){
    $(document).trigger('POLLR::submission', [pollId]);
  });

  $(document).on('click', '[data-pollr-continue-' + pollId + ']', function(event){
    continueAction();
  });

};

var embed = function(params){
  var mountSelector = params['mount'];
  var pollId = params['poll'];
  var existingData = params['data'] || {};
  var poll = POLLS[pollId];

  if(poll){
    embedPoll(mountSelector, pollId, poll, existingData);
  } else {
    throw pollId + ': No poll to embed'
  }
};

var shareSubmission = function(callback){
  $(document).on('POLLR::shareSubmission', function(event, identifier, type, question, submission){
    callback(identifier, type, question, submission);
  });
};

var init = function(pollConfigs){
  POLLS = pollConfigs;
};

//////////////
// EXPORTS //
////////////

module.exports = {
  init: init,
  embed: embed,
  onSubmission: shareSubmission
};

