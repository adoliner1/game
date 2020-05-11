const boardLength = 15;
const boardWidth = 9;
const startOfRedTiles = 0
const endOfRedTiles = 3
const startOfBlueTiles = 12
const endOfBlueTiles = 15


$(function () 
{
	//globals
	var socket = io()
	window.actionButtons = [($('#buyButton')),($('#buildButton')),($('#moveButton')),($('#energizeButton')),($('#activateButton')),($('#castButton')),($('#attackButton')),($('#attackPieceButton')),($('#attackFlatPieceButton')), ($('#castOnFlatPieceButton')), ($('#castOnPieceButton'))]
	window.allButtons = [($('#endTurnButton')), ($('#endActionPhaseButton'))].concat(actionButtons)

	//tiles which can currently be acted on(moved to, attacked, casted on, built on)
	window.activeTiles = []
	window.tilesThatCanBeMovedToAndThePathsThere = new Map

	//storage variables to pass data between click handlers
	window.currentlySelectedTile = null
	window.currentInventoryPosition = null
	window.currentlySelectedStorePiece = {}

	//modes are control flow variables
	window.buildMode = false
	window.moveMode = false
	window.castonPiecesMode = false
	window.castOnTilesMode = false
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
		window.game = newGameState

		enableEndPhaseOrEndActionButton(game)
		enableEnergizeButtonIfNecessary(game)

		updateInventoryDOM(true, game.redPlayer.inventory)
		updateInventoryDOM(false, game.bluePlayer.inventory)

		updatePlayerResourcesDOM(true, game.redPlayer)
		updatePlayerResourcesDOM(false, game.bluePlayer)

		if (currentlySelectedTile != null)
			updateDisplayerFromTile(game.board[currentlySelectedTile.col][currentlySelectedTile.row])

		outlineVPSquares(game.board)

		updateDOMForBoard(game.board)
	})

	socket.on('new game data', function(newGame)
	{
		//update client game
		window.game = newGame
		game.buildings = convertDictionaryToList(game.buildings)
		game.units = convertDictionaryToList(game.units)
		game.spells = convertDictionaryToList(game.spells)
		game.redPlayer.Name == readCookie("nickName") ? window.isRedPlayer = true : window.isRedPlayer = false
		addPiecesToShop(game.buildings)
		addPiecesToShop(game.units)
		addPiecesToShop(game.spells)
		addStoreClickHandler()

		enableEndPhaseOrEndActionButton(game)
		enableEnergizeButtonIfNecessary(game)

		updateInventoryDOM(true, game.redPlayer.inventory)
		updateInventoryDOM(false, game.bluePlayer.inventory)

		updatePlayerResourcesDOM(true, game.redPlayer)
		updatePlayerResourcesDOM(false, game.bluePlayer)

		outlineVPSquares(game.board)

		updateDOMForBoard(game.board)

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
			disableAllActionButtons()
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
		disableAllActionButtons()
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
		var currentSelectedInventoryPiece = inventory[currentInventoryPosition]
		updateDisplayerFromPiece(currentSelectedInventoryPiece)
		if (isThisPlayersInventory && currentSelectedInventoryPiece != null && game.phase == "Action")
		{
			if(currentSelectedInventoryPiece.types.includes('Unit') || currentSelectedInventoryPiece.types.includes('Building'))
				enableAndShowButton($('#buildButton'))
			else
				enableAndShowButton($('#castButton'))
		}
	})

	//board click handler
	$('#board td').click(function tileClicked()
	{
		disableAllActionButtons()
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
			else if (castMode)
			{
				var playersInventory = isRedPlayer ? game.redPlayer.inventory : game.bluePlayer.inventory
				var spell = playersInventory[currentInventoryPosition]

				if(spell.target == "Piece")
				{
					if (currentlySelectedTile.piece != null && currentlySelectedTile.flatPiece != null)
					{
						enableAndShowButton($('#castOnFlatPieceButton'))
						enableAndShowButton($('#castOnPieceButton'))						
					}
					else if (currentlySelectedTile.piece != null)
						socket.emit('request to cast a spell', currentInventoryPosition, currentlySelectedTile, "Piece")
					else if (currentlySelectedTile.flatPiece != null)
						socket.emit('request to cast a spell', currentInventoryPosition, currentlySelectedTile, "Flat Piece")
				}
				else
					socket.emit('request to cast a spell', currentInventoryPosition, currentlySelectedTile, "Tile")

			}
			else if(attackMode)
			{
				if (isAttackableTile(currentlySelectedTile))
				{
					if (currentlySelectedTile.piece != null && currentlySelectedTile.flatPiece != null)
					{
						enableAndShowButton($('#attackFlatPieceButton'))
						enableAndShowButton($('#attackPieceButton'))						
					}
					else if (currentlySelectedTile.piece != null)
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
		disableAllActionButtons()
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
		disableAllActionButtons()
		e.preventDefault()
		buildMode = true
		socket.emit('request tiles which can be built on', currentInventoryPosition)
	})

	$('#moveButton').submit(function(e)
	{
		disableAllActionButtons()
		e.preventDefault()
		moveMode = true
		socket.emit('request tiles which can be moved to and the paths there', currentlySelectedTile)
	})
	
	$('#buyButton').submit(function(e)
	{
		e.preventDefault()
		disableAllActionButtons()
		socket.emit('request piece purchase', currentlySelectedStorePiece)
    })

	$('#activateButton').submit(function(e)
	{
		e.preventDefault()
		disableAllActionButtons()

    })

	$('#attackButton').submit(function(e)
	{
		disableAllActionButtons()
		e.preventDefault()
		attackMode = true
		socket.emit('request tiles which can be attacked', currentlySelectedTile)
    })

	$('#attackPieceButton').submit(function(e)
	{
		disableAllActionButtons()
		e.preventDefault()
		socket.emit('request to attack a piece', tilePieceIsPotentiallyAttackingFrom,  currentlySelectedTile, false)
    })

	$('#attackFlatPieceButton').submit(function(e)
	{
		disableAllActionButtons()
		e.preventDefault()
		socket.emit('request to attack a piece', tilePieceIsPotentiallyAttackingFrom,  currentlySelectedTile, true)
    })

	$('#castOnFlatPieceButton').submit(function(e)
	{
		disableAllActionButtons()
		e.preventDefault()
		socket.emit('request to cast a spell', currentInventoryPosition, currentlySelectedTile, "Flat Piece")

    })

	$('#castOnPieceButton').submit(function(e)
	{
		disableAllActionButtons()
		e.preventDefault()
		socket.emit('request to cast a spell', currentInventoryPosition, currentlySelectedTile, "Piece")

    })   

	$('#castButton').submit(function(e)
	{
		e.preventDefault()
		disableAllActionButtons()
		castMode = true
		socket.emit('request tiles which can be cast on', currentInventoryPosition)
    })
});

function getDOMForTile(tile)
{
	return $($("#board tbody")[0].rows[tile.row].cells[tile.col])
}

function enableEnergizeButtonIfNecessary(game)
{
	var playerFreeEnergy = (window.isRedPlayer) ? (game.redPlayer.energyCapacity - game.redPlayer.activeEnergy) : (game.bluePlayer.energyCapacity - game.bluePlayer.activeEnergy)
	if ((currentlySelectedTile != null && currentlySelectedTile.piece != null && currentlySelectedTile.piece.energy < currentlySelectedTile.piece.energyCapacity) && playerFreeEnergy > 0 && game.phase == "Energize")
	{
		window.piecePotentiallyBeingEnergized = currentlySelectedTile.piece
		enableAndShowButton($('#energizeButton'))
	}	
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

function updateDOMForBoard(board)
{
	for (var col = 0; col < game.board.length; col++)
		for (var row = 0; row < game.board[col].length; row++) 
			updateDOMForTile(board[col][row])
}	


function updateDOMForTile(tile)
{
	var DOMObject = getDOMForTile(tile)
	if (tile.flatPiece != null)
		DOMObject.children(".flatPiece").html(tile.flatPiece.boardAvatar)
	else
		DOMObject.children(".flatPiece").html("")
	if (tile.piece != null)
		DOMObject.children(".piece").html(tile.piece.boardAvatar)
	else
		DOMObject.children(".piece").html("")
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

function outlineVPSquares(board)
{
	for (var row of board)
	{
		for (var tile of row)
		{
			var DOMObject = getDOMForTile(tile)
			if (tile.statuses.includes("VP1") || tile.statuses.includes("VP2") || tile.statuses.includes("VP3"))
				DOMObject.css('border', 'solid #449c35')				
		}
	}
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
		else if (piece.types.includes('Spell'))
		{
			newCell = $("#spells tr").append('<td>' + piece.boardAvatar + '</td>');	
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

function enableEndPhaseOrEndActionButton(game)
{
	if (isThisPlayersTurn() && game.phase == "Action")
	{
		enableAndShowButton($("#endActionPhaseButton"))
	}
	else if (isThisPlayersTurn() && game.phase == "Energize")
	{
		enableAndShowButton($("#endTurnButton"))
	}	
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
	for (button of allButtons)
		disableAndHideButton(button)
}

function disableAllActionButtons()
{
	for (button of actionButtons)
		disableAndHideButton(button)		
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