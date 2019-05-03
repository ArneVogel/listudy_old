function toggleDarkMode() {
    var mode = localStorage.getItem("darkmode");
    if (mode == "white") {
        localStorage.setItem("darkmode", "dark")
    } else {
        localStorage.setItem("darkmode", "white")
    }
    applyMode();
}

//reads the localstorage and applies the mode
function applyMode() {
    //for the first load set the default value
    var mode = localStorage.getItem("darkmode");
    if (mode != "white" && mode != "dark") {
        localStorage.setItem("darkmode", "white")
    }

    var changeToBackground;
    var changeToColor;
    if (localStorage.getItem("darkmode") == "dark") {
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
        document.getElementById("training_mode").style.background = changeToBackground;
    }
}

window.onload = applyMode;
