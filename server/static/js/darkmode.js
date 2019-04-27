function toggleDarkMode() {
    if (readCookieValue("darkmode") == "white") {
        document.cookie = 'darkmode=dark; expires=Fri, 31 Dec 9999 23:59:59 GMT';   
    } else {
        document.cookie = 'darkmode=white; expires=Fri, 31 Dec 9999 23:59:59 GMT';   
    }
    applyMode();
}

function readCookieValue(cookieName) {
    cookiesSplit = document.cookie.split(';');
    for (var j of cookiesSplit) {
        if (j.trim().startsWith(cookieName)) {
            return j.split('=')[1];
        }
    }
}

//reads the cookie and applies the mode
function applyMode() {
    var changeToBackground;
    var changeToColor;
    if (readCookieValue("darkmode") == "dark") {
        document.getElementById("darkmode").innerHTML = "Light Mode"

        changeToColor = "#929292";
        changeToBackground = "#181818";
    } else {
        document.getElementById("darkmode").innerHTML = "Dark Mode"

        changeToColor = "#222";
        changeToBackground = "white";

    }
    document.body.style.background = changeToBackground;
    document.body.style.color = changeToColor;
    if (document.getElementById("game_number") != undefined) {
        document.getElementById("game_number").style.background = changeToBackground;
    }
}

window.onload = applyMode;
