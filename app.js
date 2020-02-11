require('dotenv').config();

const express = require('express');
const app = express();
const path = require('path');
//const ngrok = require('ngrok');
const user = process.env.USER;
const password = process.env.PASSWORD;

app.get('/', (req, res) => {
    res.send('This is the test tunnel created by Ngrok with Http Auth');
});

const server = app.listen(process.env.PORT, () => {
    console.log('Express listening at ', server.address().port);
})

