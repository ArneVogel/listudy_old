const base_url = "http://localhost:8000/"

// https://github.com/ornicar/chessground/blob/master/src/config.ts
var chessGroundConfig = {
    fen: '',
    orientation: 'white',
    movable: {
        free: false,
        dropOff: 'revert',
        showDests: true
    }
}

function getChessGroundConfig(orientation, fen) {
    var a = chessGroundConfig;
    a["fen"] = fen;
    a["orientation"] = orientation;
    a["movable"]["color"] = orientation;
    return a;
}

module.exports = {
    base_url: base_url,
    getChessGroundConfig: getChessGroundConfig
}
