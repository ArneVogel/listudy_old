var kokopu = require('kokopu');
var Chessground = require("chessground").Chessground;
var utils = require('./utils/utils.js')
var consts = require('./utils/consts.js')

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
    //pos += "m"
    while (variation.next != undefined) {
        for (var i = 0; i < variation.variations.length; i++) {
            iterateMoves(variation.variations[i], pos + i)
        }
        console.log(pos, variation)
        variation = variation.next;
        pos += "m"
    }
}

function moveFromPos(game, pos) {
    console.log(game)
    game = game.first;
    for (var i = 0; i < pos.length; i++) {
        if (pos[i] == "m") {
            game = game.next;
        } else {
            game = game.variations[pos[i]].first;
        }
    }
    console.log(game)
}

function setToPos(game, position_string) {
    var position = game._initialPosition; 
    game = game._mainVariationInfo.first;
    for (var i = 0; i < position_string.length; i++) {
        console.log(position.fen())
        console.log(utils.toAlgebraic(game.moveDescriptor._from));
        console.log(utils.toAlgebraic(game.moveDescriptor._to));
        console.log(game.moveDescriptor);
        if (position_string[i] == "m") {
            position.play(game.moveDescriptor);
            game = game.next;
        } else {
            position.play(game.moveDescriptor);
            game = game.variations[position_string[i]].first;
        }
    }
    ground.set(consts.getChessGroundConfig(orientation, position.fen()))
    window.position = position;
    console.log(position.fen())
}

iterateMoves(game_db.game(0)._mainVariationInfo, "");
moveFromPos(game_db.game(0)._mainVariationInfo, "0m2mmm");
setToPos(game_db.game(0), "m");
window.setToPos = setToPos
