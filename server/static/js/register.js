function validate() {
    var user = document.getElementsByName("username")[0].value;
    var pass = document.getElementsByName("password")[0].value;
    if (user.indexOf('@') > -1) {
        alert("Don't use an email as username.");
        event.preventDefault();
        return false;
    }
    if (pass.length < 6) {
        cont = confirm("Your password length seems to be under 6 characters, please confim that you want to use this possibly unsecure password.")
        if (!cont) {
            event.preventDefault();
            return false;
        }
    }
    return true;
}
