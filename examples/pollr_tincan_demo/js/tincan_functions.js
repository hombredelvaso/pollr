$(document).on('tincan::init', function(){
  //
  // ActivityID that is sent for the statement's object
  TC_COURSE_ID = CONFIG.information.id;

  //
  // CourseName for the activity
  TC_COURSE_NAME = {
    "en-US": CONFIG.information.title
  };

  //
  // CourseDesc for the activity
  TC_COURSE_DESC = {
    "en-US": CONFIG.information.title
  };

  //
  // Pre-configured LRSes that should receive data, added to what is included
  // in the URL and/or passed to the constructor function.
  //
  // An array of objects where each object may have the following properties:
  //
  //    endpoint: (including trailing slash '/')
  //    auth:
  //    allowFail: (boolean, default true)
  //
  // TC_RECORD_STORES = [
  //   {
  //     endpoint: "https://cloud.scorm.com/ScormEngineInterface/TCAPI/public/",
  //     auth:     "Basic VGVzdFVzZXI6cGFzc3dvcmQ="
  //   }
  // ];

  Tincan = {};

  Tincan.CourseActivity = {
    id: TC_COURSE_ID,
    definition: {
      type: "http://adlnet.gov/expapi/activities/course",
      name: TC_COURSE_NAME,
      description: TC_COURSE_DESC
    }
  };

  Tincan.getContext = function(parentActivityId, isAssessment){
    isAssessment = typeof isAssessment !== 'undefined' ? isAssessment : false;
    var ctx = {
      contextActivities: {
        grouping: [
          {
            id: Tincan.CourseActivity.id
          },
          {
            id: "http://id.tincanapi.com/activity/tincan-prototypes"
          }
        ],
        category: [
          {
            id: "http://id.tincanapi.com/recipe/tincan-prototypes/golf/1",
            definition: {
              type: "http://id.tincanapi.com/activitytype/recipe"
            }
          },
          {
            id: "http://id.tincanapi.com/activity/tincan-prototypes/elearning",
            definition: {
              type: "http://id.tincanapi.com/activitytype/source",
              name: {
                "en-US": "E-learning course"
              },
              description: {
                "en-US": "An e-learning course built using the golf prototype framework."
              }
            }
          }
        ]
      }
    };
    if (parentActivityId !== undefined && parentActivityId !== null) {
      ctx.contextActivities.parent = {
        id: parentActivityId
      };
    }
    if (isAssessment){
      ctx.contextActivities.grouping.push({
        id: Tincan.CourseActivity.id + "/GolfAssessment"
      });
    }
    return ctx;
  };

  tincan = new TinCan ({
    url: window.location.href,
    activity: Tincan.CourseActivity
  });

  var BookmarkingTracking = function(){
    this.questionsAnswered = {};
    this.completionState=[];
    this.currentPage = 0;
    this.startTimeStamp = new Date();
    this.startAttemptDuration = 0;
    this.attemptComplete = false;
  };

  BookmarkingTracking.prototype = {
    initFromBookmark: function(bookmark){
      // this.setPage(parseInt(bookmark.location, 10));
      // this.setStartDuration(bookmark.attemptDuration);
      // this.getCompletion(bookmark.attemptComplete);
      if(bookmark && bookmark.completionState){
        this.completionState=bookmark.completionState;
        $(document).trigger('resumeProgress', [this.completionState])
      }
    },
    reset: function(){
      this.setPage(0);
      this.setStartDuration(0);
      this.setCompletion(false);
    },
    save: function (callback){
      var bookmarking = {
        location: this.currentPage,
        attemptDuration: this.getAttemptDuration(),
        attemptComplete: this.attemptComplete,
        questionsAnswered: this.questionsAnswered,
        completionState: this.completionState
      };
      tincan.setState("bookmarking-data", bookmarking, {
        contentType: "application/json",
        overwriteJSON: false,
        callback: callback
      });
    },
    get: function(){
      var stateResult = tincan.getState("bookmarking-data") || {};
      if (stateResult.err === null && stateResult.state !== null && stateResult.state.contents !== "") {
        return stateResult.state.contents;
      }
      return null;
    },
    setStartDuration: function(duration){
      this.startAttemptDuration = duration;
    },
    setPage: function(page){
      this.currentPage = page;
      return true;
    },
    getPage: function(){
      return this.currentPage;
    },
    incrementPage: function (){
      this.currentPage++;
    },
    decrementPage: function (){
      this.currentPage--;
    },
    setCompletion: function(completion){
      this.attemptComplete = completion;
      return true;
    },
    getCompletion: function(completion){
      return this.attemptComplete;
    },
    getAttemptDuration: function (){
      return this.startAttemptDuration + this.getSessionDuration();
    },
    getSessionDuration: function (){
      return Math.abs ((new Date()) - this.startTimeStamp);
    },
    setAttemptState: function(state){
      this.completionState = state;
    },
    getAttemptState: function(){
      return completionState;
    },
    setQuestionsAnswered: function(questionTitle, questionState){
      this.questionsAnswered[questionTitle] = questionState;
    },
    getQuestionsAnswered: function(){
      return this.questionsAnswered;
    }
  };

  var bookmarkingData = new BookmarkingTracking();

  var doTracking = function(type, info){
    var statements = [];

    var createObject = function(info){
      if(type === 'access_course'){
        return {
          "id": TC_COURSE_ID,
          "objectType": "Activity",
          "definition": {
            "name": { "en-US": info.name },
            "description": { "en-US": info.courseName },
            "type": 'http://adlnet.gov/expapi/activities/course'
          },
          "name": info.name,
          "extensions": {
            "http://scitent.com/xapi/action": {"name":{"en-US":"action"},"description":{"en-US":"access_course"}},
            "http://scitent.com/xapi/name": {"name":{"en-US":"name"},"description":{"en-US": info.name}},
            "http://scitent.com/xapi/start": {"name":{"en-US":"start"},"description":{"en-US": info.start}}
          }
        }
      }

      if(type === 'leave_course'){
        return {
          "id": TC_COURSE_ID,
          "objectType": "Activity",
          "definition": {
            "name": { "en-US": info.name },
            "description": { "en-US": info.courseName },
            "type": 'http://adlnet.gov/expapi/activities/course'
          },
          "name": info.name,
          "extensions": {
            "http://scitent.com/xapi/action": {"name":{"en-US":"action"},"description":{"en-US":"leave_course"}},
            "http://scitent.com/xapi/name": {"name":{"en-US":"name"},"description":{"en-US": info.name}},
            "http://scitent.com/xapi/end": {"name":{"en-US":"end"},"description":{"en-US": info.end.end}},
            "http://scitent.com/xapi/elapsed": {"name":{"en-US":"elapsed"},"description":{"en-US": info.end.elapsed}}
          }
        }
      }

      if(type === 'access_section'){
        return {
          "id": TC_COURSE_ID,
          "objectType": "Activity",
          "definition": {
            "name": { "en-US": info.name },
            "description": { "en-US": info.courseName },
            "type": (info.type === 'exercise' ? 'http://adlnet.gov/expapi/activities/assessment' : 'http://adlnet.gov/expapi/activities/lesson')
          },
          "name": info.name,
          "extensions": {
            "http://scitent.com/xapi/action": {"name":{"en-US":"action"},"description":{"en-US":"access_section"}},
            "http://scitent.com/xapi/name": {"name":{"en-US":"name"},"description":{"en-US": info.name}},
            "http://scitent.com/xapi/start": {"name":{"en-US":"start"},"description":{"en-US": info.start}}
          }
        }
      }

      if(type === 'leave_section'){
        return {
          "id": TC_COURSE_ID,
          "objectType": "Activity",
          "definition": {
            "name": { "en-US": info.name },
            "description": { "en-US": info.courseName },
            "type": (info.type === 'exercise' ? 'http://adlnet.gov/expapi/activities/assessment' : 'http://adlnet.gov/expapi/activities/lesson')
          },
          "name": info.name,
          "extensions": {
            "http://scitent.com/xapi/action": {"name":{"en-US":"action"},"description":{"en-US":"leave_section"}},
            "http://scitent.com/xapi/name": {"name":{"en-US":"name"},"description":{"en-US": info.name}},
            "http://scitent.com/xapi/end": {"name":{"en-US":"end"},"description":{"en-US": info.end.end}},
            "http://scitent.com/xapi/elapsed": {"name":{"en-US":"elapsed"},"description":{"en-US": info.end.elapsed}}
          }
        }
      }

      if(type === 'start_video'){
        return {
          "id": TC_COURSE_ID,
          "objectType": "Activity",
          "definition": {
            "name": { "en-US": (info.section + ' - ' + info.src) },
            "description": { "en-US": info.courseName },
            "type": 'http://adlnet.gov/expapi/activities/media'
          },
          "name": info.src,
          "extensions": {
            "http://scitent.com/xapi/action": {"name":{"en-US":"action"},"description":{"en-US":"start_video"}},
            "http://scitent.com/xapi/src": {"name":{"en-US":"src"},"description":{"en-US": info.src}},
            "http://scitent.com/xapi/currentTime": {"name":{"en-US":"currentTime"},"description":{"en-US": info.currentTime}},
            "http://scitent.com/xapi/start": {"name":{"en-US":"start"},"description":{"en-US": info.start}}
          }
        }
      }

      if(type === 'end_video'){
        return {
          "id": TC_COURSE_ID,
          "objectType": "Activity",
          "definition": {
            "name": { "en-US": (info.section + ' - ' + info.src) },
            "description": { "en-US": info.courseName },
            "type": 'http://adlnet.gov/expapi/activities/media'
          },
          "name": info.src,
          "extensions": {
            "http://scitent.com/xapi/action": {"name":{"en-US":"action"},"description":{"en-US":"end_video"}},
            "http://scitent.com/xapi/src": {"name":{"en-US":"src"},"description":{"en-US": info.src}},
            "http://scitent.com/xapi/currentTime": {"name":{"en-US":"currentTime"},"description":{"en-US": info.currentTime}},
            "http://scitent.com/xapi/end": {"name":{"en-US":"end"},"description":{"en-US": info.end.end}},
            "http://scitent.com/xapi/elapsed": {"name":{"en-US":"elapsed"},"description":{"en-US": info.end.elapsed}}
          }
        }
      }

      if(type === 'access_help'){
        return {
          "id": TC_COURSE_ID,
          "objectType": "Activity",
          "definition": {
            "name": "help button",
            "description": { "en-US": info.courseName }
          },
          "extensions": {
            "http://scitent.com/xapi/action": {"name":{"en-US":"action"},"description":{"en-US":"access_help"}}
          }
        }
      }

    };

    var createResult = function(info){
      if(type === 'access_course'){
        return {};
      }

      if(type === 'leave_course'){
        return {
          "duration": TinCan.Utils.convertMillisecondsToISO8601Duration(info.end.elapsed)
        }
      }

      if(type === 'access_section'){
        return {};
      }

      if(type === 'leave_section'){
        return {
          "duration": TinCan.Utils.convertMillisecondsToISO8601Duration(info.end.elapsed)
        }
      }

      if(type === 'start_video'){
        return {};
      }

      if(type === 'end_video'){
        return {
          "duration": TinCan.Utils.convertMillisecondsToISO8601Duration(info.end.elapsed)
        }
      }

      if(type === 'access_help'){
        return {};
      }

    };

    var interactionStatement = {
      verb: {
        id: "http://adlnet.gov/expapi/activities/interaction",
        display: {
          "en-US" : "interacted with"
        }
      },
      result: createResult(info),
      object: createObject(info),
      context: Tincan.getContext()
    };

    statements.push(interactionStatement);

    tincan.sendStatements(statements);
  };

  var doStart = function(){
    var statements = [];

    var initializedStatement = {
      verb: {
        id: "http://adlnet.gov/expapi/verbs/initialized",
        display: {
          "en-US" : "initialized"
        }
      },
      context: Tincan.getContext(),
      result: {
        duration: "PT0S"
      }
    };

    var attemptedStatement = {
      verb: {
        id: "http://adlnet.gov/expapi/verbs/attempted",
        display: {
          "en-US" : "attempted"
        }
      },
      context: Tincan.getContext(),
      result: {
        duration: "PT0S"
      }
    };

    statements.push(initializedStatement);

    //get activity_id bookmark if it exists
    var bookmark = bookmarkingData.get();

    if (bookmark !== null) {

      $.confirm({
        content: 'Do you want to resume where you left off?',
        confirmButton: 'YES',
        cancelButton: 'NO',
        confirm: function(){
          bookmarkingData.initFromBookmark(bookmark);

          if (!bookmarkingData.getCompletion()) {
            var resumedStatement = {
              verb: {
                id: "http://adlnet.gov/expapi/verbs/resumed",
                display: {
                  "en-US": "resumed"
                }
              },
              context: Tincan.getContext(),
              result: {
                duration: TinCan.Utils.convertMillisecondsToISO8601Duration(bookmark.attemptDuration)
              }
            };
            statements.push(resumedStatement);
          }
        },
        cancel: function(){
          bookmarkingData.reset();

          //start new attempt
          statements.push(attemptedStatement);
          bookmarkingData.save();
        }
      });

    } else {
      // if there isn't a stored bookmark, start the user at the first page
      bookmarkingData.setPage(0);
      statements.push(attemptedStatement);
    }

    tincan.sendStatements(statements);
    //goToPage();
  };

  var doStoreQuestionResponse = function(questionTitle, questionState){
    var statements = [];

    var answeredStatement = {
      verb: {
        id: "http://adlnet.gov/expapi/verbs/answered",
        display: {
          "en-US": "answered"
        }
      },
      context: Tincan.getContext(),
      result: {
        response: questionState.answer
      }
    };

    bookmarkingData.setQuestionsAnswered(questionTitle, questionState);

    bookmarkingData.save();

    statements.push(answeredStatement);

    tincan.sendStatements(statements);
  };

  var storeAttemptState = function(state){
    bookmarkingData.setAttemptState(state)
    bookmarkingData.save();
  };

  var doComplete = function(){
    var statements = [];

    var completedStatement = {
      verb: {
        id: "http://adlnet.gov/expapi/verbs/completed",
        display: {
          "en-US": "completed"
        }
      },
      context: Tincan.getContext(),
      result: {
        completion: true,
        success: true,
//            "score": {
//              "scaled": 0.9,
//              "raw": 90,
//              "min": 0,
//              "max": 100
//            },
        duration: "PT0S"
      }
    };

    statements.push(completedStatement);

    tincan.sendStatements(statements);
  };

  // poll type action
  var pollVerb = 'http://adlnet.gov/expapi/verbs/polled';
  var pollDisplay = 'polled';

  // poll identifier
  var pollIdExtension = 'http://adlnet.gov/expapi/activities/poll';

  var doPolled = function(identifier, type, question, response){
    var statements = [];

    var createObject = function(){
      return {
        "id": TC_COURSE_ID,
        "objectType": "Activity",
        "definition": {
          "name": { "en-US": question },
          "description": { "en-US": TC_COURSE_NAME["en-US"] },
          "type": pollIdExtension + '/' + type
        },
        "name": identifier
      }
    };

    var createResult = function(){
      return {
        "response": response
      }
    };

    var interactionStatement = {
      verb: {
        id: pollVerb,
        display: {
          "en-US" : pollDisplay
        }
      },
      result: createResult(),
      object: createObject(),
      context: {
        extensions: {
          "http://id.tincanapi.com/extension/poll": identifier
        }
      }
    };

    statements.push(interactionStatement);

    tincan.sendStatements(statements);

  };

  var getPollData = function(identifier, callback){
    tincan.getStatements({
      params: { verb: { "id": pollVerb } },
      callback: function(err, result){
        if(err){ console.log(err); return err; }
        var pollId = identifier;
        var statements = result['statements'].filter(function(statement){ return statement['context']['extensions'] && statement['context']['extensions'][pollIdExtension] === pollId });
        var statement = statements.filter(function(statement){ return statement['actor']['account']['name'] === tincan.actor.account.name });
        callback({
          submission: statement.length === 0 ? null : statement[0]['result']['response'],
          submissions: statements.map(function(statement){ return { value: statement['result']['response'] } })
        });
      }
    })
  };

  $(document).on('tincan::start', function(event){
    doStart();
  });

  $(document).on('tincan::storeAttemptState', function(event, completionState){
    storeAttemptState(completionState);
  });

  $(document).on('tincan::complete', function(event){
    doComplete();
  });

  //////////////
  // add-ons //
  ////////////

  $(document).on('tincan::polled', function(event, identifier, type, question, response){
    doPolled(identifier, type, question, response);
  });

  $(document).on('tincan::getPollData', function(event, identifier, callback){
    getPollData(identifier, callback);
  });

  $(document).on('tincan::actionPlanItem', function(event, identifier, response){
    // store response to action plan...
    // later aggregate all and take latest of each for the individual to produce a takeaway
  });

  ///////////////
  // tracking //
  /////////////

  $(document).on('tincan::access_course', function(event, courseName, name){
    var start = timer.start(slugify(name));
    doTracking('access_course', { courseName: courseName, name: name, start: start });
    //console.log('access_course', name, start);
  });

  $(document).on('tincan::leave_course', function(event, courseName, name){
    var end = timer.stop(slugify(name));
    doTracking('leave_course', { courseName: courseName, name: name, end: end });
    //console.log('leave_course', name, end);
  });

  $(document).on('tincan::access_section', function(event, courseName, name, type){
    var start = timer.start(slugify(name));
    doTracking('access_section', { courseName: courseName, name: name, type: type, start: start });
    //console.log('access_section', name, start);
  });

  $(document).on('tincan::leave_section', function(event, courseName, name, type){
    var end = timer.stop(slugify(name));
    doTracking('leave_section', { courseName: courseName, name: name, type: type, end: end });
    //console.log('leave_section', name, end);
  });

  $(document).on('tincan::start_video', function(event, courseName, src, currentTime, section){
    var start = timer.start(slugify(src));
    doTracking('start_video', { courseName: courseName, src: src, currentTime: currentTime, section: section, start: start });
    //console.log('start_video', src, currentTime, start);
  });

  $(document).on('tincan::stop_video', function(event, courseName, src, currentTime, section){
    var end = timer.stop(slugify(src));
    doTracking('end_video', { courseName: courseName, src: src, currentTime: currentTime, section: section, end: end });
    //console.log('end_video', src, currentTime, end);
  });

  $(document).on('tincan::access_help', function(event, courseName){
    doTracking('access_help', { courseName: courseName })
    //console.log('access_help');
  });
});

var tincanImplement = function(){
  $(document).trigger('tincan::init');
};

var localImplement = function(){
  $(document).on('tincan::start', function(event){
    console.log('tincan::start');
  });

  $(document).on('tincan::storeAttemptState', function(event, completionState){
    console.log('tincan::storeAttemptState', completionState);
  });

  $(document).on('tincan::complete', function(event){
    console.log('tincan::complete');
  });

  $(document).on('tincan::access_course', function(event, courseName, name){
    var start = timer.start(slugify(name));
    console.log('tincan::access_course', courseName, name, start);
  });

  $(document).on('tincan::leave_course', function(event, courseName, name){
    var end = timer.stop(slugify(name));
    console.log('tincan::leave_course', courseName, name, end);
  });

  $(document).on('tincan::access_section', function(event, courseName, name, type){
    var start = timer.start(slugify(name));
    console.log('tincan::access_section', courseName, name, type, start);
  });

  $(document).on('tincan::leave_section', function(event, courseName, name, type){
    var end = timer.stop(slugify(name));
    console.log('tincan::leave_section', courseName, name, type, end);
  });

  $(document).on('tincan::start_video', function(event, courseName, src, currentTime, section){
    var start = timer.start(slugify(src));
    console.log('tincan::start_video', courseName, src, currentTime, section, start);
  });

  $(document).on('tincan::stop_video', function(event, courseName, src, currentTime, section){
    var end = timer.stop(slugify(src));
    console.log('tincan::end_video', courseName, src, currentTime, section, end);
  });

  $(document).on('tincan::access_help', function(event, courseName){
    console.log('tincan::access_help', courseName);
  });
};

///////////
// init //
/////////

var isLocal = window.location.protocol === 'file:';

if(!isLocal){

  window.onload = function (){
    $(document).trigger('courseReady', [ tincanImplement() ])
  };

} else { //isLocal

  var course = { // data pulled from LMS
    completionStatus: 'incomplete',
    learnername: 'test learner',
    suspendData: { questions: { } },
    location: 0
  };

  console.log('runninglocallynotincanstatement');

  $(document).trigger('courseReady', [ localImplement() ]);

}
      