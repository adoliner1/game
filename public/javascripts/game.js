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
	window.currentlySelectedStorePiece = {}
	window.currentInventoryPosition = null

	window.buildMode = false
	window.moveMode = false
	window.castMode = false

	disableAllButtons()
	//server emit handlers
	socket.on('connect', function()
	{
		socket.emit('new socket connected to game', readCookie("nickName"))
	})

	socket.on('new log message', function(message)
	{
		updateLog(message)
	})

	socket.on('new game data', function(newGame)
	{
		//global game variable
		window.game = newGame

		attachDOMTilesToBoardTiles()
		addPiecesToShop(game.buildings)
		addPiecesToShop(game.units)
		addStoreClickHandler()

		//add pieces to board
		for (var col = 0; col < game.board.length; col++)
		{
			for (var row=0; row < game.board[col].length; row++) 
			{
				if (game.board[col][row].piece != null)
					addPieceToTile(game.board[col][row].piece, game.board[col][row])
				if (game.board[col][row].flatPiece != null)
					addPieceToTile(game.board[col][row].flatPiece, game.board[col][row])				
			}
		}

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
	})

	socket.on('player moved a piece', function(fTile, tTile)
	{
		var movedPiece = tTile.piece
		var fromTile = game.board[fTile.col][fTile.row]
		var toTile = game.board[tTile.col][tTile.row]

	    addPieceToTile(movedPiece, toTile)
	    removePieceFromTile(fromTile)
	})


	socket.on('player built a piece', function(isRedPlayer, newInventory, tileToBuildOn)
	{
		var buildingPlayer = (isRedPlayer) ? game.redPlayer : game.bluePlayer
		buildingPlayer.inventory = newInventory
		updateInventoryDOM(isRedPlayer, buildingPlayer.inventory)
		addPieceToTile(tileToBuildOn.piece, game.board[tileToBuildOn.col][tileToBuildOn.row])
	})

	socket.on('player bought a piece', function(isRedPlayer, newInventory, newPlayerGold)
	{
		var purchasingPlayer = (isRedPlayer) ? game.redPlayer : game.bluePlayer
		purchasingPlayer.inventory = newInventory
		purchasingPlayer.gold = newPlayerGold
		updateInventoryDOM(isRedPlayer, purchasingPlayer.inventory)
	})

	socket.on('player energized a piece', function(isRedPlayer, energizeTile, newPlayerEnergy)
	{
		var energizingPlayer = (isRedPlayer) ? game.redPlayer : game.bluePlayer
		energizingPlayer.energy = newPlayerEnergy
		var energizedPiece = game.board[energizeTile.col][energizeTile.row].piece
		energizedPiece.energy ++
		
		if(playerOwnsPiece(isRedPlayer, energizedPiece))
		{
			$('#displayerPieceEnergy').html("Energy: " + energizedPiece.energy)
			if (energizingPlayer.energy > 0 && energizedPiece.energy < energizedPiece.energyCapacity)
				enableAndShowButton($("#activateButton"))
		}
	})

	//store click handler
	function addStoreClickHandler()
	{
		$('#stores td').click(function storeTileClicked()
		{
			disableAllButtons()
			var parentShop = this.closest('table')
			var index = this.cellIndex

			if (parentShop.id == 'buildings')
				currentlySelectedStorePiece = game.buildings[index]
			else if (parentShop.id == 'units')
				currentlySelectedStorePiece = game.units[index]
			else if (parentShop.id == 'spells')
				currentlySelectedStorePiece = game.spells[index]			

			updateDisplayerFromShopOrInventory(currentlySelectedStorePiece)

			if (isThisPlayersTurn())
				enableAndShowButton($('#buyButton'))
		})
	}

	//inventory click handler
	$('.inventory td').click(function tileClicked()
	{
		disableAllButtons()
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

	//board click handler
	$('#board td').click(function tileClicked()
	{
		disableAllButtons()
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
				socket.emit('request to move a piece', tilePieceIsPotentiallyMovingFrom,  currentSelectedTile)

			resetTilesColorsAndAddHover(tilesWhichCanCurrentlyBeMovedTo)
			moveMode = false;
		}

		else if (buildMode)
		{
			if (tilesWhichCanCurrentlyBeBuiltOn.includes(currentSelectedTile))
				socket.emit('request to build a piece', currentInventoryPosition, currentSelectedTile)

			buildMode = false			
			resetTilesColorsAndAddHover(tilesWhichCanCurrentlyBeBuiltOn)
			tilesWhichCanCurrentlyBeBuiltOn = []
		}

		updateDisplayerFromBoardClick(currentSelectedTile)
	})

	//button handlers
	$('#activateButton').submit(function(e)
	{
		disableAllButtons()
		e.preventDefault()
		socket.emit('request to energize', currentSelectedTile)
	})
	
	$('#buildButton').submit(function(e)
	{
		disableAllButtons()
		e.preventDefault()
		buildMode = true
		populateTilesWhichCanCurrentlyBeBuiltOn(currentSelectedInventoryPiece)
		highLightTilesGreenAndAddHover(tilesWhichCanCurrentlyBeBuiltOn)
	})

	$('#moveButton').submit(function(e)
	{
		disableAllButtons()
		e.preventDefault()
		moveMode = true
		getMoveableTilesFromTileForPieceOnTile(currentSelectedTile)
		highLightTilesGreenAndAddHover(tilesWhichCanCurrentlyBeMovedTo)
	})
	
	$('#buyButton').submit(function(e)
	{
		e.preventDefault()
		disableAllButtons()
		socket.emit('request piece purchase', currentlySelectedStorePiece)
    })
});

function updateInventoryDOM(isRedPlayer, newInventory)
{
	inventoryJQueryRowObject = (isRedPlayer) ? $('#redInventory tr') : $('#blueInventory tr')
	for (var i = 0; i < newInventory.length; i++)
	{
		if (newInventory[i] != null)
			inventoryJQueryRowObject[0].cells[i].innerHTML = newInventory[i].boardAvatar
		else
			inventoryJQueryRowObject[0].cells[i].innerHTML = ""
	}
}

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
		tile.DOMObject.css('background-color', '#ffffff')
		tile.DOMObject.hover
		(
			function() 
			{
  				$(this).css("background-color", "#FFFFE0")
			},
			function() 
			{
  				$(this).css("background-color", "#ffffff")
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
		if (tile.piece == null && tile.flatPiece == null)
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
			//game.board[col][row].DOMObject = $("#row" + row + " td.tile" + col)
			game.board[col][row].DOMObject = $($("#board tbody")[0].rows[row].cells[col])
		}
	}
}

function addPieceToTile(piece, tile)
{
	updateLog("Adding " + piece.Name + " to board at " + "(" + tile.col + "," + tile.row + ")")
	if (piece.isFlat)
	{
		tile.flatPiece = piece
		tile.DOMObject.children(".flatPiece").html(piece.boardAvatar)
	}
	else
	{
		tile.piece = piece
		tile.DOMObject.children(".piece").html(piece.boardAvatar)  	
	}
}

function removePieceFromTile(tile)
{
  updateLog("Removing " + tile.piece.Name + " from board at " + "(" + tile.col + "," + tile.row + ")")
  tile.piece = null
  tile.DOMObject.children(".piece").html("") 
}

function addPiecesToShop(piecesList)
{
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
		$('#displayerFlatPieceName').html("")
		$('#displayerFlatPieceHealth').html("")
		$('#displayerTileStatuses').html("")
		$('#displayerPieceName').html("Name: " + piece.Name)
		$('#displayerPieceType').html("Type: " + piece.Type)
		$('#displayerPieceMovement').html("Movement: " + piece.movement)
		$('#displayerPieceAttack').html("Attack: " + piece.attack)
		$('#displayerPieceHealth').html("Health: " + piece.health)
	}
	else
	{
		$('#displayerTileStatuses').html("")
		emptyDisplayerValues()
	}
}

function updateDisplayerFromBoardClick(tile){

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

	if(tile.flatPiece != null)
	{
		$('#displayerFlatPieceName').html("Flat Piece Name: " + tile.flatPiece.name)
		$('#displayerFlatPieceHealth').html("Flat Piece Health: " + tile.flatPiece.health)
	}

	if (tile.piece == null && tile.flatPiece == null)
		emptyDisplayerValues()
}

function emptyDisplayerValues()
{
	$('#displayerPieceName').html("")
	$('#displayerPieceType').html("")
	$('#displayerPieceMovement').html("")
	$('#displayerPieceAttack').html("")
	$('#displayerPieceHealth').html("")
	$('#displayerPieceEnergy').html("")
	$('#displayerFlatPieceName').html("")
	$('#displayerFlatPieceHealth').html("")
}

function disableAllButtons()
{
	disableAndHideButton($('#buyButton'))
	disableAndHideButton($('#buildButton'))
	disableAndHideButton($('#moveButton'))
	disableAndHideButton($('#activateButton'))
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