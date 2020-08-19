const boardLength = 15;
const boardWidth = 9;
const startOfRedTiles = 0
const endOfRedTiles = 3
const startOfBlueTiles = 12
const endOfBlueTiles = 15
const clickSound = new Audio('../sounds/click.wav');
const yourTurnSound = new Audio('../sounds/yourTurn.mp3');

$(function () 
{
	//globals
	var socket = io()
	window.allButtons = [($('#castUnitSpellOnFlatPieceButton')), ($('#energizeFlatPieceButton')), ($('#energizePieceButton')), ($('#castUnitSpellOnPieceButton')), ($('#castUnitSpellButton')) ,($('#buildButton')),($('#moveButton')),($('#energizeButton')),($('#attackButton')),($('#attackPieceButton')),($('#attackFlatPieceButton'))]

	//tiles which can currently be acted on(moved to, attacked, casted on, built on)
	window.activeTiles = []
	window.tilesWhichAreHighlightedBecauseTheyCanBeEnergized = []
	window.showTilesWhichCanBeEnergized = true
	window.tilesThatCanBeMovedToAndThePathsThere = new Map

	//storage variables to pass data between click handlers
	window.currentlySelectedTile = null
	window.currentlySelectedStorePiece = null
	window.tilePieceIsPotentiallyBuildingFrom = null
	window.piecePotentiallyBeingBuilt = null

	//modes are control flow variables
	window.undoRequested = false
	window.buildMode = false
	window.moveMode = false
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

		if(message == "Not enough gold")
			selectStorePieceToPurchaseMode = false
	})

	socket.on('new game state', function(newGameState)
	{
		var oldTurn = isThisPlayersTurn()				
		window.game = newGameState

		if(isThisPlayersTurn() && !oldTurn)
			yourTurnSound.play()

		enableAndDisableEndTurnButtonAsNeeded(game)
		updatePlayerResourcesDOM(true, game.redPlayer)
		updatePlayerResourcesDOM(false, game.bluePlayer)

		if (currentlySelectedTile != null)
		{
			//update because there's a new board
			currentlySelectedTile = game.board[currentlySelectedTile.col][currentlySelectedTile.row]
			updateDisplayerFromTile(currentlySelectedTile)
		}

		updateVictoryPointTokenSupplyDOM(game.victoryPointTokenSupply, game.victoryPointTokenDrip)
		updateDOMForBoard(game.board)
		enableNecessaryActionButtons()
	})

	socket.on('new game data', function(newGame)
	{
		//update client game
		window.game = newGame

		game.redPlayer.Name == readCookie("nickName") ? window.isRedPlayer = true : window.isRedPlayer = false

		clearShops()
		addBaseSetPiecesToShop(game.baseSet)
		addNoneBaseSetPiecesToShop(game.nonBaseSetBuildings)
		addNoneBaseSetPiecesToShop(game.nonBaseSetUnits)
		addStoreClickHandler()

		enableAndDisableEndTurnButtonAsNeeded(game)

		updatePlayerResourcesDOM(true, game.redPlayer)
		updatePlayerResourcesDOM(false, game.bluePlayer)

		addResourcesToDisplay(game.board)
		updateVictoryPointTokenSupplyDOM(game.victoryPointTokenSupply, game.victoryPointTokenDrip)
		updateDOMForBoard(game.board)

		if(isRedPlayer)
		{
			$('#board').css('transform', 'rotate(180deg)')
			for (var row of window.game.board)
				for (var tile of row)
					var DOMObject = getDOMForTile(tile).css('transform', 'rotate(180deg)')
		}

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
		activeTiles = Array.from(tilesThatCanBeMovedToAndThePathsThere.keys())
		addActiveClassToTiles(activeTiles)

		for (var tile of activeTiles)
		{
			var DOMObject = getDOMForTile(tile)
			DOMObject.hover
			(
				function()
				{
					hoverEffectForMovementPath($(this), true)
				},
				function() 
				{
					hoverEffectForMovementPath($(this), false)				
				}
			)
		}
	})

	socket.on('new active tiles', function(tiles)
	{
		activeTiles = getClientTilesFromServertiles(tiles)
		addActiveClassToTiles(activeTiles)

		if (selectStorePieceToPurchaseMode)
		{
			buildMode = true
			if (piecePotentiallyBeingBuilt.name == "Gold Hut" || piecePotentiallyBeingBuilt.name == "Power Hut")
				highlightCenterTilesForHuts(activeTiles)
		}
		selectStorePieceToPurchaseMode = false	
	})

	//store click handler
	function addStoreClickHandler()
	{
		$('#stores td').click(function storeTileClicked(e)
		{
			e.stopPropagation();
			removeAllBorderHighlightsAndResetHover()
			activeTiles = []
			resetHoverForTiles(window.activeTiles)
			disableAllButtons()

			var parentShop = this.closest('table')
			var index = this.cellIndex
			window.currentlyClickedStoreTileDOM = $(this)
			addHighlightedClassToObject(currentlyClickedStoreTileDOM)

			if (parentShop.id == 'baseSet')
				var currentlySelectedStorePiece = game.baseSet[index]
			else if (parentShop.id == 'nonBaseSetBuildings')
				var currentlySelectedStorePiece = game.nonBaseSetBuildings[index]
			else
				var currentlySelectedStorePiece = game.nonBaseSetUnits[index]

			updateDisplayerFromShop(currentlySelectedStorePiece)

			if (selectStorePieceToPurchaseMode)
			{
				piecePotentiallyBeingBuilt = currentlySelectedStorePiece
				socket.emit('request tiles which can be built on', piecePotentiallyBeingBuilt, tilePieceIsPotentiallyBuildingFrom)
			}
		})
	}

	//board click handler
	$('#board td').click(function tileClicked(e)
	{
		removeAllBorderHighlightsAndResetHover()
		disableAllButtons()
		e.stopPropagation()

		var clickedDOMTableElement = this
		var xpos = clickedDOMTableElement.cellIndex
		var ypos = clickedDOMTableElement.parentNode.rowIndex
		currentlySelectedTile = game.board[xpos][ypos]
		updateDisplayerFromTile(currentlySelectedTile)
		addHighlightedClassToObject(getDOMForTile(currentlySelectedTile))

		if (activeTiles.includes(currentlySelectedTile))
		{
			if (moveMode)
				socket.emit('request to move a piece', tilePieceIsPotentiallyMovingFrom, currentlySelectedTile)
			else if (buildMode)
				socket.emit('request to build a piece', piecePotentiallyBeingBuilt, currentlySelectedTile, tilePieceIsPotentiallyBuildingFrom)

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

		enableNecessaryActionButtons()
		setAllModesToFalse()
		activeTiles = []
	})

	$(document).click(function() 
	{
		removeAllBorderHighlightsAndResetHover()
    	$('.tabButton').removeClass('activeTab')
		disableAllButtons()
		activeTiles = []
		currentlySelectedTile = null
		selectStorePieceToPurchaseMode = false
		updateDisplayerFromTile(null)
		updateDisplayerFromShop(null)
	})

	$(document).keypress(function(e) 
	{
  		if(e.key == "m" && $('#moveButton').is(":enabled"))
  			$('#moveButton').click()
  		else if(e.key == "b" && $('#buildButton').is(":enabled"))
  			$('#buildButton').click()
  		else if(e.key == "e" && $('#energizeButton').is(":enabled"))
  			$('#energizeButton').click()
  		else if(e.key == "a" && $('#attackButton').is(":enabled"))
  			$('#attackButton').click()
  		else if(e.key == "t" && $('#endTurnButton').is(":enabled"))
  			$('#endTurnButton').click()
  		else if(e.key == "c" && $('#castUnitSpellButton').is(":enabled"))
  			$('#castUnitSpellButton').click()
   		else if(e.key == "n" && $('#energizeFlatPieceButton').is(":enabled"))
  			$('#energizeFlatPieceButton').click()
	})

	//button handlers
	$('#requestUndoButton').click(function(e)
	{
		clickSound.play()
		disableAllButtons()
		e.preventDefault()
		e.stopPropagation()
		socket.emit('undo')
	})

	$('#energizeButton').click(function(e)
	{
		clickSound.play()
		disableAllButtons()
		e.preventDefault()
		e.stopPropagation()
		socket.emit('request to energize a piece', currentlySelectedTile, false)
	})

	$('#energizeFlatPieceButton').click(function(e)
	{
		clickSound.play()
		disableAllButtons()
		e.preventDefault()
		e.stopPropagation()
		socket.emit('request to energize a piece', currentlySelectedTile, true)		
	})

	$('#endTurnButton').click(function(e)
	{
		clickSound.play()
		disableAllButtons()
		e.preventDefault()
		e.stopPropagation()
		socket.emit('request to end turn')
	})

	$('#showTilesWhichCanBeEnergized').click(function(e)
	{
		clickSound.play()
		e.preventDefault()
		e.stopPropagation()
		showTilesWhichCanBeEnergized = !showTilesWhichCanBeEnergized

		var tilesWhichCanBeEnergized = []
		if (showTilesWhichCanBeEnergized)
		{
			for (var tile of getTilesWithFriendlyActiveConduits())
				tilesWhichCanBeEnergized = tilesWhichCanBeEnergized.concat(getTilesWhichCanBeEnergizedByConduitOnTile(tile, tile.piece.energyDistributionRange))
			for (var tileWhichCanBeEnergized of tilesWhichCanBeEnergized)
				getDOMForTile(tileWhichCanBeEnergized).addClass("canBeEnergized")
		}
		else
			for (var col = 0; col < game.board.length; col++)
				for (var row = 0; row < game.board[col].length; row++)
					getDOMForTile(game.board[col][row]).removeClass("canBeEnergized")
	})

	$('#buildButton').click(function(e)
	{
		clickSound.play()
		disableAllButtons()
		e.preventDefault()
		e.stopPropagation()
		highlightShopPiecesWhichCanBeBought()
		selectStorePieceToPurchaseMode = true
	})

	$('#moveButton').click(function(e)
	{
		clickSound.play()
		disableAllButtons()   
		e.preventDefault()
		e.stopPropagation()
		moveMode = true
		socket.emit('request tiles which can be moved to and the paths there', currentlySelectedTile)
	})

	$('#attackButton').click(function(e)
	{
		clickSound.play()
		disableAllButtons()
		e.preventDefault()
		e.stopPropagation()
		attackMode = true
		socket.emit('request tiles which can be attacked', currentlySelectedTile)
    })

	$('#attackPieceButton').click(function(e)
	{
		clickSound.play()
		disableAllButtons()
		e.preventDefault()
		e.stopPropagation()
		socket.emit('request to attack a piece', tilePieceIsPotentiallyAttackingFrom,  currentlySelectedTile, false)
    })

	$('#attackFlatPieceButton').click(function(e)
	{
		clickSound.play()
		disableAllButtons()
		e.preventDefault()
		socket.emit('request to attack a piece', tilePieceIsPotentiallyAttackingFrom,  currentlySelectedTile, true)
    })

	$('#castUnitSpellButton').click(function(e)
	{
		clickSound.play()
		disableAllButtons()
		e.preventDefault()
		unitCastMode = true
		socket.emit('request tiles unit can cast on', tilePieceIsPotentiallyCastingSpellFrom)
	})

	$('#castUnitSpellOnPieceButton').click(function(e)
	{
		clickSound.play()
		disableAllButtons()
		e.preventDefault()
		socket.emit('request to cast a unit spell', tilePieceIsPotentiallyCastingSpellFrom, currentlySelectedTile, "Piece")
    })

	$('#castUnitSpellOnFlatPieceButton').click(function(e)
	{
		clickSound.play()
		disableAllButtons()
		e.preventDefault()
		socket.emit('request to cast a unit spell', tilePieceIsPotentiallyCastingSpellFrom, currentlySelectedTile, "Flat Piece")

    })

    $('#displayPieceTabButton').click(function(e)
    {
    	e.preventDefault()
    	e.stopPropagation()
    	$('.tabContent').hide()
    	$('.tabButton').removeClass('activeTab')    	
    	$('#pieceProperties').show()
    	$('#displayPieceTabButton').addClass('activeTab')

    })

    $('#displayFlatPieceTabButton').click(function(e)
    {
    	e.preventDefault()
    	e.stopPropagation()
    	$('.tabContent').hide()
    	$('.tabButton').removeClass('activeTab')
    	$('#flatPieceProperties').show()
    	$('#displayFlatPieceTabButton').addClass('activeTab')    	
    })

    $('#displayTileTabButton').click(function(e)
    {
    	e.preventDefault()
    	e.stopPropagation()
    	$('.tabContent').hide()
    	$('.tabButton').removeClass('activeTab')    	
    	$('#tileProperties').show()
		$('#displayTileTabButton').addClass('activeTab')
    })
});

function removeAllBorderHighlightsAndResetHover()
{
	unhighlightAllStorePieces()
	removeHighlightedClassFromTile(window.currentlySelectedTile)
	removeActiveClassFromTiles(window.activeTiles)
	resetHoverForTiles(window.activeTiles)
}

function getDOMForTile(tile)
{
	if (tile == null)
		return null
	return $($("#board tbody")[0].rows[tile.row].cells[tile.col])
}

function updatePlayerResourcesDOM(isRedPlayer, player)
{
	var goldDisplay = "<b> Gold: </b>"  + player.gold
	var energyDisplay = "<b> Energy: </b>" + player.energy
	var victoryPointDisplay = "<b> Victory Points: </b>" + player.victoryPoints
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

	if (window.isRedPlayer)
	{
		$('#bluePlayerResources').css('top', '3%')
		$('#redPlayerResources').css('top','91%')
	}
	else
	{
		$('#redPlayerResources').css('top', '3%')
		$('#bluePlayerResources').css('top', '91%')
	}
}

function addHighlightedClassToObject(DOMObject)
{
	if (DOMObject != null)
		DOMObject.addClass("highlighted")
}

function removeHighlightedClassFromDOMObject(storeDOMObject)
{
	if (storeDOMObject != null)
		storeDOMObject.removeClass("highlighted")
}

function updateDOMForBoard(board)
{
	for (var col = 0; col < game.board.length; col++)
		for (var row = 0; row < game.board[col].length; row++) 
			updateDOMForTile(board[col][row])

	var tilesWhichCanBeEnergized = []
	if (showTilesWhichCanBeEnergized)
	{
		for (var tile of getTilesWithFriendlyActiveConduits())
			tilesWhichCanBeEnergized = tilesWhichCanBeEnergized.concat(getTilesWhichCanBeEnergizedByConduitOnTile(tile, tile.piece.energyDistributionRange))
		for (var tileWhichCanBeEnergized of tilesWhichCanBeEnergized)
			getDOMForTile(tileWhichCanBeEnergized).addClass("canBeEnergized")
	}
	else
		for (var col = 0; col < game.board.length; col++)
			for (var row = 0; row < game.board[col].length; row++)
				getDOMForTile(game.board[col][row]).removeClass("canBeEnergized")
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
		if(tile.flatPiece.types.includes("Building"))
		{
			DOMObject.children(".flatPiece").css("border", "1px dotted #404040")
		}

		assignPieceColor(tile.flatPiece.owner, DOMObject.children(".flatPiece"))
	}
	else
	{
		DOMObject.children(".flatPiece").html("")
		DOMObject.children(".flatPiece").css("font-size", "15px")
		DOMObject.children(".flatPiece").css("font-style", "normal")
		DOMObject.children(".flatPiece").css("border", "")
	}

	if (tile.piece != null)
	{
		DOMObject.children(".piece").html(tile.piece.boardAvatar)
		if(tile.piece.isActive)
			DOMObject.children(".piece").css("opacity", "1")
		else
			DOMObject.children(".piece").css("opacity", ".5")
		if(tile.piece.types.includes("Building"))
			DOMObject.children(".piece").css("border", "1px dotted #404040")
		else
		{
			DOMObject.children(".piece").css("font-style", "italic")
			DOMObject.children(".piece").css("font-size", "12px")
		}

		assignPieceColor(tile.piece.owner, DOMObject.children(".piece"))		
	}
	else
	{
		DOMObject.children(".piece").html("")
		DOMObject.children(".piece").css("font-size", "15px")
		DOMObject.children(".piece").css("font-style", "normal")
		DOMObject.children(".piece").css("border", "")		
	}
}

function assignPieceColor(owner, DOMObject)
{
	if (owner == "Blue")
		DOMObject.css('color', 'blue')
	else if (owner == "Red")
		DOMObject.css('color', 'red')
	else
		DOMObject.css('color', 'grey')
}		

function hoverEffectForMovementPath(tileJQueryObject, isHovering)
{
	var hoveredTileCol = tileJQueryObject[0].cellIndex
	var hoveredTileRow = tileJQueryObject[0].parentNode.rowIndex
	var tile = game.board[hoveredTileCol][hoveredTileRow]
	if (isHovering)
	{
		tileJQueryObject.css("border-color: #ffd133;")
		for (var pathTile of tilesThatCanBeMovedToAndThePathsThere.get(tile))
		{
			getDOMForTile(pathTile).addClass("hoverEffectForMovementPath")
		}
	}
	else
	{
		for (var pathTile of tilesThatCanBeMovedToAndThePathsThere.get(tile))
		{
			getDOMForTile(pathTile).removeClass("hoverEffectForMovementPath")
		}
	}
}

function resetHoverForTiles(tiles)
{
	for (var tile of tiles)
	{
		getDOMForTile(tile).removeClass('hoverEffectForMovementPath')
		getDOMForTile(tile).unbind('mouseenter mouseleave')
		getDOMForTile(tile).hover
		(
			function() 
			{
				$(this).css("border-color: #ffd133;")
			},
			function() 
			{
				$(this).css("border-color: #606060;")				
			}
		)
	}
}

function enableNecessaryActionButtons()
{
	if (currentlySelectedTile != null && currentlySelectedTile.piece != null && isThisPlayersTurn() && playerOwnsPiece(isRedPlayer, currentlySelectedTile.piece))
	{
		if (currentlySelectedTile.piece.movement > 0 && currentlySelectedTile.piece.isActive)
		{	
			window.tilePieceIsPotentiallyMovingFrom = currentlySelectedTile
			enableAndShowButton($('#moveButton'))
		}

		if (currentlySelectedTile.piece.types.includes("Builder") && currentlySelectedTile.piece.isActive)
		{	
			window.tilePieceIsPotentiallyBuildingFrom = currentlySelectedTile
			enableAndShowButton($('#buildButton'))
		}

		if (currentlySelectedTile.piece.canAttack && currentlySelectedTile.piece.isActive)
		{
			window.tilePieceIsPotentiallyAttackingFrom = currentlySelectedTile
			enableAndShowButton($('#attackButton'))
		}

		var playerEnergy = (window.isRedPlayer) ? (game.redPlayer.energy) : (game.bluePlayer.energy)
		if (playerEnergy > 0 && currentlySelectedTile.piece.canReceiveFreeEnergyAtThisLocation && (currentlySelectedTile.piece.isActive == false || currentlySelectedTile.piece.movement < currentlySelectedTile.piece.movementCapacity))
		{
			window.piecePotentiallyBeingEnergized = currentlySelectedTile.piece
			enableAndShowButton($('#energizeButton'))
		}

		if(currentlySelectedTile.piece.hasUnitSpells && currentlySelectedTile.piece.isActive && currentlySelectedTile.piece.hasCastThisTurn != true)
		{
			window.tilePieceIsPotentiallyCastingSpellFrom = currentlySelectedTile
			enableAndShowButton($('#castUnitSpellButton'))
		}
	}

	var playerEnergy = (window.isRedPlayer) ? (game.redPlayer.energy) : (game.bluePlayer.energy)
	if (currentlySelectedTile!= null && currentlySelectedTile.flatPiece != null && isThisPlayersTurn() && playerOwnsPiece(isRedPlayer, currentlySelectedTile.flatPiece) && !currentlySelectedTile.flatPiece.isActive && playerEnergy > 0 && currentlySelectedTile.flatPiece.canReceiveFreeEnergyAtThisLocation && (currentlySelectedTile.piece.isActive == false || currentlySelectedTile.piece.movement < currentlySelectedTile.piece.movementCapacity))
	{
		window.flatPiecePotentiallyBeingEnergized = currentlySelectedTile.flatPiece
		enableAndShowButton($('#energizeFlatPieceButton'))
	}
}

function addResourcesToDisplay(board)
{
	for (var row of board)
	{
		for (var tile of row)
		{
			var DOMObject = getDOMForTile(tile)
			if (tile.resource == "Victory Point Tokens: 2" || tile.resource == "Victory Point Tokens: 3")
			{
				DOMObject.children(".resource").empty()
				DOMObject.children(".resource").prepend('<img src="../images/victoryPoints.png"/>')
			}
			else if (tile.resource == "Energy: 1" || tile.resource == "Energy: 2" || tile.resource == "Energy: 3")
			{
				DOMObject.children(".resource").empty()
				DOMObject.children(".resource").prepend('<img src="../images/blueEnergy.png"/>')
			}
			else if (tile.resource == "Gold: 1" || tile.resource == "Gold: 2" || tile.resource == "Gold: 3")
			{
				DOMObject.children(".resource").empty()
				DOMObject.children(".resource").prepend('<img src="../images/money.png"/>')
			}
		}
	}	
}

function getTilesWhichCanBeEnergized()
{
	var tilesWhichCanBeEnergized = []
	for (var tile of getTilesWithFriendlyActiveConduits())
		tilesWhichCanBeEnergized = tilesWhichCanBeEnergized.concat(getTilesWhichCanBeEnergizedByConduitOnTile(tile, tile.piece.energyDistributionRange))
	return tilesWhichCanBeEnergized
}

function addActiveClassToTiles(tiles)
{
	for (var tile of tiles)
	{
		var DOMObject = getDOMForTile(tile)
		DOMObject.addClass("active")
	}
}

function highlightCenterTilesForHuts(tiles)
{
	for (var tile of tiles)
	{
		if (tile.row == 6 || tile.row == 7 || tile.row == 8)
		{
			var DOMObject = getDOMForTile(tile)
			DOMObject.css('background-color', '#339966')
			DOMObject.hover
			(
				function()
				{
					$(this).css("background-color", "#FFFFE0")
				},
				function() 
				{
					$(this).css("background-color", "#339966")
				}
			)
		}
	}
}

function removeHighlightedClassFromTile(tile)
{
	if (tile != null)
	{
		var DOMObject = getDOMForTile(tile)
		DOMObject.removeClass("highlighted")
	}
}

function getTilesWhichCanBeEnergizedByConduitOnTile(conduitTile)
{
	var gameTiles = []
	if (conduitTile.piece != null)	
		var energyDistributionRange = conduitTile.piece.energyDistributionRange
	else
		var energyDistributionRange = conduitTile.flatPiece.energyDistributionRange

    for (var col = 0; col < boardWidth; col++)
        gameTiles = gameTiles.concat(game.board[col])

	var tilesThatCanBeEnergized = []
	for (var tile of gameTiles)
	  if (getDistanceBetweenTwoTiles(tile, conduitTile) <= energyDistributionRange && getDistanceBetweenTwoTiles(tile, conduitTile) != 0)
	    tilesThatCanBeEnergized.push(tile)
	return tilesThatCanBeEnergized
}

function getTilesWithFriendlyActiveConduits()
{
	var friendlyActiveConduitTiles = []
    for (var col = 0; col < boardWidth; col++)
   		for (var row = 0; row < boardLength; row++)
   		{
   			var piece = game.board[col][row].piece
   			if (piece != null && piece.types.includes('Conduit') && piece.isActive && playerOwnsPiece(window.isRedPlayer, piece))
   				friendlyActiveConduitTiles.push(game.board[col][row])
   		}
   	return friendlyActiveConduitTiles
}

function getDistanceBetweenTwoTiles(tile1, tile2)
{
  return Math.abs(tile1.col - tile2.col) + Math.abs(tile1.row-tile2.row)
}

function isAttackableTile(tile)
{
	return (tile.piece != null || (tile.flatPiece != null))
}

function removeActiveClassFromTiles(tiles)
{
	for (var tile of tiles)
	{
		var DOMObject = getDOMForTile(tile)
		DOMObject.removeClass("active")
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


function isThisPlayersTurn()
{
	return (game.isRedPlayersTurn && isRedPlayer) || (!game.isRedPlayersTurn && !isRedPlayer)
}

function setAllModesToFalse()
{
	attackMode = false
	buildMode = false
	unitCastMode = false
	moveMode = false
	selectStorePieceToPurchaseMode = false
}

function addBaseSetPiecesToShop(baseSet)
{
	for (piece of baseSet)
		newCell = $("#baseSet tr").append('<td>' + piece.boardAvatar + '</td>');
}

function addNoneBaseSetPiecesToShop(nonBaseSet)
{
	for (piece of nonBaseSet)
	{
		if(piece.types.includes("Building"))
			newCell = $("#nonBaseSetBuildings tr").append('<td>' + piece.boardAvatar + '</td>');
		else
			newCell = $("#nonBaseSetUnits tr").append('<td>' + piece.boardAvatar + '</td>');
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

function highlightShopPiecesWhichCanBeBought()
{
	var playerGold = (window.isRedPlayer) ? game.redPlayer.gold : game.bluePlayer.gold
	$('#baseSet > tbody > tr > td').each(function(index, tableRow) 
	{
		if(game.baseSet[index].cost <= playerGold)
			addHighlightedClassToObject($(this))
	});
	$('#nonBaseSetBuildings > tbody > tr > td').each(function(index, tableRow) 
	{
		if(game.nonBaseSetBuildings[index].cost <= playerGold)
			addHighlightedClassToObject($(this))
	});
	$('#nonBaseSetUnits > tbody > tr > td').each(function(index, tableRow) 
	{
		if(game.nonBaseSetUnits[index].cost <= playerGold)
			addHighlightedClassToObject($(this))
	});
}

function unhighlightAllStorePieces()
{
	$('#baseSet > tbody > tr > td').each(function(index, tableRow) 
	{
		removeHighlightedClassFromDOMObject($(this))
	});

	$('#nonBaseSetBuildings > tbody > tr > td').each(function(index, tableRow) 
	{
		removeHighlightedClassFromDOMObject($(this))
	});

	$('#nonBaseSetUnits > tbody > tr > td').each(function(index, tableRow) 
	{
		removeHighlightedClassFromDOMObject($(this))
	});
}

function clearShops()
{
	$('#baseSet tr').empty()
	$('#nonBaseSetBuildings tr').empty()
	$('#nonBaseSetUnits tr').empty()
}

function clearDisplayerLists()
{
	$('#pieceProperties').empty()
	$('#flatPieceProperties').empty()
	$('#tileProperties').empty()
}

function enableAndDisableEndTurnButtonAsNeeded(game)
{
	if (isThisPlayersTurn())
	{
		enableAndShowButton($("#endTurnButton"))
		enableAndShowButton($('#requestUndoButton'))
	}
	else
	{
		disableAndHideButton($("#endTurnButton"))
		disableAndHideButton($('#requestUndoButton'))
	}
}

function updateDisplayerFromShop(piece)
{
	clearDisplayerLists()
	if (piece == null)
		return

	$('#displayPieceTabButton').click()
	for (key of Object.keys(piece))
	{
		if (key != "healthCapacity" && key != "boardAvatar" && key != "owner" && key != "canAttack" && key != "canReceiveFreeEnergyAtThisLocation" && key != "currentCol" && key != "currentRow" && key != "isActive" && piece[key] != 0)
		{
			var propertyStringDisplay = ("<b>" + key + "</b>: " + piece[key])
			$('#pieceProperties').append($('<li>').html(propertyStringDisplay))
		}
	}
}

function updateDisplayerFromTile(tile)
{
	clearDisplayerLists()
	if (tile == null)
		return

	for (key of Object.keys(tile))
	{
		var propertyStringDisplay = ("<b>" + key + "</b>: " + tile[key])
		if (key != "piece" && key != "flatPiece")
			$('#tileProperties').append($('<li>').html(propertyStringDisplay))
	}		

	if(tile.piece != null)
	{
		$('#displayPieceTabButton').click()
		for (key of Object.keys(tile.piece))
		{
			if (key != 'healthCapacity' && key != 'movementCapacity' && key != "boardAvatar" && key != "owner" && key != "canAttack" && key != "canReceiveFreeEnergyAtThisLocation" && key != "currentCol" && key != "currentRow" && key != "isActive" && tile.piece[key] != 0)
			{
				if(key == 'health')
					var propertyStringDisplay = ("<b>" + key + "</b>:   " + tile.piece[key] + "/" + tile.piece['healthCapacity'])
				else if(key == 'movement')
					var propertyStringDisplay = ("<b>" + key + "</b>:   " + tile.piece[key] + "/" + tile.piece['movementCapacity'])
				else
					var propertyStringDisplay = ("<b>" + key + "</b>:   " + tile.piece[key]) 

			$('#pieceProperties').append($('<li>').html(propertyStringDisplay))
			}
		}
	}

	if(tile.flatPiece != null)
	{
		if(tile.piece == null)
			$('#displayFlatPieceTabButton').click()
		for (key of Object.keys(tile.flatPiece))
		{
			if (key != 'healthCapacity' && key != "boardAvatar" && key != "owner" && key != "canAttack" && key != "canReceiveFreeEnergyAtThisLocation" && key != "currentCol" && key != "currentRow" && key != "isActive" && tile.flatPiece[key] != 0)
			{
				if(key == 'health')
					var propertyStringDisplay = ("<b>" + key + "</b>:   " + tile.flatPiece[key] + "/" + tile.flatPiece['healthCapacity'])
				else					
					var propertyStringDisplay = ("<b>" + key + "</b>: " + tile.flatPiece[key]) 
				$('#flatPieceProperties').append($('<li>').html(propertyStringDisplay))
			}
		}
	}

	if (tile.flatPiece == null && tile.piece == null)
		$('#displayTileTabButton').click()
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