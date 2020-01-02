$(function () 
{
	var socket = io();

	socket.on('connect', function(){
		socket.emit('new socket connected to game', readCookie("nickName"))
	});

	socket.on('new game data', function(newGame, buildingsList, unitsList){
		game = newGame
		buildings = buildingsList
		units = unitsList
		addPiecesToShop(buildings)
		addPiecesToShop(units)
		addPieceToLocation(units[0], 0, 0)

		$('#board td').click(function tileClicked()
		{
		  var clickedBoardTile = this
		  console.log(clickedBoardTile)
		  var xpos = clickedBoardTile.cellIndex
		  var ypos = clickedBoardTile.parentNode.rowIndex
		  var tile = game.board[xpos][ypos]
		  updateDisplayerFromBoardClick(tile)
		  $('#buyButton').prop('disabled', true);
		  $('#buyButton').hide()
		})
	});

	$('#buyButton').submit(function(e)
	{
    	e.preventDefault();
    });
});

function addPieceToLocation(piece, x, y)
{
  updateLog("Adding " + piece.Name + " to board at " + "(" + x + "," + y + ")")	
  game.board[x][y].piece = piece
  $("#row" + y + " td.tile" + x).html(piece.boardAvatar);
}

function removePieceFromlocation(x, y)
{
  updateLog("Removing " + board[x][y].piece.Name + " from board at " + "(" + x + "," + y + ")")
  board[x][y].piece = null
  $("#row" + y + " td.tile" + x).html("");
}

function addPiecesToShop(piecesList){
	for (piece of piecesList)
	{
		if (piece.Types.includes('Building'))
		{
			newCell = $("#buildings tr").append('<td>' + piece.boardAvatar + '</td>');
		}
		else if (piece.Types.includes('Unit'))
		{
			newCell = $("#units tr").append('<td>' + piece.boardAvatar + '</td>');
		}  
	}

	//add stores click handler
	$('#stores td').click(function storeTileClicked(){
		var parentShop = this.closest('table')
		var x = this.cellIndex
		//console.log(parentShop.[0].id;)
		if (parentShop.id == 'buildings')
		{
			updateDisplayerFromShop(buildings[x])
		}
		else if (parentShop.id == 'units')
		{
			updateDisplayerFromShop(units[x])
		}
		else if (parentShop.id == 'spells')
		{
			updateDisplayerFromShop(units[x])
		}
		$('#buyButton').prop('disabled', false);
		$('#buyButton').show()
	})
}

function buyPiece(player, piece){

}

function updateDisplayerFromShop(piece){
	$('#displayerPieceName').html("Name: " + piece.Name)
	$('#displayerPieceType').html("Type: " + piece.Type)
	$('#displayerPieceMovement').html("Movement: " + piece.movement)
	$('#displayerPieceAttack').html("Attack: " + piece.attack)
	$('#displayerPieceHealth').html("Health: " + piece.health)
}

function updateDisplayerFromBoardClick(tile){
	piece = tile.piece
	$('#displayerTilePlatform').html("Platform: " + tile.Platform)
	$('#displayerTileStatuses').html("Tile Statuses: " + tile.statuses)	  
	if(piece) 
	{
	  $('#displayerPieceName').html("Name: " + piece.Name)
	  $('#displayerPieceType').html("Type: " + piece.Type)
	  $('#displayerPieceMovement').html("Movement: " + piece.movement)
	  $('#displayerPieceAttack').html("Attack: " + piece.attack)
	  $('#displayerPieceHealth').html("Health: " + piece.health)
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

function updateLog(text){
	$('#log').append($('<li>').text(text))
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