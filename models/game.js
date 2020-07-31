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

    socket.on('request to cast a unit spell', function(casterTile, targetTile, targetID)
    {
      var game = gameUtilities.findGameFromSocketID(socket.id)

      if (game == null)
      {
        io.to(socket.id).emit("new log message", "No such game")
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

    socket.on('request tiles which can be built on', function(pieceToBuild, builderTile)
    {
      var game = gameUtilities.findGameFromSocketID(socket.id)

      if (game == null)
      {
        io.to(socket.id).emit("new log message", "No such game")
        return
      }

      var gamePiece = gameUtilities.findPieceInGameStores(game, pieceToBuild)

      if (gamePiece == null)
      {
        io.to(socket.id).emit("new log message", "Piece not in game")
        return        
      }

      var builder = game.board[builderTile.col][builderTile.row].piece

      if (builder == null)
      {
        io.to(socket.id).emit("new log message", "No builder")
        return
      }

      if (!builder.types.includes("Builder"))
      {
        io.to(socket.id).emit("new log message", "Not a Builder")
        return        
      }

      if (!builder.isActive)
      {
        io.to(socket.id).emit("new log message", "Builder not active")
        return        
      }

      var isRedPlayer = gameUtilities.findIfPlayerIsRedPlayerInGameFromSocketID(game, socket.id)
      var player = (isRedPlayer) ? game.redPlayer : game.bluePlayer

      if (!gameUtilities.findIfItsAPlayersTurnInGame(isRedPlayer, game))
      {
        io.to(socket.id).emit("new log message", "Not your turn")
        return  
      }

      if (gamePiece.cost > player.gold)
      {
        io.to(socket.id).emit("new log message", "Not enough gold")
        return
      }

      var buildableTiles = builder.buildableTiles(game, pieceToBuild)
      io.to(socket.id).emit('new active tiles', buildableTiles)
    })

    socket.on('request to build a piece', function(clientPieceToBuild, clientTileToBuildOn, tileOfBuilder)
    {
      var game = gameUtilities.findGameFromSocketID(socket.id)

      if (game == null)
      {
        io.to(socket.id).emit("new log message", "No such game")
        return
      }

      var gameTileToBuildOn = game.board[clientTileToBuildOn.col][clientTileToBuildOn.row]
      var isRedPlayer = gameUtilities.findIfPlayerIsRedPlayerInGameFromSocketID(game, socket.id)
      var player = (isRedPlayer) ? game.redPlayer : game.bluePlayer
      var builder = game.board[tileOfBuilder.col][tileOfBuilder.row].piece
      var gamePiece = _.cloneDeep(gameUtilities.findPieceInGameStores(game, clientPieceToBuild))

      if (gamePiece == null)
      {
        io.to(socket.id).emit("new log message", "Piece not in game")
        return      
      }  

      if (!gameUtilities.findIfItsAPlayersTurnInGame(isRedPlayer, game))
      {
        io.to(socket.id).emit("new log message", "Not your turn")
        return  
      }

      if (builder == null)
      {
        io.to(socket.id).emit("new log message", "No builder")
        return
      } 

      if (!builder.types.includes("Builder"))
      {
        io.to(socket.id).emit("new log message", "Not a Builder")
        return        
      }

      if (!builder.isActive)
      {
        io.to(socket.id).emit("new log message", "Builder not active")
        return        
      }

      if (gamePiece.cost > player.gold)
      {
        io.to(socket.id).emit("new log message", "Not enough gold")
        return
      }

      var tilesWhichCanBeBuiltOn = builder.buildableTiles(game, gamePiece)

      if(!tilesWhichCanBeBuiltOn.includes(gameTileToBuildOn))
      {
        io.to(socket.id).emit("new log message", "Can't build there")
        return        
      }

      if (gamePiece.isFlat)
        gameTileToBuildOn.flatPiece = gamePiece
      else
        gameTileToBuildOn.piece = gamePiece

      gamePiece.currentCol = gameTileToBuildOn.col
      gamePiece.currentRow = gameTileToBuildOn.row
      gamePiece.owner = (isRedPlayer) ? 'Red' : 'Blue'
      gamePiece.canReceiveFreeEnergyAtThisLocation = gamePiece.canReceiveFreeEnergy(game)
      builder.isActive = false
      player.gold -= gamePiece.cost

      if ("addReactionsWhenBuilt" in gamePiece)
        gamePiece.addReactionsWhenBuilt(game)

      if ("performOnBuildEffects" in gamePiece)
        gamePiece.performOnBuildEffects(game)

      io.to(game.host).emit("new log message", player.Name + " builds " + gamePiece.name + " on col: " + gameTileToBuildOn.col + " row: " + gameTileToBuildOn.row)
      io.to(game.host).emit('new game state', gameUtilities.convertServerGameToClientGame(game))
    })

    socket.on('request tiles which can be moved to and the paths there', function(tile)
    {
      var game = gameUtilities.findGameFromSocketID(socket.id)

      if (game == null)
      {
        io.to(socket.id).emit("new log message", "No such game")
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

    socket.on('request to energize a piece', function(tileToEnergizePieceOn, isFlatPiece)
    {
      var game = gameUtilities.findGameFromSocketID(socket.id)

      if (game == null)
      {
        io.to(socket.id).emit("new log message", "No such game")
        return
      }

      var isRedPlayer = gameUtilities.findIfPlayerIsRedPlayerInGameFromSocketID(game, socket.id)
      var player = (isRedPlayer) ? game.redPlayer : game.bluePlayer
      var tileToEnergizePieceOnile = game.board[tileToEnergizePieceOn.col][tileToEnergizePieceOn.row]

      if (!gameUtilities.findIfItsAPlayersTurnInGame(isRedPlayer, game))
      {
        io.to(socket.id).emit("new log message", "Not your turn")
        return  
      }

      if (isFlatPiece)
        var piece = tileToEnergizePieceOnile.flatPiece
      else
        var piece = tileToEnergizePieceOnile.piece

      if (!gameUtilities.findIfAPlayerOwnsAPiece(isRedPlayer, piece))
      {
        io.to(socket.id).emit("new log message", "You don't own that piece!")
        return        
      }

      //and piece can't store energy 
      if (piece.isActive)
      {
        io.to(socket.id).emit("new log message", "Already active and can't store energy")
        return       
      }

      if (piece.minimumEnergyNeededForActivation > player.energy)
      {
        io.to(socket.id).emit("new log message", "Not enough energy")
        return             
      }

      io.to(game.host).emit("new log message", player.Name + "'s " + piece.name + " on col: " + tileToEnergizePieceOnile.col + " row: " + tileToEnergizePieceOnile.row + " is energized")

      player.energy -= piece.minimumEnergyNeededForActivation

      piece.receiveEnergy(game, piece.minimumEnergyNeededForActivation)

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

      var isRedPlayer = gameUtilities.findIfPlayerIsRedPlayerInGameFromSocketID(game, socket.id)
      var activePlayer = (isRedPlayer) ? game.redPlayer : game.bluePlayer

      if (!gameUtilities.findIfItsAPlayersTurnInGame(isRedPlayer, game))
      {
        io.to(socket.id).emit("new log message", "Not your turn")
        return  
      }

      for (var tile of game.getAllTilesInListForm())
      {
        var piece = tile.piece
        var flatPiece = tile.flatPiece
        if (piece != null && "performEndOfTurnEffects" in piece && piece.isActive && gameUtilities.findIfAPlayerOwnsAPiece(isRedPlayer, piece))
          piece.performEndOfTurnEffects(game)
        if (flatPiece != null && "performEndOfTurnEffects" in flatPiece && flatPiece.isActive && gameUtilities.findIfAPlayerOwnsAPiece(isRedPlayer, flatPiece))
          flatPiece.performEndOfTurnEffects(game)
      }
    
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