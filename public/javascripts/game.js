const boardLength = 11;
const boardWidth = 9;
const startOfRedTiles = 0
const endOfRedTiles = 3
const startOfBlueTiles = 7
const endOfBlueTiles = 10

$(function () 
{
	//globals
	var socket = io()

	//tiles which can currently be acted on(moved to, attacked, casted on, built on)
	window.activeTiles = []
	window.tilesThatCanBeMovedToAndThePathsThere = new Map

	//storage variables to pass data between click handlers
	window.currentlySelectedTile = {}
	window.currentInventoryPosition = null
	window.currentSelectedInventoryPiece = {}
	window.currentlySelectedStorePiece = {}

	//modes are control flow variables
	window.buildMode = false
	window.moveMode = false
	window.castMode = false
	window.attackMode = false

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

	socket.on('new game state', function(newGameState)
	{
		clearBoard(game.board)
		game.board = newGameState.board
		game.bluePlayer = newGameState.bluePlayer
		game.redPlayer = newGameState.redPlayer
		game.isRedPlayersTurn = newGameState.isRedPlayersTurn
		game.phase = newGameState.phase
		updateInventoryDOM(true, game.redPlayer.inventory)
		updateInventoryDOM(false, game.bluePlayer.inventory)
		updatePlayerResourcesDOM(true, game.redPlayer)
		updatePlayerResourcesDOM(false, game.bluePlayer)

		if (isThisPlayersTurn() && game.phase == "Action")
		{
			enableAndShowButton($("endActionPhaseButton"))
		}
		else if (isThisPlayersTurn() && game.phase == "Energize")
		{
			enableAndShowButton($("endTurnButton"))
		}

		for (var col = 0; col < game.board.length; col++)
		{
			for (var row = 0; row < game.board[col].length; row++) 
			{
				if (game.board[col][row].piece != null)
					addPieceToTile(game.board[col][row].piece, game.board[col][row])
				if (game.board[col][row].flatPiece != null)
					addPieceToTile(game.board[col][row].flatPiece, game.board[col][row])	
			}
		}
	})

	socket.on('new game data', function(newGame)
	{
		//global game variable
		window.game = newGame
		game.buildings = convertDictionaryToList(game.buildings)
		game.units = convertDictionaryToList(game.units)
		addPiecesToShop(game.buildings)
		addPiecesToShop(game.units)
		addStoreClickHandler()

		//add pieces to inventories
		updateInventoryDOM(true, game.redPlayer.inventory)
		updateInventoryDOM(false, game.bluePlayer.inventory)
		updatePlayerResourcesDOM(true, game.redPlayer)
		updatePlayerResourcesDOM(false, game.bluePlayer)
		//add pieces to board 
		for (var col = 0; col < game.board.length; col++)
		{
			for (var row = 0; row < game.board[col].length; row++) 
			{
				if (game.board[col][row].piece != null)
					addPieceToTile(game.board[col][row].piece, game.board[col][row])
				if (game.board[col][row].flatPiece != null)
					addPieceToTile(game.board[col][row].flatPiece, game.board[col][row])				
			}
		}

		game.redPlayer.Name == readCookie("nickName") ? window.isRedPlayer = true : window.isRedPlayer = false
	})

	socket.on('player ended their turn', function()
	{
		game.isRedPlayersTurn = !game.isRedPlayersTurn
		updateLog("Turn Ended")
	})


	socket.on('new tiles that can be moved to and the paths there', function(tilePathListOfLists)
	{
		//create new map from list of lists where key is first element of each list
		//also add tiles to the active tiles
		var tilePathMap = new Map
		for (var list of tilePathListOfLists)
		{
			var key = list[0]
			list.shift()
			tilePathMap.set(key, list)
		}

		//transition tiles to client tiles
		tilesThatCanBeMovedToAndThePathsThere.clear()
		for (var tile of tilePathMap.keys())
			tilesThatCanBeMovedToAndThePathsThere.set(game.board[tile.col][tile.row], getClientTilesFromServertiles(tilePathMap.get(tile)))

		window.activeTiles = []
		//set highlight and hover effect for each tile and the associated path and add the tiles to the active tiles
		for (var tile of tilesThatCanBeMovedToAndThePathsThere.keys())
		{
			activeTiles.push(tile)
			var DOMObject = getDOMForTile(tile)
			DOMObject.css('background-color', '#99e699')
			DOMObject.hover
			(
				function()
				{
					hoverEffectForTileAndPath($(this), true)
				},
				function() 
				{
					hoverEffectForTileAndPath($(this), false)				
				}
			)
		}
	})

	socket.on('new active tiles', function(tiles)
	{
		activeTiles = getClientTilesFromServertiles(tiles)
		highlightTilesGreenAndAddHover(activeTiles)
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

			updateDisplayerFromPiece(currentlySelectedStorePiece)

			if (isThisPlayersTurn() && game.phase == "Action")
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
		updateDisplayerFromPiece(currentSelectedInventoryPiece)
		if (isThisPlayersInventory && currentSelectedInventoryPiece != null && game.phase == "Action")
			enableAndShowButton($('#buildButton'))
	})

	//board click handler
	$('#board td').click(function tileClicked()
	{
		disableAllButtons()
		var clickedDOMTableElement = this
		var xpos = clickedDOMTableElement.cellIndex
		var ypos = clickedDOMTableElement.parentNode.rowIndex
		currentlySelectedTile = game.board[xpos][ypos]

		if (activeTiles.includes(currentlySelectedTile) && game.phase == "Action")
		{
			if (moveMode)
				socket.emit('request to move a piece', tilePieceIsPotentiallyMovingFrom,  currentlySelectedTile)
			else if (buildMode)
				socket.emit('request to build a piece', currentInventoryPosition, currentlySelectedTile)
			else if(attackMode)
			{
				if (isAttackableTile(currentlySelectedTile))
				{
					if (tile.piece != null && tile.flatPiece != null && !tile.flatPiece.types.includes("Platform"))
					{
						enableAndShowButton($('#attackFlatPieceButton'))
						enableAndShowButton($('#attackPieceButton'))						
					}
					else if (tile.piece != null)
						socket.emit('request to attack a piece', tilePieceIsPotentiallyAttackingFrom,  currentlySelectedTile, false)
					else
						socket.emit('request to attack a piece', tilePieceIsPotentiallyAttackingFrom,  currentlySelectedTile, true)
				}
			}
		}

		else if (currentlySelectedTile.piece != null && isThisPlayersTurn() && playerOwnsPiece(isRedPlayer, currentlySelectedTile.piece))
		{
			if (currentlySelectedTile.piece.movement > 0 && game.phase == "Action")
			{	
				window.tilePieceIsPotentiallyMovingFrom = currentlySelectedTile
				enableAndShowButton($('#moveButton'))
			}

			if (currentlySelectedTile.piece.canAttack == true && game.phase == "Action")
			{
				window.tilePieceIsPotentiallyAttackingFrom = currentlySelectedTile
				enableAndShowButton($('#attackButton'))
			}

			var playerFreeEnergy = (window.isRedPlayer) ? (game.redPlayer.energyCapacity - game.redPlayer.activeEnergy) : (game.bluePlayer.energyCapacity - game.bluePlayer.activeEnergy)
			if ((currentlySelectedTile.piece.energy < currentlySelectedTile.piece.energyCapacity) && playerFreeEnergy > 0 && game.phase == "Energize")
			{
				window.piecePotentiallyBeingEnergized = currentlySelectedTile.piece
				enableAndShowButton($('#energizeButton'))
			}
		}

		setAllModesToFalse()
		resetTilesColorsAndAddHover(activeTiles)
		activeTiles = []
		updateDisplayerFromTile(currentlySelectedTile)
	})

	//button handlers
	$('#energizeButton').submit(function(e)
	{
		disableAllButtons()
		e.preventDefault()
		socket.emit('request to energize', currentlySelectedTile)
	})

	$('#endActionPhaseButton').submit(function(e)
	{
		disableAllButtons()
		e.preventDefault()
		socket.emit('request to end action phase')
	})

	$('#endTurnButton').submit(function(e)
	{
		disableAllButtons()
		e.preventDefault()
		socket.emit('request to end turn')
	})
	
	$('#buildButton').submit(function(e)
	{
		disableAllButtons()
		e.preventDefault()
		buildMode = true
		socket.emit('request tiles which can be built on', currentInventoryPosition)
	})

	$('#moveButton').submit(function(e)
	{
		disableAllButtons()
		e.preventDefault()
		moveMode = true
		socket.emit('request tiles which can be moved to and the paths there', currentlySelectedTile)
	})
	
	$('#buyButton').submit(function(e)
	{
		e.preventDefault()
		disableAllButtons()
		socket.emit('request piece purchase', currentlySelectedStorePiece)
    })

	$('#activateButton').submit(function(e)
	{
		e.preventDefault()
		disableAllButtons()

    })

	$('#attackButton').submit(function(e)
	{
		disableAllButtons()
		e.preventDefault()
		attackMode = true
		socket.emit('request tiles which can be attacked', currentlySelectedTile)
    })

	$('#attackPieceButton').submit(function(e)
	{
		disableAllButtons()
		e.preventDefault()
		socket.emit('request to attack a piece', tilePieceIsPotentiallyAttackingFrom,  currentlySelectedTile, false)
    })

	$('#attackFlatPieceButton').submit(function(e)
	{
		disableAllButtons()
		e.preventDefault()
		socket.emit('request to attack a piece', tilePieceIsPotentiallyAttackingFrom,  currentlySelectedTile, true)
    })

	$('#castButton').submit(function(e)
	{
		e.preventDefault()
		disableAllButtons()
		socket.emit('request piece purchase', currentlySelectedStorePiece)
    })
});

function getDOMForTile(tile)
{
	return $($("#board tbody")[0].rows[tile.row].cells[tile.col])
}

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

function updatePlayerResourcesDOM(isRedPlayer, player)
{
	var goldDisplay = "Gold: " + player.gold
	var energyDisplay = "Energy: " + player.activeEnergy + "/" + player.energyCapacity
	var victoryPointDisplay = "Victory Points: " + player.victoryPoints
	if (isRedPlayer)
	{
		$('#redPlayerResources p.gold').html(goldDisplay)
		$('#redPlayerResources p.energy').html(energyDisplay)
		$('#redPlayerResources p.vp').html(victoryPointDisplay)
	}
	else
	{
		$('#bluePlayerResources p.gold').html(goldDisplay)
		$('#bluePlayerResources p.energy').html(energyDisplay)
		$('#bluePlayerResources p.vp').html(victoryPointDisplay)
	}
}

function clearBoard(board)
{
	for (var col = 0; col < boardWidth; col++)
	{
		for (var row = 0; row < boardLength; row++)
		{
			var DOMObject = getDOMForTile(board[col][row])
			DOMObject.flatPiece = null
			DOMObject.children(".flatPiece").html("")
			DOMObject.piece = null
			DOMObject.children(".piece").html("")
		}
	}
}

function addPieceToTile(piece, tile)
{
	var DOMObject = getDOMForTile(tile)

	updateLog("Adding " + piece.name + " to board at " + "(" + tile.col + "," + tile.row + ")")
	if (piece.isFlat)
	{
		tile.flatPiece = piece
		DOMObject.children(".flatPiece").html(piece.boardAvatar)
	}
	else
	{
		tile.piece = piece
		DOMObject.children(".piece").html(piece.boardAvatar)
	}
}

function removePieceFromTile(tile)
{
  if (tile.piece != null)
  {
	  var DOMObject = getDOMForTile(tile)
	  updateLog("Removing " + tile.piece.name + " from board at " + "(" + tile.col + "," + tile.row + ")")
	  tile.piece = null
	  DOMObject.children(".piece").html("")   	
  }
}

function hoverEffectForTileAndPath(tileJQueryObject, isHovering)
{
	var hoveredTileCol = tileJQueryObject[0].cellIndex
	var hoveredTileRow = tileJQueryObject[0].parentNode.rowIndex
	var tile = game.board[hoveredTileCol][hoveredTileRow]
	if (isHovering)
	{
		tileJQueryObject.css("background-color", "#FFFFE0")					
		for (pathTile of tilesThatCanBeMovedToAndThePathsThere.get(tile))
			getDOMForTile(pathTile).css("background-color", "#FFFFE0")			
	}
	else
	{
		tileJQueryObject.css("background-color", "#99e699")					
		for (pathTile of tilesThatCanBeMovedToAndThePathsThere.get(tile))
			getDOMForTile(pathTile).css("background-color", "#99e699")
	}

}

function highlightTilesGreenAndAddHover(tiles)
{
	for (tile of tiles)
	{
		var DOMObject = getDOMForTile(tile)
		DOMObject.css('background-color', '#99e699')
		DOMObject.hover
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

function isAttackableTile(tile)
{
	return (tile.piece != null || (tile.flatPiece != null && !tile.flatPiece.types.includes("Platform")))
}

function resetTilesColorsAndAddHover(tiles)
{

	for (var tile of tiles)
	{
		var DOMObject = getDOMForTile(tile)	
		DOMObject.css('background-color', '#ffffff')
		DOMObject.off("mouseenter mouseleave")
		DOMObject.hover
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

function convertDictionaryToList(dict)
{
	var newList = []
	for (key in dict)
	{
		if (dict.hasOwnProperty(key))
  			newList.push(dict[key])
	}
	return newList
}

function getClientTilesFromServertiles(tiles)
{
	var newTiles = []
	for (tile of tiles)
		newTiles.push(game.board[tile.col][tile.row])
	return newTiles
}


function isThisPlayersTurn(){
	return (game.isRedPlayersTurn && isRedPlayer) || (!game.isRedPlayersTurn && !isRedPlayer)
}

function setAllModesToFalse()
{
	attackMode = false
	buildMode = false
	castMode = false
	moveMode = false
}

function addPiecesToShop(piecesList)
{
	for (piece of piecesList)
	{
		if (piece.types.includes('Building'))
		{
			newCell = $("#buildings tr").append('<td>' + piece.boardAvatar + '</td>');
		}
		else if (piece.types.includes('Unit'))
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

function updateDisplayerFromPiece(piece)
{
	console.log("updateDisplayerFromPiece")
	clearDisplayerLists()
	if(piece != null)
	{
		for (key of Object.keys(piece))
		{
			var propertyStringDisplay = ("" + key + ": " + piece[key])
			$('#pieceProperties').append($('<li>').text(propertyStringDisplay))
		}
	}
}

function clearDisplayerLists()
{
	$('#pieceProperties').empty()
	$('#flatPieceProperties').empty()
	$('#tileProperties').empty()
}

function updateDisplayerFromTile(tile)
{
	clearDisplayerLists()
	if (tile != null)
	{
		for (key of Object.keys(tile))
		{
			var propertyStringDisplay = ("" + key + ": " + tile[key]) 
			$('#tileProperties').append($('<li>').text(propertyStringDisplay))
		}		
	}

	if(tile.piece != null)
	{
		for (key of Object.keys(tile.piece))
		{
			var propertyStringDisplay = ("" + key + ": " + tile.piece[key]) 
			$('#pieceProperties').append($('<li>').text(propertyStringDisplay))
		}
	}

	if(tile.flatPiece != null)
	{
		for (key of Object.keys(tile.flatPiece))
		{
			var propertyStringDisplay = ("" + key + ": " + tile.flatPiece[key]) 
			$('#flatPieceProperties').append($('<li>').text(propertyStringDisplay))
		}
	}
}

function disableAllButtons()
{
	disableAndHideButton($('#buyButton'))
	disableAndHideButton($('#buildButton'))
	disableAndHideButton($('#moveButton'))
	disableAndHideButton($('#energizeButton'))
	disableAndHideButton($('#endTurnButton'))
	disableAndHideButton($('#activateButton'))
	disableAndHideButton($('#castButton'))
	disableAndHideButton($('#attackButton'))
	disableAndHideButton($('#attackPieceButton'))
	disableAndHideButton($('#attackFlatPieceButton'))
	disableAndHideButton($('#endActionPhaseButton'))
}

function updateLog(text)
{
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