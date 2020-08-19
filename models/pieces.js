var _ = require('lodash');
var utils = require('./pieceUtilities.js');
var constants = require('../utilities/constants.js');

var baseSet = {}
var nonBaseSet = {}
var nonBaseSetUnits = {}
var nonBaseSetBuildings = {}


class Piece
{
  constructor(name, description, boardAvatar, types, cost, strength, movementCapacity, healthCapacity, attackRange, isFlat, canAttack)
  {
    this.name = name;
    this.description = description
    this.boardAvatar = boardAvatar;
    this.types = types;
    this.cost = cost;
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
  }

  activate(game)
  {
    if (this.isActive)
    {
      this.movement = this.movementCapacity
      return
    }

    var pieceTile = this.getCurrentTile(game)
    if(game.activationReactions.has(pieceTile))
      for (var piece of game.activationReactions.get(pieceTile))
        piece.react(game, this)

    if(this.health > 0)
    {
      this.movement = this.movementCapacity
      this.isActive = true
    }
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

  receiveEnergy(game, amountOfEnergy)
  {
    if (this.storedEnergy == undefined)
      this.activate(game)
    else
      this.storedEnergy += amountOfEnergy
  }

  getAttackableTiles(game)
  {
    var pieceTile = this.getCurrentTile(game)
    var attackableTiles = utils.getTilesWithAPieceOrAFlatPiece(utils.getTilesWithinRangeOfTile(game.boardAsList, pieceTile, this.attackRange))
    utils.removeValueFromList(attackableTiles, pieceTile) 
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

      if (game.movementReactions.has(path[leadIndex]))
      {
        for (var piece of game.movementReactions.get(path[leadIndex]))
        {
          if (piece.react(game, this, movedFromTile) == "stop movement")
            piece.movement = 0
        }
      }

      this.canReceiveFreeEnergyAtThisLocation = this.canReceiveFreeEnergy(game)
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

      if (game.movementReactions.has(path[leadIndex]))
      {
        for (var piece of game.movementReactions.get(path[leadIndex]))
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
    if (victim.health > 0 && victim.isActive)
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
    var pieceTile = this.getCurrentTile(game)

    if (game.deathReactions.has(pieceTile))
      for (var piece of game.deathReactions.get(pieceTile))
        piece.react(game, this)

    if ("addReactionsWhenBuilt" in this)
      for (var [reactionTile, reactionsList] of game.movementReactions) 
        utils.removeValueFromList(reactionsList, this)
      for (var [reactionTile, reactionsList] of game.activationReactions) 
        utils.removeValueFromList(reactionsList, this)
      for (var [reactionTile, reactionsList] of game.deathReactions)
        utils.removeValueFromList(reactionsList, this)      

    if (this.isFlat)
      pieceTile.flatPiece = null
    else
      pieceTile.piece = null
  }
}

//name, description, boardAvatar, types, cost, strength, movementCapacity, health, attackRange, isFlat, canAttack)
class Turret extends Piece
{
  constructor()
  {
    super("Turret", "Building which shoots", "TU", ["Building"], 4, 0, 0, 3, 0, false, false)
    this.unitSpellDescription = "Once per turn, deal 1 damage to a Piece within casting range. This remains active afterwards."
    this.castingRange = 2
    this.hasUnitSpells = true
    this.spellTarget = "Piece"
    this.hasCastThisTurn = false
  }

  performStartOfTurnEffects(game)
  {
    this.hasCastThisTurn = false
  }

  getTilesThatUnitSpellCanBeCastOn(game)
  {
    var pieceTile = this.getCurrentTile(game)
    return utils.getTilesWithAPieceOrAFlatPiece(utils.getTilesWithinRangeOfTile(game.boardAsList, pieceTile, this.castingRange))
  }

  castSpell(game, targetPiece)
  {
    if(!this.hasCastThisTurn)
    {
      targetPiece.takeDamage(game, this, 1)
      this.hasCastThisTurn = true
    }
  }
}

var turret = new Turret
nonBaseSet[turret.name] = turret
nonBaseSetBuildings[turret.name] = turret

//name, description, boardAvatar, types, cost, strength, movementCapacity, health, attackRange, isFlat, canAttack)

class SpeedDome extends Piece
{
  constructor()
  {
    super("Speed Dome", "When this is activated, restore the movement of all friendly units within 4 tiles. Deactivate this.", "SD", ["Building"], 3, 0, 0, 3, 0, false, false)
  }

  activate(game)
  {
    super.activate(game)
    if(this.isActive)
    {
      var isRedPlayer = this.owner == "Red" ? true : false
      var pieceTile = this.getCurrentTile(game)
      tilesWithPieces = utils.getTilesWithAFriendlyPieceOrAFriendlyFlatPiece(isRedPlayer, utils.getTilesWithAPieceOrAFlatPiece(utils.getTilesWithinRangeOfTile(game.boardAsList, pieceTile, 4)))
      for (var tile of tilesWithPieces)
        tile.piece.movement = tile.piece.movementCapacity
    }
    this.deactivate(game)
  }
}

var speedDome = new SpeedDome
nonBaseSet[speedDome.name] = speedDome
nonBaseSetBuildings[speedDome.name] = speedDome

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)
class RepairShop extends Piece
{
  constructor()
  {
    super("Repair Shop", "At the start of your turn, friendly pieces within 2 tiles of this are healed for 1 HP.", "RS", ["Building"], 4, 0, 0, 3, 0, false, false)    
  }

  performStartOfTurnEffects(game)
  {
    if (this.isActive)
    {
      var pieceTile = this.getCurrentTile(game)
      var tilesWithPiecesInRange =  utils.getTilesWithAPieceOrAFlatPiece(utils.getTilesWithinRangeOfTile(game.boardAsList, pieceTile, 2))
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

//name, description, owner, boardAvatar, types, cost, strength, movementCapacity, health, attackRange, isFlat, canAttack)
class FieldShocker extends Piece
{
  constructor()
  {
    super("Field Shocker", "When an enemy piece is activated within 3 tiles of this, it takes 1 damage.", "FS", ["Building"], 5, 0, 0, 2, 0, false, false)    
  }

  react(game, pieceThatTriggeredReaction)
  {
    if(this.isActive)
    {
      if(pieceThatTriggeredReaction.health > 0)
        pieceThatTriggeredReaction.takeDamage(game, 1, this)
    }
  }

  addReactionsWhenBuilt(game)
  {
    var pieceTile = this.getCurrentTile(game)
    var tilesToReactTo = utils.getTilesWithinRangeOfTile(game.boardAsList, pieceTile, 3)

    for (var tile of tilesToReactTo)
    {
      if (game.activationReactions.has(tile))
        game.activationReactions.get(tile).push(this)
      else
        game.activationReactions.set(tile, [this])  
    }
  }
}

var fieldShocker = new FieldShocker
nonBaseSet[fieldShocker.name] = fieldShocker
nonBaseSetBuildings[fieldShocker.name] = fieldShocker

class SoulHarvester extends Piece
{
  constructor()
  {
    super("Soul Harvester", "When a piece dies within 3 tiles of this, gain 1 gold + the tile's resource bonus.", "SH", ["Building"], 4, 0, 0, 3, 0, false, false)
  }

  react(game, pieceThatTriggeredReaction)
  {
    if(this.isActive && this.health > 0)
    {
      var pieceTile = this.getCurrentTile(game)
        if (pieceTile.resource == "Gold: 1")
          var bonus = 1
        else if (pieceTile.resource == ("Gold: 2"))
          var bonus = 2
        else if (pieceTile.resource == ("Gold: 3"))
          var bonus = 3
        else
          var bonus = 0
    }

    if(this.owner == "Red")
      game.redPlayer.gold += 1 + bonus
    else
      game.bluePlayer.gold += 1 + bonus
  }

  addReactionsWhenBuilt(game)
  {
    var pieceTile = this.getCurrentTile(game)
    var tilesToReactTo = utils.getTilesWithinRangeOfTile(game.boardAsList, pieceTile, 3)

    for (var tile of tilesToReactTo)
    {
      if (game.deathReactions.has(tile))
        game.deathReactions.get(tile).push(this)
      else
        game.deathReactions.set(tile, [this])  
    } 
  }
}

var soulHarvester = new SoulHarvester
nonBaseSet[soulHarvester.name] = soulHarvester
nonBaseSetBuildings[soulHarvester.name] = soulHarvester

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)
class MovementPad extends Piece
{
  constructor()
  {
    super("Movement Pad", "When a friendly piece moves on to this, it gets +1 movement.", "MP", ["Building"], 2, 0, 0, 1, 0, true, false)    
  }

  react(game, pieceThatTriggeredReaction, tilePieceMovedFrom)
  {
    if (this.owner == pieceThatTriggeredReaction.owner && this.isActive)
      pieceThatTriggeredReaction.increaseMovement(1)
  }

  addReactionsWhenBuilt(game)
  {
    var pieceTile = this.getCurrentTile(game)
    if (game.movementReactions.has(pieceTile)) 
      game.movementReactions.get(pieceTile).push(this)
    else
      game.movementReactions.set(pieceTile, [this])
  }
}

var movementPad = new MovementPad
nonBaseSet[movementPad.name] = movementPad
nonBaseSetBuildings[movementPad.name] = movementPad

class BoostPad extends Piece
{
  constructor()
  {
    super("Boost Pad", "When a friendly piece moves on to this it travels (moves without costing movement) 3 more spaces in the same direction. If that path is obstructed, it moves as far as it can. All previous plans for movement this piece had are lost.", "BP", ["Building"], 3, 0, 0, 1, 0, true, false)    
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
    if (game.movementReactions.has(pieceTile)) 
      game.movementReactions.get(pieceTile).push(this)
    else
      game.movementReactions.set(pieceTile, [this])
  }
}

var boostPad = new BoostPad
nonBaseSet[boostPad.name] = boostPad
nonBaseSetBuildings[boostPad.name] = boostPad

class EnergyPad extends Piece
{
  constructor()
  {
    super("Energy Pad", "If there's a friendly Unit on this at the start of your turn, it receives 1 energy", "EP", ["Building"], 3, 0, 0, 1, 0, true, false)    
  }

  performStartOfTurnEffects(game)
  {
    if (this.isActive)
    {
      var pieceTile = this.getCurrentTile(game)
      if (pieceTile.piece != null && pieceTile.piece.owner == this.owner && pieceTile.piece.types.includes("Unit"))
        pieceTile.piece.receiveEnergy(game, 1)
    }
  }
}

var energyPad = new EnergyPad
nonBaseSet[energyPad.name] = energyPad
nonBaseSetBuildings[energyPad.name] = energyPad

//name, description, owner, boardAvatar, types, cost, strength, movementCapacity, health, attackRange, isFlat, canAttack)
class Wall extends Piece
{

  activate()
  {
    return
  }

  constructor()
  {
    super("Wall", "cannot be activated", "WA", ["Building"], 2, 0, 0, 1, 0, false, false)    
  }
}

var wall = new Wall
nonBaseSet[wall.name] = wall
nonBaseSetBuildings[wall.name] = wall

class SpikeTrap extends Piece
{
  constructor()
  {
    super("Spike Trap", "When an enemy piece moves on to a tile adjacent to this, it takes 2 damage", "ST", ["Building"], 3, 0, 0, 2, 0, false, false)    
  }

  react(game, pieceThatTriggeredReaction, tilePieceMovedFrom)
  {
    if (this.owner != pieceThatTriggeredReaction.owner && this.isActive)
      pieceThatTriggeredReaction.takeDamage(game, this, 2)
  }

  addReactionsWhenBuilt(game)
  {
    var pieceTile = this.getCurrentTile(game)
    var tilesToReactTo = utils.getAdjacentTiles(game.board, pieceTile)

    for (var tile of tilesToReactTo)
    {
      if (game.movementReactions.has(tile)) 
        game.movementReactions.get(tile).push(this)
      else
        game.movementReactions.set(tile, [this])
    }
  }
}

var spikeTrap = new SpikeTrap
nonBaseSet[spikeTrap.name] = spikeTrap
nonBaseSetBuildings[spikeTrap.name] = spikeTrap

class JuiceShaman extends Piece
{
  constructor()
  {
    super("Juice Shaman", "Juices up your units", "JS", ["Unit"], 4, 0, 1, 1, 0, false, false)
    this.castingRange = 1
    this.hasUnitSpells = true
    this.unitSpellDescription = "Target must be a piece whose strength is greater than 0. Increase its strength by 1."
    this.spellTarget = "Piece"

  }

  getTilesThatUnitSpellCanBeCastOn(game)
  {
    var pieceTile = this.getCurrentTile(game)
    return utils.getTilesWithMoreThanZeroStrength(utils.getTilesWithAPieceOrAFlatPiece(utils.getTilesWithinRangeOfTile(game.boardAsList, pieceTile, this.castingRange)))
  }

  castSpell(game, targetPiece)
  {
    targetPiece.strength += 1
    this.deactivate(game)
  }
}

var juiceShaman = new JuiceShaman
nonBaseSet[juiceShaman.name] = juiceShaman
nonBaseSetUnits[juiceShaman.name] = juiceShaman

class DrainerWizard extends Piece
{
  constructor()
  {
    super("Drainer Wizard", "", "DW", ["Unit"], 4, 1, 1, 1, 1, false, true)
    this.castingRange = 2
    this.unitSpellDescription = "Can only be cast on active Pieces. Deactivate the piece. If it stores energy, reduce it by 1. +1 energy"
    this.hasUnitSpells = true
    this.spellTarget = "Piece"
  }

  getTilesThatUnitSpellCanBeCastOn(game)
  {
    var pieceTile = this.getCurrentTile(game)
    return utils.getTilesWithAnActivePiece((utils.getTilesWithAPieceOrAFlatPiece(utils.getTilesWithinRangeOfTile(game.boardAsList, pieceTile, this.castingRange))))
  }

  castSpell(game, targetPiece)
  {
    if (targetPiece.isActive)
    {
      targetPiece.deactivate(game)
      if(targetPiece.storedEnergy != undefined && victim.storedEnergy > 0)
        targetPiece.storedEnergy -= 1

      if(this.owner == "Red")
        game.redPlayer.energy += energyToProduce
      else
        game.bluePlayer.energy += energyToProduce

      this.deactivate(game)
    }
  }
}

var drainerWizard = new DrainerWizard
nonBaseSet[drainerWizard.name] = drainerWizard
nonBaseSetUnits[drainerWizard.name] = drainerWizard

class ElectricElephant extends Piece
{
  constructor()
  {
    super("Electric Elephant", "", "EE", ["Unit"], 6, 4, 1, 6, 1, false, true)
    this.unitSpellDescription = "Deactivate all Pieces adjacent to this"
    this.hasUnitSpells = true
    this.spellTarget = "None"
  }

  getTilesThatUnitSpellCanBeCastOn(game)
  {
    var pieceTile = this.getCurrentTile(game)
    return (utils.getTilesWithAPieceOrAFlatPiece(utils.getTilesWithinRangeOfTile(game.boardAsList, pieceTile, this.castingRange)))
  }

  castSpell(game, targetPiece)
  {
    targetPiece.deactivate()

    if (victim.health > 0 && victim.isActive)
      victim.respondToAttack(game, this)
      victim.isActive = false
      if(victim.storedEnergy != undefined && victim.storedEnergy > 0)
        victim.storedEnergy -= 1    

    if(this.owner == "Red")
      game.redPlayer.energy += energyToProduce
    else
      game.bluePlayer.energy += energyToProduce

    this.deactivate(game)
  }
}

class Archer extends Piece
{
  constructor()
  {
    super("Archer", "Can't attack through non-flat pieces.", "AR", ["Unit"], 4, 2, 1, 1, 2, false, true)
  }

  getAttackableTiles(game)
  {
    var pieceTile = this.getCurrentTile(game)
    var attackableTiles = utils.getTilesWithAPieceOrAFlatPiece(utils.getAttackableTilesThatDontGoThroughAnotherUnit(game.board, pieceTile))
    utils.removeValueFromList(attackableTiles, pieceTile) 
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
    super("Phaser Boy", "Can't attack through non-flat pieces, attacks in a straight line", "PB", ["Unit"], 5, 4, 1, 1, 3, false, true)
  }

  getAttackableTiles(game)
  {
    var pieceTile = this.getCurrentTile(game)
    var attackableTiles = utils.getTilesWithFirstPieceWithinEachCardinalDirectionFromCenterTileWithinRange(game.board, pieceTile, this.attackRange)
    return attackableTiles
  }
}

var phaserBoy = new PhaserBoy
nonBaseSet[phaserBoy.name] = phaserBoy
nonBaseSetUnits[phaserBoy.name] = phaserBoy

class Scrapper extends Piece
{
  constructor()
  {
    super("Scrapper", "When this piece damages a unit, gain 1 gold. When it kills one, gain 3 gold", "SC", ["Unit"], 5, 3, 1, 1, 1, false, true)
  }

  attack(game, victim)
  {
    var player = this.owner == "Red" ? game.redPlayer : game.bluePlayer 
    this.isActive = false
    var victimOldHealth = victim.health
    victim.takeDamage(game, this, this.strength)
    if (victim.health < victimOldHealth)
      player.gold += 1 
    if (victim == null || victim.health <= 0)
      player.gold += 2
    if (victim.health > 0)
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
    super("Sniper", "Can't attack through non-flat pieces, attacks in a straight line", "SN", ["Unit"], 5, 1, 1, 1, 4, false, true)
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
    super("Swordsman", "", "SW", ["Unit"], 5, 2, 2, 2, 1, false, true)
  }
}

var swordsMan = new Swordsman
nonBaseSet[swordsMan.name] = swordsMan
nonBaseSetUnits[swordsMan.name] = swordsMan

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)

//add armor?
class MammaJamma extends Piece
{
  constructor()
  {
    super("MammaJamma", "Mamma jamma", "MJ", ["Unit"], 7, 6, 1, 10, 1, false, true)
  }
}

var mammaJamma = new MammaJamma
nonBaseSet[mammaJamma.name] = mammaJamma
nonBaseSetUnits[mammaJamma.name] = mammaJamma

class Hopper extends Piece
{
  constructor()
  {
    super("Hopper", "this unit moves 2 squares at a time in a line and hops over the first square. if it hops over an enemy piece, that piece takes 4 damage", "HP", ["Unit"], 5, 0, 2, 2, 0, false, false)
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
        movedOverTile = utils.getTileBetweenTwoTilesTwoSpacesApartInLine(game.board, initialTile, path[leadIndex])
      }
      else
      {
        utils.movePieceFromOneTileToAnother(path[followIndex], path[leadIndex])
        this.movement = this.movement - 2;
        var movedFromTile = path[followIndex]
        movedOverTile = utils.getTileBetweenTwoTilesTwoSpacesApartInLine(game.board, path[followIndex], path[leadIndex])
      }

      if (movedOverTile.piece != null && this.owner != movedOverTile.piece.owner)
      {
        movedOverTile.piece.takeDamage(game, this, 4)
      }

      if (movedOverTile.flatPiece != null && this.owner != movedOverTile.flatPiece.owner)
      {
        movedOverTile.flatPiece.takeDamage(game, this, 4)        
      }

      if (game.movementReactions.has(path[leadIndex]))
      {
        for (var piece of game.movementReactions.get(path[leadIndex]))
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
    super("Attack Drone", "", "AD", ["Unit"], 3, 1, 2, 1, 1, false, true)
  }
}

var attackDrone = new AttackDrone
nonBaseSet[attackDrone.name] = attackDrone
nonBaseSetUnits[attackDrone.name] = attackDrone

class BuilderDrone extends Piece
{
  constructor()
  {
    super("Builder Drone", "Builds Stuff", "BD", ["Unit", "Builder"], 4, 0, 2, 1, 0, false, false)
  }

  //tiles this builder can build on in game
  buildableTiles(game, pieceToBuild)
  {
    if(pieceToBuild.isFlat)
      return utils.getTilesWithoutAFlatPiece(utils.getAdjacentTiles(game.board, this.getCurrentTile(game)))
    else
      return utils.getTilesWithoutAPiece(utils.getAdjacentTiles(game.board, this.getCurrentTile(game)))
  }
}

var builderDrone = new BuilderDrone
baseSet[builderDrone.name] = builderDrone

//name, description, owner, boardAvatar, types, cost, strength, movementCapacity, health, attackRange, isFlat, canAttack
class Drainer extends Piece
{
  constructor()
  {
    super("Drainer", "After this attacks, deactivate its victim. If the piece stores energy, reduce it by 1", "DR", ["Unit"], 5, 1, 3, 1, 1, false, true)
  }

  attack(game, victim)
  {
    this.deactivate(game)
    victim.takeDamage(game, this, this.strength)
    if (victim.health > 0 && victim.isActive)
      victim.respondToAttack(game, this)
    victim.deactivate(game)
    if(victim.storedEnergy != undefined && victim.storedEnergy > 0)
      victim.storedEnergy -= 1
  }
}

var drainer = new Drainer
nonBaseSet[drainer.name] = drainer
nonBaseSetUnits[drainer.name] = drainer

class Techies extends Piece
{
  constructor()
  {
    super("Techies", "when this unit dies, deal 5 damage to every adjacent piece", "TC", ["Unit"], 5, 1, 2, 1, 1, false, true)
  }

  die(game, killer)
  {
    super.die(game, killer)
    var pieceTile = this.getCurrentTile(game)

    for (var tile of utils.getTilesWithAPieceOrAFlatPiece(utils.getTilesWithinRangeOfTile(game.boardAsList, pieceTile, 1)))
      if (tile.piece != null)
        tile.piece.takeDamage(game, null, 5)
      if (tile.flatPiece != null)
        tile.piece.takeDamage(game, null, 5)
  }
}

var techies = new Techies
nonBaseSet[techies.name] = techies
nonBaseSetUnits[techies.name] = techies

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)
class PowerPriest extends Piece
{
  constructor()
  {
    super("Power Priest", "", "PP", ["Unit", "Conduit"], 5, 0, 2, 1, 0, false, false)
    this.unitSpellDescription = "Heal a Piece for 2 HP"
    this.castingRange = 2
    this.energyDistributionRange = 2
    this.hasUnitSpells = true
    this.spellTarget = "Piece"
  }

  getTilesThatUnitSpellCanBeCastOn(game)
  {
    var pieceTile = this.getCurrentTile(game)
    var isRedPlayer = this.owner == "Red" ? true : false 
    return utils.getTilesWithAFriendlyPieceOrAFriendlyFlatPiece(isRedPlayer, utils.getAdjacentTiles(game.board, pieceTile))
  }

  activate(game)
  {
    super.activate(game)
    if(this.isActive)
    {
      utils.updatePiecesWhichCanReceiveFreeEnergy(game)
    }
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
class Blaster extends Piece
{
  constructor()
  {
    super("Blaster", "", "BT", ["Unit"], 4, 0, 1, 1, 0, false, false)
    this.unitSpellDescription = "Target must be a unit, in-line with this piece, within 2 tiles, and unobstructed by other pieces. The target travels 3 tiles away from this piece. If it collides with another piece, or the edge of the board, the movement stops and it takes 1 damage. If it collided with a piece, it takes 1 damage too"
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
    super("Witch", "", "WI", ["Unit"], 4, 0, 1, 1, 0, false, false)
    this.unitSpellDescription = "Create Blight on an empty tile within 2 tiles. If it's on your opponents side, they own it. Blight is worth -1 victory points to the owner."
    this.hasUnitSpells = true
    this.spellTarget = "Tile"
  }

  getTilesThatUnitSpellCanBeCastOn(game)
  {
    var pieceTile = this.getCurrentTile(game)    
    return utils.getTilesWithoutAFlatPieceAndWithoutAPiece(utils.getTilesWithinRangeOfTile(game.boardAsList, pieceTile, 2))
  }

  castSpell(game, targetTile)
  {
    var blight = new Blight
    blight.currentCol = targetTile.col
    blight.currentRow = targetTile.row
    if (blight.currentRow >= 8 && this.owner == "Red")
      blight.owner = "Blue"
    else if(blight.currentRow <= 6 && this.owner == "Blue")
      blight.owner = "Red"
    else
      blight.owner = ""
    targetTile.flatPiece = blight
    this.deactivate(game)
  }
}

var witch = new Witch
nonBaseSet[witch.name] = witch
nonBaseSetUnits[witch.name] = witch

class Headquarters extends Piece
{
  deactivate(game)
  {
    super.deactivate(game)
    this.isActive = true
  }

  constructor()
  {
    super("Headquarters", "If this dies, the owner loses the game. Receive 2 energy and 5 gold at start of your turn. Remains active always.", "HQ", ["Building", "Conduit", "Builder"], 7, 0, 0, 10, 0, false, false)
    this.goldProduction = 5
    this.energyDistributionRange = 4
  }

  buildableTiles(game, pieceToBuild)
  {
    if(pieceToBuild.isFlat)
      return utils.getTilesWithoutAFlatPiece(utils.getAdjacentTiles(game.board, this.getCurrentTile(game)))
    else
      return utils.getTilesWithoutAPiece(utils.getAdjacentTiles(game.board, this.getCurrentTile(game)))
  }

  performStartOfTurnEffects(game)
  {
    if (this.isActive)
      if(this.owner == "Red")
      {
        game.redPlayer.energy += 2
        game.redPlayer.gold += 5
      }
      else
      {
        game.bluePlayer.energy += 2
        game.bluePlayer.gold += 5
      }
  }
}

var headquarters = new Headquarters
baseSet[headquarters.name] = headquarters

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)

class EnergyTower extends Piece
{
  constructor()
  {
    super("Energy Tower", "Allows you to distribute energy within 3 tiles of this.", "ET", ["Building", "Conduit"], 5, 0, 0, 4, 0, false, false)
    this.energyDistributionRange = 3
  }

  activate(game)
  {
    super.activate(game)
    if(this.isActive)
      utils.updatePiecesWhichCanReceiveFreeEnergy(game)
  }

  deactivate(game)
  {
    super.deactivate(game)
    if (!this.isActive)
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
    super("Pulse Stick", "At the start of your turn, all Units adjacent to this are energized.", "PS", ["Building"], 4, 0, 0, 3, 0, false, false)
  }

  performStartOfTurnEffects(game)
  {
    if (this.isActive)
    {
      var pieceTile = this.getCurrentTile(game)
      for (var tile of utils.getAdjacentTiles(game.board, pieceTile))
      {
          if (tile.piece != null && tile.piece.types.includes("Unit"))
            tile.piece.receiveEnergy(game, 1)
          else if (tile.flatPiece != null && tile.flatPiece.types.includes("Unit"))
            tile.flatPiece.receiveEnergy(game, 1)
      }
    }
  }
}

var pulseStick = new PulseStick
nonBaseSet[pulseStick.name] = pulseStick
nonBaseSetBuildings[pulseStick.name] = pulseStick

class CrossEnergizer extends Piece
{
  constructor()
  {
    super("Cross Energizer", "When this is activated, all adjacent Pieces are energized. Deactivate this.", "CE", ["Building"], 4, 0, 0, 3, 0, false, false)
  }

  activate(game)
  {
    super.activate(game)
    if (this.isActive)
    {
      var pieceTile = this.getCurrentTile(game)
      for (var tile of utils.getAdjacentTiles(game.board, pieceTile))
      {
          if (tile.piece != null)
            tile.piece.receiveEnergy(game, 1)
          else if (tile.flatPiece != null)
            tile.flatPiece.receiveEnergy(game, 1)
      }
    }
    this.deactivate(game)
  }
}

var crossEnergizer = new CrossEnergizer
nonBaseSet[crossEnergizer.name] = crossEnergizer
nonBaseSetBuildings[crossEnergizer.name] = crossEnergizer

class PowerHut extends Piece
{
  constructor()
  {
    super("Power Hut", "at the start of your turn, if this piece is in one of the 3 center rows, +3 energy.", "PH", ["Building"], 4, 0, 0, 3, 0, false, false)
  }

  performStartOfTurnEffects(game)
  { 
    var pieceTile = this.getCurrentTile(game)
    if (this.isActive && (pieceTile.row == 6 || pieceTile.row == 7 || pieceTile.row == 8))
    {
      if(this.owner == "Red")
        game.redPlayer.energy += 3
      else
        game.bluePlayer.energy += 3
    }
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
    super("Gold Hut", "at the start of your turn, if this piece is one one of the 3 center rows, +5 gold. ", "GH", ["Building"], 3, 0, 0, 3, 0, false, false)
  }

  performStartOfTurnEffects(game)
  { 
    var pieceTile = this.getCurrentTile(game)
    if (this.isActive && (pieceTile.row == 6 || pieceTile.row == 7 || pieceTile.row == 8))
    {
      if(this.owner == "Red")
        game.redPlayer.gold += 5
      else
        game.bluePlayer.gold += 5
    }
  }
}

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movement, health, attackRange, isFlat, canAttack

var goldHut = new GoldHut
nonBaseSet[goldHut.name] = goldHut
nonBaseSetBuildings[goldHut.name] = goldHut

class GoldProducer extends Piece
{
  constructor()
  {
    super("Gold Producer", "At the start of your turn, produces 1 gold plus whatever gold bonus is on this piece's tile.", "GP", ["Building"], 4, 0, 0, 3, 0, false, false)
  }

  performStartOfTurnEffects(game)
  {
    if(this.isActive)
    {
      var pieceTile = this.getCurrentTile(game)
      if (pieceTile.resource == "Gold: 1")
        var bonus = 1
      else if (pieceTile.resource == ("Gold: 2"))
        var bonus = 2
      else if (pieceTile.resource == ("Gold: 3"))
        var bonus = 3
      else
        var bonus = 0

      if(this.owner == "Red")
        game.redPlayer.gold += 1 + bonus
      else
        game.bluePlayer.gold += 1 + bonus
    }
  }
}

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movement, health, attackRange, isFlat, canAttack
var goldProducer = new GoldProducer
baseSet[goldProducer.name] = goldProducer

class WindPoweredGoldProducer extends Piece
{
  constructor()
  {
    super("Wind Powered Gold Producer", "When a Piece moves on to a tile adjacent to this, produce 1 gold plus whatever gold bonus is on this piece's tile. Cannot be triggered by the same Unit twice in one turn", "WG", ["Building"], 4, 0, 0, 3, 0, false, false)
    this.piecesThatHaveTriggeredThisTurn = []
  }

  react(game, pieceThatTriggeredReaction, tilePieceMovedFrom)
  {

    if(this.isActive && !this.piecesThatHaveTriggeredThisTurn.includes(pieceThatTriggeredReaction))
    {
      this.piecesThatHaveTriggeredThisTurn.push(pieceThatTriggeredReaction)
      var pieceTile = this.getCurrentTile(game)
      if (pieceTile.resource == "Gold: 1")
        var bonus = 1
      else if (pieceTile.resource == ("Gold: 2"))
        var bonus = 2
      else if (pieceTile.resource == ("Gold: 3"))
        var bonus = 3
      else
        var bonus = 0

      if(this.owner == "Red")
        game.redPlayer.gold += 1 + bonus
      else
        game.bluePlayer.gold += 1 + bonus
    }
  }

  addReactionsWhenBuilt(game)
  {
    var pieceTile = this.getCurrentTile(game)
    var tilesToReactTo = utils.getAdjacentTiles(game.board, pieceTile)

    for (var tile of tilesToReactTo)
    {
      if (game.movementReactions.has(tile)) 
        game.movementReactions.get(tile).push(this)
      else
        game.movementReactions.set(tile, [this])
    }
  }

  performStartOfTurnEffects(game)
  {
    this.piecesThatHaveTriggeredThisTurn = []  
  }
}

var windPoweredGoldProducer = new WindPoweredGoldProducer
nonBaseSet[windPoweredGoldProducer.name] = windPoweredGoldProducer
nonBaseSetBuildings[windPoweredGoldProducer.name] = windPoweredGoldProducer

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movement, health, attackRange, isFlat, canAttack
 
class EnergyAbsorber extends Piece
{
  constructor()
  {
    super("Energy Absorber", "When a Piece is activated within 3 tile of this, gain 1 charge + any Energy bonus on this tile. This happens regardless of whether this is active. When this piece is activated, spend the charges to gain energy equal to charges/2 (round down). Deactivate this.", "EA", ["Building"], 4, 0, 0, 3, 0, false, false)
    this.charges = 0
  }

  activate(game)
  {
    super.activate(game)

    if(this.owner == "Red")
      game.redPlayer.energy += this.charges/2
    else
      game.bluePlayer.energy += this.charges/2

    this.charges = 0
    this.deactivate(game)
  }

  react(game, pieceThatTriggeredReaction)
  {
    var pieceTile = this.getCurrentTile(game)
    if (pieceTile.resource == "Energy: 1")
      var bonus = 1
    else if (pieceTile.resource == ("Energy: 2"))
      var bonus = 2
    else if (pieceTile.resource == ("Energy: 3"))
      var bonus = 3
    else
      var bonus = 0

    this.charges += 1 + bonus
  }

  addReactionsWhenBuilt(game)
  {
    var pieceTile = this.getCurrentTile(game)
    var tilesToReactTo =  utils.getTilesWithAPieceOrAFlatPiece(utils.getTilesWithinRangeOfTile(game.boardAsList, pieceTile, 3))

    for (var tile of tilesToReactTo)
    {
      if (game.activationReactions.has(tile)) 
        game.activationReactions.get(tile).push(this)
      else
        game.activationReactions.set(tile, [this])
    }
  }
}

var energyAbsorber = new EnergyAbsorber
nonBaseSet[energyAbsorber.name] = energyAbsorber
nonBaseSetBuildings[energyAbsorber.name] = energyAbsorber

class Battery extends Piece
{
  constructor()
  {
    super("Battery", "This piece is always active and cannot receive energy.", "BA", ["Building"], 3, 0, 0, 1, 0, false, false)
    this.hasUnitSpells = true
    this.unitSpellDescription = "Can once per turn, spend 1 stored energy to energize an adjacent piece"
    this.spellTarget = "Piece"
    this.storedEnergy = 3
    this.isActive = true
    this.hasCastThisTurn = false
  }

  receiveEnergy(game, amount)
  {
    return
  }

  activate(game)
  {
    return
  }

  deactivate(game)
  {
    return
  }

  getTilesThatUnitSpellCanBeCastOn(game)
  {
    var pieceTile = this.getCurrentTile(game)    
    return utils.getTilesWithAPieceOrAFlatPiece(utils.getAdjacentTiles(game.board, pieceTile))
  }

  performStartOfTurnEffects(game)
  {
    this.hasCastThisTurn = false
  }

  castSpell(game, targetPiece)
  {
    if (!this.hasCastThisTurn && this.storedEnergy > 0)
    {
      targetPiece.receiveEnergy(game, 1)
      this.hasCastThisTurn = true
      this.storedEnergy -= 1
    }
  }
}

var battery = new Battery
nonBaseSet[battery.name] = battery
nonBaseSetBuildings[battery.name] = battery


class Cable extends Piece
{
  constructor()
  {
    super("Cable", "When a Piece adjacent to this is activated, energize the Piece and Flat Piece on the other side (if they exist)", "CA", ["Building"], 3, 0, 0, 1, 0, false, false)
  }

  react(game, pieceThatTriggeredReaction)
  {
    var pieceThatTriggeredReactionTile = pieceThatTriggeredReaction.getCurrentTile(game)
    var pieceTile = this.getCurrentTile(game)

    var adjacentTiles = utils.getAdjacentTiles(game.board, pieceTile)
    var acrossTile = null
    for (tile of adjacentTiles)
      if ((tile.col == pieceThatTriggeredReactionTile.col && tile.row != pieceThatTriggeredReactionTile.row) || (tile.row == pieceThatTriggeredReactionTile.row && tile.col != pieceThatTriggeredReactionTile.col))
        acrossTile = tile

    if (acrossTile != null)
      if (acrossTile.piece != null && !acrossTile.piece.isActive)
        acrossTile.piece.receiveEnergy(game, 1)
      if (acrossTile.piece != null && acrossTile.piece.isActive && acrossTile.piece.storedEnergy != undefined)
        acrossTile.piece.storedEnergy.receiveEnergy(game, 1)

      if (acrossTile.flatPiece != null && !acrossTile.piece.isActive)
        acrossTile.flatPiece.receiveEnergy(game, 1)
      if (acrossTile.flatPiece != null && acrossTile.flatPiece.isActive && acrossTile.flatPiece.storedEnergy != undefined)
        acrossTile.flatPiece.storedEnergy.receiveEnergy(game, 1)

  }

  addReactionsWhenBuilt(game)
  {
    var pieceTile = this.getCurrentTile(game)
    var tilesToReactTo =  utils.getAdjacentTiles(game.board, pieceTile)

    for (var tile of tilesToReactTo)
    {
      if (game.activationReactions.has(tile)) 
        game.activationReactions.get(tile).push(this)
      else
        game.activationReactions.set(tile, [this])
    }
  }
}

var cable = new Cable
nonBaseSet[cable.name] = cable
nonBaseSetBuildings[cable.name] = cable


class SmallVictoryPointHarvester extends Piece
{
  constructor()
  {
    super("Small Victory Point Harvester", "When activated, produces victory points equal to the VP resource bonus on this piece's tile. Deactivate this", "SV", ["Building"], 5, 0, 0, 3, 0, false, false)
  }

  activate(game)
  {
    super.activate(game)
    if(!this.isActive)
      return

    var pieceTile = this.getCurrentTile(game)
    if (pieceTile.resource == "Victory Point Tokens: 2")
      var pointsToProduce = 2
    else if (pieceTile.resource == ("Victory Point Tokens: 3"))
      var pointsToProduce = 3
    else
      return

    if(this.owner == "Red")
    {
      if (game.victoryPointTokenSupply < pointsToProduce)
      {
        game.redPlayer.victoryPoints += game.victoryPointTokenSupply
        game.victoryPointTokenSupply = 0
      }
      else
      {
        game.redPlayer.victoryPoints += pointsToProduce
        game.victoryPointTokenSupply -= pointsToProduce
      }
    }
    else
    {
      if (game.victoryPointTokenSupply < pointsToProduce)
      {
        game.bluePlayer.victoryPoints += game.victoryPointTokenSupply
        game.victoryPointTokenSupply = 0
      }
      else
      {
        game.bluePlayer.victoryPoints += pointsToProduce
        game.victoryPointTokenSupply -= pointsToProduce
      }
    }
    this.deactivate(game)
  }
}

var smallVictoryPointHarvester = new SmallVictoryPointHarvester
baseSet[smallVictoryPointHarvester.name] = smallVictoryPointHarvester

class LargeVictoryPointHarvester extends Piece
{
  constructor()
  {
    super("Large Victory Point Harvester", "when activated, produces victory points equal to the VP resource bonus on this piece's tile*2", "LV", ["Building"], 10, 0, 0, 3, 0, false, false)
  }

  activate(game)
  {
    super.activate(game)
    if(!this.isActive)
      return

    var pieceTile = this.getCurrentTile(game)
    if (pieceTile.resource == "Victory Point Tokens: 2")
      var pointsToProduce = 4
    else if (pieceTile.resource == ("Victory Point Tokens: 3"))
      var pointsToProduce = 6
    else
      return

    if(this.owner == "Red")
    {
      if (game.victoryPointTokenSupply < pointsToProduce)
      {
        game.redPlayer.victoryPoints += game.victoryPointTokenSupply
        game.victoryPointTokenSupply = 0
      }
      else
      {
        game.redPlayer.victoryPoints += pointsToProduce
        game.victoryPointTokenSupply -= pointsToProduce
      }
    }
    else
    {
      if (game.victoryPointTokenSupply < pointsToProduce)
      {
        game.bluePlayer.victoryPoints += game.victoryPointTokenSupply
        game.victoryPointTokenSupply = 0
      }
      else
      {
        game.bluePlayer.victoryPoints += pointsToProduce
        game.victoryPointTokenSupply -= pointsToProduce
      }      
    }
  }
}

var largeVictoryPointHarvester= new LargeVictoryPointHarvester
baseSet[largeVictoryPointHarvester.name] = largeVictoryPointHarvester

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movement, health, attackRange, isFlat, canAttack

class Generator extends Piece
{
  constructor()
  {
    super("Generator", "At the start of your turn, produces energy equal to the energy resource bonus on this piece's tile. ", "GT", ["Building"], 5, 0, 0, 3, 0, false, false)
  }

  performStartOfTurnEffects(game)
  { 
    if (this.isActive)
    {
      var pieceTile = this.getCurrentTile(game)
      if (pieceTile.resource == "Energy: 1")
        var energyToProduce = 1
      else if (pieceTile.resource == ("Energy: 2"))
        var energyToProduce = 2
      else if (pieceTile.resource == ("Energy: 3"))
        var energyToProduce = 3
      else
        return

      if(this.owner == "Red")
        game.redPlayer.energy += energyToProduce
      else
        game.bluePlayer.energy += energyToProduce
    }
  }
}

var generator = new Generator
baseSet[generator.name] = generator

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movement, health, attackRange, isFlat, canAttack
class Blight extends Piece
{
  constructor()
  {
    super("Blight", "-1 victory point", "BL", ["Building", "Blight"], 0, 0, 0, 0, 1, 0, true, false)
    this.victoryPointValue = -1
  }
}

var blight = new Blight
baseSet[blight.name] = blight

module.exports.baseSet = baseSet
module.exports.nonBaseSet = nonBaseSet
module.exports.nonBaseSetUnits = nonBaseSetUnits
module.exports.nonBaseSetBuildings = nonBaseSetBuildings
