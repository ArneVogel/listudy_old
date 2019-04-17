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
    shapes = [];
    for (var move in moves) {
        shapes.push({orig: moves[move][0], dest: moves[move][1], brush:"green"})
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
    console.log(curr_comment);
    curr_comment = curr_comment == undefined ? "" : curr_comment;
    prev_comment = prev_comment == undefined ? "" : prev_comment;

    console.log(curr_comment);
    document.getElementById("commentary1").innerHTML = prev_comment;
    document.getElementById("commentary2").innerHTML = curr_comment;
}
window.updateComments = updateComments

function clearComments() {
    document.getElementById("commentary1").innerHTML = "";
    document.getElementById("commentary2").innerHTML = "";
}
window.clearComments = clearComments;

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

async function handleMove(orig, dest, metadata) {
    var move = moveExists(filterPossible(cards[game_number-1], possibleMoves(game_db.game(game_number-1), window.pos), pos), [orig, dest])
    var tmp;
    if (move == 0) {
        tmp = "m"
    } else if (move != false) {
        tmp = move-1;
    } else {
        tmp = "";
    }
    //check if there is another move
    if (!anotherMove(cards[game_number-1], pos+tmp)) {
        wrong_counter = 0;
        card_value = cards[game_number-1][pos] = cards[game_number-1][pos] + 1;
        
        if (move == 0) {
            pos += "m";
        } else {
            pos += move-1;
        }

        await sleep(200);
        //TODO show the move that the other player could do
        //TODO show the last move from the other player
        //or maybe not, not sure tbh, does it add value to the training?

        pos = smallestPos(cards[game_number-1])
        setToPos(game_db.game(game_number-1), window.pos);

        ground.state.movable.dests = allLegalMoves(game_db.game(game_number-1), window.pos)
        ground.state.turnColor = orientation; 

        if (cards[game_number-1][pos] < learn_threshold) {
            drawShapes();
            drawCustomShapes();
            updateComments();
        } else {
            clearComments();
        }

        return;
    }
    

    //possible moves for the player in the position
    var move = moveExists(possibleMoves(game_db.game(game_number-1), window.pos), [orig, dest])
    if (move) {
        wrong_counter = 0;
        //update the value of the move
        card_value = cards[game_number-1][pos] = cards[game_number-1][pos] + 1;

        if (move == 0) {
            pos += "m";
        } else {
            pos += move-1;
        }

        await sleep(200);


        //the next move, either continue in the line or pick the smallest unlearned line
        
        possible = filterPossible(cards[game_number-1], possibleMoves(game_db.game(game_number-1), pos),pos);
        play = getRandomInt(0, possible.length-1)
        ground.move(possible[play][0], possible[play][1])
        if (play == 0) {
            pos += "m";
        } else {
            pos += play-1;
        }

        // -2 to give a bias to stay in the line
        if (! cards[game_number-1][pos] <= (card_value -2)) {
            pos = smallestPos(cards[game_number-1])
            setToPos(game_db.game(game_number-1), window.pos);

        }

        ground.state.movable.dests = allLegalMoves(game_db.game(game_number-1), window.pos)
        ground.state.turnColor = orientation; 

        if (cards[game_number-1][pos] < learn_threshold) {
            drawShapes();
            drawCustomShapes();
            updateComments();
        } else {
            clearComments();
        }

    } else {
        wrong_counter += 1;

        await sleep(200);
        //ground.move(dest, orig);
        setToPos(game_db.game(game_number-1), pos);
        ground.state.turnColor = orientation; 
        ground.state.movable.dests = allLegalMoves(game_db.game(game_number-1), window.pos)

        //update the move value, never make it less than 0
        cards[game_number-1][pos] = Math.max(cards[game_number-1][pos] -2, 0);

        if (wrong_counter >= 2) {
            drawShapes();
            drawCustomShapes();
        }
    }

}


module.exports = {
    handleMove: handleMove
}
