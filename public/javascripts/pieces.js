var units = []
var buildings = []

function Unit(name, owner, boardAvatar, Types, buildableZones, cost, power, movement, health) {
  this.Name = name;
  this.owner = owner;
  this.boardAvatar = boardAvatar;
  this.Types = Types;
  this.buildableZones = buildableZones
  this.cost = cost;
  this.power = power
  this.movement = movement
  this.health = health
}

function Building(name, owner, boardAvatar, Types, buildableZones, cost, health, pointValue, coinProduction, isFlat) {
  this.Name = name;
  this.owner = owner;
  this.boardAvatar = boardAvatar;
  this.Types = Types;
  this.buildableZones = buildableZones
  this.cost = cost;
  this.health = health
  this.pointValue = pointValue
  this.coinProduction = coinProduction
}

//units
var footman = new Unit("Footman", "", "FM", ["Unit"], ["Friendly"], 3, 1, 3, 1)
var builder = new Unit("Footman", "", "BU", ["Unit", "Builder"], ["Friendly"], 3, 0, 1, 1)

//buildings
//resources
var copperMine = new Building("Copper Mine", "", "CM", ["Building"], ["Friendly"], 3, 1, 0, 1, false)
var silverMine = new Building("Silver Mine", "", "SM", ["Building"], ["Friendly"], 4, 1, 0, 3, false)
var goldMine = new Building("Gold Mine", "", "GM", ["Building"], ["Friendly"], 7, 1, 0, 5, false)

//victories
var estate = new Building("Estate", "", "ES", ["Building"], ["Friendly"], 1, 1, 1, 0, false)
var duchy = new Building("Duchy", "", "DU", ["Building"], ["Friendly"], 3, 1, 2, 0, false)
var province = new Building("Province", "", "PR", ["Building"], ["Friendly"], 6, 1, 4, 0, false)

units.push(footman)
buildings.push(copperMine)
buildings.push(silverMine)
buildings.push(goldMine)
buildings.push(estate)
buildings.push(duchy)
buildings.push(province)

module.exports.buildings = buildings
module.exports.units = units
