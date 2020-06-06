$(function () {
  var socket = io();

  $('form[name="sendChat"]').submit(function(e)
  {
    e.preventDefault();
    message = $('#m').val()
    var messageWords = message.split(" ");
    if (messageWords[0] == "/w")
    {
      recipientName = messageWords[1]
      for (var i = 2; i < messageWords.length; i++)
        message = messageWords[i] + " "
      socket.emit('private message', {msg: message, recip: recipientName})
    }

    else
      socket.emit('chat message', message);
    $('#m').val('');
    socket.emit('user stopped typing');
    return false;
  });

  $('form[name="setNickName"]').submit(function(e)
  {
    e.preventDefault(); // prevents page reloading
    nickName = $('#a').val()
    if (nickName == "")
    {
      return false
    }
    createCookie("nickName", nickName, 1)
    socket.emit('new nickname', nickName);
    $('#currentName')[0].innerHTML = "Current name: " + nickName;
    $('#a').val('');
    return false;
  });

  $('input[id="m"]').keyup(function(e)
  {
    if(e.which === 13)
      socket.emit('user stopped typing');
    else if ($('#m').val() !== '')
      socket.emit('user is typing')
    else
      socket.emit('user stopped typing');
  });

  socket.on('online users update', function(onlineUsersList)
  {
    renderOnlineUsersList(onlineUsersList)
  });

  $('#makeGameButton').submit(function(e)
  {
      e.preventDefault();
      socket.emit('make game in lobby');
  });

  socket.on('game made', function(game)
  {
    table = $('#gameListTable')[0];
    var newButton = $('<td><button>Join Game</button></td>').click(function()
    {
      socket.emit('user trying to join game in lobby', game.host)
    });
    newRow = table.insertRow(-1)
    var hostNameCell = newRow.insertCell()
    var redPlayerCell = newRow.insertCell()
    $("#gameListTable tr:last").append(newButton);
    hostNameCell.innerHTML = game.host
    redPlayerCell.innerHTML = game.redPlayer
  });

  socket.on('trigger redirect for new game', function(host){
    window.location.href = "http://localhost:8080/game/" + host;
  });

  socket.on('user is typing', function(typingUsers)
  {
    if(typingUsers.length == 1){
      $('p[name=userIsTypingBox').html(typingUsers[0] + ' is typing');  
    }
    else
    {
      $('p[name=userIsTypingBox').html('Multiple users are typing');   
    }
  });

  socket.on('user stopped typing', function(typingUsers)
  {
    if(typingUsers.length == 1){
      $('p[name=userIsTypingBox').html(typingUsers[0] + ' is typing');  
    }
    else if (typingUsers.length == 0){
      $('p[name=userIsTypingBox').html('');          
    }
    else
    {
      $('p[name=userIsTypingBox').html('Multiple users are typing');   
    }
  });

  socket.on('chat message', function(msg)
  {
    $('#messages').append($('<li>').text(msg));
  });
});

function renderOnlineUsersList(dictionary){
  $('#onlineUsersList').empty();
  for (var socketID in dictionary) {
    $('#onlineUsersList').append($('<li>').text(dictionary[socketID]));
  }
}

function createCookie(name, value, days) {
    var expires;

    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toGMTString();
    } else {
        expires = "";
    }
    document.cookie = encodeURIComponent(name) + "=" + encodeURIComponent(value) + expires + "; path=/";
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

function eraseCookie(name) {
    createCookie(name, "", -1);
}


