const express = require('express')
const session = require('express-session')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const cors = require('cors')
const dotenv = require('dotenv')
dotenv.config()

const apiRouter = require('./routes/api.js')

const app = express()

const corsOptions = {
    origin: 'http://localhost:4200',
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    credentials: true,
};


app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(cors(corsOptions))
app.use(session({ secret: "rsghqn5q41hbn3d1bn521 5b b 6d041vb d6vb4 16rv416v15e1", saveUninitialized: false, resave: false }))
app.use(express.static(path.join(__dirname, '../client')))

app.use('/api/', apiRouter)

module.exports = app
