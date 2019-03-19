var kokopu = require('kokopu');
var Chessground = require("chessground").Chessground;
var utils = require('./utils/utils.js')
var consts = require('./utils/consts.js')

var game_db = kokopu.pgnRead(pgn);
var ground = Chessground(document.getElementById("chessboard"), consts.getChessGroundConfig(orientation));
console.log(consts.getChessGroundConfig("black"));
