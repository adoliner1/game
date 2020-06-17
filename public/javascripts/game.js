const boardLength = 15;
const boardWidth = 9;
const startOfRedTiles = 0
const endOfRedTiles = 3
const startOfBlueTiles = 12
const endOfBlueTiles = 15
const clickSound = new Audio('../sounds/click.wav');

$(function () 
{
	//globals
	var socket = io()
	window.actionButtons = [($('#castUnitSpellOnFlatPieceButton')), ($('#energizeFlatPieceButton')), ($('#castUnitSpellOnPieceButton')), ($('#castUnitSpellButton')), ($('#buyButton')),($('#buildButton')),($('#moveButton')),($('#energizeButton')),($('#activateButton')),($('#castButton')),($('#attackButton')),($('#attackPieceButton')),($('#attackFlatPieceButton')), ($('#castOnFlatPieceButton')), ($('#castOnPieceButton'))]
	window.allButtons = [($('#endTurnButton')), ($('#endActionPhaseButton'))].concat(actionButtons)

	//tiles which can currently be acted on(moved to, attacked, casted on, built on)
	window.activeTiles = []
	window.tilesThatCanBeMovedToAndThePathsThere = new Map

	//storage variables to pass data between click handlers
	window.currentlySelectedTile = null
	window.currentInventoryPosition = null
	window.currentlySelectedStorePiece = null

	//modes are control flow variables
	window.buildMode = false
	window.moveMode = false
	window.castMode = false
	window.unitCastMode = false
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
		enableEnergizeButtonAndRehighlightEnergizedPieceIfNecessary(game)

		updateInventoryDOM(true, game.redPlayer.inventory)
		updateInventoryDOM(false, game.bluePlayer.inventory)

		updatePlayerResourcesDOM(true, game.redPlayer)
		updatePlayerResourcesDOM(false, game.bluePlayer)


		if (currentlySelectedTile != null)
			updateDisplayerFromTile(game.board[currentlySelectedTile.col][currentlySelectedTile.row])

		updateVictoryPointTokenSupplyDOM(game.victoryPointTokenSupply, game.victoryPointTokenDrip)
		updateDOMForBoard(game.board)
	})

	socket.on('new game data', function(newGame)
	{
		//update client game
		window.game = newGame
		console.log(game.baseSet)
		game.baseSet = convertDictionaryToList(game.baseSet)
		console.log(game.baseSet)
		game.nonBaseSet = convertDictionaryToList(game.nonBaseSet)
		game.redPlayer.Name == readCookie("nickName") ? window.isRedPlayer = true : window.isRedPlayer = false

		clearShops()
		addBaseSetPiecesToShop(game.baseSet)
		addNoneBaseSetPiecesToShop(game.nonBaseSet)
		addStoreClickHandler()

		enableEndPhaseOrEndActionButton(game)
		enableEnergizeButtonAndRehighlightEnergizedPieceIfNecessary(game)

		updateInventoryDOM(true, game.redPlayer.inventory)
		updateInventoryDOM(false, game.bluePlayer.inventory)

		updatePlayerResourcesDOM(true, game.redPlayer)
		updatePlayerResourcesDOM(false, game.bluePlayer)

		addResourcesToDisplay(game.board)
		updateVictoryPointTokenSupplyDOM(game.victoryPointTokenSupply, game.victoryPointTokenDrip)
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

	$(document).click(function() 
	{
		unhighlightBordersOfAllCurrentlyHighlightedDOMObjects()
		disableAllActionButtons()
		updateDisplayerFromTile(null)
		updateDisplayerFromPiece(null)
	});

	//store click handler
	function addStoreClickHandler()
	{
		$('#stores td').click(function storeTileClicked(e)
		{
			unhighlightBordersOfAllCurrentlyHighlightedDOMObjects()
			disableAllActionButtons()
			e.stopPropagation();
			var parentShop = this.closest('table')
			var index = this.cellIndex
			window.currentlyClickedStoreTileDOM = $(this)
			highlightBordersOfDOMObject(currentlyClickedStoreTileDOM)

			if (parentShop.id == 'baseSet')
				currentlySelectedStorePiece = game.baseSet[index]
			else if (parentShop.id == 'nonBaseSet')
				currentlySelectedStorePiece = game.nonBaseSet[index]		

			updateDisplayerFromPiece(currentlySelectedStorePiece)

			if (isThisPlayersTurn() && game.phase == "Action")
				enableAndShowButton($('#buyButton'))
		})
	}

	//inventory click handler
	$('.inventory td').click(function tileClicked(e)
	{
		unhighlightBordersOfAllCurrentlyHighlightedDOMObjects()
		disableAllActionButtons()
		e.stopPropagation();
		window.currentlySelectedInventoryDOM = $(this)
		highlightBordersOfDOMObject(currentlySelectedInventoryDOM)
		console.log(currentlySelectedInventoryDOM)
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
	$('#board td').click(function tileClicked(e)
	{
		unhighlightBordersOfAllCurrentlyHighlightedDOMObjects()
		disableAllActionButtons()
		e.stopPropagation();
		var clickedDOMTableElement = this
		var xpos = clickedDOMTableElement.cellIndex
		var ypos = clickedDOMTableElement.parentNode.rowIndex
		currentlySelectedTile = game.board[xpos][ypos]
		highlightBordersOfDOMObject(getDOMForTile(currentlySelectedTile))

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
			else if(unitCastMode)
			{
				if(tilePieceIsPotentiallyCastingSpellFrom.piece.spellTarget == "Piece")
				{
					if (currentlySelectedTile.piece != null && currentlySelectedTile.flatPiece != null)
					{
						enableAndShowButton($('#castUnitSpellOnFlatPieceButton'))
						enableAndShowButton($('#castUnitSpellOnPieceButton'))				
					}
					else if (currentlySelectedTile.piece != null)
						socket.emit('request to cast a unit spell', tilePieceIsPotentiallyCastingSpellFrom, currentlySelectedTile, "Piece")
					else if (currentlySelectedTile.flatPiece != null)
						socket.emit('request to cast a unit spell', tilePieceIsPotentiallyCastingSpellFrom, currentlySelectedTile, "Flat Piece")
				}
				else
					socket.emit('request to cast a unit spell', tilePieceIsPotentiallyCastingSpellFrom, currentlySelectedTile, "Tile")
			}
		}

		else if (currentlySelectedTile.piece != null && isThisPlayersTurn() && playerOwnsPiece(isRedPlayer, currentlySelectedTile.piece))
		{
			if (currentlySelectedTile.piece.movement > 0 && game.phase == "Action" && currentlySelectedTile.piece.isActive)
			{	
				window.tilePieceIsPotentiallyMovingFrom = currentlySelectedTile
				enableAndShowButton($('#moveButton'))
			}

			if (currentlySelectedTile.piece.canAttack && game.phase == "Action" && currentlySelectedTile.piece.isActive)
			{
				window.tilePieceIsPotentiallyAttackingFrom = currentlySelectedTile
				enableAndShowButton($('#attackButton'))
			}

			var playerFreeEnergy = (window.isRedPlayer) ? (game.redPlayer.energyCapacity - game.redPlayer.activeEnergy) : (game.bluePlayer.energyCapacity - game.bluePlayer.activeEnergy)
			if ((currentlySelectedTile.piece.energy < currentlySelectedTile.piece.energyCapacity) && playerFreeEnergy > 0 && game.phase == "Energize" && currentlySelectedTile.piece.canReceiveFreeEnergyAtThisLocation)
			{
				window.piecePotentiallyBeingEnergized = currentlySelectedTile.piece
				enableAndShowButton($('#energizeButton'))
			}

			if(currentlySelectedTile.piece.hasUnitSpells && game.phase == "Action" && currentlySelectedTile.piece.isActive)
			{
				window.tilePieceIsPotentiallyCastingSpellFrom = currentlySelectedTile
				enableAndShowButton($('#castUnitSpellButton'))
			}
		}

		var playerFreeEnergy = (window.isRedPlayer) ? (game.redPlayer.energyCapacity - game.redPlayer.activeEnergy) : (game.bluePlayer.energyCapacity - game.bluePlayer.activeEnergy)
		if (currentlySelectedTile.flatPiece != null && isThisPlayersTurn() && playerOwnsPiece(isRedPlayer, currentlySelectedTile.flatPiece) && currentlySelectedTile.flatPiece.energy < currentlySelectedTile.flatPiece.energyCapacity && playerFreeEnergy > 0 && game.phase == "Energize" && currentlySelectedTile.flatPiece.canReceiveFreeEnergyAtThisLocation)
		{
			window.flatPiecePotentiallyBeingEnergized = currentlySelectedTile.flatPiece
			enableAndShowButton($('#energizeFlatPieceButton'))
		}

		setAllModesToFalse()
		resetTilesColorsAndAddHover(activeTiles)
		activeTiles = []
		updateDisplayerFromTile(currentlySelectedTile)
	})

	//button handlers
	$('#energizeButton').submit(function(e)
	{
		clickSound.play()
		disableAllActionButtons()
		e.preventDefault()
		socket.emit('request to energize', currentlySelectedTile, false)
	})

	$('#energizeFlatPieceButton').submit(function(e)
	{
		clickSound.play()
		disableAllActionButtons()
		e.preventDefault()
		socket.emit('request to energize', currentlySelectedTile, true)		
	})

	$('#endActionPhaseButton').submit(function(e)
	{
		clickSound.play()
		disableAllButtons()
		e.preventDefault()
		socket.emit('request to end action phase')
	})

	$('#endTurnButton').submit(function(e)
	{
		clickSound.play()
		disableAllButtons()
		e.preventDefault()
		socket.emit('request to end turn')
	})
	
	$('#buildButton').submit(function(e)
	{
		clickSound.play()
		disableAllActionButtons()
		e.preventDefault()
		buildMode = true
		socket.emit('request tiles which can be built on', currentInventoryPosition)
	})

	$('#moveButton').submit(function(e)
	{
		clickSound.play()
		disableAllActionButtons()
		e.preventDefault()
		moveMode = true
		socket.emit('request tiles which can be moved to and the paths there', currentlySelectedTile)
	})
	
	$('#buyButton').submit(function(e)
	{
		clickSound.play()
		e.preventDefault()
		disableAllActionButtons()
		socket.emit('request piece purchase', currentlySelectedStorePiece)
    })

	$('#activateButton').submit(function(e)
	{
		clickSound.play()
		e.preventDefault()
		disableAllActionButtons()

    })

	$('#attackButton').submit(function(e)
	{
		clickSound.play()
		disableAllActionButtons()
		e.preventDefault()
		attackMode = true
		socket.emit('request tiles which can be attacked', currentlySelectedTile)
    })

	$('#attackPieceButton').submit(function(e)
	{
		clickSound.play()
		disableAllActionButtons()
		e.preventDefault()
		socket.emit('request to attack a piece', tilePieceIsPotentiallyAttackingFrom,  currentlySelectedTile, false)
    })

	$('#attackFlatPieceButton').submit(function(e)
	{
		clickSound.play()
		disableAllActionButtons()
		e.preventDefault()
		socket.emit('request to attack a piece', tilePieceIsPotentiallyAttackingFrom,  currentlySelectedTile, true)
    })

	$('#castUnitSpellButton').submit(function(e)
	{
		clickSound.play()
		disableAllActionButtons()
		e.preventDefault()
		unitCastMode = true
		socket.emit('request tiles unit can cast on', tilePieceIsPotentiallyCastingSpellFrom)
	})

	$('#castUnitSpellOnPieceButton').submit(function(e)
	{
		clickSound.play()
		disableAllActionButtons()
		e.preventDefault()
		socket.emit('request to cast a unit spell', tilePieceIsPotentiallyCastingSpellFrom, currentlySelectedTile, "Piece")

    })

	$('#castUnitSpellOnFlatPieceButton').submit(function(e)
	{
		clickSound.play()
		disableAllActionButtons()
		e.preventDefault()
		socket.emit('request to cast a unit spell', tilePieceIsPotentiallyCastingSpellFrom, currentlySelectedTile, "Flat Piece")

    })

	$('#castOnFlatPieceButton').submit(function(e)
	{
		clickSound.play()
		disableAllActionButtons()
		e.preventDefault()
		socket.emit('request to cast a spell', currentInventoryPosition, currentlySelectedTile, "Flat Piece")

    })

	$('#castOnPieceButton').submit(function(e)
	{
		clickSound.play()
		disableAllActionButtons()
		e.preventDefault()
		socket.emit('request to cast a spell', currentInventoryPosition, currentlySelectedTile, "Piece")

    })   

	$('#castButton').submit(function(e)
	{
		clickSound.play()
		e.preventDefault()
		disableAllActionButtons()
		castMode = true
		socket.emit('request tiles which can be cast on', currentInventoryPosition)
    })
});

function unhighlightBordersOfAllCurrentlyHighlightedDOMObjects()
{
	unhighlightBordersOfPlayerInventoryDOMObject(window.currentlySelectedInventoryDOM)
	unhighlightBordersOfStoreDOMObject(window.currentlyClickedStoreTileDOM)
	unhighlightBordersOfTile(window.currentlySelectedTile)
}

function getDOMForTile(tile)
{
	if (tile == null)
		return null
	return $($("#board tbody")[0].rows[tile.row].cells[tile.col])
}

function enableEnergizeButtonAndRehighlightEnergizedPieceIfNecessary(game)
{
	if (currentlySelectedTile != null)
		currentlySelectedTile = game.board[currentlySelectedTile.col][currentlySelectedTile.row]
	else
		return
	var playerFreeEnergy = (window.isRedPlayer) ? (game.redPlayer.energyCapacity - game.redPlayer.activeEnergy) : (game.bluePlayer.energyCapacity - game.bluePlayer.activeEnergy)
	if (currentlySelectedTile.piece != null && playerOwnsPiece(isRedPlayer, currentlySelectedTile.piece) && currentlySelectedTile.piece.energy < currentlySelectedTile.piece.energyCapacity && playerFreeEnergy > 0 && game.phase == "Energize" && isThisPlayersTurn())
	{
		window.piecePotentiallyBeingEnergized = currentlySelectedTile.piece
		highlightBordersOfDOMObject(getDOMForTile(currentlySelectedTile))
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
	var goldDisplay = "<b> Gold: </b>"  + player.gold + " (+" + player.goldProduction + ")"
	var energyDisplay = "<b> Energy: </b>" + player.activeEnergy + "/" + player.energyCapacity
	var victoryPointDisplay = "<b> Victory Points: </b>" + player.victoryPoints + " (+" + player.victoryPointTokenProduction + ")"
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

function highlightBordersOfDOMObject(DOMObject)
{
	if (DOMObject != null)
		DOMObject.css("border", "2px solid #ffaa00")
}

function unhighlightBordersOfTile(tile)
{
	if (tile != null)
	{
		var DOMObject = getDOMForTile(tile)
			DOMObject.css("border", "2px solid #606060")
			if (tile.statuses.includes("VP1") || tile.statuses.includes("VP2") || tile.statuses.includes("VP3"))
				DOMObject.css('border', '2px solid #75f542')
	}
}

function unhighlightBordersOfStoreDOMObject(storeDOMObject)
{
	if (storeDOMObject != null)
	{
		var parentShop = storeDOMObject.closest('table')[0]
		if (parentShop.id == 'baseSet')
			storeDOMObject.css("border", "1px solid #6e6e77")
		else if (parentShop.id == 'nonBaseSet')
			storeDOMObject.css("border", "1px solid #753eac")
	}
}

function unhighlightBordersOfPlayerInventoryDOMObject(inventoryDOMObject)
{
	if (inventoryDOMObject != null)
	{
		var inventory = inventoryDOMObject.closest('table')
		if (inventory[0].id == 'redInventory')
			inventoryDOMObject.css("border", "1px solid #cc0000")
		else
			inventoryDOMObject.css("border", "1px solid #0000b3")
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
	{
		DOMObject.children(".flatPiece").html(tile.flatPiece.boardAvatar)
		if(tile.flatPiece.isActive)
			DOMObject.children(".flatPiece").css("opacity", "1")
		else
			DOMObject.children(".flatPiece").css("opacity", ".5")
		assignPieceColor(tile.flatPiece.owner, DOMObject.children(".flatPiece"))
	}
	else
		DOMObject.children(".flatPiece").html("")
	if (tile.piece != null)
	{
		DOMObject.children(".piece").html(tile.piece.boardAvatar)
		if(tile.piece.isActive)
			DOMObject.children(".piece").css("opacity", "1")
		else
			DOMObject.children(".piece").css("opacity", ".5")
		assignPieceColor(tile.piece.owner, DOMObject.children(".piece"))		
	}
	else
		DOMObject.children(".piece").html("")
}

function assignPieceColor(owner, DOMObject)
{
	if (owner == "Blue")
		DOMObject.css('color', 'blue')
	else
		DOMObject.css('color', 'red')
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

function addResourcesToDisplay(board)
{
	for (var row of board)
	{
		for (var tile of row)
		{
			var DOMObject = getDOMForTile(tile)
			if (tile.statuses.includes("Victory Point Tokens*2") || tile.statuses.includes("Victory Point Tokens*3"))
			{
				DOMObject.children(".resource").empty()
				DOMObject.children(".resource").prepend('<img src="../images/victoryPoints.png"/>')
			}
			else if (tile.statuses.includes("Energy*2") || tile.statuses.includes("Energy*3"))
			{
				DOMObject.children(".resource").empty()
				DOMObject.children(".resource").prepend('<img src="../images/blueEnergy.png"/>')
			}
			else if (tile.statuses.includes("Gold*2") || tile.statuses.includes("Gold*3"))
			{
				DOMObject.children(".resource").empty()
				DOMObject.children(".resource").prepend('<img src="../images/money.png"/>')
			}
		}
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

function addBaseSetPiecesToShop(baseSet)
{
	for (piece of baseSet)
		newCell = $("#baseSet tr").append('<td>' + piece.boardAvatar + '</td>');
}

function addNoneBaseSetPiecesToShop(nonBaseSet)
{
	for (piece of nonBaseSet)
		newCell = $("#nonBaseSet tr").append('<td>' + piece.boardAvatar + '</td>');	
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
	if (piece == null)
		return

	if (piece.types.includes("Spell"))
		$('#pieceProperties').append($('<li>').text("Spell"))
	else
		$('#pieceProperties').append($('<li>').text("Piece"))
	$("#pieceProperties li:first" ).first().css("font-weight", "bold")
	$("#pieceProperties li:first").css("text-decoration", "underline")
	for (key of Object.keys(piece))
	{
		if (key != "boardAvatar" && key != "owner" && key != "canAttack" && key != "canReceiveFreeEnergyAtThisLocation" && key != "currentCol" && key != "currentRow" && key != "isActive" && piece[key] != 0)
		{
			var propertyStringDisplay = ("" + key + ": " + piece[key])
			$('#pieceProperties').append($('<li>').text(propertyStringDisplay))
		}
	}
}

function clearShops()
{
	$('#baseSet tr').empty()
	$('#nonBaseSet tr').empty()
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
		enableAndShowButton($("#endActionPhaseButton"))
	else if (isThisPlayersTurn() && game.phase == "Energize")
		enableAndShowButton($("#endTurnButton"))
}

function updateDisplayerFromTile(tile)
{
	clearDisplayerLists()
	if (tile == null)
		return

	$('#tileProperties').append($('<li>').text("Tile"))	
	$("#tileProperties li:first").css("font-weight", "bold")
	$("#tileProperties li:first").css("text-decoration", "underline")
	$('#pieceProperties').append($('<li>').text("Piece"))
	$("#pieceProperties li:first" ).first().css("font-weight", "bold")
	$("#pieceProperties li:first").css("text-decoration", "underline")
	$('#flatPieceProperties').append($('<li>').text("Flat Piece"))
	$("#flatPieceProperties li:first" ).first().css("font-weight", "bold")
	$("#flatPieceProperties li:first").css("text-decoration", "underline")
	for (key of Object.keys(tile))
	{
		if (key != "piece")
		{
			var propertyStringDisplay = ("" + key + ": " + tile[key]) 
			$('#tileProperties').append($('<li>').text(propertyStringDisplay))			
		}
	}		

	if(tile.piece != null)
	{
		for (key of Object.keys(tile.piece))
		{
			if (key != "boardAvatar" && key != "owner" && key != "canAttack" && key != "canReceiveFreeEnergyAtThisLocation" && key != "currentCol" && key != "currentRow" && key != "isActive" && tile.piece[key] != 0)
			{
				var propertyStringDisplay = ("" + key + ": " + tile.piece[key]) 
				$('#pieceProperties').append($('<li>').text(propertyStringDisplay))
			}
		}
	}

	if(tile.flatPiece != null)
	{
		for (key of Object.keys(tile.flatPiece))
		{
			if (key != "boardAvatar" && key != "owner" && key != "canAttack" && key != "canReceiveFreeEnergyAtThisLocation" && key != "currentCol" && key != "currentRow" && key != "isActive" && tile.piece[key] != 0)
			{
				var propertyStringDisplay = ("" + key + ": " + tile.flatPiece[key]) 
				$('#flatPieceProperties').append($('<li>').text(propertyStringDisplay))
			}
		}
	}
}

function updateVictoryPointTokenSupplyDOM(victoryPointTokenSupply, victoryPointTokenDrip)
{
	$('#victoryPointTokenSupply').html("VP Token Supply: " + victoryPointTokenSupply + " (-" + victoryPointTokenDrip + ")")
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