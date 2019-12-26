var piecesList = []


var footman = {name: "Footman", owner: "", boardAvatar: "FM", Types: "Unit", cost: 3, attack: 1, defense: 1, movement: 1, health: 1}

var copperMine = {name: "Copper Mine", owner: "", boardAvatar: "CM", Types: "Building", cost: 3, health: 1, coinProduction: 1, blackProduction: 0, whiteProduction: 0}
var silverMine = {name: "Silver Mine", owner: "", boardAvatar: "SM", Types: "Building", cost: 4, health: 1, coinProduction: 2, blackProduction: 0, whiteProduction: 0}
var goldMine = {name: "Gold Mine", owner: "", boardAvatar: "GM", Types: "Building", cost: 7, health: 1, coinProduction: 3, blackProduction: 0, whiteProduction: 0}

var whiteSmith = {name: "White Smith", owner: "", boardAvatar: "WS", Types: "Building", cost: 7, health: 1, coinProduction: 0, blackProduction: 0, whiteProduction: 1}
var blackSmith = {name: "Black Smith", owner: "", boardAvatar: "BS", Types: "Building", cost: 7, health: 1, coinProduction: 0, blackProduction: 1, whiteProduction: 0}

var estate = {name: "Estate", owner: "", boardAvatar: "ES", Types: "Building", pointValue: 1, cost: 3, health: 1, coinProduction: 0, blackProduction: 0, whiteProduction: 0}
var duchy = {name: "Duchy", owner: "", boardAvatar: "DU", Types: "Building", pointValue: 3, cost: 4, health: 1, coinProduction: 0, blackProduction: 0, whiteProduction: 0}
var province = {name: "Province", owner: "", boardAvatar: "PR", Types: "Building", pointValue: 6, cost: 7, health: 1, coinProduction: 0, blackProduction: 0, whiteProduction: 0}

piecesList.push(footman)
piecesList.push(copperMine)
piecesList.push(silverMine)
piecesList.push(goldMine)
piecesList.push(whiteSmith)
piecesList.push(blackSmith)
piecesList.push(estate)
piecesList.push(duchy)
piecesList.push(province)

module.exports = piecesList
