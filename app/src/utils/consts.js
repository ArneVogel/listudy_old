var utils = require('./utils.js');
var handler = require('./handler.js');

const learn_threshold = 2; // what value should a card have to give hints
const base_url = "http://localhost:8000/";

// https://github.com/ornicar/chessground/blob/master/src/config.ts
var chessGroundConfig = {
    fen: '',
    orientation: 'white',
    turnColor: 'white',
    movable: {
        free: false,
        dropOff: 'revert',
        dests: {a2:["a3", "a4"], b1:["a3"]},
        showDests: true,
        events: {
            after: handler.handleMove
        }
    }
}

function getChessGroundConfig(orientation, fen) {
    var a = chessGroundConfig;
    a["fen"] = fen;
    a["orientation"] = orientation;
    a["turnColor"] = orientation;
    a["movable"]["color"] = orientation;
    return a;
}

module.exports = {
    base_url: base_url,
    getChessGroundConfig: getChessGroundConfig,
    learn_threshold: learn_threshold
}
