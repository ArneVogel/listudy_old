(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var util = require("./util");
function anim(mutation, state) {
    return state.animation.enabled ? animate(mutation, state) : render(mutation, state);
}
exports.anim = anim;
function render(mutation, state) {
    var result = mutation(state);
    state.dom.redraw();
    return result;
}
exports.render = render;
function makePiece(key, piece) {
    return {
        key: key,
        pos: util.key2pos(key),
        piece: piece
    };
}
function closer(piece, pieces) {
    return pieces.sort(function (p1, p2) {
        return util.distanceSq(piece.pos, p1.pos) - util.distanceSq(piece.pos, p2.pos);
    })[0];
}
function computePlan(prevPieces, current) {
    var anims = {}, animedOrigs = [], fadings = {}, missings = [], news = [], prePieces = {};
    var curP, preP, i, vector;
    for (i in prevPieces) {
        prePieces[i] = makePiece(i, prevPieces[i]);
    }
    for (var _i = 0, _a = util.allKeys; _i < _a.length; _i++) {
        var key = _a[_i];
        curP = current.pieces[key];
        preP = prePieces[key];
        if (curP) {
            if (preP) {
                if (!util.samePiece(curP, preP.piece)) {
                    missings.push(preP);
                    news.push(makePiece(key, curP));
                }
            }
            else
                news.push(makePiece(key, curP));
        }
        else if (preP)
            missings.push(preP);
    }
    news.forEach(function (newP) {
        preP = closer(newP, missings.filter(function (p) { return util.samePiece(newP.piece, p.piece); }));
        if (preP) {
            vector = [preP.pos[0] - newP.pos[0], preP.pos[1] - newP.pos[1]];
            anims[newP.key] = vector.concat(vector);
            animedOrigs.push(preP.key);
        }
    });
    missings.forEach(function (p) {
        if (!util.containsX(animedOrigs, p.key))
            fadings[p.key] = p.piece;
    });
    return {
        anims: anims,
        fadings: fadings
    };
}
var perf = window.performance !== undefined ? window.performance : Date;
function step(state, now) {
    var cur = state.animation.current;
    if (cur === undefined) {
        if (!state.dom.destroyed)
            state.dom.redrawNow();
        return;
    }
    var rest = 1 - (now - cur.start) * cur.frequency;
    if (rest <= 0) {
        state.animation.current = undefined;
        state.dom.redrawNow();
    }
    else {
        var ease = easing(rest);
        for (var i in cur.plan.anims) {
            var cfg = cur.plan.anims[i];
            cfg[2] = cfg[0] * ease;
            cfg[3] = cfg[1] * ease;
        }
        state.dom.redrawNow(true);
        util.raf(function (now) {
            if (now === void 0) { now = perf.now(); }
            return step(state, now);
        });
    }
}
function animate(mutation, state) {
    var prevPieces = __assign({}, state.pieces);
    var result = mutation(state);
    var plan = computePlan(prevPieces, state);
    if (!isObjectEmpty(plan.anims) || !isObjectEmpty(plan.fadings)) {
        var alreadyRunning = state.animation.current && state.animation.current.start;
        state.animation.current = {
            start: perf.now(),
            frequency: 1 / state.animation.duration,
            plan: plan
        };
        if (!alreadyRunning)
            step(state, perf.now());
    }
    else {
        state.dom.redraw();
    }
    return result;
}
function isObjectEmpty(o) {
    for (var _ in o)
        return false;
    return true;
}
function easing(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

},{"./util":16}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var board = require("./board");
var fen_1 = require("./fen");
var config_1 = require("./config");
var anim_1 = require("./anim");
var drag_1 = require("./drag");
var explosion_1 = require("./explosion");
function start(state, redrawAll) {
    function toggleOrientation() {
        board.toggleOrientation(state);
        redrawAll();
    }
    ;
    return {
        set: function (config) {
            if (config.orientation && config.orientation !== state.orientation)
                toggleOrientation();
            (config.fen ? anim_1.anim : anim_1.render)(function (state) { return config_1.configure(state, config); }, state);
        },
        state: state,
        getFen: function () { return fen_1.write(state.pieces); },
        toggleOrientation: toggleOrientation,
        setPieces: function (pieces) {
            anim_1.anim(function (state) { return board.setPieces(state, pieces); }, state);
        },
        selectSquare: function (key, force) {
            if (key)
                anim_1.anim(function (state) { return board.selectSquare(state, key, force); }, state);
            else if (state.selected) {
                board.unselect(state);
                state.dom.redraw();
            }
        },
        move: function (orig, dest) {
            anim_1.anim(function (state) { return board.baseMove(state, orig, dest); }, state);
        },
        newPiece: function (piece, key) {
            anim_1.anim(function (state) { return board.baseNewPiece(state, piece, key); }, state);
        },
        playPremove: function () {
            if (state.premovable.current) {
                if (anim_1.anim(board.playPremove, state))
                    return true;
                state.dom.redraw();
            }
            return false;
        },
        playPredrop: function (validate) {
            if (state.predroppable.current) {
                var result = board.playPredrop(state, validate);
                state.dom.redraw();
                return result;
            }
            return false;
        },
        cancelPremove: function () {
            anim_1.render(board.unsetPremove, state);
        },
        cancelPredrop: function () {
            anim_1.render(board.unsetPredrop, state);
        },
        cancelMove: function () {
            anim_1.render(function (state) { board.cancelMove(state); drag_1.cancel(state); }, state);
        },
        stop: function () {
            anim_1.render(function (state) { board.stop(state); drag_1.cancel(state); }, state);
        },
        explode: function (keys) {
            explosion_1.default(state, keys);
        },
        setAutoShapes: function (shapes) {
            anim_1.render(function (state) { return state.drawable.autoShapes = shapes; }, state);
        },
        setShapes: function (shapes) {
            anim_1.render(function (state) { return state.drawable.shapes = shapes; }, state);
        },
        getKeyAtDomPos: function (pos) {
            return board.getKeyAtDomPos(pos, state.orientation === 'white', state.dom.bounds());
        },
        redrawAll: redrawAll,
        dragNewPiece: function (piece, event, force) {
            drag_1.dragNewPiece(state, piece, event, force);
        },
        destroy: function () {
            board.stop(state);
            state.dom.unbind && state.dom.unbind();
            state.dom.destroyed = true;
        }
    };
}
exports.start = start;

},{"./anim":1,"./board":3,"./config":5,"./drag":6,"./explosion":9,"./fen":10}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("./util");
var premove_1 = require("./premove");
function callUserFunction(f) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    if (f)
        setTimeout(function () { return f.apply(void 0, args); }, 1);
}
exports.callUserFunction = callUserFunction;
function toggleOrientation(state) {
    state.orientation = util_1.opposite(state.orientation);
    state.animation.current =
        state.draggable.current =
            state.selected = undefined;
}
exports.toggleOrientation = toggleOrientation;
function reset(state) {
    state.lastMove = undefined;
    unselect(state);
    unsetPremove(state);
    unsetPredrop(state);
}
exports.reset = reset;
function setPieces(state, pieces) {
    for (var key in pieces) {
        var piece = pieces[key];
        if (piece)
            state.pieces[key] = piece;
        else
            delete state.pieces[key];
    }
}
exports.setPieces = setPieces;
function setCheck(state, color) {
    if (color === true)
        color = state.turnColor;
    if (!color)
        state.check = undefined;
    else
        for (var k in state.pieces) {
            if (state.pieces[k].role === 'king' && state.pieces[k].color === color) {
                state.check = k;
            }
        }
}
exports.setCheck = setCheck;
function setPremove(state, orig, dest, meta) {
    unsetPredrop(state);
    state.premovable.current = [orig, dest];
    callUserFunction(state.premovable.events.set, orig, dest, meta);
}
function unsetPremove(state) {
    if (state.premovable.current) {
        state.premovable.current = undefined;
        callUserFunction(state.premovable.events.unset);
    }
}
exports.unsetPremove = unsetPremove;
function setPredrop(state, role, key) {
    unsetPremove(state);
    state.predroppable.current = {
        role: role,
        key: key
    };
    callUserFunction(state.predroppable.events.set, role, key);
}
function unsetPredrop(state) {
    var pd = state.predroppable;
    if (pd.current) {
        pd.current = undefined;
        callUserFunction(pd.events.unset);
    }
}
exports.unsetPredrop = unsetPredrop;
function tryAutoCastle(state, orig, dest) {
    if (!state.autoCastle)
        return false;
    var king = state.pieces[orig];
    if (!king || king.role !== 'king')
        return false;
    var origPos = util_1.key2pos(orig);
    if (origPos[0] !== 5)
        return false;
    if (origPos[1] !== 1 && origPos[1] !== 8)
        return false;
    var destPos = util_1.key2pos(dest);
    var oldRookPos, newRookPos, newKingPos;
    if (destPos[0] === 7 || destPos[0] === 8) {
        oldRookPos = util_1.pos2key([8, origPos[1]]);
        newRookPos = util_1.pos2key([6, origPos[1]]);
        newKingPos = util_1.pos2key([7, origPos[1]]);
    }
    else if (destPos[0] === 3 || destPos[0] === 1) {
        oldRookPos = util_1.pos2key([1, origPos[1]]);
        newRookPos = util_1.pos2key([4, origPos[1]]);
        newKingPos = util_1.pos2key([3, origPos[1]]);
    }
    else
        return false;
    var rook = state.pieces[oldRookPos];
    if (!rook || rook.role !== 'rook')
        return false;
    delete state.pieces[orig];
    delete state.pieces[oldRookPos];
    state.pieces[newKingPos] = king;
    state.pieces[newRookPos] = rook;
    return true;
}
function baseMove(state, orig, dest) {
    var origPiece = state.pieces[orig], destPiece = state.pieces[dest];
    if (orig === dest || !origPiece)
        return false;
    var captured = (destPiece && destPiece.color !== origPiece.color) ? destPiece : undefined;
    if (dest == state.selected)
        unselect(state);
    callUserFunction(state.events.move, orig, dest, captured);
    if (!tryAutoCastle(state, orig, dest)) {
        state.pieces[dest] = origPiece;
        delete state.pieces[orig];
    }
    state.lastMove = [orig, dest];
    state.check = undefined;
    callUserFunction(state.events.change);
    return captured || true;
}
exports.baseMove = baseMove;
function baseNewPiece(state, piece, key, force) {
    if (state.pieces[key]) {
        if (force)
            delete state.pieces[key];
        else
            return false;
    }
    callUserFunction(state.events.dropNewPiece, piece, key);
    state.pieces[key] = piece;
    state.lastMove = [key];
    state.check = undefined;
    callUserFunction(state.events.change);
    state.movable.dests = undefined;
    state.turnColor = util_1.opposite(state.turnColor);
    return true;
}
exports.baseNewPiece = baseNewPiece;
function baseUserMove(state, orig, dest) {
    var result = baseMove(state, orig, dest);
    if (result) {
        state.movable.dests = undefined;
        state.turnColor = util_1.opposite(state.turnColor);
        state.animation.current = undefined;
    }
    return result;
}
function userMove(state, orig, dest) {
    if (canMove(state, orig, dest)) {
        var result = baseUserMove(state, orig, dest);
        if (result) {
            var holdTime = state.hold.stop();
            unselect(state);
            var metadata = {
                premove: false,
                ctrlKey: state.stats.ctrlKey,
                holdTime: holdTime
            };
            if (result !== true)
                metadata.captured = result;
            callUserFunction(state.movable.events.after, orig, dest, metadata);
            return true;
        }
    }
    else if (canPremove(state, orig, dest)) {
        setPremove(state, orig, dest, {
            ctrlKey: state.stats.ctrlKey
        });
        unselect(state);
    }
    else if (isMovable(state, dest) || isPremovable(state, dest)) {
        setSelected(state, dest);
        state.hold.start();
    }
    else
        unselect(state);
    return false;
}
exports.userMove = userMove;
function dropNewPiece(state, orig, dest, force) {
    if (canDrop(state, orig, dest) || force) {
        var piece = state.pieces[orig];
        delete state.pieces[orig];
        baseNewPiece(state, piece, dest, force);
        callUserFunction(state.movable.events.afterNewPiece, piece.role, dest, {
            predrop: false
        });
    }
    else if (canPredrop(state, orig, dest)) {
        setPredrop(state, state.pieces[orig].role, dest);
    }
    else {
        unsetPremove(state);
        unsetPredrop(state);
    }
    delete state.pieces[orig];
    unselect(state);
}
exports.dropNewPiece = dropNewPiece;
function selectSquare(state, key, force) {
    if (state.selected) {
        if (state.selected === key && !state.draggable.enabled) {
            unselect(state);
            state.hold.cancel();
        }
        else if ((state.selectable.enabled || force) && state.selected !== key) {
            if (userMove(state, state.selected, key))
                state.stats.dragged = false;
        }
        else
            state.hold.start();
    }
    else if (isMovable(state, key) || isPremovable(state, key)) {
        setSelected(state, key);
        state.hold.start();
    }
    callUserFunction(state.events.select, key);
}
exports.selectSquare = selectSquare;
function setSelected(state, key) {
    state.selected = key;
    if (isPremovable(state, key)) {
        state.premovable.dests = premove_1.default(state.pieces, key, state.premovable.castle);
    }
    else
        state.premovable.dests = undefined;
}
exports.setSelected = setSelected;
function unselect(state) {
    state.selected = undefined;
    state.premovable.dests = undefined;
    state.hold.cancel();
}
exports.unselect = unselect;
function isMovable(state, orig) {
    var piece = state.pieces[orig];
    return !!piece && (state.movable.color === 'both' || (state.movable.color === piece.color &&
        state.turnColor === piece.color));
}
function canMove(state, orig, dest) {
    return orig !== dest && isMovable(state, orig) && (state.movable.free || (!!state.movable.dests && util_1.containsX(state.movable.dests[orig], dest)));
}
exports.canMove = canMove;
function canDrop(state, orig, dest) {
    var piece = state.pieces[orig];
    return !!piece && dest && (orig === dest || !state.pieces[dest]) && (state.movable.color === 'both' || (state.movable.color === piece.color &&
        state.turnColor === piece.color));
}
function isPremovable(state, orig) {
    var piece = state.pieces[orig];
    return !!piece && state.premovable.enabled &&
        state.movable.color === piece.color &&
        state.turnColor !== piece.color;
}
function canPremove(state, orig, dest) {
    return orig !== dest &&
        isPremovable(state, orig) &&
        util_1.containsX(premove_1.default(state.pieces, orig, state.premovable.castle), dest);
}
function canPredrop(state, orig, dest) {
    var piece = state.pieces[orig];
    var destPiece = state.pieces[dest];
    return !!piece && dest &&
        (!destPiece || destPiece.color !== state.movable.color) &&
        state.predroppable.enabled &&
        (piece.role !== 'pawn' || (dest[1] !== '1' && dest[1] !== '8')) &&
        state.movable.color === piece.color &&
        state.turnColor !== piece.color;
}
function isDraggable(state, orig) {
    var piece = state.pieces[orig];
    return !!piece && state.draggable.enabled && (state.movable.color === 'both' || (state.movable.color === piece.color && (state.turnColor === piece.color || state.premovable.enabled)));
}
exports.isDraggable = isDraggable;
function playPremove(state) {
    var move = state.premovable.current;
    if (!move)
        return false;
    var orig = move[0], dest = move[1];
    var success = false;
    if (canMove(state, orig, dest)) {
        var result = baseUserMove(state, orig, dest);
        if (result) {
            var metadata = { premove: true };
            if (result !== true)
                metadata.captured = result;
            callUserFunction(state.movable.events.after, orig, dest, metadata);
            success = true;
        }
    }
    unsetPremove(state);
    return success;
}
exports.playPremove = playPremove;
function playPredrop(state, validate) {
    var drop = state.predroppable.current, success = false;
    if (!drop)
        return false;
    if (validate(drop)) {
        var piece = {
            role: drop.role,
            color: state.movable.color
        };
        if (baseNewPiece(state, piece, drop.key)) {
            callUserFunction(state.movable.events.afterNewPiece, drop.role, drop.key, {
                predrop: true
            });
            success = true;
        }
    }
    unsetPredrop(state);
    return success;
}
exports.playPredrop = playPredrop;
function cancelMove(state) {
    unsetPremove(state);
    unsetPredrop(state);
    unselect(state);
}
exports.cancelMove = cancelMove;
function stop(state) {
    state.movable.color =
        state.movable.dests =
            state.animation.current = undefined;
    cancelMove(state);
}
exports.stop = stop;
function getKeyAtDomPos(pos, asWhite, bounds) {
    var file = Math.ceil(8 * ((pos[0] - bounds.left) / bounds.width));
    if (!asWhite)
        file = 9 - file;
    var rank = Math.ceil(8 - (8 * ((pos[1] - bounds.top) / bounds.height)));
    if (!asWhite)
        rank = 9 - rank;
    return (file > 0 && file < 9 && rank > 0 && rank < 9) ? util_1.pos2key([file, rank]) : undefined;
}
exports.getKeyAtDomPos = getKeyAtDomPos;

},{"./premove":11,"./util":16}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var api_1 = require("./api");
var config_1 = require("./config");
var state_1 = require("./state");
var wrap_1 = require("./wrap");
var events = require("./events");
var render_1 = require("./render");
var svg = require("./svg");
var util = require("./util");
function Chessground(element, config) {
    var state = state_1.defaults();
    config_1.configure(state, config || {});
    function redrawAll() {
        var prevUnbind = state.dom && state.dom.unbind;
        element.classList.add('cg-board-wrap');
        var bounds = util.memo(function () { return element.getBoundingClientRect(); });
        var relative = state.viewOnly && !state.drawable.visible;
        var elements = wrap_1.default(element, state, relative ? undefined : bounds());
        var redrawNow = function (skipSvg) {
            render_1.default(state);
            if (!skipSvg && elements.svg)
                svg.renderSvg(state, elements.svg);
        };
        state.dom = {
            elements: elements,
            bounds: bounds,
            redraw: debounceRedraw(redrawNow),
            redrawNow: redrawNow,
            unbind: prevUnbind,
            relative: relative
        };
        state.drawable.prevSvgHash = '';
        redrawNow(false);
        events.bindBoard(state);
        if (!prevUnbind)
            state.dom.unbind = events.bindDocument(state, redrawAll);
    }
    redrawAll();
    var api = api_1.start(state, redrawAll);
    return api;
}
exports.Chessground = Chessground;
;
function debounceRedraw(redrawNow) {
    var redrawing = false;
    return function () {
        if (redrawing)
            return;
        redrawing = true;
        util.raf(function () {
            redrawNow();
            redrawing = false;
        });
    };
}

},{"./api":2,"./config":5,"./events":8,"./render":12,"./state":13,"./svg":14,"./util":16,"./wrap":17}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var board_1 = require("./board");
var fen_1 = require("./fen");
function configure(state, config) {
    if (config.movable && config.movable.dests)
        state.movable.dests = undefined;
    merge(state, config);
    if (config.fen) {
        state.pieces = fen_1.read(config.fen);
        state.drawable.shapes = [];
    }
    if (config.hasOwnProperty('check'))
        board_1.setCheck(state, config.check || false);
    if (config.hasOwnProperty('lastMove') && !config.lastMove)
        state.lastMove = undefined;
    else if (config.lastMove)
        state.lastMove = config.lastMove;
    if (state.selected)
        board_1.setSelected(state, state.selected);
    if (!state.animation.duration || state.animation.duration < 100)
        state.animation.enabled = false;
    if (!state.movable.rookCastle && state.movable.dests) {
        var rank_1 = state.movable.color === 'white' ? 1 : 8;
        var kingStartPos = 'e' + rank_1;
        var dests_1 = state.movable.dests[kingStartPos];
        var king = state.pieces[kingStartPos];
        if (!dests_1 || !king || king.role !== 'king')
            return;
        state.movable.dests[kingStartPos] = dests_1.filter(function (d) {
            return !((d === 'a' + rank_1) && dests_1.indexOf('c' + rank_1) !== -1) &&
                !((d === 'h' + rank_1) && dests_1.indexOf('g' + rank_1) !== -1);
        });
    }
}
exports.configure = configure;
;
function merge(base, extend) {
    for (var key in extend) {
        if (isObject(base[key]) && isObject(extend[key]))
            merge(base[key], extend[key]);
        else
            base[key] = extend[key];
    }
}
function isObject(o) {
    return typeof o === 'object';
}

},{"./board":3,"./fen":10}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var board = require("./board");
var util = require("./util");
var draw_1 = require("./draw");
var anim_1 = require("./anim");
function start(s, e) {
    if (e.button !== undefined && e.button !== 0)
        return;
    if (e.touches && e.touches.length > 1)
        return;
    e.preventDefault();
    var asWhite = s.orientation === 'white', bounds = s.dom.bounds(), position = util.eventPosition(e), orig = board.getKeyAtDomPos(position, asWhite, bounds);
    if (!orig)
        return;
    var piece = s.pieces[orig];
    var previouslySelected = s.selected;
    if (!previouslySelected && s.drawable.enabled && (s.drawable.eraseOnClick || (!piece || piece.color !== s.turnColor)))
        draw_1.clear(s);
    var hadPremove = !!s.premovable.current;
    var hadPredrop = !!s.predroppable.current;
    s.stats.ctrlKey = e.ctrlKey;
    if (s.selected && board.canMove(s, s.selected, orig)) {
        anim_1.anim(function (state) { return board.selectSquare(state, orig); }, s);
    }
    else {
        board.selectSquare(s, orig);
    }
    var stillSelected = s.selected === orig;
    var element = pieceElementByKey(s, orig);
    if (piece && element && stillSelected && board.isDraggable(s, orig)) {
        var squareBounds = computeSquareBounds(orig, asWhite, bounds);
        s.draggable.current = {
            orig: orig,
            origPos: util.key2pos(orig),
            piece: piece,
            rel: position,
            epos: position,
            pos: [0, 0],
            dec: s.draggable.centerPiece ? [
                position[0] - (squareBounds.left + squareBounds.width / 2),
                position[1] - (squareBounds.top + squareBounds.height / 2)
            ] : [0, 0],
            started: s.draggable.autoDistance && s.stats.dragged,
            element: element,
            previouslySelected: previouslySelected,
            originTarget: e.target
        };
        element.cgDragging = true;
        element.classList.add('dragging');
        var ghost = s.dom.elements.ghost;
        if (ghost) {
            ghost.className = "ghost " + piece.color + " " + piece.role;
            util.translateAbs(ghost, util.posToTranslateAbs(bounds)(util.key2pos(orig), asWhite));
            util.setVisible(ghost, true);
        }
        processDrag(s);
    }
    else {
        if (hadPremove)
            board.unsetPremove(s);
        if (hadPredrop)
            board.unsetPredrop(s);
    }
    s.dom.redraw();
}
exports.start = start;
function dragNewPiece(s, piece, e, force) {
    var key = 'a0';
    s.pieces[key] = piece;
    s.dom.redraw();
    var position = util.eventPosition(e), asWhite = s.orientation === 'white', bounds = s.dom.bounds(), squareBounds = computeSquareBounds(key, asWhite, bounds);
    var rel = [
        (asWhite ? 0 : 7) * squareBounds.width + bounds.left,
        (asWhite ? 8 : -1) * squareBounds.height + bounds.top
    ];
    s.draggable.current = {
        orig: key,
        origPos: util.key2pos(key),
        piece: piece,
        rel: rel,
        epos: position,
        pos: [position[0] - rel[0], position[1] - rel[1]],
        dec: [-squareBounds.width / 2, -squareBounds.height / 2],
        started: true,
        element: function () { return pieceElementByKey(s, key); },
        originTarget: e.target,
        newPiece: true,
        force: force || false
    };
    processDrag(s);
}
exports.dragNewPiece = dragNewPiece;
function processDrag(s) {
    util.raf(function () {
        var cur = s.draggable.current;
        if (!cur)
            return;
        if (s.animation.current && s.animation.current.plan.anims[cur.orig])
            s.animation.current = undefined;
        var origPiece = s.pieces[cur.orig];
        if (!origPiece || !util.samePiece(origPiece, cur.piece))
            cancel(s);
        else {
            if (!cur.started && util.distanceSq(cur.epos, cur.rel) >= Math.pow(s.draggable.distance, 2))
                cur.started = true;
            if (cur.started) {
                if (typeof cur.element === 'function') {
                    var found = cur.element();
                    if (!found)
                        return;
                    cur.element = found;
                    cur.element.cgDragging = true;
                    cur.element.classList.add('dragging');
                }
                var asWhite = s.orientation === 'white', bounds = s.dom.bounds();
                cur.pos = [
                    cur.epos[0] - cur.rel[0],
                    cur.epos[1] - cur.rel[1]
                ];
                var translation = util.posToTranslateAbs(bounds)(cur.origPos, asWhite);
                translation[0] += cur.pos[0] + cur.dec[0];
                translation[1] += cur.pos[1] + cur.dec[1];
                util.translateAbs(cur.element, translation);
            }
        }
        processDrag(s);
    });
}
function move(s, e) {
    if (s.draggable.current && (!e.touches || e.touches.length < 2)) {
        s.draggable.current.epos = util.eventPosition(e);
    }
}
exports.move = move;
function end(s, e) {
    var cur = s.draggable.current;
    if (!cur)
        return;
    if (e.type === 'touchend' && cur && cur.originTarget !== e.target && !cur.newPiece) {
        s.draggable.current = undefined;
        return;
    }
    board.unsetPremove(s);
    board.unsetPredrop(s);
    var eventPos = util.eventPosition(e) || cur.epos;
    var dest = board.getKeyAtDomPos(eventPos, s.orientation === 'white', s.dom.bounds());
    if (dest && cur.started) {
        if (cur.newPiece)
            board.dropNewPiece(s, cur.orig, dest, cur.force);
        else {
            s.stats.ctrlKey = e.ctrlKey;
            if (board.userMove(s, cur.orig, dest))
                s.stats.dragged = true;
        }
    }
    else if (cur.newPiece) {
        delete s.pieces[cur.orig];
    }
    else if (s.draggable.deleteOnDropOff) {
        delete s.pieces[cur.orig];
        board.callUserFunction(s.events.change);
    }
    if (cur && cur.orig === cur.previouslySelected && (cur.orig === dest || !dest))
        board.unselect(s);
    else if (!s.selectable.enabled)
        board.unselect(s);
    removeDragElements(s);
    s.draggable.current = undefined;
    s.dom.redraw();
}
exports.end = end;
function cancel(s) {
    var cur = s.draggable.current;
    if (cur) {
        if (cur.newPiece)
            delete s.pieces[cur.orig];
        s.draggable.current = undefined;
        board.unselect(s);
        removeDragElements(s);
        s.dom.redraw();
    }
}
exports.cancel = cancel;
function removeDragElements(s) {
    var e = s.dom.elements;
    if (e.ghost)
        util.setVisible(e.ghost, false);
}
function computeSquareBounds(key, asWhite, bounds) {
    var pos = util.key2pos(key);
    if (!asWhite) {
        pos[0] = 9 - pos[0];
        pos[1] = 9 - pos[1];
    }
    return {
        left: bounds.left + bounds.width * (pos[0] - 1) / 8,
        top: bounds.top + bounds.height * (8 - pos[1]) / 8,
        width: bounds.width / 8,
        height: bounds.height / 8
    };
}
function pieceElementByKey(s, key) {
    var el = s.dom.elements.board.firstChild;
    while (el) {
        if (el.cgKey === key && el.tagName === 'PIECE')
            return el;
        el = el.nextSibling;
    }
    return undefined;
}

},{"./anim":1,"./board":3,"./draw":7,"./util":16}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var board_1 = require("./board");
var util_1 = require("./util");
var brushes = ['green', 'red', 'blue', 'yellow'];
function start(state, e) {
    if (e.touches && e.touches.length > 1)
        return;
    e.stopPropagation();
    e.preventDefault();
    e.ctrlKey ? board_1.unselect(state) : board_1.cancelMove(state);
    var position = util_1.eventPosition(e);
    var orig = board_1.getKeyAtDomPos(position, state.orientation === 'white', state.dom.bounds());
    if (!orig)
        return;
    state.drawable.current = {
        orig: orig,
        pos: position,
        brush: eventBrush(e)
    };
    processDraw(state);
}
exports.start = start;
function processDraw(state) {
    util_1.raf(function () {
        var cur = state.drawable.current;
        if (cur) {
            var mouseSq = board_1.getKeyAtDomPos(cur.pos, state.orientation === 'white', state.dom.bounds());
            if (mouseSq !== cur.mouseSq) {
                cur.mouseSq = mouseSq;
                cur.dest = mouseSq !== cur.orig ? mouseSq : undefined;
                state.dom.redrawNow();
            }
            processDraw(state);
        }
    });
}
exports.processDraw = processDraw;
function move(state, e) {
    if (state.drawable.current)
        state.drawable.current.pos = util_1.eventPosition(e);
}
exports.move = move;
function end(state) {
    var cur = state.drawable.current;
    if (cur) {
        if (cur.mouseSq)
            addShape(state.drawable, cur);
        cancel(state);
    }
}
exports.end = end;
function cancel(state) {
    if (state.drawable.current) {
        state.drawable.current = undefined;
        state.dom.redraw();
    }
}
exports.cancel = cancel;
function clear(state) {
    if (state.drawable.shapes.length) {
        state.drawable.shapes = [];
        state.dom.redraw();
        onChange(state.drawable);
    }
}
exports.clear = clear;
function eventBrush(e) {
    var a = e.shiftKey && util_1.isRightButton(e) ? 1 : 0;
    var b = e.altKey ? 2 : 0;
    return brushes[a + b];
}
function not(f) {
    return function (x) { return !f(x); };
}
function addShape(drawable, cur) {
    var sameShape = function (s) {
        return s.orig === cur.orig && s.dest === cur.dest;
    };
    var similar = drawable.shapes.filter(sameShape)[0];
    if (similar)
        drawable.shapes = drawable.shapes.filter(not(sameShape));
    if (!similar || similar.brush !== cur.brush)
        drawable.shapes.push(cur);
    onChange(drawable);
}
function onChange(drawable) {
    if (drawable.onChange)
        drawable.onChange(drawable.shapes);
}

},{"./board":3,"./util":16}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var drag = require("./drag");
var draw = require("./draw");
var util_1 = require("./util");
function bindBoard(s) {
    if (s.viewOnly)
        return;
    var boardEl = s.dom.elements.board, onStart = startDragOrDraw(s);
    boardEl.addEventListener('touchstart', onStart);
    boardEl.addEventListener('mousedown', onStart);
    if (s.disableContextMenu || s.drawable.enabled) {
        boardEl.addEventListener('contextmenu', function (e) { return e.preventDefault(); });
    }
}
exports.bindBoard = bindBoard;
function bindDocument(s, redrawAll) {
    var unbinds = [];
    if (!s.dom.relative && s.resizable) {
        var onResize = function () {
            s.dom.bounds.clear();
            util_1.raf(redrawAll);
        };
        unbinds.push(unbindable(document.body, 'chessground.resize', onResize));
    }
    if (!s.viewOnly) {
        var onmove_1 = dragOrDraw(s, drag.move, draw.move);
        var onend_1 = dragOrDraw(s, drag.end, draw.end);
        ['touchmove', 'mousemove'].forEach(function (ev) { return unbinds.push(unbindable(document, ev, onmove_1)); });
        ['touchend', 'mouseup'].forEach(function (ev) { return unbinds.push(unbindable(document, ev, onend_1)); });
        var onScroll = function () { return s.dom.bounds.clear(); };
        unbinds.push(unbindable(window, 'scroll', onScroll, { passive: true }));
        unbinds.push(unbindable(window, 'resize', onScroll, { passive: true }));
    }
    return function () { return unbinds.forEach(function (f) { return f(); }); };
}
exports.bindDocument = bindDocument;
function unbindable(el, eventName, callback, options) {
    el.addEventListener(eventName, callback, options);
    return function () { return el.removeEventListener(eventName, callback); };
}
function startDragOrDraw(s) {
    return function (e) {
        if (s.draggable.current)
            drag.cancel(s);
        else if (s.drawable.current)
            draw.cancel(s);
        else if (e.shiftKey || util_1.isRightButton(e)) {
            if (s.drawable.enabled)
                draw.start(s, e);
        }
        else if (!s.viewOnly)
            drag.start(s, e);
    };
}
function dragOrDraw(s, withDrag, withDraw) {
    return function (e) {
        if (e.shiftKey || util_1.isRightButton(e)) {
            if (s.drawable.enabled)
                withDraw(s, e);
        }
        else if (!s.viewOnly)
            withDrag(s, e);
    };
}

},{"./drag":6,"./draw":7,"./util":16}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function explosion(state, keys) {
    state.exploding = {
        stage: 1,
        keys: keys
    };
    state.dom.redraw();
    setTimeout(function () {
        setStage(state, 2);
        setTimeout(function () { return setStage(state, undefined); }, 120);
    }, 120);
}
exports.default = explosion;
function setStage(state, stage) {
    if (state.exploding) {
        if (stage)
            state.exploding.stage = stage;
        else
            state.exploding = undefined;
        state.dom.redraw();
    }
}

},{}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("./util");
var cg = require("./types");
exports.initial = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
var roles = { p: 'pawn', r: 'rook', n: 'knight', b: 'bishop', q: 'queen', k: 'king' };
var letters = { pawn: 'p', rook: 'r', knight: 'n', bishop: 'b', queen: 'q', king: 'k' };
function read(fen) {
    if (fen === 'start')
        fen = exports.initial;
    var pieces = {};
    var row = 8;
    var col = 0;
    for (var _i = 0, fen_1 = fen; _i < fen_1.length; _i++) {
        var c = fen_1[_i];
        switch (c) {
            case ' ': return pieces;
            case '/':
                --row;
                if (row === 0)
                    return pieces;
                col = 0;
                break;
            case '~':
                var piece = pieces[util_1.pos2key([col, row])];
                if (piece)
                    piece.promoted = true;
                break;
            default:
                var nb = c.charCodeAt(0);
                if (nb < 57)
                    col += nb - 48;
                else {
                    ++col;
                    var role = c.toLowerCase();
                    pieces[util_1.pos2key([col, row])] = {
                        role: roles[role],
                        color: (c === role ? 'black' : 'white')
                    };
                }
        }
    }
    return pieces;
}
exports.read = read;
function write(pieces) {
    return util_1.invRanks.map(function (y) { return cg.ranks.map(function (x) {
        var piece = pieces[util_1.pos2key([x, y])];
        if (piece) {
            var letter = letters[piece.role];
            return piece.color === 'white' ? letter.toUpperCase() : letter;
        }
        else
            return '1';
    }).join(''); }).join('/').replace(/1{2,}/g, function (s) { return s.length.toString(); });
}
exports.write = write;

},{"./types":15,"./util":16}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util = require("./util");
function diff(a, b) {
    return Math.abs(a - b);
}
function pawn(color) {
    return function (x1, y1, x2, y2) { return diff(x1, x2) < 2 && (color === 'white' ? (y2 === y1 + 1 || (y1 <= 2 && y2 === (y1 + 2) && x1 === x2)) : (y2 === y1 - 1 || (y1 >= 7 && y2 === (y1 - 2) && x1 === x2))); };
}
var knight = function (x1, y1, x2, y2) {
    var xd = diff(x1, x2);
    var yd = diff(y1, y2);
    return (xd === 1 && yd === 2) || (xd === 2 && yd === 1);
};
var bishop = function (x1, y1, x2, y2) {
    return diff(x1, x2) === diff(y1, y2);
};
var rook = function (x1, y1, x2, y2) {
    return x1 === x2 || y1 === y2;
};
var queen = function (x1, y1, x2, y2) {
    return bishop(x1, y1, x2, y2) || rook(x1, y1, x2, y2);
};
function king(color, rookFiles, canCastle) {
    return function (x1, y1, x2, y2) { return (diff(x1, x2) < 2 && diff(y1, y2) < 2) || (canCastle && y1 === y2 && y1 === (color === 'white' ? 1 : 8) && ((x1 === 5 && (x2 === 3 || x2 === 7)) || util.containsX(rookFiles, x2))); };
}
function rookFilesOf(pieces, color) {
    return Object.keys(pieces).filter(function (key) {
        var piece = pieces[key];
        return piece && piece.color === color && piece.role === 'rook';
    }).map(function (key) { return util.key2pos(key)[0]; });
}
function premove(pieces, key, canCastle) {
    var piece = pieces[key], pos = util.key2pos(key);
    var mobility;
    switch (piece.role) {
        case 'pawn':
            mobility = pawn(piece.color);
            break;
        case 'knight':
            mobility = knight;
            break;
        case 'bishop':
            mobility = bishop;
            break;
        case 'rook':
            mobility = rook;
            break;
        case 'queen':
            mobility = queen;
            break;
        case 'king':
            mobility = king(piece.color, rookFilesOf(pieces, piece.color), canCastle);
            break;
    }
    return util.allKeys.map(util.key2pos).filter(function (pos2) {
        return (pos[0] !== pos2[0] || pos[1] !== pos2[1]) && mobility(pos[0], pos[1], pos2[0], pos2[1]);
    }).map(util.pos2key);
}
exports.default = premove;
;

},{"./util":16}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("./util");
var util = require("./util");
function render(s) {
    var asWhite = s.orientation === 'white', posToTranslate = s.dom.relative ? util.posToTranslateRel : util.posToTranslateAbs(s.dom.bounds()), translate = s.dom.relative ? util.translateRel : util.translateAbs, boardEl = s.dom.elements.board, pieces = s.pieces, curAnim = s.animation.current, anims = curAnim ? curAnim.plan.anims : {}, fadings = curAnim ? curAnim.plan.fadings : {}, curDrag = s.draggable.current, squares = computeSquareClasses(s), samePieces = {}, sameSquares = {}, movedPieces = {}, movedSquares = {}, piecesKeys = Object.keys(pieces);
    var k, p, el, pieceAtKey, elPieceName, anim, fading, pMvdset, pMvd, sMvdset, sMvd;
    el = boardEl.firstChild;
    while (el) {
        k = el.cgKey;
        if (isPieceNode(el)) {
            pieceAtKey = pieces[k];
            anim = anims[k];
            fading = fadings[k];
            elPieceName = el.cgPiece;
            if (el.cgDragging && (!curDrag || curDrag.orig !== k)) {
                el.classList.remove('dragging');
                translate(el, posToTranslate(util_1.key2pos(k), asWhite));
                el.cgDragging = false;
            }
            if (!fading && el.cgFading) {
                el.cgFading = false;
                el.classList.remove('fading');
            }
            if (pieceAtKey) {
                if (anim && el.cgAnimating && elPieceName === pieceNameOf(pieceAtKey)) {
                    var pos = util_1.key2pos(k);
                    pos[0] += anim[2];
                    pos[1] += anim[3];
                    el.classList.add('anim');
                    translate(el, posToTranslate(pos, asWhite));
                }
                else if (el.cgAnimating) {
                    el.cgAnimating = false;
                    el.classList.remove('anim');
                    translate(el, posToTranslate(util_1.key2pos(k), asWhite));
                    if (s.addPieceZIndex)
                        el.style.zIndex = posZIndex(util_1.key2pos(k), asWhite);
                }
                if (elPieceName === pieceNameOf(pieceAtKey) && (!fading || !el.cgFading)) {
                    samePieces[k] = true;
                }
                else {
                    if (fading && elPieceName === pieceNameOf(fading)) {
                        el.classList.add('fading');
                        el.cgFading = true;
                    }
                    else {
                        if (movedPieces[elPieceName])
                            movedPieces[elPieceName].push(el);
                        else
                            movedPieces[elPieceName] = [el];
                    }
                }
            }
            else {
                if (movedPieces[elPieceName])
                    movedPieces[elPieceName].push(el);
                else
                    movedPieces[elPieceName] = [el];
            }
        }
        else if (isSquareNode(el)) {
            var cn = el.className;
            if (squares[k] === cn)
                sameSquares[k] = true;
            else if (movedSquares[cn])
                movedSquares[cn].push(el);
            else
                movedSquares[cn] = [el];
        }
        el = el.nextSibling;
    }
    for (var sk in squares) {
        if (!sameSquares[sk]) {
            sMvdset = movedSquares[squares[sk]];
            sMvd = sMvdset && sMvdset.pop();
            var translation = posToTranslate(util_1.key2pos(sk), asWhite);
            if (sMvd) {
                sMvd.cgKey = sk;
                translate(sMvd, translation);
            }
            else {
                var squareNode = util_1.createEl('square', squares[sk]);
                squareNode.cgKey = sk;
                translate(squareNode, translation);
                boardEl.insertBefore(squareNode, boardEl.firstChild);
            }
        }
    }
    for (var j in piecesKeys) {
        k = piecesKeys[j];
        p = pieces[k];
        anim = anims[k];
        if (!samePieces[k]) {
            pMvdset = movedPieces[pieceNameOf(p)];
            pMvd = pMvdset && pMvdset.pop();
            if (pMvd) {
                pMvd.cgKey = k;
                if (pMvd.cgFading) {
                    pMvd.classList.remove('fading');
                    pMvd.cgFading = false;
                }
                var pos = util_1.key2pos(k);
                if (s.addPieceZIndex)
                    pMvd.style.zIndex = posZIndex(pos, asWhite);
                if (anim) {
                    pMvd.cgAnimating = true;
                    pMvd.classList.add('anim');
                    pos[0] += anim[2];
                    pos[1] += anim[3];
                }
                translate(pMvd, posToTranslate(pos, asWhite));
            }
            else {
                var pieceName = pieceNameOf(p), pieceNode = util_1.createEl('piece', pieceName), pos = util_1.key2pos(k);
                pieceNode.cgPiece = pieceName;
                pieceNode.cgKey = k;
                if (anim) {
                    pieceNode.cgAnimating = true;
                    pos[0] += anim[2];
                    pos[1] += anim[3];
                }
                translate(pieceNode, posToTranslate(pos, asWhite));
                if (s.addPieceZIndex)
                    pieceNode.style.zIndex = posZIndex(pos, asWhite);
                boardEl.appendChild(pieceNode);
            }
        }
    }
    for (var i in movedPieces)
        removeNodes(s, movedPieces[i]);
    for (var i in movedSquares)
        removeNodes(s, movedSquares[i]);
}
exports.default = render;
function isPieceNode(el) {
    return el.tagName === 'PIECE';
}
function isSquareNode(el) {
    return el.tagName === 'SQUARE';
}
function removeNodes(s, nodes) {
    for (var i in nodes)
        s.dom.elements.board.removeChild(nodes[i]);
}
function posZIndex(pos, asWhite) {
    var z = 2 + (pos[1] - 1) * 8 + (8 - pos[0]);
    if (asWhite)
        z = 67 - z;
    return z + '';
}
function pieceNameOf(piece) {
    return piece.color + " " + piece.role;
}
function computeSquareClasses(s) {
    var squares = {};
    var i, k;
    if (s.lastMove && s.highlight.lastMove)
        for (i in s.lastMove) {
            addSquare(squares, s.lastMove[i], 'last-move');
        }
    if (s.check && s.highlight.check)
        addSquare(squares, s.check, 'check');
    if (s.selected) {
        addSquare(squares, s.selected, 'selected');
        if (s.movable.showDests) {
            var dests = s.movable.dests && s.movable.dests[s.selected];
            if (dests)
                for (i in dests) {
                    k = dests[i];
                    addSquare(squares, k, 'move-dest' + (s.pieces[k] ? ' oc' : ''));
                }
            var pDests = s.premovable.dests;
            if (pDests)
                for (i in pDests) {
                    k = pDests[i];
                    addSquare(squares, k, 'premove-dest' + (s.pieces[k] ? ' oc' : ''));
                }
        }
    }
    var premove = s.premovable.current;
    if (premove)
        for (i in premove)
            addSquare(squares, premove[i], 'current-premove');
    else if (s.predroppable.current)
        addSquare(squares, s.predroppable.current.key, 'current-premove');
    var o = s.exploding;
    if (o)
        for (i in o.keys)
            addSquare(squares, o.keys[i], 'exploding' + o.stage);
    return squares;
}
function addSquare(squares, key, klass) {
    if (squares[key])
        squares[key] += ' ' + klass;
    else
        squares[key] = klass;
}

},{"./util":16}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fen = require("./fen");
var util_1 = require("./util");
function defaults() {
    return {
        pieces: fen.read(fen.initial),
        orientation: 'white',
        turnColor: 'white',
        coordinates: true,
        autoCastle: true,
        viewOnly: false,
        disableContextMenu: false,
        resizable: true,
        addPieceZIndex: false,
        pieceKey: false,
        highlight: {
            lastMove: true,
            check: true
        },
        animation: {
            enabled: true,
            duration: 200
        },
        movable: {
            free: true,
            color: 'both',
            showDests: true,
            events: {},
            rookCastle: true
        },
        premovable: {
            enabled: true,
            showDests: true,
            castle: true,
            events: {}
        },
        predroppable: {
            enabled: false,
            events: {}
        },
        draggable: {
            enabled: true,
            distance: 3,
            autoDistance: true,
            centerPiece: true,
            showGhost: true,
            deleteOnDropOff: false
        },
        selectable: {
            enabled: true
        },
        stats: {
            dragged: !('ontouchstart' in window)
        },
        events: {},
        drawable: {
            enabled: true,
            visible: true,
            eraseOnClick: true,
            shapes: [],
            autoShapes: [],
            brushes: {
                green: { key: 'g', color: '#15781B', opacity: 1, lineWidth: 10 },
                red: { key: 'r', color: '#882020', opacity: 1, lineWidth: 10 },
                blue: { key: 'b', color: '#003088', opacity: 1, lineWidth: 10 },
                yellow: { key: 'y', color: '#e68f00', opacity: 1, lineWidth: 10 },
                paleBlue: { key: 'pb', color: '#003088', opacity: 0.4, lineWidth: 15 },
                paleGreen: { key: 'pg', color: '#15781B', opacity: 0.4, lineWidth: 15 },
                paleRed: { key: 'pr', color: '#882020', opacity: 0.4, lineWidth: 15 },
                paleGrey: { key: 'pgr', color: '#4a4a4a', opacity: 0.35, lineWidth: 15 }
            },
            pieces: {
                baseUrl: 'https://lichess1.org/assets/piece/cburnett/'
            },
            prevSvgHash: ''
        },
        hold: util_1.timer()
    };
}
exports.defaults = defaults;

},{"./fen":10,"./util":16}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("./util");
function createElement(tagName) {
    return document.createElementNS('http://www.w3.org/2000/svg', tagName);
}
exports.createElement = createElement;
var isTrident;
function renderSvg(state, root) {
    var d = state.drawable, curD = d.current, cur = curD && curD.mouseSq ? curD : undefined, arrowDests = {};
    d.shapes.concat(d.autoShapes).concat(cur ? [cur] : []).forEach(function (s) {
        if (s.dest)
            arrowDests[s.dest] = (arrowDests[s.dest] || 0) + 1;
    });
    var shapes = d.shapes.concat(d.autoShapes).map(function (s) {
        return {
            shape: s,
            current: false,
            hash: shapeHash(s, arrowDests, false)
        };
    });
    if (cur)
        shapes.push({
            shape: cur,
            current: true,
            hash: shapeHash(cur, arrowDests, true)
        });
    var fullHash = shapes.map(function (sc) { return sc.hash; }).join('');
    if (fullHash === state.drawable.prevSvgHash)
        return;
    state.drawable.prevSvgHash = fullHash;
    var defsEl = root.firstChild;
    syncDefs(d, shapes, defsEl);
    syncShapes(state, shapes, d.brushes, arrowDests, root, defsEl);
}
exports.renderSvg = renderSvg;
function syncDefs(d, shapes, defsEl) {
    var brushes = {};
    var brush;
    shapes.forEach(function (s) {
        if (s.shape.dest) {
            brush = d.brushes[s.shape.brush];
            if (s.shape.modifiers)
                brush = makeCustomBrush(brush, s.shape.modifiers);
            brushes[brush.key] = brush;
        }
    });
    var keysInDom = {};
    var el = defsEl.firstChild;
    while (el) {
        keysInDom[el.getAttribute('cgKey')] = true;
        el = el.nextSibling;
    }
    for (var key in brushes) {
        if (!keysInDom[key])
            defsEl.appendChild(renderMarker(brushes[key]));
    }
}
function syncShapes(state, shapes, brushes, arrowDests, root, defsEl) {
    if (isTrident === undefined)
        isTrident = util_1.computeIsTrident();
    var bounds = state.dom.bounds(), hashesInDom = {}, toRemove = [];
    shapes.forEach(function (sc) { hashesInDom[sc.hash] = false; });
    var el = defsEl.nextSibling, elHash;
    while (el) {
        elHash = el.getAttribute('cgHash');
        if (hashesInDom.hasOwnProperty(elHash))
            hashesInDom[elHash] = true;
        else
            toRemove.push(el);
        el = el.nextSibling;
    }
    toRemove.forEach(function (el) { return root.removeChild(el); });
    shapes.forEach(function (sc) {
        if (!hashesInDom[sc.hash])
            root.appendChild(renderShape(state, sc, brushes, arrowDests, bounds));
    });
}
function shapeHash(_a, arrowDests, current) {
    var orig = _a.orig, dest = _a.dest, brush = _a.brush, piece = _a.piece, modifiers = _a.modifiers;
    return [current, orig, dest, brush, dest && arrowDests[dest] > 1,
        piece && pieceHash(piece),
        modifiers && modifiersHash(modifiers)
    ].filter(function (x) { return x; }).join('');
}
function pieceHash(piece) {
    return [piece.color, piece.role, piece.scale].filter(function (x) { return x; }).join('');
}
function modifiersHash(m) {
    return '' + (m.lineWidth || '');
}
function renderShape(state, _a, brushes, arrowDests, bounds) {
    var shape = _a.shape, current = _a.current, hash = _a.hash;
    var el;
    if (shape.piece)
        el = renderPiece(state.drawable.pieces.baseUrl, orient(util_1.key2pos(shape.orig), state.orientation), shape.piece, bounds);
    else {
        var orig = orient(util_1.key2pos(shape.orig), state.orientation);
        if (shape.orig && shape.dest) {
            var brush = brushes[shape.brush];
            if (shape.modifiers)
                brush = makeCustomBrush(brush, shape.modifiers);
            el = renderArrow(brush, orig, orient(util_1.key2pos(shape.dest), state.orientation), current, arrowDests[shape.dest] > 1, bounds);
        }
        else
            el = renderCircle(brushes[shape.brush], orig, current, bounds);
    }
    el.setAttribute('cgHash', hash);
    return el;
}
function renderCircle(brush, pos, current, bounds) {
    var o = pos2px(pos, bounds), widths = circleWidth(bounds), radius = (bounds.width + bounds.height) / 32;
    return setAttributes(createElement('circle'), {
        stroke: brush.color,
        'stroke-width': widths[current ? 0 : 1],
        fill: 'none',
        opacity: opacity(brush, current),
        cx: o[0],
        cy: o[1],
        r: radius - widths[1] / 2
    });
}
function renderArrow(brush, orig, dest, current, shorten, bounds) {
    var m = arrowMargin(bounds, shorten && !current), a = pos2px(orig, bounds), b = pos2px(dest, bounds), dx = b[0] - a[0], dy = b[1] - a[1], angle = Math.atan2(dy, dx), xo = Math.cos(angle) * m, yo = Math.sin(angle) * m;
    return setAttributes(createElement('line'), {
        stroke: brush.color,
        'stroke-width': lineWidth(brush, current, bounds),
        'stroke-linecap': 'round',
        'marker-end': isTrident ? undefined : 'url(#arrowhead-' + brush.key + ')',
        opacity: opacity(brush, current),
        x1: a[0],
        y1: a[1],
        x2: b[0] - xo,
        y2: b[1] - yo
    });
}
function renderPiece(baseUrl, pos, piece, bounds) {
    var o = pos2px(pos, bounds), size = bounds.width / 8 * (piece.scale || 1), name = piece.color[0] + (piece.role === 'knight' ? 'n' : piece.role[0]).toUpperCase();
    return setAttributes(createElement('image'), {
        className: piece.role + " " + piece.color,
        x: o[0] - size / 2,
        y: o[1] - size / 2,
        width: size,
        height: size,
        href: baseUrl + name + '.svg'
    });
}
function renderMarker(brush) {
    var marker = setAttributes(createElement('marker'), {
        id: 'arrowhead-' + brush.key,
        orient: 'auto',
        markerWidth: 4,
        markerHeight: 8,
        refX: 2.05,
        refY: 2.01
    });
    marker.appendChild(setAttributes(createElement('path'), {
        d: 'M0,0 V4 L3,2 Z',
        fill: brush.color
    }));
    marker.setAttribute('cgKey', brush.key);
    return marker;
}
function setAttributes(el, attrs) {
    for (var key in attrs)
        el.setAttribute(key, attrs[key]);
    return el;
}
function orient(pos, color) {
    return color === 'white' ? pos : [9 - pos[0], 9 - pos[1]];
}
function makeCustomBrush(base, modifiers) {
    var brush = {
        color: base.color,
        opacity: Math.round(base.opacity * 10) / 10,
        lineWidth: Math.round(modifiers.lineWidth || base.lineWidth)
    };
    brush.key = [base.key, modifiers.lineWidth].filter(function (x) { return x; }).join('');
    return brush;
}
function circleWidth(bounds) {
    var base = bounds.width / 512;
    return [3 * base, 4 * base];
}
function lineWidth(brush, current, bounds) {
    return (brush.lineWidth || 10) * (current ? 0.85 : 1) / 512 * bounds.width;
}
function opacity(brush, current) {
    return (brush.opacity || 1) * (current ? 0.9 : 1);
}
function arrowMargin(bounds, shorten) {
    return isTrident ? 0 : ((shorten ? 20 : 10) / 512 * bounds.width);
}
function pos2px(pos, bounds) {
    return [(pos[0] - 0.5) * bounds.width / 8, (8.5 - pos[1]) * bounds.height / 8];
}

},{"./util":16}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
exports.ranks = [1, 2, 3, 4, 5, 6, 7, 8];

},{}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _a;
var cg = require("./types");
exports.colors = ['white', 'black'];
exports.invRanks = [8, 7, 6, 5, 4, 3, 2, 1];
exports.allKeys = (_a = Array.prototype).concat.apply(_a, cg.files.map(function (c) { return cg.ranks.map(function (r) { return c + r; }); }));
exports.pos2key = function (pos) { return exports.allKeys[8 * pos[0] + pos[1] - 9]; };
exports.key2pos = function (k) { return [k.charCodeAt(0) - 96, k.charCodeAt(1) - 48]; };
function memo(f) {
    var v;
    var ret = function () {
        if (v === undefined)
            v = f();
        return v;
    };
    ret.clear = function () { v = undefined; };
    return ret;
}
exports.memo = memo;
exports.timer = function () {
    var startAt;
    return {
        start: function () { startAt = Date.now(); },
        cancel: function () { startAt = undefined; },
        stop: function () {
            if (!startAt)
                return 0;
            var time = Date.now() - startAt;
            startAt = undefined;
            return time;
        }
    };
};
exports.opposite = function (c) { return c === 'white' ? 'black' : 'white'; };
function containsX(xs, x) {
    return xs !== undefined && xs.indexOf(x) !== -1;
}
exports.containsX = containsX;
exports.distanceSq = function (pos1, pos2) {
    return Math.pow(pos1[0] - pos2[0], 2) + Math.pow(pos1[1] - pos2[1], 2);
};
exports.samePiece = function (p1, p2) {
    return p1.role === p2.role && p1.color === p2.color;
};
exports.computeIsTrident = function () { return window.navigator.userAgent.indexOf('Trident/') > -1; };
var posToTranslateBase = function (pos, asWhite, xFactor, yFactor) { return [
    (asWhite ? pos[0] - 1 : 8 - pos[0]) * xFactor,
    (asWhite ? 8 - pos[1] : pos[1] - 1) * yFactor
]; };
exports.posToTranslateAbs = function (bounds) {
    var xFactor = bounds.width / 8, yFactor = bounds.height / 8;
    return function (pos, asWhite) { return posToTranslateBase(pos, asWhite, xFactor, yFactor); };
};
exports.posToTranslateRel = function (pos, asWhite) { return posToTranslateBase(pos, asWhite, 12.5, 12.5); };
exports.translateAbs = function (el, pos) {
    el.style.transform = "translate(" + pos[0] + "px," + pos[1] + "px)";
};
exports.translateRel = function (el, percents) {
    el.style.left = percents[0] + '%';
    el.style.top = percents[1] + '%';
};
exports.setVisible = function (el, v) {
    el.style.visibility = v ? 'visible' : 'hidden';
};
exports.eventPosition = function (e) {
    if (e.clientX || e.clientX === 0)
        return [e.clientX, e.clientY];
    if (e.touches && e.targetTouches[0])
        return [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
    return undefined;
};
exports.isRightButton = function (e) { return e.buttons === 2 || e.button === 2; };
exports.createEl = function (tagName, className) {
    var el = document.createElement(tagName);
    if (className)
        el.className = className;
    return el;
};
exports.raf = (window.requestAnimationFrame || window.setTimeout).bind(window);

},{"./types":15}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("./util");
var types_1 = require("./types");
var svg_1 = require("./svg");
function wrap(element, s, bounds) {
    element.innerHTML = '';
    element.classList.add('cg-board-wrap');
    util_1.colors.forEach(function (c) {
        element.classList.toggle('orientation-' + c, s.orientation === c);
    });
    element.classList.toggle('manipulable', !s.viewOnly);
    var board = util_1.createEl('div', 'cg-board');
    element.appendChild(board);
    var svg;
    if (s.drawable.visible && bounds) {
        svg = svg_1.createElement('svg');
        svg.appendChild(svg_1.createElement('defs'));
        element.appendChild(svg);
    }
    if (s.coordinates) {
        var orientClass = s.orientation === 'black' ? ' black' : '';
        element.appendChild(renderCoords(types_1.ranks, 'ranks' + orientClass));
        element.appendChild(renderCoords(types_1.files, 'files' + orientClass));
    }
    var ghost;
    if (bounds && s.draggable.showGhost) {
        ghost = util_1.createEl('piece', 'ghost');
        util_1.setVisible(ghost, false);
        element.appendChild(ghost);
    }
    return {
        board: board,
        ghost: ghost,
        svg: svg
    };
}
exports.default = wrap;
function renderCoords(elems, className) {
    var el = util_1.createEl('coords', className);
    var f;
    for (var i in elems) {
        f = util_1.createEl('coord');
        f.textContent = elems[i];
        el.appendChild(f);
    }
    return el;
}

},{"./svg":14,"./types":15,"./util":16}],18:[function(require,module,exports){
/******************************************************************************
 *                                                                            *
 *    This file is part of Kokopu, a JavaScript chess library.                *
 *    Copyright (C) 2018-2019  Yoann Le Montagner <yo35 -at- melix.net>       *
 *                                                                            *
 *    This program is free software: you can redistribute it and/or           *
 *    modify it under the terms of the GNU Lesser General Public License      *
 *    as published by the Free Software Foundation, either version 3 of       *
 *    the License, or (at your option) any later version.                     *
 *                                                                            *
 *    This program is distributed in the hope that it will be useful,         *
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of          *
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the            *
 *    GNU Lesser General Public License for more details.                     *
 *                                                                            *
 *    You should have received a copy of the GNU Lesser General               *
 *    Public License along with this program. If not, see                     *
 *    <http://www.gnu.org/licenses/>.                                         *
 *                                                                            *
 ******************************************************************************/


'use strict';


exports.i18n = require('./src/i18n');
exports.exception = require('./src/exception');

var util = require('./src/util');
exports.forEachSquare = util.forEachSquare;
exports.squareColor = util.squareColor;
exports.squareToCoordinates = util.squareToCoordinates;
exports.coordinatesToSquare = util.coordinatesToSquare;

exports.isMoveDescriptor = require('./src/movedescriptor').isMoveDescriptor;

exports.Position = require('./src/position').Position;
exports.Game = require('./src/game').Game;

var pgn = require('./src/pgn');
exports.pgnRead = pgn.pgnRead;

},{"./src/exception":21,"./src/game":22,"./src/i18n":23,"./src/movedescriptor":24,"./src/pgn":25,"./src/position":26,"./src/util":34}],19:[function(require,module,exports){
/******************************************************************************
 *                                                                            *
 *    This file is part of Kokopu, a JavaScript chess library.                *
 *    Copyright (C) 2018-2019  Yoann Le Montagner <yo35 -at- melix.net>       *
 *                                                                            *
 *    This program is free software: you can redistribute it and/or           *
 *    modify it under the terms of the GNU Lesser General Public License      *
 *    as published by the Free Software Foundation, either version 3 of       *
 *    the License, or (at your option) any later version.                     *
 *                                                                            *
 *    This program is distributed in the hope that it will be useful,         *
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of          *
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the            *
 *    GNU Lesser General Public License for more details.                     *
 *                                                                            *
 *    You should have received a copy of the GNU Lesser General               *
 *    Public License along with this program. If not, see                     *
 *    <http://www.gnu.org/licenses/>.                                         *
 *                                                                            *
 ******************************************************************************/


'use strict';


// Colors
exports.WHITE = 0;
exports.BLACK = 1;

// Pieces
exports.KING   = 0;
exports.QUEEN  = 1;
exports.ROOK   = 2;
exports.BISHOP = 3;
exports.KNIGHT = 4;
exports.PAWN   = 5;

// Colored pieces
exports.WK =  0; exports.BK =  1;
exports.WQ =  2; exports.BQ =  3;
exports.WR =  4; exports.BR =  5;
exports.WB =  6; exports.BB =  7;
exports.WN =  8; exports.BN =  9;
exports.WP = 10; exports.BP = 11;

// Special square values
exports.EMPTY = -1;
exports.INVALID = -2;

// Game result
exports.WHITE_WINS = 0;
exports.BLACK_WINS = 1;
exports.DRAW = 2;
exports.LINE = 3;

// Game variant
exports.REGULAR_CHESS = 0;
exports.CHESS_960 = 1;


// -----------------------------------------------------------------------------
// Conversion API constants (strings) <-> internal constants (integers)
// -----------------------------------------------------------------------------

var COLOR_SYMBOL   = 'wb';
var PIECE_SYMBOL   = 'kqrbnp';
var RANK_SYMBOL    = '12345678';
var FILE_SYMBOL    = 'abcdefgh';
var RESULT_SYMBOL  = ['1-0', '0-1', '1/2-1/2', '*'];
var VARIANT_SYMBOL = ['regular', 'chess960'];

exports.colorToString   = function(color  ) { return COLOR_SYMBOL  [color  ]; };
exports.pieceToString   = function(piece  ) { return PIECE_SYMBOL  [piece  ]; };
exports.rankToString    = function(rank   ) { return RANK_SYMBOL   [rank   ]; };
exports.fileToString    = function(file   ) { return FILE_SYMBOL   [file   ]; };
exports.resultToString  = function(result ) { return RESULT_SYMBOL [result ]; };
exports.variantToString = function(variant) { return VARIANT_SYMBOL[variant]; };

exports.colorFromString   = function(color  ) { return COLOR_SYMBOL  .indexOf(color  ); };
exports.pieceFromString   = function(piece  ) { return PIECE_SYMBOL  .indexOf(piece  ); };
exports.rankFromString    = function(rank   ) { return RANK_SYMBOL   .indexOf(rank   ); };
exports.fileFromString    = function(file   ) { return FILE_SYMBOL   .indexOf(file   ); };
exports.resultFromString  = function(result ) { return RESULT_SYMBOL .indexOf(result ); };
exports.variantFromString = function(variant) { return VARIANT_SYMBOL.indexOf(variant); };

exports.squareToString = function(square) {
	return FILE_SYMBOL[square % 16] + RANK_SYMBOL[Math.floor(square / 16)];
};

exports.squareFromString = function(square) {
	if(!/^[a-h][1-8]$/.test(square)) {
		return -1;
	}
	var file = FILE_SYMBOL.indexOf(square[0]);
	var rank = RANK_SYMBOL.indexOf(square[1]);
	return rank*16 + file;
};

exports.coloredPieceToString = function(cp) {
	return COLOR_SYMBOL[cp % 2] + PIECE_SYMBOL[Math.floor(cp / 2)];
};

exports.coloredPieceFromString = function(cp) {
	if(!/^[wb][kqrbnp]$/.test(cp)) {
		return -1;
	}
	var color = COLOR_SYMBOL.indexOf(cp[0]);
	var piece = PIECE_SYMBOL.indexOf(cp[1]);
	return piece*2 + color;
};


// -----------------------------------------------------------------------------
// Typedefs for documentation
// -----------------------------------------------------------------------------

/**
 * Either `'w'` (white) or `'b'` (black).
 * @typedef {string} Color
 */

/**
 * One-character string identifying a type of piece: `'p'` (pawn), `'n'`, `'b'`, `'r'`, `'q'` or `'k'`.
 * @typedef {string} Piece
 */

/**
 * Two-character string identifying a colored piece: `'wk'` (white king), `'br'` (black rook), etc...
 * @typedef {string} ColoredPiece
 */

/**
 * `'-'` Symbol used to identify an empty square.
 * @typedef {string} Empty
 */

/**
 * Either a one-character string among `'a'`, `'b'`, ..., `'h'` (indicating the file on which *en-passant* is allowed),
 * or `'-'` (indicating that *en-passant* is not allowed).
 * @typedef {string} EnPassantFlag
 */

/**
 * Two-character string identifying a castle: `'wq'` (white queen-side castle), `'wk'`, `'bq'` or `'bk'`.
 * @typedef {string} Castle
 */

/**
 * Two-character string identifying a castle with the Chess 960 rules: `'wa'` (white castle with rook initially on the a-file),
 * `'wb'`, `'wc'`, ..., `'bh'`.
 * @typedef {string} Castle960
 */

/**
 * Two-character string identifying a square: `'a1'`, `'a2'`, ..., `'h8'`.
 * @typedef {string} Square
 */

/**
 * Result of a chess game. Must be one of the following constant:
 *  - `'1-0'` (white wins),
 *  - `'1/2-1/2'` (draw),
 *  - `'0-1'` (black wins),
 *  - `'*'` (unfinished game, or undefined result).
 *
 * @typedef {string} GameResult
 */

/**
 * Variant of chess. Must be one of the following constant:
 *  - `'regular'` (regular chess rules),
 *  - `'chess960'` ([Chess 960](https://en.wikipedia.org/wiki/Chess960), also known as Fischer Random Chess).
 *
 * @typedef {string} GameVariant
 */

},{}],20:[function(require,module,exports){
/******************************************************************************
 *                                                                            *
 *    This file is part of Kokopu, a JavaScript chess library.                *
 *    Copyright (C) 2018-2019  Yoann Le Montagner <yo35 -at- melix.net>       *
 *                                                                            *
 *    This program is free software: you can redistribute it and/or           *
 *    modify it under the terms of the GNU Lesser General Public License      *
 *    as published by the Free Software Foundation, either version 3 of       *
 *    the License, or (at your option) any later version.                     *
 *                                                                            *
 *    This program is distributed in the hope that it will be useful,         *
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of          *
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the            *
 *    GNU Lesser General Public License for more details.                     *
 *                                                                            *
 *    You should have received a copy of the GNU Lesser General               *
 *    Public License along with this program. If not, see                     *
 *    <http://www.gnu.org/licenses/>.                                         *
 *                                                                            *
 ******************************************************************************/


'use strict';


/**
 * @class
 * @classdesc Describe a set of chess games (see also {@link Game}).
 *
 * @description This constructor is not exposed in the public Kokopu API. Only internal objects and functions
 *              are allowed to instantiate {@link Database} objects.
 */
var Database = exports.Database = function(impl, gameCountGetter, gameGetter) {
	this._impl = impl;
	this._gameCountGetter = gameCountGetter;
	this._gameGetter = gameGetter;
};


/**
 * Number of games in the database.
 *
 * @returns {number}
 */
Database.prototype.gameCount = function() {
	return this._gameCountGetter(this._impl);
};


/**
 * Return the game corresponding to the given index.
 *
 * @param {number} index Between 0 inclusive and {@link Database#gameCount} exclusive.
 * @returns {Game}
 */
Database.prototype.game = function(index) {
	return this._gameGetter(this._impl, index);
};

},{}],21:[function(require,module,exports){
/******************************************************************************
 *                                                                            *
 *    This file is part of Kokopu, a JavaScript chess library.                *
 *    Copyright (C) 2018-2019  Yoann Le Montagner <yo35 -at- melix.net>       *
 *                                                                            *
 *    This program is free software: you can redistribute it and/or           *
 *    modify it under the terms of the GNU Lesser General Public License      *
 *    as published by the Free Software Foundation, either version 3 of       *
 *    the License, or (at your option) any later version.                     *
 *                                                                            *
 *    This program is distributed in the hope that it will be useful,         *
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of          *
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the            *
 *    GNU Lesser General Public License for more details.                     *
 *                                                                            *
 *    You should have received a copy of the GNU Lesser General               *
 *    Public License along with this program. If not, see                     *
 *    <http://www.gnu.org/licenses/>.                                         *
 *                                                                            *
 ******************************************************************************/


'use strict';


/**
 * @module exception
 * @description This module defines the exceptions used by the library.
 */



/**
 * @class
 * @classdesc Exception thrown when an invalid argument is passed to a function.
 * @static
 */
var IllegalArgument = exports.IllegalArgument = function(functionName) {

	/**
	 * Name of the function that raises the exception.
	 * @member {string}
	 */
	this.functionName = functionName;
};

IllegalArgument.prototype.toString = function() {
	return 'Illegal argument in function ' + this.functionName;
};



/**
 * @class
 * @classdesc Exception thrown by the FEN parsing functions.
 * @static
 */
var InvalidFEN = exports.InvalidFEN = function(fen, message) {

	/**
	 * FEN string that causes the error.
	 * @member {string}
	 */
	this.fen = fen;

	/**
	 * Human-readable message describing the error.
	 * @member {string}
	 */
	this.message = buildMessage(message, 2, arguments);
};

InvalidFEN.prototype.toString = function() {
	return toStringImpl('InvalidFEN', this.message);
};



/**
 * @class
 * @classdesc Exception thrown by the move notation parsing functions.
 * @static
 */
var InvalidNotation = exports.InvalidNotation = function(fen, notation, message) {

	/**
	 * FEN representation of the position used to interpret the move notation.
	 * @member {string}
	 */
	this.fen = fen;

	/**
	 * Move notation that causes the error.
	 * @member {string}
	 */
	this.notation = notation;

	/**
	 * Human-readable message describing the error.
	 * @member {string}
	 */
	this.message = buildMessage(message, 3, arguments);
};

InvalidNotation.prototype.toString = function() {
	return toStringImpl('InvalidNotation', this.message);
};


/**
 * @class
 * @classdesc Exception thrown by the PGN parsing functions.
 * @static
 */
var InvalidPGN = exports.InvalidPGN = function(pgn, index, message) {

	/**
	 * PGN string that causes the error.
	 * @member {string}
	 */
	this.pgn = pgn;

	/**
	 * Index of the character in the PGN string where the parsing fails (or a negative value is no particular character is related to the error).
	 * @member {number}
	 */
	this.index = index;

	/**
	 * Human-readable message describing the error.
	 * @member {string}
	 */
	this.message = buildMessage(message, 3, arguments);
};

InvalidPGN.prototype.toString = function() {
	return toStringImpl('InvalidPGN', '[' + this.index + '] ' + this.message);
};



function buildMessage(message, offset, tokens) {
	for(var i = offset; i < tokens.length; ++i) {
		var re = new RegExp('%' + (i - offset + 1) + '\\$s');
		message = message.replace(re, tokens[i]);
	}
	return message;
}


function toStringImpl(exceptionName, message) {
	return exceptionName + ' -> ' + message;
}

},{}],22:[function(require,module,exports){
/******************************************************************************
 *                                                                            *
 *    This file is part of Kokopu, a JavaScript chess library.                *
 *    Copyright (C) 2018-2019  Yoann Le Montagner <yo35 -at- melix.net>       *
 *                                                                            *
 *    This program is free software: you can redistribute it and/or           *
 *    modify it under the terms of the GNU Lesser General Public License      *
 *    as published by the Free Software Foundation, either version 3 of       *
 *    the License, or (at your option) any later version.                     *
 *                                                                            *
 *    This program is distributed in the hope that it will be useful,         *
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of          *
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the            *
 *    GNU Lesser General Public License for more details.                     *
 *                                                                            *
 *    You should have received a copy of the GNU Lesser General               *
 *    Public License along with this program. If not, see                     *
 *    <http://www.gnu.org/licenses/>.                                         *
 *                                                                            *
 ******************************************************************************/


'use strict';


var bt = require('./basetypes');
var exception = require('./exception');
var i18n = require('./i18n');

var Position = require('./position').Position;



// -----------------------------------------------------------------------------
// Game
// -----------------------------------------------------------------------------

/**
 * @class
 * @classdesc Chess game, with the move history, the position at each step of the game,
 *            the comments and annotations (if any), the result of the game,
 *            and some meta-data such as the name of the players, the date of the game,
 *            the name of the tournament, etc...
 */
var Game = exports.Game = function() {
	this._playerName  = [undefined, undefined];
	this._playerElo   = [undefined, undefined];
	this._playerTitle = [undefined, undefined];
	this._event     = undefined;
	this._round     = undefined;
	this._date      = undefined;
	this._site      = undefined;
	this._annotator = undefined;
	this._result    = bt.LINE;

	this._initialPosition = new Position();
	this._fullMoveNumber = 1;
	this._mainVariationInfo = createVariationInfo(true);
};


/**
 * Get the player name.
 *
 * @param {Color} color
 * @returns {string?}
 *
 *//**
 *
 * Set the player name.
 *
 * @param {Color} color
 * @param {string?} value
 */
Game.prototype.playerName = function(color, value) {
	color = bt.colorFromString(color);
	if(color < 0) { throw new exception.IllegalArgument('Game#playerName()'); }
	if(arguments.length === 1) { return this._playerName[color]; }
	else { this._playerName[color] = value; }
};


/**
 * Get the player elo.
 *
 * @param {Color} color
 * @returns {string?}
 *
 *//**
 *
 * Set the player elo.
 *
 * @param {Color} color
 * @param {string?} value
 */
Game.prototype.playerElo = function(color, value) {
	color = bt.colorFromString(color);
	if(color < 0) { throw new exception.IllegalArgument('Game#playerElo()'); }
	if(arguments.length === 1) { return this._playerElo[color]; }
	else { this._playerElo[color] = value; }
};


/**
 * Get the player title.
 *
 * @param {Color} color
 * @returns {string?}
 *
 *//**
 *
 * Set the player title.
 *
 * @param {Color} color
 * @param {string?} value
 */
Game.prototype.playerTitle = function(color, value) {
	color = bt.colorFromString(color);
	if(color < 0) { throw new exception.IllegalArgument('Game#playerTitle()'); }
	if(arguments.length === 1) { return this._playerTitle[color]; }
	else { this._playerTitle[color] = value; }
};


/**
 * Get the event.
 *
 * @returns {string?}
 *
 *//**
 *
 * Set the event.
 *
 * @param {string?} value
 */
Game.prototype.event = function(value) {
	if(arguments.length === 0) { return this._event; }
	else { this._event = value; }
};


/**
 * Get the round.
 *
 * @returns {string?}
 *
 *//**
 *
 * Set the round.
 *
 * @param {string?} value
 */
Game.prototype.round = function(value) {
	if(arguments.length === 0) { return this._round; }
	else { this._round = value; }
};


/**
 * Get the date of the game.
 *
 * @returns {Date|{year:number, month:number}|{year:number}|undefined} Depending on what is defined, the method returns
 *          the whole date, or just the year and the month, or just the year, or `undefined`.
 *
 *//**
 *
 * Set the date of the game.
 *
 * @param {Date|{year:number, month:number}|{year:number}|undefined} value
 */
Game.prototype.date = function(value) {
	if(arguments.length === 0) {
		return this._date;
	}
	else if(value === undefined || value === null) {
		this._date = undefined;
	}
	else if(value instanceof Date) {
		this._date = value;
	}
	else if(typeof value === 'object' && typeof value.year === 'number' && typeof value.month === 'number') {
		this._date = { year: value.year, month: value.month };
	}
	else if(typeof value === 'object' && typeof value.year === 'number' && (value.month === undefined || value.month === null)) {
		this._date = { year: value.year };
	}
	else {
		throw new exception.IllegalArgument('Game#date()');
	}
};


/**
 * Get where the game takes place.
 *
 * @returns {string?}
 *
 *//**
 *
 * Set where the game takes place.
 *
 * @param {string?} value
 */
Game.prototype.site = function(value) {
	if(arguments.length === 0) { return this._site; }
	else { this._site = value; }
};


/**
 * Get the name of the annotator.
 *
 * @returns {string?}
 *
 *//**
 *
 * Set the name of the annotator.
 *
 * @param {string?} value
 */
Game.prototype.annotator = function(value) {
	if(arguments.length === 0) { return this._annotator; }
	else { this._annotator = value; }
};


/**
 * Get the result of the game.
 *
 * @returns {GameResult}
 *
 *//**
 *
 * Set the result of the game.
 *
 * @param {GameResult} value
 */
Game.prototype.result = function(value) {
	if(arguments.length === 0) {
		return bt.resultToString(this._result);
	}
	else {
		var result = bt.resultFromString(value);
		if(result < 0) {
			throw new exception.IllegalArgument('Game#result()');
		}
		this._result = result;
	}
};


/**
 * Get the {@link GameVariant} of the game.
 *
 * @returns {GameVariant}
 */
Game.prototype.variant = function() {
	return this._initialPosition.variant();
};


/**
 * Get the initial position of the game.
 *
 * @returns {Position}
 *
 *//**
 *
 * Set the initial position of the game.
 *
 * WARNING: this resets the main variation.
 *
 * @param {Position} initialPosition
 * @param {number} [fullMoveNumber=1]
 */
Game.prototype.initialPosition = function(initialPosition, fullMoveNumber) {
	if(arguments.length === 0) {
		return this._initialPosition;
	}
	else {
		if(!(initialPosition instanceof Position)) {
			throw new exception.IllegalArgument('Game#initialPosition()');
		}
		if(arguments.length === 1) {
			fullMoveNumber = 1;
		}
		else if(typeof fullMoveNumber !== 'number') {
			throw new exception.IllegalArgument('Game#initialPosition()');
		}
		this._initialPosition = initialPosition;
		this._fullMoveNumber = fullMoveNumber;
		this._mainVariationInfo = createVariationInfo(true);
	}
};


/**
 * The main variation of the game.
 *
 * @returns {Variation}
 */
Game.prototype.mainVariation = function() {
	return new Variation(this._mainVariationInfo, this._fullMoveNumber, this._initialPosition, true);
};



// -----------------------------------------------------------------------------
// Node
// -----------------------------------------------------------------------------

/**
 * @param {MoveDescriptor} moveDescriptor
 * @returns {object}
 * @ignore
 */
function createNodeInfo(moveDescriptor) {
	return {

		// `moveDescriptor` is `undefined` in case of a null-move.
		moveDescriptor: moveDescriptor,

		// Next move and alternative variations.
		next: undefined,
		variations: [],

		// Annotations and comments associated to the underlying move.
		nags: {},
		tags: {},
		comment: undefined,
		isLongComment: false
	};
}


/**
 * @class
 * @classdesc Represent one move in the tree structure formed by a chess game with multiple variations.
 *
 * @description This constructor is not exposed in the public Kokopu API. Only internal objects and functions
 *              are allowed to instantiate {@link Node} objects.
 */
function Node(info, fullMoveNumber, positionBefore, withinLongVariation) {
	this._info = info;
	this._fullMoveNumber = fullMoveNumber;
	this._positionBefore = positionBefore;
	this._withinLongVariation = withinLongVariation;
}


/**
 * SAN representation of the move associated to the current node.
 *
 * @returns {string}
 */
Node.prototype.notation = function() {
	return this._info.moveDescriptor === undefined ? '--' : this._positionBefore.notation(this._info.moveDescriptor);
};


/**
 * Chess position before the current move.
 *
 * @returns {Position}
 */
Node.prototype.positionBefore = function() {
	return new Position(this._positionBefore);
};


/**
 * Chess position obtained after the current move.
 *
 * @returns {Position}
 */
Node.prototype.position = function() {
	var position = new Position(this._positionBefore);
	if(this._info.moveDescriptor === undefined) {
		position.playNullMove();
	}
	else {
		position.play(this._info.moveDescriptor);
	}
	return position;
};


/**
 * Full-move number. It starts at 1, and is incremented after each black move.
 *
 * @returns {number}
 */
Node.prototype.fullMoveNumber = function() {
	return this._fullMoveNumber;
};


/**
 * Color the side corresponding to the current move.
 *
 * @returns {Color}
 */
Node.prototype.moveColor = function() {
	return this._positionBefore.turn();
};


/**
 * Play the underlying move descriptor on the internal object `_positionBefore`, and update `_fullMoveNumber` accordingly.
 *
 * @param {Node} node
 * @ignore
 */
function goToNextPosition(node) {

	// Update `_positionBefore`.
	if(node._info.moveDescriptor === undefined) {
		node._positionBefore.playNullMove();
	}
	else {
		node._positionBefore.play(node._info.moveDescriptor);
	}

	// Increment the full-move number if necessary.
	if(node._positionBefore.turn() === 'w') {
		++node._fullMoveNumber;
	}
}


/**
 * Go to the next move within the same variation.
 *
 * @returns {Node?} `undefined` if the current move is the last move of the variation, or the current node pointing at the next move otherwise.
 */
Node.prototype.next = function() {
	if(!this._info.next) { return undefined; }
	goToNextPosition(this);
	this._info = this._info.next;
	return this;
};


/**
 * Return the variations that can be followed instead of the current move.
 *
 * @returns {Variation[]}
 */
Node.prototype.variations = function() {
	var result = [];
	for(var i = 0; i < this._info.variations.length; ++i) {
		result.push(new Variation(this._info.variations[i], this._fullMoveNumber, new Position(this._positionBefore), this._withinLongVariation));
	}
	return result;
};


/**
 * Return the NAGs associated to the current move.
 *
 * @returns {number[]}
 */
Node.prototype.nags = function() {
	var result = [];
	for(var key in this._info.nags) {
		if(this._info.nags[key]) {
			result.push(key);
		}
	}
	return result;
};


/**
 * Check whether the current move has the given NAG or not.
 *
 * @param {number} nag
 * @returns {boolean}
 */
Node.prototype.hasNag = function(nag) {
	return Boolean(this._info.nags[nag]);
};


/**
 * Add the given NAG to the current move.
 *
 * @param {number} nag
 */
Node.prototype.addNag = function(nag) {
	this._info.nags[nag] = true;
};


/**
 * Remove the given NAG from the current move.
 *
 * @param {number} nag
 */
Node.prototype.removeNag = function(nag) {
	delete this._info.nags[nag];
};


/**
 * Return the keys of the tags associated to the current move.
 *
 * @returns {string[]}
 */
Node.prototype.tags = function() {
	var result = [];
	for(var key in this._info.tags) {
		if(this._info.tags[key] !== undefined) {
			result.push(key);
		}
	}
	return result;
};


/**
 * Get the value associated to the given tag key on the current move.
 *
 * @param {string} tagKey
 * @returns {string?} `undefined` if no value is associated to this tag key on the current move.
 *
 *//**
 *
 * Set the value associated to the given tag key on the current move.
 *
 * @param {string} tagKey
 * @param {string?} value
 */
Node.prototype.tag = function(tagKey, value) {
	if(arguments.length === 1) {
		return this._info.tags[tagKey];
	}
	else {
		this._info.tags[tagKey] = value;
	}
};


/**
 * Get the text comment associated to the current move.
 *
 * @returns {string?} `undefined` if no comment is defined for the move.
 *
 *//**
 *
 * Set the text comment associated to the current move.
 *
 * @param {string} value
 * @param {boolean} [isLongComment=false]
 */
Node.prototype.comment = function(value, isLongComment) {
	if(arguments.length === 0) {
		return this._info.comment;
	}
	else {
		this._info.comment = value;
		this._info.isLongComment = Boolean(isLongComment);
	}
};


/**
 * Whether the text comment associated to the current move is long or short.
 *
 * @returns {boolean}
 */
Node.prototype.isLongComment = function() {
	return this._withinLongVariation && this._info.isLongComment;
};


/**
 * Compute the move descriptor associated to the given SAN notation, assuming the given position.
 *
 * @param {Position} position Position based on which the given SAN notation must be interpreted.
 * @param {string} move SAN notation (or `'--'` for a null-move).
 * @returns {MoveDescriptor?} `undefined` is returned in case of a null-move.
 * @throws {module:exception.InvalidNotation} If the move notation cannot be parsed.
 * @ignore
 */
function computeMoveDescriptor(position, move) {
	if(move === '--') {
		if(!position.isNullMoveLegal()) {
			throw new exception.InvalidNotation(position, '--', i18n.ILLEGAL_NULL_MOVE);
		}
		return undefined;
	}
	else {
		return position.notation(move);
	}
}


/**
 * Play the given move, and make the current {@link Node} point at the resulting position.
 *
 * @param {string} move SAN notation (or `'--'` for a null-move).
 * @returns {Node} The current node, pointing at the new position.
 * @throws {module:exception.InvalidNotation} If the move notation cannot be parsed.
 */
Node.prototype.play = function(move) {
	goToNextPosition(this);
	this._info.next = createNodeInfo(computeMoveDescriptor(this._positionBefore, move));
	this._info = this._info.next;
	return this;
};


/**
 * Create a new variation that can be played instead of the current move.
 *
 * @param {boolean} isLongVariation
 * @returns {Variation}
 */
Node.prototype.addVariation = function(isLongVariation) {
	this._info.variations.push(createVariationInfo(isLongVariation));
	return new Variation(this._info.variations[this._info.variations.length - 1], this._fullMoveNumber, new Position(this._positionBefore),
		this._withinLongVariation);
};



// -----------------------------------------------------------------------------
// Variation
// -----------------------------------------------------------------------------

/**
 * @param {boolean} isLongVariation
 * @returns {object}
 * @ignore
 */
function createVariationInfo(isLongVariation) {
	return {

		isLongVariation: isLongVariation,

		// First move of the variation.
		first: undefined,

		// Annotations and comments associated to the underlying variation.
		nags: {},
		tags: {},
		comment: undefined,
		isLongComment: false
	};
}


/**
 * @class
 * @classdesc Represent one variation in the tree structure formed by a chess game, meaning
 * a starting chess position and list of played consecutively from this position.
 *
 * @description This constructor is not exposed in the public Kokopu API. Only internal objects and functions
 *              are allowed to instantiate {@link Variation} objects.
 */
function Variation(info, initialFullMoveNumber, initialPosition, withinLongVariation) {
	this._info = info;
	this._initialFullMoveNumber = initialFullMoveNumber;
	this._initialPosition = initialPosition;
	this._withinLongVariation = withinLongVariation && info.isLongVariation;
}


/**
 * Whether the current variation is considered as a "long" variation, i.e. a variation that
 * should be displayed in an isolated block.
 *
 * @returns {boolean}
 */
Variation.prototype.isLongVariation = function() {
	return this._withinLongVariation;
};


/**
 * Chess position at the beginning of the variation.
 *
 * @returns {Position}
 */
Variation.prototype.initialPosition = function() {
	return new Position(this._initialPosition);
};


/**
 * Full-move number at the beginning of the variation.
 *
 * @returns {number}
 */
Variation.prototype.initialFullMoveNumber = function() {
	return this._initialFullMoveNumber;
};


/**
 * First move of the variation.
 *
 * @returns {Node?} `undefined` if the variation is empty.
 */
Variation.prototype.first = function() {
	if(!this._info.first) { return undefined; }
	return new Node(this._info.first, this._initialFullMoveNumber, new Position(this._initialPosition), this._withinLongVariation);
};


// Methods inherited from `Node`.
Variation.prototype.nags          = Node.prototype.nags         ;
Variation.prototype.hasNag        = Node.prototype.hasNag       ;
Variation.prototype.addNag        = Node.prototype.addNag       ;
Variation.prototype.removeNag     = Node.prototype.removeNag    ;
Variation.prototype.tags          = Node.prototype.tags         ;
Variation.prototype.tag           = Node.prototype.tag          ;
Variation.prototype.comment       = Node.prototype.comment      ;
Variation.prototype.isLongComment = Node.prototype.isLongComment;


/**
 * Play the given move as the first move of the variation.
 *
 * @param {string} move SAN notation (or `'--'` for a null-move).
 * @returns {Node} A new node object, to represents the new move.
 * @throws {module:exception.InvalidNotation} If the move notation cannot be parsed.
 */
Variation.prototype.play = function(move) {
	var positionBefore = new Position(this._initialPosition);
	this._info.first = createNodeInfo(computeMoveDescriptor(positionBefore, move));
	return new Node(this._info.first, this._initialFullMoveNumber, positionBefore, this._withinLongVariation);
};

},{"./basetypes":19,"./exception":21,"./i18n":23,"./position":26}],23:[function(require,module,exports){
/******************************************************************************
 *                                                                            *
 *    This file is part of Kokopu, a JavaScript chess library.                *
 *    Copyright (C) 2018-2019  Yoann Le Montagner <yo35 -at- melix.net>       *
 *                                                                            *
 *    This program is free software: you can redistribute it and/or           *
 *    modify it under the terms of the GNU Lesser General Public License      *
 *    as published by the Free Software Foundation, either version 3 of       *
 *    the License, or (at your option) any later version.                     *
 *                                                                            *
 *    This program is distributed in the hope that it will be useful,         *
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of          *
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the            *
 *    GNU Lesser General Public License for more details.                     *
 *                                                                            *
 *    You should have received a copy of the GNU Lesser General               *
 *    Public License along with this program. If not, see                     *
 *    <http://www.gnu.org/licenses/>.                                         *
 *                                                                            *
 ******************************************************************************/


'use strict';


/**
 * @module i18n
 * @description This module defines the localizable strings used by the library.
 */



// Ordinal integers (from 1 to 8).
exports.ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

// FEN parsing error messages
exports.WRONG_NUMBER_OF_FEN_FIELDS                = 'A FEN string must contain exactly 6 space-separated fields.';
exports.WRONG_NUMBER_OF_SUBFIELDS_IN_BOARD_FIELD  = 'The 1st field of a FEN string must contain exactly 8 `/`-separated subfields.';
exports.UNEXPECTED_CHARACTER_IN_BOARD_FIELD       = 'Unexpected character in the 1st field of the FEN string: `%1$s`.';
exports.UNEXPECTED_END_OF_SUBFIELD_IN_BOARD_FIELD = 'The %1$s subfield of the FEN string 1st field is unexpectedly short.';
exports.INVALID_TURN_FIELD                        = 'The 2nd field of a FEN string must be either `w` or `b`.';
exports.INVALID_CASTLING_FIELD                    = 'The 3rd field of a FEN string must be either `-` or a list of characters among `K`, `Q`, `k` and `q` (in this order).';
exports.INVALID_EN_PASSANT_FIELD                  = 'The 4th field of a FEN string must be either `-` or a square from the 3rd or 6th rank where en-passant is allowed.';
exports.WRONG_RANK_IN_EN_PASSANT_FIELD            = 'The rank number indicated in the FEN string 4th field is inconsistent with respect to the 2nd field.';
exports.INVALID_MOVE_COUNTING_FIELD               = 'The %1$s field of a FEN string must be a number.';

// Notation parsing error messages
exports.INVALID_MOVE_NOTATION_SYNTAX        = 'The syntax of the move notation is invalid.';
exports.ILLEGAL_POSITION                    = 'The position is not legal.';
exports.ILLEGAL_QUEEN_SIDE_CASTLING         = 'Queen-side castling is not legal in the considered position.';
exports.ILLEGAL_KING_SIDE_CASTLING          = 'King-side castling is not legal in the considered position.';
exports.NO_PIECE_CAN_MOVE_TO                = 'No %1$s can move to %2$s.';
exports.NO_PIECE_CAN_MOVE_TO_DISAMBIGUATION = 'No %1$s on the specified rank/file can move to %2$s.';
exports.REQUIRE_DISAMBIGUATION              = 'Cannot determine uniquely which %1$s is supposed to move to %2$s.';
exports.WRONG_DISAMBIGUATION_SYMBOL         = 'Wrong disambiguation symbol (expected: `%1$s`, observed: `%2$s`).';
exports.TRYING_TO_CAPTURE_YOUR_OWN_PIECES   = 'Capturing its own pieces is not legal.';
exports.INVALID_CAPTURING_PAWN_MOVE         = 'Invalid capturing pawn move.';
exports.INVALID_NON_CAPTURING_PAWN_MOVE     = 'Invalid non-capturing pawn move.';
exports.NOT_SAFE_FOR_WHITE_KING             = 'This move would put let the white king in check.';
exports.NOT_SAFE_FOR_BLACK_KING             = 'This move would put let the black king in check.';
exports.MISSING_PROMOTION                   = 'A promoted piece must be specified for this move.';
exports.MISSING_PROMOTION_SYMBOL            = 'Character `=` is required to specify a promoted piece.';
exports.INVALID_PROMOTED_PIECE              = '%1$s cannot be specified as a promoted piece.';
exports.ILLEGAL_PROMOTION                   = 'Specifying a promoted piece is illegal for this move.';
exports.ILLEGAL_NULL_MOVE                   = 'Cannot play a null-move in this position.';
exports.MISSING_CAPTURE_SYMBOL              = 'Capture symbol `x` is missing.';
exports.INVALID_CAPTURE_SYMBOL              = 'This move is not a capture move.';
exports.WRONG_CHECK_CHECKMATE_SYMBOL        = 'Wrong check/checkmate symbol (expected: `%1$s`, observed: `%2$s`).';

// PGN parsing error messages
exports.INVALID_PGN_TOKEN               = 'Unrecognized character or group of characters.';
exports.INVALID_MOVE_IN_PGN_TEXT        = 'Invalid move (%1$s). %2$s';
exports.INVALID_FEN_IN_PGN_TEXT         = 'Invalid FEN string in the initial position header. %1$s';
exports.UNEXPECTED_PGN_HEADER           = 'Unexpected PGN game header.';
exports.UNEXPECTED_BEGIN_OF_VARIATION   = 'Unexpected begin of variation.';
exports.UNEXPECTED_END_OF_VARIATION     = 'Unexpected end of variation.';
exports.UNEXPECTED_END_OF_GAME          = 'Unexpected end of game: there are pending variations.';
exports.UNEXPECTED_END_OF_TEXT          = 'Unexpected end of text: there is a pending game.';
exports.INVALID_GAME_INDEX              = 'Game index %1$s is invalid (only %2$s game(s) found in the PGN data).';
exports.UNKNOWN_VARIANT                 = 'Unknown chess game variant (%1$s).';

},{}],24:[function(require,module,exports){
/******************************************************************************
 *                                                                            *
 *    This file is part of Kokopu, a JavaScript chess library.                *
 *    Copyright (C) 2018-2019  Yoann Le Montagner <yo35 -at- melix.net>       *
 *                                                                            *
 *    This program is free software: you can redistribute it and/or           *
 *    modify it under the terms of the GNU Lesser General Public License      *
 *    as published by the Free Software Foundation, either version 3 of       *
 *    the License, or (at your option) any later version.                     *
 *                                                                            *
 *    This program is distributed in the hope that it will be useful,         *
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of          *
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the            *
 *    GNU Lesser General Public License for more details.                     *
 *                                                                            *
 *    You should have received a copy of the GNU Lesser General               *
 *    Public License along with this program. If not, see                     *
 *    <http://www.gnu.org/licenses/>.                                         *
 *                                                                            *
 ******************************************************************************/


'use strict';


var bt = require('./basetypes');
var exception = require('./exception');


var CASTLING_FLAG   = 0x01;
var EN_PASSANT_FLAG = 0x02;
var CAPTURE_FLAG    = 0x04;
var PROMOTION_FLAG  = 0x08;


exports.make = function(from, to, color, movingPiece, capturedPiece) {
	var flags = capturedPiece >= 0 ? CAPTURE_FLAG : 0x00;
	var movingColoredPiece = movingPiece*2 + color;
	return new MoveDescriptor(flags, from, to, movingColoredPiece, movingColoredPiece, capturedPiece, -1, -1);
};


exports.makeCastling = function(from, to, rookFrom, rookTo, color) {
	var movingKing = bt.KING*2 + color;
	var movingRook = bt.ROOK*2 + color;
	return new MoveDescriptor(CASTLING_FLAG, from, to, movingKing, movingKing, movingRook, rookFrom, rookTo);
};


exports.makeEnPassant = function(from, to, enPassantSquare, color) {
	var flags = EN_PASSANT_FLAG | CAPTURE_FLAG;
	var movingPawn = bt.PAWN*2 + color;
	var capturedPawn = bt.PAWN*2 + 1 - color;
	return new MoveDescriptor(flags, from, to, movingPawn, movingPawn, capturedPawn, enPassantSquare, -1);
};


exports.makePromotion = function(from, to, color, promotion, capturedPiece) {
	var flags = PROMOTION_FLAG | (capturedPiece >= 0 ? CAPTURE_FLAG : 0x00);
	var movingPawn = bt.PAWN*2 + color;
	var finalPiece = promotion*2 + color;
	return new MoveDescriptor(flags, from, to, movingPawn, finalPiece, capturedPiece, -1, -1);
};


/**
 * @class
 * @classdesc Describe a legal chess move, with its characteristics.
 *
 * @description This constructor is not exposed in the public Kokopu API. Only internal objects and functions
 *              are allowed to instantiate {@link MoveDescriptor} objects.
 */
function MoveDescriptor(flags, from, to, movingPiece, finalPiece, optionalPiece, optionalSquare1, optionalSquare2) {
	this._type            = flags          ;
	this._from            = from           ;
	this._to              = to             ;
	this._movingPiece     = movingPiece    ;
	this._finalPiece      = finalPiece     ;
	this._optionalPiece   = optionalPiece  ; // Captured piece in case of capture, moving rook in case of castling.
	this._optionalSquare1 = optionalSquare1; // Rook-from or en-passant square.
	this._optionalSquare2 = optionalSquare2; // Rook-to.
}


/**
 * Whether the given object is a {@link MoveDescriptor} or not.
 *
 * @param {Object} obj
 * @returns {boolean}
 */
exports.isMoveDescriptor = function(obj) {
	return obj instanceof MoveDescriptor;
};


MoveDescriptor.prototype.toString = function() {
	var result = bt.squareToString(this._from) + bt.squareToString(this._to);
	if(this.isPromotion()) {
		result += this.promotion().toUpperCase();
	}
	else if(this.isCastling()) {
		result += 'O';
	}
	return result;
};


/**
 * Whether or not the current move is a castling move.
 *
 * @returns {boolean}
 */
MoveDescriptor.prototype.isCastling = function() {
	return (this._type & CASTLING_FLAG) !== 0;
};


/**
 * Whether or not the current move is a *en-passant* move.
 *
 * @returns {boolean}
 */
MoveDescriptor.prototype.isEnPassant = function() {
	return (this._type & EN_PASSANT_FLAG) !== 0;
};


/**
 * Whether or not the current move is a capture (either a regular capture or a *en-passant* capture).
 *
 * @returns {boolean}
 */
MoveDescriptor.prototype.isCapture = function() {
	return (this._type & CAPTURE_FLAG) !== 0;
};


/**
 * Whether or not the current move is a promotion.
 *
 * @returns {boolean}
 */
MoveDescriptor.prototype.isPromotion = function() {
	return (this._type & PROMOTION_FLAG) !== 0;
};


/**
 * Origin square of the moving piece. In case of castling, this is the origin square of the king.
 *
 * @returns {Square}
 */
MoveDescriptor.prototype.from = function() {
	return bt.squareToString(this._from);
};


/**
 * Destination square of the moving piece. In case of castling, this is the destination square of the king.
 *
 * @returns {Square}
 */
MoveDescriptor.prototype.to = function() {
	return bt.squareToString(this._to);
};


/**
 * Color of the moving piece.
 *
 * @returns {Color}
 */
MoveDescriptor.prototype.color = function() {
	return bt.colorToString(this._movingPiece % 2);
};


/**
 * Type of the moving piece. In case of castling, the moving piece is considered to be the king.
 *
 * @returns {Piece}
 */
MoveDescriptor.prototype.movingPiece = function() {
	return bt.pieceToString(Math.floor(this._movingPiece / 2));
};


/**
 * Color and type of the moving piece. In case of castling, the moving piece is considered to be the king.
 *
 * @returns {ColoredPiece}
 */
MoveDescriptor.prototype.movingColoredPiece = function() {
	return bt.coloredPieceToString(this._movingPiece);
};


/**
 * Type of the captured piece.
 *
 * @returns {Piece}
 * @throws {module:exception.IllegalArgument} If the current move is not a capture (see {@link MoveDescriptor#isCapture}).
 */
MoveDescriptor.prototype.capturedPiece = function() {
	if(!this.isCapture()) { throw new exception.IllegalArgument('MoveDescriptor#capturedPiece()'); }
	return bt.pieceToString(Math.floor(this._optionalPiece / 2));
};


/**
 * Color and type of the captured piece.
 *
 * @returns {ColoredPiece}
 * @throws {module:exception.IllegalArgument} If the current move is not a capture (see {@link MoveDescriptor#isCapture}).
 */
MoveDescriptor.prototype.capturedColoredPiece = function() {
	if(!this.isCapture()) { throw new exception.IllegalArgument('MoveDescriptor#capturedColoredPiece()'); }
	return bt.coloredPieceToString(this._optionalPiece);
};


/**
 * Origin square of the rook, in case of a castling move.
 *
 * @returns {Square}
 * @throws {module:exception.IllegalArgument} If the current move is not a castling move (see {@link MoveDescriptor#isCastling}).
 */
MoveDescriptor.prototype.rookFrom = function() {
	if(!this.isCastling()) { throw new exception.IllegalArgument('MoveDescriptor#rookFrom()'); }
	return bt.squareToString(this._optionalSquare1);
};


/**
 * Destination square of the rook, in case of a castling move.
 *
 * @returns {Square}
 * @throws {module:exception.IllegalArgument} If the current move is not a castling move (see {@link MoveDescriptor#isCastling}).
 */
MoveDescriptor.prototype.rookTo = function() {
	if(!this.isCastling()) { throw new exception.IllegalArgument('MoveDescriptor#rookTo()'); }
	return bt.squareToString(this._optionalSquare2);
};


/**
 * Square containing the captured pawn, in case of a *en-passant* move.
 *
 * @returns {Square}
 * @throws {module:exception.IllegalArgument} If the current move is not a *en-passant* move (see {@link MoveDescriptor#isEnPassant}).
 */
MoveDescriptor.prototype.enPassantSquare = function() {
	if(!this.isEnPassant()) { throw new exception.IllegalArgument('MoveDescriptor#enPassantSquare()'); }
	return bt.squareToString(this._optionalSquare1);
};


/**
 * Type of the promoted piece, in case of a promotion.
 *
 * @returns {Piece}
 * @throws {module:exception.IllegalArgument} If the current move is not a promotion (see {@link MoveDescriptor#isPromotion}).
 */
MoveDescriptor.prototype.promotion = function() {
	if(!this.isPromotion()) { throw new exception.IllegalArgument('MoveDescriptor#promotion()'); }
	return bt.pieceToString(Math.floor(this._finalPiece / 2));
};


/**
 * Color and type of the promoted piece, in case of a promotion.
 *
 * @returns {ColoredPiece}
 * @throws {module:exception.IllegalArgument} If the current move is not a promotion (see {@link MoveDescriptor#isPromotion}).
 */
MoveDescriptor.prototype.coloredPromotion = function() {
	if(!this.isPromotion()) { throw new exception.IllegalArgument('MoveDescriptor#coloredPromotion()'); }
	return bt.coloredPieceToString(this._finalPiece);
};

},{"./basetypes":19,"./exception":21}],25:[function(require,module,exports){
/******************************************************************************
 *                                                                            *
 *    This file is part of Kokopu, a JavaScript chess library.                *
 *    Copyright (C) 2018-2019  Yoann Le Montagner <yo35 -at- melix.net>       *
 *                                                                            *
 *    This program is free software: you can redistribute it and/or           *
 *    modify it under the terms of the GNU Lesser General Public License      *
 *    as published by the Free Software Foundation, either version 3 of       *
 *    the License, or (at your option) any later version.                     *
 *                                                                            *
 *    This program is distributed in the hope that it will be useful,         *
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of          *
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the            *
 *    GNU Lesser General Public License for more details.                     *
 *                                                                            *
 *    You should have received a copy of the GNU Lesser General               *
 *    Public License along with this program. If not, see                     *
 *    <http://www.gnu.org/licenses/>.                                         *
 *                                                                            *
 ******************************************************************************/


'use strict';


var exception = require('./exception');
var i18n = require('./i18n');

var Position = require('./position').Position;
var Game = require('./game').Game;
var Database = require('./database').Database;
var TokenStream = require('./private_pgn/tokenstream').TokenStream;


function parseNullableHeader(value) {
	return value === '?' ? undefined : value;
}


function parseDateHeader(value) {
	if(/^([0-9]{4})\.([0-9]{2})\.([0-9]{2})$/.test(value)) {
		var year = RegExp.$1;
		var month = RegExp.$2;
		var day = RegExp.$3;
		year = parseInt(year, 10);
		month = parseInt(month, 10);
		day = parseInt(day, 10);
		if(month >= 1 && month <= 12 && day >= 1 && day <= 31) {
			return new Date(year, month - 1, day);
		}
	}
	else if(/^([0-9]{4})\.([0-9]{2})\.\?\?$/.test(value)) {
		var year = RegExp.$1;
		var month = parseInt(RegExp.$2, 10);
		if(month >= 1 && month <= 12) {
			return { year: parseInt(year, 10), month: month };
		}
	}
	else if(/^([0-9]{4})(?:\.\?\?\.\?\?)?$/.test(value)) {
		return { year: parseInt(RegExp.$1, 10) };
	}
	return undefined;
}


function processHeader(stream, game, initialPositionFactory, key, value) {
	value = value.trim();
	switch(key) {
		case 'White': game.playerName('w', parseNullableHeader(value)); break;
		case 'Black': game.playerName('b', parseNullableHeader(value)); break;
		case 'WhiteElo': game.playerElo('w', value); break;
		case 'BlackElo': game.playerElo('b', value); break;
		case 'WhiteTitle': game.playerTitle('w', value); break;
		case 'BlackTitle': game.playerTitle('b', value); break;
		case 'Event': game.event(parseNullableHeader(value)); break;
		case 'Round': game.round(parseNullableHeader(value)); break;
		case 'Date': game.date(parseDateHeader(value)); break;
		case 'Site': game.site(parseNullableHeader(value)); break;
		case 'Annotator': game.annotator(value); break;

		// The header 'FEN' has a special meaning, in that it is used to define a custom
		// initial position, that may be different from the usual one.
		case 'FEN':
			initialPositionFactory.fen = value;
			initialPositionFactory.fenTokenIndex = stream.tokenIndex();
			break;

		// The header 'Variant' indicates that this is not a regular chess game.
		case 'Variant':
			var variant = value.toLowerCase();
			if(variant === 'chess960' || variant === 'fischerandom') {
				initialPositionFactory.variant = 'chess960';
			}
			else if(variant === 'regular' || variant === 'standard') {
				initialPositionFactory.variant = false;
			}
			else {
				throw stream.invalidPGNException(i18n.UNKNOWN_VARIANT, value);
			}
			break;
	}
}


function initializeInitialPosition(stream, game, initialPositionFactory) {

	// Nothing to do if no custom FEN has been defined -> let the default state.
	if(!initialPositionFactory.fen) { return; }

	try {
		var position = new Position(initialPositionFactory.variant ? initialPositionFactory.variant : 'regular', 'empty');
		var moveCounters = position.fen(initialPositionFactory.fen);
		game.initialPosition(position, moveCounters.fullMoveNumber);
	}
	catch(error) {
		if(error instanceof exception.InvalidFEN) {
			throw stream.invalidPGNException(initialPositionFactory.fenTokenIndex, i18n.INVALID_FEN_IN_PGN_TEXT, error.message);
		}
		else {
			throw error;
		}
	}
}


/**
 * Parse exactly 1 game from the given stream.
 *
 * @param {TokenStream} stream
 * @returns {Game}
 * @throws {module:exception.InvalidPGN}
 * @ignore
 */
function doParseGame(stream) {

	// State variable for syntaxic analysis.
	var game            = null;  // the result
	var node            = null;  // current node (or variation) to which the next move should be appended
	var nodeIsVariation = false; // whether the current node is a variation or not
	var nodeStack       = [];    // when starting a variation, its parent node (btw., always a "true" node, not a variation) is stacked here
	var initialPositionFactory = {};

	// Token loop
	while(stream.consumeToken()) {

		// Create a new game if necessary
		if(game === null) {
			game = new Game();
		}

		// Matching anything else different from a header means that the move section
		// is going to be parse => set-up the root node.
		if(stream.token() !== TokenStream.HEADER && node === null) {
			initializeInitialPosition(stream, game, initialPositionFactory);
			node = game.mainVariation();
			nodeIsVariation = true;
		}

		// Token type switch
		switch(stream.token()) {

			// Header
			case TokenStream.HEADER:
				if(node !== null) {
					throw stream.invalidPGNException(i18n.UNEXPECTED_PGN_HEADER);
				}
				processHeader(stream, game, initialPositionFactory, stream.tokenValue().key, stream.tokenValue().value);
				break;

			// Move or null-move
			case TokenStream.MOVE:
				try {
					node = node.play(stream.tokenValue());
					nodeIsVariation = false;
				}
				catch(error) {
					if(error instanceof exception.InvalidNotation) {
						throw stream.invalidPGNException(i18n.INVALID_MOVE_IN_PGN_TEXT, error.notation, error.message);
					}
					else {
						throw error;
					}
				}
				break;

			// NAG
			case TokenStream.NAG:
				node.addNag(stream.tokenValue());
				break;

			// Comment
			case TokenStream.COMMENT:
				var tags = stream.tokenValue().tags;
				for(var key in tags) {
					if(tags[key] !== undefined) {
						node.tag(key, tags[key]);
					}
				}
				if(stream.tokenValue().comment !== undefined) {
					node.comment(stream.tokenValue().comment, stream.emptyLineFound());
				}
				break;

			// Begin of variation
			case TokenStream.BEGIN_VARIATION:
				if(nodeIsVariation) {
					throw stream.invalidPGNException(i18n.UNEXPECTED_BEGIN_OF_VARIATION);
				}
				nodeStack.push(node);
				node = node.addVariation(stream.emptyLineFound());
				nodeIsVariation = true;
				break;

			// End of variation
			case TokenStream.END_VARIATION:
				if(nodeStack.length === 0) {
					throw stream.invalidPGNException(i18n.UNEXPECTED_END_OF_VARIATION);
				}
				node = nodeStack.pop();
				nodeIsVariation = false;
				break;

			// End-of-game
			case TokenStream.END_OF_GAME:
				if(nodeStack.length > 0) {
					throw stream.invalidPGNException(i18n.UNEXPECTED_END_OF_GAME);
				}
				game.result(stream.tokenValue());
				return game;

		} // switch(stream.token())

	} // while(stream.consumeToken())

	throw stream.invalidPGNException(i18n.UNEXPECTED_END_OF_TEXT);
}


/**
 * Skip 1 game in the given stream.
 *
 * @param {TokenStream} stream
 * @returns {boolean} `true` if a game has been skipped, false if the end of the stream has been reached.
 * @throws {module:exception.InvalidPGN}
 * @ignore
 */
function doSkipGame(stream) {
	var atLeastOneTokenFound = false;
	while(stream.consumeToken()) {
		atLeastOneTokenFound = true;
		if(stream.token() === TokenStream.END_OF_GAME) {
			return true;
		}
	}

	// If the end of the stream has been reached without seeing any END_OF_GAME token, then no token should have been seen at all.
	// Throw an exception if this is not the case.
	if(atLeastOneTokenFound) {
		throw stream.invalidPGNException(i18n.UNEXPECTED_END_OF_TEXT);
	}
	return false;
}


function gameCountGetterImpl(impl) {
	return impl.games.length;
}


function gameGetterImpl(impl, gameIndex) {
	if(impl.currentGameIndex !== gameIndex) {
		impl.stream = new TokenStream(impl.text, impl.games[gameIndex]);
	}
	impl.currentGameIndex = -1;
	var result = doParseGame(impl.stream);
	impl.currentGameIndex = gameIndex + 1;
	return result;
}


/**
 * PGN parsing function.
 *
 * @param {string} pgnString String to parse.
 * @returns {Database}
 * @throws {module:exception.InvalidPGN}
 *
 *//**
 *
 * PGN parsing function.
 *
 * @param {string} pgnString String to parse.
 * @param {number} gameIndex Only the game corresponding to this index is parsed.
 * @returns {Game}
 * @throws {module:exception.InvalidPGN}
 */
exports.pgnRead = function(pgnString, gameIndex) {
	var stream = new TokenStream(pgnString, 0);

	// Parse all games (and return a Database object)...
	if(arguments.length === 1) {
		var games = [];
		while(true) {
			var currentPos = stream.currentPosition();
			if(!doSkipGame(stream)) {
				break;
			}
			games.push(currentPos);
		}
		return new Database({ text: pgnString, games: games, currentGameIndex: -1 }, gameCountGetterImpl, gameGetterImpl);
	}

	// Parse one game...
	else {
		var gameCounter = 0;
		while(gameCounter < gameIndex) {
			if(doSkipGame(stream)) {
				++gameCounter;
			}
			else {
				throw new exception.InvalidPGN(pgnString, pgnString.length, i18n.INVALID_GAME_INDEX, gameIndex, gameCounter);
			}
		}
		return doParseGame(stream);
	}
};

},{"./database":20,"./exception":21,"./game":22,"./i18n":23,"./position":26,"./private_pgn/tokenstream":27}],26:[function(require,module,exports){
/******************************************************************************
 *                                                                            *
 *    This file is part of Kokopu, a JavaScript chess library.                *
 *    Copyright (C) 2018-2019  Yoann Le Montagner <yo35 -at- melix.net>       *
 *                                                                            *
 *    This program is free software: you can redistribute it and/or           *
 *    modify it under the terms of the GNU Lesser General Public License      *
 *    as published by the Free Software Foundation, either version 3 of       *
 *    the License, or (at your option) any later version.                     *
 *                                                                            *
 *    This program is distributed in the hope that it will be useful,         *
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of          *
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the            *
 *    GNU Lesser General Public License for more details.                     *
 *                                                                            *
 *    You should have received a copy of the GNU Lesser General               *
 *    Public License along with this program. If not, see                     *
 *    <http://www.gnu.org/licenses/>.                                         *
 *                                                                            *
 ******************************************************************************/


'use strict';


var bt = require('./basetypes');
var moveDescriptor = require('./movedescriptor');
var exception = require('./exception');

var impl = require('./private_position/impl');
var fen = require('./private_position/fen');
var attacks = require('./private_position/attacks');
var legality = require('./private_position/legality');
var moveGeneration = require('./private_position/movegeneration');
var notation = require('./private_position/notation');



// -----------------------------------------------------------------------------
// Constructor & reset/clear
// -----------------------------------------------------------------------------

/**
 * @class
 * @classdesc Represent a chess position, i.e. the state of a 64-square chessboard with a few additional
 *            information (who is about to play, castling rights, en-passant rights).
 *
 * @description
 * This constructor can be invoked with different types of arguments:
 * ```
 * new kokopu.Position('regular');                 // 1 -> Usual starting position.
 * new kokopu.Position('regular', 'start');        // 2 -> Same as 1.
 * new kokopu.Position('regular', 'empty');        // 3 -> Empty board.
 * new kokopu.Position('chess960', 'empty');       // 4 -> Empty board, configured for Chess 960.
 * new kokopu.Position('chess960', scharnaglCode); // 5 -> One of the Chess 960 starting position (`scharnaglCode` is a number between 0 and 959 inclusive).
 * new kokopu.Position('regular', fenString);      // 6 -> Parse the given FEN string.
 * new kokopu.Position('chess960', fenString);     // 7 -> Parse the given FEN or X-FEN string, and configure for Chess 960.
 * new kokopu.Position(anotherPosition);           // 8 -> Make a copy of `anotherPosition`.
 * ```
 * Please note that the argument `'regular'` can be omitted in cases 1, 2, 3 and 6. In particular, the constructor can be invoked
 * with no argument: in this case, a new `Position` initialized to the usual starting position is instantiated (as in cases 1 and 2).
 *
 * @throws {module:exception.InvalidFEN} If the input parameter is not a valid FEN string (can be thrown only in cases 6 and 7).
 *
 * @see FEN notation: {@link https://en.wikipedia.org/wiki/Forsyth–Edwards_Notation}
 * @see Chess 960 (aka. Fischer Random Chess): {@link https://en.wikipedia.org/wiki/Chess960}
 * @see Chess 960 starting positions: {@link https://chess960.net/start-positions/}
 * @see X-FEN notation: {@link https://en.wikipedia.org/wiki/X-FEN}
 */
var Position = exports.Position = function() {

	// Copy constructor
	if(arguments[0] instanceof Position) {
		this._impl = impl.makeCopy(arguments[0]._impl);
	}

	// Special constructor codes
	else if(arguments.length === 0 || arguments[0] === 'start' || (arguments[0] === 'regular' && (arguments.length === 1 || arguments[1] === 'start'))) {
		this._impl = impl.makeInitial();
	}
	else if(arguments[0] === 'empty' || (arguments[0] === 'regular' && arguments[1] === 'empty')) {
		this._impl = impl.makeEmpty(bt.REGULAR_CHESS);
	}
	else if(arguments[0] === 'chess960' && arguments[1] === 'empty') {
		this._impl = impl.makeEmpty(bt.CHESS_960);
	}
	else if(arguments[0] === 'chess960' && typeof arguments[1] === 'number' && arguments[1] >= 0 && arguments[1] <= 959) {
		this._impl = impl.make960FromScharnagl(arguments[1]);
	}

	// FEN parsing
	else if(arguments[0] === 'regular' || arguments[0] === 'chess960') {
		if(typeof arguments[1] === 'string') {
			this._impl = fen.parseFEN(bt.variantFromString(arguments[0]), arguments[1], false).position;
		}
		else {
			throw new exception.IllegalArgument('Position()');
		}
	}
	else {
		if(typeof arguments[0] === 'string') {
			this._impl = fen.parseFEN(bt.REGULAR_CHESS, arguments[0], false).position;
		}
		else {
			throw new exception.IllegalArgument('Position()');
		}
	}
};


/**
 * Set the position to the empty state.
 *
 * @param {GameVariant} [variant=`'regular'`] Chess game variant to use.
 */
Position.prototype.clear = function(variant) {
	if(arguments.length === 0) {
		this._impl = impl.makeEmpty(bt.REGULAR_CHESS);
	}
	else {
		var v = bt.variantFromString(variant);
		if(v < 0) {
			throw new exception.IllegalArgument('Position#clear()');
		}
		this._impl = impl.makeEmpty(v);
	}
};


/**
 * Set the position to the starting state.
 */
Position.prototype.reset = function() {
	this._impl = impl.makeInitial();
};


/**
 * Set the position to one of the Chess 960 starting position.
 *
 * @param {number} scharnaglCode Must be between 0 and 959 inclusive (see {@link https://chess960.net/start-positions/}
 *        or {@link https://chessprogramming.wikispaces.com/Reinhard+Scharnagl} for more details).
 */
Position.prototype.reset960 = function(scharnaglCode) {
	this._impl = impl.make960FromScharnagl(scharnaglCode);
};



// -----------------------------------------------------------------------------
// FEN & ASCII conversion
// -----------------------------------------------------------------------------


/**
 * Return a human-readable string representing the position. This string is multi-line,
 * and is intended to be displayed in a fixed-width font (similarly to an ASCII-art picture).
 *
 * @returns {string} Human-readable representation of the position.
 */
Position.prototype.ascii = function() {
	return fen.ascii(this._impl);
};


/**
 * Get the FEN representation of the current {@link Position}).
 *
 * @param {{fiftyMoveClock:number, fullMoveNumber:number}} [options] If not provided the `fiftyMoveClock`
 *        and the `fullMoveNumber` fields of the returned FEN string are set respectively to 0 and 1.
 *
 *//**
 *
 * Parse the given FEN string and set the position accordingly.
 *
 * @param {string} fen
 * @param {boolean} [strict=false] If `true`, only perfectly formatted FEN strings are accepted.
 * @returns {{fiftyMoveClock:number, fullMoveNumber:number}}
 * @throws {module:exception.InvalidFEN} If the given string cannot be parsed as a valid FEN string.
 */
Position.prototype.fen = function() {
	if(arguments.length === 0) {
		return fen.getFEN(this._impl, 0, 1);
	}
	else if(arguments.length === 1 && typeof arguments[0] === 'object') {
		var fiftyMoveClock = (typeof arguments[0].fiftyMoveClock === 'number') ? arguments[0].fiftyMoveClock : 0;
		var fullMoveNumber = (typeof arguments[0].fullMoveNumber === 'number') ? arguments[0].fullMoveNumber : 1;
		return fen.getFEN(this._impl, fiftyMoveClock, fullMoveNumber);
	}
	else if(arguments.length === 1 && typeof arguments[0] === 'string') {
		var result = fen.parseFEN(this._impl.variant, arguments[0], false);
		this._impl = result.position;
		return { fiftyMoveClock: result.fiftyMoveClock, fullMoveNumber: result.fullMoveNumber };
	}
	else if(arguments.length >= 2 && typeof arguments[0] === 'string' && typeof arguments[1] === 'boolean') {
		var result = fen.parseFEN(this._impl.variant, arguments[0], arguments[1]);
		this._impl = result.position;
		return { fiftyMoveClock: result.fiftyMoveClock, fullMoveNumber: result.fullMoveNumber };
	}
	else {
		throw new exception.IllegalArgument('Position#fen()');
	}
};



// -----------------------------------------------------------------------------
// Accessors
// -----------------------------------------------------------------------------


/**
 * Get the {@link GameVariant} in use.
 *
 * @returns {GameVariant}
 */
Position.prototype.variant = function() {
	return bt.variantToString(this._impl.variant);
};


/**
 * Get the content of a square.
 *
 * @param {Square} square
 * @returns {ColoredPiece|Empty}
 *
 *//**
 *
 * Set the content of a square.
 *
 * @param {Square} square
 * @param {ColoredPiece|Empty} value
 */
Position.prototype.square = function(square, value) {
	square = bt.squareFromString(square);
	if(square < 0) {
		throw new exception.IllegalArgument('Position#square()');
	}

	if(arguments.length === 1) {
		var cp = this._impl.board[square];
		return cp < 0 ? '-' : bt.coloredPieceToString(cp);
	}
	else if(value === '-') {
		this._impl.board[square] = bt.EMPTY;
		this._impl.legal = null;
	}
	else {
		var cp = bt.coloredPieceFromString(value);
		if(cp < 0) {
			throw new exception.IllegalArgument('Position#square()');
		}
		this._impl.board[square] = cp;
		this._impl.legal = null;
	}
};


/**
 * Get the turn flag (i.e. who is about to play).
 *
 * @returns {Color}
 *
 *//**
 *
 * Set the turn flag (i.e. who is about to play).
 *
 * @param {Color} value
 */
Position.prototype.turn = function(value) {
	if(arguments.length === 0) {
		return bt.colorToString(this._impl.turn);
	}
	else {
		var turn = bt.colorFromString(value);
		if(turn < 0) {
			throw new exception.IllegalArgument('Position#turn()');
		}
		this._impl.turn = turn;
		this._impl.legal = null;
	}
};


/**
 * Get a castle flag (i.e. whether or not the corresponding castle is allowed or not).
 *
 * @param {Castle|Castle960} castle Must be {@link Castle} if the {@link Position} is configured for the regular chess rules,
 *        and {@link Castle960} for chess 960.
 * @returns {boolean}
 *
 *//**
 *
 * Set a castle flag (i.e. whether or not the corresponding castle is allowed or not).
 *
 * @param {Castle|Castle960} castle Must be {@link Castle} if the {@link Position} is configured for the regular chess rules,
 *        and {@link Castle960} for chess 960.
 * @param {boolean} value
 */
Position.prototype.castling = function(castle, value) {
	if(
		(this._impl.variant === bt.REGULAR_CHESS && !/^[wb][qk]$/.test(castle)) ||
		(this._impl.variant === bt.CHESS_960 && !/^[wb][a-h]$/.test(castle))
	) {
		throw new exception.IllegalArgument('Position#castling()');
	}
	var color = bt.colorFromString(castle[0]);
	var file = this._impl.variant === bt.REGULAR_CHESS ? (castle[1]==='k' ? 7 : 0) : bt.fileFromString(castle[1]);

	if(arguments.length === 1) {
		return (this._impl.castling[color] & 1 << file) !== 0;
	}
	else if(value) {
		this._impl.castling[color] |= 1 << file;
		this._impl.legal = null;
	}
	else {
		this._impl.castling[color] &= ~(1 << file);
		this._impl.legal = null;
	}
};


/**
 * Get the *en-passant* flag (i.e. the file on which *en-passant* is allowed, if any).
 *
 * @returns {EnPassantFlag}
 *
 *//**
 *
 * Set the *en-passant* flag (i.e. the file on which *en-passant* is allowed, if any).
 *
 * @param {EnPassantFlag} value
 */
Position.prototype.enPassant = function(value) {
	if(arguments.length === 0) {
		return this._impl.enPassant < 0 ? '-' : bt.fileToString(this._impl.enPassant);
	}
	else if(value === '-') {
		this._impl.enPassant = -1;
		this._impl.legal = null;
	}
	else {
		var enPassant = bt.fileFromString(value);
		if(enPassant < 0) {
			throw new exception.IllegalArgument('Position#enPassant()');
		}
		this._impl.enPassant = enPassant;
		this._impl.legal = null;
	}
};



// -----------------------------------------------------------------------------
// Attacks
// -----------------------------------------------------------------------------


/**
 * Check if any piece of the given color attacks a given square.
 *
 * @param {Square} square
 * @param {Color} byWho
 * @returns {boolean}
 */
Position.prototype.isAttacked = function(square, byWho) {
	square = bt.squareFromString(square);
	byWho = bt.colorFromString(byWho);
	if(square < 0 || byWho < 0) {
		throw new exception.IllegalArgument('Position#isAttacked()');
	}
	return attacks.isAttacked(this._impl, square, byWho);
};


/**
 * Return the squares from which a piece of the given color attacks a given square.
 *
 * @param {Square} square
 * @param {Color} byWho
 * @returns {Square[]}
 */
Position.prototype.getAttacks = function(square, byWho) {
	square = bt.squareFromString(square);
	byWho = bt.colorFromString(byWho);
	if(square < 0 || byWho < 0) {
		throw new exception.IllegalArgument('Position#getAttacks()');
	}
	return attacks.getAttacks(this._impl, square, byWho).map(bt.squareToString);
};



// -----------------------------------------------------------------------------
// Legality
// -----------------------------------------------------------------------------


/**
 * Check whether the current position is legal or not.
 *
 * A position is considered to be legal if all the following conditions are met:
 *
 *  1. There is exactly one white king and one black king on the board.
 *  2. The player that is not about to play is not in check.
 *  3. There are no pawn on ranks 1 and 8.
 *  4. For each colored castle flag set, there is a rook and a king on the
 *     corresponding initial squares.
 *  5. The pawn situation is consistent with the *en-passant* flag if it is set.
 *     For instance, if it is set to the "e" file and black is about to play,
 *     the squares e2 and e3 must be empty, and there must be a white pawn on e4.
 *
 * @returns {boolean}
 */
Position.prototype.isLegal = function() {
	return legality.isLegal(this._impl);
};


/**
 * Return the square on which is located the king of the given color.
 *
 * @param {Color} color
 * @returns {Square|boolean} Square where is located the searched king. `false` is returned
 *          if there is no king of the given color, or if the are 2 such kings or more.
 */
Position.prototype.kingSquare = function(color) {
	color = bt.colorFromString(color);
	if(color < 0) {
		throw new exception.IllegalArgument('Position#kingSquare()');
	}
	legality.refreshLegalFlagAndKingSquares(this._impl);
	var square = this._impl.king[color];
	return square < 0 ? false : bt.squareToString(square);
};



// -----------------------------------------------------------------------------
// Move generation
// -----------------------------------------------------------------------------


/**
 * Return `true` if the player that is about to play is in check. If the position is not legal (see {@link Position#isLegal}),
 * the returned value is always `false`.
 *
 * @returns {boolean}
 */
Position.prototype.isCheck = function() {
	return moveGeneration.isCheck(this._impl);
};


/**
 * Return `true` if the player that is about to play is checkmated. If the position is not legal (see {@link Position#isLegal}),
 * the returned value is always `false`.
 *
 * @returns {boolean}
 */
Position.prototype.isCheckmate = function() {
	return moveGeneration.isCheckmate(this._impl);
};


/**
 * Return `true` if the player that is about to play is stalemated. If the position is not legal (see {@link Position#isLegal}),
 * the returned value is always `false`.
 *
 * @returns {boolean}
 */
Position.prototype.isStalemate = function() {
	return moveGeneration.isStalemate(this._impl);
};


/**
 * Whether at least one legal move exists in the current position or not. If the position is not legal (see {@link Position#isLegal}),
 * the returned value is always `false`.
 *
 * @returns {boolean}
 */
Position.prototype.hasMove = function() {
	return moveGeneration.hasMove(this._impl);
};


/**
 * Return the list of all legal moves in the current position. An empty list is returned if the position itself is not legal
 * (see {@link Position#isLegal}).
 *
 * @returns {MoveDescriptor[]}
 */
Position.prototype.moves = function() {
	return moveGeneration.moves(this._impl);
};


/**
 * Check whether a move is legal or not, and return the corresponding {@link MoveDescriptor} if it is legal.
 *
 * Depending on the situation, the method returns:
 *   - `false` if it is not possible to move from `from` to `to` (either because the move itself is not legal, or because the underlying
 *     position is not legal).
 *   - a function that returns a {@link MoveDescriptor} otherwise. When there is only one possible move between the given squares
 *     `from` and `to` (i.e. in most cases), this function must be invoked with no argument. When there is a "move ambiguity"
 *     (i.e. squares `from` and `to` are not sufficient to fully describe a move), an argument must be passed to the this function
 *     in order to discriminate between the possible moves. A field `status` is added to the function in order to indicate whether
 *     there is a move ambiguity or not.
 *
 * A code interpreting the result returned by {@link Position#isMoveLegal} would typically look like this:
 *
 * ```
 * var result = position.isMoveLegal(from, to);
 * if(!result) {
 *   // The move "from -> to" is not legal.
 * }
 * else {
 *   switch(result.status) {
 *
 *     case 'regular':
 *       // The move "from -> to" is legal, and the corresponding move descriptor is `result()`.
 *       break;
 *
 *     case 'promotion':
 *       // The move "from -> to" is legal, but it corresponds to a promotion,
 *       // so the promoted piece must be specified. The corresponding move descriptors
 *       // are `result('q')`, `result('r')`, `result('b')` and `result('n')`.
 *       break;
 *
 *     case 'castle960':
 *       // The move "from -> to" is legal, but it corresponds either to a castling move
 *       // or to a regular king move (this case can only happen at Chess 960).
 *       // The corresponding move descriptors are `result('castle')` and `result('king')`.
 *       break;
 *
 *     default:
 *       // This case is not supposed to happen.
 *       break;
 *   }
 * }
 * ```
 *
 * @param {Square} from
 * @param {Square} to
 * @returns {boolean|function}
 */
Position.prototype.isMoveLegal = function(from, to) {
	from = bt.squareFromString(from);
	to = bt.squareFromString(to);
	if(from < 0 || to < 0) {
		throw new exception.IllegalArgument('Position#isMoveLegal()');
	}
	var result = moveGeneration.isMoveLegal(this._impl, from, to);

	// No legal move.
	if(!result) {
		return false;
	}

	// Only one legal move (no ambiguity).
	else if(moveDescriptor.isMoveDescriptor(result)) {
		return makeFactory('regular', function() { return result; });
	}

	// Several legal moves -> ambiguity.
	else {
		switch(result.type) {

			case 'promotion':
				return makeFactory('promotion', function(promotion) {
					promotion = bt.pieceFromString(promotion);
					if(promotion >= 0) {
						var builtMoveDescriptor = result.build(promotion);
						if(builtMoveDescriptor) {
							return builtMoveDescriptor;
						}
					}
					throw new exception.IllegalArgument('Position#isMoveLegal()');
				});

			case 'castle960':
				return makeFactory('castle960', function(type) {
					switch(type) {
						case 'king': return result.build(false);
						case 'castle': return result.build(true);
						default: throw new exception.IllegalArgument('Position#isMoveLegal()');
					}
				});

			default: // This case is not supposed to happen.
				throw new exception.IllegalArgument('Position#isMoveLegal()');
		}
	}
};


function makeFactory(status, factory) {
	factory.status = status;
	return factory;
}


/**
 * Play the given move if it is legal.
 *
 * WARNING: when a {@link MoveDescriptor} is passed to this method, this {@link MoveDescriptor} must have been issued by one of the
 * {@link Position#moves} / {@link Position#isMoveLegal} / {@link Position#notation} methods of the current {@link Position}.
 * Trying to invoke {@link Position#play} with a {@link MoveDescriptor} generated by another {@link Position} object would result
 * in an undefined behavior.
 *
 * @param {string|MoveDescriptor} move
 * @returns {boolean} `true` if the move has been played, `false` if the move is not legal or if the string passed to the method
 *          cannot be interpreted as a valid SAN move notation (see {@link Position#notation}).
 */
Position.prototype.play = function(move) {
	if(typeof move === 'string') {
		try {
			moveGeneration.play(this._impl, notation.parseNotation(this._impl, move, false));
			return true;
		}
		catch(err) {
			if(err instanceof exception.InvalidNotation) {
				return false;
			}
			else {
				throw err;
			}
		}
	}
	else if(moveDescriptor.isMoveDescriptor(move)) {
		moveGeneration.play(this._impl, move);
		return true;
	}
	else {
		throw new exception.IllegalArgument('Position#play()');
	}
};


/**
 * Determine whether a null-move (i.e. switching the player about to play) can be play in the current position.
 *
 * A null-move is possible if the position is legal and if the current player about to play is not in check.
 *
 * @returns {boolean}
 */
Position.prototype.isNullMoveLegal = function() {
	return moveGeneration.isNullMoveLegal(this._impl);
};


/**
 * Play a null-move on the current position if it is legal.
 *
 * @returns {boolean} `true` if the move has actually been played, `false` otherwise.
 */
Position.prototype.playNullMove = function() {
	return moveGeneration.playNullMove(this._impl);
};



// -----------------------------------------------------------------------------
// Algebraic notation
// -----------------------------------------------------------------------------


/**
 * Return the standard algebraic notation corresponding to the given move descriptor.
 *
 * @param {MoveDescriptor} moveDescriptor
 * @returns {string}
 *
 *//**
 *
 * Parse the given string as standard algebraic notation and return the corresponding move descriptor.
 *
 * @param {string} move
 * @param {boolean} [strict=false] If `true`, only perfectly formatted SAN moves are accepted. If `false`, "small errors" in the input
 *        such as a missing capture character, an unnecessary disambiguation symbol... do not interrupt the parsing.
 * @returns {MoveDescriptor}
 * @throws {module:exception.InvalidNotation} If the move parsing fails or if the parsed move would correspond to an illegal move.
 */
Position.prototype.notation = function() {
	if(arguments.length === 1 && moveDescriptor.isMoveDescriptor(arguments[0])) {
		return notation.getNotation(this._impl, arguments[0]);
	}
	else if(arguments.length === 1 && typeof arguments[0] === 'string') {
		return notation.parseNotation(this._impl, arguments[0], false);
	}
	else if(arguments.length >= 2 && typeof arguments[0] === 'string' && typeof arguments[1] === 'boolean') {
		return notation.parseNotation(this._impl, arguments[0], arguments[1]);
	}
	else {
		throw new exception.IllegalArgument('Position#notation()');
	}
};

},{"./basetypes":19,"./exception":21,"./movedescriptor":24,"./private_position/attacks":28,"./private_position/fen":29,"./private_position/impl":30,"./private_position/legality":31,"./private_position/movegeneration":32,"./private_position/notation":33}],27:[function(require,module,exports){
/******************************************************************************
 *                                                                            *
 *    This file is part of Kokopu, a JavaScript chess library.                *
 *    Copyright (C) 2018-2019  Yoann Le Montagner <yo35 -at- melix.net>       *
 *                                                                            *
 *    This program is free software: you can redistribute it and/or           *
 *    modify it under the terms of the GNU Lesser General Public License      *
 *    as published by the Free Software Foundation, either version 3 of       *
 *    the License, or (at your option) any later version.                     *
 *                                                                            *
 *    This program is distributed in the hope that it will be useful,         *
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of          *
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the            *
 *    GNU Lesser General Public License for more details.                     *
 *                                                                            *
 *    You should have received a copy of the GNU Lesser General               *
 *    Public License along with this program. If not, see                     *
 *    <http://www.gnu.org/licenses/>.                                         *
 *                                                                            *
 ******************************************************************************/


'use strict';


var exception = require('../exception');
var i18n = require('../i18n');


/**
 * @class
 * @classdesc Stream of tokens.
 */
var TokenStream = exports.TokenStream = function(pgnString, initialPosition) {
	this._text           = pgnString;       // what is being parsed
	this._pos            = initialPosition; // current position in the string
	this._emptyLineFound = false;           // whether an empty line has been encountered while parsing the current token
	this._token          = 0;               // current token
	this._tokenValue     = null;            // current token value (if any)
	this._tokenIndex     = 0;               // position of the current token in the string

	// Space-like matchers
	this._matchSpaces = /[ \f\t\v]+/g;
	this._matchLineBreak = /\r?\n|\r/g;

	// Token matchers
	this._matchHeader = /^\[\s*(\w+)\s+"(.*)"\s*\]$/mg;
	this._matchMove = /(?:[1-9][0-9]*\s*\.(?:\.\.)?\s*)?((?:O-O-O|O-O|[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|(?:[a-h]x?)?[a-h][1-8](?:=?[KQRBNP])?)[+#]?|--)/g;
	this._matchNag = /([!?][!?]?|\+\/?[-=]|[-=]\/?\+|=|inf|~)|\$([1-9][0-9]*)/g;
	this._matchComment = /\{((?:[^{}\\]|\\[{}\\])*)\}/g;
	this._matchBeginVariation = /\(/g;
	this._matchEndVariation = /\)/g;
	this._matchEndOfGame = /1-0|0-1|1\/2-1\/2|\*/g;

	this._matchSpaces.matchedIndex = -1;
	this._matchLineBreak.matchedIndex = -1;
	this._matchHeader.matchedIndex = -1;
	this._matchMove.matchedIndex = -1;
	this._matchNag.matchedIndex = -1;
	this._matchComment.matchedIndex = -1;
	this._matchBeginVariation.matchedIndex = -1;
	this._matchEndVariation.matchedIndex = -1;
	this._matchEndOfGame.matchedIndex = -1;
};


// PGN token types
var TOKEN_HEADER          = TokenStream.HEADER          = 1; // Ex: [White "Kasparov, G."]
var TOKEN_MOVE            = TokenStream.MOVE            = 2; // SAN notation or -- (with an optional move number)
var TOKEN_NAG             = TokenStream.NAG             = 3; // $[1-9][0-9]* or a key from table SPECIAL_NAGS_LOOKUP (!!, +-, etc..)
var TOKEN_COMMENT         = TokenStream.COMMENT         = 4; // {some text}
var TOKEN_BEGIN_VARIATION = TokenStream.BEGIN_VARIATION = 5; // (
var TOKEN_END_VARIATION   = TokenStream.END_VARIATION   = 6; // )
var TOKEN_END_OF_GAME     = TokenStream.END_OF_GAME     = 7; // 1-0, 0-1, 1/2-1/2 or *


/**
 * Try to match the given regular expression at the current position.
 *
 * @param {TokenStream} stream
 * @param {RegExp} regex
 * @returns {boolean}
 */
function testAtPos(stream, regex) {
	if(regex.matchedIndex < stream._pos) {
		regex.lastIndex = stream._pos;
		regex.matched = regex.exec(stream._text);
		regex.matchedIndex = regex.matched === null ? stream._text.length : regex.matched.index;
	}

	if(regex.matchedIndex === stream._pos) {
		stream._pos = regex.lastIndex;
		return true;
	}
	else {
		return false;
	}
}


/**
 * Advance until the first non-blank character.
 *
 * @param {TokenStream} stream
 */
function skipBlanks(stream) {
	var newLineCount = 0;
	while(stream._pos < stream._text.length) {
		if(testAtPos(stream, stream._matchSpaces)) {
			// Nothing to do...
		}
		else if(testAtPos(stream, stream._matchLineBreak)) {
			++newLineCount;
		}
		else {
			break;
		}
	}

	// An empty line was encountered if and only if at least to line breaks were found.
	stream._emptyLineFound = newLineCount >= 2;
}


/**
 * Parse a header value, unescaping special characters.
 *
 * @param {string} rawHeaderValue
 * @returns {string}
 */
function parseHeaderValue(rawHeaderValue) {
	return rawHeaderValue.replace(/\\([\\"])/g, '$1');
}


/**
 * Parse a comment, unescaping special characters, and looking for the `[%key value]` tags.
 *
 * @param {string} rawComment String to parse.
 * @returns {{comment:string, tags:Object}}
 */
function parseCommentValue(rawComment) {
	rawComment = rawComment.replace(/\\([{}\\])/g, '$1');

	var tags = {};

	// Find and remove the tags from the raw comment.
	var comment = rawComment.replace(/\[%([a-zA-Z0-9]+) ([^[\]]+)\]/g, function(match, p1, p2) {
		tags[p1] = p2;
		return ' ';
	});

	// Trim the comment and collapse sequences of space characters into 1 character only.
	comment = comment.replace(/^\s+|\s+$/g, '').replace(/\s+/g, ' ');
	if(comment === '') {
		comment = undefined;
	}

	// Return the result
	return { comment:comment, tags:tags };
}


// Conversion table NAG -> numeric code
var SPECIAL_NAGS_LOOKUP = {
	'!!' :  3,             // very good move
	'!'  :  1,             // good move
	'!?' :  5,             // interesting move
	'?!' :  6,             // questionable move
	'?'  :  2,             // bad move
	'??' :  4,             // very bad move
	'+-' : 18,             // White has a decisive advantage
	'+/-': 16,             // White has a moderate advantage
	'+/=': 14, '+=' : 14,  // White has a slight advantage
	'='  : 10,             // equal position
	'~'  : 13, 'inf': 13,  // unclear position
	'=/+': 15, '=+' : 15,  // Black has a slight advantage
	'-/+': 17,             // Black has a moderate advantage
	'-+' : 19              // Black has a decisive advantage
};


/**
 * Try to consume 1 token.
 *
 * @return {boolean} `true` if a token could have been read, `false` if the end of the text has been reached.
 * @throws {module:exception.InvalidPGN} If the text cannot be interpreted as a valid token.
 */
TokenStream.prototype.consumeToken = function() {

	// Consume blank (i.e. meaning-less) characters
	skipBlanks(this);
	if(this._pos >= this._text.length) {
		this._tokenIndex = this._text.length;
		return false;
	}

	// Remaining part of the string
	this._tokenIndex = this._pos;

	// Match a game header (ex: [White "Kasparov, G."])
	if(testAtPos(this, this._matchHeader)) {
		this._token      = TOKEN_HEADER;
		this._tokenValue = { key: this._matchHeader.matched[1], value: parseHeaderValue(this._matchHeader.matched[2]) };
	}

	// Match a move or a null-move
	else if(testAtPos(this, this._matchMove)) {
		this._token      = TOKEN_MOVE;
		this._tokenValue = this._matchMove.matched[1];
	}

	// Match a NAG
	else if(testAtPos(this, this._matchNag)) {
		this._token      = TOKEN_NAG;
		this._tokenValue = this._matchNag.matched[2] === undefined ? SPECIAL_NAGS_LOOKUP[this._matchNag.matched[1]] :
			parseInt(this._matchNag.matched[2], 10);
	}

	// Match a comment
	else if(testAtPos(this, this._matchComment)) {
		this._token      = TOKEN_COMMENT;
		this._tokenValue = parseCommentValue(this._matchComment.matched[1]);
	}

	// Match the beginning of a variation
	else if(testAtPos(this, this._matchBeginVariation)) {
		this._token      = TOKEN_BEGIN_VARIATION;
		this._tokenValue = null;
	}

	// Match the end of a variation
	else if(testAtPos(this, this._matchEndVariation)) {
		this._token      = TOKEN_END_VARIATION;
		this._tokenValue = null;
	}

	// Match a end-of-game marker
	else if(testAtPos(this, this._matchEndOfGame)) {
		this._token      = TOKEN_END_OF_GAME;
		this._tokenValue = this._matchEndOfGame.matched[0];
	}

	// Otherwise, the string is badly formatted with respect to the PGN syntax
	else {
		throw new exception.InvalidPGN(this._text, this._pos, i18n.INVALID_PGN_TOKEN);
	}

	return true;
};


TokenStream.prototype.currentPosition = function() {
	return this._pos;
};


TokenStream.prototype.emptyLineFound = function() {
	return this._emptyLineFound;
};


TokenStream.prototype.token = function() {
	return this._token;
};


TokenStream.prototype.tokenValue = function() {
	return this._tokenValue;
};


TokenStream.prototype.tokenIndex = function() {
	return this._tokenIndex;
};


TokenStream.prototype.invalidPGNException = function(tokenIndex) {
	var constructorArguments = [ this._text ];
	if(typeof tokenIndex !== 'number') {
		constructorArguments.push(this._tokenIndex);
	}
	Array.prototype.push.apply(constructorArguments, arguments);

	var result = Object.create(exception.InvalidPGN.prototype);
	exception.InvalidPGN.apply(result, constructorArguments);
	return result;
};

},{"../exception":21,"../i18n":23}],28:[function(require,module,exports){
/******************************************************************************
 *                                                                            *
 *    This file is part of Kokopu, a JavaScript chess library.                *
 *    Copyright (C) 2018-2019  Yoann Le Montagner <yo35 -at- melix.net>       *
 *                                                                            *
 *    This program is free software: you can redistribute it and/or           *
 *    modify it under the terms of the GNU Lesser General Public License      *
 *    as published by the Free Software Foundation, either version 3 of       *
 *    the License, or (at your option) any later version.                     *
 *                                                                            *
 *    This program is distributed in the hope that it will be useful,         *
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of          *
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the            *
 *    GNU Lesser General Public License for more details.                     *
 *                                                                            *
 *    You should have received a copy of the GNU Lesser General               *
 *    Public License along with this program. If not, see                     *
 *    <http://www.gnu.org/licenses/>.                                         *
 *                                                                            *
 ******************************************************************************/


'use strict';


var bt = require('../basetypes');


// Attack directions per colored piece.
var ATTACK_DIRECTIONS = exports.ATTACK_DIRECTIONS = [
	[-17, -16, -15, -1, 1, 15, 16, 17], // king/queen
	[-17, -16, -15, -1, 1, 15, 16, 17], // king/queen
	[-17, -16, -15, -1, 1, 15, 16, 17], // king/queen
	[-17, -16, -15, -1, 1, 15, 16, 17], // king/queen
	[-16, -1, 1, 16], // rook
	[-16, -1, 1, 16], // rook
	[-17, -15, 15, 17], // bishop
	[-17, -15, 15, 17], // bishop
	[-33, -31, -18, -14, 14, 18, 31, 33], // knight
	[-33, -31, -18, -14, 14, 18, 31, 33], // knight
	[15, 17], // white pawn
	[-17, -15] // black pawn
];



// -----------------------------------------------------------------------------
// isAttacked
// -----------------------------------------------------------------------------

/**
 * Check if any piece of the given color attacks a given square.
 */
exports.isAttacked = function(position, square, attackerColor) {
	return isAttackedByNonSliding(position, square, bt.KING*2 + attackerColor) ||
		isAttackedByNonSliding(position, square, bt.KNIGHT*2 + attackerColor) ||
		isAttackedByNonSliding(position, square, bt.PAWN*2 + attackerColor) ||
		isAttackedBySliding(position, square, bt.ROOK*2 + attackerColor, bt.QUEEN*2 + attackerColor) ||
		isAttackedBySliding(position, square, bt.BISHOP*2 + attackerColor, bt.QUEEN*2 + attackerColor);
};


function isAttackedByNonSliding(position, square, nonSlidingAttacker) {
	var directions = ATTACK_DIRECTIONS[nonSlidingAttacker];
	for(var i=0; i<directions.length; ++i) {
		var sq = square - directions[i];
		if((sq & 0x88) === 0 && position.board[sq] === nonSlidingAttacker) {
			return true;
		}
	}
	return false;
}


function isAttackedBySliding(position, square, slidingAttacker, queenAttacker) {
	var directions = ATTACK_DIRECTIONS[slidingAttacker];
	for(var i=0; i<directions.length; ++i) {
		var sq = square;
		while(true) {
			sq -= directions[i];
			if((sq & 0x88)===0) {
				var cp = position.board[sq];
				if(cp === bt.EMPTY) { continue; }
				else if(cp === slidingAttacker || cp===queenAttacker) { return true; }
			}
			break;
		}
	}
	return false;
}



// -----------------------------------------------------------------------------
// getAttacks
// -----------------------------------------------------------------------------

/**
 * Return the squares from which a piece of the given color attacks a given square.
 */
exports.getAttacks = function(position, square, attackerColor) {
	var result = [];
	findNonSlidingAttacks(position, square, result, bt.KING*2 + attackerColor);
	findNonSlidingAttacks(position, square, result, bt.KNIGHT*2 + attackerColor);
	findNonSlidingAttacks(position, square, result, bt.PAWN*2 + attackerColor);
	findSlidingAttacks(position, square, result, bt.ROOK*2 + attackerColor, bt.QUEEN*2 + attackerColor);
	findSlidingAttacks(position, square, result, bt.BISHOP*2 + attackerColor, bt.QUEEN*2 + attackerColor);
	return result;
};


function findNonSlidingAttacks(position, square, result, nonSlidingAttacker) {
	var directions = ATTACK_DIRECTIONS[nonSlidingAttacker];
	for(var i=0; i<directions.length; ++i) {
		var sq = square - directions[i];
		if((sq & 0x88) === 0 && position.board[sq] === nonSlidingAttacker) {
			result.push(sq);
		}
	}
}


function findSlidingAttacks(position, square, result, slidingAttacker, queenAttacker) {
	var directions = ATTACK_DIRECTIONS[slidingAttacker];
	for(var i=0; i<directions.length; ++i) {
		var sq = square;
		while(true) {
			sq -= directions[i];
			if((sq & 0x88) === 0) {
				var cp = position.board[sq];
				if(cp === bt.EMPTY) { continue; }
				else if(cp === slidingAttacker || cp === queenAttacker) { result.push(sq); }
			}
			break;
		}
	}
}

},{"../basetypes":19}],29:[function(require,module,exports){
/******************************************************************************
 *                                                                            *
 *    This file is part of Kokopu, a JavaScript chess library.                *
 *    Copyright (C) 2018-2019  Yoann Le Montagner <yo35 -at- melix.net>       *
 *                                                                            *
 *    This program is free software: you can redistribute it and/or           *
 *    modify it under the terms of the GNU Lesser General Public License      *
 *    as published by the Free Software Foundation, either version 3 of       *
 *    the License, or (at your option) any later version.                     *
 *                                                                            *
 *    This program is distributed in the hope that it will be useful,         *
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of          *
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the            *
 *    GNU Lesser General Public License for more details.                     *
 *                                                                            *
 *    You should have received a copy of the GNU Lesser General               *
 *    Public License along with this program. If not, see                     *
 *    <http://www.gnu.org/licenses/>.                                         *
 *                                                                            *
 ******************************************************************************/


'use strict';


var bt = require('../basetypes');
var exception = require('../exception');
var i18n = require('../i18n');

var impl = require('./impl');

var FEN_PIECE_SYMBOL = 'KkQqRrBbNnPp';


/**
 * Return a human-readable string representing the position. This string is multi-line,
 * and is intended to be displayed in a fixed-width font (similarly to an ASCII-art picture).
 */
exports.ascii = function(position) {

	// Board scanning
	var result = '+---+---+---+---+---+---+---+---+\n';
	for(var r=7; r>=0; --r) {
		for(var f=0; f<8; ++f) {
			var cp = position.board[r*16 + f];
			result += '| ' + (cp < 0 ? ' ' : FEN_PIECE_SYMBOL[cp]) + ' ';
		}
		result += '|\n';
		result += '+---+---+---+---+---+---+---+---+\n';
	}

	// Flags
	result += bt.colorToString(position.turn) + ' ' + castlingToString(position) + ' ' + enPassantToString(position);
	if(position.variant !== bt.REGULAR_CHESS) {
		result += ' (' + bt.variantToString(position.variant) + ')';
	}

	return result;
};


exports.getFEN = function(position, fiftyMoveClock, fullMoveNumber) {
	var result = '';

	// Board scanning
	for(var r=7; r>=0; --r) {
		var emptyCount = 0;
		for(var f=0; f<8; ++f) {
			var cp = position.board[r*16 + f];
			if(cp < 0) {
				++emptyCount;
			}
			else {
				if(emptyCount > 0) {
					result += emptyCount;
					emptyCount = 0;
				}
				result += FEN_PIECE_SYMBOL[cp];
			}
		}
		if(emptyCount > 0) {
			result += emptyCount;
		}
		if(r > 0) {
			result += '/';
		}
	}

	// Flags + additional move counters
	result += ' ' + bt.colorToString(position.turn) + ' ' + castlingToString(position) + ' ' + enPassantToString(position);
	result += ' ' + fiftyMoveClock + ' ' + fullMoveNumber;

	return result;
};


function castlingToString(position) {
	if(position.variant === bt.CHESS_960) {
		var whiteFlags = '';
		var blackFlags = '';
		for(var file = 0; file < 8; ++file) {
			if(position.castling[bt.WHITE] & 1 << file) { whiteFlags += bt.fileToString(file); }
			if(position.castling[bt.BLACK] & 1 << file) { blackFlags += bt.fileToString(file); }
		}
		return whiteFlags === '' && blackFlags === '' ? '-' : whiteFlags.toUpperCase() + blackFlags;
	}
	else {
		var result = '';
		if(position.castling[bt.WHITE] & 1<<7) { result += 'K'; }
		if(position.castling[bt.WHITE] & 1<<0) { result += 'Q'; }
		if(position.castling[bt.BLACK] & 1<<7) { result += 'k'; }
		if(position.castling[bt.BLACK] & 1<<0) { result += 'q'; }
		return result === '' ? '-' : result;
	}
}


function enPassantToString(position) {
	return position.enPassant < 0 ? '-' : bt.fileToString(position.enPassant) + (position.turn===bt.WHITE ? '6' : '3');
}


exports.parseFEN = function(variant, fen, strict) {

	// Trim the input string and split it into 6 fields.
	fen = fen.replace(/^\s+|\s+$/g, '');
	var fields = fen.split(/\s+/);
	if(fields.length !== 6) {
		throw new exception.InvalidFEN(fen, i18n.WRONG_NUMBER_OF_FEN_FIELDS);
	}

	// The first field (that represents the board) is split in 8 sub-fields.
	var rankFields = fields[0].split('/');
	if(rankFields.length !== 8) {
		throw new exception.InvalidFEN(fen, i18n.WRONG_NUMBER_OF_SUBFIELDS_IN_BOARD_FIELD);
	}

	// Initialize the position
	var position = impl.makeEmpty(variant);
	position.legal = null;

	// Board parsing
	for(var r=7; r>=0; --r) {
		var rankField = rankFields[7-r];
		var i = 0;
		var f = 0;
		while(i<rankField.length && f<8) {
			var s = rankField[i];
			var cp = FEN_PIECE_SYMBOL.indexOf(s);

			// The current character is in the range [1-8] -> skip the corresponding number of squares.
			if(/^[1-8]$/.test(s)) {
				f += parseInt(s, 10);
			}

			// The current character corresponds to a colored piece symbol -> set the current square accordingly.
			else if(cp >= 0) {
				position.board[r*16 + f] = cp;
				++f;
			}

			// Otherwise -> parsing error.
			else {
				throw new exception.InvalidFEN(fen, i18n.UNEXPECTED_CHARACTER_IN_BOARD_FIELD, s);
			}

			// Increment the character counter.
			++i;
		}

		// Ensure that the current sub-field deals with all the squares of the current rank.
		if(i !== rankField.length || f !== 8) {
			throw new exception.InvalidFEN(fen, i18n.UNEXPECTED_END_OF_SUBFIELD_IN_BOARD_FIELD, i18n.ORDINALS[7-r]);
		}
	}

	// Turn parsing
	position.turn = bt.colorFromString(fields[1]);
	if(position.turn < 0) {
		throw new exception.InvalidFEN(fen, i18n.INVALID_TURN_FIELD);
	}

	// Castling rights parsing
	position.castling = variant === bt.CHESS_960 ? castlingFromStringXFEN(fields[2], strict, position.board) :
		castlingFromStringFEN(fields[2], strict);
	if(position.castling === null) {
		throw new exception.InvalidFEN(fen, i18n.INVALID_CASTLING_FIELD);
	}

	// En-passant rights parsing
	var enPassantField = fields[3];
	if(enPassantField !== '-') {
		if(!/^[a-h][36]$/.test(enPassantField)) {
			throw new exception.InvalidFEN(fen, i18n.INVALID_EN_PASSANT_FIELD);
		}
		if(strict && ((enPassantField[1]==='3' && position.turn===bt.WHITE) || (enPassantField[1]==='6' && position.turn===bt.BLACK))) {
			throw new exception.InvalidFEN(fen, i18n.WRONG_RANK_IN_EN_PASSANT_FIELD);
		}
		position.enPassant = bt.fileFromString(enPassantField[0]);
	}

	// Move counting flags parsing
	var moveCountingRegExp = strict ? /^(?:0|[1-9][0-9]*)$/ : /^[0-9]+$/;
	if(!moveCountingRegExp.test(fields[4])) {
		throw new exception.InvalidFEN(fen, i18n.INVALID_MOVE_COUNTING_FIELD, i18n.ORDINALS[4]);
	}
	if(!moveCountingRegExp.test(fields[5])) {
		throw new exception.InvalidFEN(fen, i18n.INVALID_MOVE_COUNTING_FIELD, i18n.ORDINALS[5]);
	}
	return { position: position, fiftyMoveClock: parseInt(fields[4], 10), fullMoveNumber: parseInt(fields[5], 10) };
};


function castlingFromStringFEN(castling, strict) {
	var res = [0, 0];
	if(castling === '-') {
		return res;
	}
	if(!(strict ? /^K?Q?k?q?$/ : /^[KQkq]*$/).test(castling)) {
		return null;
	}
	if(castling.indexOf('K') >= 0) { res[bt.WHITE] |= 1<<7; }
	if(castling.indexOf('Q') >= 0) { res[bt.WHITE] |= 1<<0; }
	if(castling.indexOf('k') >= 0) { res[bt.BLACK] |= 1<<7; }
	if(castling.indexOf('q') >= 0) { res[bt.BLACK] |= 1<<0; }
	return res;
}


function castlingFromStringXFEN(castling, strict, board) {
	var result = [0, 0];
	if(castling === '-') {
		return result;
	}
	if(!(strict ? /^[A-H]{0,2}[a-h]{0,2}$/ : /^[A-Ha-hKQkq]*$/).test(castling)) {
		return null;
	}

	function searchQueenSideRook(color) {
		var rookFile = -1;
		var targetRook = bt.ROOK * 2 + color;
		var targetKing = bt.KING * 2 + color;
		for(var sq = 112*color; sq < 112*color + 8; ++sq) {
			if(board[sq] === targetRook) {
				if(rookFile >= 0) { break; }
				rookFile = sq % 8;
			}
			else if(board[sq] === targetKing) {
				if(rookFile < 0) { break; }
				result[color] |= 1 << rookFile;
				return true;
			}
		}
		return false;
	}

	function searchKingSideRook(color) {
		var rookFile = -1;
		var targetRook = bt.ROOK * 2 + color;
		var targetKing = bt.KING * 2 + color;
		for(var sq = 112*color + 7; sq >= 112*color; --sq) {
			if(board[sq] === targetRook) {
				if(rookFile >= 0) { break; }
				rookFile = sq % 8;
			}
			else if(board[sq] === targetKing) {
				if(rookFile < 0) { break; }
				result[color] |= 1 << rookFile;
				return true;
			}
		}
		return false;
	}

	if(castling.indexOf('K') >= 0) { if(!searchKingSideRook (bt.WHITE)) { return null; }}
	if(castling.indexOf('Q') >= 0) { if(!searchQueenSideRook(bt.WHITE)) { return null; }}
	if(castling.indexOf('k') >= 0) { if(!searchKingSideRook (bt.BLACK)) { return null; }}
	if(castling.indexOf('q') >= 0) { if(!searchQueenSideRook(bt.BLACK)) { return null; }}

	for(var file = 0; file < 8; ++file) {
		var s = bt.fileToString(file);
		if(castling.indexOf(s.toUpperCase()) >= 0) { result[bt.WHITE] |= 1 << file; }
		if(castling.indexOf(s              ) >= 0) { result[bt.BLACK] |= 1 << file; }
	}
	return result;
}

},{"../basetypes":19,"../exception":21,"../i18n":23,"./impl":30}],30:[function(require,module,exports){
/******************************************************************************
 *                                                                            *
 *    This file is part of Kokopu, a JavaScript chess library.                *
 *    Copyright (C) 2018-2019  Yoann Le Montagner <yo35 -at- melix.net>       *
 *                                                                            *
 *    This program is free software: you can redistribute it and/or           *
 *    modify it under the terms of the GNU Lesser General Public License      *
 *    as published by the Free Software Foundation, either version 3 of       *
 *    the License, or (at your option) any later version.                     *
 *                                                                            *
 *    This program is distributed in the hope that it will be useful,         *
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of          *
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the            *
 *    GNU Lesser General Public License for more details.                     *
 *                                                                            *
 *    You should have received a copy of the GNU Lesser General               *
 *    Public License along with this program. If not, see                     *
 *    <http://www.gnu.org/licenses/>.                                         *
 *                                                                            *
 ******************************************************************************/


'use strict';


var bt = require('../basetypes');
var EMPTY = bt.EMPTY;
var INVALID = bt.INVALID;


exports.makeEmpty = function(variant) {
	return {

		// Board state
		board: [
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID,
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID,
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID,
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID,
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID,
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID,
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID,
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY
		],

		// Flags
		turn: bt.WHITE,
		castling: [0, 0],
		enPassant: -1,
		variant: variant,

		// Computed attributes
		legal: false,
		king: [-1, -1]
	};
};


exports.makeInitial = function() {
	return {

		// Board state
		board: [
			bt.WR, bt.WN, bt.WB, bt.WQ, bt.WK, bt.WB, bt.WN, bt.WR, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID,
			bt.WP, bt.WP, bt.WP, bt.WP, bt.WP, bt.WP, bt.WP, bt.WP, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID,
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID,
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID,
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID,
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID,
			bt.BP, bt.BP, bt.BP, bt.BP, bt.BP, bt.BP, bt.BP, bt.BP, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID,
			bt.BR, bt.BN, bt.BB, bt.BQ, bt.BK, bt.BB, bt.BN, bt.BR
		],

		// Flags
		turn: bt.WHITE,
		castling: [129 /* (1 << A-file) | (1 << H-file) */, 129],
		enPassant: -1,
		variant: bt.REGULAR_CHESS,

		// Computed attributes
		legal: true,
		king: [4 /* e1 */, 116 /* e8 */]
	};
};


/**
 * Chess 960 initial position, following the numbering scheme proposed by Reinhard Scharnagl (see for instance
 * https://chessprogramming.wikispaces.com/Reinhard+Scharnagl and https://chess960.net/start-positions/).
 */
exports.make960FromScharnagl = function(scharnaglCode) {
	var info = decodeScharnagl(scharnaglCode);
	var r1 = info.scheme.map(function(piece) { return piece*2 + bt.WHITE; });
	var r8 = info.scheme.map(function(piece) { return piece*2 + bt.BLACK; });
	return {

		// Board state
		board: [
			r1[0], r1[1], r1[2], r1[3], r1[4], r1[5], r1[6], r1[7], INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID,
			bt.WP, bt.WP, bt.WP, bt.WP, bt.WP, bt.WP, bt.WP, bt.WP, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID,
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID,
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID,
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID,
			EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID,
			bt.BP, bt.BP, bt.BP, bt.BP, bt.BP, bt.BP, bt.BP, bt.BP, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID, INVALID,
			r8[0], r8[1], r8[2], r8[3], r8[4], r8[5], r8[6], r8[7]
		],

		// Flags
		turn: bt.WHITE,
		castling: [info.castling, info.castling],
		enPassant: -1,
		variant: bt.CHESS_960,

		// Computed attributes
		legal: true,
		king: [info.kingFile, 112 + info.kingFile]
	};
};


function decodeScharnagl(scharnaglCode) {
	var scheme = [-1, -1, -1, -1, -1, -1, -1, -1];
	var castling = 0;
	var kingFile = -1;

	function forEachEmpty(fun) {
		var emptyIndex = 0;
		for(var file = 0; file < 8; ++file) {
			if(scheme[file] >= 0) { continue; }

			fun(file, emptyIndex);
			++emptyIndex;
		}
	}

	function setAt(piece, target1, target2) {
		forEachEmpty(function(file, emptyIndex) {
			if(emptyIndex === target1 || emptyIndex === target2) {
				scheme[file] = piece;
			}
		});
	}

	// Light-square bishop
	scheme[(scharnaglCode % 4) * 2 + 1] = bt.BISHOP;
	scharnaglCode = Math.floor(scharnaglCode / 4);

	// Dark-square bishop
	scheme[(scharnaglCode % 4) * 2] = bt.BISHOP;
	scharnaglCode = Math.floor(scharnaglCode / 4);

	// Queen
	setAt(bt.QUEEN, scharnaglCode % 6, -1);
	scharnaglCode = Math.floor(scharnaglCode / 6);

	// Knights
	switch(scharnaglCode) {
		case 0: setAt(bt.KNIGHT, 0, 1); break;
		case 1: setAt(bt.KNIGHT, 0, 2); break;
		case 2: setAt(bt.KNIGHT, 0, 3); break;
		case 3: setAt(bt.KNIGHT, 0, 4); break;
		case 4: setAt(bt.KNIGHT, 1, 2); break;
		case 5: setAt(bt.KNIGHT, 1, 3); break;
		case 6: setAt(bt.KNIGHT, 1, 4); break;
		case 7: setAt(bt.KNIGHT, 2, 3); break;
		case 8: setAt(bt.KNIGHT, 2, 4); break;
		case 9: setAt(bt.KNIGHT, 3, 4); break;
		default: break;
	}

	// Rooks and king
	forEachEmpty(function(file, emptyIndex) {
		if(emptyIndex === 1) {
			scheme[file] = bt.KING;
			kingFile = file;
		}
		else {
			scheme[file] = bt.ROOK;
			castling |= 1 << file;
		}
	});

	return {
		scheme: scheme,
		castling: castling,
		kingFile: kingFile
	};
}


exports.makeCopy = function(position) {
	return {
		board    : position.board.slice(),
		turn     : position.turn,
		castling : position.castling.slice(),
		enPassant: position.enPassant,
		variant  : position.variant,
		legal    : position.legal,
		king     : position.king.slice()
	};
};

},{"../basetypes":19}],31:[function(require,module,exports){
/******************************************************************************
 *                                                                            *
 *    This file is part of Kokopu, a JavaScript chess library.                *
 *    Copyright (C) 2018-2019  Yoann Le Montagner <yo35 -at- melix.net>       *
 *                                                                            *
 *    This program is free software: you can redistribute it and/or           *
 *    modify it under the terms of the GNU Lesser General Public License      *
 *    as published by the Free Software Foundation, either version 3 of       *
 *    the License, or (at your option) any later version.                     *
 *                                                                            *
 *    This program is distributed in the hope that it will be useful,         *
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of          *
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the            *
 *    GNU Lesser General Public License for more details.                     *
 *                                                                            *
 *    You should have received a copy of the GNU Lesser General               *
 *    Public License along with this program. If not, see                     *
 *    <http://www.gnu.org/licenses/>.                                         *
 *                                                                            *
 ******************************************************************************/


'use strict';


var bt = require('../basetypes');
var attacks = require('./attacks');


/**
 * Check whether the given position is legal or not.
 *
 * A position is considered to be legal if all the following conditions are met:
 *
 *  1. There is exactly one white king and one black king on the board.
 *  2. The player that is not about to play is not check.
 *  3. There are no pawn on rows 1 and 8.
 *  4. For each colored castle flag set, there is a rook and a king on the
 *     corresponding initial squares.
 *  5. The pawn situation is consistent with the en-passant flag if it is set.
 *     For instance, if it is set to the 'e' column and black is about to play,
 *     the squares e2 and e3 must be empty, and there must be a white pawn on e4.
 */
exports.isLegal = function(position) {
	refreshLegalFlagAndKingSquares(position);
	return position.legal;
};


/**
 * Refresh the legal flag of the given position if it is set to null
 * (which means that the legality state of the position is unknown).
 *
 * Together with the legal flag, the reference to the squares where the white and
 * black kings lie is updated by this function.
 */
var refreshLegalFlagAndKingSquares = exports.refreshLegalFlagAndKingSquares = function(position) {
	if(position.legal !== null) {
		return;
	}
	position.legal = false;

	// Condition (1)
	refreshKingSquare(position, bt.WHITE);
	refreshKingSquare(position, bt.BLACK);
	if(position.king[bt.WHITE] < 0 || position.king[bt.BLACK] < 0) {
		return;
	}

	// Condition (2)
	if(attacks.isAttacked(position, position.king[1-position.turn], position.turn)) {
		return;
	}

	// Condition (3)
	for(var c=0; c<8; ++c) {
		var cp1 = position.board[c];
		var cp8 = position.board[112 + c];
		if(cp1 === bt.WP || cp8 === bt.WP || cp1 === bt.BP || cp8 === bt.BP) {
			return;
		}
	}

	// Condition (4)
	var isCastlingFlagLegalFun = position.variant === bt.CHESS_960 ? isCastlingFlagLegalForChess960 : isCastlingFlagLegalForRegularChess;
	for(var color=0; color<2; ++color) {
		if(!isCastlingFlagLegalFun(position, color)) {
			return;
		}
	}

	// Condition (5)
	if(position.enPassant >= 0) {
		var square2 = (6-position.turn*5)*16 + position.enPassant;
		var square3 = (5-position.turn*3)*16 + position.enPassant;
		var square4 = (4-position.turn  )*16 + position.enPassant;
		if(!(position.board[square2]===bt.EMPTY && position.board[square3]===bt.EMPTY && position.board[square4]===bt.PAWN*2+1-position.turn)) {
			return;
		}
	}

	// At this point, all the conditions (1) to (5) hold, so the position can be flagged as legal.
	position.legal = true;
};


/**
 * Detect the kings of the given color that are present on the chess board.
 */
function refreshKingSquare(position, color) {
	var target = bt.KING*2 + color;
	position.king[color] = -1;
	for(var sq=0; sq<120; sq += (sq & 0x7)===7 ? 9 : 1) {
		if(position.board[sq] === target) {

			// If the targeted king is detected on the square sq, two situations may occur:
			// 1) No king was detected on the previously visited squares: then the current
			//    square is saved, and loop over the next board squares goes on.
			if(position.king[color] < 0) {
				position.king[color] = sq;
			}

			// 2) Another king was detected on the previously visited squares: then the buffer position.king[color]
			//    is set to the invalid state (-1), and the loop is interrupted.
			else {
				position.king[color] = -1;
				return;
			}
		}
	}
}


function isCastlingFlagLegalForRegularChess(position, color) {
	var skipOO  = (position.castling[color] & 0x80) === 0;
	var skipOOO = (position.castling[color] & 0x01) === 0;
	var rookHOK = skipOO              || position.board[7 + 112*color] === bt.ROOK*2 + color;
	var rookAOK = skipOOO             || position.board[0 + 112*color] === bt.ROOK*2 + color;
	var kingOK  = (skipOO && skipOOO) || position.board[4 + 112*color] === bt.KING*2 + color;
	return kingOK && rookAOK && rookHOK;
}


function isCastlingFlagLegalForChess960(position, color) {
	var files = [];
	for(var file=0; file<8; ++file) {
		if((position.castling[color] & 1 << file) === 0) {
			continue;
		}

		// Ensure there is a rook on each square for which the corresponding file flag is set.
		if(position.board[file + 112*color] !== bt.ROOK*2 + color) {
			return;
		}
		files.push(file);
	}

	// Additional check on the king position, depending on the number of file flags.
	switch(files.length) {
		case 0: return true;

		// 1 possible castle -> ensure the king is on the initial rank.
		case 1: return position.king[color] >= 112*color && position.king[color] <= 7 + 112*color;

		// 2 possible castles -> ensure the king is between the two rooks.
		case 2: return position.king[color] > files[0] + 112*color && position.king[color] < files[1] + 112*color;

		default: return false;
	}
}

},{"../basetypes":19,"./attacks":28}],32:[function(require,module,exports){
/******************************************************************************
 *                                                                            *
 *    This file is part of Kokopu, a JavaScript chess library.                *
 *    Copyright (C) 2018-2019  Yoann Le Montagner <yo35 -at- melix.net>       *
 *                                                                            *
 *    This program is free software: you can redistribute it and/or           *
 *    modify it under the terms of the GNU Lesser General Public License      *
 *    as published by the Free Software Foundation, either version 3 of       *
 *    the License, or (at your option) any later version.                     *
 *                                                                            *
 *    This program is distributed in the hope that it will be useful,         *
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of          *
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the            *
 *    GNU Lesser General Public License for more details.                     *
 *                                                                            *
 *    You should have received a copy of the GNU Lesser General               *
 *    Public License along with this program. If not, see                     *
 *    <http://www.gnu.org/licenses/>.                                         *
 *                                                                            *
 ******************************************************************************/


'use strict';


var bt = require('../basetypes');
var moveDescriptor = require('../movedescriptor');
var attacks = require('./attacks');
var legality = require('./legality');


/* eslint-disable no-mixed-spaces-and-tabs, indent */

// Displacement lookup per square index difference.
var /* const */ DISPLACEMENT_LOOKUP = [
 204,    0,    0,    0,    0,    0,    0,   60,    0,    0,    0,    0,    0,    0,  204,    0,
	 0,  204,    0,    0,    0,    0,    0,   60,    0,    0,    0,    0,    0,  204,    0,    0,
	 0,    0,  204,    0,    0,    0,    0,   60,    0,    0,    0,    0,  204,    0,    0,    0,
	 0,    0,    0,  204,    0,    0,    0,   60,    0,    0,    0,  204,    0,    0,    0,    0,
	 0,    0,    0,    0,  204,    0,    0,   60,    0,    0,  204,    0,    0,    0,    0,    0,
	 0,    0,    0,    0,    0,  204,  768,   60,  768,  204,    0,    0,    0,    0,    0,    0,
	 0,    0,    0,    0,    0,  768, 2255, 2111, 2255,  768,    0,    0,    0,    0,    0,    0,
	60,   60,   60,   60,   60,   60,   63,    0,   63,   60,   60,   60,   60,   60,   60,    0,
	 0,    0,    0,    0,    0,  768, 1231, 1087, 1231,  768,    0,    0,    0,    0,    0,    0,
	 0,    0,    0,    0,    0,  204,  768,   60,  768,  204,    0,    0,    0,    0,    0,    0,
	 0,    0,    0,    0,  204,    0,    0,   60,    0,    0,  204,    0,    0,    0,    0,    0,
	 0,    0,    0,  204,    0,    0,    0,   60,    0,    0,    0,  204,    0,    0,    0,    0,
	 0,    0,  204,    0,    0,    0,    0,   60,    0,    0,    0,    0,  204,    0,    0,    0,
	 0,  204,    0,    0,    0,    0,    0,   60,    0,    0,    0,    0,    0,  204,    0,    0,
 204,    0,    0,    0,    0,    0,    0,   60,    0,    0,    0,    0,    0,    0,  204,    0
];

// Sliding direction
var /* const */ SLIDING_DIRECTION = [
	-17,   0,   0,   0,   0,   0,   0, -16,   0,   0,   0,   0,   0,   0, -15,   0,
		0, -17,   0,   0,   0,   0,   0, -16,   0,   0,   0,   0,   0, -15,   0,   0,
		0,   0, -17,   0,   0,   0,   0, -16,   0,   0,   0,   0, -15,   0,   0,   0,
		0,   0,   0, -17,   0,   0,   0, -16,   0,   0,   0, -15,   0,   0,   0,   0,
		0,   0,   0,   0, -17,   0,   0, -16,   0,   0, -15,   0,   0,   0,   0,   0,
		0,   0,   0,   0,   0, -17,   0, -16,   0, -15,   0,   0,   0,   0,   0,   0,
		0,   0,   0,   0,   0,   0, -17, -16, -15,   0,   0,   0,   0,   0,   0,   0,
	 -1,  -1,  -1,  -1,  -1,  -1,  -1,   0,   1,   1,   1,   1,   1,   1,   1,   0,
		0,   0,   0,   0,   0,   0,  15,  16,  17,   0,   0,   0,   0,   0,   0,   0,
		0,   0,   0,   0,   0,  15,   0,  16,   0,  17,   0,   0,   0,   0,   0,   0,
		0,   0,   0,   0,  15,   0,   0,  16,   0,   0,  17,   0,   0,   0,   0,   0,
		0,   0,   0,  15,   0,   0,   0,  16,   0,   0,   0,  17,   0,   0,   0,   0,
		0,   0,  15,   0,   0,   0,   0,  16,   0,   0,   0,   0,  17,   0,   0,   0,
		0,  15,   0,   0,   0,   0,   0,  16,   0,   0,   0,   0,   0,  17,   0,   0,
	 15,   0,   0,   0,   0,   0,   0,  16,   0,   0,   0,   0,   0,   0,  17,   0
];

/* eslint-enable no-mixed-spaces-and-tabs, indent */


exports.isCheck = function(position) {
	return legality.isLegal(position) && attacks.isAttacked(position, position.king[position.turn], 1-position.turn);
};


exports.isCheckmate = function(position) {
	return legality.isLegal(position) && !hasMove(position) && attacks.isAttacked(position, position.king[position.turn], 1-position.turn);
};


exports.isStalemate = function(position) {
	return legality.isLegal(position) && !hasMove(position) && !attacks.isAttacked(position, position.king[position.turn], 1-position.turn);
};


var hasMove = exports.hasMove = function(position) {
	function MoveFound() {}
	try {
		generateMoves(position, function(descriptor) {
			if(descriptor) { throw new MoveFound(); }
		});
		return false;
	}
	catch(err) {
		if(err instanceof MoveFound) { return true; }
		else { throw err; }
	}
};


exports.moves = function(position) {
	var res = [];
	generateMoves(position, function(descriptor, generatePromotions) {
		if(descriptor) {
			if(generatePromotions) {
				res.push(moveDescriptor.makePromotion(descriptor._from, descriptor._to, position.turn, bt.QUEEN , descriptor._optionalPiece));
				res.push(moveDescriptor.makePromotion(descriptor._from, descriptor._to, position.turn, bt.ROOK  , descriptor._optionalPiece));
				res.push(moveDescriptor.makePromotion(descriptor._from, descriptor._to, position.turn, bt.BISHOP, descriptor._optionalPiece));
				res.push(moveDescriptor.makePromotion(descriptor._from, descriptor._to, position.turn, bt.KNIGHT, descriptor._optionalPiece));
			}
			else {
				res.push(descriptor);
			}
		}
	});
	return res;
};


/**
 * Generate all the legal moves of the given position.
 */
function generateMoves(position, fun) {

	// Ensure that the position is legal.
	if(!legality.isLegal(position)) { return; }

	// For all potential 'from' square...
	for(var from=0; from<120; from += (from & 0x7)===7 ? 9 : 1) {

		// Nothing to do if the current square does not contain a piece of the right color.
		var fromContent = position.board[from];
		var movingPiece = Math.floor(fromContent / 2);
		if(fromContent < 0 || fromContent%2 !== position.turn) {
			continue;
		}

		// Generate moves for pawns
		if(movingPiece === bt.PAWN) {

			// Capturing moves
			var attackDirections = attacks.ATTACK_DIRECTIONS[fromContent];
			for(var i=0; i<attackDirections.length; ++i) {
				var to = from + attackDirections[i];
				if((to & 0x88) === 0) {
					var toContent = position.board[to];
					if(toContent >= 0 && toContent%2 !== position.turn) { // regular capturing move
						fun(isKingSafeAfterMove(position, from, to, -1), to<8 || to>=112);
					}
					else if(toContent < 0 && to === (5-position.turn*3)*16 + position.enPassant) { // en-passant move
						fun(isKingSafeAfterMove(position, from, to, (4-position.turn)*16 + position.enPassant), false);
					}
				}
			}

			// Non-capturing moves
			var moveDirection = 16 - position.turn*32;
			var to = from + moveDirection;
			if(position.board[to] < 0) {
				fun(isKingSafeAfterMove(position, from, to, -1), to<8 || to>=112);

				// 2-square pawn move
				var firstSquareOfRow = (1 + position.turn*5) * 16;
				if(from>=firstSquareOfRow && from<firstSquareOfRow+8) {
					to += moveDirection;
					if(position.board[to] < 0) {
						fun(isKingSafeAfterMove(position, from, to, -1), false);
					}
				}
			}
		}

		// Generate moves for non-sliding non-pawn pieces
		else if(movingPiece===bt.KNIGHT || movingPiece===bt.KING) {
			var directions = attacks.ATTACK_DIRECTIONS[fromContent];
			for(var i=0; i<directions.length; ++i) {
				var to = from + directions[i];
				if((to & 0x88) === 0) {
					var toContent = position.board[to];
					if(toContent < 0 || toContent%2 !== position.turn) {
						fun(isKingSafeAfterMove(position, from, to, -1), false);
					}
				}
			}
		}

		// Generate moves for sliding pieces
		else {
			var directions = attacks.ATTACK_DIRECTIONS[fromContent];
			for(var i=0; i<directions.length; ++i) {
				for(var to = from + directions[i]; (to & 0x88) === 0; to += directions[i]) {
					var toContent = position.board[to];
					if(toContent < 0 || toContent%2 !== position.turn) {
						fun(isKingSafeAfterMove(position, from, to, -1), false);
					}
					if(toContent >= 0) { break; }
				}
			}
		}

		// Generate castling moves
		if(movingPiece === bt.KING && position.castling[position.turn] !== 0) {
			fun(isCastlingLegal(position, from, 2 + 112*position.turn), false);
			fun(isCastlingLegal(position, from, 6 + 112*position.turn), false);
		}
	}
}


/**
 * Check whether the current player king is in check after moving from `from` to `to`.
 *
 * This function implements the verification steps (7) to (9) as defined in {@link #isMoveLegal}
 *
 * @param {number} enPassantSquare Index of the square where the "en-passant" taken pawn lies if any, `-1` otherwise.
 * @returns {boolean|MoveDescriptor} The move descriptor if the move is legal, `false` otherwise.
 */
var isKingSafeAfterMove = exports.isKingSafeAfterMove = function(position, from, to, enPassantSquare) {
	var fromContent = position.board[from];
	var toContent   = position.board[to  ];
	var movingPiece = Math.floor(fromContent / 2);

	// Step (7) -> Execute the displacement (castling moves are processed separately).
	position.board[to  ] = fromContent;
	position.board[from] = bt.EMPTY;
	if(enPassantSquare >= 0) {
		position.board[enPassantSquare] = bt.EMPTY;
	}

	// Step (8) -> Is the king safe after the displacement?
	var kingSquare    = movingPiece===bt.KING ? to : position.king[position.turn];
	var kingIsInCheck = attacks.isAttacked(position, kingSquare, 1-position.turn);

	// Step (9) -> Reverse the displacement.
	position.board[from] = fromContent;
	position.board[to  ] = toContent;
	if(enPassantSquare >= 0) {
		position.board[enPassantSquare] = bt.PAWN*2 + 1-position.turn;
	}

	// Final result
	if(kingIsInCheck) {
		return false;
	}
	else {
		if(enPassantSquare >= 0) {
			return moveDescriptor.makeEnPassant(from, to, enPassantSquare, position.turn);
		}
		else {
			return moveDescriptor.make(from, to, position.turn, movingPiece, toContent);
		}
	}
};


/**
 * Delegated method for checking whether a castling move is legal or not.
 */
var isCastlingLegal = exports.isCastlingLegal = function(position, from, to) {

	// Origin and destination squares of the rook involved in the move.
	var castleFile = -1;
	var rookTo = -1;
	if(to === 2 + position.turn*112) {
		castleFile = position.variant === bt.CHESS_960 ? findCastleFile(position.castling[position.turn], from % 16, -1) : 0;
		rookTo = 3 + 112*position.turn;
	}
	else if(to === 6 + position.turn*112) {
		castleFile = position.variant === bt.CHESS_960 ? findCastleFile(position.castling[position.turn], from % 16, 1) : 7;
		rookTo = 5 + 112*position.turn;
	}
	else {
		return false;
	}

	// Ensure that the given underlying castling is allowed.
	if(position.variant === bt.CHESS_960) {
		if(castleFile === -1) { return false; }
	}
	else {
		if((position.castling[position.turn] & 1<<castleFile) === 0) { return false; }
	}

	var rookFrom = castleFile + position.turn*112;

	// Ensure that each square on the trajectory is empty.
	for(var sq = Math.min(from, to, rookFrom, rookTo); sq <= Math.max(from, to, rookFrom, rookTo); ++sq) {
		if(sq !== from && sq !== rookFrom && position.board[sq] !== bt.EMPTY) { return false; }
	}

	// The origin and destination squares of the king, and the square between them must not be attacked.
	var byWho = 1 - position.turn;
	for(var sq = Math.min(from, to); sq <= Math.max(from, to); ++sq) {
		if(attacks.isAttacked(position, sq, byWho)) { return false; }
	}

	// The move is legal -> generate the move descriptor.
	return moveDescriptor.makeCastling(from, to, rookFrom, rookTo, position.turn);
};


function findCastleFile(castlingFlag, kingFile, offset) {
	for(var file = kingFile + offset; file >= 0 && file < 8; file += offset) {
		if((castlingFlag & 1 << file) !== 0) { return file; }
	}
	return -1;
}


/**
 * Core algorithm to determine whether a move is legal or not. The verification flow is the following:
 *
 *  1. Ensure that the position itself is legal.
 *  2. Ensure that the origin square contains a piece (denoted as the moving-piece)
 *     whose color is the same than the color of the player about to play.
 *  4. Ensure that the displacement is geometrically correct, with respect to the moving piece.
 *  5. Check the content of the destination square.
 *  6. For the sliding pieces (and in case of a 2-square pawn move), ensure that there is no piece
 *     on the trajectory.
 *
 * The move is almost ensured to be legal at this point. The last condition to check
 * is whether the king of the current player will be in check after the move or not.
 *
 *  7. Execute the displacement from the origin to the destination square, in such a way that
 *     it can be reversed. Only the state of the board is updated at this point.
 *  8. Look for king attacks.
 *  9. Reverse the displacement.
 *
 * Castling moves fail at step (4). They are taken out of this flow and processed
 * by the dedicated method `isLegalCastling()`.
 */
exports.isMoveLegal = function(position, from, to) {

	// Step (1)
	if(!legality.isLegal(position)) { return false; }

	// Step (2)
	var fromContent = position.board[from];
	var toContent   = position.board[to  ];
	var movingPiece = Math.floor(fromContent / 2);
	if(fromContent < 0 || fromContent%2 !== position.turn) { return false; }

	// Miscellaneous variables
	var displacement = to - from + 119;
	var enPassantSquare = -1; // square where a pawn is taken if the move is "en-passant"
	var isTwoSquarePawnMove = false;
	var isPromotion = movingPiece===bt.PAWN && (to<8 || to>=112);

	// Compute the move descriptor corresponding to castling, if applicable.
	var castlingDescriptor = false;
	if(movingPiece === bt.KING && position.castling[position.turn] !== 0) {
		castlingDescriptor = isCastlingLegal(position, from, to);
	}

	// Step (4)
	if((DISPLACEMENT_LOOKUP[displacement] & 1 << fromContent) === 0) {
		if(movingPiece === bt.PAWN && displacement === 151-position.turn*64) {
			var firstSquareOfRow = (1 + position.turn*5) * 16;
			if(from < firstSquareOfRow || from >= firstSquareOfRow+8) { return false; }
			isTwoSquarePawnMove = true;
		}
		else {
			return castlingDescriptor;
		}
	}

	// Step (5) -> check the content of the destination square
	if(movingPiece === bt.PAWN) {
		if(displacement === 135-position.turn*32 || isTwoSquarePawnMove) { // non-capturing pawn move
			if(toContent !== bt.EMPTY) { return false; }
		}
		else if(toContent === bt.EMPTY) { // en-passant pawn move
			if(position.enPassant < 0 || to !== (5-position.turn*3)*16 + position.enPassant) { return false; }
			enPassantSquare = (4-position.turn)*16 + position.enPassant;
		}
		else { // regular capturing pawn move
			if(toContent%2 === position.turn) { return false; }
		}
	}
	else { // piece move
		if(toContent >= 0 && toContent%2 === position.turn) { return castlingDescriptor; }
	}

	// Step (6) -> For sliding pieces, ensure that there is nothing between the origin and the destination squares.
	if(movingPiece === bt.BISHOP || movingPiece === bt.ROOK || movingPiece === bt.QUEEN) {
		var direction = SLIDING_DIRECTION[displacement];
		for(var sq=from + direction; sq !== to; sq += direction) {
			if(position.board[sq] !== bt.EMPTY) { return false; }
		}
	}
	else if(isTwoSquarePawnMove) { // two-square pawn moves also require this test.
		if(position.board[(from + to) / 2] !== bt.EMPTY) { return false; }
	}

	// Steps (7) to (9) are delegated to `isKingSafeAfterMove`.
	var descriptor = isKingSafeAfterMove(position, from, to, enPassantSquare);
	if(descriptor && isPromotion) {
		return {
			type: 'promotion',
			build: function(promotion) {
				return promotion !== bt.PAWN && promotion !== bt.KING ?
					moveDescriptor.makePromotion(descriptor._from, descriptor._to, descriptor._movingPiece % 2, promotion, descriptor._optionalPiece) :
					false;
			}
		};
	}
	else if(descriptor && castlingDescriptor) {
		return {
			type: 'castle960',
			build: function(type) {
				return type ? castlingDescriptor : descriptor;
			}
		};
	}
	else if(descriptor) {
		return descriptor;
	}
	else if(castlingDescriptor) {
		return castlingDescriptor;
	}
	else {
		return false;
	}
};


/**
 * Play the move corresponding to the given descriptor.
 */
exports.play = function(position, descriptor) {

	// Update the board.
	position.board[descriptor._from] = bt.EMPTY; // WARNING: update `from` before `to` in case both squares are actually the same!
	if(descriptor.isEnPassant()) {
		position.board[descriptor._optionalSquare1] = bt.EMPTY;
	}
	else if(descriptor.isCastling()) {
		position.board[descriptor._optionalSquare1] = bt.EMPTY;
		position.board[descriptor._optionalSquare2] = descriptor._optionalPiece;
	}
	position.board[descriptor._to] = descriptor._finalPiece;

	var movingPiece = Math.floor(descriptor._movingPiece / 2);

	// Update the castling flags.
	if(movingPiece === bt.KING) {
		position.castling[position.turn] = 0;
	}
	if(descriptor._from <    8) { position.castling[bt.WHITE] &= ~(1 <<  descriptor._from    ); }
	if(descriptor._to   <    8) { position.castling[bt.WHITE] &= ~(1 <<  descriptor._to      ); }
	if(descriptor._from >= 112) { position.castling[bt.BLACK] &= ~(1 << (descriptor._from%16)); }
	if(descriptor._to   >= 112) { position.castling[bt.BLACK] &= ~(1 << (descriptor._to  %16)); }

	// Update the en-passant flag.
	position.enPassant = -1;
	if(movingPiece === bt.PAWN && Math.abs(descriptor._from - descriptor._to)===32) {
		var otherPawn = descriptor._movingPiece ^ 0x01;
		var squareBefore = descriptor._to - 1;
		var squareAfter = descriptor._to + 1;
		if(((squareBefore & 0x88) === 0 && position.board[squareBefore] === otherPawn) ||
			((squareAfter & 0x88) === 0 && position.board[squareAfter]===otherPawn)) {
			position.enPassant = descriptor._to % 16;
		}
	}

	// Update the computed flags.
	if(movingPiece === bt.KING) {
		position.king[position.turn] = descriptor._to;
	}

	// Toggle the turn flag.
	position.turn = 1 - position.turn;
};


/**
 * Determine if a null-move (i.e. switching the player about to play) can be play in the current position.
 * A null-move is possible if the position is legal and if the current player about to play is not in check.
 */
var isNullMoveLegal = exports.isNullMoveLegal = function(position) {
	return legality.isLegal(position) && !attacks.isAttacked(position, position.king[position.turn], 1-position.turn);
};


/**
 * Play a null-move on the current position if it is legal.
 */
exports.playNullMove = function(position) {
	if(isNullMoveLegal(position)) {
		position.turn = 1 - position.turn;
		position.enPassant = -1;
		return true;
	}
	else {
		return false;
	}
};

},{"../basetypes":19,"../movedescriptor":24,"./attacks":28,"./legality":31}],33:[function(require,module,exports){
/******************************************************************************
 *                                                                            *
 *    This file is part of Kokopu, a JavaScript chess library.                *
 *    Copyright (C) 2018-2019  Yoann Le Montagner <yo35 -at- melix.net>       *
 *                                                                            *
 *    This program is free software: you can redistribute it and/or           *
 *    modify it under the terms of the GNU Lesser General Public License      *
 *    as published by the Free Software Foundation, either version 3 of       *
 *    the License, or (at your option) any later version.                     *
 *                                                                            *
 *    This program is distributed in the hope that it will be useful,         *
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of          *
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the            *
 *    GNU Lesser General Public License for more details.                     *
 *                                                                            *
 *    You should have received a copy of the GNU Lesser General               *
 *    Public License along with this program. If not, see                     *
 *    <http://www.gnu.org/licenses/>.                                         *
 *                                                                            *
 ******************************************************************************/


'use strict';


var bt = require('../basetypes');
var moveDescriptor = require('../movedescriptor');
var exception = require('../exception');
var i18n = require('../i18n');

var impl = require('./impl');
var fen = require('./fen');
var attacks = require('./attacks');
var legality = require('./legality');
var moveGeneration = require('./movegeneration');


/**
 * Convert the given move descriptor to standard algebraic notation.
 */
exports.getNotation = function(position, descriptor) {
	var res = '';

	// Castling move
	if(descriptor.isCastling()) {
		res = descriptor._to % 16 === 6 ? 'O-O' : 'O-O-O';
	}

	// Pawn move
	else if(Math.floor(descriptor._movingPiece / 2) === bt.PAWN) {
		if(descriptor.isCapture()) {
			res += bt.fileToString(descriptor._from % 16) + 'x';
		}
		res += bt.squareToString(descriptor._to);
		if(descriptor.isPromotion()) {
			res += '=' + bt.pieceToString(Math.floor(descriptor._finalPiece / 2)).toUpperCase();
		}
	}

	// Non-pawn move
	else {
		res += bt.pieceToString(Math.floor(descriptor._movingPiece / 2)).toUpperCase();
		res += getDisambiguationSymbol(position, descriptor._from, descriptor._to);
		if(descriptor.isCapture()) {
			res += 'x';
		}
		res += bt.squareToString(descriptor._to);
	}

	// Check/checkmate detection and final result.
	res += getCheckCheckmateSymbol(position, descriptor);
	return res;
};


/**
 * Return the check/checkmate symbol to use for a move.
 */
function getCheckCheckmateSymbol(position, descriptor) {
	var nextPosition = impl.makeCopy(position);
	moveGeneration.play(nextPosition, descriptor);
	return moveGeneration.isCheck(nextPosition) ? (moveGeneration.hasMove(nextPosition) ? '+' : '#') : '';
}


/**
 * Return the disambiguation symbol to use for a move from `from` to `to`.
 */
function getDisambiguationSymbol(position, from, to) {
	var attackers = attacks.getAttacks(position, to, position.turn).filter(function(sq) { return position.board[sq]===position.board[from]; });

	// Disambiguation is not necessary if there less than 2 attackers.
	if(attackers.length < 2) {
		return '';
	}

	var foundNotPined = false;
	var foundOnSameRank = false;
	var foundOnSameFile = false;
	var rankFrom = Math.floor(from / 16);
	var fileFrom = from % 16;
	for(var i=0; i<attackers.length; ++i) {
		var sq = attackers[i];
		if(sq === from || isPinned(position, sq, to)) { continue; }

		foundNotPined = true;
		if(rankFrom === Math.floor(sq / 16)) { foundOnSameRank = true; }
		if(fileFrom === sq % 16) { foundOnSameFile = true; }
	}

	if(foundOnSameFile) {
		return foundOnSameRank ? bt.squareToString(from) : bt.rankToString(rankFrom);
	}
	else {
		return foundNotPined ? bt.fileToString(fileFrom) : '';
	}
}


/**
 * Whether the piece on the given square is pinned or not.
 */
function isPinned(position, sq, aimingAtSq) {
	var kingSquare = position.king[position.turn];
	var vector = Math.abs(kingSquare - sq);
	if(vector === 0) {
		return false;
	}
	var aimingAtVector = Math.abs(aimingAtSq - sq);

	var pinnerQueen  = bt.QUEEN  * 2 + 1 - position.turn;
	var pinnerRook   = bt.ROOK   * 2 + 1 - position.turn;
	var pinnerBishop = bt.BISHOP * 2 + 1 - position.turn;

	// Potential pinning on file or rank.
	if(vector < 8) {
		return aimingAtVector >= 8 && pinningLoockup(position, kingSquare, sq, kingSquare < sq ? 1 : -1, pinnerRook, pinnerQueen);
	}
	else if(vector % 16 === 0) {
		return aimingAtVector % 16 !==0 && pinningLoockup(position, kingSquare, sq, kingSquare < sq ? 16 : -16, pinnerRook, pinnerQueen);
	}

	// Potential pinning on diagonal.
	else if(vector % 15 === 0) {
		return aimingAtVector % 15 !==0 && pinningLoockup(position, kingSquare, sq, kingSquare < sq ? 15 : -15, pinnerBishop, pinnerQueen);
	}
	else if(vector % 17 === 0) {
		return aimingAtVector % 17 !==0 && pinningLoockup(position, kingSquare, sq, kingSquare < sq ? 17 : -17, pinnerBishop, pinnerQueen);
	}

	// No pinning for sure.
	else {
		return false;
	}
}

function pinningLoockup(position, kingSquare, targetSquare, direction, pinnerColoredPiece1, pinnerColoredPiece2) {
	for(var sq = kingSquare + direction; sq !== targetSquare; sq += direction) {
		if(position.board[sq] !== bt.EMPTY) {
			return false;
		}
	}
	for(var sq = targetSquare + direction; (sq & 0x88) === 0; sq += direction) {
		if(position.board[sq] !== bt.EMPTY) {
			return position.board[sq] === pinnerColoredPiece1 || position.board[sq] === pinnerColoredPiece2;
		}
	}
	return false;
}


/**
 * Parse a move notation for the given position.
 *
 * @returns {MoveDescriptor}
 * @throws InvalidNotation
 */
exports.parseNotation = function(position, notation, strict) {

	// General syntax
	var m = /^(?:(O-O-O)|(O-O)|([KQRBN])([a-h])?([1-8])?(x)?([a-h][1-8])|(?:([a-h])(x)?)?([a-h][1-8])(?:(=)?([KQRBNP]))?)([+#])?$/.exec(notation);
	if(m === null) {
		throw new exception.InvalidNotation(fen.getFEN(position, 0, 1), notation, i18n.INVALID_MOVE_NOTATION_SYNTAX);
	}

	// Ensure that the position is legal.
	if(!legality.isLegal(position)) {
		throw new exception.InvalidNotation(fen.getFEN(position, 0, 1), notation, i18n.ILLEGAL_POSITION);
	}

	// CASTLING
	// m[1] -> O-O-O
	// m[2] -> O-O

	// NON-PAWN MOVE
	// m[3] -> moving piece
	// m[4] -> file disambiguation
	// m[5] -> rank disambiguation
	// m[6] -> x (capture symbol)
	// m[7] -> to

	// PAWN MOVE
	// m[ 8] -> from column (only for captures)
	// m[ 9] -> x (capture symbol)
	// m[10] -> to
	// m[11] -> = (promotion symbol)
	// m[12] -> promoted piece

	// OTHER
	// m[13] -> +/# (check/checkmate symbol)

	var descriptor = null;

	// Parse castling moves
	if(m[1] || m[2]) {
		var from = position.king[position.turn];
		var to = (m[2] ? 6 : 2) + position.turn*112;
		descriptor = moveGeneration.isCastlingLegal(position, from, to);
		if(!descriptor) {
			var message = m[2] ? i18n.ILLEGAL_KING_SIDE_CASTLING : i18n.ILLEGAL_QUEEN_SIDE_CASTLING;
			throw new exception.InvalidNotation(fen.getFEN(position, 0, 1), notation, message);
		}
	}

	// Non-pawn move
	else if(m[3]) {
		var movingPiece = bt.pieceFromString(m[3].toLowerCase());
		var to = bt.squareFromString(m[7]);
		var toContent = position.board[to];

		// Cannot take your own pieces!
		if(toContent >= 0 && toContent % 2 === position.turn) {
			throw new exception.InvalidNotation(fen.getFEN(position, 0, 1), notation, i18n.TRYING_TO_CAPTURE_YOUR_OWN_PIECES);
		}

		// Find the "from"-square candidates
		var attackers = attacks.getAttacks(position, to, position.turn).filter(function(sq) { return position.board[sq] === movingPiece*2 + position.turn; });

		// Apply disambiguation
		if(m[4]) {
			var fileFrom = bt.fileFromString(m[4]);
			attackers = attackers.filter(function(sq) { return sq%16 === fileFrom; });
		}
		if(m[5]) {
			var rankFrom = bt.rankFromString(m[5]);
			attackers = attackers.filter(function(sq) { return Math.floor(sq/16) === rankFrom; });
		}
		if(attackers.length===0) {
			var message = (m[4] || m[5]) ? i18n.NO_PIECE_CAN_MOVE_TO_DISAMBIGUATION : i18n.NO_PIECE_CAN_MOVE_TO;
			throw new exception.InvalidNotation(fen.getFEN(position, 0, 1), notation, message, m[3], m[7]);
		}

		// Compute the move descriptor for each remaining "from"-square candidate
		for(var i=0; i<attackers.length; ++i) {
			var currentDescriptor = moveGeneration.isKingSafeAfterMove(position, attackers[i], to, -1);
			if(currentDescriptor) {
				if(descriptor !== null) {
					throw new exception.InvalidNotation(fen.getFEN(position, 0, 1), notation, i18n.REQUIRE_DISAMBIGUATION, m[3], m[7]);
				}
				descriptor = currentDescriptor;
			}
		}
		if(descriptor === null) {
			var message = position.turn===bt.WHITE ? i18n.NOT_SAFE_FOR_WHITE_KING : i18n.NOT_SAFE_FOR_BLACK_KING;
			throw new exception.InvalidNotation(fen.getFEN(position, 0, 1), notation, message);
		}

		// STRICT-MODE -> check the disambiguation symbol.
		if(strict) {
			var expectedDS = getDisambiguationSymbol(position, descriptor._from, to);
			var observedDS = (m[4] ? m[4] : '') + (m[5] ? m[5] : '');
			if(expectedDS !== observedDS) {
				throw new exception.InvalidNotation(fen.getFEN(position, 0, 1), notation, i18n.WRONG_DISAMBIGUATION_SYMBOL, expectedDS, observedDS);
			}
		}
	}

	// Pawn move
	else if(m[10]) {
		var to = bt.squareFromString(m[10]);
		if(m[8]) {
			descriptor = getPawnCaptureDescriptor(position, notation, bt.fileFromString(m[8]), to);
		}
		else {
			descriptor = getPawnAdvanceDescriptor(position, notation, to);
		}

		// Ensure that the pawn move do not let a king in check.
		if(!descriptor) {
			var message = position.turn===bt.WHITE ? i18n.NOT_SAFE_FOR_WHITE_KING : i18n.NOT_SAFE_FOR_BLACK_KING;
			throw new exception.InvalidNotation(fen.getFEN(position, 0, 1), notation, message);
		}

		// Detect promotions
		if(to<8 || to>=112) {
			if(!m[12]) {
				throw new exception.InvalidNotation(fen.getFEN(position, 0, 1), notation, i18n.MISSING_PROMOTION);
			}
			var promotion = bt.pieceFromString(m[12].toLowerCase());
			if(promotion === bt.PAWN || promotion === bt.KING) {
				throw new exception.InvalidNotation(fen.getFEN(position, 0, 1), notation, i18n.INVALID_PROMOTED_PIECE, m[12]);
			}
			descriptor = moveDescriptor.makePromotion(descriptor._from, descriptor._to, descriptor._movingPiece % 2, promotion, descriptor._optionalPiece);

			// STRICT MODE -> do not forget the `=` character!
			if(strict && !m[11]) {
				throw new exception.InvalidNotation(fen.getFEN(position, 0, 1), notation, i18n.MISSING_PROMOTION_SYMBOL);
			}
		}

		// Detect illegal promotion attempts!
		else if(m[12]) {
			throw new exception.InvalidNotation(fen.getFEN(position, 0, 1), notation, i18n.ILLEGAL_PROMOTION);
		}
	}

	// STRICT MODE
	if(strict) {
		if(descriptor.isCapture() !== (m[6] || m[9])) {
			var message = descriptor.isCapture() ? i18n.MISSING_CAPTURE_SYMBOL : i18n.INVALID_CAPTURE_SYMBOL;
			throw new exception.InvalidNotation(fen.getFEN(position, 0, 1), notation, message);
		}
		var expectedCCS = getCheckCheckmateSymbol(position, descriptor);
		var observedCCS = m[13] ? m[13] : '';
		if(expectedCCS !== observedCCS) {
			throw new exception.InvalidNotation(fen.getFEN(position, 0, 1), notation, i18n.WRONG_CHECK_CHECKMATE_SYMBOL, expectedCCS, observedCCS);
		}
	}

	// Final result
	return descriptor;
};


/**
 * Delegate function for capture pawn move parsing.
 *
 * @returns {boolean|MoveDescriptor}
 */
function getPawnCaptureDescriptor(position, notation, columnFrom, to) {

	// Ensure that `to` is not on the 1st row.
	var from = to - 16 + position.turn*32;
	if((from & 0x88) !== 0) {
		throw new exception.InvalidNotation(fen.getFEN(position, 0, 1), notation, i18n.INVALID_CAPTURING_PAWN_MOVE);
	}

	// Compute the "from"-square.
	var columnTo = to % 16;
	if(columnTo - columnFrom === 1) { from -= 1; }
	else if(columnTo - columnFrom === -1) { from += 1; }
	else {
		throw new exception.InvalidNotation(fen.getFEN(position, 0, 1), notation, i18n.INVALID_CAPTURING_PAWN_MOVE);
	}

	// Check the content of the "from"-square
	if(position.board[from] !== bt.PAWN*2+position.turn) {
		throw new exception.InvalidNotation(fen.getFEN(position, 0, 1), notation, i18n.INVALID_CAPTURING_PAWN_MOVE);
	}

	// Check the content of the "to"-square
	var toContent = position.board[to];
	if(toContent < 0) {
		if(to === (5-position.turn*3)*16 + position.enPassant) { // detecting "en-passant" captures
			return moveGeneration.isKingSafeAfterMove(position, from, to, (4-position.turn)*16 + position.enPassant);
		}
	}
	else if(toContent % 2 !== position.turn) { // detecting regular captures
		return moveGeneration.isKingSafeAfterMove(position, from, to, -1);
	}

	throw new exception.InvalidNotation(fen.getFEN(position, 0, 1), notation, i18n.INVALID_CAPTURING_PAWN_MOVE);
}


/**
 * Delegate function for non-capturing pawn move parsing.
 *
 * @returns {boolean|MoveDescriptor}
 */
function getPawnAdvanceDescriptor(position, notation, to) {

	// Ensure that `to` is not on the 1st row.
	var offset = 16 - position.turn*32;
	var from = to - offset;
	if((from & 0x88) !== 0) {
		throw new exception.InvalidNotation(fen.getFEN(position, 0, 1), notation, i18n.INVALID_NON_CAPTURING_PAWN_MOVE);
	}

	// Check the content of the "to"-square
	if(position.board[to] >= 0) {
		throw new exception.InvalidNotation(fen.getFEN(position, 0, 1), notation, i18n.INVALID_NON_CAPTURING_PAWN_MOVE);
	}

	// Check the content of the "from"-square
	var expectedFromContent = bt.PAWN*2+position.turn;
	if(position.board[from] === expectedFromContent) {
		return moveGeneration.isKingSafeAfterMove(position, from, to, -1);
	}

	// Look for two-square pawn moves
	else if(position.board[from] < 0) {
		from -= offset;
		var firstSquareOfRow = (1 + position.turn*5) * 16;
		if(from >= firstSquareOfRow && from < firstSquareOfRow+8 && position.board[from] === expectedFromContent) {
			return moveGeneration.isKingSafeAfterMove(position, from, to, -1);
		}
	}

	throw new exception.InvalidNotation(fen.getFEN(position, 0, 1), notation, i18n.INVALID_NON_CAPTURING_PAWN_MOVE);
}

},{"../basetypes":19,"../exception":21,"../i18n":23,"../movedescriptor":24,"./attacks":28,"./fen":29,"./impl":30,"./legality":31,"./movegeneration":32}],34:[function(require,module,exports){
/******************************************************************************
 *                                                                            *
 *    This file is part of Kokopu, a JavaScript chess library.                *
 *    Copyright (C) 2018-2019  Yoann Le Montagner <yo35 -at- melix.net>       *
 *                                                                            *
 *    This program is free software: you can redistribute it and/or           *
 *    modify it under the terms of the GNU Lesser General Public License      *
 *    as published by the Free Software Foundation, either version 3 of       *
 *    the License, or (at your option) any later version.                     *
 *                                                                            *
 *    This program is distributed in the hope that it will be useful,         *
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of          *
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the            *
 *    GNU Lesser General Public License for more details.                     *
 *                                                                            *
 *    You should have received a copy of the GNU Lesser General               *
 *    Public License along with this program. If not, see                     *
 *    <http://www.gnu.org/licenses/>.                                         *
 *                                                                            *
 ******************************************************************************/


'use strict';


var bt = require('./basetypes');
var exception = require('./exception');


/**
 * Execute the given callback on each of the 64 squares.
 *
 * @param {function(Square)} callback
 */
exports.forEachSquare = function(callback) {
	for(var rank=0; rank<8; ++rank) {
		for(var file=0; file<8; ++file) {
			callback(bt.squareToString(rank * 16 + file));
		}
	}
};


/**
 * Return the color of a square.
 *
 * @param {Square} square
 * @returns {Color}
 */
exports.squareColor = function(square) {
	square = bt.squareFromString(square);
	if(square < 0) {
		throw new exception.IllegalArgument('squareColor()');
	}
	return Math.floor(square/16) % 2 === square % 2 ? 'b' : 'w';
};


/**
 * Return the coordinates of a square.
 *
 * @param {Square} square
 * @returns {{rank: number, file: number}} The `rank` and `file` fields have the same meaning as in {@link coordinatesToSquare}.
 */
exports.squareToCoordinates = function(square) {
	square = bt.squareFromString(square);
	if(square < 0) {
		throw new exception.IllegalArgument('squareToCoordinates()');
	}
	return { rank:Math.floor(square/16), file:square%16 };
};


/**
 * Return the square corresponding to the given coordinates.
 *
 * @param {number} file `0` for file A, `1` for file B, ..., `7` for file H.
 * @param {number} rank `0` for the first rank, ..., `7` for the eighth rank.
 * @returns {Square}
 * @throws {exception.IllegalArgument} If either `file` or `rank` is not between 0 and 7 (inclusive).
 */
exports.coordinatesToSquare = function(file, rank) {
	if(file<0 || file>=8 || rank<0 || rank>= 8) {
		throw new exception.IllegalArgument('coordinatesToSquare()');
	}
	return bt.fileToString(file) + bt.rankToString(rank);
};

},{"./basetypes":19,"./exception":21}],35:[function(require,module,exports){
var kokopu = require('kokopu');
var Chessground = require("chessground").Chessground;
var utils = require('./utils/utils.js');
var consts = require('./utils/consts.js');

var game_db = kokopu.pgnRead(pgn);
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

var a = game_db.game(0)._mainVariationInfo.first;
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
    if (progress == "") {
        window.cards = createCards();
    } else {
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
    writeInfo("");
}

cards = {}
window.setToPos = setToPos;
window.possibleMoves = possibleMoves;
window.cards = cards;

initialize(1);
//this has to be a window function to be called from the onchange on game number select
window.initialize = initialize;

},{"./utils/consts.js":36,"./utils/utils.js":38,"chessground":4,"kokopu":18}],36:[function(require,module,exports){
var utils = require('./utils.js');
var handler = require('./handler.js');

const learn_threshold = 2; // what value should a card have to give hints

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
    },
    drawable: {
        brushes: {
            variation: { key: "v", color: "#05fcc6", opacity: 1, lineWidth: 10  }
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
    getChessGroundConfig: getChessGroundConfig,
    learn_threshold: learn_threshold
}

},{"./handler.js":37,"./utils.js":38}],37:[function(require,module,exports){
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

},{}],38:[function(require,module,exports){
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
    } 
    if (call == "load") {
        document.getElementById("board_background").value = localStorage.getItem("board_background");
        document.getElementById("board_pieces").value = localStorage.getItem("board_pieces");
    } else if (call == "change") {
        localStorage.setItem("board_background", document.getElementById("board_background").value);
        localStorage.setItem("board_pieces", document.getElementById("board_pieces").value);
    }

    var b = document.getElementById("board_styles");
    b.classList = [`${localStorage.getItem("board_background")} ${localStorage.getItem("board_pieces")}`]
    initGround();
}
window.applyBoardStyle = applyBoardStyle;

},{"kokopu":18}]},{},[35]);
