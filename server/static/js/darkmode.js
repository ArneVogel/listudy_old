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
        document.body.className = "dark-scheme"
    } else {
        document.getElementById("darkmode").innerHTML = "Dark Mode"
        document.body.className = "light-scheme"
    }
}

window.onload = applyMode;
