# harcon-amqp
AMQP transport layer ("Barrel") plugin for [harcon](https://github.com/imrefazekas/harcon).

Both PUB/SUB and PUSH/PULL socket types are supported. See socket types explained [here](http://www.squaremobius.net/rabbit.js/).


## Installation

```javascript
npm install harcon harcon-amqp --save
```


## Usage

```javascript
var Harcon = require('harcon');
var Amqp = require('harcon-amqp');

var amqpConfig = {
	connectURL: 'amqp://localhost',
	socketType: 'PUBSUB', // 'PUSHPULL' to be used for PUSH/PULL socket type
	timeout: 0
};
var harcon = new Harcon( { Barrel: Amqp.Barrel, barrel: amqpConfig }, function(err){
} );
```

Should the recipients be not available or fail to meet the timeframe defined by the attribute 'timeout', [harcon](https://github.com/imrefazekas/harcon) will call the callbacks of the given messages with an error.
