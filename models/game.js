var gameUtilities = require('./gameUtilities.js')
var lobby = require('../models/lobby')
var constants = require('../utilities/constants.js');
var _ = require('lodash');

function activateSocket(io)
{
  io.on('connection', function(socket)
  {
    socket.on('new socket connected to game', function(name)
    {
      for (host in lobby.gameList)
      {
        if (lobby.gameList.hasOwnProperty(host) && (lobby.gameList[host].redPlayer.Name == name))
        {
          lobby.gameList[host].redPlayer.socketID = socket.id
          socket.join(host)
          io.to(socket.id).emit('new game data', gameUtilities.convertServerGameToClientGame(lobby.gameList[host]))
        }
        else if (lobby.gameList.hasOwnProperty(host) && (lobby.gameList[host].bluePlayer.Name == name))
        {
          lobby.gameList[host].bluePlayer.socketID = socket.id
          socket.join(host)
          io.to(socket.id).emit('new game data', gameUtilities.convertServerGameToClientGame(lobby.gameList[host]))
        }
      }
    })

    socket.on('request to end action phase', function()
    {
      var game = gameUtilities.findGameFromSocketID(socket.id)
      if (game == null)
      {
        io.to(socket.id).emit("new log message", "No such game")
        return
      }

      if (game.phase != "Action")
      {
        io.to(socket.id).emit("new log message", "Wrong phase")
        return      
      }

      var isRedPlayer = gameUtilities.findIfPlayerIsRedPlayerInGameFromSocketID(game, socket.id)
      var player = (isRedPlayer) ? game.redPlayer : game.bluePlayer

      if (!gameUtilities.findIfItsAPlayersTurnInGame(isRedPlayer, game))
      {
        io.to(socket.id).emit("new log message", "Not your turn")
        return  
      }

      game.phase = "Energize"

      io.to(game.host).emit('new game state', gameUtilities.convertServerGameToClientGame(game)) 
    })

    socket.on('request to cast a spell', function(inventoryPosition, targetTile, targetID)
    {
      var game = gameUtilities.findGameFromSocketID(socket.id)

      if (game == null)
      {
        io.to(socket.id).emit("new log message", "No such game")
        return
      }

      if (game.phase != "Action")
      {
        io.to(socket.id).emit("new log message", "Wrong phase")
        return      
      }

      var isRedPlayer = gameUtilities.findIfPlayerIsRedPlayerInGameFromSocketID(game, socket.id)
      var player = (isRedPlayer) ? game.redPlayer : game.bluePlayer
      var spell = player.inventory[inventoryPosition]

      if (spell == null)
      {
        io.to(socket.id).emit("new log message", "No spell to cast")
        return      
      }  

      if (targetID == "Tile")
        var target = game.board[targetTile.col][targetTile.row]
      else if(targetID == "Flat Piece")
        var target = game.board[targetTile.col][targetTile.row].flatPiece
      else if(targetID == "Piece")
        var target = game.board[targetTile.col][targetTile.row].piece 

      if (!gameUtilities.findIfItsAPlayersTurnInGame(isRedPlayer, game))
      {
        io.to(socket.id).emit("new log message", "Not your turn")
        return  
      }

      var tilesWhichCanBeCastOn = spell.getTilesWhichCanBeCastOn(game)

      if(!tilesWhichCanBeCastOn.includes(game.board[targetTile.col][targetTile.row]))
      {
        io.to(socket.id).emit("new log message", "Can't cast there")
        return        
      }

      spell.cast(game, target)
      player.inventory[inventoryPosition] = null

      if (targetID == "Tile")
        io.to(game.host).emit("new log message", player.Name + " casts " + spell.name + " on the tile: col: " + targetTile.col + " row: " + targetTile.row)
      else if(targetID == "Flat Piece")
        io.to(game.host).emit("new log message", player.Name + " casts " + spell.name + " on the flat piece at: col: " + targetTile.col + " row: " + targetTile.row)
      else
        io.to(game.host).emit("new log message", player.Name + " casts " + spell.name + " on the piece at: col: " + targetTile.col + " row: " + targetTile.row)

      io.to(game.host).emit('new game state', gameUtilities.convertServerGameToClientGame(game))
    })

    socket.on('request to cast a unit spell', function(casterTile, targetTile, targetID)
    {
      var game = gameUtilities.findGameFromSocketID(socket.id)

      if (game == null)
      {
        io.to(socket.id).emit("new log message", "No such game")
        return
      }

      if (game.phase != "Action")
      {
        io.to(socket.id).emit("new log message", "Wrong phase")
        return      
      }

      var isRedPlayer = gameUtilities.findIfPlayerIsRedPlayerInGameFromSocketID(game, socket.id)
      var player = (isRedPlayer) ? game.redPlayer : game.bluePlayer

      if (targetID == "Tile")
        var target = game.board[targetTile.col][targetTile.row]
      else if(targetID == "Flat Piece")
        var target = game.board[targetTile.col][targetTile.row].flatPiece
      else if(targetID == "Piece")
        var target = game.board[targetTile.col][targetTile.row].piece

      var caster = game.board[casterTile.col][casterTile.row].piece

      if (!caster.hasUnitSpells)
      {
        io.to(socket.id).emit("new log message", "No spell to cast")
        return      
      }

      if(!caster.isActive)
      {
        io.to(socket.id).emit("new log message", "Piece is inactive")
        return       
      }

      if (!gameUtilities.findIfItsAPlayersTurnInGame(isRedPlayer, game))
      {
        io.to(socket.id).emit("new log message", "Not your turn")
        return  
      }

      var tilesWhichCanBeCastOn = caster.getTilesThatUnitSpellCanBeCastOn(game)

      if(!tilesWhichCanBeCastOn.includes(game.board[targetTile.col][targetTile.row]))
      {
        io.to(socket.id).emit("new log message", "Can't cast there")
        return        
      }

      caster.castSpell(game, target)

      if (targetID == "Tile")
        io.to(game.host).emit("new log message", player.Name + "'s " + caster.name + " casts its unit spell on the tile: col: " + targetTile.col + " row: " + targetTile.row)
      else if(targetID == "Flat Piece")
        io.to(game.host).emit("new log message", player.Name + "'s " + caster.name + " casts its unit spell on the flat piece at: col: " + targetTile.col + " row: " + targetTile.row)
      else
        io.to(game.host).emit("new log message", player.Name + "'s " + caster.name + " casts its unit spell on the piece at: col: " + targetTile.col + " row: " + targetTile.row)

      io.to(game.host).emit('new game state', gameUtilities.convertServerGameToClientGame(game))
    })

   socket.on('request tiles unit can cast on', function(pieceSpellCasterTile)
    {
      var game = gameUtilities.findGameFromSocketID(socket.id)
      var pieceSpellCaster = game.board[pieceSpellCasterTile.col][pieceSpellCasterTile.row].piece

      if (game == null)
      {
        io.to(socket.id).emit("new log message", "No such game")
        return
      }

      if (game.phase != "Action")
      {
        io.to(socket.id).emit("new log message", "Wrong phase")
        return      
      }

      if(!pieceSpellCaster.isActive)
      {
        io.to(socket.id).emit("new log message", "Piece is inactive")
        return       
      }

      var isRedPlayer = gameUtilities.findIfPlayerIsRedPlayerInGameFromSocketID(game, socket.id)
      var player = (isRedPlayer) ? game.redPlayer : game.bluePlayer

      if (!gameUtilities.findIfItsAPlayersTurnInGame(isRedPlayer, game))
      {
        io.to(socket.id).emit("new log message", "Not your turn")
        return  
      }

      var castableTiles = pieceSpellCaster.getTilesThatUnitSpellCanBeCastOn(game)
      io.to(socket.id).emit('new active tiles', castableTiles) 
    })

    socket.on('request tiles which can be cast on', function(inventoryPosition)
    {
      var game = gameUtilities.findGameFromSocketID(socket.id)

      if (game == null)
      {
        io.to(socket.id).emit("new log message", "No such game")
        return
      }

      if (game.phase != "Action")
      {
        io.to(socket.id).emit("new log message", "Wrong phase")
        return      
      }

      var isRedPlayer = gameUtilities.findIfPlayerIsRedPlayerInGameFromSocketID(game, socket.id)
      var player = (isRedPlayer) ? game.redPlayer : game.bluePlayer

      if (!gameUtilities.findIfItsAPlayersTurnInGame(isRedPlayer, game))
      {
        io.to(socket.id).emit("new log message", "Not your turn")
        return  
      }

      var spell = player.inventory[inventoryPosition]

      var castableTiles = spell.getTilesWhichCanBeCastOn(game)
      io.to(socket.id).emit('new active tiles', castableTiles) 
    })

    socket.on('request tiles which can be attacked', function(tile)
    {
      var game = gameUtilities.findGameFromSocketID(socket.id)
      if (game == null)
      {
        io.to(socket.id).emit("new log message", "No such game")
        return
      }

      if (game.phase != "Action")
      {
        io.to(socket.id).emit("new log message", "Wrong phase")
        return      
      }

      var gameTile = game.board[tile.col][tile.row]
      var gamePiece = gameTile.piece
      var isRedPlayer = gameUtilities.findIfPlayerIsRedPlayerInGameFromSocketID(game, socket.id)
      var player = (isRedPlayer) ? game.redPlayer : game.bluePlayer

      if (!gameUtilities.findIfItsAPlayersTurnInGame(isRedPlayer, game))
      {
        io.to(socket.id).emit("new log message", "Not your turn")
        return  
      }

      if (!gameUtilities.findIfAPlayerOwnsAPiece(isRedPlayer, gameTile.piece))
      {
        io.to(socket.id).emit("new log message", "You don't own that piece!")
        return        
      }

      if(!gameTile.piece.isActive)
      {
        io.to(socket.id).emit("new log message", "Piece is inactive")
        return       
      }

      var attackableTiles = gamePiece.getAttackableTiles(game)
      io.to(socket.id).emit('new active tiles', attackableTiles) 
    })


   socket.on('request to attack a piece', function(attackerTile, victimTile, isAttackingFlatPiece)
    {
      var game = gameUtilities.findGameFromSocketID(socket.id)

      if (game == null)
      {
        io.to(socket.id).emit("new log message", "No such game")
        return
      }

      if (game.phase != "Action")
      {
        io.to(socket.id).emit("new log message", "Wrong phase")
        return      
      }

      var gameVictimTile = game.board[victimTile.col][victimTile.row]
      var gameAttackerTile = game.board[attackerTile.col][attackerTile.row]
      var victimPiece = isAttackingFlatPiece ? gameVictimTile.flatPiece : gameVictimTile.piece 
      var attackerPiece = gameAttackerTile.piece

      var isRedPlayer = gameUtilities.findIfPlayerIsRedPlayerInGameFromSocketID(game, socket.id)
      var player = (isRedPlayer) ? game.redPlayer : game.bluePlayer

      if (!gameUtilities.findIfItsAPlayersTurnInGame(isRedPlayer, game))
      {
        io.to(socket.id).emit("new log message", "Not your turn")
        return  
      }

      if (!gameUtilities.findIfAPlayerOwnsAPiece(isRedPlayer, attackerPiece))
      {
        io.to(socket.id).emit("new log message", "You don't own that piece!")
        return        
      }

      var attackableTiles = attackerPiece.getAttackableTiles(game)

      if (!attackableTiles.includes(gameVictimTile))
      {
        io.to(socket.id).emit("new log message", "Attack out of range")
        return              
      }

      if(!attackerPiece.isActive)
      {
        io.to(socket.id).emit("new log message", "Piece is inactive")
        return       
      }

      io.to(game.host).emit("new log message", player.Name + "'s " + attackerPiece.name + " attacks the " + victimPiece.name + " on col: " + gameVictimTile.col + " row: " + gameVictimTile.row)

      attackerPiece.attack(game, victimPiece)

      io.to(game.host).emit('new game state', gameUtilities.convertServerGameToClientGame(game))
    })

    socket.on('request tiles which can be built on', function(inventoryPosition)
    {
      var game = gameUtilities.findGameFromSocketID(socket.id)

      if (game == null)
      {
        io.to(socket.id).emit("new log message", "No such game")
        return
      }

      if (game.phase != "Action")
      {
        io.to(socket.id).emit("new log message", "Wrong phase")
        return      
      }

      var isRedPlayer = gameUtilities.findIfPlayerIsRedPlayerInGameFromSocketID(game, socket.id)
      var player = (isRedPlayer) ? game.redPlayer : game.bluePlayer

      if (!gameUtilities.findIfItsAPlayersTurnInGame(isRedPlayer, game))
      {
        io.to(socket.id).emit("new log message", "Not your turn")
        return  
      }

      gamePiece = player.inventory[inventoryPosition]

      var buildableTiles = gamePiece.getTilesWhichCanBeBuiltOn(game)
      io.to(socket.id).emit('new active tiles', buildableTiles) 
    })

    socket.on('request to build a piece', function(inventoryPosition, tile)
    {
      var game = gameUtilities.findGameFromSocketID(socket.id)

      if (game == null)
      {
        io.to(socket.id).emit("new log message", "No such game")
        return
      }

      if (game.phase != "Action")
      {
        io.to(socket.id).emit("new log message", "Wrong phase")
        return      
      }

      var tileToBuildOn = game.board[tile.col][tile.row]
      var isRedPlayer = gameUtilities.findIfPlayerIsRedPlayerInGameFromSocketID(game, socket.id)
      var player = (isRedPlayer) ? game.redPlayer : game.bluePlayer
      var piece = player.inventory[inventoryPosition]

      if (piece == null)
      {
        io.to(socket.id).emit("new log message", "No piece to build")
        return      
      }  

      if (!gameUtilities.findIfItsAPlayersTurnInGame(isRedPlayer, game))
      {
        io.to(socket.id).emit("new log message", "Not your turn")
        return  
      }

      var tilesWhichCanBeBuiltOn = piece.getTilesWhichCanBeBuiltOn(game)

      if(!tilesWhichCanBeBuiltOn.includes(tileToBuildOn))
      {
        io.to(socket.id).emit("new log message", "Can't build there")
        return        
      }

      if (piece.isFlat)
        tileToBuildOn.flatPiece = piece
      else
        tileToBuildOn.piece = piece

      piece.currentCol = tileToBuildOn.col
      piece.currentRow = tileToBuildOn.row

      piece.canReceiveFreeEnergyAtThisLocation = piece.canReceiveFreeEnergy(game)

      if ("addReactionsWhenBuilt" in piece)
        piece.addReactionsWhenBuilt(game)

      if ("performOnBuildEffects" in piece)
        piece.performOnBuildEffects(game)

      player.inventory[inventoryPosition] = undefined

      io.to(game.host).emit("new log message", player.Name + " builds a(n) " + piece.name + " on col: " + tileToBuildOn.col + " row: " + tileToBuildOn.row)
      io.to(game.host).emit('new game state', gameUtilities.convertServerGameToClientGame(game))
    })

    socket.on('request tiles which can be moved to and the paths there', function(tile)
    {
      var game = gameUtilities.findGameFromSocketID(socket.id)
      var gameTile = game.board[tile.col][tile.row]
      var gamePiece = gameTile.piece

      if (game == null)
      {
        io.to(socket.id).emit("new log message", "No such game")
        return
      }

      if (game.phase != "Action")
      {
        io.to(socket.id).emit("new log message", "Wrong phase")
        return      
      }

      var isRedPlayer = gameUtilities.findIfPlayerIsRedPlayerInGameFromSocketID(game, socket.id)
      var player = (isRedPlayer) ? game.redPlayer : game.bluePlayer

      if (!gameUtilities.findIfItsAPlayersTurnInGame(isRedPlayer, game))
      {
        io.to(socket.id).emit("new log message", "Not your turn")
        return  
      }

      if (!gameUtilities.findIfAPlayerOwnsAPiece(isRedPlayer, gameTile.piece))
      {
        io.to(socket.id).emit("new log message", "You don't own that piece!")
        return        
      }

      if(!gameTile.piece.isActive)
      {
        io.to(socket.id).emit("new log message", "Piece is inactive")
        return       
      }

      var tilesThatCanBeMovedToAndThePathThere = gamePiece.getTilesWhichCanBeMovedToAndThePathThere(game)
      var listOfTilesAndPathsForClient = []

      for (tile of tilesThatCanBeMovedToAndThePathThere.keys())
      {
        var newTileAndPathList = []
        newTileAndPathList.push(tile)

        for (pathTile of tilesThatCanBeMovedToAndThePathThere.get(tile))
          newTileAndPathList.push(pathTile)

        listOfTilesAndPathsForClient.push(newTileAndPathList)
      }

      io.to(socket.id).emit('new tiles that can be moved to and the paths there', listOfTilesAndPathsForClient) 
    })

    socket.on('request to move a piece', function(fTile, tTile)
    {
      var game = gameUtilities.findGameFromSocketID(socket.id)

      if (game == null)
      {
        io.to(socket.id).emit("new log message", "No such game")
        return
      }

      if (game.phase != "Action")
      {
        io.to(socket.id).emit("new log message", "Wrong phase")
        return      
      }

      var isRedPlayer = gameUtilities.findIfPlayerIsRedPlayerInGameFromSocketID(game, socket.id)
      var player = (isRedPlayer) ? game.redPlayer : game.bluePlayer

      if (!gameUtilities.findIfItsAPlayersTurnInGame(isRedPlayer, game))
      {
        io.to(socket.id).emit("new log message", "Not your turn")
        return  
      }

      var fromTile = game.board[fTile.col][fTile.row]
      var toTile = game.board[tTile.col][tTile.row]
      var movingPiece = fromTile.piece

      if (gameUtilities.getDistanceBetweenTwoTiles(fromTile, toTile) > movingPiece.movement)
      {
        io.to(socket.id).emit("new log message", "Not enough movement")
        return
      }

      if (!gameUtilities.findIfAPlayerOwnsAPiece(isRedPlayer, movingPiece))
      {
        io.to(socket.id).emit("new log message", "You don't own that piece!")
        return        
      }

      if(!movingPiece.isActive)
      {
        io.to(socket.id).emit("new log message", "Piece is inactive")
        return       
      }

      var moveableTilesAndThePathThere = movingPiece.getTilesWhichCanBeMovedToAndThePathThere(game)

      if (!moveableTilesAndThePathThere.has(toTile))
      {
        io.to(socket.id).emit("new log message", "Piece can't move there")
        return  
      }

      io.to(game.host).emit("new log message", player.Name + "'s " + movingPiece.name + " moves from col: " + fromTile.col + " row: " + fromTile.row + " to col: " + toTile.col + " row: " + toTile.row)
      movingPiece.move(game, moveableTilesAndThePathThere.get(toTile))
      io.to(game.host).emit('new game state', gameUtilities.convertServerGameToClientGame(game))   
    })

    socket.on('request to energize', function(energizeT, isFlatPiece)
    {
      var game = gameUtilities.findGameFromSocketID(socket.id)

      if (game == null)
      {
        io.to(socket.id).emit("new log message", "No such game")
        return
      }

      if (game.phase != "Energize")
      {
        io.to(socket.id).emit("new log message", "Wrong phase")
        return      
      }

      var isRedPlayer = gameUtilities.findIfPlayerIsRedPlayerInGameFromSocketID(game, socket.id)
      var player = (isRedPlayer) ? game.redPlayer : game.bluePlayer
      var energizeTile = game.board[energizeT.col][energizeT.row]

      if (!gameUtilities.findIfItsAPlayersTurnInGame(isRedPlayer, game))
      {
        io.to(socket.id).emit("new log message", "Not your turn")
        return  
      }

      if (isFlatPiece)
        var piece = energizeTile.flatPiece
      else
        var piece = energizeTile.piece

      if (!gameUtilities.findIfAPlayerOwnsAPiece(isRedPlayer, piece))
      {
        io.to(socket.id).emit("new log message", "You don't own that piece!")
        return        
      }


      if (piece.energy >= piece.energyCapacity)
      {
        io.to(socket.id).emit("new log message", "Already at maxmimum energy")
        return       
      }

      if (player.activeEnergy >= player.energyCapacity)
      {
        io.to(socket.id).emit("new log message", "No free energy")
        return             
      }

      io.to(game.host).emit("new log message", player.Name + "'s " + piece.name + " on col: " + energizeTile.col + " row: " + energizeTile.row + " receives an energy")
      piece.increaseEnergy(game)

      io.to(game.host).emit('new game state', gameUtilities.convertServerGameToClientGame(game))     
    })

    socket.on('request piece purchase', function(clientPiece)
    {

      var game = gameUtilities.findGameFromSocketID(socket.id)

      if (clientPiece == null)
      {
        io.to(socket.id).emit("new log message", "No piece requested")
        return
      }

      if (game == null)
      {
        io.to(socket.id).emit("new log message", "No such game")
        return
      }

      if (game.phase != "Action")
      {
        io.to(socket.id).emit("new log message", "Wrong phase")
        return      
      }

      var piece = game.baseSet[clientPiece.name]

      // TODO extract finding a piece to a helper
      if (piece == null) {
        if (clientPiece.types.includes("Building"))
          piece = game.nonBaseSetBuildings[clientPiece.name]
        else if (clientPiece.types.includes("Unit"))
          piece = game.nonBaseSetUnits[clientPiece.name]
        else
          piece = game.nonBaseSetSpells[clientPiece.name]
      }

      if (piece == null)
      {
        io.to(socket.id).emit("new log message", "Piece not in game")
        return
      }

      var isRedPlayer = gameUtilities.findIfPlayerIsRedPlayerInGameFromSocketID(game, socket.id)
      var player = (isRedPlayer) ? game.redPlayer : game.bluePlayer

      if (!gameUtilities.findIfItsAPlayersTurnInGame(isRedPlayer, game))
      {
        io.to(socket.id).emit("new log message", "Not your turn")
        return  
      }

      if (player.gold < piece.cost)
      {
        io.to(socket.id).emit("new log message", "Not enough money")
        return
      }

      if (!player.inventory.includes(undefined))
      {
        io.to(socket.id).emit("new log message", "No room in inventory")
        return
      }

      player.gold = player.gold - piece.cost
      for (var i = 0; i < player.inventory.length; i++) 
      {
          if (player.inventory[i] == undefined)
          {
            var newPiece = _.cloneDeep(piece);
            player.inventory[i] = newPiece
            if (isRedPlayer)
              newPiece.owner = "Red"
            else
              newPiece.owner = "Blue"
            break
          }
      }

      io.to(game.host).emit("new log message", player.Name + " buys a " + piece.name)
      io.to(game.host).emit('new game state', gameUtilities.convertServerGameToClientGame(game))
    })

    socket.on('request to end turn', function()
    {
      var game = gameUtilities.findGameFromSocketID(socket.id)

      if (game == null)
      {
        io.to(socket.id).emit("new log message", "No such game")
        return
      }

      if (game.phase != "Energize")
      {
        io.to(socket.id).emit("new log message", "Wrong phase")
        return      
      }

      var isRedPlayer = gameUtilities.findIfPlayerIsRedPlayerInGameFromSocketID(game, socket.id)
      var activePlayer = (isRedPlayer) ? game.redPlayer : game.bluePlayer

      //collection and end of turn activation, effects
      gameUtilities.restoreMovementForPlayersPieces(game, isRedPlayer)
      gameUtilities.activatePieces(game, isRedPlayer)
      activePlayer.goldProduction = gameUtilities.countGoldProductionForPlayer(game, isRedPlayer)
      activePlayer.gold += activePlayer.goldProduction
      activePlayer.energyCapacity = gameUtilities.countEnergyCapacityProductionForPlayer(game, isRedPlayer)
      activePlayer.victoryPointTokenProduction = gameUtilities.countVictoryPointTokenProductionForPlayer(game, isRedPlayer)

      for (var tile of game.getAllTilesInListForm())
      {
        var piece = tile.piece
        var flatPiece = tile.flatPiece
        if (piece != null && "performEndOfTurnEffects" in piece && piece.isActive && gameUtilities.findIfAPlayerOwnsAPiece(isRedPlayer, piece))
          piece.performEndOfTurnEffects(game)
        if (flatPiece != null && "performEndOfTurnEffects" in flatPiece && flatPiece.isActive && gameUtilities.findIfAPlayerOwnsAPiece(isRedPlayer, flatPiece))
          flatPiece.performEndOfTurnEffects(game)
      }
    
      if (game.victoryPointTokenSupply < activePlayer.victoryPointTokenProduction)
      {
        activePlayer.victoryPoints += game.victoryPointTokenSupply
        game.victoryPointTokenSupply = 0
      }
      else
      {
        activePlayer.victoryPoints += activePlayer.victoryPointTokenProduction
        game.victoryPointTokenSupply -= activePlayer.victoryPointTokenProduction
      }

      if (game.victoryPointTokenSupply >= game.victoryPointTokenDrip)
        game.victoryPointTokenSupply -= game.victoryPointTokenDrip
      else
        game.victoryPointTokenSupply = 0

      //check for dead HQ
      if (game.board[4][1].piece == null || game.board[4][13].piece == null)
      {
        io.to(game.host).emit("new log message", "Game over, HQ destroyed")      

        if (game.board[4][1].piece == null && game.board[4][13].piece == null)
          io.to(game.host).emit("new log message", "It's a tie")
        else if (game.board[4][1].piece == null)
          io.to(game.host).emit("new log message", "Blue Player Wins")
        else
          io.to(game.host).emit("new log message", "Red Player Wins")

        //gameList[host] = null
        return
      }

      //check for end of game through VP tokens
      if (game.victoryPointTokenSupply == 0)
      {
        io.to(game.host).emit("new log message", "Game over on victory point tokens")      
        
        if (game.redPlayer.victoryPoints > game.bluePlayer.victoryPoints)
          io.to(game.host).emit("new log message", "Red Player Wins")
        else if (game.bluePlayer.victoryPoints > game.redPlayer.victoryPoints || isRedPlayer)
          io.to(game.host).emit("new log message", "Blue Player Wins")
        else
          io.to(game.host).emit("new log message", "It's a tie")

        //gameList[host] = null
        return
      }

      //switch players turn
      game.isRedPlayersTurn = !game.isRedPlayersTurn
      isRedPlayer = !isRedPlayer
      game.phase = "Action"

      for (var tile of game.getAllTilesInListForm())
      {
        var piece = tile.piece
        var flatPiece = tile.flatPiece
        if (piece != null && "performStartOfTurnEffects" in piece && piece.isActive && gameUtilities.findIfAPlayerOwnsAPiece(isRedPlayer, piece))
          piece.performStartOfTurnEffects(game)
        if (flatPiece != null && "performStartOfTurnEffects" in flatPiece && flatPiece.isActive && gameUtilities.findIfAPlayerOwnsAPiece(isRedPlayer, flatPiece))
          flatPiece.performStartOfTurnEffects(game)
      }

      if (game.isRedPlayersTurn)
        io.to(game.host).emit("new log message", game.redPlayer.Name + "'s turn")
      else
        io.to(game.host).emit("new log message", game.bluePlayer.Name + "'s turn")

      io.to(game.host).emit('new game state', gameUtilities.convertServerGameToClientGame(game)) 
    })
  })
}

module.exports = 
{
  activateSocket
}