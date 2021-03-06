/**
 * This file sets up the server to connect to the MongoDB server using environment variables
 * It puts the necessary collections of the database into an export so we can use them in other files.
 */
require('dotenv').config({path:'.env'}); // load environment variables

// Create module export for each collection
const MongoClient = require("mongodb").MongoClient;

//const url = process.env.MONGO_URL || "mongodb://localhost:27017/quackchat";
const databaseURL = process.env.MONGO_URL || "ENTER YOUR DATABASE CONNECTION STRING";

// Collections in MongoDB
let users;
let friends;
let messages;

// Setup and connect to MongoDB
const connect = async () => {
    try {
        const connection = await MongoClient.connect(databaseURL, {
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
