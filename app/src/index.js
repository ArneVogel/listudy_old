var kokopu = require('kokopu');
var Chessground = require("chessground").Chessground;
var utils = require('./utils/utils.js');
var consts = require('./utils/consts.js');

try {
    var game_db = kokopu.pgnRead(pgn);
} catch(error) {
    writeInfo(error, "warn");
    return;
}

//var game_div = document.getElementById("chessboard")
//var ground = Chessground(game_div, consts.getChessGroundConfig(orientation, game_db.game(0).initialPosition().fen()));

function initGround() {
    var game_div = document.getElementById("chessboard")
    var ground = Chessground(game_div, consts.getChessGroundConfig(orientation, game_db.game(0).initialPosition().fen()));

    window.ground = ground;
    setToPos(game_db.game(game_number-1), window.pos);
    ground.state.movable.dests = allLegalMoves(game_db.game(game_number-1), window.pos)
}
window.initGround = initGround;

window.game_db = game_db
window.kokopu = kokopu
window.translate = utils.toAlgebraic
window.getConfig = consts.getChessGroundConfig

try {
    var a = game_db.game(0)._mainVariationInfo.first;
} catch(error) {
    writeInfo(error, "warn");
}

window.a = a;

var iterCards = {}
//creates the cards and puts the into the global variable iterCards
function iterateMoves(game, position) {
    var variation;
    if (game == undefined) {return;}
    if (game.isLongVariation == undefined) {
        variation = game;
    } else {
        variation = game.first;
    }
    while (variation!= undefined) {
        for (var i = 0; i < variation.variations.length; i++) {
            iterateMoves(variation.variations[i].first.next, position + "" + i)
        }
        variation = variation.next;
        iterCards[position] = 0
        position += "m"
        iterCards[position] = 0
    }
}

function possibleMoves(game, position_string) {
    var position = new kokopu.Position();
    var game = gameAtPos(game, position_string)[0];
    var moves = [];
    moves.push(utils.movesFromMoveDescriptor(game.moveDescriptor))
    for (var i = 0; i < game.variations.length; i++) {
        moves.push(utils.movesFromMoveDescriptor(game.variations[i].first.moveDescriptor))
    }
    return moves;
}

//returns the game and position at position_string
function gameAtPos(game, position_string) {
    var position = game.initialPosition();
    game = game._mainVariationInfo.first;
    for (var i = 0; i < position_string.length; i++) {
        var to_play;
        if (position_string[i] == "m") {
            to_play = position.notation(game.moveDescriptor);
            game = game.next;
        } else {
            to_play = position.notation(game.variations[position_string[i]].first.moveDescriptor);
            game = game.variations[position_string[i]].first.next;
        }
        position.play(to_play);
    }
    return [game,position];
}
window.gameAtPos = gameAtPos;

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
    position = gameAtPos(game, position_string)[1]
    ground.set(consts.getChessGroundConfig(orientation, position.fen()))
}

function smallestPos(cards) {
    smallest = "";
    for (var card in cards) {
        //there has to be a bigger one, otherwise the player cant make a move
        var skip = true;
        for (var i in cards) {
            if (i.startsWith(card) && i.length > card.length) {
                skip = false;
            }
        }
        if (skip) {
            continue;
        }

        if (cards[smallest] == undefined || cards[card] < cards[smallest]) {
            smallest = card;
        }
        if (cards[card] == cards[smallest]) {
            smallest = card.length < smallest.length ? card : smallest;
        }
    }
    return smallest;
}
window.smallestPos = smallestPos;

function createCards() {
    cards = {}
    for (var i = 0; i < game_db.gameCount(); i++) {
        iterCards = {};
        iterateMoves(game_db.game(i)._mainVariationInfo, "");
        
        // remove all the cards that dont have the player make a move
        // => orientation == first_move remove every 2nd turn starting from 1
        //    => remove where length in 2n+1
        // => orientation != first_move remove every 2nd turn starting from 0
        //    => remove where length in 2n

        // 0 white, 1 black
        first_move = game_db.game(i)._initialPosition._impl.turn;
        orientation_move = orientation == "white" ? 0 : 1;
        
        var offset = first_move == orientation_move ? 0 : 1;

        var tmp = {};
        //when the move is the last in line and the opponent has no reply
        for (var j of endOfLines(iterCards)) {
            if ((j.length + offset) % 2 == 1) {
                tmp[j+"m"] = 0;
            }
        }
        for (var j in iterCards) {
            if ((j.length + offset) % 2 == 0) {
                tmp[j] = 0;
            }
        }
        cards[i] = tmp;
    }
    return cards;
}

function cardsWereUsed() {
    for (var i = 0; i < Object.keys(cards).length; i++) {
        for (var j of Object.keys(cards[i])) {
            if (cards[i][j] > 0) {
                return true;
            }
        }
    }
    return false;
}

function initialize(game_number) {
    if (localStorage.getItem("training_mode") == null || localStorage.getItem("training_mode") == "lines") {
        localStorage.setItem("training_mode", "lines");
    }
    initTrainingMode();

    window.help = true;
    window.game_number = game_number;
    window.wrong_counter = 0;
    window.learn_threshold = consts.learn_threshold;

    //create the cards if there are none
    if (progress == "" || !cardsWereUsed() ) {
        window.cards = createCards();
    } else if (window.cards == undefined){
        window.cards = JSON.parse(progress);
    }

    //set the position to the smallest position
    window.pos = smallestPos(window.cards[game_number-1]);
    initGround();
    applyBoardStyle();

    //creates the game_number select options corresponding to the number of games in the game_db and selects the current game
    utils.createSelectOptions(game_db, game_number);
    
    updateProgress();

    // in case the training mode is lines, this has to be done before drawShapes
    localStorage.setItem("end_of_line", newLine(cards[game_number-1]));
    if (window.help && cards[game_number-1][pos] < consts.learn_threshold) {
        drawShapes();
        drawCustomShapes();
        updateComments();
    } else {
        clearComments();
    }
    addLichessLink(game_db);
    writeInfo("");
}

cards = {}
window.setToPos = setToPos;
window.possibleMoves = possibleMoves;
window.cards = cards;

initialize(1);
//this has to be a window function to be called from the onchange on game number select
window.initialize = initialize;
