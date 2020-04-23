var units = {}
var buildings = []
var spells = {}

function Unit(name, owner, boardAvatar, Types, buildableZones, cost, power, movementCapacity, energyCapacity, health, attackRange, powerCapacity) {
  this.Name = name;
  this.owner = owner;
  this.boardAvatar = boardAvatar;
  this.Types = Types;
  this.buildableZones = buildableZones
  this.cost = cost;
  this.power = power
  this.powerCapacity = powerCapacity
  this.movement = 2
  this.movementCapacity = movementCapacity
  this.energy = 0
  this.energyCapacity = energyCapacity
  this.health = health
  this.attackRange = attackRange
}

function Building(name, owner, boardAvatar, Types, buildableZones, cost, health, pointValue, coinProduction, energyCapacity, isFlat) {
  this.Name = name;
  this.owner = owner;
  this.boardAvatar = boardAvatar;
  this.Types = Types;
  this.buildableZones = buildableZones
  this.cost = cost;
  this.health = health
  this.pointValue = pointValue
  this.energy = 0
  this.coinProduction = coinProduction
  this.energyCapacity = energyCapacity
  this.isFlat = isFlat
}

var attackDrone = 
{
  name: "Attack Drone",
  description: "",
  owner: "",
  boardAvatar: "AD",
  types: ["Unit"],
  cost: 3,
  movement: 2,
  energy: 0,
  energyCapacity: 1,
  health: 2,
  healthCapacity: 2,
  attackRange: 1,
  movementDisplay: 2,
  powerDisplay: 1,
  isFlat: false,

  getTilesWhichCanBeBuiltOn: function(game)
  {
    if (this.owner == 'Red')
      return getTilesWithoutABumpyPiece(getTilesNextToFriendlyBuilders(game.board, getTilesWithFriendlyBuilders(game.allTiles)).concat(game.redFriendlyTiles))
    else
      return getTilesWithoutABumpyPiece(getTilesNextToFriendlyBuilders(game.board, getTilesWithFriendlyBuilders(game.allTiles)).concat(game.blueFriendlyTiles))      
  },

  getPower: function()
  {
    return 1 + this.energy
  },

  getMovement: function()
  {
    return movement
  },

  getTilesWhichCanBeMovedTo: function(game, pieceTile)
  {
    return getTilesWithoutABumpyPiece(getTilesWithinRangeOfTile(game.allTiles, game.board[pieceTile.col][pieceTile.row], this.movement))
  },

  getAttackableTiles: function(game, pieceTile)
  {

  }
}

units[attackDrone.name] = attackDrone

function playerOwnsPiece(isRedPlayer, piece)
{
  return (isRedPlayer && piece.owner == "Red") || (!isRedPlayer && piece.owner == "Blue")
}

function getTilesInFriendlyZone(board, isRedPlayer)
{
  if (isRedPlayer)
   tilesWhichCanCurrentlyBeBuiltOn = tilesWhichCanCurrentlyBeBuiltOn.concat(getTilesFromRowStartToRowEndInCol(0, 3, col))
  else
    tilesWhichCanCurrentlyBeBuiltOn = tilesWhichCanCurrentlyBeBuiltOn.concat(getTilesFromRowStartToRowEndInCol(6, 9, col))
}

function getTilesNextToFriendlyBuilders(board, tiles)
{
  var newTiles = []
  for (tile of tiles)
    newTiles = newTiles.concat(getAdjacentTiles(board, tile))
  return newTiles
}

function getTilesWithFriendlyBuilders(tiles, isRedPlayer)
{
  var newTiles = []
  for (tile of tiles)
    if (tile.piece != null && tile.piece.types.includes('Builder') && playerOwnsPiece(isRedPlayer, tile.piece))
      newTiles.push[tile]
  return newTiles
}

function getTilesWithoutAnyPiece(tiles)
{
  var newTiles = []
  for (tile of tiles)
    if (tile.piece == null && tile.flatPiece == null)
      newTiles.push(tile)
  return newTiles 
}

function getTilesWithAnyPiece(tiles)
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
    if (getDistanceBetweenTwoTiles(tile, centerTile) <= range)
      newTiles.push(tile)
  return newTiles
}

function getDistanceBetweenTwoTiles(tile1, tile2)
{
  return Math.abs(tile1.col - tile2.col) + Math.abs(tile1.row-tile2.row)
}

function getTilesWithoutABumpyPiece(tiles)
{
  var newTiles = []
  for (tile of tiles)
    if (tile.piece == null)
      newTiles.push(tile)
  return newTiles 
}

function getTilesWithAFriendlyPiece(isRedPlayer, tiles)
{
  if (isRedPlayer)
    var friendlyOwner = 'Red'
  else
    var friendlyOwner = 'Blue'

  var newTiles = []
  for (tile of tiles)
    if (tile.piece != null && tile.piece.owner == friendlyOwner)
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
  adjacentTiles = []
  if (tile.row - 1 >= 0)
    adjacentTiles.push(board[tile.col][tile.row-1])
  if (tile.row + 1 < 9)
    adjacentTiles.push(board[tile.col][tile.row+1])
  if (tile.col - 1 >= 0)
    adjacentTiles.push(board[tile.col-1][tile.row])
  if (tile.col + 1 < 9)
    adjacentTiles.push(board[tile.col+1][tile.row])
  return adjacentTiles
}

module.exports.buildings = buildings
module.exports.units = units


