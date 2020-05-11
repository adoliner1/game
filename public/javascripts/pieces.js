var units = {}
var buildings = []
var spells = {}
var _ = require('lodash');

const boardLength = 15;
const boardWidth = 9;
const startOfRedTiles = 0
const endOfRedTiles = 3
const startOfBlueTiles = 12
const endOfBlueTiles = 15

class Spell
{
  constructor(name, description, types, cost, boardAvatar, target)
  {
    this.name = name;
    this.description = description
    this.types = types
    this.cost = cost
    this.boardAvatar = boardAvatar
    this.target = target
  }
}

class Surge extends Spell
{
  constructor()
  {
    super("Surge", "+1 energy to a friendly piece", ["Spell"], 3, "SU", "Piece")
  }

  getTilesWhichCanBeCastOn(game)
  {
    if (this.owner == "Red")
      var isRedPlayer = true
    else
      var isRedPlayer = false
    return getTilesWherePiecesDontHaveFullEnergy(getTilesWithAFriendlyPiece(isRedPlayer, game.getAllTilesInListForm()))
  }

  cast(game, target)
  {
    target.increaseEnergy()

    if(this.owner == "Blue")
      game.bluePlayer.activeEnergy ++
    else
      game.redPlayer.activeEnergy ++ 
  }
}

var surge = new Surge
spells[surge.name] = surge

class Piece
{
  constructor(name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)
  {
    this.name = name;
    this.description = description
    this.owner = owner;
    this.boardAvatar = boardAvatar;
    this.types = types;
    this.cost = cost;
    this.energy = 0
    this.energyCapacity = energyCapacity
    this.strength = strength
    this.movement = movementCapacity
    this.movementCapacity = movementCapacity
    this.health = health
    this.attackRange = attackRange
    this.isFlat = isFlat
    this.canAttack = canAttack
  }

  getAttackableTiles(game, pieceLocation)
  {
    return (getTilesWithAPieceOrNonPlatformFlatPiece(getTilesWithinRangeOfTile(game.getAllTilesInListForm(), game.board[pieceLocation.col][pieceLocation.row], this.attackRange)))
  }

  move(game, initialTile, path)
  {
    var leadIndex = 0
    var followIndex = -1
    while (leadIndex < path.length && this.movement > 0)
    {
      if (followIndex == -1)
      {
        movePieceFromOneTileToAnother(initialTile, path[leadIndex])
        this.movement --;
      }
      else
      {
        movePieceFromOneTileToAnother(path[followIndex], path[leadIndex])
        this.movement --;
      }

      if (game.reactions.has(path[leadIndex]))
      {
        for (var piece of game.reactions.get(path[leadIndex]))
        {
          piece.react(game, this, path[leadIndex])
        }
      }

      leadIndex ++
      followIndex ++ 
    }
  }

  getTilesWhichCanBeMovedToAndThePathThere(game, fromTile)
  {
    return getTilesInMoveRangeAndThePathThere(game.board, fromTile)
  }

  getTilesWhichCanBeBuiltOn(game)
  {
    var buildableTiles = []
    if (this.owner == 'Red')
    {
      var friendlyTiles = game.getRedFriendlyTiles() 
      var tilesNextToFriendlyBuilders = getTilesNextToFriendlyBuilders(game, true)
      return getTilesWithoutAnyPiece(friendlyTiles.concat(tilesNextToFriendlyBuilders)) 
    }
    else
    {
      var friendlyTiles = game.getBlueFriendlyTiles() 
      var tilesNextToFriendlyBuilders = getTilesNextToFriendlyBuilders(game, false)
      return getTilesWithoutAnyPiece(friendlyTiles.concat(tilesNextToFriendlyBuilders))
    }
  }

  increaseEnergy()
  {
    if (this.energy < this.energyCapacity)
      this.energy += 1
  }

  reduceEnergy()
  {
    if(this.energy != 0)
      this.energy -= 1
  }

  increaseMovement()
  {
    if (this.movement < this.movementCapacity)
      this.movement += 1
  }

  decreaseMovement()
  {
    if (this.movement != 0)
      this.movement -= 1
  }

  attack(game, victim)
  {
    victim.takeDamage(this, this.strength)
    victim.getAttacked(game, this)
  }

  getAttacked(game, attacker)
  {
    this.respondToAttack(game, attacker)
  }

  respondToAttack(game, attacker)
  {
    attacker.takeDamage(this, this.strength)
  }

  takeDamage(attacker, damage)
  {
    this.health -= damage
  }

  die(game, tileDiedOn, killer)
  {
      tileDiedOn.piece = null
  }
}

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)
class MovementPad extends Piece
{
  constructor()
  {
    super("Movement Pad", "when a friendly piece moves on to this it gets +1 movement", "", "MP", ["Building"], 3, 1, 0, 0, 1, 0, true, false)    
  }

  react(game, pieceThatTriggeredReaction, tileReactionTriggeredFrom)
  {
    if (this.owner == pieceThatTriggeredReaction.owner && this.energy != 0)
      pieceThatTriggeredReaction.increaseMovement()
  }

  addReactionsWhenBuilt(game, tileBuiltOn)
  {
    if (game.reactions.has(tileBuiltOn))
      game.reactions.get(tileBuiltOn).push(this)
    else
      game.reactions.set(tileBuiltOn, [this])
  }
}

var movementPad = new MovementPad
buildings[movementPad.name] = movementPad

class AttackDrone extends Piece
{
  constructor()
  {
    super("Attack Drone", "+1 energy = +1 strength -- movement = 1 if energy != 0", "", "AD", ["Unit"], 3, 2, 0, 0, 2, 1, false, true)
  }

  increaseEnergy()
  {
    if (this.energy < this.energyCapacity)
    {
      this.energy += 1
      this.strength += 1
      this.movementCapacity = 1
      this.movement = 1
    }
  }

  reduceEnergy()
  {
    if (this.energy != 0)
    {
      this.energy -= 1
      this.strength -= 1
    }
    if (this.energy == 0)
      this.movementCapacity = 0 
      this.movement = 0
  }
}

var attackDrone = new AttackDrone
units[attackDrone.name] = attackDrone

class BuilderDrone extends Piece
{
  constructor()
  {
    super("Builder Drone", "+1 energy = +1 movement, if energy != 0 pieces can be built on adjacent tiles", "", "BD", ["Unit", "Builder"], 2, 2, 0, 0, 1, 0, false, false)
  }

  increaseEnergy()
  {
    if (this.energy < this.energyCapacity)
    {
      this.energy += 1
      this.movementCapacity += 5
      this.movement += 5
    }
  }

  reduceEnergy()
  {
    if (this.energy != 0)
    {
      this.energy -= 1
      this.movementCapacity -= 1
      this.movement -= 1
    }
  }
}

var builderDrone = new BuilderDrone
units[builderDrone.name] = builderDrone


//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack
class Drainer extends Piece
{
  constructor()
  {
    super("Drainer", "if energy != 0, +2 movement +1 strength, and this units attacks reduce the victims energy by 1", "", "DR", ["Unit"], 5, 1, 1, 0, 2, 1, false, true)
  }

  increaseEnergy()
  {
    if (this.energy < this.energyCapacity)
    {
      this.energy += 1
      this.movementCapacity = 2
      this.strength = 1
      this.movement = 2
    }
  }

  reduceEnergy()
  {
    if (this.energy != 0)
    {
      this.energy -= 1
      this.movementCapacity = 0
      this.strength = 0
      this.movement = 0
    }
  }

  attack(game, victim)
  {
    victim.takeDamage(this, this.strength)
    if(this.energy > 0)
      victim.reduceEnergy(1)
    victim.getAttacked(game, this)
  }
}

var drainer = new Drainer
units[drainer.name] = drainer

class SmallGoldFarm extends Piece
{
  constructor()
  {
    super("Small Gold Farm", "+1 energy = +1 gold production", "", "SGF", ["Building"], 1, 3, 0, 0, 3, 0, false, false)
    this.goldProduction = 0
  }

  increaseEnergy()
  {
    if (this.energy < this.energyCapacity)
    {
      this.energy += 1
      this.goldProduction += 1
    }
  }
}
//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movement, health, attackRange, isFlat, canAttack

var smallGoldFarm = new SmallGoldFarm
buildings[smallGoldFarm.name] = smallGoldFarm

class MediumGoldFarm extends Piece
{
  constructor()
  {
    super("Medium Gold Farm", "+1 energy = +2 gold production", "", "MGF", ["Building"], 5, 3, 0, 0, 3, 0, false, false)
    this.goldProduction = 0
  }

  increaseEnergy()
  {
    if (this.energy < this.energyCapacity)
    {
      this.energy += 1
      this.goldProduction += 2
    }
  }
}

var mediumGoldFarm = new MediumGoldFarm
buildings[mediumGoldFarm.name] = mediumGoldFarm

class LargeGoldFarm extends Piece
{
  constructor()
  {
    super("Large Gold Farm", "+1 energy = +3 gold production", "", "LGF", ["Building"], 7, 1, 0, 0, 3, 0, false, false)
    this.goldProduction = 0
  }

  increaseEnergy()
  {
    if (this.energy < this.energyCapacity)
    {
      this.energy += 1
      this.goldProduction += 3
    }
  }
}

var largeGoldFarm = new LargeGoldFarm
buildings[largeGoldFarm.name] = largeGoldFarm

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movement, health, attackRange, isFlat, canAttack

class SmallPointsMiner extends Piece
{
  constructor()
  {
    super("Small Points Miner", "produces (energy*VP square value) vp tokens", "", "SPM", ["Building"], 2, 2, 0, 0, 3, 0, false, false)
    this.victoryPointTokenProduction = 0
  }

  increaseEnergy()
  {
    if (this.energy < this.energyCapacity)
    {
      this.energy += 1
      this.victoryPointTokenProduction += 1
    }
  }

  reduceEnergy()
  {
    if (this.energy != 0)
    {
      this.energy -= 1
      this.victoryPointTokenProduction -= 1
    }
  }
}

var smallPointsMiner = new SmallPointsMiner
buildings[smallPointsMiner.name] = smallPointsMiner

class MediumPointsMiner extends Piece
{
  constructor()
  {
    super("Medium Points Miner", "produces (2*energy*VP square value) vp tokens", "", "MPF", ["Building"], 5, 2, 0, 0, 3, 0, false, false)
    this.victoryPointTokenProduction = 0
  }

  increaseEnergy()
  {
    if (this.energy < this.energyCapacity)
    {
      this.energy += 1
      this.victoryPointTokenProduction += 2
    }
  }

  reduceEnergy()
  {
    if (this.energy != 0)
    {
      this.energy -= 1
      this.victoryPointTokenProduction -= 2
    }
  }
}

var mediumPointsMiner= new MediumPointsMiner
buildings[mediumPointsMiner.name] = mediumPointsMiner

class LargePointsMiner extends Piece
{
  constructor()
  {
    super("Large Points Miner", "produces (3*energy*VP square value) vp tokens", "", "LPF", ["Building"], 8, 2, 0, 0, 3, 0, false, false)
    this.victoryPointTokenProduction = 0
  }

  increaseEnergy()
  {
    if (this.energy < this.energyCapacity)
    {
      this.energy += 1
      this.victoryPointTokenProduction += 3
    }
  }

  reduceEnergy()
  {
    if (this.energy != 0)
    {
      this.energy -= 1
      this.victoryPointTokenProduction -= 3
    }
  }
}

var largePointsMiner = new LargePointsMiner
buildings[largePointsMiner.name] = largePointsMiner

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movement, health, attackRange, isFlat, canAttack

class SmallEnergyFarm extends Piece
{
  constructor()
  {
    super("Small Energy Farm", "+1 energy capacity", "", "SEF", ["Building"], 4, 0, 0, 0, 3, 0, false, false)
    this.energyCapacityProduction = 1
  }
}

var smallEnergyFarm = new SmallEnergyFarm
buildings[smallEnergyFarm.name] = smallEnergyFarm

class MediumEnergyFarm extends Piece
{
  constructor()
  {
    super("Medium Energy Farm", "+2 energy capacity", "", "MEF", ["Building"], 7, 0, 0, 0, 3, 0, false, false)
    this.energyCapacityProduction = 2
  }
}

var mediumEnergyFarm = new MediumEnergyFarm
buildings[mediumEnergyFarm.name] = mediumEnergyFarm

class LargeEnergyFarm extends Piece
{
  constructor()
  {
    super("Large Energy Farm", "+3 energy capacity", "", "LEF", ["Building"], 9, 0, 0, 0, 3, 0, false, false)
    this.energyCapacityProduction = 3
  }
}

var largeEnergyFarm = new LargeEnergyFarm
buildings[largeEnergyFarm.name] = largeEnergyFarm

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movement, health, attackRange, isFlat, canAttack
class Blight extends Piece
{
  constructor()
  {
    super("Blight", "-1 victory point for territory owner", "", "BL", ["Building, Blight"], 0, 0, 0, 0, 1, 0, true, false)
  }
}

var blight = new Blight
buildings[blight.name] = blight

module.exports.buildings = buildings
module.exports.units = units
module.exports.spells = spells



/////////utilities//////////

function getTilesInMoveRangeAndThePathThere(board, fromTile)
{
  var tilesThatCanBeMovedToAndThePathThere = new Map()
  var currentPath = []
  getTilesInMoveRangeAndThePathThereHelper(board, fromTile, fromTile.piece.movement, tilesThatCanBeMovedToAndThePathThere, currentPath)
  return tilesThatCanBeMovedToAndThePathThere
}

function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
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
  fromTile.piece = null
}

function playerOwnsPiece(isRedPlayer, piece)
{
  return (isRedPlayer && piece.owner == "Red") || (!isRedPlayer && piece.owner == "Blue")
}

function getTilesNextToFriendlyBuilders(game, isRedPlayer)
{
  var friendlyBuilderLocations = getTilesWithFriendlyBuilders(game.getAllTilesInListForm(), isRedPlayer)
  var newTiles = []
  for (tile of friendlyBuilderLocations)
  {
    newTiles = newTiles.concat(getAdjacentTiles(game.board, tile))
  }
  return newTiles
}

function getTilesWithAPieceOrNonPlatformFlatPiece(tiles)
{
  var newTiles = []
  for (tile of tiles)
    if(isAttackableTile(tile))
      newTiles.push(tile)
  return newTiles
}

function isAttackableTile(tile)
{
  return (tile.piece != null || (tile.flatPiece != null && !tile.flatPiece.types.includes("Platform")))
}

function getTilesWithFriendlyBuilders(tiles, isRedPlayer)
{
  var newTiles = []
  for (tile of tiles)
    if (tile.piece != null && tile.piece.types.includes("Builder") && playerOwnsPiece(isRedPlayer, tile.piece))
      newTiles.push(tile)
  return newTiles
}

function getTilesWherePiecesDontHaveFullEnergy(tiles)
{
  var newTiles = []
  for (tile of tiles)
    if ((tile.piece != null && tile.piece.energy < tile.piece.energyCapacity) || (tile.flatPiece != null && tile.flatPiece.energy < tile.flatPiece.energyCapacity))
      newTiles.push(tile)
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

function getTilesWithAPiece(tiles)
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
  if (tile.row + 1 < boardLength)
    adjacentTiles.push(board[tile.col][tile.row+1])
  if (tile.col - 1 >= 0)
    adjacentTiles.push(board[tile.col-1][tile.row])
  if (tile.col + 1 < boardWidth)
    adjacentTiles.push(board[tile.col+1][tile.row])
  return adjacentTiles
}

