var consts = require('./consts.js')

function studyURL() {
    var url = window.location.href;
    var split = url.split("/");
    return consts.base_url + "static/pgn/" + split[split.length -1] + ".pgn"
}

async function getPGN() {
    const res = await request.get(studyURL())
    return res
}

function waitForPGN() {
    var a = getPGN()
    while (a.length < 30) {
        
    }
    return a
}

module.exports = {
    studyURL: studyURL,
    getPGN: getPGN,
    waitForPGN, waitForPGN
}


