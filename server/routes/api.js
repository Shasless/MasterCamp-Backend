const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const { Client } = require('pg')

const dotenv = require('dotenv')
dotenv.config()

const client = new Client({
  user: 'postgres',
  host: 'localhost',
  password: process.env.PASSWORD,
  database: process.env.DB,
})

client.connect()



/**
 * Cette router permet d'authentifier un utilisateur
 * Le body doit contenir l'email et le password de l'utilisateur
 */
router.post('/login', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  console.log(password, username)
  if (req.session.userId){
    res.status(401).json({message: "already logged in"})
  } else if(!(username && password)){
    res.status(400).json({message: "bad request - request must include username and password"});
  } else {
    let sql = "SELECT * FROM developpeur WHERE username=$1";
    let result = (await client.query({
      text: sql,
      values: [username]
    })).rows


    if(result.length === 0){

      sql = "SELECT * FROM rapporteur WHERE username=$1";
      result = (await client.query({
        text: sql,
        values: [username]
      })).rows

    }

    if (result.length === 1) {

      if (await bcrypt.compare(password, result[0].password)) {

        if(result[0].id_developpeur == null ){
          req.session.userId = result[0].id_rapporteur;
          req.session.TypeID = 1;
        }else if (result[0].id_rapporteur == null ){
          req.session.userId = result[0].id_developpeur;
          req.session.TypeID = 0;

        }
        res.status(200).json({message: "ok"})
      } else {
        res.status(400).json({message: "bad request"});
      }
    } else {
      res.status(400).json({message: "bad request "});
    }
  }
})

/**
 * Cette route retourne l'utilisateur actuellement connecté
 */
router.get('/me', async (req, res) => {
  if(req.session.userId){
    let sql;
    if(req.session.TypeID === 0){
       sql = "SELECT username, nom, prenom FROM developpeur WHERE id_developpeur=$1"
    }else{
       sql = "SELECT username, nom, prenom FROM rapporteur WHERE id_rapporteur=$1"
    }
    const result = (await client.query({
      text: sql,
      values: [req.session.userId]
    })).rows
    if(result){
      if(req.session.TypeID === 0){
        result[0].role = "developpeur"
      }else{
        esult[0].role = "rapporteur"
      }
      res.status(200).json(result[0]);
    } else {
      res.status(500).json({message: 'internal server error'});
    }
  } else {
    res.status(401).json({message: "no user logged in."});
  }
})


module.exports = router

