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
    url = full + "/submit-progress/" + study_id;
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

function existsLonger(cards, card) {
    for (var i of Object.keys(cards)) {
        if (i.startsWith(card) && i.length > card.length) {
            return true;
        }
    }
    return false;
}

function updateProgress() {
    spanPercent = document.getElementById("progress");

    total = 0;
    learned = 0;
    cardsInBox = {0:0, 1:0, 2:0, 3:0, 4:0, 5:0};
    for (var i = 0; i < Object.keys(cards).length; i++) {
        var all = Object.keys(cards[i]);
        var hasLonger = [];
        for (var k of all) {
            if (existsLonger(cards[i], k)) {
                hasLonger.push(k);
            }
        }
        total += hasLonger.length * 4;


        for (var j of Object.keys(cards[i])) {
            if (existsLonger(cards[i], j)) {
                learned += cards[i][j];
                cardsInBox[cards[i][j]] += 1;
            }
        }
    }

    percentage = Math.round((learned/total)*100);
    spanPercent.innerHTML = percentage;

    for (var i = 0; i < 5; i++) {
        document.getElementById("box"+(i+1)).innerHTML = cardsInBox[i]
    }
}
window.updateProgress = updateProgress;

function changeTrainingMode() {
    var v = document.getElementById("training_mode").value;
    localStorage.setItem("training_mode", v);
}
window.changeTrainingMode = changeTrainingMode;

function initTrainingMode() {
    var v = document.getElementById("training_mode").value = localStorage.getItem("training_mode");
}
window.initTrainingMode = initTrainingMode;


//displays the info box, for example this move exists but in a different line
function writeInfo(info_text, s = "default") {
    var info = document.getElementById("info");
    info.innerHTML = "";
    info.className = "";
    if (s !== "default") {
        var i = document.createElement("i");
        i.className += s + "_icon";
        info.className += " " + s + "_wrapper";
        info.className += " message_wrapper";
        info.prepend(i);
    }
    info.innerHTML += info_text;
}
window.writeInfo = writeInfo;


module.exports = {
    toAlgebraic: toAlgebraic,
    movesFromMoveDescriptor: movesFromMoveDescriptor,
    createSelectOptions: createSelectOptions
}

function applyBoardStyle(call) {
    if (localStorage.getItem("board_background") == null) {
        localStorage.setItem("board_background", "blue");
        localStorage.setItem("board_pieces", "merida");
        localStorage.setItem("board_size", "small");
    } 
    if (call == "load") {
        document.getElementById("board_background").value = localStorage.getItem("board_background");
        document.getElementById("board_pieces").value = localStorage.getItem("board_pieces");
        document.getElementById("board_size").value = localStorage.getItem("board_size");
    } else if (call == "change") {
        localStorage.setItem("board_background", document.getElementById("board_background").value);
        localStorage.setItem("board_pieces", document.getElementById("board_pieces").value);
        localStorage.setItem("board_size", document.getElementById("board_size").value);
    }
    
    //apply styles to outer div of chessboard 
    var b = document.getElementById("board_styles");
    b.classList = [`${localStorage.getItem("board_background")} ${localStorage.getItem("board_pieces")}`]
    
    //resize the chessboard div
    var c = document.getElementById("chessboard");
    var size = localStorage.getItem("board_size");
    var width = "320px";
    if (size == "medium") {
        width = "420px";
    } else if (size == "big") {
        width = "520px";
    }
    c.style.width = width;
    c.style.height = width;
    ground.redrawAll();

    initGround();
}
window.applyBoardStyle = applyBoardStyle;


function initLichessEmbed(game_db) {
    if (!game_db.game(0)._site) {
        return;
    }
    var site = game_db.game(0)._site;
    if (!(site.includes("lichess") && site.includes("study") && site.includes("http"))) {
        document.getElementById("show_lichess_container").style.visibility = "hidden";
    }
}
window.initLichessEmbed = initLichessEmbed;

function show_lichess() {
    // assumed that the user can only reach this if its actually a lichess study
    
    if (document.getElementById("lichess_embed").innerHTML == "") {
        var study_url = game_db.game(game_number-1)._site;
        study_url = study_url.replace("study", "study/embed");
        var width = document.getElementsByClassName("row")[0].getBoundingClientRect().width;
        var height = Math.floor(width * 0.7);
        var embed = `<iframe width=${width} height=${height} src="${study_url}" frameborder=0></iframe>`;
        document.getElementById("lichess_embed").innerHTML = embed;
        document.getElementById("lichess_embed_button").innerHTML = "Hide Game";
    } else {
        document.getElementById("lichess_embed_button").innerHTML = "Show Game";
        document.getElementById("lichess_embed").innerHTML = "";
    }
}
window.show_lichess = show_lichess;

//https://stackoverflow.com/a/16436975
function arraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length != b.length) return false;

  // If you don't care about the order of the elements inside
  // the array, you should sort both arrays here.
  // Please note that calling sort on an array will modify that array.
  // you might want to clone your array first.

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
window.arraysEqual = arraysEqual;
