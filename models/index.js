// Create module export for each collection
const MongoClient = require("mongodb").MongoClient;

//const url = process.env.MONGO_URL || "mongodb://localhost:27017/quackchat";
const url = process.env.MONGO_URL || "mongodb://3.229.96.152:27017/quackchat";

// Collections in MongoDB
let users;
let friends;
let messages;

// Setup and connect to MongoDB
const connect = async () => {
    try {
        const connection = await MongoClient.connect(url, {
            useUnifiedTopology: true
        });
        const db = connection.db("quackchat");
        console.log("hello?");

        users = await db.createCollection("users");
        friends = await db.createCollection("friends");
        messages = await db.createCollection("messages");

        module.exports.users = users;
        module.exports.friends = friends;
        module.exports.messages = messages;
    } catch (ex) {
        console.error(ex);
    }
};

connect();
