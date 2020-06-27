var _ = require('lodash');
var lobby = require('../models/lobby')
var constants = require('../utilities/constants.js');

function restoreMovementForPlayersPieces(game, isRedPlayer)
{
  for (tile of game.getAllTilesInListForm())
  {
    if(tile.piece != null && findIfAPlayerOwnsAPiece(isRedPlayer, tile.piece) && tile.piece.movementCapacity != 0)
      tile.piece.movement = tile.piece.movementCapacity
  }  
}

function activatePieces(game, isRedPlayer)
{
  for (tile of game.getAllTilesInListForm())
  {
    if(tile.piece != null && findIfAPlayerOwnsAPiece(isRedPlayer, tile.piece) && tile.piece.energy >= tile.piece.minimumEnergyNeededForActivation)
      tile.piece.activate(game)
    if(tile.flatPiece != null && findIfAPlayerOwnsAPiece(isRedPlayer, tile.flatPiece) && tile.flatPiece.energy >= tile.flatPiece.minimumEnergyNeededForActivation)
      tile.flatPiece.activate(game)
  }
}

function updateCanReceiveFreeEnergies(game)
{
  for (var tile of game.getAllTilesInListForm())
  {
    if(tile.piece != null)
      tile.piece.canReceiveFreeEnergyAtThisLocation = tile.piece.canReceiveFreeEnergy(game)          
    if(tile.flatPiece != null)
      tile.flatPiece.canReceiveFreeEnergyAtThisLocation = tile.flatPiece.canReceiveFreeEnergy(game)                    
  } 
}

function countGoldProductionForPlayer(game, isRedPlayer)
{
  var totalGoldProduction = 0
  for (tile of game.getAllTilesInListForm())
  {
    if (tile.statuses.includes("Gold*1"))
      var multiplier = 1
    else if (tile.statuses.includes("Gold*2"))
      var multiplier = 2
    else if (tile.statuses.includes("Gold*3"))
      var multiplier = 3
    else
      var multiplier = 0

    if (tile.piece != null && tile.piece.name == "Headquarters")
      multiplier = 1
    if(tile.piece != null && findIfAPlayerOwnsAPiece(isRedPlayer, tile.piece) && tile.piece.goldProduction != null && tile.piece.isActive)
      totalGoldProduction += tile.piece.goldProduction * multiplier
    if(tile.flatPiece != null && findIfAPlayerOwnsAPiece(isRedPlayer, tile.flatPiece) && tile.flatPiece.goldProduction != null && tile.flatPiece.isActive)
      totalGoldProduction += tile.flatPiece.goldProduction * multiplier
  }
  return totalGoldProduction
}

function countVictoryPointTokenProductionForPlayer(game, isRedPlayer)
{
  var totalVictoryPointTokenProduction = 0
  for (tile of game.getAllTilesInListForm())
  {
    if (tile.statuses.includes("Victory Point Tokens*2"))
      var multiplier = 2
    else if (tile.statuses.includes("Victory Point Tokens*3"))
      var multiplier = 3
    else
      var multiplier = 0

    if(tile.piece != null && findIfAPlayerOwnsAPiece(isRedPlayer, tile.piece) && tile.piece.victoryPointTokenProduction != null && tile.piece.isActive)
      totalVictoryPointTokenProduction += tile.piece.victoryPointTokenProduction*multiplier
    if(tile.flatPiece != null && findIfAPlayerOwnsAPiece(isRedPlayer, tile.flatPiece) && tile.flatPiece.victoryPointTokenProduction != null && tile.flatPiece.isActive)
      totalVictoryPointTokenProduction += tile.flatPiece.victoryPointTokenProduction*multiplier
  }
  return totalVictoryPointTokenProduction    
}


function countEnergyCapacityProductionForPlayer(game, isRedPlayer)
{
  var totalEnergyCapacityProduction = 0
  for (tile of game.getAllTilesInListForm())
  {
    if (tile.statuses.includes("Energy*1"))
      var multiplier = 1
    else if (tile.statuses.includes("Energy*2"))
      var multiplier = 2
    else if (tile.statuses.includes("Energy*3"))
      var multiplier = 3
    else
      var multiplier = 0

    if (tile.piece != null && tile.piece.name == "Headquarters")
      multiplier = 1

    if(tile.piece != null && findIfAPlayerOwnsAPiece(isRedPlayer, tile.piece) && tile.piece.energyCapacityProduction != null && tile.piece.isActive)
      totalEnergyCapacityProduction += tile.piece.energyCapacityProduction*multiplier
    if(tile.flatPiece != null && findIfAPlayerOwnsAPiece(isRedPlayer, tile.flatPiece) && tile.flatPiece.energyCapacityProduction != null && tile.flatPiece.isActive)
      totalEnergyCapacityProduction += tile.flatPiece.energyCapacityProduction*multiplier
  }
  return totalEnergyCapacityProduction    
}

function convertServerBoardToClientBoard(board)
{
  var clientBoard = new Array(constants.boardWidth)
  for (var col = 0; col < constants.boardWidth; col++)
  {
    clientBoard[col] = new Array(constants.boardLength);
    for (var row = 0; row < constants.boardLength; row++) 
    {
      var gameTile = board[col][row]
      var clientTile = {piece: getPieceForClientFromGamePiece(gameTile.piece), flatPiece: getPieceForClientFromGamePiece(gameTile.flatPiece), statuses: gameTile.statuses, row: row, col: col}
      clientBoard[col][row] = clientTile
    }
  }
  return clientBoard          
}

function getPieceForClientFromGamePiece(gamePiece)
{
  if (gamePiece == null)
    return
  var clientPiece = {}
  Object.assign(clientPiece, gamePiece)
  return clientPiece
}

function convertServerGameToClientGame(game)
{
  var clientGame = {}
  clientGame.host = game.host
  clientGame.phase = game.phase
  clientGame.victoryPointTokenSupply = game.victoryPointTokenSupply
  clientGame.victoryPointTokenDrip = game.victoryPointTokenDrip
  clientGame.redPlayer = _.cloneDeep(game.redPlayer)
  clientGame.bluePlayer = _.cloneDeep(game.bluePlayer)
  clientGame.redPlayer.inventory = (game.redPlayer.inventory).map(getPieceForClientFromGamePiece)
  clientGame.bluePlayer.inventory = (game.bluePlayer.inventory).map(getPieceForClientFromGamePiece)
  clientGame.isRedPlayersTurn = game.isRedPlayersTurn
  clientGame.board = convertServerBoardToClientBoard(game.board)
  clientGame.baseSet = convertDictionaryToList(game.baseSet).map(getPieceForClientFromGamePiece)
  clientGame.nonBaseSetBuildings = convertDictionaryToList(game.nonBaseSetBuildings).map(getPieceForClientFromGamePiece)
  clientGame.nonBaseSetUnits = convertDictionaryToList(game.nonBaseSetUnits).map(getPieceForClientFromGamePiece)
  clientGame.nonBaseSetSpells = convertDictionaryToList(game.nonBaseSetSpells).map(getPieceForClientFromGamePiece)
  return clientGame
}

function findIfItsAPlayersTurnInGame(isRedPlayer, game){
  return (game.isRedPlayersTurn && isRedPlayer) || (!game.isRedPlayersTurn && !isRedPlayer)
}

function findIfAPlayerOwnsAPiece(isRedPlayer, piece){
  return (piece.owner == 'Red' && isRedPlayer) || (piece.owner == 'Blue' && !isRedPlayer)
}

function getDistanceBetweenTwoTiles(tile1, tile2)
{
  return Math.abs(tile1.col - tile2.col) + Math.abs(tile1.row-tile2.row)
}

function findGameFromSocketID(socketID)
{
  for (host in lobby.gameList)
    if (lobby.gameList.hasOwnProperty(host) && (lobby.gameList[host].redPlayer.socketID == socketID || lobby.gameList[host].bluePlayer.socketID == socketID))
      return lobby.gameList[host]
  return null
}

function findIfPlayerIsRedPlayerInGameFromSocketID(game, socketID)
{
  if (game.redPlayer.socketID == socketID)
    return true
  else
    return false
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

module.exports = 
{
  findIfItsAPlayersTurnInGame,
  restoreMovementForPlayersPieces,
  activatePieces, 
  updateCanReceiveFreeEnergies,
  countGoldProductionForPlayer,
  countVictoryPointTokenProductionForPlayer, 
  countEnergyCapacityProductionForPlayer,
  convertServerBoardToClientBoard,
  getPieceForClientFromGamePiece,
  convertServerGameToClientGame,
  findIfAPlayerOwnsAPiece,
  getDistanceBetweenTwoTiles,
  findGameFromSocketID,
  findIfPlayerIsRedPlayerInGameFromSocketID,
  convertDictionaryToList,
};
