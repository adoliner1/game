var units = []
var buildings = []

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

function Spell()
{}

//units
var footman = new Unit("Footman", "", "FM", ["Unit"], ["Friendly"], 3, 1, 0, 2, 1, 1, 1)
var builder = new Unit("Builder", "", "BU", ["Unit", "Builder"], ["Friendly"], 3, 0, 1, 1, 1, 0)

//buildings
//resources
var copperMine = new Building("Copper Mine", "", "CM", ["Building"], ["Friendly"], 3, 1, 0, 1, 0, false)
var silverMine = new Building("Silver Mine", "", "SM", ["Building"], ["Friendly"], 4, 1, 0, 3, 0, false)
var goldMine = new Building("Gold Mine", "", "GM", ["Building"], ["Friendly"], 7, 1, 0, 5, 0, false)

//victories
var estate = new Building("Estate", "", "ES", ["Building"], ["Friendly"], 1, 1, 1, 0, 0, false)
var duchy = new Building("Duchy", "", "DU", ["Building"], ["Friendly"], 3, 1, 2, 0, 0, false)
var province = new Building("Province", "", "PR", ["Building"], ["Friendly"], 6, 1, 4, 0, 0, false)

units.push(footman)
units.push(builder)
buildings.push(copperMine)
buildings.push(silverMine)
buildings.push(goldMine)
buildings.push(estate)
buildings.push(duchy)
buildings.push(province)

module.exports.buildings = buildings
module.exports.units = units
