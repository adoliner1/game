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
    target.increaseEnergy(game, pieceTile)
  }
}

var surge = new Surge
spells[surge.name] = surge


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
    return getTilesWithAFriendlyPiece(isRedPlayer, game.getAllTilesInListForm())
  }

  cast(game, target)
  {
    target.strength = target.strength + 1
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
    return getTilesWithPiecesWithMovementCapacityHigherThanZero(getTilesWithAFriendlyPiece(isRedPlayer, game.getAllTilesInListForm()))
  }

  cast(game, target)
  {
    target.increaseMovement(2)
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
    return getTilesWithPiecesWithMovementCapacityHigherThanZero(getTilesWithAFriendlyPiece(isRedPlayer, game.getAllTilesInListForm()))
  }

  cast(game, target)
  {
    target.movementCapacity = target.movementCapacity + 1
  }
}

var quickFoot = new QuickFoot
spells[quickFoot.name] = quickFoot

class LittleMissle extends Spell
{
  constructor()
  {
    super("Little Missle", "deal 1 damage to a unit within range of a friendly caster", ["Spell"], 3, "LM", "Piece")
  }

  getTilesWhichCanBeCastOn(game)
  {
    return getTilesWithAPiece(getTilesInRangeOfAFriendlyCaster(game, this.owner))
  }

  cast(game, target)
  {
    target.takeDamage(game, null, 1, null, null)
  }
}

var littleMissle = new LittleMissle
spells[littleMissle.name] = littleMissle

class Upgrade extends Spell
{
  constructor()
  {
    super("Upgrade", "destroy a friendly piece. gain a piece sharing a type that costs one more", ["Spell"], 2, "RP", "Piece")
  }

  getTilesWhichCanBeCastOn(game)
  {
    return getTilesWithAPiece(game.getAllTilesInListForm())
  }

  cast(game, target)
  {
    target.takeDamage(game, null, 1, null, null)
  }
}

var littleMissle = new LittleMissle
spells[littleMissle.name] = littleMissle


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
  }

  activate(game, pieceTile)
  {
    this.isActive = true
  }

  deactivate(game, pieceTile)
  {
    this.isActive = false
  }

  canReceiveFreeEnergyAtTile(game, tile)
  {
    if ((this.owner == "Red" && tile.row < 3) || (this.owner == "Blue" && tile.row > 11))
      return true
    return isInRangeOfFriendlyConduit(game, this.owner, tile)
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

      this.canReceiveFreeEnergyAtThisLocation = this.canReceiveFreeEnergyAtTile(game, path[leadIndex])

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

  increaseHealth(amount)
  {
    if(this.health + amount <= this.healthCapacity)
      this.health += amount
    else
      this.health = this.healthCapacity
  }

  increaseEnergy(game, pieceTile)
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

  reduceEnergy(game, pieceTile)
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
      this.deactivate(game, pieceTile)
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

  attack(game, victim, attackerTile, victimTile)
  {
    this.isActive = false
    victim.takeDamage(game, this, this.strength, attackerTile, victimTile)
    if (victim != null)
      victim.respondToAttack(game, this, attackerTile, victimTile)
  }

  respondToAttack(game, attacker, attackerTile, victimTile)
  {
    if (getDistanceBetweenTwoTiles(attackerTile, victimTile) < this.attackRange)
      attacker.takeDamage(game, this, this.strength, attackerTile, victimTile)
  }

  takeDamage(game, attacker, damage, attackerTile, victimTile)
  {
    this.health -= damage
    if (this.health <= 0)
      this.die(game, attacker, attackerTile, victimTile)
  }

  die(game, killer, attackerTile, victimTile)
  {
      victimTile.piece = null
      //remove reactions
  }
}

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)
class MovementPad extends Piece
{
  constructor()
  {
    super("Movement Pad", "when a friendly piece moves on to this it gets +1 movement", "MP", ["Building"], 3, 1, 0, 0, 1, 0, true, false)    
  }

  react(game, pieceThatTriggeredReaction, tileReactionTriggeredFrom)
  {
    if (this.owner == pieceThatTriggeredReaction.owner && this.energy != 0)
      pieceThatTriggeredReaction.increaseMovement(1)
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

class Archer extends Piece
{
  constructor()
  {
    super("Archer", "+1 energy = +1 strength -- can't shoot through non-flat pieces.", "AR", ["Unit"], 4, 2, 0, 1, 1, 2, false, true)
  }

  increaseEnergy(game, pieceTile)
  {
    var oldEnergy = this.energy
    super.increaseEnergy(game, pieceTile)
    if (this.energy > oldEnergy)
      this.strength += 1
  }

  reduceEnergy(game, pieceTile)
  {
    var oldEnergy = this.energy
    super.reduceEnergy(game, pieceTile)
    if (this.energy < oldEnergy)
      this.strength -= 1
  }

  getAttackableTiles(game, pieceLocation)
  {
    return getTilesWithAPiece(getAttackableTilesThatDontGoThroughAnotherUnit(game.board, pieceLocation))
  }
}

var archer = new Archer
units[archer.name] = archer

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)
class PowerPriest extends Piece
{
  constructor()
  {
    super("Power Priest", "unit spell: a friendly unit in an adjacent tile gets +2 health. reduce this piece's energy by 1", "PP", ["Unit", "Conduit"], 4, 1, 0, 1, 1, 0, false, false)
    this.energyDistributionRange = 1
    this.hasUnitSpells = true
    this.spellTarget = "Piece"
  }

  getTilesThatUnitSpellCanBeCastOn(game, tile)
  {
    var isRedPlayer = this.owner == "Red" ? true : false 
    return getTilesWithAFriendlyPiece(isRedPlayer, getAdjacentTiles(game.board, tile))
  }

  activate(game, pieceTile)
  {
    this.isActive = true
    updatePiecesWhichCanReceiveFreeEnergy(game)
  }

  deactivate(game, pieceTile)
  {
    this.isActive = false
    updatePiecesWhichCanReceiveFreeEnergy(game)
  }

  castSpell(game, target)
  {
    target.increaseHealth(2)
    this.reduceEnergy(game, pieceTile)

    if(target.owner == "Blue")
      game.bluePlayer.activeEnergy --
    else
      game.redPlayer.activeEnergy -- 
  }
}

var powerPriest = new PowerPriest
units[powerPriest.name] = powerPriest

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)
class ElectricWiz extends Piece
{
  constructor()
  {
    super("Electric Wiz", "unit spell: deal 1 damage to a target within 2 tiles. reduce this pieces energy by 1", "EW", ["Unit", "Caster"], 4, 1, 0, 1, 1, 0, false, false)
    this.castingRange = 1
    this.hasUnitSpells = true
    this.spellTarget = "Piece"
  }

  getTilesThatUnitSpellCanBeCastOn(game, tile)
  {
    return getTilesWithAPiece(getTilesWithinRangeOfTile(game.getAllTilesInListForm(), tile, 2))
  }

  castSpell(game, target)
  {
    target.takeDamage(game, this, 2, null, null)

    this.reduceEnergy(game, pieceTile)

    if(target.owner == "Blue")
      game.bluePlayer.activeEnergy --
    else
      game.redPlayer.activeEnergy -- 
  }
}

var electricWiz = new ElectricWiz
units[electricWiz.name] = electricWiz


//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)

class EnergyTower extends Piece
{
  constructor()
  {
    super("Energy Tower", "distribution range = 2", "ET", ["Building", "Conduit"], 4, 1, 0, 0, 4, 0, false, false)
    this.energyDistributionRange = 2
  }

  activate(game, pieceTile)
  {
    this.isActive = true
    updatePiecesWhichCanReceiveFreeEnergy(game)
  }

  deactivate(game, pieceTile)
  {
    this.isActive = false
    updatePiecesWhichCanReceiveFreeEnergy(game)
  }
}

var energyTower = new EnergyTower
buildings[energyTower.name] = energyTower

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack)

class Hopper extends Piece
{
  constructor()
  {
    super("Hopper", "+1 energy = +1 movement capacity -- this unit moves 2 squares at a time and hops over the first square. if it hops over an enemy piece, that piece takes 3 damage", "HP", ["Unit"], 5, 4, 0, 0, 2, 0, false, false)
  }  

  increaseEnergy(game, pieceTile)
  {
    if (this.energy < this.energyCapacity)
    {
      var oldEnergy = this.energy
      super.increaseEnergy(game, pieceTile)
      if (this.energy > oldEnergy)
        this.movementCapacity += 1
    }
  }

  reduceEnergy(game, pieceTile)
  {
    var oldEnergy = this.energy
    super.reduceEnergy(game, pieceTile)
    if (this.energy < oldEnergy)
      this.movementCapacity -= 1
  }

  getTilesWhichCanBeMovedToAndThePathThere(game, fromTile)
  {
    return getTilesInHopRangeAndThePathThere(game.board, fromTile)
  }

  move(game, initialTile, path)
  {
    var leadIndex = 0
    var followIndex = -1
    var movedOverTile = null

    while (leadIndex < path.length && this.movement > 0)
    {
      if (followIndex == -1)
      {
        movePieceFromOneTileToAnother(initialTile, path[leadIndex])
        this.movement = this.movement - 2;
        movedOverTile = getTileBetweenTwoTilesTwoSpacesApartInLine(game.board, initialTile, path[leadIndex])
      }
      else
      {
        movePieceFromOneTileToAnother(path[followIndex], path[leadIndex])
        this.movement = this.movement - 2;
        movedOverTile = getTileBetweenTwoTilesTwoSpacesApartInLine(game.board, path[followIndex], path[leadIndex])
      }

      if (movedOverTile.piece != null && this.owner != movedOverTile.piece.owner)
      {
        movedOverTile.piece.takeDamage(game, this, 3, path[leadIndex], movedOverTile)
      }

      if (movedOverTile.flatPiece != null && this.owner != movedOverTile.flatPiece.owner)
      {
        movedOverTile.flatPiece.takeDamage(game, this, 3, path[leadIndex], movedOverTile)        
      }

      if (game.reactions.has(path[leadIndex]))
      {
        for (var piece of game.reactions.get(path[leadIndex]))
        {
          piece.react(game, this, path[leadIndex])
        }
      }

      this.canReceiveFreeEnergyAtThisLocation = this.canReceiveFreeEnergyAtTile(game, path[leadIndex])

      leadIndex ++
      followIndex ++ 
    }
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

  increaseEnergy(game, pieceTile)
  {
    var oldEnergy = this.energy
    super.increaseEnergy(game, pieceTile)
    if (this.energy > oldEnergy)
      this.strength += 1
  }

  reduceEnergy(game, pieceTile)
  {
    var oldEnergy = this.energy
    super.reduceEnergy(game, pieceTile)
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

  attack(game, victim, attackerTile, victimTile)
  {
    this.isActive = false
    victim.takeDamage(game, this, this.strength, attackerTile, victimTile)
    if(this.energy > 0)
      victim.reduceEnergy(game, victimTile)
    if (victim != null && victim.isActive)
      victim.respondToAttack(game, this, attackerTile, victimTile)
  }
}

var drainer = new Drainer
units[drainer.name] = drainer

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movementCapacity, health, attackRange, isFlat, canAttack
class MagicPowerTower extends Piece
{
  constructor()
  {
    super("Magic Power Tower", "casting range = 2, energy distribution range = 2", "MPT", ["Building, Caster, Conduit"], 6, 1, 0, 0, 6, 0, false, false)
    this.castingRange = 2
    this.energyDistributionRange = 2
  }

  activate(game, pieceTile)
  {
    this.isActive = true
    updatePiecesWhichCanReceiveFreeEnergy(game)
  }

  deactivate(game, pieceTile)
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

  performOnBuildEffects(game, tileToBuildOn)
  { 
    if (this.owner == "Red")
      var distanceFromBackWall = tileToBuildOn.row + 1
    else
      var distanceFromBackWall = boardLength - tileToBuildOn.row
      
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

  performOnBuildEffects(game, tileToBuildOn)
  { 
    if (this.owner == "Red")
      var distanceFromBackWall = tileToBuildOn.row + 1
    else
      var distanceFromBackWall = boardLength - tileToBuildOn.row
      
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


class SmallGoldFarm extends Piece
{
  constructor()
  {
    super("Small Gold Farm", "+1 energy = +1 gold production", "SGF", ["Building"], 1, 3, 0, 0, 3, 0, false, false)
    this.goldProduction = 0
  }

  increaseEnergy(game, pieceTile)
  {
    var oldEnergy = this.energy
    super.increaseEnergy(game, pieceTile)
    if (this.energy > oldEnergy)
      this.goldProduction += 1
  }

  reduceEnergy(game, pieceTile)
  {
    var oldEnergy = this.energy
    super.reduceEnergy(game, pieceTile)
    if (this.energy < oldEnergy)
      this.goldProduction -= 1
  }
}
//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movement, health, attackRange, isFlat, canAttack

var smallGoldFarm = new SmallGoldFarm
buildings[smallGoldFarm.name] = smallGoldFarm

class MediumGoldFarm extends Piece
{
  constructor()
  {
    super("Medium Gold Farm", "+1 energy = +2 gold production", "MGF", ["Building"], 5, 3, 0, 0, 3, 0, false, false)
    this.goldProduction = 0
  }

  increaseEnergy(game, pieceTile)
  {
    var oldEnergy = this.energy
    super.increaseEnergy(game, pieceTile)
    if (this.energy > oldEnergy)
      this.goldProduction += 2
  }

  reduceEnergy(game, pieceTile)
  {
    var oldEnergy = this.energy
    super.reduceEnergy(game, pieceTile)
    if (this.energy < oldEnergy)
      this.goldProduction -= 2
  }
}

var mediumGoldFarm = new MediumGoldFarm
buildings[mediumGoldFarm.name] = mediumGoldFarm

class LargeGoldFarm extends Piece
{
  constructor()
  {
    super("Large Gold Farm", "+1 energy = +3 gold production", "LGF", ["Building"], 7, 1, 0, 0, 3, 0, false, false)
    this.goldProduction = 0
  }

  increaseEnergy(game, pieceTile)
  {
    var oldEnergy = this.energy
    super.increaseEnergy(game, pieceTile)
    if (this.energy > oldEnergy)
      this.goldProduction += 3
  }

  reduceEnergy(game, pieceTile)
  {
    var oldEnergy = this.energy
    super.reduceEnergy(game, pieceTile)
    if (this.energy < oldEnergy)
      this.goldProduction -= 3
  }
}

var largeGoldFarm = new LargeGoldFarm
buildings[largeGoldFarm.name] = largeGoldFarm

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movement, health, attackRange, isFlat, canAttack

class SmallPointsMiner extends Piece
{
  constructor()
  {
    super("Small Points Miner", "produces (energy*VP square value) vp tokens", "SPM", ["Building"], 2, 2, 0, 0, 3, 0, false, false)
    this.victoryPointTokenProduction = 0
  }

  increaseEnergy(game, pieceTile)
  {
    var oldEnergy = this.energy
    super.increaseEnergy(game, pieceTile)
    if (this.energy > oldEnergy)
      this.victoryPointTokenProduction += 1
  }

  reduceEnergy(game, pieceTile)
  {
    var oldEnergy = this.energy
    super.increaseEnergy(game, pieceTile)
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
    super("Medium Points Miner", "produces (2*energy*VP square value) vp tokens", "MPF", ["Building"], 5, 2, 0, 0, 3, 0, false, false)
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
    super.increaseEnergy(game, pieceTile)
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
    super("Large Points Miner", "produces (3*energy*VP square value) vp tokens", "LPF", ["Building"], 8, 2, 0, 0, 3, 0, false, false)
    this.victoryPointTokenProduction = 0
  }

  increaseEnergy(game, pieceTile)
  {
    var oldEnergy = this.energy
    super.increaseEnergy(game, pieceTile)
    if (this.energy > oldEnergy)
      this.victoryPointTokenProduction += 3
  }

  reduceEnergy(game, pieceTile)
  {
    var oldEnergy = this.energy
    super.increaseEnergy(game, pieceTile)
    if (this.energy < oldEnergy)
      this.victoryPointTokenProduction -= 3
  }
}

var largePointsMiner = new LargePointsMiner
buildings[largePointsMiner.name] = largePointsMiner

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movement, health, attackRange, isFlat, canAttack

class SmallEnergyFarm extends Piece
{
  constructor()
  {
    super("Small Energy Farm", "+1 energy capacity -- automatically active", "SEF", ["Building"], 4, 0, 0, 0, 3, 0, false, false)
    this.energyCapacityProduction = 1
    this.isActive = true
  }
}

var smallEnergyFarm = new SmallEnergyFarm
buildings[smallEnergyFarm.name] = smallEnergyFarm

class MediumEnergyFarm extends Piece
{
  constructor()
  {
    super("Medium Energy Farm", "+2 energy capacity -- automatically active", "MEF", ["Building"], 7, 0, 0, 0, 3, 0, false, false)
    this.energyCapacityProduction = 2
    this.isActive = true
  }
}

var mediumEnergyFarm = new MediumEnergyFarm
buildings[mediumEnergyFarm.name] = mediumEnergyFarm

class LargeEnergyFarm extends Piece
{
  constructor()
  {
    super("Large Energy Farm", "+3 energy capacity -- automatically active", "LEF", ["Building"], 9, 0, 0, 0, 3, 0, false, false)
    this.energyCapacityProduction = 3
    this.isActive = true
  }
}

var largeEnergyFarm = new LargeEnergyFarm
buildings[largeEnergyFarm.name] = largeEnergyFarm

//name, description, owner, boardAvatar, types, cost, energyCapacity, strength, movement, health, attackRange, isFlat, canAttack
class Blight extends Piece
{
  constructor()
  {
    super("Blight", "-1 victory point for territory owner", "BL", ["Building", "Blight"], 0, 0, 0, 0, 1, 0, true, false)
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
    {
      tile.piece.canReceiveFreeEnergyAtThisLocation = tile.piece.canReceiveFreeEnergyAtTile(game, tile)          
    }
    if(tile.flatPiece != null)
    {
      tile.flatPiece.canReceiveFreeEnergyAtThisLocation = tile.flatPiece.canReceiveFreeEnergyAtTile(game, tile)                    
    }
  }    
}

function isInRangeOfFriendlyConduit(game, playerColor, pieceTile)
{
  for (var tile of game.getAllTilesInListForm())
  {
    var piece = tile.piece
    var flatPiece = tile.flatPiece
    if(piece != null && piece.types.includes("Conduit") && piece.owner == playerColor && getDistanceBetweenTwoTiles(tile, pieceTile) <= piece.energyDistributionRange && piece.isActive)
      return true
    if(flatPiece != null && flatPiece.types.includes("Conduit") && flatPiece.owner == playerColor && getDistanceBetweenTwoTiles(flatPiece, pieceTile) <= flatPiece.energyDistributionRange && flatPiece.isActive)
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
    {
      newTiles.push(tile)
    }
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

function getTileBetweenTwoTilesTwoSpacesApartInLine(board, tile1, tile2)
{
  if (tile1.row == tile2.row)
    return board[(tile1.col + tile2.col)/2][tile1.row]
  else
    return board[tile1.col][(tile1.row + tile2.row)/2]
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

function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}
