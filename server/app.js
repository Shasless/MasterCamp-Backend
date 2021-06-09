const express = require('express')
const session = require('express-session')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const dotenv = require('dotenv')
dotenv.config()

const apiRouter = require('./routes/api.js')

const app = express()

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(session({ secret: "rsghqn5q41hbn3d1bn521 5b b 6d041vb d6vb4 16rv416v15e1", saveUninitialized: false, resave: false }))
app.use(express.static(path.join(__dirname, '../client')))

app.use('/api/', apiRouter)

module.exports = app
