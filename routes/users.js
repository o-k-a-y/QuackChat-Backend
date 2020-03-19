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

/* POST login */
router.post("/login", async function(req, res, next) {
    console.log(req.usersCollection);
    // Get username and password fields
    let username = req.body.username;
    let password = req.body.password;

    console.log(username, password);
    console.log(req.body);

    let user;
    // Find user in DB
    try {
        user = await req.usersCollection.findOne({ username: username });
        console.log("user: " + user);

        // No user exists with that username
        if (!user) {
            res.status(404).send();
            return;
        }

        // Set session variables if correct password
        console.log(user.password);
        const match = await bcrypt.compare(password, user.password);

        if (match) {
            console.log("user exists");
            req.username = username;
            req.userId = user._id;
            res.status(200).send();
            return;
        } else {
            res.status(401).send();
            return;
        }
    } catch (ex) {
        console.log(ex);
        res.status(500).send();
        return;
    }
});

/* POST new user to mongoDB */
router.post("/", function(req, res, next) {
    console.log(req.body);
    res.json({ test: "test" });
});

router.put("/", async function(req, res, next) {
    // // Return nothing if data is invalid
    // if (!validateData(req.body)) {
    //     res.json({});
    // }

    let user = req.body;

    // TODO verify user doesn't already exist

    let salt = await bcrypt.genSalt(10);
    let hash = await bcrypt.hash(user.password, salt);
    user.password = hash;

    user = sanitizeInput(user);

    //console.log(user.username);
    //console.log(user.password);

    // Insert contact into DB
    try {
        // Check if user already exists
        let identicalUser = await req.usersCollection.findOne({
            username: { $regex: new RegExp(user.username, "i") }
        });
        console.log(identicalUser);
        console.log(user.username);

        if (identicalUser) {
            res.status(409)
                .json({ message: "User already exists" })
                .send();
            return;
        }

        await req.usersCollection.insertOne(user);
        // let inserted = await req.usersCollection.insertOne(user);
        // var newUser = inserted.ops;
        // newUser = newUser[0];
    } catch (ex) {
        // Can't connect to DB
        console.log(ex);
        res.status(500).send();
        return;
    }

    res.status(201).send();
    return;

    //res.json(newUser);
});

const sanitizeInput = user => {
    // TODO: find method of checking each of these fields are not empty/NULL and password length is right length
    return {
        username: user.username,
        email: user.email,
        password: user.password
    };
};

module.exports = router;
