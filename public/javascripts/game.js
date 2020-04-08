$(function () 
{
	//globals
	var socket = io()

	//modes are control flow variables
	//storage variables to pass data between click handlers
	window.tilesWhichCanCurrentlyBeBuiltOn = []
	window.tilesWhichCanCurrentlyBeMovedTo = []
	window.currentSelectedTile = {}
	window.currentSelectedInventoryPiece = {}
	window.currentInventoryPosition = null
	window.buildMode = false
	window.moveMode = false
	window.castMode = false

	socket.on('connect', function(){
		socket.emit('new socket connected to game', readCookie("nickName"))
	});

	socket.on('opponent moved a piece', function(tileMovedFrom, tileMovedTo){
	    addPieceToTile(tileMovedFrom.piece, game.board[tileMovedTo.col][tileMovedTo.row])
	    removePieceFromTile(game.board[tileMovedFrom.col][tileMovedFrom.row])
	})

	socket.on('opponent activated a piece', function(tileActivatedOn, pieceIsFlat){
		if(pieceIsFlat)
		  game.board[tileActivatedOn.col][tileActivatedOn.row].flatPiece.energy += 1
		else
		  game.board[tileActivatedOn.col][tileActivatedOn.row].piece.energy += 1

		//log this change
	})

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


	socket.on('new game data', function(newGame, kingdomBuildings, kingdomUnits)
	{
		//global game variable
		window.game = newGame
		window.buildings = kingdomBuildings
		window.units = kingdomUnits

		attachDOMTilesToBoardTiles()
		addPiecesToShop(buildings)
		addPiecesToShop(units)

		//TODO: add existing pieces to board

		disableAndHideButton($('#buyButton'))
		disableAndHideButton($('#buildButton'))
		disableAndHideButton($('#moveButton'))
		disableAndHideButton($('#activateButton'))

		//set global player variables based on name from cookie
		if (game.redPlayer.Name == readCookie("nickName"))
		{
			window.isRedPlayer = true
			window.playerInventory = game.redPlayer.inventory
			window.playerInventoryDOM = $('#redInventory')
			window.playerGold = game.redPlayer.gold
			window.playerEnergy = game.redPlayer.energy
			window.opponentInventory = game.bluePlayer.inventory
			window.opponentInventoryDOM = $('#blueInventory')
			window.opponentGold = game.bluePlayer.gold
			window.opponentEnergy = game.bluePlayer.energy
		}
		else 
		{
			window.isRedPlayer = false
			window.playerInventory = game.bluePlayer.inventory
			window.playerInventoryDOM = $('#blueInventory')	
			window.playerGold = game.bluePlayer.gold
			window.playerEnergy = game.bluePlayer.energy
			window.opponentInventory = game.redPlayer.inventory
			window.opponentInventoryDOM = $('#redInventory')
			window.opponentGold = game.redPlayer.gold
			window.opponentEnergy = game.redPlayer.energy
		}

		$('.inventory td').click(function tileClicked()
		{
			enableAndShowButton($('#buyButton'))
			var clickedInventoryTile = this	
			if ((clickedInventoryTile.closest('table').id) == 'redInventory')
			{
				var inventory = game.redPlayer.inventory
				var isThisPlayersInventory = isRedPlayer
			}
			else
			{
				var inventory = game.bluePlayer.inventory
				var isThisPlayersInventory = !isRedPlayer
			}
			currentInventoryPosition = clickedInventoryTile.cellIndex
			currentSelectedInventoryPiece = inventory[currentInventoryPosition]
			updateDisplayerFromShopOrInventory(currentSelectedInventoryPiece)
			if (isThisPlayersInventory)
				enableAndShowButton($('#buildButton'))
		})
	})
	

	//board click handler
	$('#board td').click(function tileClicked()
	{
		var clickedDOMTableElement = this
		var xpos = clickedDOMTableElement.cellIndex
		var ypos = clickedDOMTableElement.parentNode.rowIndex
		currentSelectedTile = game.board[xpos][ypos]

		if (currentSelectedTile.piece != null && isThisPlayersTurn && playerOwnsPiece(isRedPlayer, currentSelectedTile.piece))
		{
			if (currentSelectedTile.piece.movement > 0)
			{	
				window.tilePieceIsPotentiallyMovingFrom = currentSelectedTile
				enableAndShowButton($('#moveButton'))
			}
			if (currentSelectedTile.piece.energy < currentSelectedTile.piece.energyCapacity && playerEnergy > 0)
			{
				window.piecePotentiallyBeingActivated = currentSelectedTile.piece
				enableAndShowButton($('#activateButton'))
			}
		}

		if (moveMode)
		{
			if (tilesWhichCanCurrentlyBeMovedTo.includes(currentSelectedTile))
			{
				addPieceToTile(tilePieceIsPotentiallyMovingFrom.piece, currentSelectedTile)
				socket.emit('player moved a piece', game.Host, tilePieceIsPotentiallyMovingFrom, currentSelectedTile, isRedPlayer)
				removePieceFromTile(tilePieceIsPotentiallyMovingFrom)
				resetTilesColorsAndAddHover(tilesWhichCanCurrentlyBeMovedTo)
				moveMode = false;
				tilePieceIsPotentiallyMovingFrom = null;
				disableAndHideButton($('#moveButton'))
			}
		}

		else if (buildMode)
		{
			if (tilesWhichCanCurrentlyBeBuiltOn.includes(currentSelectedTile))
			{ 
				addPieceToTile(currentSelectedInventoryPiece, currentSelectedTile)
				buildMode = false
				playerInventory[currentInventoryPosition] = null				
				playerInventoryDOM.find("tr").children()[currentInventoryPosition].innerHTML = ""
				socket.emit('player built a piece', currentSelectedTile, currentInventoryPosition)

				resetTilesColorsAndAddHover(tilesWhichCanCurrentlyBeBuiltOn)
				tilesWhichCanCurrentlyBeBuiltOn = []
			}
		}

		updateDisplayerFromBoardClick(currentSelectedTile)
		disableAndHideButton($('#buyButton'))
		disableAndHideButton($('#buildButton'))
	})

	$('#activateButton').submit(function(e)
	{
		e.preventDefault()
		piecePotentiallyBeingActivated.energy += 1
		$('#displayerPieceEnergy').html("Energy: " + piecePotentiallyBeingActivated.energy)
		playerEnergy -= 1
		socket.emit('player activated a piece', game.Host, currentSelectedTile, piecePotentiallyBeingActivated.isFlat, isRedPlayer)
	})
	
	$('#buildButton').submit(function(e)
	{
		e.preventDefault()
		buildMode = true
		populateTilesWhichCanCurrentlyBeBuiltOn(currentSelectedInventoryPiece)
		highLightTilesGreenAndAddHover(tilesWhichCanCurrentlyBeBuiltOn)
	})

	$('#moveButton').submit(function(e)
	{
		e.preventDefault()
		moveMode = true

		getMoveableTilesFromTileForPieceOnTile(currentSelectedTile)
		highLightTilesGreenAndAddHover(tilesWhichCanCurrentlyBeMovedTo)
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

		if (playerGold < currentSelectedInventoryPiece.cost)
		{
			updateLog("Not enough money")
			return
		}

		if (!playerInventory.includes(null))
		{
			updateLog("Inventory Full")
			return
		}

    	playerGold = playerGold - currentSelectedInventoryPiece.cost
		for (var i = 0; i < playerInventory.length; i++) 
		{
		    if (playerInventory[i] == null)
		    {
		    	var newPiece = {...currentSelectedInventoryPiece};
		    	playerInventory[i] = newPiece
		    	if (isRedPlayer)
		    		newPiece.owner = "Red"
		    	else
					newPiece.owner = "Blue"
		    	break
		    }
		}
		inventoryDOM.innerHTML = currentSelectedInventoryPiece.boardAvatar
		socket.emit('player bought piece', game.Host, isRedPlayer, playerInventory, playerGold, newPiece)
    })
});

function highLightTilesGreenAndAddHover(tiles)
{
	for (tile of tiles)
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
}

function resetTilesColorsAndAddHover(tiles)
{
	for (var tile of tiles)
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
}

function playerOwnsPiece(isRedPlayer, piece)
{
	return (isRedPlayer && piece.owner == "Red") || (!isRedPlayer && piece.owner == "Blue")
}

function addBuildableTilesFromRowStartToRowEnd(rowStart, rowEnd, col)
{
	while (rowStart < rowEnd)
	{
		var tile = game.board[col][rowStart]
		if (tile.piece == null)
		{
			tilesWhichCanCurrentlyBeBuiltOn.push(tile)
		}
		rowStart += 1
	}
}

function getMoveableTilesFromTileForPieceOnTile(tile)
{
	tilesWhichCanCurrentlyBeMovedTo = []
	addMoveableTilesFromTileForPieceOnTileHelper(tile, piece.movement)
	tilesWhichCanCurrentlyBeMovedTo = tilesWhichCanCurrentlyBeMovedTo.filter(onlyUnique)
}

function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}

function addMoveableTilesFromTileForPieceOnTileHelper(tile, movementLeft)
{
	if (movementLeft == 0)
		return

	adjacentTiles = getAdjacentTiles(tile)
	for (adjacentTile of adjacentTiles)
	{
		if (tileCanBeMovedOnTo(adjacentTile))
		{
			tilesWhichCanCurrentlyBeMovedTo.push(adjacentTile)
			addMoveableTilesFromTileForPieceOnTileHelper(adjacentTile, movementLeft-1)
		}
	}
}

function populateTilesWhichCanCurrentlyBeBuiltOn(piece)
{
	tilesWhichCanCurrentlyBeBuiltOn = []
	for (var col = 0; col < 9; col++)
	{
		if(piece.buildableZones.includes("Friendly"))
		{
			if (isRedPlayer)
			{
				addBuildableTilesFromRowStartToRowEnd(0, 3, col)
			}
			else
			{
				addBuildableTilesFromRowStartToRowEnd(6, 9, col)
			}		
		}

		if(piece.buildableZones.includes("Neutral"))
		{
			addBuildableTilesFromRowStartToRowEnd(3, 6, col)
		}

		if(piece.buildableZones.includes("Enemy"))
		{
			if (!isRedPlayer)
			{
				addBuildableTilesFromRowStartToRowEnd(0, 3, col)
			}
			else
			{
				addBuildableTilesFromRowStartToRowEnd(6, 9, col)
			}		
		}
	}
}

function getAdjacentTiles(tile)
{
	adjacentTiles = []
	if (tile.row - 1 >= 0)
		adjacentTiles.push(game.board[tile.col][tile.row-1])
	if (tile.row + 1 < 9)
		adjacentTiles.push(game.board[tile.col][tile.row+1])
	if (tile.col - 1 >= 0)
		adjacentTiles.push(game.board[tile.col-1][tile.row])
	if (tile.col + 1 < 9)
		adjacentTiles.push(game.board[tile.col+1][tile.row])
	return adjacentTiles
}

function getMoveablePieceFromTile(tile)
{
	console.log(tile.piece)
	for (piece of tile.pieces)
	{
		if (!piece.isFlat)
			return piece
	}
	return null
}

function isThisPlayersTurn(){
	return (game.isRedPlayersTurn && isRedPlayer) || (!game.isRedPlayersTurn && !isRedPlayer)
}

function tileCanBeMovedOnTo(tile)
{
	return (tile.piece == null)
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
  tile.piece = piece
  tile.DOMObject.html(piece.boardAvatar);
}

function removePieceFromTile(tile)
{
  updateLog("Removing " + tile.piece + " from board at " + "(" + tile.col + "," + tile.row + ")")
  tile.piece = null
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
		var index = this.cellIndex

		if (parentShop.id == 'buildings')
			currentSelectedInventoryPiece = buildings[index]
		else if (parentShop.id == 'units')
			currentSelectedInventoryPiece = units[index]
		else if (parentShop.id == 'spells')
			currentSelectedInventoryPiece = spells[index]			

		updateDisplayerFromShopOrInventory(currentSelectedInventoryPiece)

		if (isThisPlayersTurn())
			enableAndShowButton($('#buyButton'))
	})
}

function disableAndHideButton(button)
{
	button.prop('disabled', true);
	button.hide()
}

function enableAndShowButton(button)
{
	button.prop('disabled', false);
	button.show()
}

function updateDisplayerFromShopOrInventory(piece){
	if(piece != null)
	{
		$('#displayerPieceName').html("Name: " + piece.Name)
		$('#displayerPieceType').html("Type: " + piece.Type)
		$('#displayerPieceMovement').html("Movement: " + piece.movement)
		$('#displayerPieceAttack').html("Attack: " + piece.attack)
		$('#displayerPieceHealth').html("Health: " + piece.health)
	}
}

function updateDisplayerFromBoardClick(tile){

	$('#displayerTilePlatform').html("Platform: " + tile.Platform)
	$('#displayerTileStatuses').html("Tile Statuses: " + tile.statuses)

	if(tile.piece != null)
	{
	  $('#displayerPieceName').html("Name: " + tile.piece.Name)
	  $('#displayerPieceType').html("Type: " + tile.piece.Type)
	  $('#displayerPieceMovement').html("Movement: " + tile.piece.movement)
	  $('#displayerPieceAttack').html("Attack: " + tile.piece.attack)
	  $('#displayerPieceHealth').html("Health: " + tile.piece.health)
	  $('#displayerPieceEnergy').html("Energy: " + tile.piece.energy)
	}
	else
	{
	  $('#displayerPieceName').html("")
	  $('#displayerPieceType').html("")
	  $('#displayerPieceMovement').html("")
	  $('#displayerPieceAttack').html("")
	  $('#displayerPieceHealth').html("")
	  $('#displayerPieceEnergy').html("")
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