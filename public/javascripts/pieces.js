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
    super("Surge", "+1 energy to a friendly piece in range of a Caster", ["Spell"], 3, "SU", "Piece")
  }

  getTilesWhichCanBeCastOn(game)
  {
    if (this.owner == "Red")
      var isRedPlayer = true
    else
      var isRedPlayer = false
    return getTilesWherePiecesDontHaveFullEnergy(getTilesWithAFriendlyPieceOrAFriendlyFlatPiece(isRedPlayer, getTilesInRangeOfAFriendlyCaster(game, this.owner)))
  }

  cast(game, targetPiece)
  {
    targetPiece.increaseEnergy(game)
  }
}

var surge = new Surge
spells[surge.name] = surge

class GlobalSurge extends Spell
{
  constructor()
  {
    super("Global Surge", "+1 energy to a friendly piece", ["Spell"], 5, "GS", "Piece")
  }

  getTilesWhichCanBeCastOn(game)
  {
    if (this.owner == "Red")
      var isRedPlayer = true
    else
      var isRedPlayer = false
    return getTilesWherePiecesDontHaveFullEnergy(getTilesWithAFriendlyPieceOrAFriendlyFlatPiece(isRedPlayer, game.getAllTilesInListForm()))
  }

  cast(game, targetPiece)
  {
    targetPiece.increaseEnergy(game)
  }
}

var globalSurge = new GlobalSurge
spells[globalSurge.name] = globalSurge


class Empower extends Spell
{
  constructor()
  {
    super("Empower", "+1 strength to a friendly piece", ["Spell"], 3, "EM", "Piece")
  }

  getTilesWhichCanBeCastOn(game)
  {
    if (this.owner == "Red")
      var isRedPlayer = true
    else
      var isRedPlayer = false
    return getTilesWithAFriendlyPieceOrAFriendlyFlatPiece(isRedPlayer, game.getAllTilesInListForm())
  }

  cast(game, targetPiece)
  {
    targetPiece.strength = target.strength + 1
  }
}

var empower = new Empower
spells[empower.name] = empower

class Accelerate extends Spell
{
  constructor()
  {
    super("Accelerate", "+2 movement to a friendly piece whose movement capacity is greater than 0", ["Spell"], 3, "AC", "Piece")
  }

  getTilesWhichCanBeCastOn(game)
  {
    if (this.owner == "Red")
      var isRedPlayer = true
    else
      var isRedPlayer = false
    return getTilesWithPiecesWithMovementCapacityHigherThanZero(getTilesWithAFriendlyPieceOrAFriendlyFlatPiece(isRedPlayer, game.getAllTilesInListForm()))
  }

  cast(game, targetPiece)
  {
    targetPiece.increaseMovement(2)
  }
}

var accelerate = new Accelerate
spells[accelerate.name] = accelerate

class QuickFoot extends Spell
{
  constructor()
  {
    super("Quick Foot", "+1 movement capacity to a friendly piece whose movement capacity is greater than 0", ["Spell"], 5, "QF", "Piece")
  }

  getTilesWhichCanBeCastOn(game)
  {
    if (this.owner == "Red")
      var isRedPlayer = true
    else
      var isRedPlayer = false
    return getTilesWithPiecesWithMovementCapacityHigherThanZero(getTilesWithAFriendlyPieceOrAFriendlyFlatPiece(isRedPlayer, game.getAllTilesInListForm()))
  }

  cast(game, targetPiece)
  {
    targetPiece.movementCapacity += 1
  }
}

var quickFoot = new QuickFoot
spells[quickFoot.name] = quickFoot

class LittleMissle extends Spell
{
  constructor()
  {
    super("Little Missle", "deal 1 damage to a unit within range of a friendly Caster", ["Spell"], 3, "LM", "Piece")
  }

  getTilesWhichCanBeCastOn(game)
  {
    return getTilesWithAPieceOrAFlatPiece(getTilesInRangeOfAFriendlyCaster(game, this.owner))
  }

  cast(game, targetPiece)
  {
    targetPiece.takeDamage(game, null, 1)
  }
}

var littleMissle = new LittleMissle
spells[littleMissle.name] = littleMissle

class Detonate extends Spell
{
  constructor()
  {
    super("Detonate", "destroy a target friendly unit within range of a Caster. All pieces and flat pieces adjacent to it take 5 damage", ["Spell"], 4, "DT", "Piece")
  }

  getTilesWhichCanBeCastOn(game)
  {
    var isRedPlayer = this.owner == "Red" ? true : false 
    return getTilesWithAFriendlyPieceOrAFriendlyFlatPiece(isRedPlayer, getTilesInRangeOfAFriendlyCaster(game, this.owner))
  }

  cast(game, targetPiece)
  {
    targetPiece.die(game, this)
    var targetPieceTile = targetPiece.getCurrentTile(game)
    var adjacentTiles = getAdjacentTiles(game.board, targetPieceTile)
    for (var tile of adjacentTiles)
    {
      if (tile.piece != null)
        tile.piece.takeDamage(game, this, 5)
      if (tile.flatPiece != null)
        tile.flatPiece.takeDamage(game, this, 5)        
    }
  }  
}

var detonate = new Detonate
spells[detonate.name] = detonate


////////////////////////////
//pieces
////////////////////////////
class Piece
{
  constructor(name, description, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, healthCapacity, attackRange, isFlat, canAttack)
  {
    this.name = name;
    this.description = description
    this.boardAvatar = boardAvatar;
    this.types = types;
    this.cost = cost;
    this.energy = 0
    this.energyCapacity = energyCapacity
    this.strength = strength
    this.movement = movementCapacity
    this.movementCapacity = movementCapacity
    this.healthCapacity = healthCapacity
    this.health = healthCapacity
    this.attackRange = attackRange
    this.isFlat = isFlat
    this.canAttack = canAttack
    this.canReceiveFreeEnergyAtThisLocation = false
    this.isActive = false
    this.statuses = []
    this.currentCol = null
    this.currentRow = null
    this.owner = null
    this.minimumEnergyNeededForActivation = 1
  }

  activate(game)
  {
    this.isActive = true
  }

  deactivate(game)
  {
    this.isActive = false
  }

  canReceiveFreeEnergy(game)
  {
    var pieceTile = this.getCurrentTile(game)
    if ((this.owner == "Red" && pieceTile.row < 3) || (this.owner == "Blue" && pieceTile.row > 11))
      return true
    return tileIsInRangeOfFriendlyConduit(game, this.owner, pieceTile)
  }

  getAttackableTiles(game)
  {
    var pieceTile = this.getCurrentTile(game)
    var attackableTiles = getTilesWithAPieceOrAFlatPieceOrNonPlatformFlatPiece(getTilesWithinRangeOfTile(game.getAllTilesInListForm(), pieceTile, this.attackRange))
    attackableTiles = removeValueFromArray(attackableTiles, pieceTile) 
    return attackableTiles
  }

  getCurrentTile(game)
  {
    return game.board[this.currentCol][this.currentRow]
  }

  move(game, path)
  {
    var initialTile = this.getCurrentTile(game)
    var leadIndex = 0
    var followIndex = -1
    while (leadIndex < path.length && this.movement > 0 && this.health >= 0)
    {
      if (followIndex == -1)
      {
        movePieceFromOneTileToAnother(initialTile, path[leadIndex])
        var movedFromTile = initialTile
        this.movement --;
      }
      else
      {
        movePieceFromOneTileToAnother(path[followIndex], path[leadIndex])
        var movedFromTile = path[followIndex]
        this.movement --;
      }

      if (game.reactions.has(path[leadIndex]))
      {
        for (var piece of game.reactions.get(path[leadIndex]))
        {
          if (piece.react(game, this, movedFromTile) == "stop movement")
            return
        }
      }

      this.canReceiveFreeEnergyAtThisLocation = this.canReceiveFreeEnergy(game, path[leadIndex])

      leadIndex ++
      followIndex ++ 
    }
  }

  //used for boost pad and blaster
  moveWithoutExpendingMovement(game, path)
  {
    var initialTile = this.getCurrentTile(game)
    var leadIndex = 0
    var followIndex = -1
    while (leadIndex < path.length && this.health >= 0)
    {
      if (followIndex == -1)
      {
        movePieceFromOneTileToAnother(initialTile, path[leadIndex])
        var movedFromTile = initialTile
      }

      else
      {
        movePieceFromOneTileToAnother(path[followIndex], path[leadIndex])
        var movedFromTile = path[followIndex]
      }

      if (game.reactions.has(path[leadIndex]))
      {
        for (var piece of game.reactions.get(path[leadIndex]))
        {
          if (piece.react(game, this, movedFromTile))
            return
        }
      }

      this.canReceiveFreeEnergyAtThisLocation = this.canReceiveFreeEnergy(game, path[leadIndex])
      leadIndex ++
      followIndex ++ 
    }
  }  

  getTilesWhichCanBeMovedToAndThePathThere(game)
  {
    return getTilesInMoveRangeAndThePathThere(game.board, this.getCurrentTile(game))
  }

  getTilesWhichCanBeBuiltOn(game)
  {
    var buildableTiles = []
    if (this.owner == 'Red')
    {
      var friendlyTiles = game.getRedFriendlyTiles() 
      var tilesNextToFriendlyBuilders = getTilesNextToFriendlyBuilders(game, true)
    }
    else
    {
      var friendlyTiles = game.getBlueFriendlyTiles() 
      var tilesNextToFriendlyBuilders = getTilesNextToFriendlyBuilders(game, false)
    }
    if(this.isFlat)
      return getTilesWithoutAFlatPieceAndWithoutAPiece(friendlyTiles.concat(tilesNextToFriendlyBuilders))
    else
      return getTilesWithoutAPiece(friendlyTiles.concat(tilesNextToFriendlyBuilders))
  }

  increaseHealth(amount)
  {
    if(this.health + amount <= this.healthCapacity)
      this.health += amount
    else
      this.health = this.healthCapacity
  }

  increaseEnergy(game)
  {
    if (this.energy < this.energyCapacity)
    {
      this.energy += 1
      if (this.owner == "Red")
        game.redPlayer.activeEnergy ++
      else
        game.bluePlayer.activeEnergy ++
    }
  }

  reduceEnergy(game)
  {
    if(this.energy != 0)
    {
      this.energy -= 1
      if (this.owner == "Red")
        game.redPlayer.activeEnergy --
      else
        game.bluePlayer.activeEnergy --
    }
    if(this.energy == 0)
      this.deactivate(game)
  }

  increaseMovement(amount)
  {
    if (this.movement  + amount <= this.movementCapacity)
      this.movement += amount
    else
      this.movement = this.movementCapacity
  }

  decreaseMovement(amount)
  {
    if (this.movement - amount >= 0)
      this.movement -= amount
    else
      this.movement = 0
  }

  attack(game, victim)
  {
    this.isActive = false
    victim.takeDamage(game, this, this.strength)
    if (victim.health > 0)
      victim.respondToAttack(game, this)
  }

  respondToAttack(game, attacker)
  {
    var attackerTile = attacker.getCurrentTile(game)
    var victimTile = this.getCurrentTile(game)
    if (getDistanceBetweenTwoTiles(attackerTile, victimTile) <= this.attackRange && this.isActive && this.health >= 0)
      attacker.takeDamage(game, this, this.strength)
  }

  takeDamage(game, attacker, damage)
  {
    this.health -= damage
    if (this.health <= 0)
      this.die(game, attacker)
  }

  die(game, killer)
  {
    var victimTile = this.getCurrentTile(game)
    if(this.owner == "Red")
      game.redPlayer.activeEnergy -= this.energy
    else
      game.bluePlayer.activeEnergy -= this.energy
    if (this.isFlat)
      victimTile.flatPiece = null
    else
      victimTile.piece = null
  }
}

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)
class MovementPad extends Piece
{
  constructor()
  {
    super("Movement Pad", "when a friendly piece moves on to this it gets +1 movement", "MP", ["Building"], 3, 1, 0, 0, 1, 0, true, false)    
  }

  react(game, pieceThatTriggeredReaction, tilePieceMovedFrom)
  {
    if (this.owner == pieceThatTriggeredReaction.owner && this.isActive)
      pieceThatTriggeredReaction.increaseMovement(1)
  }

  addReactionsWhenBuilt(game)
  {
    var pieceTile = this.getCurrentTile(game)
    if (game.reactions.has(pieceTile)) 
      game.reactions.get(pieceTile).push(this)
    else
      game.reactions.set(pieceTile, [this])
  }
}

var movementPad = new MovementPad
buildings[movementPad.name] = movementPad

class BoostPad extends Piece
{
  constructor()
  {
    super("Boost Pad", "when a friendly piece moves on to this it moves (without costing movement) 3 more spaces in the direction it was just moving. if that path is obstructed, it moves as far as it can. all previous plans for movement this piece had are lost", "BP", ["Building"], 3, 1, 0, 0, 1, 0, true, false)    
  }

  //returns true if the previous movement needs to be halted
  react(game, pieceThatTriggeredReaction, tilePieceMovedFrom)
  {
    if (this.owner == pieceThatTriggeredReaction.owner && this.isActive)
    {
      var north = {colDelta: 0, rowDelta: -1}
      var south = {colDelta: 0, rowDelta: 1}
      var east = {colDelta: 1, rowDelta: 0}
      var west = {colDelta: -1, rowDelta: 0}
      var piecesCurrentTile = pieceThatTriggeredReaction.getCurrentTile(game)
      
      if (piecesCurrentTile.col < tilePieceMovedFrom.col)
        var direction = west
      else if (piecesCurrentTile.col > tilePieceMovedFrom.col)
        var direction = east
      else if (piecesCurrentTile.row < tilePieceMovedFrom.row)
        var direction = north
      else
        var direction = south

      var path = []
      var spacesToMove = 3
      while (spacesToMove > 0 && piecesCurrentTile.col + direction.colDelta >= 0 && piecesCurrentTile.col + direction.colDelta < boardWidth && piecesCurrentTile.row + direction.rowDelta >= 0 && piecesCurrentTile.row + direction.rowDelta < boardLength)
      {
        var tileToAddToPath = game.board[piecesCurrentTile.col + direction.colDelta][piecesCurrentTile.row + direction.rowDelta]
        if (tileToAddToPath.piece != null)
        {
          pieceThatTriggeredReaction.moveWithoutExpendingMovement(game, path)
          return "stop movement"
        }
        else
        {
          path.push(tileToAddToPath)
          piecesCurrentTile = tileToAddToPath
          spacesToMove --
        }
      }
      pieceThatTriggeredReaction.moveWithoutExpendingMovement(game, path)
      return "stop movement"
    }
    return "continue movement"
  }

  addReactionsWhenBuilt(game)
  {
    var pieceTile = this.getCurrentTile(game)
    if (game.reactions.has(pieceTile)) 
      game.reactions.get(pieceTile).push(this)
    else
      game.reactions.set(pieceTile, [this])
  }
}

var boostPad = new BoostPad
buildings[boostPad.name] = boostPad

class EnergyPad extends Piece
{
  constructor()
  {
    super("Energy Pad", "if there's a piece on this at the start of your turn, it gains 1 energy", "EP", ["Building"], 3, 1, 0, 0, 1, 0, true, false)    
  }

  performStartOfTurnEffects(game)
  {
    if (this.isActive)
    {
      var pieceTile = this.getCurrentTile(game)
      if (pieceTile.piece != null && pieceTile.piece.owner == this.owner)
        pieceTile.piece.increaseEnergy(game)
    }
  }
}

var energyPad = new EnergyPad
buildings[energyPad.name] = energyPad

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)
class Wall extends Piece
{
  constructor()
  {
    super("Wall", "has no energy capacity, cannot be activated", "WA", ["Building"], 1, 0, 0, 0, 3, 0, false, false)    
  }
}

var wall = new Wall
buildings[wall.name] = wall

class GreaterWall extends Piece
{
  constructor()
  {
    super("Greater Wall", "has no energy capacity, cannot be activated", "WA", ["Building"], 3, 0, 0, 0, 7, 0, false, false)    
  }
}

var greaterWall = new GreaterWall
buildings[greaterWall.name] = greaterWall

class SpikeTrap extends Piece
{
  constructor()
  {
    super("Spike Trap", "when an enemy piece moves on to this it takes 1 damage", "ST", ["Building"], 2, 1, 0, 0, 1, 0, true, false)    
  }

  react(game, pieceThatTriggeredReaction, tilePieceMovedFrom)
  {
    if (this.owner != pieceThatTriggeredReaction.owner && this.isActive)
      pieceThatTriggeredReaction.takeDamage(game, this, 1)
  }

  addReactionsWhenBuilt(game)
  {
    var pieceTile = this.getCurrentTile(game)
    if (game.reactions.has(pieceTile)) 
      game.reactions.get(pieceTile).push(this)
    else
      game.reactions.set(pieceTile, [this])
  }
}

var spikeTrap = new SpikeTrap
buildings[spikeTrap.name] = spikeTrap

class Archer extends Piece
{
  constructor()
  {
    super("Archer", "+1 energy = +1 strength -- can't attack through non-flat pieces.", "AR", ["Unit"], 4, 2, 0, 1, 1, 2, false, true)
  }

  increaseEnergy(game)
  {
    var oldEnergy = this.energy
    super.increaseEnergy(game)
    if (this.energy > oldEnergy)
      this.strength += 1
  }

  reduceEnergy(game)
  {
    var oldEnergy = this.energy
    super.reduceEnergy(game)
    if (this.energy < oldEnergy)
      this.strength -= 1
  }

  getAttackableTiles(game)
  {
    var pieceTile = this.getCurrentTile(game)
    var attackableTiles = getTilesWithAPieceOrAFlatPiece(getAttackableTilesThatDontGoThroughAnotherUnit(game.board, pieceTile))
    attackableTiles = removeValueFromArray(attackableTiles, pieceTile) 
    return attackableTiles
  }
}

var archer = new Archer
units[archer.name] = archer
//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)

class PhaserBoy extends Piece
{
  constructor()
  {
    super("Phaser Boy", "can't attack through non-flat pieces, attacks in a straight line. this piece loses an energy when it attacks", "PB", ["Unit"], 5, 1, 3, 1, 1, 3, false, true)
  }

  getAttackableTiles(game)
  {
    var pieceTile = this.getCurrentTile(game)
    var attackableTiles = getTilesWithFirstPieceWithinEachCardinalDirectionFromCenterTileWithinRange(game.board, pieceTile, this.attackRange)
    return attackableTiles
  }

  attack(game, victim)
  {
    this.isActive = false
    this.reduceEnergy(game)
    victim.takeDamage(game, this, this.strength)
    if (victim.health > 0)
      victim.respondToAttack(game, this)
  }
}

var phaserBoy = new PhaserBoy
units[phaserBoy.name] = phaserBoy

class Scrapper extends Piece
{
  constructor()
  {
    super("Scrapper", "when this piece damages a unit, +1 gold. when it kills it, +3 gold. requires 2 energy to activate", "SC", ["Unit"], 5, 2, 3, 1, 1, 1, false, true)
    this.minimumEnergyNeededForActivation = 2
  }

  attack(game, victim)
  {
    var player = this.owner == "Red" ? game.redPlayer : game.bluePlayer 
    this.isActive = false
    var victimOldHealth = victim.health
    victim.takeDamage(game, this, this.strength)
    if (victimOldHealth < victim.health)
      player.gold ++
    if (victim == null || victim.health <= 0)
      player.gold += 3
    if (victim.health > 0 && this.energy < 2)
      victim.respondToAttack(game, this)
  }
}

var scrapper = new Scrapper
units[scrapper.name] = scrapper


//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)

class Sniper extends Piece
{
  constructor()
  {
    super("Sniper", "can't attack through non-flat pieces, attacks in a straight line", "SN", ["Unit"], 5, 1, 1, 1, 1, 4, false, true)
  }

  getAttackableTiles(game)
  {
    var pieceTile = this.getCurrentTile(game)
    var attackableTiles = getTilesWithFirstPieceWithinEachCardinalDirectionFromCenterTileWithinRange(game.board, pieceTile, this.attackRange)
    return attackableTiles
  }
}

var sniper = new Sniper
units[sniper.name] = sniper

class Swordsman extends Piece
{
  constructor()
  {
    super("Swordsman", "when this piece attacks, if it has at least 2 energy, the victim doesn't get to respond", "SW", ["Unit"], 5, 2, 2, 2, 2, 1, false, true)
  }

  attack(game, victim)
  {
    this.isActive = false
    victim.takeDamage(game, this, this.strength)
    if (victim.health > 0 && this.energy < 2)
      victim.respondToAttack(game, this)
  }
}

var swordsMan = new Swordsman
units[swordsMan.name] = swordsMan

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)

class MammaJamma extends Piece
{
  constructor()
  {
    super("MammaJamma", "this piece needs at least 2 energy to be active", "MJ", ["Unit"], 6, 2, 5, 1, 7, 1, false, true)
    this.minimumEnergyNeededForActivation = 2
  }
}

var mammaJamma = new MammaJamma
units[mammaJamma.name] = mammaJamma

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)
class PowerPriest extends Piece
{
  constructor()
  {
    super("Power Priest", "unit spell: a friendly unit in an adjacent tile gets +2 health", "PP", ["Unit", "Conduit"], 5, 1, 0, 1, 1, 0, false, false)
    this.energyDistributionRange = 1
    this.hasUnitSpells = true
    this.spellTarget = "Piece"
  }

  getTilesThatUnitSpellCanBeCastOn(game)
  {
    var pieceTile = this.getCurrentTile(game)
    var isRedPlayer = this.owner == "Red" ? true : false 
    return getTilesWithAFriendlyPieceOrAFriendlyFlatPiece(isRedPlayer, getAdjacentTiles(game.board, pieceTile))
  }

  activate(game)
  {
    this.isActive = true
    updatePiecesWhichCanReceiveFreeEnergy(game)
  }

  deactivate(game)
  {
    this.isActive = false
    updatePiecesWhichCanReceiveFreeEnergy(game)
  }

  castSpell(game, targetPiece)
  {
    targetPiece.increaseHealth(2)
    this.deactivate(game)
  }
}

var powerPriest = new PowerPriest
units[powerPriest.name] = powerPriest

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)
class ElectricWiz extends Piece
{
  constructor()
  {
    super("Electric Wiz", "unit spell: deal 1 damage to a target within 2 tiles", "EW", ["Unit", "Caster"], 4, 1, 0, 1, 1, 0, false, false)
    this.castingRange = 1
    this.hasUnitSpells = true
    this.spellTarget = "Piece"
  }

  getTilesThatUnitSpellCanBeCastOn(game)
  {
    var pieceTile = this.getCurrentTile(game)
    return getTilesWithAPieceOrAFlatPiece(getTilesWithinRangeOfTile(game.getAllTilesInListForm(), pieceTile, 2))
  }

  castSpell(game, targetPiece)
  {
    targetPiece.takeDamage(game, this, 2)
    this.deactivate(game)
  }
}

var electricWiz = new ElectricWiz
units[electricWiz.name] = electricWiz

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)
class Blaster extends Piece
{
  constructor()
  {
    super("Blaster", "unit spell: target must be a unit, in-line with this piece, within 2 tiles, unobstructed by other pieces. move the target unit 3 tiles away from this piece. if it collides with another piece in these 3 tiles, both pieces take 1 damage. if it collides with the edge of the board in these 3 tiles, it takes 1 damage.", "BT", ["Unit"], 4, 1, 0, 1, 1, 0, false, false)
    this.hasUnitSpells = true
    this.spellTarget = "Piece"
  }

  getTilesThatUnitSpellCanBeCastOn(game)
  {
    var pieceTile = this.getCurrentTile(game)
    return getTilesWithUnits(getTilesWithFirstPieceWithinEachCardinalDirectionFromCenterTileWithinRange(game.board, pieceTile, 2))
  }

  castSpell(game, targetPiece)
  {
    this.deactivate(game)
    var north = {colDelta: 0, rowDelta: -1}
    var south = {colDelta: 0, rowDelta: 1}
    var east = {colDelta: 1, rowDelta: 0}
    var west = {colDelta: -1, rowDelta: 0}
    var targetsCurrentTile = targetPiece.getCurrentTile(game)
    var blastersCurrentTile = this.getCurrentTile(game)
    
    if (targetsCurrentTile.col < blastersCurrentTile.col)
      var direction = west
    else if (targetsCurrentTile.col > blastersCurrentTile.col)
      var direction = east
    else if (targetsCurrentTile.row < blastersCurrentTile.row)
      var direction = north
    else
      var direction = south

    var path = []
    var spacesToMove = 3

    while (spacesToMove > 0)
    {
      if (targetsCurrentTile.col + direction.colDelta < 0 || targetsCurrentTile.col + direction.colDelta > boardWidth || targetsCurrentTile.row + direction.rowDelta < 0 || targetsCurrentTile.row + direction.rowDelta > boardLength)
      {
        targetPiece.moveWithoutExpendingMovement(game, path)
        targetPiece.takeDamage(game, this, 1)
        return
      }

      var tileToAddToPath = game.board[targetsCurrentTile.col + direction.colDelta][targetsCurrentTile.row + direction.rowDelta]
      if (tileToAddToPath.piece != null)
      {
        tileToAddToPath.piece.takeDamage(game, this, 1)
        targetPiece.moveWithoutExpendingMovement(game, path)
        targetPiece.takeDamage(game, this, 1)
        return
      }
      else
      {
        path.push(tileToAddToPath)
        targetsCurrentTile = tileToAddToPath
        spacesToMove --
      }
    }
    targetPiece.moveWithoutExpendingMovement(game, path)
  }
}

var blaster = new Blaster
units[blaster.name] = blaster

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)
class Witch extends Piece
{
  constructor()
  {
    super("Witch", "unit spell: create Blight on an empty tile within 2 tiles. set the owner based on the Blight's row. >= 8 Blue, <= 6 Red, 7 Neutral", "WI", ["Unit"], 4, 1, 0, 1, 1, 0, false, false)
    this.hasUnitSpells = true
    this.spellTarget = "Tile"
  }

  getTilesThatUnitSpellCanBeCastOn(game)
  {
    var pieceTile = this.getCurrentTile(game)    
    return getTilesWithoutAFlatPieceAndWithoutAPiece(getTilesWithinRangeOfTile(game.getAllTilesInListForm(), pieceTile, 2))
  }

  castSpell(game, targetTile)
  {
    var blight = new Blight
    blight.currentCol = targetTile.col
    blight.currentRow = targetTile.row
    if (blight.currentRow >= 8)
      blight.owner = "Blue"
    else if(blight.currentRow <= 6)
      blight.owner = "Red"
    targetTile.flatPiece = blight
    this.deactivate(game)
  }
}

var witch = new Witch
units[witch.name] = witch

class Headquarters extends Piece
{
  constructor()
  {
    super("Headquarters", "", "HQ", ["Building"], 7, 0, 0, 0, 5, 0, false, false)
    this.energyCapacityProduction = 3
    this.goldProduction = 5
  }
}

var headquarters = new Headquarters
buildings[headquarters.name] = headquarters

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)

class EnergyTower extends Piece
{
  constructor()
  {
    super("Energy Tower", "distribution range = 2", "ET", ["Building", "Conduit"], 4, 1, 0, 0, 4, 0, false, false)
    this.energyDistributionRange = 2
  }

  activate(game)
  {
    this.isActive = true
    updatePiecesWhichCanReceiveFreeEnergy(game)
  }

  deactivate(game)
  {
    this.isActive = false
    updatePiecesWhichCanReceiveFreeEnergy(game)
  }
}

var energyTower = new EnergyTower
buildings[energyTower.name] = energyTower

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)

class PulseStick extends Piece
{
  constructor()
  {
    super("Pulse Stick", "at the start of your turn, ALL pieces within 2 tiles of this get +1 energy", "PS", ["Building"], 3, 1, 0, 0, 4, 0, false, false)
  }

  performStartOfTurnEffects(game)
  {
    if (this.isActive)
    {
      var pieceTile = this.getCurrentTile(game)
      for (var tile of game.getAllTilesInListForm())
      {
        if (getDistanceBetweenTwoTiles(pieceTile, tile) <= 2)
        {
          if (tile.piece != null)
            tile.piece.increaseEnergy(game)
          else if (tile.flatPiece != null)
            tile.flatPiece.increaseEnergy(game)
        }
      }
    }
  }
}

var pulseStick = new PulseStick
buildings[pulseStick.name] = pulseStick

class Hopper extends Piece
{
  constructor()
  {
    super("Hopper", "+1 energy = +1 movement capacity -- this unit moves 2 squares at a time in a line and hops over the first square. if it hops over an enemy piece, that piece takes 3 damage", "HP", ["Unit"], 5, 4, 0, 0, 2, 0, false, false)
  }  

  increaseEnergy(game)
  {
    if (this.energy < this.energyCapacity)
    {
      var oldEnergy = this.energy
      super.increaseEnergy(game)
      if (this.energy > oldEnergy)
        this.movementCapacity += 1
    }
  }

  reduceEnergy(game)
  {
    var oldEnergy = this.energy
    super.reduceEnergy(game)
    if (this.energy < oldEnergy)
      this.movementCapacity -= 1
  }

  getTilesWhichCanBeMovedToAndThePathThere(game)
  {
    var pieceTile = this.getCurrentTile(game)        
    return getTilesInHopRangeAndThePathThere(game.board, pieceTile)
  }

  move(game, path)
  {
    var leadIndex = 0
    var followIndex = -1
    var movedOverTile = null
    var initialTile = this.getCurrentTile(game)        
 
    while (leadIndex < path.length && this.movement > 0)
    {
      if (followIndex == -1)
      {
        movePieceFromOneTileToAnother(initialTile, path[leadIndex])
        this.movement = this.movement - 2;
        var movedFromTile = initialTile 
        movedOverTile = getTileBetweenTwoTilesTwoSpacesApartInLine(game.board, initialTile, path[leadIndex])
      }
      else
      {
        movePieceFromOneTileToAnother(path[followIndex], path[leadIndex])
        this.movement = this.movement - 2;
        var movedFromTile = path[followIndex]
        movedOverTile = getTileBetweenTwoTilesTwoSpacesApartInLine(game.board, path[followIndex], path[leadIndex])
      }

      if (movedOverTile.piece != null && this.owner != movedOverTile.piece.owner)
      {
        movedOverTile.piece.takeDamage(game, this, 3)
      }

      if (movedOverTile.flatPiece != null && this.owner != movedOverTile.flatPiece.owner)
      {
        movedOverTile.flatPiece.takeDamage(game, this, 3)        
      }

      if (game.reactions.has(path[leadIndex]))
      {
        for (var piece of game.reactions.get(path[leadIndex]))
        {
          if (piece.react(game, this, movedFromTile) == "stop movement")
            return
        }
      }

      this.canReceiveFreeEnergyAtThisLocation = this.canReceiveFreeEnergy(game, path[leadIndex])

      leadIndex ++
      followIndex ++ 
    }``
  }
}

var hopper = new Hopper
units[hopper.name] = hopper

class AttackDrone extends Piece
{
  constructor()
  {
    super("Attack Drone", "+1 energy = +1 strength", "AD", ["Unit"], 3, 2, 0, 1, 1, 1, false, true)
  }

  increaseEnergy(game)
  {
    var oldEnergy = this.energy
    super.increaseEnergy(game)
    if (this.energy > oldEnergy)
      this.strength += 1
  }

  reduceEnergy(game)
  {
    var oldEnergy = this.energy
    super.reduceEnergy(game)
    if (this.energy < oldEnergy)
      this.strength -= 1
  }
}

var attackDrone = new AttackDrone
units[attackDrone.name] = attackDrone

class BuilderDrone extends Piece
{
  constructor()
  {
    super("Builder Drone", "builder", "BD", ["Unit", "Builder"], 2, 1, 0, 5, 1, 0, false, false)
  }
}

var builderDrone = new BuilderDrone
units[builderDrone.name] = builderDrone


//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack
class Drainer extends Piece
{
  constructor()
  {
    super("Drainer", "this units attacks reduce the victims energy by 1", "DR", ["Unit"], 5, 1, 1, 2, 2, 1, false, true)
  }

  attack(game, victim)
  {
    this.isActive = false
    victim.takeDamage(game, this, this.strength)
    if(this.energy > 0)
      victim.reduceEnergy(game)
    if (victim.health > 0 && victim.isActive)
      victim.respondToAttack(game, this)
  }
}

var drainer = new Drainer
units[drainer.name] = drainer

class Techies extends Piece
{
  constructor()
  {
    super("Techies", "when this unit dies with 2 energy, deal 5 damage to every piece within 2 tiles", "TC", ["Unit"], 5, 2, 1, 1, 1, 1, false, true)
  }

  die(game, killer)
  {
    var victimTile = this.getCurrentTile(game)
    if(this.owner == "Red")
      game.redPlayer.activeEnergy -= this.energy
    else
      game.bluePlayer.activeEnergy -= this.energy
    if (this.isFlat)
      victimTile.flatPiece = null
    else
      victimTile.piece = null

    for (var tile of getTilesWithAPieceOrAFlatPiece(getTilesWithinRangeOfTile(game.getAllTilesInListForm(), victimTile, 2)))
      if (tile.piece != null)
        tile.piece.takeDamage(game, null, 5)
      if (tile.flatPiece != null)
        tile.piece.takeDamage(game, null, 5)
  }
}

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack
class MagicPowerTower extends Piece
{
  constructor()
  {
    super("Magic Power Tower", "casting range = 2, energy distribution range = 2", "MPT", ["Building, Caster, Conduit"], 6, 1, 0, 0, 6, 0, false, false)
    this.castingRange = 2
    this.energyDistributionRange = 2
  }

  activate(game)
  {
    this.isActive = true
    updatePiecesWhichCanReceiveFreeEnergy(game)
  }

  deactivate(game)
  {
    this.isActive = false
    updatePiecesWhichCanReceiveFreeEnergy(game)
  }
}

var magicPowerTower = new MagicPowerTower
units[magicPowerTower.name] = magicPowerTower

class PowerHut extends Piece
{
  constructor()
  {
    super("Power Hut", "when this piece is built its energy production is set based on its distance from your back wall. distance of 1-3 rows: 1, 4-5: 2, 6: 3, 7: 4, >7: 5", "PH", ["Building"], 5, 1, 0, 0, 3, 0, false, false)
  }

  performOnBuildEffects(game)
  {
    var pieceTile = this.getCurrentTile(game)            
    if (this.owner == "Red")
      var distanceFromBackWall = pieceTile.row + 1
    else
      var distanceFromBackWall = boardLength - pieceTile.row
      
    if (distanceFromBackWall <= 3)
      this.energyCapacityProduction = 1
    else if(distanceFromBackWall <= 5)
      this.energyCapacityProduction = 2
    else if (distanceFromBackWall == 6 )
      this.energyCapacityProduction = 3
    else if (distanceFromBackWall == 7)
      this.energyCapacityProduction = 4
    else
      this.energyCapacityProduction = 5
  }
}

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movement, health, attackRange, isFlat, canAttack

var powerHut = new PowerHut
buildings[powerHut.name] = powerHut

class GoldHut extends Piece
{
  constructor()
  {
    super("Gold Hut", "when this piece is built its gold production is set based on its distance from your back wall. distance of 1-3 rows: 1, 4-5: 2, 6: 3, 7: 4, >7: 5", "GH", ["Building"], 5, 1, 0, 0, 3, 0, false, false)
  }

  performOnBuildEffects(game)
  { 
    var pieceTile = this.getCurrentTile(game)            
    if (this.owner == "Red")
      var distanceFromBackWall = pieceTile.row + 1
    else
      var distanceFromBackWall = boardLength - pieceTile.row
      
    if (distanceFromBackWall <= 3)
      this.goldProduction = 1
    else if(distanceFromBackWall <= 5)
      this.goldProduction = 2
    else if (distanceFromBackWall == 6 )
      this.goldProduction = 3
    else if (distanceFromBackWall == 7)
      this.goldProduction = 4
    else
      this.goldProduction = 5
  }
}

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movement, health, attackRange, isFlat, canAttack

var goldHut = new GoldHut
buildings[goldHut.name] = goldHut

class CopperSmith extends Piece
{
  constructor()
  {
    super("Copper Smith", "+1 energy = +1 gold production", "CS", ["Building"], 1, 3, 0, 0, 3, 0, false, false)
    this.goldProduction = 0
  }

  increaseEnergy(game)
  {
    var oldEnergy = this.energy
    super.increaseEnergy(game)
    if (this.energy > oldEnergy)
      this.goldProduction += 1
  }

  reduceEnergy(game)
  {
    var oldEnergy = this.energy
    super.reduceEnergy(game)
    if (this.energy < oldEnergy)
      this.goldProduction -= 1
  }
}
//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movement, health, attackRange, isFlat, canAttack

var copperSmith = new CopperSmith
buildings[copperSmith.name] = copperSmith

class SilverSmith extends Piece
{
  constructor()
  {
    super("Silver Smith", "+1 energy = +2 gold production", "SS", ["Building"], 5, 3, 0, 0, 3, 0, false, false)
    this.goldProduction = 0
  }

  increaseEnergy(game)
  {
    var oldEnergy = this.energy
    super.increaseEnergy(game)
    if (this.energy > oldEnergy)
      this.goldProduction += 2
  }

  reduceEnergy(game)
  {
    var oldEnergy = this.energy
    super.reduceEnergy(game)
    if (this.energy < oldEnergy)
      this.goldProduction -= 2
  }
}

var silverSmith = new SilverSmith
buildings[silverSmith.name] = silverSmith

class GoldSmith extends Piece
{
  constructor()
  {
    super("Gold Smith", "+1 energy = +3 gold production", "GS", ["Building"], 10, 1, 0, 0, 3, 0, false, false)
    this.goldProduction = 0
  }

  increaseEnergy(game)
  {
    var oldEnergy = this.energy
    super.increaseEnergy(game)
    if (this.energy > oldEnergy)
      this.goldProduction += 3
  }

  reduceEnergy(game)
  {
    var oldEnergy = this.energy
    super.reduceEnergy(game)
    if (this.energy < oldEnergy)
      this.goldProduction -= 3
  }
}

var goldSmith = new GoldSmith
buildings[goldSmith.name] = goldSmith

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movement, health, attackRange, isFlat, canAttack

class SmallPointsMiner extends Piece
{
  constructor()
  {
    super("Small Points Miner", "produces (energy*VP square value) vp tokens", "SM", ["Building"], 2, 2, 0, 0, 3, 0, false, false)
    this.victoryPointTokenProduction = 0
  }

  increaseEnergy(game)
  {
    var oldEnergy = this.energy
    super.increaseEnergy(game)
    if (this.energy > oldEnergy)
      this.victoryPointTokenProduction += 1
  }

  reduceEnergy(game, pieceTile)
  {
    var oldEnergy = this.energy
    super.reduceEnergy(game)
    if (this.energy < oldEnergy)
      this.victoryPointTokenProduction -= 1
  }
}

var smallPointsMiner = new SmallPointsMiner
buildings[smallPointsMiner.name] = smallPointsMiner

class MediumPointsMiner extends Piece
{
  constructor()
  {
    super("Medium Points Miner", "produces (2*energy*VP square value) vp tokens", "MM", ["Building"], 5, 2, 0, 0, 3, 0, false, false)
    this.victoryPointTokenProduction = 0
  }

  increaseEnergy(game, pieceTile)
  {
    var oldEnergy = this.energy
    super.increaseEnergy(game, pieceTile)
    if (this.energy > oldEnergy)
      this.victoryPointTokenProduction += 2
  }

  reduceEnergy(game, pieceTile)
  {
    var oldEnergy = this.energy
    super.reduceEnergy(game, pieceTile)
    if (this.energy < oldEnergy)
      this.victoryPointTokenProduction -= 2
  }
}

var mediumPointsMiner= new MediumPointsMiner
buildings[mediumPointsMiner.name] = mediumPointsMiner

class LargePointsMiner extends Piece
{
  constructor()
  {
    super("Large Points Miner", "produces (3*energy*VP square value) vp tokens", "LM", ["Building"], 8, 2, 0, 0, 3, 0, false, false)
    this.victoryPointTokenProduction = 0
  }

  increaseEnergy(game)
  {
    var oldEnergy = this.energy
    super.increaseEnergy(game)
    if (this.energy > oldEnergy)
      this.victoryPointTokenProduction += 3
  }

  reduceEnergy(game, pieceTile)
  {
    var oldEnergy = this.energy
    super.reduceEnergy(game)
    if (this.energy < oldEnergy)
      this.victoryPointTokenProduction -= 3
  }
}

var largePointsMiner = new LargePointsMiner
buildings[largePointsMiner.name] = largePointsMiner

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movement, health, attackRange, isFlat, canAttack

class SmallGenerator extends Piece
{
  constructor()
  {
    super("Small Generator", "+1 energy capacity -- requires no energy to activate", "SG", ["Building"], 4, 0, 0, 0, 3, 0, false, false)
    this.energyCapacityProduction = 1
    this.isActive = true
    this.minimumEnergyNeededForActivation = 0
  }
}

var smallGenerator = new SmallGenerator
buildings[smallGenerator.name] = smallGenerator

class MediumGenerator extends Piece
{
  constructor()
  {
    super("Medium Generator", "+2 energy capacity -- requires no energy to activate", "MG", ["Building"], 7, 0, 0, 0, 3, 0, false, false)
    this.energyCapacityProduction = 2
    this.isActive = true
    this.minimumEnergyNeededForActivation = 0
  }
}

var mediumGenerator = new MediumGenerator
buildings[mediumGenerator.name] = mediumGenerator

class LargeGenerator extends Piece
{
  constructor()
  {
    super("Large Generator", "+3 energy capacity -- requires no energy to activate", "LG", ["Building"], 9, 0, 0, 0, 3, 0, false, false)
    this.energyCapacityProduction = 3
    this.isActive = true
    this.minimumEnergyNeededForActivation = 0
  }
}

var largeGenerator = new LargeGenerator
buildings[largeGenerator.name] = largeGenerator

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movement, health, attackRange, isFlat, canAttack
class Blight extends Piece
{
  constructor()
  {
    super("Blight", "-1 victory point", "BL", ["Building", "Blight"], 0, 0, 0, 0, 1, 0, true, false)
    this.minimumEnergyNeededForActivation = 0
    this.victoryPointValue = -1
  }
}

var blight = new Blight
buildings[blight.name] = blight

module.exports.buildings = buildings
module.exports.units = units
module.exports.spells = spells

/////////utilities//////////

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

function getTilesInRangeOfAFriendlyCaster(game, playerColor)
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
  while (currentCol < boardWidth && currentRow < boardLength && currentCol >= 0 && currentRow >= 0 && tilesTraveled <= range)
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
  if (tile.row + 2 < boardLength)
    tilesTwoAwayFromTileInLine.push(board[tile.col][tile.row+2])
  if (tile.col - 2 >= 0)
    tilesTwoAwayFromTileInLine.push(board[tile.col-2][tile.row])
  if (tile.col + 2 < boardWidth)
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

function getTilesWithPiecesWithMovementCapacityHigherThanZero(tiles)
{
  var newTiles = []
  for (tile of tiles)
    if(tile.piece.movementCapacity > 0)
      newTiles.push(tile)
  return newTiles
}

function getTilesWithAPieceOrAFlatPieceOrNonPlatformFlatPiece(tiles)
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
  if (tile.row + 1 < boardLength)
    adjacentTiles.push(board[tile.col][tile.row+1])
  if (tile.col - 1 >= 0)
    adjacentTiles.push(board[tile.col-1][tile.row])
  if (tile.col + 1 < boardWidth)
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
    while ((ax= arr.indexOf(what)) !== -1)
        arr.splice(ax, 1);
  }
  return arr;
}