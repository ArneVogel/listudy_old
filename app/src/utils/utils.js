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

function movesFromMoveDescriptor(md) {
    return [toAlgebraic(md._from), toAlgebraic(md._to)];
}

function createSelectOptions(amount, selected) {
    var select = document.getElementById("game_number");
    select.innerHTML = "";
    for (var i = 0; i < amount; i++) {
        var opt = document.createElement("option");
        opt.value = i+1;
        opt.innerHTML = i+1;
        select.appendChild(opt);
    }
    select.selectedIndex = selected -1;
}

function submitProgress(study_id) {
    var progress = JSON.stringify(cards);
    var http = new XMLHttpRequest();
    url = location.protocol + '//' + location.hostname + ":8000/study/progress/" + study_id;
    http.open("POST", url, true);
    http.setRequestHeader("Content-type","application/x-www-form-urlencoded");
    var params = "progress=" + progress;
    http.send(params);
}
window.submitProgress = submitProgress;

module.exports = {
    toAlgebraic: toAlgebraic,
    movesFromMoveDescriptor: movesFromMoveDescriptor,
    createSelectOptions: createSelectOptions
}
