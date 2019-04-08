var kokopu = require('kokopu');

//translates the number kokopu gives a square to algebraic notation
function toAlgebraic(i) {
    rank = 0;
    while (rank*16 <= i) {
        rank += 1;
    }
    rank -= 1;
    file = i % 8;
    return kokopu.coordinatesToSquare(file,rank);
}

module.exports = {
    toAlgebraic: toAlgebraic
}
