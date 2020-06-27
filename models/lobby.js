var pieces = require('./pieces.js')
var gameMaker = require('./gameMaker.js')
var constants = require('../utilities/constants.js');

var userNickNames = {};
var typingUsers = [];
var lobbyGameList = {}
var gameList = {}

function activateSocket(io) 
{
    io.on('connection', function(socket) 
    {
    	io.emit('chat message', "A new user connected");
    	io.emit('online users update', userNickNames)
    	for (host in lobbyGameList)
  		{
		    if (lobbyGameList.hasOwnProperty(host))
		    {
		      game = lobbyGameList[host]
		      io.to(socket.id).emit('game made', game)
		    }
		}

		socket.on('user trying to join game in lobby', function(host)
	  	{
		    name = userNickNames[socket.id]
		    if (name == undefined) 
		      io.to(socket.id).emit('chat message', 'Set nickname to join a game');
		    else if (name == host) 
		      io.to(socket.id).emit('chat message', 'Can\'t join your own game');

		    //user successfuly joined, make new game and start it
		    else
		    {
		      gameList[host] = gameMaker.createNewGame(name, host)
		      socket.join(host)      
		      io.to(host).emit('trigger redirect for new game', host)
		    }
		})

		socket.on('make game in lobby', function()
		{
			name = userNickNames[socket.id]
			if (name == undefined)
			  io.to(socket.id).emit('chat message', 'Set nickname to make a game');
			else if (name in lobbyGameList)
			  io.to(socket.id).emit('chat message', 'You already have a game');

			else
			{
			  var game = {host: name, redPlayer: name, bluePlayer: null}
			  lobbyGameList[name] = game
			  socket.join(game.host)
			  io.emit("game made", game)
			}
		})

		//chat functions
		socket.on('chat message', function(msg)
		{
			if (userNickNames[socket.id]) 
				io.emit('chat message', userNickNames[socket.id] + ": " + msg);
			else 
				io.to(socket.id).emit('set nickname to start chatting');
		})

		socket.on('private message', function(data)
		{
			recipient = data.recip
			message = data.msg
			socketID = userNickNames.getKeyByValue(recipient)
			if(socketID)
			{
				appendedMessage = "Private message to you from " + userNickNames[socket.id] + ": " + message
				io.to(socketID).emit('chat message', appendedMessage);
			}
			else
				io.to(socket.id).emit('chat message', 'No such user');
		})

		socket.on('disconnect', function()
		{
			if(userNickNames[socket.id])
			{
				if(typingUsers.includes(userNickNames[socket.id]))
				{
					index = typingUsers.indexOf(name);
					typingUsers.splice(index, 1);
					io.emit('user stopped typing', typingUsers)
				}
			}

			//need to check if user had a game and delete it if so
			io.emit('chat message', "A user disconnected");
			io.emit('online users update', userNickNames)
		})

		socket.on('new nickname', function(newNickName)
		{
			userNickNames[socket.id] = newNickName;
			io.emit('online users update', userNickNames)
		})

		socket.on('user is typing', function()
		{
			name = userNickNames[socket.id];
			if(name)
			{
				if(!typingUsers.includes(name))
				{
					typingUsers.push(name)
					io.emit('user is typing', typingUsers)
				}
			}
		})

		socket.on('user stopped typing', function()
		{
			name = userNickNames[socket.id];
			if(typingUsers.includes(name))
			{
				index = typingUsers.indexOf(name);
				typingUsers.splice(index, 1);
				io.emit('user stopped typing', typingUsers)
			}
		})
	})
}

module.exports.activateSocket = activateSocket
module.exports.gameList = gameList