function validate() {
    var user = document.getElementsByName("username")[0].value;
    if (user.indexOf('@') > -1) {
        alert("Don't use an email as username.");
        event.preventDefault();
        return false;
    }
    return true;
}
