var createError = require("http-errors");
var express = require("express");
var path = require("path");
// var cookieParser = require("cookie-parser");
var logger = require("morgan");
let session = require("express-session")
const MongoStore = require('connect-mongo')(session);
let passport = require('passport')

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");

// TODO: Add other collections
let users;
let friends;

const MongoClient = require("mongodb").MongoClient;
const ObjectID = require("mongodb").ObjectID;
//const url = process.env.MONGO_URL || "mongodb://localhost:27017/quackchat";
const url = process.env.MONGO_URL || "mongodb://3.229.96.152:27017/quackchat";

// Setup and connect to MongoDB
const startup = async () => {
    try {
        const connection = await MongoClient.connect(url, {
            useUnifiedTopology: true
        });
        const db = connection.db("quackchat");
        users = await db.createCollection("users");
        friends = await db.createCollection("friends");
    } catch (ex) {
        console.error(ex);
    }
};

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser({
//     secret: "yess"
// }));
app.use(express.static(path.join(__dirname, "public")));
// TODO: Check if authenticated
app.use(session({
    secret: "yess",
    cookie: { maxAge: 86400000 },
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ url: "mongodb://3.229.96.152:27017/quackchat" })
}))

// Passport for authentication?
app.use(passport.initialize());
app.use(passport.session());

// Add MongoDB collections to middleware and add the MongoDB collection object to the request object
app.use((req, res, next) => {
    req.usersCollection = users;

    next(); 
});


// Add place for username and userId
// app.use(function(req, res, next) {
//     req.username = "";
//     req.userId = "";

//     next();
// });

app.use("/", indexRouter);
app.use("/users", usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render("error");
});


startup()
module.exports = app;