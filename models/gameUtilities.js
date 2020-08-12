var _ = require('lodash');
var lobby = require('../models/lobby')
var constants = require('../utilities/constants.js');

function restoreMovementForPlayersPieces(game, isRedPlayer)
{
  for (tile of game.boardAsList)
  {
    if(tile.piece != null && findIfAPlayerOwnsAPiece(isRedPlayer, tile.piece) && tile.piece.movementCapacity != 0)
      tile.piece.movement = tile.piece.movementCapacity
  }  
}

function updateCanReceiveFreeEnergies(game)
{
  for (var tile of game.boardAsList)
  {
    if(tile.piece != null)
      tile.piece.canReceiveFreeEnergyAtThisLocation = tile.piece.canReceiveFreeEnergy(game)          
    if(tile.flatPiece != null)
      tile.flatPiece.canReceiveFreeEnergyAtThisLocation = tile.flatPiece.canReceiveFreeEnergy(game)                    
  } 
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
      var clientTile = {piece: getPieceForClientFromGamePiece(gameTile.piece), flatPiece: getPieceForClientFromGamePiece(gameTile.flatPiece), statuses: gameTile.statuses, row: row, col: col, resource: gameTile.resource}
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
  clientGame.victoryPointTokenSupply = game.victoryPointTokenSupply
  clientGame.victoryPointTokenDrip = game.victoryPointTokenDrip
  clientGame.redPlayer = _.cloneDeep(game.redPlayer)
  clientGame.bluePlayer = _.cloneDeep(game.bluePlayer)
  clientGame.isRedPlayersTurn = game.isRedPlayersTurn
  clientGame.board = convertServerBoardToClientBoard(game.board)
  clientGame.baseSet = convertDictionaryToList(game.baseSet).map(getPieceForClientFromGamePiece).sort(function (a, b) 
    {
      return a.cost - b.cost
    })
  clientGame.nonBaseSetBuildings = convertDictionaryToList(game.nonBaseSetBuildings).map(getPieceForClientFromGamePiece).sort(function (a, b) 
    {
      return a.cost - b.cost
    })
  clientGame.nonBaseSetUnits = convertDictionaryToList(game.nonBaseSetUnits).map(getPieceForClientFromGamePiece).sort(function (a, b) 
    {
      return a.cost - b.cost
    })
  return clientGame
}

function findPieceInGameStores(game, pieceToFind)
{
  var piece = game.baseSet[pieceToFind.name]
  if (piece == null) 
  {
    if (pieceToFind.types.includes("Building"))
      piece = game.nonBaseSetBuildings[pieceToFind.name]
    else if (pieceToFind.types.includes("Unit"))
      piece = game.nonBaseSetUnits[pieceToFind.name]
    else
      piece = game.nonBaseSetSpells[pieceToFind.name]
  }
  return piece
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
  updateCanReceiveFreeEnergies,
  findPieceInGameStores,
  convertServerBoardToClientBoard,
  getPieceForClientFromGamePiece,
  convertServerGameToClientGame,
  findIfAPlayerOwnsAPiece,
  getDistanceBetweenTwoTiles,
  findGameFromSocketID,
  findIfPlayerIsRedPlayerInGameFromSocketID,
  convertDictionaryToList,
};
