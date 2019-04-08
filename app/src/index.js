var kokopu = require('kokopu');
var Chessground = require("chessground").Chessground;
var utils = require('./utils/utils.js')
var consts = require('./utils/consts.js')

var game_db = kokopu.pgnRead(pgn);
var ground = Chessground(document.getElementById("chessboard"), consts.getChessGroundConfig(orientation, game_db.game(0).initialPosition().fen()));
console.log(game_db)
console.log(game_db.game(0))
window.game_db = game_db
window.ground = ground
window.kokopu = kokopu
window.sToC = kokopu.squareToCoordinates
window.cToS = kokopu.coordinatesToSquare
window.translate = utils.toAlgebraic

console.log(kokopu.squareToCoordinates("b3"))
console.log(kokopu.coordinatesToSquare(1,2))

var a = game_db.game(0)._mainVariationInfo.first;
window.a = a;
while (a.next != undefined) {
    console.log(a.next)
    a = a.next
}
