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

function createSelectOptions(game_db, selected) {
    var select = document.getElementById("game_number");
    select.innerHTML = "";
    for (var i = 0; i < game_db.gameCount(); i++) {
        var opt = document.createElement("option");
        opt.value = i+1;
        opt.innerHTML = i+1 + ": " + game_db.game(i)._event;
        select.appendChild(opt);
    }
    select.selectedIndex = selected -1;
}

function submitProgress(study_id) {
    var progress = JSON.stringify(cards);
    var http = new XMLHttpRequest();
    var full = location.protocol+'//'+location.hostname+(location.port ? ':'+location.port: '');
    url = full + "/study/progress/" + study_id;
    http.open("POST", url, true);
    http.setRequestHeader("Content-type","application/x-www-form-urlencoded");
    var params = "progress=" + progress;
    http.send(params);
}
window.submitProgress = submitProgress;

function favorite(study_id) {
    var http = new XMLHttpRequest();
    var full = location.protocol+'//'+location.hostname+(location.port ? ':'+location.port: '');
    url = full + "/study/favorite/" + study_id;
    http.open("POST", url, true);
    http.setRequestHeader("Content-type","application/x-www-form-urlencoded");
    http.send();
    button = document.getElementById("favoriteButton");
    button.style.visibility = "hidden"
    button.style.width = 0;
    button.style.padding = 0;
}
window.favorite = favorite;

function toggleHelp() {
    window.help = !help;
    if (window.help) {
        drawShapes();
        drawCustomShapes();
        updateComments();
        document.getElementById("help").innerHTML = "Disable help";
    } else {
        document.getElementById("help").innerHTML = "Enable help";
    }
}
window.toggleHelp = toggleHelp;


module.exports = {
    toAlgebraic: toAlgebraic,
    movesFromMoveDescriptor: movesFromMoveDescriptor,
    createSelectOptions: createSelectOptions
}
