var constants = require('../utilities/constants.js');
var _ = require('lodash');

function updatePiecesWhichCanReceiveFreeEnergy(game)
{
  for (var tile of game.getAllTilesInListForm())
  {
    if(tile.piece != null)
      tile.piece.canReceiveFreeEnergyAtThisLocation = tile.piece.canReceiveFreeEnergy(game)          
    if(tile.flatPiece != null)
      tile.flatPiece.canReceiveFreeEnergyAtThisLocation = tile.flatPiece.canReceiveFreeEnergy(game)                    
  }
}

function tileIsInRangeOfFriendlyConduit(game, playerColor, tile)
{
  for (var possibleConduitTile of game.getAllTilesInListForm())
  {
    var piece = possibleConduitTile.piece
    var flatPiece = possibleConduitTile.flatPiece
    if(piece != null && piece.types.includes("Conduit") && piece.owner == playerColor && getDistanceBetweenTwoTiles(possibleConduitTile, tile) <= piece.energyDistributionRange && piece.isActive)
      return true
    if(flatPiece != null && flatPiece.types.includes("Conduit") && flatPiece.owner == playerColor && getDistanceBetweenTwoTiles(possibleConduitTile, tile) <= flatPiece.energyDistributionRange && flatPiece.isActive)
      return true
  }
  return false
}

function getTilesInRangeOfAFriendlyActiveCaster(game, playerColor)
{
  var newTiles = []
  var casterTiles = getTilesWithFriendlyActiveCasters(game.getAllTilesInListForm(), playerColor)
  for (var casterTile of casterTiles)
  {
    for (tile of getTilesWithinRangeOfTile(game.getAllTilesInListForm(), casterTile, casterTile.piece.castingRange))
      newTiles.push(tile)
  }
  return newTiles
}

function getTilesWithMoreThanZeroStrength(tiles)
{
  var newTiles = []
  for (var tile of tiles)
  {
    if (tile.piece != null && tile.piece.strength > 0)
      newTiles.push(tile)
  }
  return newTiles  
}

function getTilesWithUnits(tiles)
{
  var newTiles = []
  for (var tile of tiles)
  {
    if (tile.piece != null && tile.piece.types.includes("Unit"))
      newTiles.push(tile)
  }
  return newTiles
}

function getTilesWithFriendlyActiveCasters(tiles, playerColor)
{
  var newTiles = []
  for (var tile of tiles)
  {
    if (tile.piece != null && tile.piece.types.includes("Caster") && tile.piece.owner == playerColor && tile.piece.isActive)
    {
      newTiles.push(tile)
    }
  }
  return newTiles
}

function getTilesThatShareAColumnOrRowWithCenterTile(tiles, centerTile)
{
  var newTiles = []
  for (var tile of tiles)
    if (tile.col == centerTile.col || tile.row == centerTile.row)
      newTiles.push(tile)
  return newTiles
}

//used to get the tile a hopper just hopped over
function getTileBetweenTwoTilesTwoSpacesApartInLine(board, tile1, tile2)
{
  if (tile1.row == tile2.row)
    return board[(tile1.col + tile2.col)/2][tile1.row]
  else
    return board[tile1.col][(tile1.row + tile2.row)/2]
}

function getTilesWithFirstPieceWithinEachCardinalDirectionFromCenterTileWithinRange(board, centerTile, range)
{
  var newTiles = []
  var north = {colDelta: 0, rowDelta: -1}
  var south = {colDelta: 0, rowDelta: 1}
  var east = {colDelta: 1, rowDelta: 0}
  var west = {colDelta: -1, rowDelta: 0}

  var directions = []
  directions.push(north)
  directions.push(south)
  directions.push(east)
  directions.push(west)

  for (var direction of directions)
  {
    newTiles = newTiles.concat(findFirstPieceInDirectionFromCenterTileAddingFlatPiecesWithinRange(board, centerTile, direction, range))
  }
  return newTiles
}

function findFirstPieceInDirectionFromCenterTileAddingFlatPiecesWithinRange(board, centerTile, direction, range)
{
  var newTiles = []
  var currentCol = centerTile.col + direction.colDelta
  var currentRow =  centerTile.row + direction.rowDelta
  var tilesTraveled = 1
  while (currentCol < constants.boardWidth && currentRow < constants.boardLength && currentCol >= 0 && currentRow >= 0 && tilesTraveled <= range)
  {
    var currentTile = board[currentCol][currentRow]
    if (currentTile.piece != null)
    {
      newTiles.push(currentTile)
      return newTiles
    }

    if (currentTile.flatPiece != null)
      newTiles.push(currentTile)

    currentCol = currentCol + direction.colDelta
    currentRow = currentRow + direction.rowDelta
    tilesTraveled ++
  }
  return newTiles
}

function getAttackableTilesThatDontGoThroughAnotherUnit(board, fromTile)
{
  var tilesThatCanBeAttacked = []
  getAttackableTilesThatDontGoThroughAnotherUnitHelper(board, fromTile, fromTile.piece.attackRange, tilesThatCanBeAttacked)
  return tilesThatCanBeAttacked
}

function getAttackableTilesThatDontGoThroughAnotherUnitHelper(board, tile, attackRangeRemaining, tilesThatCanBeAttacked)
{
  if (attackRangeRemaining == 0)
    return

  var adjacentTiles = getAdjacentTiles(board, tile)
  for (adjacentTile of adjacentTiles)
  {
    if (adjacentTile.piece != null)
      tilesThatCanBeAttacked.push(adjacentTile)
    else
      getAttackableTilesThatDontGoThroughAnotherUnitHelper(board, adjacentTile, attackRangeRemaining-1, tilesThatCanBeAttacked)
  }
}

function getTilesInHopRangeAndThePathThere(board, fromTile)
{
  var tilesThatCanBeHoppedToAndThePathThere = new Map()
  var currentPath = []
  if (fromTile.piece.movement % 2 != 0)
  {
    var adjustedMovement = fromTile.piece.movement - 1
    if (adjustedMovement < 0)
      adjustedMovement = 0
  }
  else
    adjustedMovement = fromTile.piece.movement

  getTilesInHopRangeAndThePathThereHelper(board, fromTile, adjustedMovement, tilesThatCanBeHoppedToAndThePathThere, currentPath)
  return tilesThatCanBeHoppedToAndThePathThere
}

function getTilesInHopRangeAndThePathThereHelper(board, tile, movementLeft, tilesThatCanBeHoppedToAndThePathThere, currentPath)
{
  if (movementLeft <= 0)
    return

  var hopTiles = getTilesTwoAwayFromTileInLine(board, tile)
  for (hopTile of hopTiles)
  {
    if (hopTile.piece == null)
    {
      var newPath = _.cloneDeep(currentPath)
      newPath.push(hopTile)

      if (tilesThatCanBeHoppedToAndThePathThere.has(hopTile))
      {
        if (newPath.length < tilesThatCanBeHoppedToAndThePathThere.get(hopTile).length)
        {
          tilesThatCanBeHoppedToAndThePathThere.set(hopTile, newPath)
        }
      }
      else
      {
        tilesThatCanBeHoppedToAndThePathThere.set(hopTile, newPath) 
      } 
      getTilesInHopRangeAndThePathThereHelper(board, hopTile, movementLeft-2, tilesThatCanBeHoppedToAndThePathThere, newPath)
    }
  }
}

function getTilesTwoAwayFromTileInLine(board, tile)
{
  var tilesTwoAwayFromTileInLine = []
  if (tile.row - 2 >= 0)
    tilesTwoAwayFromTileInLine.push(board[tile.col][tile.row-2])
  if (tile.row + 2 < constants.boardLength)
    tilesTwoAwayFromTileInLine.push(board[tile.col][tile.row+2])
  if (tile.col - 2 >= 0)
    tilesTwoAwayFromTileInLine.push(board[tile.col-2][tile.row])
  if (tile.col + 2 < constants.boardWidth)
    tilesTwoAwayFromTileInLine.push(board[tile.col+2][tile.row])
  return tilesTwoAwayFromTileInLine  
}


function getTilesInMoveRangeAndThePathThere(board, fromTile)
{
  var tilesThatCanBeMovedToAndThePathThere = new Map()
  var currentPath = []
  getTilesInMoveRangeAndThePathThereHelper(board, fromTile, fromTile.piece.movement, tilesThatCanBeMovedToAndThePathThere, currentPath)
  return tilesThatCanBeMovedToAndThePathThere
}

function getTilesInMoveRangeAndThePathThereHelper(board, tile, movementLeft, tilesThatCanBeMovedToAndThePathThere, currentPath)
{
  if (movementLeft == 0)
    return

  var adjacentTiles = getAdjacentTiles(board, tile)
  for (adjacentTile of adjacentTiles)
  {
    if (adjacentTile.piece == null)
    {
      var newPath = _.cloneDeep(currentPath)
      newPath.push(adjacentTile)

      if (tilesThatCanBeMovedToAndThePathThere.has(adjacentTile))
      {
        if (newPath.length < tilesThatCanBeMovedToAndThePathThere.get(adjacentTile).length)
        {
          tilesThatCanBeMovedToAndThePathThere.set(adjacentTile, newPath)
        }
      }
      else
      {
        tilesThatCanBeMovedToAndThePathThere.set(adjacentTile, newPath)
      }
      getTilesInMoveRangeAndThePathThereHelper(board, adjacentTile, movementLeft-1, tilesThatCanBeMovedToAndThePathThere, newPath)
    }
  }
}

function movePieceFromOneTileToAnother(fromTile, toTile)
{
  toTile.piece = fromTile.piece
  toTile.piece.currentCol = toTile.col
  toTile.piece.currentRow = toTile.row
  fromTile.piece = null
}

function playerOwnsPiece(isRedPlayer, piece)
{
  return (isRedPlayer && piece.owner == "Red") || (!isRedPlayer && piece.owner == "Blue")
}

function getTilesNextToFriendlyActiveBuilders(game, isRedPlayer)
{
  var friendlyBuilderLocations = getTilesWithActiveFriendlyBuilders(game.getAllTilesInListForm(), isRedPlayer)
  var newTiles = []
  for (tile of friendlyBuilderLocations)
  {
    newTiles = newTiles.concat(getAdjacentTiles(game.board, tile))
  }
  return newTiles
}

function getTilesWithPiecesWithMovementCapacityHigherThanZero(tiles)
{
  var newTiles = []
  for (tile of tiles)
    if(tile.piece.movementCapacity > 0)
      newTiles.push(tile)
  return newTiles
}

function getTilesWithActiveFriendlyBuilders(tiles, isRedPlayer)
{
  var newTiles = []
  for (tile of tiles)
    if (tile.piece != null && tile.piece.types.includes("Builder") && playerOwnsPiece(isRedPlayer, tile.piece) && tile.piece.isActive)
      newTiles.push(tile)
  return newTiles
}

function getTilesWithAnActivePiece(tiles)
{
  var newTiles = []
  for (tile of tiles)
    if ((tile.piece != null && tile.piece.isActive) || (tile.flatPiece != null && tile.flatPiece.isActive))
      newTiles.push(tile)
  return newTiles     
}

function getTilesWithoutAFlatPieceAndWithoutAPiece(tiles)
{
  var newTiles = []
  for (tile of tiles)
    if (tile.piece == null && tile.flatPiece == null)
      newTiles.push(tile)
  return newTiles 
}

function getTilesWithAPieceOrAFlatPiece(tiles)
{
  var newTiles = []
  for (tile of tiles)
    if (tile.piece != null || tile.flatPiece != null)
      newTiles.push(tile)
  return newTiles   
}

function getTilesWithinRangeOfTile(tiles, centerTile, range)
{
  var newTiles = []
  for (tile of tiles)
    if (getDistanceBetweenTwoTiles(tile, centerTile) <= range && getDistanceBetweenTwoTiles(tile, centerTile) != 0)
      newTiles.push(tile)
  return newTiles
}

function getDistanceBetweenTwoTiles(tile1, tile2)
{
  return Math.abs(tile1.col - tile2.col) + Math.abs(tile1.row-tile2.row)
}

function getTilesWithoutAPiece(tiles)
{
  var newTiles = []
  for (tile of tiles)
    if (tile.piece == null)
      newTiles.push(tile)
  return newTiles 
}

function getTilesWithoutAFlatPiece(tiles)
{
  var newTiles = []
  for (tile of tiles)
    if (tile.flatPiece == null)
      newTiles.push(tile)
  return newTiles 
}

function getTilesWithAFriendlyPieceOrAFriendlyFlatPiece(isRedPlayer, tiles)
{
  if (isRedPlayer)
    var friendlyOwner = 'Red'
  else
    var friendlyOwner = 'Blue'

  var newTiles = []
  for (tile of tiles)
    if (tile.piece != null && tile.piece.owner == friendlyOwner)
        newTiles.push(tile)
    else if (tile.flatPiece != null && tile.flatPiece.owner == friendlyOwner)
        newTiles.push(tile)
  return newTiles
} 

function getTilesWithAnEnemyPiece(isRedPlayer, tiles)
{
  if (isRedPlayer)
    var enemyOwner = 'Blue'
  else
    var enemyOwner = 'Red'

  var newTiles = []
  for (tile of tiles)
    if (tile.piece != null && tile.piece.owner == enemyOwner)
        newTiles.push(tile)
  return newTiles
}

function getTilesWithStatus(tiles, status)
{
  var newTiles = []
  for (tile of tiles)
    if (tile.status == status)
      newTiles.push(tile)
  return newTiles 
}

function getAdjacentTiles(board, tile)
{
  var adjacentTiles = []
  if (tile.row - 1 >= 0)
    adjacentTiles.push(board[tile.col][tile.row-1])
  if (tile.row + 1 < constants.boardLength)
    adjacentTiles.push(board[tile.col][tile.row+1])
  if (tile.col - 1 >= 0)
    adjacentTiles.push(board[tile.col-1][tile.row])
  if (tile.col + 1 < constants.boardWidth)
    adjacentTiles.push(board[tile.col+1][tile.row])
  return adjacentTiles
}

function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}

function removeValueFromArray(arr) 
{
  var what, a = arguments, L = a.length, ax;
  while (L > 1 && arr.length) 
  {
    what = a[--L];
    while ((ax = arr.indexOf(what)) !== -1)
        arr.splice(ax, 1);
  }
  return arr;
}

module.exports = {
  getTilesWithAnActivePiece,
  updatePiecesWhichCanReceiveFreeEnergy,
  tileIsInRangeOfFriendlyConduit,
  getTilesInRangeOfAFriendlyActiveCaster,
  getTilesWithMoreThanZeroStrength,
  getTilesWithUnits,
  getTilesWithFriendlyActiveCasters,
  getTilesThatShareAColumnOrRowWithCenterTile,
  getTileBetweenTwoTilesTwoSpacesApartInLine,
  getTilesWithFirstPieceWithinEachCardinalDirectionFromCenterTileWithinRange,
  findFirstPieceInDirectionFromCenterTileAddingFlatPiecesWithinRange,
  getAttackableTilesThatDontGoThroughAnotherUnit,
  getAttackableTilesThatDontGoThroughAnotherUnitHelper,
  getTilesInHopRangeAndThePathThere,
  getTilesInHopRangeAndThePathThereHelper,
  getTilesTwoAwayFromTileInLine,
  getTilesInMoveRangeAndThePathThere,
  getTilesInMoveRangeAndThePathThereHelper,
  movePieceFromOneTileToAnother,
  playerOwnsPiece,
  getTilesNextToFriendlyActiveBuilders,
  getTilesWithPiecesWithMovementCapacityHigherThanZero,
  getTilesWithActiveFriendlyBuilders,
  getTilesWithoutAFlatPieceAndWithoutAPiece,
  getTilesWithAPieceOrAFlatPiece,
  getTilesWithoutAFlatPiece,
  getTilesWithinRangeOfTile,
  getDistanceBetweenTwoTiles,
  getTilesWithoutAPiece,
  getTilesWithAFriendlyPieceOrAFriendlyFlatPiece,
  getTilesWithAnEnemyPiece,
  getTilesWithStatus,
  getAdjacentTiles,
  onlyUnique,
  removeValueFromArray,
};
