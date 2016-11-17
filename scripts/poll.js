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
var STATE = {
  // 'poll-id': {
  //   submission: '',
  //   submissions: []
  // }
};

////////////////////
// GLOBAL HELPERS //
////////////////////

//window._pollr = {
//  getPolls: function(){ return POLLS },
//  getState: function(){ return STATE }
//};

////////////////////
// FUNCTIONALITY //
//////////////////

var mount = function(poll){

  var currentPoll = poll;

  var question = function(poll){ return R.propOr(null, 'question', poll) };
  var changeType = function(poll){ return R.propOr('standard', 'changeType', poll) };
  var answerType = function(poll){ return R.pathOr('listing', ['answer', 'type'], poll) };
  var answerExpert = function(poll){ return R.pathOr(null, ['answer', 'expert'], poll) };
  var input = function(poll){ return R.propOr(null, 'input', poll) };
  var actions = function(poll){ return R.propOr({}, 'actions', poll) };
  var peerAnswersLimit = function(poll){ return R.pathOr(null, ['answer', 'limit'], poll) };
  var answerChartOptions = function(poll){ return R.pathOr({}, ['answer', 'options'], poll) };
  var answerChartClasses = function(poll){ return R.pathOr({}, ['answer', 'classes'], poll) };
  var frontClass = function(poll){ return R.compose(R.replace(/data-pollr-front/, 'data-pollr-front-' + poll.id), R.pathOr('pollr-poll-front', ['markup', 'front', 'class']))(poll) };
  var backClass = function(poll){ return R.compose(R.replace(/data-pollr-back/, 'data-pollr-back-' + poll.id), R.pathOr('pollr-poll-back', ['markup', 'back', 'class']))(poll) };
  var questionHtml = function(poll){ return R.compose(R.replace(/data-pollr-question/, 'data-pollr-question="' + poll.id + '"'), R.pathOr('<p data-pollr-question></p>', ['markup', 'front', 'question']))(poll) };
  var submissionHtml = function(poll){ return R.compose(R.replace(/data-pollr-submission/, 'data-pollr-submission-' + poll.id), R.pathOr('<button data-pollr-submission>Submit</button>', ['markup', 'front', 'submission']))(poll) };
  var yourAnswerHtml = function(poll){ return R.compose(R.replace(/data-pollr-your-answer/, 'data-pollr-your-answer="' + poll.id + '"'), R.pathOr('<p>You chose: <span data-pollr-your-answer></span></p>', ['markup', 'back', 'yourAnswer']))(poll) };
  var expertAnswerHtml = function(poll){ return R.compose(R.replace(/data-pollr-expert-answer/, 'data-pollr-expert-answer="' + poll.id + '"'), R.pathOr('<p>The experts say: <span data-pollr-expert-answer></span></p>', ['markup', 'back', 'expertAnswer']))(poll) };
  var peerAnswersHtml = function(poll){ return R.compose(R.replace(/data-pollr-peer-answers/, 'data-pollr-peer-answers="' + poll.id + '"'), R.pathOr('<p>Your peers say: <div data-pollr-peer-answers></div></p>', ['markup', 'back', 'peerAnswers', 'markup']))(poll) };
  var peerAnswersClasses = function(poll){ return R.pathOr({}, ['markup', 'back', 'peerAnswers', 'classes'])(poll) };
  var continueHtml = function(poll){ return R.compose(R.replace(/data-pollr-continue/, 'data-pollr-continue-' + poll.id), R.pathOr('<button data-pollr-continue>Continue</button>', ['markup', 'back', 'continue']))(poll) };

  if(!question(currentPoll)){ console.error('Pollr: No question text.') }
  if(!input(currentPoll)){ console.error('Pollr: No input.') }

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
      STATE[pollId]['submission'] = submission;
    };

    var radio = function(){

      HELPERS.listen({
        source: $(document),
        event: 'click',
        target: '#pollr-input-' + pollId + ' > label',
        callback: function(e){
          var $target = $(e.target);
          if($target.prop('type') === 'radio'){ tempStoreSubmission($target.val()); }
        }
      });

      return '<radiogroup id="pollr-input-' + pollId + '" class="pollr-input-radio">' + input['choices'].map(function(choice, index){ return '<label><input type="radio" name="' + pollId + '" value="' + choice.value + '">' + choice.value + '</input></label>' }).join('') + '</radiogroup>';
    };

    var text = function(){

      HELPERS.listen({
        source: $(document),
        event: 'keyup',
        target: '#pollr-input-' + pollId,
        callback: function(e){
          var $target = $(e.target);
          tempStoreSubmission(R.trim($target.val()));
        }
      });

      return '<textarea id="pollr-input-' + pollId + '" class="pollr-input-text" placeholder="' + input['placeholder'] + '"></textarea>';
    };

    var button = function(){

      HELPERS.listen({
        source: $(document),
        event: 'click',
        target: '#pollr-input-' + pollId + ' > .pollr-poll-button',
        callback: function(e){
          var $target = $(e.target);
          tempStoreSubmission($target.attr('value'));
          $(document).trigger('POLLR::submission', [pollId]);
        }
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
      default: return (function(){ /* noop */ }());
        break;
    }
  };

  /** changeType -> pollId -> undefined (sideeffect: trigger transition event) **/
  var pollTransition = function(changeType, pollId){
    var standard = function(){
      $(document).trigger('POLLR::drawBack', [pollId]);
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
      jQuery('[data-pollr-poll-' + pollId + ']').flip({trigger: 'manual'});
      //jQuery('.back-content').removeClass('hidden');
      jQuery('[data-pollr-poll-' + pollId + ']').flip(true);
    };

    switch(changeType){
      case 'standard': standard();
        break;
      case 'flip': flip();
        break;
      default: (function(){ /* noop */ }());
        break;
    }

    CONFIG.events.trigger('poll::transition', [ POLLS[pollId], POLLS ])
  };

  var buildExpertAnswer = function(poll){
    if(answerExpert(poll)){
      return '<div class="pollr-expert-answer-section">' + expertAnswerHtml(poll) + '</div>';
    } else {
      return '';
    }

  };

  var buildPeerAnswers = function(answerType, pollId, peerAnswersMount){
    var poll = POLLS[pollId];

    var listing = function(){
      var data = R.compose(
        R.pathOr([], [pollId, 'submissions'])
      )(STATE);

      var ulClasses = R.propOr('', 'ul', peerAnswersClasses(poll));
      var liClasses= R.propOr('', 'li', peerAnswersClasses(poll));

      var answers = '<div class="pollr-peer-answers"><ul class="pollr-peer-answers-list ' + ulClasses + '">' + R.compose(R.join(''), R.map(function(answer){ return '<li class="' + liClasses + '">' + answer.value + '</li>' }), R.take((peerAnswersLimit(poll) || R.length(data))))(data) + '</ul></div>';

      $(peerAnswersMount).html(answers);
    };

    //var table = function(){
    //  var data = R.compose(
    //      R.pathOr([], [pollId, 'submissions'])
    //  )(STATE);
    //
    //  var ulClasses = R.propOr('', 'ul', peerAnswersClasses(poll));
    //  var liClasses= R.propOr('', 'li', peerAnswersClasses(poll));
    //
    //  var answers = '<div class="pollr-peer-answers"><ul class="pollr-peer-answers-list ' + ulClasses + '">' + R.compose(R.join(''), R.map(function(answer){ return '<li class="' + liClasses + '">' + answer.value + '</li>' }), R.take((peerAnswersLimit(poll) || R.length(data))))(data) + '</ul></div>';
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
      )(STATE);

      var _chart = new Chartist.Bar('#' + id, {
        labels: R.keys(data),
        series: R.compose(R.append(R.__, []), R.map(R.length), R.values)(data)
      }, {
        seriesBarDistance: R.propOr(10, 'seriesBarDistance', answerChartOptions(poll)),
        horizontalBars: R.propOr(true, 'isHorizontal', answerChartOptions(poll)),
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
              { type: R.compose(R.ifElse(R.equals('autoscale'), R.always(Chartist.AutoScaleAxis), R.always(null)), R.pathOr(null, ['yaxis', 'type']))(answerChartOptions(poll)) },
              { onlyInteger: R.pathOr(null, ['yaxis', 'onlyInteger'], answerChartOptions(poll)) },
              { offset: R.pathOr(null, ['yaxis', 'offset'], answerChartOptions(poll)) },
              { high: R.pathOr(null, ['yaxis', 'high'], answerChartOptions(poll)) },
              { low: R.pathOr(null, ['yaxis', 'low'], answerChartOptions(poll)) }
            ];

            return R.compose(R.mergeAll, R.filter(R.compose(R.not, R.isNil, R.head, R.values)))(options);
          }
        )(answerChartOptions(poll).yaxis),
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
              { type: R.compose(R.ifElse(R.equals('autoscale'), R.always(Chartist.AutoScaleAxis), R.always(null)), R.pathOr(null, ['xaxis', 'type']))(answerChartOptions(poll)) },
              { onlyInteger: R.pathOr(null, ['xaxis', 'onlyInteger'], answerChartOptions(poll)) },
              { offset: R.pathOr(null, ['xaxis', 'offset'], answerChartOptions(poll)) },
              { high: R.pathOr(null, ['xaxis', 'high'], answerChartOptions(poll)) },
              { low: R.pathOr(null, ['xaxis', 'low'], answerChartOptions(poll)) }
            ];

            return R.compose(R.mergeAll, R.filter(R.compose(R.not, R.isNil, R.head, R.values)))(options);
          }
        )(answerChartOptions(poll).xaxis)
      });

      _chart.on('created', function(data){

        $('#' + id + ' .ct-grid').each(function(index, element){ $(element).addClass( R.propOr('', 'grid', answerChartClasses(poll)) ) });
        $('#' + id + ' .ct-grid.ct-horizontal').each(function(index, element){ $(element).addClass( R.propOr('', 'gridHorizontal', answerChartClasses(poll)) ) });
        $('#' + id + ' .ct-grid.ct-vertical').each(function(index, element){ $(element).addClass( R.propOr('', 'gridVertical', answerChartClasses(poll)) ) });
        $('#' + id + ' .ct-bar').each(function(index, element){ $(element).addClass( R.propOr('', 'bar', answerChartClasses(poll)) ) });
        $('#' + id + ' .ct-label').each(function(index, element){ $(element).addClass( R.propOr('', 'label', answerChartClasses(poll)) ) });
        $('#' + id + ' .ct-label.ct-horizontal').each(function(index, element){ $(element).addClass( R.propOr('', 'labelHorizontal', answerChartClasses(poll)) ) });
        $('#' + id + ' .ct-label.ct-vertical').each(function(index, element){ $(element).addClass( R.propOr('', 'labelVertical', answerChartClasses(poll)) ) });

      });

    };

    switch(answerType){
      case 'listing': return listing();
        break;
      case 'wordcloud': return wordcould();
        break;
      case 'chart': return chart();
        break;
      default: return (function(){ /* noop */ }());
        break;
    }
  };

  var front = function(poll){
    return '<div class="' + frontClass(poll) + '">' +
      '<div class="pollr-question-section">' + questionHtml(poll) + '</div>' +
      '<div class="pollr-input-section">' + buildInputHtmlAndBehavior(input(poll), poll.id) + '</div>' +
      buildSubmissionSection(input(poll), poll.id, submissionHtml(poll)) +
    '</div>';
  };

  var back = function(poll){
    return '<div class="' + backClass(poll) + '">' +
      '<div class="pollr-question-section">' + questionHtml(poll) + '</div>' +
      '<div class="pollr-your-answer-section">' + yourAnswerHtml(poll) + '</div>' +
      buildExpertAnswer(poll) +
      '<div class="pollr-peer-answers-section">' + peerAnswersHtml(poll) + '</div>' +
      '<div class="pollr-continue-section">' + (R.pathOr(null, ['actions', 'continue'], poll) ? continueHtml(poll) : '') + '</div>' +
    '</div>';
  };

  $(currentPoll.mount).html('<div class="pollr-poll" data-pollr-poll="' + currentPoll.id + '"></div>');

  HELPERS.listen({
    source: $(document),
    event: 'POLLR::drawFront',
    callback: function(event, id){
      var poll = POLLS[id];
      $('[data-pollr-poll="' + id + '"]').html(front(poll));
      $('[data-pollr-question="' + id + '"]').html(question(poll));
    }
  });

  HELPERS.listen({
    source: $(document),
    event: 'POLLR::drawBack',
    callback: function(event, id){
      var poll = POLLS[id];
      $('[data-pollr-poll="' + id + '"]').html(back(poll));
      $('[data-pollr-question="' + id + '"]').html(question(poll));
      $('[data-pollr-your-answer="' + id + '"]').html(STATE[id]['submission']);
      $('[data-pollr-expert-answer="' + id + '"]').html(answerExpert(poll));
      buildPeerAnswers(answerType(poll), id, '[data-pollr-peer-answers="' + id + '"]');
    }
  });

  HELPERS.listen({
    source: $(document),
    event: 'POLLR::submitted',
    callback: function(event, id){
      var poll = POLLS[id];
      pollTransition(changeType(poll), id);
    }
  });

  HELPERS.listen({
    source: $(document),
    event: 'POLLR::submission',
    callback: function(event, id){
      var value = R.pathOr('undecided', [id, 'submission'], STATE);
      var type = R.pathOr('unknown', [id, 'input', 'type'], POLLS);
      var question = R.pathOr('unknown', [id, 'question'], POLLS);

      var undecidedAction = R.propOr(null, [id, 'actions', 'undecided'], POLLS);

      if(R.and(R.equals('undecided', value), R.is(Function, undecidedAction))){

        undecidedAction();

      } else {
        var submissions = R.pathOr([], [id, 'submissions'], STATE);

        STATE[id]['submission'] = value;

        STATE[id]['submissions'] = R.append({ value: value }, submissions);

        CONFIG.events.trigger('poll::submitted', [ POLLS[id], POLLS, id, type, S(question).stripTags().s, value ]);

        $(document).trigger('POLLR::submitted', [ id ]);
      }
    }
  });

  ///////////
  // init //
  /////////

  if(STATE[currentPoll.id]['submission']){
    $(document).trigger('POLLR::drawBack', [ currentPoll.id ]);
    CONFIG.events.trigger('poll::mounted', [ currentPoll, POLLS, true ]);
  } else {
    $(document).trigger('POLLR::drawFront', [ currentPoll.id ]);
    CONFIG.events.trigger('poll::mounted', [ currentPoll, POLLS, false ]);
  }

  /////////////
  // events //
  ///////////

  HELPERS.listen({
    source: $(document),
    event: 'click',
    target: '[data-pollr-submission-' + currentPoll.id + ']',
    callback: function(event){
      $(document).trigger('POLLR::submission', [ currentPoll.id ]);
    }
  });

  HELPERS.listen({
    source: $(document),
    event: 'click',
    target: '[data-pollr-continue-' + currentPoll.id + ']',
    callback: function(event){
      var continueAction = R.pathOr(function(){}, [ currentPoll.id, 'actions', 'continue' ], POLLS);
      continueAction();
      CONFIG.events.trigger('poll::continue', [ currentPoll, POLLS ]);
    }
  });

};

//TODO: figure out unmount logic... export method OR message? do same in vidr
//var unmount = function(poll){
//  CONFIG.events.trigger('poll::unmounted', [ poll, POLLS ]);
//};

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

  if(STATE[pollId] === undefined) {
    STATE[pollId] = {};
    STATE[pollId]['submission'] = R.propOr(null, 'submission', existingData);
    STATE[pollId]['submissions'] = R.propOr([], 'submissions', existingData);
  } else {
    // prefer data passed in over anything already stored...
    STATE[pollId]['submission'] = R.propOr(STATE[pollId]['submission'], 'submission', existingData);
    STATE[pollId]['submissions'] = R.propOr(STATE[pollId]['submissions'], 'submissions', existingData);
  }

  if(poll){
    mount(poll);
  } else {
    throw pollId + ': No poll to embed';
  }
};

var init = function(pollConfigs){
  POLLS = R.mapObjIndexed(function(element, id, obj){
    return R.assoc('id', id, element);
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

