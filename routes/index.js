var express = require("express");
var router = express.Router();

/* GET home page. */
router.get("/", function(req, res, next) {
    res.render("index", { title: "Express" });
});

// Check if user is authenticated (username exists in session)
router.get("/auth", function(req, res, next) {
    // Probably authenticated
    console.log("session", req.session)
    console.log("cookie", req.session.cookie)

    console.log(req.session.username)
    if (req.session.username) {
        res.status(204).send()
        return
    } else {
        // Not authenticated
        res.status(401).send()
        return
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
    req.session.username = "";
    req.session.userId = "";
    req.logout(); // passport logout

    // TODO DELETE SESSION AND MAYBE ALSO COOKIE

    // TODO handle any cases where it fails?

    res.status(204).send()
});

module.exports = router;
