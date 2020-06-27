var _ = require('lodash');
var utils = require('./pieceUtilities.js');
var constants = require('../utilities/constants.js');

var baseSet = {}
var nonBaseSet = {}
var nonBaseSetSpells = {}
var nonBaseSetUnits = {}
var nonBaseSetBuildings = {}

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
    return utils.getTilesWherePiecesDontHaveFullEnergy(utils.getTilesWithAFriendlyPieceOrAFriendlyFlatPiece(isRedPlayer, utils.getTilesInRangeOfAFriendlyActiveCaster(game, this.owner)))
  }

  cast(game, targetPiece)
  {
    targetPiece.increaseEnergy(game)
  }
}

var surge = new Surge
nonBaseSet[surge.name] = surge.name
nonBaseSetSpells[surge.name] = surge

class InstantActivate extends Spell
{
    constructor()
  {
    super("Instant Activate", "activates a friendly piece if it has enough energy", ["Spell"], 5, "IA", "Piece")
  }

  getTilesWhichCanBeCastOn(game)
  {
    if (this.owner == "Red")
      var isRedPlayer = true
    else
      var isRedPlayer = false
    return utils.getTilesWithAFriendlyPieceOrAFriendlyFlatPiece(isRedPlayer, utils.getTilesInRangeOfAFriendlyActiveCaster(game, this.owner))
  }

  cast(game, targetPiece)
  {
    if (targetPiece.energy >= targetPiece.minimumEnergyNeededForActivation)
      targetPiece.isActive = true
  }
}

var instantActivate = new InstantActivate
nonBaseSet[instantActivate.name] = instantActivate
nonBaseSetSpells[instantActivate.name] = instantActivate

class GlobalSurge extends Spell
{
  constructor()
  {
    super("Global Surge", "+1 energy to a friendly piece anywhere", ["Spell"], 5, "GS", "Piece")
  }

  getTilesWhichCanBeCastOn(game)
  {
    if (this.owner == "Red")
      var isRedPlayer = true
    else
      var isRedPlayer = false
    return utils.getTilesWherePiecesDontHaveFullEnergy(utils.getTilesWithAFriendlyPieceOrAFriendlyFlatPiece(isRedPlayer, game.getAllTilesInListForm()))
  }

  cast(game, targetPiece)
  {
    targetPiece.increaseEnergy(game)
  }
}

var globalSurge = new GlobalSurge
nonBaseSet[globalSurge.name] = globalSurge
nonBaseSetSpells[globalSurge.name] = globalSurge

class Empower extends Spell
{
  constructor()
  {
    super("Empower", "+1 strength to a friendly piece with greater than 0 strength", ["Spell"], 3, "EM", "Piece")
  }

  getTilesWhichCanBeCastOn(game)
  {
    if (this.owner == "Red")
      var isRedPlayer = true
    else
      var isRedPlayer = false
    return utils.getTilesWithMoreThanZeroStrength(utils.getTilesWithAFriendlyPieceOrAFriendlyFlatPiece(isRedPlayer, utils.getTilesInRangeOfAFriendlyActiveCaster(game, this.owner)))
  }

  cast(game, targetPiece)
  {
    targetPiece.strength = targetPiece.strength + 1
  }
}

var empower = new Empower
nonBaseSet[empower.name] = empower
nonBaseSetSpells[empower.name] = empower

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
    return utils.getTilesWithPiecesWithMovementCapacityHigherThanZero(utils.getTilesWithAFriendlyPieceOrAFriendlyFlatPiece(isRedPlayer, utils.getTilesInRangeOfAFriendlyActiveCaster(game, this.owner)))
  }

  cast(game, targetPiece)
  {
    targetPiece.increaseMovement(2)
  }
}

var accelerate = new Accelerate
nonBaseSet[accelerate.name] = accelerate
nonBaseSetSpells[accelerate.name] = accelerate

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
    return utils.getTilesWithPiecesWithMovementCapacityHigherThanZero(utils.getTilesWithAFriendlyPieceOrAFriendlyFlatPiece(isRedPlayer, utils.getTilesInRangeOfAFriendlyActiveCaster(game, this.owner)))
  }

  cast(game, targetPiece)
  {
    targetPiece.movementCapacity += 1
  }
}

var quickFoot = new QuickFoot
nonBaseSet[quickFoot.name] = quickFoot
nonBaseSetSpells[quickFoot.name] = quickFoot

class LittleMissle extends Spell
{
  constructor()
  {
    super("Little Missle", "deal 1 damage to a unit", ["Spell"], 3, "LM", "Piece")
  }

  getTilesWhichCanBeCastOn(game)
  {
    return utils.getTilesWithAPieceOrAFlatPiece(utils.getTilesInRangeOfAFriendlyActiveCaster(game, this.owner))
  }

  cast(game, targetPiece)
  {
    targetPiece.takeDamage(game, null, 1)
  }
}

var littleMissle = new LittleMissle
nonBaseSet[littleMissle.name] = littleMissle
nonBaseSetSpells[littleMissle.name] = littleMissle

class Detonate extends Spell
{
  constructor()
  {
    super("Detonate", "destroy a target friendly unit. All pieces and flat pieces adjacent to it take 5 damage", ["Spell"], 4, "DT", "Piece")
  }

  getTilesWhichCanBeCastOn(game)
  {
    var isRedPlayer = this.owner == "Red" ? true : false 
    return utils.getTilesWithAFriendlyPieceOrAFriendlyFlatPiece(isRedPlayer, utils.getTilesInRangeOfAFriendlyActiveCaster(game, this.owner))
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
nonBaseSet[detonate.name] = detonate
nonBaseSetSpells[detonate.name] = detonate


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
    this.movement = 0
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
    return utils.tileIsInRangeOfFriendlyConduit(game, this.owner, pieceTile)
  }

  getAttackableTiles(game)
  {
    var pieceTile = this.getCurrentTile(game)
    var attackableTiles = utils.getTilesWithAPieceOrAFlatPieceOrNonPlatformFlatPiece(utils.getTilesWithinRangeOfTile(game.getAllTilesInListForm(), pieceTile, this.attackRange))
    attackableTiles = utils.removeValueFromArray(attackableTiles, pieceTile) 
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
        utils.movePieceFromOneTileToAnother(initialTile, path[leadIndex])
        var movedFromTile = initialTile
        this.movement --;
      }
      else
      {
        utils.movePieceFromOneTileToAnother(path[followIndex], path[leadIndex])
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
        utils.movePieceFromOneTileToAnother(initialTile, path[leadIndex])
        var movedFromTile = initialTile
      }

      else
      {
        utils.movePieceFromOneTileToAnother(path[followIndex], path[leadIndex])
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
    return utils.getTilesInMoveRangeAndThePathThere(game.board, this.getCurrentTile(game))
  }

  getTilesWhichCanBeBuiltOn(game)
  {
    var buildableTiles = []
    if (this.owner == 'Red')
      var tilesNextToFriendlyBuilders = utils.getTilesNextToFriendlyActiveBuilders(game, true)
    else
      var tilesNextToFriendlyBuilders = utils.getTilesNextToFriendlyActiveBuilders(game, false)
    if(this.isFlat)
      return utils.getTilesWithoutAFlatPieceAndWithoutAPiece((tilesNextToFriendlyBuilders))
    else
      return utils.getTilesWithoutAPiece((tilesNextToFriendlyBuilders))
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
    if (utils.getDistanceBetweenTwoTiles(attackerTile, victimTile) <= this.attackRange && this.isActive && this.health >= 0)
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

    if ("addReactionsWhenBuilt" in this)
      for (var [reactionTile, reactionsList] of game.reactions) 
        utils.removeValueFromArray(reactionsList, this)

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
class Turret extends Piece
{
  constructor()
  {
    super("Turret", "unit spell: deal 1 damage to a piece within 2 tiles", "TU", ["Building"], 4, 1, 0, 0, 3, 0, false, false)    
  }

  getTilesThatUnitSpellCanBeCastOn(game)
  {
    var pieceTile = this.getCurrentTile(game)
    return utils.getTilesWithAPieceOrAFlatPiece(utils.getTilesWithinRangeOfTile(game.getAllTilesInListForm(), pieceTile, 2))
  }

  castSpell(game, targetPiece)
  {
    targetPiece.takeDamage(game, this, 1)
    this.deactivate(game)
  }
}

var turret = new Turret
nonBaseSet[turret.name] = turret
nonBaseSetBuildings[turret.name] = turret

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)
class RepairShop extends Piece
{
  constructor()
  {
    super("Repair Shop", "at the start of your turn, friendly pieces within 2 tiles of this get +1 health", "RS", ["Building"], 4, 1, 0, 0, 3, 0, false, false)    
  }

  performStartOfTurnEffects(game)
  {
    if (this.isActive)
    {
      var pieceTile = this.getCurrentTile(game)
      var tilesWithPiecesInRange =  utils.getTilesWithAPieceOrAFlatPiece(utils.getTilesWithinRangeOfTile(game.getAllTilesInListForm(), pieceTile, 2))
      for (tile of tilesWithPiecesInRange)
      {
        if (tile.piece != null && tile.piece.owner == this.owner)
          tile.piece.increaseHealth(game)

        if (tile.flatPiece != null && tile.flatPiece.owner == this.owner)
          tile.flatPiece.increaseHealth(game)
      }
    }
  }
}

var repairShop = new RepairShop
nonBaseSet[repairShop.name] = repairShop
nonBaseSetBuildings[repairShop.name] = repairShop

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)
class FieldDrainer extends Piece
{
  constructor()
  {
    super("Field Drainer", "at the start of your turn, enemy pieces within 2 tiles of this lose 1 energy", "FD", ["Building"], 4, 1, 0, 0, 4, 0, false, false)    
  }

  performStartOfTurnEffects(game)
  {
    if (this.isActive)
    {
      var pieceTile = this.getCurrentTile(game)
      var tilesWithPiecesInRange =  utils.getTilesWithAPieceOrAFlatPiece(utils.getTilesWithinRangeOfTile(game.getAllTilesInListForm(), pieceTile, 2))
      for (tile of tilesWithPiecesInRange)
      {
        if (tile.piece != null && tile.piece.owner != this.owner)
          tile.piece.reduceEnergy(game)

        if (tile.flatPiece != null && tile.flatPiece.owner != this.owner)
          tile.flatPiece.reduceEnergy(game)
      }
    }
  }
}

var fieldDrainer = new FieldDrainer
nonBaseSet[fieldDrainer.name] = fieldDrainer
nonBaseSetBuildings[fieldDrainer.name] = fieldDrainer

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
nonBaseSet[movementPad.name] = movementPad
nonBaseSetBuildings[movementPad.name] = movementPad

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
      while (spacesToMove > 0 && piecesCurrentTile.col + direction.colDelta >= 0 && piecesCurrentTile.col + direction.colDelta < constants.boardWidth && piecesCurrentTile.row + direction.rowDelta >= 0 && piecesCurrentTile.row + direction.rowDelta < constants.boardLength)
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
nonBaseSet[boostPad.name] = boostPad
nonBaseSetBuildings[boostPad.name] = boostPad

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
nonBaseSet[energyPad.name] = energyPad
nonBaseSetBuildings[energyPad.name] = energyPad

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)
class Wall extends Piece
{
  constructor()
  {
    super("Wall", "has no energy capacity, cannot be activated", "WA", ["Building"], 2, 0, 0, 0, 1, 0, false, false)    
  }
}

var wall = new Wall
nonBaseSet[wall.name] = wall
nonBaseSetBuildings[wall.name] = wall

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
nonBaseSet[spikeTrap.name] = spikeTrap
nonBaseSetBuildings[spikeTrap.name] = spikeTrap

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
    var attackableTiles = utils.getTilesWithAPieceOrAFlatPiece(utils.getAttackableTilesThatDontGoThroughAnotherUnit(game.board, pieceTile))
    attackableTiles = utils.removeValueFromArray(attackableTiles, pieceTile) 
    return attackableTiles
  }
}

var archer = new Archer
nonBaseSet[archer.name] = archer
nonBaseSetUnits[archer.name] = archer

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
    var attackableTiles = utils.getTilesWithFirstPieceWithinEachCardinalDirectionFromCenterTileWithinRange(game.board, pieceTile, this.attackRange)
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
nonBaseSet[phaserBoy.name] = phaserBoy
nonBaseSetUnits[phaserBoy.name] = phaserBoy

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
nonBaseSet[scrapper.name] = scrapper
nonBaseSetUnits[scrapper.name] = scrapper


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
    var attackableTiles = utils.getTilesWithFirstPieceWithinEachCardinalDirectionFromCenterTileWithinRange(game.board, pieceTile, this.attackRange)
    return attackableTiles
  }
}

var sniper = new Sniper
nonBaseSet[sniper.name] = sniper
nonBaseSetUnits[sniper.name] = sniper

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
nonBaseSet[swordsMan.name] = swordsMan
nonBaseSetUnits[swordsMan.name] = swordsMan

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
nonBaseSet[mammaJamma.name] = mammaJamma
nonBaseSetUnits[mammaJamma.name] = mammaJamma


//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)
class PowerPriest extends Piece
{
  constructor()
  {
    super("Power Priest", "unit spell: a friendly unit in an adjacent tile gets +2 health", "PP", ["Unit", "Conduit"], 5, 1, 0, 2, 1, 0, false, false)
    this.energyDistributionRange = 1
    this.hasUnitSpells = true
    this.spellTarget = "Piece"
  }

  getTilesThatUnitSpellCanBeCastOn(game)
  {
    var pieceTile = this.getCurrentTile(game)
    var isRedPlayer = this.owner == "Red" ? true : false 
    return utils.getTilesWithAFriendlyPieceOrAFriendlyFlatPiece(isRedPlayer, getAdjacentTiles(game.board, pieceTile))
  }

  activate(game)
  {
    this.isActive = true
    utils.updatePiecesWhichCanReceiveFreeEnergy(game)
  }

  deactivate(game)
  {
    this.isActive = false
    utils.updatePiecesWhichCanReceiveFreeEnergy(game)
  }

  castSpell(game, targetPiece)
  {
    targetPiece.increaseHealth(2)
    this.deactivate(game)
  }
}

var powerPriest = new PowerPriest
nonBaseSet[powerPriest.name] = powerPriest
nonBaseSetUnits[powerPriest.name] = powerPriest

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)
class ElectricWizard extends Piece
{
  constructor()
  {
    super("Electric Wizard", "unit spell: deal 1 damage to a target within 2 tiles", "EW", ["Unit", "Caster"], 4, 1, 0, 2, 1, 0, false, false)
    this.castingRange = 2
    this.hasUnitSpells = true
    this.spellTarget = "Piece"
  }

  getTilesThatUnitSpellCanBeCastOn(game)
  {
    var pieceTile = this.getCurrentTile(game)
    return utils.getTilesWithAPieceOrAFlatPiece(utils.getTilesWithinRangeOfTile(game.getAllTilesInListForm(), pieceTile, 2))
  }

  castSpell(game, targetPiece)
  {
    targetPiece.takeDamage(game, this, 2)
    this.deactivate(game)
  }
}

var electricWizard = new ElectricWizard
baseSet[electricWizard.name] = electricWizard

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
    return utils.getTilesWithUnits(utils.getTilesWithFirstPieceWithinEachCardinalDirectionFromCenterTileWithinRange(game.board, pieceTile, 2))
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
      if (targetsCurrentTile.col + direction.colDelta < 0 || targetsCurrentTile.col + direction.colDelta > constants.boardWidth || targetsCurrentTile.row + direction.rowDelta < 0 || targetsCurrentTile.row + direction.rowDelta > constants.boardLength)
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
nonBaseSet[blaster.name] = blaster
nonBaseSetUnits[blaster.name] = blaster

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
    return utils.getTilesWithoutAFlatPieceAndWithoutAPiece(utils.getTilesWithinRangeOfTile(game.getAllTilesInListForm(), pieceTile, 2))
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
nonBaseSet[witch.name] = witch
nonBaseSetUnits[witch.name] = witch


class Headquarters extends Piece
{
  constructor()
  {
    super("Headquarters", "This piece doesn't need to be on a resource tile to produce gold and energy", "HQ", ["Building", "Conduit", "Caster"], 7, 0, 0, 0, 10, 0, false, false)
    this.minimumEnergyNeededForActivation = 0
    this.energyCapacityProduction = 6
    this.goldProduction = 5
    this.energyDistributionRange = 4
    this.castingRange = 4
  }
}

var headquarters = new Headquarters
baseSet[headquarters.name] = headquarters

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)

class EnergyTower extends Piece
{
  constructor()
  {
    super("Energy Tower", "", "ET", ["Building", "Conduit"], 5, 1, 0, 0, 4, 0, false, false)
    this.energyDistributionRange = 3
    this.minimumEnergyNeededForActivation = 0
  }

  activate(game)
  {
    this.isActive = true
    utils.updatePiecesWhichCanReceiveFreeEnergy(game)
  }

  deactivate(game)
  {
    this.isActive = false
    utils.updatePiecesWhichCanReceiveFreeEnergy(game)
  }
}

var energyTower = new EnergyTower
baseSet[energyTower.name] = energyTower

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)

class PulseStick extends Piece
{
  constructor()
  {
    super("Pulse Stick", "at the start of your turn, all pieces within 2 tiles of this get +1 energy", "PS", ["Building"], 3, 1, 0, 0, 4, 0, false, false)
  }

  performStartOfTurnEffects(game)
  {
    if (this.isActive)
    {
      var pieceTile = this.getCurrentTile(game)
      for (var tile of game.getAllTilesInListForm())
      {
        if (utils.getDistanceBetweenTwoTiles(pieceTile, tile) <= 2)
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
nonBaseSet[pulseStick.name] = pulseStick
nonBaseSetBuildings[pulseStick.name] = pulseStick

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
    return utils.getTilesInHopRangeAndThePathThere(game.board, pieceTile)
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
        utils.movePieceFromOneTileToAnother(initialTile, path[leadIndex])
        this.movement = this.movement - 2;
        var movedFromTile = initialTile 
        movedOverTile = getTileBetweenTwoTilesTwoSpacesApartInLine(game.board, initialTile, path[leadIndex])
      }
      else
      {
        utils.movePieceFromOneTileToAnother(path[followIndex], path[leadIndex])
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
    }
  }
}

var hopper = new Hopper
nonBaseSet[hopper.name] = hopper
nonBaseSetUnits[hopper.name] = hopper

class AttackDrone extends Piece
{
  constructor()
  {
    super("Attack Drone", "+1 energy = +1 strength", "AD", ["Unit"], 3, 2, 0, 2, 1, 1, false, true)
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
nonBaseSet[attackDrone.name] = attackDrone
nonBaseSetUnits[attackDrone.name] = attackDrone

class BuilderDrone extends Piece
{
  constructor()
  {
    super("Builder Drone", "builder", "BD", ["Unit", "Builder"], 2, 1, 0, 2, 1, 0, false, false)
  }
}

var builderDrone = new BuilderDrone
baseSet[builderDrone.name] = builderDrone

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack
class Drainer extends Piece
{
  constructor()
  {
    super("Drainer", "this units attacks reduce the victims energy by 1", "DR", ["Unit"], 5, 1, 1, 3, 2, 1, false, true)
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
nonBaseSet[drainer.name] = drainer
nonBaseSetUnits[drainer.name] = drainer

class Techies extends Piece
{
  constructor()
  {
    super("Techies", "when this unit dies with 2 energy, deal 5 damage to every piece within 2 tiles", "TC", ["Unit"], 5, 2, 1, 2, 1, 1, false, true)
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

    for (var tile of utils.getTilesWithAPieceOrAFlatPiece(utils.getTilesWithinRangeOfTile(game.getAllTilesInListForm(), victimTile, 2)))
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
    super("Magic Power Tower", "", "MT", ["Building", "Caster", "Conduit"], 6, 1, 0, 0, 6, 0, false, false)
    this.castingRange = 3
    this.energyDistributionRange = 3
    this.minimumEnergyNeededForActivation = 1
  }

  activate(game)
  {
    this.isActive = true
    utils.updatePiecesWhichCanReceiveFreeEnergy(game)
  }

  deactivate(game)
  {
    this.isActive = false
    utils.updatePiecesWhichCanReceiveFreeEnergy(game)
  }
}

var magicPowerTower = new MagicPowerTower
nonBaseSet[magicPowerTower.name] = magicPowerTower
nonBaseSetBuildings[magicPowerTower.name] = magicPowerTower

class PowerHut extends Piece
{
  constructor()
  {
    super("Power Hut", "when this piece is built its energy production is set based on its distance from your back wall. distance of 1-3 rows: 1, 4-5: 2, 6: 3, 7: 4, >7: 5", "PH", ["Building"], 5, 1, 0, 0, 3, 0, false, false)
    this.minimumEnergyNeededForActivation = 0
  }

  performOnBuildEffects(game)
  {
    var pieceTile = this.getCurrentTile(game)            
    if (this.owner == "Red")
      var distanceFromBackWall = pieceTile.row + 1
    else
      var distanceFromBackWall = constants.boardLength - pieceTile.row
      
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
nonBaseSet[powerHut.name] = powerHut
nonBaseSetBuildings[powerHut.name] = powerHut

class GoldHut extends Piece
{
  constructor()
  {
    super("Gold Hut", "when this piece is built its gold production is set based on its distance from your back wall. distance of 1-3 rows: 1, 4-5: 2, 6: 3, 7: 4, >7: 5", "GH", ["Building"], 5, 1, 0, 0, 3, 0, false, false)
    this.minimumEnergyNeededForActivation = 0
  }

  performOnBuildEffects(game)
  { 
    var pieceTile = this.getCurrentTile(game)            
    if (this.owner == "Red")
      var distanceFromBackWall = pieceTile.row + 1
    else
      var distanceFromBackWall = constants.boardLength - pieceTile.row
      
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
nonBaseSet[goldHut.name] = goldHut
nonBaseSetBuildings[goldHut.name] = goldHut

class CopperSmith extends Piece
{
  constructor()
  {
    super("Copper Smith", "+1 energy = +1 gold production", "CS", ["Building"], 1, 3, 0, 0, 3, 0, false, false)
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
baseSet[copperSmith.name] = copperSmith

class SilverSmith extends Piece
{
  constructor()
  {
    super("Silver Smith", "+1 energy = +2 gold production", "SS", ["Building"], 5, 3, 0, 0, 3, 0, false, false)
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
baseSet[silverSmith.name] = silverSmith

class GoldSmith extends Piece
{
  constructor()
  {
    super("Gold Smith", "+1 energy = +3 gold production", "GS", ["Building"], 10, 3, 0, 0, 3, 0, false, false)
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
baseSet[goldSmith.name] = goldSmith

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
baseSet[smallPointsMiner.name] = smallPointsMiner

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
baseSet[mediumPointsMiner.name] = mediumPointsMiner

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
baseSet[largePointsMiner.name] = largePointsMiner

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movement, health, attackRange, isFlat, canAttack

class SmallGenerator extends Piece
{
  constructor()
  {
    super("Small Generator", "+1 energy capacity", "SG", ["Building"], 4, 0, 0, 0, 3, 0, false, false)
    this.energyCapacityProduction = 1
    this.minimumEnergyNeededForActivation = 0
  }
}

var smallGenerator = new SmallGenerator
baseSet[smallGenerator.name] = smallGenerator

class MediumGenerator extends Piece
{
  constructor()
  {
    super("Medium Generator", "+2 energy capacity", "MG", ["Building"], 7, 0, 0, 0, 3, 0, false, false)
    this.energyCapacityProduction = 2
    this.minimumEnergyNeededForActivation = 0
  }
}

var mediumGenerator = new MediumGenerator
baseSet[mediumGenerator.name] = mediumGenerator

class LargeGenerator extends Piece
{
  constructor()
  {
    super("Large Generator", "+3 energy capacity", "LG", ["Building"], 9, 0, 0, 0, 3, 0, false, false)
    this.energyCapacityProduction = 3
    this.minimumEnergyNeededForActivation = 0
  }
}

var largeGenerator = new LargeGenerator
baseSet[largeGenerator.name] = largeGenerator

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
baseSet[blight.name] = blight

module.exports.baseSet = baseSet
module.exports.nonBaseSet = nonBaseSet
module.exports.nonBaseSetUnits = nonBaseSetUnits
module.exports.nonBaseSetBuildings = nonBaseSetBuildings
module.exports.nonBaseSetSpells = nonBaseSetSpells
