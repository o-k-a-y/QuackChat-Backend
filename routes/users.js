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
    let userExists = await doesUserExist(username);

    console.log("User to add exists:", userExists);

    if (!userExists) {
        res.status(404).send();
        return;
    }

    // Can't add the same friend twice
    let alreadyAdded = await models.friends.countDocuments({
        $and: [
            {
                userId: req.session.username,
            },
            {
                friends: username,
            },
        ],
    });

    // TODO: handle 409 error in frontend
    if (alreadyAdded) {
        console.log("Already friends!: ", alreadyAdded);
        console.log(req.session.username + " " + username);
        res.status(409).send();
        return;
    }

    // If user exists in pending, we already sent request
    let alreadySentRequest = await models.friends.countDocuments({
        $and: [
            {
                userId: req.session.username,
            },
            {
                pending: username,
            },
        ],
    });

    // TODO: change return HTTP code
    if (alreadySentRequest) {
        console.log("Already sent request: ", alreadySentRequest);
        res.status(409).send();
        return;
    }

    // Send friend request
    await sendFriendRequest(req.session.username, username);

    // Add friends together
    if (await canAddFriend(req.session.username, username)) {
        console.log("Let's be friends: ", canAddFriend);

        await addFriends(username, req.session.username);
    }

    res.status(201).send();
    return;
});

/* Return list of user's friends */
router.get("/friends/get", async function(req, res, next) {
    var friends;

    await models.friends.find(
        {
            userId: req.session.username
        },
    ).forEach(function (x) {
        // console.log(x.friends)
        friends = x.friends;
    })

    let friendData = []
    for (i = 0; i < friends.length; i++) {
        let test = await models.users.findOne(
            {
                username: friends[i]
            }
        )
        let username = test.username;
        let imageLarge = test.imageLarge;
        let imageSmall = test.imageSmall
        friendData.push( {username, imageLarge, imageSmall} );
    }

    console.log(friendData);
    
    res.status(200).json(friendData).send();
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

// Add's user A to user B's received requests
// and user B to user A's pending requests
const sendFriendRequest = async (userA, userB) => {
    // Add user B to logged in user's (user A) pending
    await models.friends.updateOne(
        {
            userId: userA,
        },
        {
            $push: { pending: userB },
        }
    );

    // Add user A user to user B's received
    await models.friends.updateOne(
        {
            userId: userB,
        },
        {
            $push: { received: userA },
        }
    );
};

// Returns whether or not user A can add B or vice versa
// This is determined if user A has a received request from user B and user B has a pending request to user A
const canAddFriend = async (userA, userB) => {
    let canAdd = await models.friends.countDocuments({
        $and: [
            {
                $and: [
                    {
                        userId: userA,
                    },
                    {
                        received: userB,
                    },
                ],
                $and: [
                    {
                        userId: userB,
                    },
                    {
                        pending: userA,
                    },
                ],
            },
        ],
    });

    return canAdd;
};

// Remove userB from userA's pending
const removeFromPending = async (userA, userB) => {
    await models.friends.updateOne(
        {
            userId: userA,
        },
        {
            $pull: { pending: userB },
            
        },
    );
};

// Remove userB from userA's received
const removeFromReceived = async (userA, userB) => {
    await models.friends.updateOne(
        {
            userId: userA,
        },
        {
            $pull: { received: userB },
        }
    );
};

// Add user A and user B together
// First remove both friends from pending and received lists
const addFriends = async (userA, userB) => {
    // Remove B from A's pending and received
    await removeFromPending(userA, userB);
    // Remove A from B's pending and received
    await removeFromPending(userB, userA);

    // Remove B from A's pending and received
    await removeFromReceived(userA, userB);
    // Remove A from B's pending and received
    await removeFromReceived(userB, userA);

    // Add user B to user A's friend list
    await models.friends.updateOne(
        {
            userId: userB,
        },
        {
            $push: { friends: userA },
        }
    );

    // Add user A to user B's friend list
    await models.friends.updateOne(
        {
            userId: userA,
        },
        {
            $push: { friends: userB },
        }
    );
};

// Return cursor to list of friends
const getFriends = async(user) => {
    
}

// Encode file (file path) to base64 encoded string
const base64Encode = (file) => {
    const bitmap = fs.readFileSync(file);

    return new Buffer(bitmap).toString("base64");
};

module.exports = router;
