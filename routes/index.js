const express = require("express");
const router = express.Router();

// Check if user is authenticated (username exists in session)
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
    // if (req.isAuthenticated()) {
    //     res.status(204).send()
    //     return
    // } else {
    //     // Not authenticated
    //     res.status(401).send()
    //     return
    // }
});

router.post("/logout", function(req, res, next) {
    req.session.username = "";  // kind of works but session wont expire correctly always
    req.session.userId = "";
    // req.session = null; // did nothing
    // req.session.destroy(function(err) {
    //     if (err) {
    //         console.log("Error destroying session: ", err) // didn't work at all
    //     }
    // })

    // req.session.cookie.expires = false;

    // req.session.cookie.expires = new Date().getTime();
    // req.session.destroy(function(err) {
    //     console.log("big err", err)
    // });

    // req.session = null
    // req.session.destroy(function(err) {
    //     console.log("big err", err)
    // });
    // res.redirect("/login")
    // req.session.cookie.expires = new Date().getTime();
    // req.logout(); // passport logout

    // TODO DELETE SESSION AND MAYBE ALSO COOKIE

    // TODO handle any cases where it fails?


    res.status(204).send()
});

module.exports = router;
