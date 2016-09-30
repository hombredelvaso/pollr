$(document).trigger('tincan::access_course', [ CONFIG.information.name, CONFIG.information.name ]);

var DRAW_INFORMATION = (function(){
  var information = CONFIG.information;

  $(document).prop('title', information.name);

}());

var DRAW_SECTIONS = (function(){
  var sections = CONFIG.sections;
  var $mountList = $('#mount-list');

  sections.forEach(function(sectionData, index, sections){
    $mountList.append('<li>' +
        '<a id="' + index +
        '" data-index="' + index +
        '" data-type="' + sectionData.type +
        '" data-current="' + (index === 0 ? 'true' : 'false') +
        '" data-state="' + (sectionData.state || 'open' ) +
        '" data-completed="false' +
        '" class="toc ' + (index === 0 ? 'dropdown selected-toc' : '') + '" href="#">' +
        '<i class="fa fa-check complete-check not-done ' + (index === sections.length ? 'end-list' : '') + '"></i> ' + sectionData.title + '</a>' +
      '</li>');
  })

}());

window.onbeforeunload = function(event) {
  $(document).trigger('exitCourse', [$('*[data-current="true"]').attr('data-index')]);
  return null;
};

var $currentSection = function(){ return $('*[data-current=true]') };

var updateCurrentSection = function($currentSection){
  $('.toc').each(function(index, toc){ $(toc).attr('data-current', false) });
  $currentSection.attr('data-current', true);
};

var isClosed = function($currentSection){
  return $currentSection.attr('data-state') === 'closed';
};

var openSection = function($section){
  $section.attr('data-state', 'open');
};

var completeSection = function($section){
  $section.attr('data-completed', true);
};

var labelSection = function(index, section){
  return index + '. ' + section;
};

var $videoSection = $('.video-section');
var $exerciseSection = $('.exercise-section');
var $imageSection = $('.image-section');
var $markupSection = $('.markup-section');
var $doneSection = $('.done-section');
var $sections = $('.toc');
var $progress = $('#prog');

var $video = $('#page-video');

var $pauseButton = $('.trigger-pause')
var $playButton = $('.trigger-play')
var $navButtons = $('.toc-but')
var $fullScreenButton = $('#fullscreen-toggle')
var $timeslider = $('#time-slider')
var $timestamp = $('#current-time-value')
var $nextButton = $('.trigger-next')
var $backButton = $('.trigger-back')
var $helpButton = $('#help');

var isComplete = function(){
  var completed=0;
  var incomplete=0;

  $sections.each(function(index, link){
    if($(link).children('.fa-check').hasClass('not-done')){
      incomplete += 1
    }else{
      completed += 1
    }
  });

  return { complete: completed, incomplete: incomplete }
};

var BUTTONS = (function(){
  $helpButton.on('click', function(){
    $(document).trigger('tincan::access_help', [ CONFIG.information.name ]);
  });

  $(document).on('slideChange', function(e, index){
    if(index === 0 || index === undefined){
      $backButton.hide()
    } else {
      $backButton.show()
    }
    if(index === ($sections.length - 1)){
      $nextButton.hide()
    } else {
      $nextButton.show()
    }
  })
}());

$(document).trigger('slideChange', [0]);

var COMPLETION_STATUS=(function(){
  var completedSections = [];
  var completedQuestions = [];
  var completionState = {
    sections: [],
    questions: [],
    lastPage: 0
  };
  var totalSections = $sections.length;

  $progress.empty().append('<span>' + ($currentSection().data('index') + 1) + ' of ' + totalSections + '</span>');

  $(document).on('resumeProgress', function(e, resumedCompletionState){
    var sections = resumedCompletionState.sections;
    var questions = resumedCompletionState.questions;
    var lastPage = resumedCompletionState.lastPage;

    sections.forEach(function(section){
      completedSections.push(section);
      $('*[data-index=' + section + ']').children('.complete-check').removeClass('not-done');
    });

    completedSections = unique(completedSections);
    completionState.sections = completedSections;
    storeAttemptState(completionState);

    questions.forEach(function(question){
      completedQuestions.push(question);
      openSection($('*[data-index=' + question + ']'));
      openSection($('*[data-index=' + (question + 1) + ']'));
      completeSection($('*[data-index=' + question + ']'));
    });

    completedQuestions = unique(completedQuestions);
    completionState.questions = completedQuestions;
    storeAttemptState(completionState);

    $('*[data-index=' + lastPage + ']').trigger('click');
    $('*[data-index=' + lastPage + ']').trigger('touchstart');

  });

  $(document).on('completeSection', function(e, section){
    completedSections.push(section);
    completedSections = unique(completedSections);
    completionState.sections = completedSections;
    storeAttemptState(completionState);

    var currentIndex = $currentSection().data('index');
    $progress.empty().append('<span>' + (currentIndex + 1) + ' of ' + totalSections + '</span>');

    if(completedSections.length === totalSections){
      $(document).trigger('courseComplete');
    }

  });

  $(document).on('exitCourse', function(e, section){
    completionState.lastPage = section;
    storeAttemptState(completionState);
    $(document).trigger('tincan::leave_course', [ CONFIG.information.name, CONFIG.information.name ]);
  });

  $(document).on('questionAnsweredCorrectly',function(e, index){
    completedQuestions.push(index);
    completedQuestions = unique(completedQuestions);
    completionState.questions = completedQuestions;
    storeAttemptState(completionState);
  });

}());

$(document).ready(function(){
  doStart();
  $(document).on('click','#done',function(e){
    var record = isComplete();
    if(record.incomplete === 0){
      if(confirm('Exit Course?')){
        doComplete();
        window.close();
      }
    }else{
      $.alert({ title: '', content: 'You still have '+record.incomplete +' sections to complete.' });
    }
  })
});

var SIDEBAR = (function(){
  var LAST_VISITED = 0;

  $('.toc').on('click', function(e){
    //console.log(isClosed($(e.target)), $(e.target).attr('data-state'))
    if(isClosed($(e.target))){
      $.alert({ title: '', content: 'You must complete the question. If you aren\'t able to continue check your table of contents and make sure there are checkmarks next to all Self Evaluations.' });
    } else {
      if($(e.target).data('type') === 'done'){
        $('.toc').removeClass('selected-toc')
        $(e.target).addClass('selected-toc')
        $('*[data-index=' + LAST_VISITED + ']').children('.complete-check').removeClass('not-done');
        updateCurrentSection($(e.target))
        $(document).trigger('completeSection', [LAST_VISITED])
        $(e.target).children('.complete-check').removeClass('not-done');
        $(document).trigger('completeSection', [$(e.target).data('index')])
        LAST_VISITED = $(e.target).data('index');
      } else {
        $('.toc').removeClass('selected-toc')
        $(e.target).addClass('selected-toc')
        $('*[data-index=' + LAST_VISITED + ']').children('.complete-check').removeClass('not-done');
        updateCurrentSection($(e.target))
        $(document).trigger('completeSection', [LAST_VISITED])
        LAST_VISITED = $(e.target).data('index');
      }
    }
  });

  var triggerBack = function(e){
    if(isClosed($('*[data-index=' + (LAST_VISITED - 1) + ']'))){
      $.alert({ title: '', content: 'You must complete the question. If you aren\'t able to continue check your table of contents and make sure there are checkmarks next to all Self Evaluations.' });
    } else {
      if($('*[data-index=' + (LAST_VISITED - 1) + ']').data('type') === 'done'){
        $('*[data-index=' + LAST_VISITED + ']').children('.complete-check').removeClass('not-done');
        $(document).trigger('completeSection', [LAST_VISITED])
        $('*[data-index=' + (LAST_VISITED - 1) + ']').children('.complete-check').removeClass('not-done');
        updateCurrentSection($('*[data-index=' + (LAST_VISITED - 1) + ']'))
        $(document).trigger('completeSection', [$('*[data-index=' + (LAST_VISITED - 1)  + ']').data('index')])
        LAST_VISITED = LAST_VISITED - 1;
        $('.toc').removeClass('selected-toc')
        $('*[data-index=' + LAST_VISITED + ']').addClass('selected-toc')
      } else {
        $('*[data-index=' + LAST_VISITED + ']').children('.complete-check').removeClass('not-done');
        updateCurrentSection($('*[data-index=' + (LAST_VISITED - 1) + ']'))
        $(document).trigger('completeSection', [LAST_VISITED])
        LAST_VISITED = LAST_VISITED - 1;
        $('.toc').removeClass('selected-toc')
        $('*[data-index=' + LAST_VISITED + ']').addClass('selected-toc')
      }
    }
  };

  var triggerNext = function(e){
    if(isClosed($('*[data-index=' + (LAST_VISITED + 1) + ']'))){
      $.alert({ title: '', content: 'You must complete the question. If you aren\'t able to continue check your table of contents and make sure there are checkmarks next to all Self Evaluations.' });
    } else {
      if($('*[data-index=' + (LAST_VISITED + 1) + ']').data('type') === 'done'){
        $('*[data-index=' + LAST_VISITED + ']').children('.complete-check').removeClass('not-done');
        $(document).trigger('completeSection', [LAST_VISITED])
        $('*[data-index=' + (LAST_VISITED + 1) + ']').children('.complete-check').removeClass('not-done');
        updateCurrentSection($('*[data-index=' + (LAST_VISITED + 1) + ']'));
        $(document).trigger('completeSection', [$('*[data-index=' + (LAST_VISITED + 1) + ']').data('index')]);
        LAST_VISITED = LAST_VISITED + 1;
        $('.toc').removeClass('selected-toc')
        $('*[data-index=' + LAST_VISITED + ']').addClass('selected-toc')
      } else {
        $('*[data-index=' + LAST_VISITED + ']').children('.complete-check').removeClass('not-done');
        updateCurrentSection($('*[data-index=' + (LAST_VISITED + 1) + ']'));
        $(document).trigger('completeSection', [LAST_VISITED])
        LAST_VISITED = LAST_VISITED + 1;
        $('.toc').removeClass('selected-toc')
        $('*[data-index=' + LAST_VISITED + ']').addClass('selected-toc')
      }
    }
  };

  $(document).on('triggerNext', triggerNext);
  $(document).on('triggerBack', triggerBack);

}());

var playVideo = function(video){ $video.get(0).play() }
var pauseVideo = function(video){ $video.get(0).pause() }
var loadVideo = function(video){ $video.get(0).load() }
var isPaused = function(video){ return $video.get(0).paused }

var VIDEO_CONTROLS = (function(){
  var LAST_VISITED = 0;

  var PLAYING_VIDEO = null;

  var TIME_CONTROLS = (function(){

    var video = document.getElementById("page-video");
    var currentTimeValue = document.getElementById("current-time-value");
    var timeSlider = document.getElementById("time-slider");

    video.addEventListener('loadeddata', function() {
      timeSlider.max = video.duration;
    });

    var updateText = function(nativeDOMElement, text){
      var txt = document.createTextNode(text);
      nativeDOMElement.innerText = txt.textContent;
    };

    var createGetSetHandler = function(get, set){
      var throttleTimer;
      var blockedTimer;
      var blocked;

      return {
        get: function(){
          if(blocked){ return; }
          return get.apply(this, arguments);
        },
        set: function(){
          clearTimeout(throttleTimer);
          clearTimeout(blockedTimer);

          var that = this;
          var args = arguments;
          blocked = true;
          throttleTimer = setTimeout(function () {
            set.apply(that, args);
            blockedTimer = setTimeout(function () {
              blocked = false;
            }, 30);
          }, 0);
        }
      };
    };

    var getSetCurrentTime = createGetSetHandler(
        function(){ timeSlider.value = video.currentTime; },
        function(){ try { video.currentTime = timeSlider.value } catch (er) {} }
    );

    timeSlider.oninput = function(){
      getSetCurrentTime.set();
    };

    video.ontimeupdate = function(){
      var formatTime = function(timeInSeconds){
        var str_pad_left = function(string, pad, length) {
          return (new Array(length + 1).join(pad) + string).slice(-length);
        };
        var time = Math.round(timeInSeconds);
        var minutes = Math.floor(time / 60);
        var seconds = time - minutes * 60;

        return str_pad_left(minutes, '0', 2) + ':' + str_pad_left(seconds, '0', 2);
      };

      updateText(currentTimeValue, formatTime(video.currentTime));
      getSetCurrentTime.get();

    };
  }());

  var videoList = CONFIG.videos;

  $(document).on('exitCourse', function(){
    if(PLAYING_VIDEO){
      $(document).trigger('tincan::stop_video', [ CONFIG.information.name ].concat(PLAYING_VIDEO));
    }
  });

  $(document).on('playVideo', function(event, $video){
    var src = $video.attr('src');
    var currentTime = $video.prop('currentTime');
    var section = CONFIG.sections[LAST_VISITED].title;
    var info = [ src, currentTime, section ];
    PLAYING_VIDEO = info;
    $(document).trigger('tincan::start_video', [ CONFIG.information.name ].concat(info));
  });

  $(document).on('pauseVideo', function(event, $video){
    var src = $video.attr('src');
    var currentTime = $video.prop('currentTime');
    var section = CONFIG.sections[LAST_VISITED].title;
    var info = [ src, currentTime, section ];
    PLAYING_VIDEO = null;
    $(document).trigger('tincan::stop_video', [ CONFIG.information.name ].concat(info));
  });

  var enterFullScreen = function($element){

    var nativeDOMElement = $element.get(0);
    if (nativeDOMElement.requestFullscreen){
      nativeDOMElement.requestFullscreen();
    } else if (nativeDOMElement.msRequestFullscreen){
      nativeDOMElement.msRequestFullscreen();
    } else if (nativeDOMElement.mozRequestFullScreen){
      nativeDOMElement.mozRequestFullScreen();
    } else if (nativeDOMElement.webkitRequestFullscreen){
      nativeDOMElement.webkitRequestFullscreen();
    }
  };

  $fullScreenButton.on('click', function(){
    enterFullScreen($video)
  });

  $(document).on('exitCourse', function(){
    var section = CONFIG.sections[LAST_VISITED];
    $(document).trigger('tincan::leave_section', [ CONFIG.information.name, labelSection(LAST_VISITED, section.title), section.type ]);
  });

  var toggleView=function(view, index){
    var isVideo = view === 'video';
    var isExercise = view === 'exercise';
    var isImage = view === 'image';
    var isDone = view === 'done';
    var isMarkup = view === 'markup';
    if(isVideo){
      $exerciseSection.hide()
      $imageSection.hide();
      $markupSection.hide();
      $doneSection.hide();
      $videoSection.show()
      $video.show()
      $navButtons.show()
      $pauseButton.show()
      $playButton.show()
      $fullScreenButton.show()
      $timeslider.show()
      $timestamp.show()
        $video.attr('src',videoList[index]);
        loadVideo($video)
        playVideo($video)
        $(document).trigger('slideChange', [index]);
    } else if(isExercise){
      $videoSection.hide()
      $imageSection.hide()
      $markupSection.hide()
      $doneSection.hide();
      $exerciseSection.show();
      pauseVideo($video)
      $video.hide()
      $navButtons.show()
      $pauseButton.hide()
      $playButton.hide()
      $fullScreenButton.hide()
      $timeslider.hide()
      $timestamp.hide()
      $(document).trigger('renderQuestion',[index])
      $(document).trigger('slideChange', [index]);
    } else if(isImage){
      $videoSection.hide()
      $exerciseSection.hide()
      $doneSection.hide();
      $imageSection.show();
      $markupSection.hide()
      pauseVideo($video)
      $video.hide()
      $navButtons.show()
      $pauseButton.hide()
      $playButton.hide()
      $fullScreenButton.hide()
      $timeslider.hide()
      $timestamp.hide()
      $(document).trigger('renderImage',[index])
      $(document).trigger('slideChange', [index]);
    } else if(isMarkup){
      $videoSection.hide()
      $exerciseSection.hide()
      $doneSection.hide();
      $markupSection.show();
      pauseVideo($video)
      $video.hide()
      $navButtons.show()
      $pauseButton.hide()
      $playButton.hide()
      $fullScreenButton.hide()
      $timeslider.hide()
      $timestamp.hide()
      $(document).trigger('renderMarkup',[index])
      $(document).trigger('slideChange', [index]);
    } else if(isDone){
      $videoSection.hide()
      $exerciseSection.hide()
      $imageSection.hide();
      $doneSection.show();
      pauseVideo($video)
      $video.hide()
      $pauseButton.hide()
      $playButton.hide()
      // $navButtons.hide()
      $fullScreenButton.hide()
      $timeslider.hide()
      $timestamp.hide()
      $(document).trigger('renderDone',[index])
      $(document).trigger('slideChange', [index]);
    }
  }

  $('.toc').on('click', function(e){
    if(!isClosed($(e.target))){
      var type = $(e.target).data('type');
      var currentVideo= $(e.target).data('index');
      var section = CONFIG.sections[LAST_VISITED];
      $(document).trigger('tincan::leave_section', [ CONFIG.information.name, labelSection(LAST_VISITED, section.title), section.type ]);
      LAST_VISITED = $(e.target).data('index');
      section = CONFIG.sections[LAST_VISITED];
      $(document).trigger('tincan::access_section', [ CONFIG.information.name, labelSection(LAST_VISITED, section.title), section.type ]);
      toggleView(type, currentVideo)
    }
  });

  $playButton.on('click',function(e){playVideo($video)})
  $pauseButton.on('click',function(e){pauseVideo($video)})

  var triggerNext = function(e){
    if(!isClosed($('*[data-index=' + (LAST_VISITED + 1) + ']'))){
      var currentSource=$video.attr('src');
      var section = CONFIG.sections[LAST_VISITED];
      $(document).trigger('tincan::leave_section', [ CONFIG.information.name, labelSection(LAST_VISITED, section.title), section.type ]);
      LAST_VISITED = LAST_VISITED + 1;
      section = CONFIG.sections[LAST_VISITED];
      $(document).trigger('tincan::access_section', [ CONFIG.information.name, labelSection(LAST_VISITED, section.title), section.type ]);
      var type=$('*[data-index=' + LAST_VISITED + ']').data('type')
      $(document).trigger('triggerNext')
      toggleView(type,LAST_VISITED)
    } else {
      $.alert({ title: '', content: 'You must complete the question. If you aren\'t able to continue check your table of contents and make sure there are checkmarks next to all Self Evaluations.' });
    }
  }

  var triggerBack = function(e){
    if(!isClosed($('*[data-index=' + (LAST_VISITED - 1) + ']'))){
      var currentSource=$video.attr('src');
      var section = CONFIG.sections[LAST_VISITED];
      $(document).trigger('tincan::leave_section', [ CONFIG.information.name, labelSection(LAST_VISITED, section.title), section.type ]);
      LAST_VISITED = LAST_VISITED - 1;
      section = CONFIG.sections[LAST_VISITED];
      $(document).trigger('tincan::access_section', [ CONFIG.information.name, labelSection(LAST_VISITED, section.title), section.type ]);
      var type=$('*[data-index=' + LAST_VISITED + ']').data('type')
      $(document).trigger('triggerBack')
      toggleView(type,LAST_VISITED)
    } else {
      $.alert({ title: '', content: 'You must complete the question. If you aren\'t able to continue check your table of contents and make sure there are checkmarks next to all Self Evaluations.' });
    }
 }


  $('.trigger-back').on('click', triggerBack);

  $('.trigger-next').on('click', triggerNext);

 $(document).on('questionAnsweredCorrectly', triggerNext);

  document.getElementById('page-video').addEventListener('ended',triggerNext, false)

}());

var IMAGES= CONFIG.images;

var MARKUP= CONFIG.markup;

var QUESTIONS=(function(){
  var questionData = CONFIG.questions;

  var multipleQuestionView=function(questionData){
    return'<div class="question">'+
        '<div class="question-identifier">'+
        questionData.questionIdentifier+
        '</div>'+
        '<div class="question-text">'+
        questionData.questionText+
        '</div>'+
        '<div class="question-answers">'+
        questionData.answerChoices.map(function(answerChoice){
          return  '<div class="pointer question-section pad-bot">' +
              '<input type="radio" name="'+ questionData.questionIdentifier +'" data-index="'+questionData.questionIndex+'" data-is-correct="'+answerChoice.isCorrect+'" class="radio-inline multiple-choice"/>'+
              '<span class="question-answer" data-index="'+questionData.questionIndex+'" data-is-correct="'+answerChoice.isCorrect+'" data-feedback-response="'+answerChoice.feedback.response+'" data-feedback-text="'+answerChoice.feedback.text+'">'+
              answerChoice.answerValue + ( answerChoice.answerText ? (' - ' +answerChoice.answerText) : '' ) +
              '</span>' +
              '</div>'
        }).join('')+
        '</div>'+
        '</div>';}

  var tfQuestionView=function(questionData){
    return'<div class="question">'+
        '<div class="question-identifier">'+
        questionData.questionIdentifier+
        '</div>'+
        '<div class="question-text">'+
        questionData.questionText+
        '</div>'+
        '<div class="question-answers">'+
        questionData.answerChoices.map(function(answerChoice){
          return '<p class="pointer question-answer" data-index="'+questionData.questionIndex+'" data-is-correct="'+answerChoice.isCorrect+'" data-feedback-response="'+answerChoice.feedback.response+'" data-feedback-text="'+answerChoice.feedback.text+'"><span class="tf-choice" data-index="'+questionData.questionIndex+'">'+answerChoice.answerValue+'</span></p>'
        }).join('')+
        '</div>'+
        '</div>';}

  var questionRenderer=function(isComplete, $element, question){
    $element.empty()

    if(question.type === 'multiple'){
      $element.append(multipleQuestionView(question));
      if(isComplete){
        $('*[data-is-correct=true]').prop('checked', true)
      }
    }

    if(question.type === 'tf'){
      $element.append(tfQuestionView(question))
    }
  }

  var imageRenderer=function($element, image){
    $element.empty()
    $element.append('<a href="http://www.aaas.org/join" target="_blank"><img class="join-img" src="'+image.src+'"><img></a>')
  }

  var markupRenderer=function($element, markup){
    $element.empty()
    $element.append(markup)
  }

  var doneRenderer=function($element){
    var html = '<div class="sec-bg">'+
        '<h2 class="congrats">Congratulations!</h2>'+
        '<p class="end-text" style="color:#015699"><span>You have reached the end of this course.</p>' + 
        '<p class="end-text">If you have completed all sections of this course, and wish to claim your certificate, click Finish Course below. You will be returned to the My Courses page.</span></p>'+
        '<p class="end-text" style="color:#015699"><em>*Your completed progress will be retained upon subsequent revisits.</em></span></p>'+
        '<button class="finish-button" id="done">Finish Course</button>'+
        '</div>';
    $element.empty()
    $element.append(html)
  }

  $(document).on('renderQuestion',function(e,index){
    var isComplete = JSON.parse($('*[data-index=' + index + ']').attr('data-completed'))
    questionRenderer(isComplete, $exerciseSection,questionData.filter(function(question){
      return question.questionIndex === index
    })[0])
  })

  $(document).on('renderImage',function(e,index){
    imageRenderer($imageSection,IMAGES.filter(function(image){
      return image.imageIndex === index
    })[0])
  })

  $(document).on('renderMarkup',function(e,index){
    markupRenderer($markupSection,MARKUP.filter(function(markup){
      return markup.index === index
    })[0].value)
  })

  $(document).on('renderDone',function(e,index){
    doneRenderer($doneSection)
  })

  $(document).on('click', '.modal-content', function(){ $('#myModal').modal('hide') });

  $(document).on('attemptAnswer',function(e, index, feedbackResponse, feedbackText, isCorrect){
    $('.modal-body').empty()
    $('.modal-content').removeClass('success').removeClass('fail');
    if(isCorrect){
      $('.modal-content').addClass('success')
      openSection($('*[data-index=' + (index + 1) + ']'));
      completeSection($('*[data-index=' + (index) + ']'));
      $(document).trigger('questionAnsweredCorrectly', [index]);
    } else {
      $('.modal-content').addClass('fail')
    }
    $('.modal-body').append('<div class="feedback">'+
    '<div class="response-let">'+
    feedbackResponse+
    '</div>'+
    '<div class="feedback-txt">'+
    feedbackText+
    '</div>'+
    '</div>')
    $('#myModal').modal({})
  })

  $(document).on('click','.question-answer, .question-section',function(e){
    e.stopPropagation()
    if(!$(e.target).hasClass('pad-bot')) {
      var isCorrect = $(e.target).siblings('.question-answer').length === 0 ? $(e.target).closest('.question-answer').data('is-correct') : $(e.target).siblings('.question-answer').data('is-correct')
      var feedbackResponse = $(e.target).siblings('.question-answer').length === 0 ? $(e.target).closest('.question-answer').data('feedback-response') : $(e.target).siblings('.question-answer').data('feedback-response')
      var feedbackText = $(e.target).siblings('.question-answer').length === 0 ? $(e.target).closest('.question-answer').data('feedback-text') : $(e.target).siblings('.question-answer').data('feedback-text')
      $(e.target).prop('nodeName') === 'INPUT' ? '' : $(e.target).siblings('input').prop("checked", true)
      $(document).trigger('attemptAnswer', [$(e.target).data('index'), feedbackResponse, feedbackText, isCorrect])
    }
  })

}());

var MEDIAQUERY =(function(){
  var bigg =function(){
    $('.big-but').show();
    $('.toc-but-header').hide();
    $videoSection.removeAttr('controls')
  }

  var smal =function(){
    $('.big-but').hide();
    $('.toc-but-header').show();
    $videoSection.attr('controls', '')
  }

  enquire.register("screen and (min-width: 480px)", {
    match : function() {
      bigg()
    },
    unmatch : function() {
      smal();
    }
  });

  enquire.register("screen and (max-width: 480px)", {
    match : function() {
      smal()
    },
    unmatch : function() {
      bigg();
    }
  });

}());

var FIRST_SECTION = (function(){
  var index = parseInt($currentSection().attr('data-index'));
  var section = CONFIG.sections[index];
  $(document).trigger('tincan::access_section', [ CONFIG.information.name, labelSection(index, section.title), section.type ]);
}());