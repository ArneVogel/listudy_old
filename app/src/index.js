var kokopu = require('kokopu');
var Chessground = require("chessground").Chessground;
var utils = require('./utils/utils.js');
var consts = require('./utils/consts.js');

var game_db = kokopu.pgnRead(pgn);
var game_div = document.getElementById("chessboard")
var ground = Chessground(game_div, consts.getChessGroundConfig(orientation, game_db.game(0).initialPosition().fen()));

//console.log(game_db)
//console.log(game_db.game(0))
window.game_db = game_db
window.ground = ground
window.kokopu = kokopu
window.sToC = kokopu.squareToCoordinates
window.cToS = kokopu.coordinatesToSquare
window.translate = utils.toAlgebraic
window.getConfig = consts.getChessGroundConfig
//console.log(kokopu.squareToCoordinates("b3"))
//console.log(kokopu.coordinatesToSquare(1,2))

var a = game_db.game(0)._mainVariationInfo.first;
window.a = a;
function iterateMoves(game, pos) {
    var variation = game.first;
    while (variation.next != undefined) {
        for (var i = 0; i < variation.variations.length; i++) {
            iterateMoves(variation.variations[i], pos + i)
        }
        variation = variation.next;
        pos += "m"
        cards[pos] = 0
    }
}

function possibleMoves(game, pos) {
    var position = new kokopu.Position();
    game = game._mainVariationInfo.first;
    for (var i = 0; i < pos.length; i++) {
        if (pos[i] == "m") {
            game = game.next;
        } else {
            game = game.variations[pos[i]].first;
        }
    }
    var moves = [];
    moves.push(position.notation(game.moveDescriptor))
    for (var i = 0; i < game.variations.length; i++) {
        moves.push(position.notation(game.variations[i].first.moveDescriptor))
    }
    return moves;
}

function allLegalMoves(game, position_string) {
    var position = game._initialPosition; 
    game = game._mainVariationInfo.first;
    for (var i = 0; i < position_string.length; i++) {
        if (position_string[i] == "m") {
            position.play(position.notation(game.moveDescriptor));
            game = game.next;
        } else {
            position.play(position.notation(game.variations[position_string[i]].first.moveDescriptor));
            game = game.variations[position_string[i]].first.next;
        }
    }
    moves_moveDescriptor = position.moves();
    moves = {}
    for (var i = 0; i < moves_moveDescriptor.length; i++) {
        if (moves[utils.toAlgebraic(moves_moveDescriptor[i]._from)] == undefined) {
            moves[utils.toAlgebraic(moves_moveDescriptor[i]._from)] = [utils.toAlgebraic(moves_moveDescriptor[i]._to)]
        } else {
            moves[utils.toAlgebraic(moves_moveDescriptor[i]._from)].push(utils.toAlgebraic(moves_moveDescriptor[i]._to))
        }
    }
    return moves;
}
window.allLegalMoves = allLegalMoves;

function setToPos(game, position_string) {
    var position = game._initialPosition; 
    game = game._mainVariationInfo.first;
    for (var i = 0; i < position_string.length; i++) {
        if (position_string[i] == "m") {
            position.play(position.notation(game.moveDescriptor));
            game = game.next;
        } else {
            position.play(position.notation(game.variations[position_string[i]].first.moveDescriptor));
            game = game.variations[position_string[i]].first.next;
        }
    }
    ground.set(consts.getChessGroundConfig(orientation, position.fen()))
}

cards = {}
iterateMoves(game_db.game(0)._mainVariationInfo, "");
setToPos(game_db.game(0), "m");
window.setToPos = setToPos;
window.possibleMoves = possibleMoves;
window.cards = cards;
console.log(cards)
setToPos(game_db.game(0), "");
ground.state.movable.dests = allLegalMoves(game_db.game(0), "")
