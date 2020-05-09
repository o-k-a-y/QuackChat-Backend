require('dotenv').config({path:'.env'}); // load environment variables

const createError = require("http-errors");
const express = require("express");
const path = require("path");
const logger = require("morgan");
const session = require("express-session")
const MongoStore = require('connect-mongo')(session);


// Needed for large files
const bodyParser = require("body-parser")

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");

const app = express();

// const databaseURL = "mongodb://3.216.237.170:27017/quackchat";

const databaseURL = process.env.MONGO_URL || "ENTER YOUR DATABASE CONNECTION STRING";

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

// Allow up to 50mb size data to be sent to the server
app.use(bodyParser.json({limit: '50mb'}));

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser({
//     secret: "yess"
// }));
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
    secret: "yess",
    cookie: { maxAge: 86400000 }, // change to 2 hours
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ url: databaseURL})
}))

// Passport for authentication?
// app.use(passport.initialize());
// app.use(passport.session());

// Add MongoDB collections to middleware and add the MongoDB collection object to the request object
// app.use((req, res, next) => {
//     req.usersCollection = users;

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

module.exports = app;