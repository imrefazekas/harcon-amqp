# harcon-amqp
AMQP transport layer ("Barrel") plugin for [harcon](https://github.com/imrefazekas/harcon).

Both PUB/SUB and PUSH/PULL socket types are supported. See socket types explained [here](http://www.squaremobius.net/rabbit.js/).

Note: In PUB/SUB model, [harcon](https://github.com/imrefazekas/harcon) won't send back notification about possible misaddressing...

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
	socketType: 'PUBSUB' // 'PUSHPULL' to be used for PUSH/PULL socket type
};
var harcon = new Harcon( { Barrel: Amqp.Barrel, barrel: amqpConfig }, function(err){
} );
```
