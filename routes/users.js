var express = require("express");
var router = express.Router();
const ObjectID = require("mongodb").ObjectID;

/* GET users listing. */
router.get("/", async function(req, res, next) {
    let allUsers;
    console.log(req);

    try {
        allUsers = await req.usersCollection.find({}).toArray();
        res.json(allUsers);
        //console.log(allUser);
    } catch (ex) {
        console.log(ex);
    }
});

/* POST new user to mongoDB */
router.post("/", function(req, res, next) {
    console.log(req.body)
    res.json({"test": "test"})
});

module.exports = router;
