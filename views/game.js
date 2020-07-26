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
	window.allButtons = [($('#castUnitSpellOnFlatPieceButton')), ($('#energizeFlatPieceButton')), ($('#castUnitSpellOnPieceButton')), ($('#castUnitSpellButton')), ($('#buyButton')),($('#buildButton')),($('#moveButton')),($('#energizeButton')),($('#attackButton')),($('#attackPieceButton')),($('#attackFlatPieceButton'))]

	//tiles which can currently be acted on(moved to, attacked, casted on, built on)
	window.activeTiles = []
	window.tilesWhichAreHighlightedBecauseTheyCanBeEnergized = []
	window.tilesThatCanBeMovedToAndThePathsThere = new Map

	//storage variables to pass data between click handlers
	window.currentlySelectedTile = null
	window.currentlySelectedStorePiece = null
	window.tilePieceIsPotentiallyBuildingFrom = null

	//modes are control flow variables
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
	})

	socket.on('new game state', function(newGameState)
	{
		window.game = newGameState

		enableAndDisableEndTurnButtonAsNeeded(game)

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
		game.baseSet = convertDictionaryToList(game.baseSet)
		game.nonBaseSetBuildings = convertDictionaryToList(game.nonBaseSetBuildings)
		game.nonBaseSetUnits = convertDictionaryToList(game.nonBaseSetUnits)

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
		if (selectStorePieceToPurchaseMode)
			buildMode = true
		selectStorePieceToPurchaseMode = false	
		highlightTilesGreenAndAddHover(activeTiles)
	})

	$(document).click(function() 
	{
		unhighlightBordersOfAllCurrentlyHighlightedDOMObjects()
    	$('.tabButton').removeClass('activeTab')
		disableAllButtons()
		resetTilesColorsAndAddHover(activeTiles)
		resetTilesColorsAndAddHover(tilesWhichAreHighlightedBecauseTheyCanBeEnergized)
		activeTiles = []
		currentlySelectedTile = null
		updateDisplayerFromTile(null)
		updateDisplayerFromShop(null)
	});

	//store click handler
	function addStoreClickHandler()
	{
		$('#stores td').click(function storeTileClicked(e)
		{
			unhighlightBordersOfAllCurrentlyHighlightedDOMObjects()
			disableAllButtons()
			e.stopPropagation();
			var parentShop = this.closest('table')
			var index = this.cellIndex
			window.currentlyClickedStoreTileDOM = $(this)
			highlightBordersOfDOMObject(currentlyClickedStoreTileDOM)

			if (parentShop.id == 'baseSet')
				var currentlySelectedStorePiece = game.baseSet[index]
			else if (parentShop.id == 'nonBaseSetBuildings')
				var currentlySelectedStorePiece = game.nonBaseSetBuildings[index]
			else
				var currentlySelectedStorePiece = game.nonBaseSetUnits[index]

			updateDisplayerFromShop(currentlySelectedStorePiece)

			if (selectStorePieceToPurchaseMode)
			{
				window.piecePotentiallyBeingBuilt = currentlySelectedStorePiece
				socket.emit('request tiles which can be built on', piecePotentiallyBeingBuilt, tilePieceIsPotentiallyBuildingFrom)
			}
		})
	}

	//board click handler
	$('#board td').click(function tileClicked(e)
	{
		unhighlightBordersOfAllCurrentlyHighlightedDOMObjects()
		resetTilesColorsAndAddHover(tilesWhichAreHighlightedBecauseTheyCanBeEnergized)
		disableAllButtons()
		e.stopPropagation();
		var clickedDOMTableElement = this
		var xpos = clickedDOMTableElement.cellIndex
		var ypos = clickedDOMTableElement.parentNode.rowIndex
		currentlySelectedTile = game.board[xpos][ypos]
		highlightBordersOfDOMObject(getDOMForTile(currentlySelectedTile))

		if (activeTiles.includes(currentlySelectedTile))
		{
			if (moveMode)
				socket.emit('request to move a piece', tilePieceIsPotentiallyMovingFrom,  currentlySelectedTile)
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

		else if (currentlySelectedTile.piece != null && isThisPlayersTurn() && playerOwnsPiece(isRedPlayer, currentlySelectedTile.piece))
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
			if (!currentlySelectedTile.piece.isActive && playerEnergy > 0 && currentlySelectedTile.piece.canReceiveFreeEnergyAtThisLocation)
			{
				window.piecePotentiallyBeingEnergized = currentlySelectedTile.piece
				enableAndShowButton($('#energizeButton'))
			}

			if(currentlySelectedTile.piece.hasUnitSpells && currentlySelectedTile.piece.isActive)
			{
				window.tilePieceIsPotentiallyCastingSpellFrom = currentlySelectedTile
				enableAndShowButton($('#castUnitSpellButton'))
			}
		}

		var playerEnergy = (window.isRedPlayer) ? (game.redPlayer.energy) : (game.bluePlayer.energy)
		if (currentlySelectedTile.flatPiece != null && isThisPlayersTurn() && playerOwnsPiece(isRedPlayer, currentlySelectedTile.flatPiece) && !currentlySelectedTile.flatPiece.isActive && playerEnergy > 0 && currentlySelectedTile.flatPiece.canReceiveFreeEnergyAtThisLocation)
		{
			window.flatPiecePotentiallyBeingEnergized = currentlySelectedTile.flatPiece
			enableAndShowButton($('#energizeFlatPieceButton'))
		}

		if(currentlySelectedTile.piece != null && currentlySelectedTile.piece.types.includes("Conduit") && currentlySelectedTile.piece.isActive && playerOwnsPiece(isRedPlayer, currentlySelectedTile.piece))
		{
			tilesWhichAreHighlightedBecauseTheyCanBeEnergized = getTilesWhichCanBeEnergizedByConduit(currentlySelectedTile, currentlySelectedTile.piece.energyDistributionRange)
			highlightTilesBlueAndAddHover(tilesWhichAreHighlightedBecauseTheyCanBeEnergized)
		}

		setAllModesToFalse()
		resetTilesColorsAndAddHover(activeTiles)
		activeTiles = []
		updateDisplayerFromTile(currentlySelectedTile)
	})

	//button handlers
	$('#energizeButton').click(function(e)
	{
		clickSound.play()
		disableAllButtons()
		e.preventDefault()
		socket.emit('request to energize a piece', currentlySelectedTile, false)
	})

	$('#energizeFlatPieceButton').click(function(e)
	{
		clickSound.play()
		disableAllButtons()
		e.preventDefault()
		socket.emit('request to energize a piece', currentlySelectedTile, true)		
	})

	$('#endTurnButton').click(function(e)
	{
		clickSound.play()
		disableAllButtons()
		e.preventDefault()
		socket.emit('request to end turn')
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
		moveMode = true
		socket.emit('request tiles which can be moved to and the paths there', currentlySelectedTile)
	})

	$('#attackButton').click(function(e)
	{
		clickSound.play()
		disableAllButtons()
		e.preventDefault()
		attackMode = true
		socket.emit('request tiles which can be attacked', currentlySelectedTile)
    })

	$('#attackPieceButton').click(function(e)
	{
		clickSound.play()
		disableAllButtons()
		e.preventDefault()
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

function unhighlightBordersOfAllCurrentlyHighlightedDOMObjects()
{
	unhighlightAllStorePieces()
	unhighlightBordersOfTile(window.currentlySelectedTile)
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

function highlightBordersOfDOMObject(DOMObject)
{
	if (DOMObject != null)
		DOMObject.css("border", "2px solid #ffaa00")
}

function unhighlightBordersOfStoreDOMObject(storeDOMObject)
{
	if (storeDOMObject != null)
		storeDOMObject.css("border", "2px solid #6e6e77")
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
		if(tile.flatPiece.types.includes("Building"))
		{
			DOMObject.children(".flatPiece").css("border", "1px dotted  #404040")
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
			DOMObject.children(".piece").css("border", "1px dotted  #404040")
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

function unhighlightBordersOfTile(tile)
{
	if (tile != null)
	{
		var DOMObject = getDOMForTile(tile)
		DOMObject.css("border", "2px solid #606060")
	}
}

function highlightTilesBlueAndAddHover(tiles)
{
	for (tile of tiles)
	{
		var DOMObject = getDOMForTile(tile)
		DOMObject.css('background-color', '#80bfff')
		DOMObject.hover
		(
			function()
			{
				$(this).css("background-color", "#FFFFE0")
			},
			function() 
			{
				$(this).css("background-color", "#80bfff")
			}
		)
	}
}

function getTilesWhichCanBeEnergizedByConduit(conduitTile, energyDistributionRange)
{
	var gameTiles = []
    for (var col = 0; col < boardWidth; col++)
        gameTiles = gameTiles.concat(game.board[col])

	var tilesThatCanBeEnergized = []
	for (tile of gameTiles)
	  if (getDistanceBetweenTwoTiles(tile, conduitTile) <= energyDistributionRange && getDistanceBetweenTwoTiles(tile, conduitTile) != 0)
	    tilesThatCanBeEnergized.push(tile)
	return tilesThatCanBeEnergized
}

function getDistanceBetweenTwoTiles(tile1, tile2)
{
  return Math.abs(tile1.col - tile2.col) + Math.abs(tile1.row-tile2.row)
}

function isAttackableTile(tile)
{
	return (tile.piece != null || (tile.flatPiece != null))
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
			var propertyStringDisplay = ("" + key + ": " + piece[key])
			$('#pieceProperties').append($('<li>').text(propertyStringDisplay))
		}
	}
}

function highlightShopPiecesWhichCanBeBought()
{
	var playerGold = (window.isRedPlayer) ? game.redPlayer.gold : game.bluePlayer.gold
	$('#baseSet > tbody > tr > td').each(function(index, tableRow) 
	{
		if(game.baseSet[index].cost <= playerGold)
			highlightBordersOfDOMObject($(this))
	});
	$('#nonBaseSetBuildings > tbody > tr > td').each(function(index, tableRow) 
	{
		if(game.nonBaseSetBuildings[index].cost <= playerGold)
			highlightBordersOfDOMObject($(this))
	});
	$('#nonBaseSetUnits > tbody > tr > td').each(function(index, tableRow) 
	{
		if(game.nonBaseSetUnits[index].cost <= playerGold)
			highlightBordersOfDOMObject($(this))
	});
}

function unhighlightAllStorePieces()
{
	$('#baseSet > tbody > tr > td').each(function(index, tableRow) 
	{
		unhighlightBordersOfStoreDOMObject($(this))
	});

	$('#nonBaseSetBuildings > tbody > tr > td').each(function(index, tableRow) 
	{
		unhighlightBordersOfStoreDOMObject($(this))
	});

	$('#nonBaseSetUnits > tbody > tr > td').each(function(index, tableRow) 
	{
		unhighlightBordersOfStoreDOMObject($(this))
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
		enableAndShowButton($("#endTurnButton"))
	else
		disableAndHideButton($("#endTurnButton"))
}

function updateDisplayerFromTile(tile)
{
	clearDisplayerLists()
	if (tile == null)
		return

	for (key of Object.keys(tile))
	{
		var propertyStringDisplay = ("" + key + ": " + tile[key])
		if (key != "piece" && key != "flatPiece")
			$('#tileProperties').append($('<li>').text(propertyStringDisplay))
	}		

	if(tile.piece != null)
	{
		$('#displayPieceTabButton').click()
		for (key of Object.keys(tile.piece))
		{
			if (key != 'healthCapacity' && key != 'movementCapacity' && key != "boardAvatar" && key != "owner" && key != "canAttack" && key != "canReceiveFreeEnergyAtThisLocation" && key != "currentCol" && key != "currentRow" && key != "isActive" && tile.piece[key] != 0)
			{
				if(key == 'health')
					var propertyStringDisplay = ("" + key + ":   " + tile.piece[key] + "/" + tile.piece['healthCapacity'])
				else if(key == 'movement')
					var propertyStringDisplay = ("" + key + ":   " + tile.piece[key] + "/" + tile.piece['movementCapacity'])
				else
					var propertyStringDisplay = ("" + key + ":   " + tile.piece[key]) 

			$('#pieceProperties').append($('<li>').text(propertyStringDisplay))
			}
		}
	}

	if(tile.flatPiece != null)
	{
		if(tile.piece == null)
			$('#displayFlatPieceTabButton').click()
		for (key of Object.keys(tile.flatPiece))
		{
			if (key != "boardAvatar" && key != "owner" && key != "canAttack" && key != "canReceiveFreeEnergyAtThisLocation" && key != "currentCol" && key != "currentRow" && key != "isActive" && tile.flatPiece[key] != 0)
			{
				if(key == 'health')
					var propertyStringDisplay = ("" + key + ":   " + tile.piece[key] + "/" + tile.piece['healthCapacity'])
				else					
					var propertyStringDisplay = ("" + key + ": " + tile.flatPiece[key]) 
				$('#flatPieceProperties').append($('<li>').text(propertyStringDisplay))
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