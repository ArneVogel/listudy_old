function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

//returns the index of the move if it exists, or false
//possible => possibleMoves
//actual => move that was played
function moveExists(possible, actual) {
    for (var i in possible) {
        if (possible[i][0] == actual[0] && possible[i][1] == actual[1]) {
            return i;
        }
    }
    return false;
}

function anotherMove(cards, pos) {
    for (var i in cards) {
        if (i.startsWith(pos) && i.length > pos.length+1) {
            return true;
        }
    }    
    return false;
}
window.anotherMove = anotherMove

//draws the shapes of the possible moves at the current position
function drawShapes() {
    moves = possibleMoves(game_db.game(game_number-1), pos);
    if (localStorage.getItem("training_mode") == "lines") {
        p = localStorage.getItem("end_of_line").substring(pos.length, pos.length+1);
        if (p == "m") {
            p = 0;
        } else {
            p = parseInt(p)+1;
        }
        only_move = moves[p];
        moves = [only_move];
    }
    shapes = [];
    for (var move in moves) {
        shapes.push({orig: moves[move][0], dest: moves[move][1], brush:"variation"})
    }
    ground.setShapes(shapes)
}
window.drawShapes = drawShapes;

//make sure after player makes move theres another move to be played by player
function filterPossible(cards, moves, pos) {
    var tmp = [];
    var extra = "";
    for (var i in moves) {
        if (i == 0) {
            extra = "m";
        } else {
            extra = i-1;
        }
        
        for (var j in cards) {
            if (j.startsWith(pos+extra) && j.length + 2 > (pos+extra).length) {
                tmp.push(moves[i])
                break;
            }
        }
    }
    return tmp;
}

function updateComments() {
    var game = gameAtPos(game_db.game(game_number-1), pos.substring(0,pos.length-1))[0];
    var prev_comment = game.comment;
    game = gameAtPos(game_db.game(game_number-1), pos)[0];
    var curr_comment = game.comment;
    if (curr_comment == prev_comment) {
        curr_comment = "";
    }
    curr_comment = curr_comment == undefined ? "" : curr_comment;
    prev_comment = prev_comment == undefined ? "" : prev_comment;

    document.getElementById("commentary1").innerHTML = prev_comment;
    document.getElementById("commentary2").innerHTML = curr_comment;
}
window.updateComments = updateComments

function clearComments() {
    document.getElementById("commentary1").innerHTML = "";
    document.getElementById("commentary2").innerHTML = "";
}
window.clearComments = clearComments;

function endOfLines(lines) {
    var end_lines = [];
    var end;
    for (var i in lines) {
        end = true;
        for (var j in lines) {
            if (i != j && j.startsWith(i)) {
                end = false;
                break;
            }
        }
        if (end) {
            end_lines.push(i); 
        }
    }
    return end_lines;
}
window.endOfLines = endOfLines;

function newLine(lines) {
    ends = endOfLines(lines);
    line = ends[0];
    for (var i of ends) {
        if (cards[game_number-1][i] < cards[game_number-1][line]) {
            line = i;
        }
    }
    return line;
}
window.newLine = newLine;

//draws the shapes drawn by the pgn creator
function drawCustomShapes() {
    game = gameAtPos(game_db.game(game_number-1), pos.substring(0,pos.length-1))[0];
    
    // csl = points
    // cal = arrows
    var csl, cal;
    if (game.tags.cal != undefined) {
        cal = game.tags.cal.split(",");
    }
    
    if (game.tags.csl != undefined) {
        csl = game.tags.csl.split(",");
    }

    shapes = ground.state.drawable.shapes;
    for (var i in cal) {
        var color, orig, dest;
        switch(cal[i][0]) {
            case 'G':
                color = "green";
                break;
        }
        orig = cal[i].substring(1,3);
        dest = cal[i].substring(3,5);
        shapes.push({orig:orig, dest:dest, brush:color});
    }

    for (var i in csl) {
        var color, orig;
        switch(csl[i][0]) {
            case 'G':
                color = "green";
                break;
        }
        orig = csl[i].substring(1,3);
        shapes.push({orig:orig, brush:color});
    }
    ground.setShapes(shapes);
}
window.drawCustomShapes = drawCustomShapes;

function smallestInLine(cards, line) {
    var smallest, value;
    value = 999;
    smallest = "a".repeat(1000)
    for (var i in cards) {
        if (i != line && line.startsWith(i)) {
            if (cards[i] < value ) {
                smallest = i;
                value = cards[i];
            } else if (cards[i] == value && i.length < smallest.length) {
                smallest = i;
                value = cards[i];
            }
        }
    }
    if (value > 2) {
        return false;
    }
    return smallest;
}
window.smallestInLine = smallestInLine;

async function handleMove(orig, dest, metadata) {
    writeInfo("");
    var mode = localStorage.getItem("training_mode");
    var move = moveExists(possibleMoves(game_db.game(game_number-1), pos), [orig, dest]);

    //in lines mode, if the move exists but not in the current line then dont reduce the pos value
    var updateValue = true;

    //in lines mode the right line has to be picked
    if (mode == "lines") {
        p = localStorage.getItem("end_of_line").substring(pos.length, pos.length+1);
        if (p == "m") {
            p = 0;
        } else {
            p = parseInt(p)+1;
        }
        if (move !== false && p != move) {
            writeInfo("This move exists but in a different line.", "info");
            updateValue = false;
        }
        if (p != move) {
            move = false;
        }
    }

    // wrong move
    if (!move) {
        wrong_counter += 1;

        await sleep(200);
        //ground.move(dest, orig);
        setToPos(game_db.game(game_number-1), pos);
        ground.state.turnColor = orientation; 
        ground.state.movable.dests = allLegalMoves(game_db.game(game_number-1), window.pos)

        if (updateValue) {
            cards[game_number-1][pos] = 0;
        }

        if (wrong_counter >= 2) {
            drawShapes();
            drawCustomShapes();
        }
        updateProgress();
        return;
    }


    var tmp;
    if (move == 0) {
        tmp = "m";
    } else {
        tmp = move-1;
    }

    // no other move in the line
    if (!anotherMove(cards[game_number-1], pos+tmp)) {
        wrong_counter = 0;
        card_value = cards[game_number-1][pos] = Math.min(cards[game_number-1][pos] + 1, 4);
        
        if (move == 0) {
            pos += "m";
        } else {
            pos += move-1;
        }

        await sleep(200);
        //TODO show the last move from the other player

        if (localStorage.getItem("training_mode") == "random") {
            pos = smallestPos(cards[game_number-1])
        } else if (localStorage.getItem("training_mode") == "lines") {
            cards[game_number-1][localStorage.getItem("end_of_line")] = Math.min(cards[game_number-1][localStorage.getItem("end_of_line")] + 1, 4)
            //if there was an error in the line, repeat the line
            var smallest = smallestInLine(cards[game_number-1], localStorage.getItem("end_of_line"));
            if (smallest !== false) {
                pos = orientation == "white" ? "" : newLine(cards[game_number-1])[0];
            } else {
                //pick a new line to learn and set the position
                writeInfo("Starting a new line.", "success");
                localStorage.setItem("end_of_line", newLine(cards[game_number-1]));
                pos = orientation == "white" ? "" : newLine(cards[game_number-1])[0];
            }
        }
        setToPos(game_db.game(game_number-1), window.pos);

        ground.state.movable.dests = allLegalMoves(game_db.game(game_number-1), window.pos)
        ground.state.turnColor = orientation; 

        //TODO give help if there exists more than one line to start with if in lines training mode
        if ((window.help && cards[game_number-1][pos] < learn_threshold) || cards[game_number-1][localStorage.getItem("end_of_line")] < 1 ) {
            drawShapes();
            drawCustomShapes();
            updateComments();
        } else {
            clearComments();
        }

        updateProgress();
        return;
    }
    

    if (move !== false) {
        wrong_counter = 0;
        //update the value of the move
        card_value = cards[game_number-1][pos] = Math.min(cards[game_number-1][pos] + 1, 4);

        if (move == 0) {
            pos += "m";
        } else {
            pos += move-1;
        }

        await sleep(200);


        //the next move, either continue in the line or pick the smallest unlearned line
        
        possible = filterPossible(cards[game_number-1], possibleMoves(game_db.game(game_number-1), pos),pos);
        var play;
        if (localStorage.getItem("training_mode") == "random") {
            play = getRandomInt(0, possible.length-1)
        } else if (localStorage.getItem("training_mode") == "lines"){
            p = localStorage.getItem("end_of_line").substring(pos.length, pos.length+1);
            if (p == "m") {
                play = 0;
            } else {
                play = parseInt(p)+1;
            }
        }
        ground.move(possible[play][0], possible[play][1])
        if (play == 0) {
            pos += "m";
        } else {
            pos += play-1;
        }

        if (localStorage.getItem("training_mode") == "random") {
            // -2 to give a bias to stay in the line
            if (! cards[game_number-1][pos] <= (card_value -2)) {
                pos = smallestPos(cards[game_number-1])
                setToPos(game_db.game(game_number-1), window.pos);
            }
        }

        ground.state.movable.dests = allLegalMoves(game_db.game(game_number-1), window.pos)
        ground.state.turnColor = orientation; 

        if ( (window.help && cards[game_number-1][pos] < learn_threshold && mode != "lines") || ( localStorage.getItem("training_mode") == "lines" && cards[game_number-1][localStorage.getItem("end_of_line")] < 1)) {
            drawShapes();
            drawCustomShapes();
            updateComments();
        } else {
            clearComments();
        }
        updateProgress();
        return;
    } 
    console.log("this point should not have been reached: under handler")
}


module.exports = {
    handleMove: handleMove
}
