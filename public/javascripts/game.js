$(function () 
{
	var socket = io();

	socket.on('connect', function(){
		socket.emit('new socket connected to game', readCookie("nickName"))
	});

	socket.on('opponent bought piece', function(newPlayerInventory, newPlayerGold, piece){
		opponentInventory = newPlayerInventory
		opponentGold = newPlayerGold

		if (isRedPlayer){
			var opponentInventoryDOM = $('#blueInventory td:empty')[0]
		}
		else{
			var opponentInventoryDOM = $('#redInventory td:empty')[0]
		}
		opponentInventoryDOM.innerHTML = piece.boardAvatar
	})

	socket.on('opponent built a piece', function(tile, inventoryPosition){
		piece = opponentInventory[inventoryPosition]
		opponentInventory[inventoryPosition] = null
		opponentInventoryDOM.find("tr").children()[inventoryPosition].innerHTML = ""
		addPieceToTile(piece, game.board[tile.col][tile.row])
	})

	socket.on('new game data', function(newGame, buildingsList, unitsList)
	{
		game = newGame
		buildings = buildingsList
		units = unitsList
		name = readCookie("nickName")
		buildableTiles = []
		attachDOMTilesToBoardTiles()
		addPiecesToShop(buildings)
		addPiecesToShop(units)
		currentInventoryPosition = null
		buildMode = false

		$('#buyButton').prop('disabled', true);
		$('#buyButton').hide()
		$('#buildButton').prop('disabled', true);
		$('#buildButton').hide()

		if (game.redPlayer.Name == name)
		{
			isRedPlayer = true
			playerInventory = game.redPlayer.inventory
			playerInventoryDOM = $('#redInventory')
			playerGold = game.redPlayer.gold
			opponentInventory = game.bluePlayer.inventory
			opponentInventoryDOM = $('#blueInventory')
			opponentGold = game.bluePlayer.gold
		}
		else 
		{
			isRedPlayer = false
			playerInventory = game.bluePlayer.inventory
			playerInventoryDOM = $('#blueInventory')	
			playerGold = game.bluePlayer.gold
			opponentInventory = game.redPlayer.inventory
			opponentInventoryDOM = $('#redInventory')
			opponentGold = game.redPlayer.gold
		}

		$('.inventory td').click(function tileClicked()
		{
		  $('#buyButton').prop('disabled', true);
		  $('#buyButton').hide()
		  var clickedBoardTile = this			
		  if ((clickedBoardTile.closest('table').id) == 'redInventory')
		  {
		  	var inventory = game.redPlayer.inventory
		  	var isThisPlayersInventory = isRedPlayer
		  }
		  else
		  {
		  	var inventory = game.bluePlayer.inventory
		  	var isThisPlayersInventory = !isRedPlayer
		  }
		  currentInventoryPosition = clickedBoardTile.cellIndex
		  var piece = inventory[currentInventoryPosition]
		  if (piece != null)
		  {
			  updateDisplayerFromShopOrInventory(piece)
			  selectedPiece = piece
			  if(isThisPlayersInventory)
			  {
				  $('#buildButton').prop('disabled', false);
				  $('#buildButton').show()
			  }
		  }
		})

		$('#board td').click(function tileClicked()
		{
		  var clickedBoardTile = this
		  var xpos = clickedBoardTile.cellIndex
		  var ypos = clickedBoardTile.parentNode.rowIndex
		  var tile = game.board[xpos][ypos]

		  if (buildMode)
		  {
		  	if (buildableTiles.includes(tile))
		  	{ 
		  		addPieceToTile(selectedPiece, tile)
		  		buildMode = false
		  		playerInventory[currentInventoryPosition] = null				
				playerInventoryDOM.find("tr").children()[currentInventoryPosition].innerHTML = ""
				socket.emit('player built a piece', tile, currentInventoryPosition)
				for (var tile of buildableTiles)
				{
					tile.DOMObject.css('background-color', '#c2c2a3')
					tile.DOMObject.hover
					(
						function() 
						{
			  				$(this).css("background-color", "#FFFFE0")
						},
						function() 
						{
			  				$(this).css("background-color", "#c2c2a3")
						}
					)
				}
				buildableTiles = []
		  	}
		  }

		  updateDisplayerFromBoardClick(tile)
		  $('#buyButton').prop('disabled', true);
		  $('#buyButton').hide()
		  $('#buildButton').prop('disabled', true);
		  $('#buildButton').hide()
		})
	});

	$('#buildButton').submit(function(e)
	{
		e.preventDefault()
		buildMode = true
		buildableTiles = getBuildableTiles(selectedPiece)
		for (tile of buildableTiles)
		{
			tile.DOMObject.css('background-color', '#99e699')
			tile.DOMObject.hover
			(
				function()
				{
	  				$(this).css("background-color", "#FFFFE0")
				},
				function() 
				{
	  				$(this).css("background-color", "#99e699")
				}
			)
		}
	})

	$('#buyButton').submit(function(e)
	{
		e.preventDefault()
		//resource check
		if (isRedPlayer){
			var inventoryDOM = $('#redInventory td:empty')[0]
		}
		else{
			var inventoryDOM = $('#blueInventory td:empty')[0]
		}

		if (!isThisPlayersTurn())
		{
			updateLog("Not your turn")
			return	
		}

		if (playerGold < selectedPiece.cost)
		{
			updateLog("Not enough money")
			return
		}

		if (!playerInventory.includes(null))
		{
			updateLog("Inventory Full")
			return
		}

    	playerGold = playerGold - selectedPiece.cost
		for (var i = 0; i < playerInventory.length; i++) {
		    if (playerInventory[i] == null)
		    {
		    	var newPiece = {...selectedPiece};
		    	playerInventory[i] = newPiece
		    	if (isRedPlayer)
		    	{
		    		newPiece.owner = "Red"
		    	}
		    	else
		    	{
					newPiece.owner = "Blue"
		    	}
		    	break
		    }
		}
		inventoryDOM.innerHTML = selectedPiece.boardAvatar
		socket.emit('player bought piece', game.Host, isRedPlayer, playerInventory, playerGold, newPiece)
    })
});


function addBuildableTilesFromRowStartToRowEnd(rowStart, rowEnd, col, buildableTiles)
{
	while (rowStart < rowEnd)
	{
		var tile = game.board[col][rowStart]
		if (tile.pieces.length == 0)
		{
			buildableTiles.push(tile)
		}
		rowStart += 1
	}
}

function getBuildableTiles(piece)
{
	var buildableTiles = []
	for (var col = 0; col < 9; col++)
	{
		if(piece.buildableZones.includes("Friendly"))
		{
			if (isRedPlayer)
			{
				addBuildableTilesFromRowStartToRowEnd(0, 3, col, buildableTiles)
			}
			else
			{
				addBuildableTilesFromRowStartToRowEnd(6, 9, col, buildableTiles)
			}		
		}

		if(piece.buildableZones.includes("Neutral"))
		{
			addBuildableTilesFromRowStartToRowEnd(3, 6, col, buildableTiles)
		}

		if(piece.buildableZones.includes("Enemy"))
		{
			if (!isRedPlayer)
			{
				addBuildableTilesFromRowStartToRowEnd(0, 3, col, buildableTiles)
			}
			else
			{
				addBuildableTilesFromRowStartToRowEnd(6, 9, col, buildableTiles)
			}		
		}
	}
	return buildableTiles
}

function getAdjacentLocations(coordinate)
{
	
}

function isThisPlayersTurn(){
	return (game.isRedPlayersTurn && isRedPlayer) || (!game.isRedPlayersTurn && !isRedPlayer)
}

function tileCanBeMovedOnTo(tile)
{
	if (tile.pieces == [] || tile.pieces[0].isFlat)
	{
		return true
	}
	return false
}

function attachDOMTilesToBoardTiles()
{
	for (var col = 0; col < 9; col++)
	{
		for (var row = 0; row < 9; row++)
		{
			game.board[col][row].DOMObject = $("#row" + row + " td.tile" + col)
		}
	}
}

function addPieceToTile(piece, tile)
{
  updateLog("Adding " + piece.Name + " to board at " + "(" + tile.col + "," + tile.row + ")")
  tile.pieces.push(piece)
  tile.DOMObject.html(piece.boardAvatar);
}

function removePieceFromTile(tile)
{
  updateLog("Removing " + tile.pieces.Name + " from board at " + "(" + tile.col + "," + tile.row + ")")
  tile.pieces = []
  tile.DOMObject.html("")
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
		if (parentShop.id == 'buildings')
		{
			selectedPiece = buildings[x]
		}
		else if (parentShop.id == 'units')
		{
			selectedPiece = units[x]
		}
		else if (parentShop.id == 'spells')
		{
			selectedPiece = spells[x]			
		}
		updateDisplayerFromShopOrInventory(selectedPiece)
		if (isThisPlayersTurn())
		{
			$('#buyButton').prop('disabled', false);
			$('#buyButton').show()
		}
	})
}

function updateDisplayerFromShopOrInventory(piece){
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