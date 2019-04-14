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

async function handleMove(orig, dest, metadata) {
    //TODO make sure that the player has another move after making the play for the opponent
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
        console.log("no other move")
        wrong_counter = 0;
        card_value = cards[game_number-1][pos] = cards[game_number-1][pos] + 1;
        
        if (move == 0) {
            pos += "m";
        } else {
            pos += move-1;
        }

        await sleep(200);
        //TODO show the move that the other player could do

        pos = smallestPos(cards[game_number-1])
        //TODO show the last move from the other player
        setToPos(game_db.game(game_number-1), window.pos);

        ground.state.movable.dests = allLegalMoves(game_db.game(game_number-1), window.pos)
        ground.state.turnColor = orientation; 

        if (cards[game_number-1][pos] < learn_threshold) {
            drawShapes();
        }

        return;
    }
    
    console.log("theres another move: ", pos+tmp);

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
        }
    }

}


module.exports = {
    handleMove: handleMove
}
