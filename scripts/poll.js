//BROWSERIFY//////////////////////
//////////////////////////////////
var HELPERS = require('./helpers.js');
var jQuery = require('jquery');
var $ = jQuery;
require('./../vendor/jquery.flip.js');
var R = require('ramda');
var jss = require('jss');
var Chartist = require('chartist');
var S = require('string');
//////////////////////////////////
//////////////////////////////////

///////////
// DATA //
/////////

var CONFIG = {
  events: jQuery(document)
};

var POLLS = {};
var DATA = {}; // { submission: '', submissions: [] }

////////////////////
// FUNCTIONALITY //
//////////////////

var mount = function(poll, existingData){

  var currentPoll = poll;
  var currentPollId = poll['name'];
  var mountSelector = poll['mount'];

  DATA[currentPollId] = {};
  DATA[currentPollId]['submission'] = R.propOr(null, 'submission', existingData);
  DATA[currentPollId]['submissions'] = R.propOr([], 'submissions', existingData);

  var question = R.propOr(null, 'question', currentPoll);
  var changeType = R.propOr('standard', 'changeType', currentPoll);
  var answerType = R.pathOr('listing', ['answer', 'type'], currentPoll);
  var answerExpert = R.pathOr(null, ['answer', 'expert'], currentPoll);
  var input = R.propOr(null, 'input', currentPoll);
  var actions = R.propOr({}, 'actions', currentPoll);
  var peerAnswersLimit = R.pathOr(null, ['answer', 'limit'], currentPoll);
  var answerChartOptions = R.pathOr({}, ['answer', 'options'], currentPoll);
  var answerChartClasses = R.pathOr({}, ['answer', 'classes'], currentPoll);
  var frontClass = R.compose(R.replace(/data-pollr-front/, 'data-pollr-front-' + currentPollId), R.pathOr('pollr-poll-front', ['markup', 'front', 'class']))(currentPoll);
  var backClass = R.compose(R.replace(/data-pollr-back/, 'data-pollr-back-' + currentPollId), R.pathOr('pollr-poll-back', ['markup', 'back', 'class']))(currentPoll);
  var questionHtml = R.compose(R.replace(/data-pollr-question/, 'data-pollr-question-' + currentPollId), R.pathOr('<p data-pollr-question></p>', ['markup', 'front', 'question']))(currentPoll);
  var submissionHtml = R.compose(R.replace(/data-pollr-submission/, 'data-pollr-submission-' + currentPollId), R.pathOr('<button data-pollr-submission>Submit</button>', ['markup', 'front', 'submission']))(currentPoll);
  var yourAnswerHtml = R.compose(R.replace(/data-pollr-your-answer/, 'data-pollr-your-answer-' + currentPollId), R.pathOr('<p>You chose: <span data-pollr-your-answer></span></p>', ['markup', 'back', 'yourAnswer']))(currentPoll);
  var expertAnswerHtml = R.compose(R.replace(/data-pollr-expert-answer/, 'data-pollr-expert-answer-' + currentPollId), R.pathOr('<p>The experts say: <span data-pollr-expert-answer></span></p>', ['markup', 'back', 'expertAnswer']))(currentPoll);
  var peerAnswersHtml = R.compose(R.replace(/data-pollr-peer-answers/, 'data-pollr-peer-answers-' + currentPollId), R.pathOr('<p>Your peers say: <div data-pollr-peer-answers></div></p>', ['markup', 'back', 'peerAnswers', 'markup']))(currentPoll);
  var peerAnswersClasses = R.pathOr({}, ['markup', 'back', 'peerAnswers', 'classes'])(currentPoll);
  var continueHtml = R.compose(R.replace(/data-pollr-continue/, 'data-pollr-continue-' + currentPollId), R.pathOr('<button data-pollr-continue>Continue</button>', ['markup', 'back', 'continue']))(currentPoll);

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
      if(pollId === currentPollId){
        $(document).trigger('POLLR::drawBack', [pollId]);
      }
    };

    var flip = function(){
      if(pollId === currentPollId) {
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
        jQuery('[data-pollr-poll-' + pollId + ']').flip({trigger: 'manual'});
        //jQuery('.back-content').removeClass('hidden');
        jQuery('[data-pollr-poll-' + pollId + ']').flip(true);
      }
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

    CONFIG.events.trigger('poll::transition', [ currentPoll, POLLS ])
  };

  var buildExpertAnswer = function(){
    if(answerExpert){
      return '<div class="pollr-expert-answer-section">' + expertAnswerHtml + '</div>';
    } else {
      return '';
    }

  };

  var buildPeerAnswers = function(answerType, pollId, peerAnswersMount){

    var listing = function(){
      var data = R.compose(
          R.pathOr([], [pollId, 'submissions'])
      )(DATA);

      var ulClasses = R.propOr('', 'ul', peerAnswersClasses);
      var liClasses= R.propOr('', 'li', peerAnswersClasses);

      var answers = '<div class="pollr-peer-answers"><ul class="pollr-peer-answers-list ' + ulClasses + '">' + R.compose(R.join(''), R.map(function(answer){ return '<li class="' + liClasses + '">' + answer.value + '</li>' }), R.take((peerAnswersLimit || R.length(data))))(data) + '</ul></div>';

      $(peerAnswersMount).html(answers);
    };

    //var table = function(){
    //  var data = R.compose(
    //      R.pathOr([], [pollId, 'submissions'])
    //  )(DATA);
    //
    //  var ulClasses = R.propOr('', 'ul', peerAnswersClasses);
    //  var liClasses= R.propOr('', 'li', peerAnswersClasses);
    //
    //  var answers = '<div class="pollr-peer-answers"><ul class="pollr-peer-answers-list ' + ulClasses + '">' + R.compose(R.join(''), R.map(function(answer){ return '<li class="' + liClasses + '">' + answer.value + '</li>' }), R.take((peerAnswersLimit || R.length(data))))(data) + '</ul></div>';
    //
    //  $(peerAnswersMount).html(answers);
    //};

    var wordcloud = function(){
      //TODO: add wordcloud to see responses in managable way
    };

    var chart = function(){
      var id = 'pollr-peer-answers-chart' + HELPERS.generateUUID();

      $(peerAnswersMount).html('<div class="pollr-peer-answers"><div id="' + id + '" class="pollr-peer-answers-chart"></div></div>');

      var data = R.compose(
        R.groupBy(R.prop('value')),
        R.pathOr([], [pollId, 'submissions'])
      )(DATA);

      var _chart = new Chartist.Bar('#' + id, {
        labels: R.keys(data),
        series: R.compose(R.append(R.__, []), R.map(R.length), R.values)(data)
      }, {
        seriesBarDistance: R.propOr(10, 'seriesBarDistance', answerChartOptions),
        horizontalBars: R.propOr(true, 'isHorizontal', answerChartOptions),
        axisY: R.ifElse(
          R.isNil,
          R.always({
            //offset: 0
            //type: Chartist.AutoScaleAxis,
            //low: 0,
            //high: 1000,
            //onlyInteger: true
          }),
          function(){

            var options = [
              { type: R.compose(R.ifElse(R.equals('autoscale'), R.always(Chartist.AutoScaleAxis), R.always(null)), R.pathOr(null, ['yaxis', 'type']))(answerChartOptions) },
              { onlyInteger: R.pathOr(null, ['yaxis', 'onlyInteger'], answerChartOptions) },
              { offset: R.pathOr(null, ['yaxis', 'offset'], answerChartOptions) },
              { high: R.pathOr(null, ['yaxis', 'high'], answerChartOptions) },
              { low: R.pathOr(null, ['yaxis', 'low'], answerChartOptions) }
            ];

            return R.compose(R.mergeAll, R.filter(R.compose(R.not, R.isNil, R.head, R.values)))(options);
          }
        )(answerChartOptions.yaxis),
        axisX: R.ifElse(
          R.isNil,
          R.always({
            //offset: 0
            //type: Chartist.AutoScaleAxis,
            //low: 0,
            //high: 1000,
            //onlyInteger: true
          }),
          function(){

            var options = [
              { type: R.compose(R.ifElse(R.equals('autoscale'), R.always(Chartist.AutoScaleAxis), R.always(null)), R.pathOr(null, ['xaxis', 'type']))(answerChartOptions) },
              { onlyInteger: R.pathOr(null, ['xaxis', 'onlyInteger'], answerChartOptions) },
              { offset: R.pathOr(null, ['xaxis', 'offset'], answerChartOptions) },
              { high: R.pathOr(null, ['xaxis', 'high'], answerChartOptions) },
              { low: R.pathOr(null, ['xaxis', 'low'], answerChartOptions) }
            ];

            return R.compose(R.mergeAll, R.filter(R.compose(R.not, R.isNil, R.head, R.values)))(options);
          }
        )(answerChartOptions.xaxis)
      });

      _chart.on('created', function(data){

        $('#' + id + ' .ct-grid').each(function(index, element){ $(element).addClass( R.propOr('', 'grid', answerChartClasses) ) });
        $('#' + id + ' .ct-grid.ct-horizontal').each(function(index, element){ $(element).addClass( R.propOr('', 'gridHorizontal', answerChartClasses) ) });
        $('#' + id + ' .ct-grid.ct-vertical').each(function(index, element){ $(element).addClass( R.propOr('', 'gridVertical', answerChartClasses) ) });
        $('#' + id + ' .ct-bar').each(function(index, element){ $(element).addClass( R.propOr('', 'bar', answerChartClasses) ) });
        $('#' + id + ' .ct-label').each(function(index, element){ $(element).addClass( R.propOr('', 'label', answerChartClasses) ) });
        $('#' + id + ' .ct-label.ct-horizontal').each(function(index, element){ $(element).addClass( R.propOr('', 'labelHorizontal', answerChartClasses) ) });
        $('#' + id + ' .ct-label.ct-vertical').each(function(index, element){ $(element).addClass( R.propOr('', 'labelVertical', answerChartClasses) ) });

      });

    };

    switch(answerType){
      case 'listing': return listing();
        break;
      case 'wordcloud': return wordcould();
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
      '<div class="pollr-input-section">' + buildInputHtmlAndBehavior(input, currentPollId) + '</div>' +
      buildSubmissionSection(input, currentPollId, submissionHtml) +
      '</div>';

  var back = '<div class="' + backClass + '">' +
      '<div class="pollr-question-section">' + questionHtml + '</div>' +
      '<div class="pollr-your-answer-section">' + yourAnswerHtml + '</div>' +
      buildExpertAnswer() +
      '<div class="pollr-peer-answers-section">' + peerAnswersHtml + '</div>' +
      '<div class="pollr-continue-section">' + (R.propOr(null, 'continue', actions) ? continueHtml : '') + '</div>' +
      '</div>';

  $(mountSelector).html('<div class="pollr-poll" data-pollr-poll-' + currentPollId + '></div>');

  $(document).on('POLLR::drawFront', function(event, id){
    if(currentPollId === id){
      $(mountSelector + '> .pollr-poll').html(front);
      $('[data-pollr-question-' + currentPollId + ']').html(question);
    }
  });

  $(document).on('POLLR::drawBack', function(event, id){
    if(currentPollId === id){
      $(mountSelector + ' > .pollr-poll').html(back);
      $('[data-pollr-question-' + currentPollId + ']').html(question);
      $('[data-pollr-your-answer-' + currentPollId + ']').html(DATA[currentPollId]['submission']);
      $('[data-pollr-expert-answer-' + currentPollId + ']').html(answerExpert);
      buildPeerAnswers(answerType, currentPollId, '[data-pollr-peer-answers-' + currentPollId + ']')
    }
  });

  $(document).on('POLLR::submitted', function(event, id){
    if(currentPollId === id){
      pollTransition(changeType, currentPollId)
    }
  });

  $(document).on('POLLR::submission', function(event, id){
    if(currentPollId === id) {
      var value = R.pathOr('undecided', [currentPollId, 'submission'], DATA);
      var type = R.pathOr('unknown', [currentPollId, 'input', 'type'], POLLS);
      var question = R.pathOr('unknown', [currentPollId, 'question'], POLLS);

      var undecidedAction = R.propOr(null, 'undecided', actions);

      if(R.and(R.equals('undecided', value), R.is(Function, undecidedAction))){

        undecidedAction();

      } else {
        var submissions = R.pathOr([], [currentPollId, 'submissions'], DATA);

        DATA[currentPollId]['submission'] = value;

        DATA[currentPollId]['submissions'] = R.append({ value: value }, submissions);

        CONFIG.events.trigger('poll::submitted', [ currentPoll, POLLS, currentPollId, type, S(question).stripTags().s, value ]);

        $(document).trigger('POLLR::submitted', [ currentPollId ]);
      }
    }
  });

  ///////////
  // init //
  /////////

  if(DATA[currentPollId]['submission']){
    $(document).trigger('POLLR::drawBack', [currentPollId]);
    CONFIG.events.trigger('poll::mounted', [ currentPoll, POLLS, true ]);
  } else {
    $(document).trigger('POLLR::drawFront', [currentPollId]);
    CONFIG.events.trigger('poll::mounted', [ currentPoll, POLLS, false ]);
  }

  /////////////
  // events //
  ///////////

  $(document).on('click', '[data-pollr-submission-' + currentPollId + ']', function(event){
    $(document).trigger('POLLR::submission', [currentPollId]);
  });

  $(document).on('click', '[data-pollr-continue-' + currentPollId + ']', function(event){
    var continueAction = R.propOr(function(){}, 'continue', actions);
    continueAction();
    CONFIG.events.trigger('poll::continue', [ currentPoll, POLLS ]);
  });

};

//TODO: figure out unmount logic... export method OR message? do same in vidr
var unmount = function(poll){

  CONFIG.events.trigger('poll::unmounted', [ poll, POLLS ]);
};

var embed = function(params){
  var mountSelector = params['mount'];
  var pollId = params['poll'];
  var actions = params['actions'];
  var existingData = params['data'] || {};
  var poll = R.compose(
    R.ifElse(
      R.propIs(Object, 'actions'),
      R.evolve({ actions: R.merge(R.__, actions) }),
      R.assoc('actions', actions)
    ),
    R.assoc('mount', mountSelector)
  )(POLLS[pollId]);

  POLLS[pollId] = poll;

  if(poll){
    mount(poll, existingData);
  } else {
    throw pollId + ': No poll to embed';
  }
};

var init = function(pollConfigs){
  POLLS = R.mapObjIndexed(function(element, name, obj){
    return R.assoc('name', name, element);
  }, pollConfigs);
};

var configure = function(config){
  CONFIG = R.merge(CONFIG, config);
};

//////////////
// EXPORTS //
////////////

module.exports = {
  configure: configure,
  init: init,
  embed: embed
};

