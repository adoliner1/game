$(function () 
{
	var socket = io();

	  socket.on('connect', function(){
	    socket.emit('new socket connected to game')
	  });


	$('#board td').click(function tileClicked()
	{
	  clickedCell = this
	  xpos = clickedCell.cellIndex
	  ypos = clickedCell.parentNode.rowIndex
	  tile = board[xpos][ypos]
	  updateDisplayer(tile)
	});

	$('#buyButton').submit(function(e)
	{
    	e.preventDefault();
    	console.log("button clicked")
    });

    addPieceToBoard(footman, 0, 0)
});

//Globals

//Utilities
var playerTurn = 'Red'

var board = new Array(10);
for (var i = 0; i < board.length; i++) 
{
  board[i] = new Array(10);
  for (var j=0; j < board[i].length; j++) 
	{
		var tile = {piece: null, statuses: "Empty"}
		board[i][j] = tile
	}
}

function addPieceToBoard(piece, x, y)
{
  updateLog("Adding " + piece.Name + " to board at " + "(" + x + "," + y + ")")	
  board[x][y].piece = piece
  $("#row" + y + " td.tile" + x).html(piece.Name);
}

function removePieceFromBoard(x, y)
{
  updateLog("Removing " + board[x][y].piece.Name + " from board at " + "(" + x + "," + y + ")")
  board[x][y].piece = null
  $("#row" + y + " td.tile" + x).html("");
}


function updateDisplayer(tile)
{
	piece = tile.piece
	$('#displayerTilePlatform').html("Platform: " + tile.Platform)
	$('#displayerTileStatuses').html("Tile Statuses: " + tile.statuses)	  
	if(tile.piece) 
	{
	  $('#displayerPieceName').html("Name: " + tile.piece.Name)
	  $('#displayerPieceType').html("Type: " + tile.piece.Type)
	  $('#displayerPieceMovement').html("Movement: " + tile.piece.movement)
	  $('#displayerPieceAttack').html("Attack: " + tile.piece.attack)
	  $('#displayerPieceHealth').html("Health: " + tile.piece.health)
	}
	else
	{
	  $('#displayerPieceName').html("")
	  $('#displayerPieceType').html("")
	  $('#displayerPieceMovement').html("")
	  $('#displayerPieceAttack').html("")
	  $('#displayerPieceHealth').html("")
	}	
}

function updateLog(text)
{
	$('#log').append($('<li>').text(text))
}