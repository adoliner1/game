#!/usr/bin/env node
var app = require('../app');
var constants = require('../utilities/constants.js');
var debug = require('debug')('pugpractice:server');
var http = require('http');
var pieces = require('../models/pieces.js')
var _ = require('lodash');

var port = normalizePort(process.env.PORT || '8080');
app.set('port', port);

var server = http.createServer(app);
var io = require('socket.io')(server);
var lobby = require('../models/lobby')
var game = require('../models/game')
lobby.activateSocket(io)
game.activateSocket(io)

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

function normalizePort(val) 
{
  var port = parseInt(val, 10);
  if (isNaN(port)) 
    return val;
  if (port >= 0) 
    return port;
  return false;
}

Object.prototype.getKeyByValue = function( value ) {
    for(var prop in this){
      if(this.hasOwnProperty(prop)){
          if(this[prop] === value)
            return prop;
        }
    }
    return false
}

const getMethods = (obj) => {
  let properties = new Set()
  let currentObj = obj
  do {
    Object.getOwnPropertyNames(currentObj).map(item => properties.add(item))
  } while ((currentObj = Object.getPrototypeOf(currentObj)))
  return [...properties.keys()].filter(item => typeof obj[item] === 'function')
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}

function onError(error) 
{
  if (error.syscall !== 'listen') 
    throw error;

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) 
  {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function readCookie(name) {
    var nameEQ = encodeURIComponent(name) + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) === ' ')
            c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0)
            return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
    return null;
}
