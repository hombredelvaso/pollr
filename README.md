#### build
```npm run compile```

#### TODO
- if slow to compile all results... change style of results to keep aggregate poll result statement that is updated each time... only need to find ONE statement, not many then compile each time...
  - also update poll.js `buildAllAnswers`

- jscompress for final payload in pipeline?
- cdn to serve js file instead of adding to package? (distributed updates)
- push out data to be stored for local?
- animate on transition?
- on transition callback additon in config... add function to store answeres and use as needed
- config... should show front even if previously submitted?
- safe identifier: sluggify, make unique... or throw error

#### use
- mount divs

```html
<div id="yesno-poll"></div>
```

- script include

```html
<script src="dist/pollr.js"></script>
```

- init

> data-pollr-question: insert text/html

> data-pollr-submission: onclick

> data-pollr-your-answer: insert text/html

> data-pollr-continue: onclick

```javascript
Pollr.init({
  'poll-1-version-1': {
    name: 'Poll 1',
    question: '<p>What is your favorite animal?</p>',
    input: {
      type: 'radio',
      choices: [
        { text: 'Zebra' },
        { text: 'Orangutan' },
        { text: 'Ocelot' }
      ]
    },
    answerType: 'chart',
    changeType: 'standard',
    continue: function(){
      alert('poll complete')
    },
    markup: {
      front: {
        class: 'pollr-poll-front',
        question: '<p data-pollr-question></p>',
        submission: '<button data-pollr-submission>Submit</button>'
      },
      back: {
        class: 'pollr-poll-back',
        yourAnswer: '<p>You chose: <span data-pollr-your-answer></span></p>',
        continue: '<button data-pollr-continue>Continue</button>'
      }
    }
  }
});
```

- setup external submission protocol

```javascript
Pollr.onSubmission(function(submission){
  console.log('store ' + submission + ' to tincan, localstore, etc...')
});
```

- embed

```javascript
Pollr.embed({ poll: 'poll-1-version-1', mount: '#yesno-poll' });
```

```javascript
var getData = function(identifier, callback){
  // do something to get mydata[identifier], theirdata[identifier] \\
  callback({ submission: mydata[identifier], submissions: theirdata[identifier] });
};

getData('poll-1-version-1', function(data){
  Pollr.embed({ poll: 'poll-1-version-1', mount: '#yesno-poll', data: data });
});
```