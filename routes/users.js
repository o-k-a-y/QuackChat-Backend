var express = require("express");
var router = express.Router();
var bcrypt = require("bcrypt");
const ObjectID = require("mongodb").ObjectID;

/* GET users listing. */
router.get("/", async function(req, res, next) {
    let allUsers;
    //console.log(req);

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


router.put("/", async function(req, res, next) {
    // // Return nothing if data is invalid
    // if (!validateData(req.body)) {
    //     res.json({});
    // }
    
    let user = req.body;

    // TODO Make new object and pull out only needed fields

    let salt = await bcrypt.genSalt(10);
    let hash = await bcrypt.hash(user.password, salt);
    user.password = hash;

    user = sanitizeInput(user);

    //console.log(user.username);
    //console.log(user.password);
    
    // Insert contact into DB
    try {
        let inserted = await req.usersCollection.insertOne(user);
        var newUser = inserted.ops;
        newUser = newUser[0];
    } catch (ex) {
        console.log(ex);
    }

    res.json(newUser);
})

const sanitizeInput = (user) => {
    return {username: user.username, email: user.email, user: user.password};
}


// TODO
const formatData = (data) => {
    let JSONData;

}


module.exports = router;
