var express = require("express");
var router = express.Router();
var bcrypt = require("bcrypt");
const ObjectID = require("mongodb").ObjectID;
const models = require("../models"); // contains MongoDB collections
const fs = require("fs"); // for images

/* GET users listing. */
router.get("/", async function (req, res, next) {
    let allUsers;
    //console.log(req);

    try {
        allUsers = await models.users.find({}).toArray();
        res.json(allUsers);
        //console.log(allUser);
    } catch (ex) {
        console.log(ex);
    }
});

/* Get information about the current logged in user */
// TODO: Delete this as it's not needed
router.get("/me", function (req, res, next) {
    console.log("meeee");
    if (req.session.username) {
        res.json({ username: req.session.username }).status(200).send();
    } else {
        console.log(req.session.username);
        res.status(404).send();
    }
});

/* Authenticates user when login is successful */
router.post("/login", async function (req, res, next) {
    // console.log(req.usersCollection);
    // Get username and password fields
    console.log(models);
    let username = req.body.username;
    let password = req.body.password;

    console.log(username, password);
    console.log(req.body);

    console.log("session", req.session);
    console.log("cookie", req.session.cookie);

    let user;
    // Find user in DB
    try {
        user = await models.users.findOne({ username: username });
        console.log("nope");
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

            req.session.username = username;
            req.session.userId = user._id;
            console.log("new session made with user: ", req.session.username);

            // req.session.save() // ????

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

/* Create new user account */
router.put("/", async function (req, res, next) {
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
        let identicalUser = await doesUserExist(user.username);
        console.log("identical user?", identicalUser);
        console.log(user.username);

        if (identicalUser) {
            res.status(409).json({ message: "User already exists" }).send();
            return;
        }

        await models.users.insertOne(user);

        // Create friend document associated with the user document just created
        let friendDocument = createFriendJSON(user.username);
        await models.friends.insertOne(friendDocument);

        // Add random duck image to user images

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

/* Send a friend request to user if exists */
router.post("/friends/add/:username", async function (req, res, next) {
    console.log(req.params);
    let username = req.params.username;
    console.log("username for friend add: ", username);

    // Check if user already exists
    const regex = new RegExp(`^${username}$`);
    let userExists = await doesUserExist(username);

    console.log("User to add exists:", userExists);

    if (!userExists) {
        res.status(404).send();
        return;
    }
    // Add array of friendIDs to user document
    //      $push to the field "friends"
    //      collectionName.update_one() ?

    // check if you're already friends
    // check if friend is in received
    // check if it's in pending

    // If user exists in pending, we already sent request
    // await models.friends.updateOne({
    //     $and: [
    //         {
    //             userId: req.session.username,
    //         },
    //         {
    //             pending: {$in: [username]},
    //         }
    //     ],},
    //     {$push: { pending: "already added" }},
    // );


    let alreadyAdded = await models.friends.countDocuments({
        $and: [
            {
                userId: req.session.username,
            },
            {
                pending: {$in: [username]},
            }
        ],}

    );

    console.log("Already added: ", alreadyAdded);


    //
    // models.friends.updateOne(
    //     {
    //         userId: req.session.username,
    //     },
    //     {
    //         $push: { pending: username },
    //     }
    // );

    // Create/add to a friend document containing:
    //      1. userID (id from user document or just username)
    //      2. list of friends
    //      3. list of pending friends
    //      4. list of received friend requests
    // Basically make a json object with this information and then insertOne into the friends collection

    //     res.status(201).send();
    //     return;
    // }

    res.status(201).send();
    return;
});

// Check if user exists in DB
const doesUserExist = async (username) => {
    // Check if user already exists
    const regex = new RegExp(`^${username}$`);
    let userExists = await models.users.findOne({
        username: { $regex: regex, $options: "i" },
    });

    return userExists ? true : false;
};

// Creates user JSON object
const sanitizeInput = (user) => {
    // TODO: find method of checking each of these fields are not empty/NULL and password length is right length
    return {
        username: user.username,
        email: user.email,
        password: user.password,
        imageSmall: base64Encode("/home/ubuntu/defaultIcons/duck.png"),
        imageLarge: base64Encode("/home/ubuntu/defaultIcons/duck.png"),
    };
};

// Create friend JSON object
const createFriendJSON = (username) => {
    return {
        userId: username,
        friends: [],
        pending: [],
        received: [],
    };
};

// Encode file (file path) to base64 encoded string
const base64Encode = (file) => {
    const bitmap = fs.readFileSync(file);

    return new Buffer(bitmap).toString("base64");
};

module.exports = router;
