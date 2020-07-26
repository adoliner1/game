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
    this.energy = 0
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
    var pieceTile = this.getCurrentTile(game)
    if(game.activationReactions.has(pieceTile))
    for (var piece of game.activationReactions.get(path[leadIndex]))
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

      if (game.movementReactions.has(path[leadIndex]))
      {
        for (var piece of game.movementReactions.get(path[leadIndex]))
        {
          if (piece.react(game, this, movedFromTile) == "stop movement")
            movement = 0
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
    var pieceTile = this.getCurrentTile(game)

    for (var piece of game.deathReactions.get(pieceTile))
      piece.react(game, this)   

    if ("addReactionsWhenBuilt" in this)
      for (var [reactionTile, reactionsList] of game.movementReactions) 
        utils.removeValueFromArray(reactionsList, this)
      for (var [reactionTile, reactionsList] of game.activationReactions) 
        utils.removeValueFromArray(reactionsList, this)
      for (var [reactionTile, reactionsList] of game.deathReactions) 
        utils.removeValueFromArray(reactionsList, this)      

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
    super("Turret", "building which shoots", "TU", ["Building"], 4, 0, 0, 3, 0, false, false)
    this.unitSpellDescription = "deal 1 damage to a piece within casting range tiles. remain active afterwards"
    this.castingRange = 2
    this.hasUnitSpells = true
  }

  getTilesThatUnitSpellCanBeCastOn(game)
  {
    var pieceTile = this.getCurrentTile(game)
    return utils.getTilesWithAPieceOrAFlatPiece(utils.getTilesWithinRangeOfTile(game.getAllTilesInListForm(), pieceTile, this.castingRange))
  }

  castSpell(game, targetPiece)
  {
    targetPiece.takeDamage(game, this, 1)
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
    super("Speed Dome", "when you activate this, restore the movement of all friendly units within 3 tiles", "SD", ["Building"], 4, 0, 0, 3, 0, false, false)
  }

  activate(game)
  {
    super.activate()
    if(this.isActive)
    {
      tilesWithPieces = utils.getTilesWithAFriendlyPieceOrAFriendlyFlatPiece(isRedPlayer, utils.getTilesWithAPieceOrAFlatPiece(utils.getTilesWithinRangeOfTile(game.getAllTilesInListForm(), pieceTile, 3)))
      for (tile of tilesWithPieces)
        tile.piece.movement = tile.piece.movementCapacity
    }
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
    super("Repair Shop", "at the start of your turn, friendly pieces within 2 tiles of this get +1 health", "RS", ["Building"], 4, 0, 0, 3, 0, false, false)    
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

//name, description, owner, boardAvatar, types, cost, strength, movementCapacity, health, attackRange, isFlat, canAttack)
class FieldShocker extends Piece
{
  constructor()
  {
    super("Field Shocker", "when an enemy piece activates within 3 tiles of this, it takes 1 damage", "FS", ["Building"], 5, 0, 0, 2, 0, false, false)    
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
    tilesToReactTo = utils.getTilesWithinRangeOfTile(game.getAllTilesInListForm(), pieceTile, 3)

    for (tiles of tilesToReactTo)
    {
      if (game.activationReactions.has(pieceTile))
        game.activationReactions.get(pieceTile).push(this)
      else
        game.activationReactions.set(pieceTile, [this])  
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
    super("Soul Harvester", "when a piece dies within 3 tiles of this, gain 1 gold + the tile's resource bonus", "SH", ["Building"], 4, 0, 0, 3, 0, false, false)
  }

  react(game, pieceThatTriggeredReaction)
  {
    if(this.isActive && this.health > 0)
    {
      var pieceTile = this.getCurrentTile(game)
        if (tile.resource == "Gold: 1")
          var bonus = 1
        else if (tile.resource == ("Gold: 2"))
          var bonus = 2
        else if (tile.resource == ("Gold: 3"))
          var bonus = 3
    }

    if(this.owner == "Red")
      game.redPlayer.gold += 1 + bonus
    else
      game.bluePlayer.gold += 1 + bonus
  }

  addReactionsWhenBuilt(game)
  {
    var pieceTile = this.getCurrentTile(game)
    tilesToReactTo = utils.getTilesWithinRangeOfTile(game.getAllTilesInListForm(), pieceTile, 3)

    for (tiles of tilesToReactTo)
    {
      if (game.deathReactions.has(pieceTile))
        game.deathReactions.get(pieceTile).push(this)
      else
        game.deathReactions.set(pieceTile, [this])  
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
    super("Movement Pad", "when a friendly piece moves on to this it gets +1 movement.", "MP", ["Building"], 3, 0, 0, 1, 0, true, false)    
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
    super("Boost Pad", "when a friendly piece moves on to this it moves (without costing movement) 3 more spaces in the direction it was just moving. if that path is obstructed, it moves as far as it can. all previous plans for movement this piece had are lost.", "BP", ["Building"], 3, 0, 0, 1, 0, true, false)    
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
    super("Energy Pad", "if there's a friendly piece on this at the start of your turn, activate it.", "EP", ["Building"], 3, 0, 0, 1, 0, true, false)    
  }

  performStartOfTurnEffects(game)
  {
    if (this.isActive)
    {
      var pieceTile = this.getCurrentTile(game)
      if (pieceTile.piece != null && pieceTile.piece.owner == this.owner)
        pieceTile.piece.activate(game)
    }
  }
}

var energyPad = new EnergyPad
nonBaseSet[energyPad.name] = energyPad
nonBaseSetBuildings[energyPad.name] = energyPad

//name, description, owner, boardAvatar, types, cost, strength, movementCapacity, health, attackRange, isFlat, canAttack)
class Wall extends Piece
{
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
    super("Spike Trap", "when an enemy piece moves on to an adjacent tile to this, it takes 2 damage", "ST", ["Building"], 4, 0, 0, 2, 0, false, false)    
  }

  react(game, pieceThatTriggeredReaction, tilePieceMovedFrom)
  {
    if (this.owner != pieceThatTriggeredReaction.owner && this.isActive)
      pieceThatTriggeredReaction.takeDamage(game, this, 2)
  }

  addReactionsWhenBuilt(game)
  {
    var pieceTile = this.getCurrentTile(game)
    tilesToReactTo = utils.getAdjacentTiles(game.board, pieceTile)

    for (tile of tilesToReactTo)
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
    super("Juice Shaman", "juices up your units with strength", "JS", ["Unit"], 4, 1, 2, 1, 1, false, true)
    this.castingRange = 2
    this.unitSpell = "increase the strength of a piece that has more than 0 strength by 2"
  }

  getTilesThatUnitSpellCanBeCastOn(game)
  {
    var pieceTile = this.getCurrentTile(game)
    return utils.getTilesWithMoreThanZeroStrength(utils.getTilesWithAPieceOrAFlatPiece(utils.getTilesWithinRangeOfTile(game.getAllTilesInListForm(), pieceTile, this.castingRange)))
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

class Archer extends Piece
{
  constructor()
  {
    super("Archer", "can't attack through non-flat pieces.", "AR", ["Unit"], 4, 2, 1, 1, 2, false, true)
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
    super("Phaser Boy", "can't attack through non-flat pieces, attacks in a straight line", "PB", ["Unit"], 5, 4, 1, 1, 3, false, true)
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
    super("Scrapper", "when this piece damages a unit, +1 gold. when it kills one, +3 gold", "SC", ["Unit"], 5, 3, 1, 1, 1, false, true)
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
    super("Sniper", "can't attack through non-flat pieces, attacks in a straight line", "SN", ["Unit"], 5, 1, 1, 1, 4, false, true)
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
    super("Swordsman", "if this piece has at least 2 health when it attacks, the victim doesn't get to respond", "SW", ["Unit"], 5, 2, 2, 2, 1, false, true)
  }

  attack(game, victim)
  {
    this.isActive = false
    victim.takeDamage(game, this, this.strength)
    if (victim.health > 0 && this.health < 2)
      victim.respondToAttack(game, this)
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
    super("MammaJamma", "this piece costs 2 energy to activate", "MJ", ["Unit"], 6, 6, 1, 10, 1, false, true)
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
    super("Power Priest", "", "PP", ["Unit", "Conduit"], 5, 0, 2, 1, 0, false, false)
    this.unitSpellDescription = "restore 2 health to a unit"
    this.castingRange = 2
    this.energyDistributionRange = 2
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
    super("Blaster", "blasts stuff", "BT", ["Unit"], 4, 0, 1, 1, 0, false, false)
    this.unitSpellDescription = "target must be a unit, in-line with this piece, within 2 tiles, and unobstructed by other pieces. attempt to move the target unit 3 tiles away from this piece. if it collides with another piece, or the edge of the board, the movement stops and it takes 1 damage. if it collided with a piece, it takes 1 damage too"
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
    this.unitSpellDescription = "create Blight on an empty tile within 2 tiles. if it's on your opponents side, they own it. Blight is worth -1 victory points to the owner."
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
    super("Headquarters", "This piece doesn't need to be on a resource tile to produce gold and energy. If this dies, the owner loses the game.", "HQ", ["Building", "Conduit"], 7, 0, 0, 10, 0, false, false)
    this.minimumEnergyNeededForActivation = 0
    this.energyCapacityProduction = 2
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
    super("Energy Tower", "allows you to distribute energy within 3 tiles of this. remains active", "ET", ["Building", "Conduit"], 5, 0, 0, 4, 0, false, false)
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
    super("Pulse Stick", "at the start of your turn, all pieces adjacent to this get activated", "PS", ["Building"], 3, 0, 0, 4, 0, false, false)
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
    super("Attack Drone", "", "AD", ["Unit"], 1, 1, 2, 1, 1, false, true)
  }
}

var attackDrone = new AttackDrone
nonBaseSet[attackDrone.name] = attackDrone
nonBaseSetUnits[attackDrone.name] = attackDrone

class BuilderDrone extends Piece
{
  constructor()
  {
    super("Builder Drone", "builder", "BD", ["Unit", "Builder"], 2, 0, 2, 1, 0, false, false)
  }

  //tiles this builder can build on in game
  buildableTiles(game, pieceToBuild)
  {
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
    super("Drainer", "this units attacks apply ", "DR", ["Unit"], 5, 1, 3, 2, 1, false, true)
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
    super("Techies", "when this unit dies, deal 5 damage to every adjacent piece", "TC", ["Unit"], 5, 1, 2, 1, 1, false, true)
  }

  die(game, killer)
  {
    super.die(game, killer)
    var pieceTile = this.getCurrentTile(game)

    for (var tile of utils.getTilesWithAPieceOrAFlatPiece(utils.getTilesWithinRangeOfTile(game.getAllTilesInListForm(), pieceTile, 1)))
      if (tile.piece != null)
        tile.piece.takeDamage(game, null, 5)
      if (tile.flatPiece != null)
        tile.piece.takeDamage(game, null, 5)
  }
}

class PowerHut extends Piece
{
  constructor()
  {
    super("Power Hut", "at the start of your turn, if this piece is one one of the 3 center rows, +3 energy. ", "PH", ["Building"], 5, 0, 0, 3, 0, false, false)
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
    super("Gold Hut", "at the start of your turn, if this piece is one one of the 3 center rows, +5 gold. ", "GH", ["Building"], 5, 0, 0, 3, 0, false, false)
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
    super("Gold Producer", "when activated, produces 3 gold plus whatever gold bonus is on this piece's tile", "GP", ["Building"], 4, 0, 0, 3, 0, false, false)
  }

  activate(game)
  {
    super.activate(game)
    if(!this.isActive)
      return

    var pieceTile = this.getCurrentTile(game)
    if (tile.resource == "Gold: 1")
      var bonus = 1
    else if (tile.resource == ("Gold: 2"))
      var bonus = 2
    else if (tile.resource == ("Gold: 3"))
      var bonus = 3

    if(this.owner == "Red")
      game.redPlayer.gold += 3 + bonus
    else
      game.bluePlayer.gold += 3 + bonus
  }
}

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movement, health, attackRange, isFlat, canAttack
var goldProducer = new GoldProducer
baseSet[goldProducer.name] = goldProducer

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movement, health, attackRange, isFlat, canAttack

class SmallVictoryPointHarvester extends Piece
{
  constructor()
  {
    super("Small Victory Point Harvester", "when activated, produces victory points equal to the VP resource bonus on this piece's tile", "SV", ["Building"], 5, 0, 0, 3, 0, false, false)
  }

  activate(game)
  {
    super.activate(game)
    if(!this.isActive)
      return

    var pieceTile = this.getCurrentTile(game)
    if (tile.resource == "Victory Point Tokens: 2")
      var pointsToProduce = 2
    else if (tile.resource == ("Victory Point Tokens: 3"))
      var pointsToProduce = 3

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

var smallVictoryPointHarvester = new SmallVictoryPointHarvester
baseSet[smallVictoryPointHarvester.name] = smallVictoryPointHarvester

class LargeVictoryPointHarvester extends Piece
{
  constructor()
  {
    super("Large Victory Point Miner", "when activated, produces victory points equal to the VP resource bonus on this piece's tile*2", "LV", ["Building"], 10, 0, 0, 3, 0, false, false)
  }

  activate(game)
  {
    super.activate(game)
    if(!this.isActive)
      return

    var pieceTile = this.getCurrentTile(game)
    if (tile.resource == "Victory Point Tokens: 2")
      var pointsToProduce = 4
    else if (tile.resource == ("Victory Point Tokens: 3"))
      var pointsToProduce = 6

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
    super("Generator", "at the start of your turn, produces energy equal to the energy resource bonus on this piece's tile. ", "GT", ["Building"], 5, 0, 0, 3, 0, false, false)
  }

  performStartOfTurnEffects(game)
  { 
    if (this.isActive)
    {
      var pieceTile = this.getCurrentTile(game)
      if (tile.resource == "Energy: 1")
        var energyToProduce = 1
      else if (tile.resource == ("Energy: 2"))
        var energyToProduce = 2
      else if (tile.resource == ("Energy: 3"))
        var energyToProduce = 3

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
