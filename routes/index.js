/**
 * This file contains two routes to check if the user is authenticated and
 * a route to log out (de-authenticate)
 */

const express = require("express");
const router = express.Router();

/* Check if user is authenticated (username exists in session) */
router.get("/auth", function(req, res, next) {
    // Probably authenticated
    console.log("session", req.session);
    console.log("cookie", req.session.cookie);

    console.log(req.session.username);
    if (req.session.username) {
        res.status(204).send();
        return;
    } else {
        // Not authenticated
        res.status(401).send();
        return;
    }

});

/* De-authenticate the user and log them out */
router.post("/logout", function(req, res, next) {
    req.session.username = "";  // kind of works but session wont expire correctly always
    req.session.userId = "";

    res.status(204).send()
});

module.exports = router;
