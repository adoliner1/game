var units = []
var buildings = []

function Unit(name, owner, boardAvatar, Types, cost, attack, defense, movement, health) {
  this.Name = name;
  this.owner = owner;
  this.boardAvatar = boardAvatar;
  this.Types = Types;
  this.cost = cost;
  this.attack = attack
  this.defense = defense
  this.movement = movement
  this.health = health
}

function Building(name, owner, boardAvatar, Types, cost, health, pointValue, coinProduction, blackProduction, whiteProduction) {
  this.Name = name;
  this.owner = owner;
  this.boardAvatar = boardAvatar;
  this.Types = Types;
  this.cost = cost;
  this.health = health
  this.pointValue = pointValue
  this.coinProduction = coinProduction
  this.blackProduction = blackProduction
  this.whiteProduction = whiteProduction
}

//units
var footman = new Unit("Footman", "", "FM", "Unit", 3, 1, 1, 1, 1)

//buildings
//resources
var copperMine = new Building("Copper Mine", "", "CM", "Building", 3, 1, 0, 1, 0, 0)
var silverMine = new Building("Silver Mine", "", "SM", "Building", 4, 1, 0, 3, 0, 0)
var goldMine = new Building("Gold Mine", "", "GM", "Building", 7, 1, 0, 5, 0, 0)
var whiteSmith = new Building("White Smith", "", "WS", "Building", 4, 1, 0, 0, 0, 1)
var blackSmith = new Building("Black Smith", "", "BS", "Building", 4, 1, 0, 0, 1, 0)

//victories
var estate = new Building("Estate", "", "ES", "Building", 1, 1, 1, 0, 0, 0)
var duchy = new Building("Duchy", "", "DU", "Building", 3, 1, 2, 0, 0, 0)
var province = new Building("Province", "", "PR", "Building", 6, 1, 4, 0, 0, 0)

units.push(footman)
buildings.push(copperMine)
buildings.push(silverMine)
buildings.push(goldMine)
buildings.push(whiteSmith)
buildings.push(blackSmith)
buildings.push(estate)
buildings.push(duchy)
buildings.push(province)

module.exports.buildings = buildings
module.exports.units = units
