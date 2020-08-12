#!/usr/bin/env node
var pieces = require('./pieces.js')
var constants = require('../utilities/constants.js');
var _ = require('lodash');

function createNewGame(name, host)
{
	//create board -- probably deserves its own helper -- or just a premade board to copy?
	var board = new Array(constants.boardWidth);
  var boardAsList = []
	for (var col = 0; col < constants.boardWidth; col++)
	{
		board[col] = new Array(constants.boardLength);
		for (var row = 0; row < constants.boardLength; row++) 
		{
		  var tile = {piece: null, flatPiece: null, statuses: [], row: row, col: col, resource: ""}
		  board[col][row] = tile
      boardAsList.push(tile)
		}
	}

	//set central square VP multiplier
	board[constants.centerVPTokensTile.col][constants.centerVPTokensTile.row].resource = "Victory Point Tokens: 3"

	//create blue HQ
	board[constants.blueHQTile.col][constants.blueHQTile.row].piece = _.cloneDeep(pieces.baseSet['Headquarters'])
	var blueHQ = board[constants.blueHQTile.col][constants.blueHQTile.row].piece
	blueHQ.owner = "Blue"
	blueHQ.isActive = true
	blueHQ.currentCol = constants.blueHQTile.col
	blueHQ.currentRow = constants.blueHQTile.row

	//create red HQ
	board[constants.redHQTile.col][constants.redHQTile.row].piece = _.cloneDeep(pieces.baseSet['Headquarters'])
	var redHQ = board[constants.redHQTile.col][constants.redHQTile.row].piece
	redHQ.owner = "Red"
	redHQ.isActive = true
	redHQ.currentCol = constants.redHQTile.col
	redHQ.currentRow = constants.redHQTile.row

	//add initial builders
	var initialBuilderTiles = []
	initialBuilderTiles.push(board[constants.intialBlueBuilder1Tile.col][constants.intialBlueBuilder1Tile.row])
	initialBuilderTiles.push(board[constants.intialBlueBuilder2Tile.col][constants.intialBlueBuilder2Tile.row])
	initialBuilderTiles.push(board[constants.intialRedBuilder1Tile.col][constants.intialRedBuilder1Tile.row])
	initialBuilderTiles.push(board[constants.intialRedBuilder2Tile.col][constants.intialRedBuilder2Tile.row])

	for (tile of initialBuilderTiles)
	{
		tile.piece = _.cloneDeep(pieces.baseSet['Builder Drone'])
		tile.piece.isActive = true
		tile.piece.movement = 2
    tile.piece.canReceiveFreeEnergyAtThisLocation = true
		tile.piece.currentCol = tile.col
		tile.piece.currentRow = tile.row

		if (tile.row == constants.intialBlueBuilder1Tile.row)
		  tile.piece.owner = "Blue"
		else
		  tile.piece.owner = "Red"
	}

	//create a new base set remove the HQ and Blight
	var buyablePiecesInBaseSet = _.cloneDeep(pieces.baseSet)
	delete buyablePiecesInBaseSet['Headquarters']
  delete buyablePiecesInBaseSet['Blight']

	//create game object
	var newGame =   
	{
		host: host,
		redPlayer: {socketID: null, turnsTaken: 0, Name: name, gold: 5, victoryPoints: 0, energy: 2},
		bluePlayer: {socketID: null, turnsTaken: 0, Name: host, gold: 3, victoryPoints: 0, energy: 0},
		board: board,
    boardAsList: boardAsList,
		movementReactions: new Map,
    activationReactions: new Map,
    deathReactions: new Map,
		baseSet: buyablePiecesInBaseSet,
		nonBaseSetBuildings: selectRandomNonBaseSet(pieces.nonBaseSetBuildings),
		nonBaseSetUnits: selectRandomNonBaseSet(pieces.nonBaseSetUnits),
		victoryPointTokenSupply: 100,
		victoryPointTokenDrip: 1,
		isRedPlayersTurn: true,
    previousGameState: null,
	}

	assignBonusesOfType(newGame, "G")
	assignBonusesOfType(newGame, "V")
	assignBonusesOfType(newGame, "E")
	assignStartingBaseBonuses(newGame)

	return newGame
}

function assignStartingBaseBonuses(game)
{
  var bonusToAdd = "Gold: 1"
  var numberOfBonuses = 0
  while (numberOfBonuses < 2)
  {
    var randomCol = getRandomNumberBetweenMinAndMax(0, constants.boardWidth)
    var randomRow = getRandomNumberBetweenMinAndMax(0, 3)
    var tile = game.board[randomCol][randomRow]
    var sisterTile = game.board[constants.boardWidth-randomCol-1][constants.boardLength-randomRow-1]

    if (tile.statuses.length == 0 && tile.piece == null && tile.resource == null)
    {
      tile.resource = bonusToAdd
      sisterTile.resource = bonusToAdd
      numberOfBonuses ++
    }
  }

  var bonusToAdd = "Energy: 1"
  var numberOfBonuses = 0
  while (numberOfBonuses < 2)
  {
    var randomCol = getRandomNumberBetweenMinAndMax(0, constants.boardWidth)
    var randomRow = getRandomNumberBetweenMinAndMax(0, 3)
    var tile = game.board[randomCol][randomRow]
    var sisterTile = game.board[constants.boardWidth-randomCol-1][constants.boardLength-randomRow-1]

    if (tile.statuses.length == 0 && tile.piece == null && tile.resource == null)
    {
      tile.resource = bonusToAdd
      sisterTile.resource = bonusToAdd
      numberOfBonuses ++
    }
  }
}

function assignBonusesOfType(game, bonusType)
{
  var numberOfBonuses = 0
  while (numberOfBonuses < 2)
  {
    var randomCol = getRandomNumberBetweenMinAndMax(0, constants.boardWidth)
    var randomRow = getRandomNumberBetweenMinAndMax(4, 8)
    var tile = game.board[randomCol][randomRow]

    if (tile.statuses.length == 0)
    {
      if (randomRow < 6)
      {
        if (bonusType == "G")
          var bonusToAdd = "Gold: 2"
        else if(bonusType == "V")
          var bonusToAdd = "Victory Point Tokens: 2"
        else
          var bonusToAdd = "Energy: 2"
      }
      else
      {
        if (bonusType == "G")
          var bonusToAdd = "Gold: 3"
        else if(bonusType == "V")
          var bonusToAdd = "Victory Point Tokens: 3"
        else
          var bonusToAdd = "Energy: 3"
      }

      var sisterTile = game.board[constants.boardWidth-randomCol-1][constants.boardLength-randomRow-1]

      tile.resource = bonusToAdd
      sisterTile.resource = bonusToAdd
      numberOfBonuses ++
    }
  }
}

//random number can equal min, must be less than max
function getRandomNumberBetweenMinAndMax(min, max) 
{
  return Math.floor(Math.random() * (max - min)) + min;
}

function selectRandomNonBaseSet(pieces)
{
  var randomNonBaseSet = {}
  addUniqueRandomPiecesFromSourceToDestination(pieces, randomNonBaseSet, 7)
  return randomNonBaseSet
}

function addUniqueRandomPiecesFromSourceToDestination(source, destination, numberOfRandomPiecesToAdd)
{
  var keys = Object.keys(source);
  var piecesAdded = 0
  while (piecesAdded < numberOfRandomPiecesToAdd)
  {
    var randomIndex = getRandomNumberBetweenMinAndMax(0,keys.length)
    var randomKey = keys[randomIndex]
    var randomPiece = source[randomKey]
    if (!destination.hasOwnProperty(randomKey))
    {
      destination[randomKey] = randomPiece
      piecesAdded ++
    }
  }
}

module.exports.createNewGame = createNewGame;