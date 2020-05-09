const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const ObjectID = require("mongodb").ObjectID;
const models = require("../models"); // contains MongoDB collections
const fs = require("fs"); // for images
const hashObject = require("object-hash"); // for hashing objects to check if cache is up to date

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
    let user = req.body;

    // TODO verify user doesn't already exist

    let salt = await bcrypt.genSalt(10);
    let hash = await bcrypt.hash(user.password, salt);
    user.password = hash;

    user = createUserJSON(user);

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
        console.log("Let's be friends: ", "yes");

        await addFriends(username, req.session.username);

        // Update friend list cache hash of both users
        // console.log(hashData(getFriendList(req.session.username)));
        await updateHash("friendList", req.session.username);
        await updateHash("friendList", username);
    }

    res.status(201).send();
    return;
});

/* Delete the friend if the logged in user is friends with them */
router.delete("/friends/delete/:username", async function (req, res, next) {
    console.log(req.params);
    let username = req.params.username;
    console.log("username for friend delete: ", username);

    // Check if user even exists
    let userExists = await doesUserExist(username);

    console.log("User to delete exists:", userExists);

    if (!userExists) {
        res.status(404).send();
        return;
    }

    // Check if we're friends with that user
    // TODO

    // Delete friend and messages between them
    await deleteMessages(req.session.username, username)
    await deleteMessages(username, req.session.username)

    await deleteFriend(req.session.username, username);

    // Update friend hashes
    await updateHash("friendList", req.session.username, username)
    await updateHash("friendList",username, req.session.username)

    // Update message hashes
    await updateHash("messages", req.session.username, username)
    await updateHash("messages",username, req.session.username)

    res.status(200).send();
    return;
});

/* Return list of user's friends */
router.get("/friends/fetch", async function (req, res, next) {
    let friendData = await getFriendList(req.session.username);

    // let friendListHash = hashData(friendData);
    // let friendListHash = await models.users.findOne({
    //     username: req.session.username,
    // });

    // friendListHash = friendListHash.friendListHash;

    let friendListHash = await getFriendListHash(req.session.username);

    // console.log("friend hash: ", friendListHash);

    let response = {
        friendListHash: friendListHash,
        friendList: friendData,
    };

    // console.log("Response:", response);

    res.status(200).json(response).send();
    // next();
},
    async function (req, res) {
        console.log("callback test");

        // TODO: delete this code, this is a test only
        
    }
);

/* Return list of user's messages */
router.get("/messages/fetch", async function (req, res, next) {
    let messageData = await getMessages(req.session.username);

    let messagesHash = await getMessagesHash(req.session.username);

    let response = {
        messagesHash: messagesHash,
        messages: messageData,
    };

    res.status(200).json(response).send();
});


/* Send a user or list of users a message */
router.post("/message/send/", async function(req, res, next) {
    const to = req.body.friends
    const messageType = req.body.messageType;
    const message = req.body.message;

    const from = req.session.username;

    console.log("Logged in as:", req.session.username)

    console.log("sending message to:", to);
    console.log(messageType);

    // Picture and video base64 text is much too big to print
    if (messageType == "text") {
        console.log(message);
    }

    if (!to || !messageType || !message)  {
        res.status(400).send();
    }

    const dateTime = new Date().getTime();

    for (let i = 0; i < to.length; i++) {
        // Create message document
        const messageDocument = createMessageJSON(messageType, to[i], from, message, dateTime);

        // Add document to messages collection
        await models.messages.insertOne(messageDocument)

        // Picture and video base64 text is much too big to print
        if (messageType == "text") {
            console.log(messageDocument);
        }
    }

    // Update messages hash for each friend
    for (let i = 0; i < to.length; i++) {
        await updateHash("messages", to[i]);
    }

    // Update messages hash for logged in user
    await updateHash("messages", from);

    res.status(200).send();
});

/* Delete a user's messages that are from a friend */
router.delete("/messages/delete/:username", async function (req, res, next) {
    console.log(req.params);
    let friend = req.params.username;
    console.log("Deleting messages send to ", req.session.username, " from ", friend);


    // Delete messages from friend to logged in user
    await deleteMessages(friend, req.session.username);

    // Update each user's message hash
    await updateHash("messages", friend);
    await updateHash("messages", req.session.username);

    res.status(200).send();
});

/* Check if a hash matches friend list hash */
router.post("/hash/check", async function (req, res, next) {
    const username = req.session.username;
    const hash = req.body.hash;
    const hashType = req.body.hashType
    
    // No hash passed in
    if (!hash) {
        res.status(404).send();
    }

    console.log("hash in check: ", hash);

    let hashCheckRes;
    if (hashType == "friendList") {
        hashCheckRes = await hashMatch("friendList", hash, username);
    } else if (hashType == "messages") {
        hashCheckRes = await hashMatch("messages", hash, username);
    }

    let hash1 = {"hash": hash};
    let hash2 = {"hash": hashCheckRes}
    // if (hash1 == hash2) {
    //     console.log("Hash is valid, returning same hash: ", hashCheckRes);
    //     res.status(200).json(hash2).send()
    // } else {
    //     console.log("Hash is invalid, returning new hash: ", hashCheckRes);
    //     res.status(200).json(hash2).send()
    // }
    console.log("Returning current hash: ", hashCheckRes);
    res.status(200).json(hash2).send()
});

// Get a user's friend list
const getFriendList = async (username) => {
    // var friends;

    let friends = await models.friends.findOne({
        userId: username,
    });
    friends = friends.friends;

    let friendData = [];
    if (!friendData) {
        res.status(404).send();
        return;
    }

    console.log("Friends: ", friends);
    for (i = 0; i < friends.length; i++) {
        let test = await models.users.findOne({
            username: friends[i],
        });
        let username = test.username;
        let imageLarge = test.imageLarge;
        let imageSmall = test.imageSmall;
        friendData.push({ username, imageLarge, imageSmall });
    }

    return friendData;
};

// Get all messages received
const getMessages = async(username) => {

    console.log('message username', username)

    let messageArray = []

    // await models.messages.find({
    //     to: username
    // }).forEach(function(document) {
    //     let to = document.to;
    //     let from = document.from;
    //     let message = document.message;
    //     let timeSent = document.timeSent;
    //     // let id = document._id
    //     messageArray.push({to, from, message, timeSent});
    // })

    messageArray = await models.messages.find({
        to: username,

    }).project({_id:0}).toArray()

    let messages = messageArray

    // Uncomment only if you have no picture/video messages and they're massive
    // console.log(username + " has received:", messages);

    return messages;
};

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
const createUserJSON = (user) => {
    // TODO: find method of checking each of these fields are not empty/NULL and password length is right length
    return {
        username: user.username,
        email: user.email,
        password: user.password,
        friendListHash: "",
        messagesHash: "",
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

// Create message JSON object
const createMessageJSON = (type, to, from, message, timeSent) => {
    return {
        type: type,
        to: to,
        from: from,
        message: message,
        timeSent: timeSent,
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

// Delete user A from user B's friends and vice versa
const deleteFriend = async (userA, userB) => {
    await models.friends.updateOne(
        {
            userId: userA,
        },
        {
            $pull: { friends: userB}
        }
    )

    await models.friends.updateOne(
        {
            userId: userB,
        },
        {
            $pull: { friends: userA}
        }
    )
}

// Delete all messages from fromUser to toUser
const deleteMessages = async (fromUser, toUser) => {
    await models.messages.deleteMany({
        $and: [
            {
                from: fromUser,
            },
            {
                to: toUser,
            },
        ],
    });
}

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
        }
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

// Encode file (file path) to base64 encoded string
const base64Encode = (file) => {
    const bitmap = fs.readFileSync(file);

    return new Buffer(bitmap).toString("base64");
};

// Hash data using md5 and base64
const hashData = (data) => {
    // console.log("THE FUCKING DATA", data)
    return hashObject(data, { algorithm: "md5", encoding: "base64" });
};

// Update the hashes of a user
const updateHash = async(hashType, username) => {
    let newHash;
    // var newHash = hashData(await getFriendList(username));

    // console.log("new hash:", newHash);
    console.log("its me", username)

    switch(hashType) {
        case "friendList":
            newHash = hashData(await getFriendList(username));
            console.log("shouldnt be print if message sent")
            await models.users.updateOne(
                {
                    username: username,
                },
                {
                    $set: { friendListHash: newHash },
                }
            );
            break;
        case "messages":
            try {
                newHash = hashData(await getMessages(username));
                console.log("messages hash:", newHash)
                await models.users.updateOne(
                    {
                        username, username
                    },
                    {
                        $set: { messagesHash: newHash }
                    }
                )
                break;
            } catch {
                console.log("Unable to get messages")
            }
        default:
            console.log("Invalid hash type")
    }
   
    
    console.log("newNash of type " + hashType + ": " + newHash);
};

// Get the hash for a user's friend list
const getFriendListHash = async (username) => {
    let friendListHash = await models.users.findOne({
        username: username,
    });

    // TODO: use projection instead
    friendListHash = friendListHash.friendListHash;


    return friendListHash;
};

// Get the hash for a user's messages
const getMessagesHash = async (username) => {
    let messagesHash = await models.users.findOne({
        username: username,
    });

    // TODO: use projection instead
    messagesHash = messagesHash.messagesHash;


    return messagesHash;
};

// Check if two hashes match
const hashMatch = async (hashType, hash, username) => {
    if (hashType == "friendList") {
        return await hashMatchFriendList(hash, username);
    } else if (hashType == "messages") {
        return await hashMatchMessages(hash, username);
    }
};

// Check if hash matches friend list hash
const hashMatchFriendList = async (hash, username) => {
    const friendListHash = await getFriendListHash(username);
    console.log("passed in hash", hash);

    if (friendListHash == hash) {
        return await hash; // maybe breaks everything?
    } else {
        await updateHash("friendList", username);
        return await getFriendListHash(username);
    }
};

// Check if hash matches messages hash
const hashMatchMessages = async (hash, username) => {
    const messagesHash = await getMessagesHash(username);
    console.log("passed in hash", hash);

    if (messagesHash == hash) {
        return hash;
    } else {
        await updateHash("messages", username);
        return await getMessagesHash(username);
    }
};

module.exports = router;