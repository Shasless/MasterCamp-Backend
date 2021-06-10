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
        result[0].role = "rapporteur"
      }
      res.status(200).json(result[0]);
    } else {
      res.status(500).json({message: 'internal server error'});
    }
  } else {
    res.status(401).json({message: "no user logged in."});
  }
})

/**
 * Cette route déconnecte l'utilisateur
 */
router.post('/disconnect', (req, res) => {
  if (req.session.userId) {
    req.session.destroy();
    res.status(200).json({message: `user disconnected`});
  } else {
    res.status(400).json({message: 'bad request - no user logged in.'})
  }
})
/**
 * Cette route permet la creation d'un ticket
 */
router.post('/ticket',async (req, res) => {
  if (req.session.TypeID === 1) {

    const idclient = req.body.idclient;
    const idprojet = req.body.idprojet;
    const description = req.body.des;
    const status = req.body.statu;
    let date = Date.now();
    if(idprojet== null || idclient == null || description == null || status == null ){
      res.status(400).json({message: 'bad request - Missing properties'})
      return;
    }

    const sql = "INSERT INTO ticket (Id_rapporteur, Id_client, Id_projet, Description, Statut, Date) VALUES ($1, $2, $3, $4, $5, to_timestamp($6))"
    try {
      await client.query({
        text: sql,
        values: [req.session.userId, idclient, idprojet, description, status, date/1000.0]
      });
      res.status(200).json({message: "ok"})
    } catch (e) {
      console.log(e)
      res.status(400).json({message: "bad request"});
    }
  } else if(req.session.TypeID === 0){
    res.status(400).json({message: 'bad request - Dev cant create ticket.'})
  }
  else{
    res.status(400).json({message: 'bad request - You must be login'})

  }
})

/**
 * Cette route permet de recuperer les tickets
 */
router.get('/allticket',async (req, res) => {
  if (req.session.userId) {


    const sql = "SELECT * FROM ticket ORDER BY id_ticket ASC"
    const result = (await client.query({
      text: sql,
    })).rows

    res.status(200).json(result);

  } else {
    res.status(400).json({message: 'bad request - no user logged in.'})
  }
})

/**
 * Cette route permet de modifier  les tickets
 */
router.post('/ticketmodif',async (req, res) => {
  if (req.session.TypeID === 0) {

    const idticket = req.body.idticket;
    const description = req.body.des;
    const status = req.body.statu;
    if(idticket== null || description == null|| status == null ){
      res.status(400).json({message: 'bad request - Missing properties'})
      return;
    }
    const sql2 = "SELECT * FROM ticket WHERE ID_developpeur =$1 AND id_ticket=$2"
    const result = (await client.query({
      text: sql2,
      values: [req.session.userId,idticket ]
    })).rows
    if(result){
    const sql = "UPDATE ticket SET description = $1, statut = $2  WHERE id_ticket = $3 "
    try {
      await client.query({
        text: sql,
        values: [description,status ,idticket]
      });
      res.status(200).json({message: "ok"})
    } catch (e) {
      console.log(e)
      res.status(400).json({message: "bad request"});
    }}else{
      res.status(400).json({message: 'bad request - Dev must have the property of the ticket'})

    }

  } else if(req.session.TypeID === 1){
    res.status(400).json({message: 'bad request - reporteur cant update ticket.'})
  }
  else{
    res.status(400).json({message: 'bad request - You must be login'})

  }
})


/**
 * Cette route permet d'assigner un dev au ticket
 */
router.post('/asigndev',async (req, res) => {
  if (req.session.TypeID === 1) {
    const iddev = req.body.iddev;
    const idticket = req.body.idticket;
    if (idticket == null || iddev == null) {
      res.status(400).json({message: 'bad request - Missing properties'})
      return;
    }

    const sql = "UPDATE ticket SET ID_developpeur =$1 WHERE id_ticket=$2"
    try {
      await client.query({
        text: sql,
        values: [iddev, idticket]
      });
      res.status(200).json({message: "ok"})
    } catch (e) {
      console.log(e)
      res.status(400).json({message: "bad request"});
    }

  } else if(req.session.TypeID === 0){
    const idticket = req.body.idticket;
    if(idticket== null  ){
      res.status(400).json({message: 'bad request - Missing properties'})
      return;

    }
    const sql = "UPDATE ticket SET ID_developpeur =$1 WHERE id_ticket=$2 "
    try {
      await client.query({
        text: sql,
        values: [req.session.userId, idticket]
      });
      res.status(200).json({message: "ok"})
    } catch (e) {
      console.log(e)
      res.status(400).json({message: "bad request"});
    }
  }
  else{
    res.status(400).json({message: 'bad request - You must be login'})
  }
})


/**
 * Cette route permet de recuperer les tickets sans dev asigné
 */
router.get('/ticketwithoutdev',async (req, res) => {
  if (req.session.userId) {

    const sql = "SELECT * FROM ticket  WHERE ID_developpeur IS NULL  ORDER BY id_ticket ASC"
    const result = (await client.query({
      text: sql,
    })).rows

    res.status(200).json(result);

  } else {
    res.status(400).json({message: 'bad request - no user logged in.'})
  }
})



/**
 * Cette route permet de recuperer les tickets avec un dev donné
 */
router.get('/ticketdev',async (req, res) => {
  if (req.session.userId) {
    const iddev = req.body.iddev;
    if(iddev == null){
      res.status(400).json({message: 'bad request - Missing properties'})
      return;
    }
    const sql = "SELECT * FROM ticket  WHERE ID_developpeur = $1  ORDER BY id_ticket ASC"
    const result = (await client.query({
      text: sql,
      values: [iddev]
    })).rows

    res.status(200).json(result);

  } else {
    res.status(400).json({message: 'bad request - no user logged in.'})
  }
})

/**
 * Cette route permet de recuperer les tickets avec un rapporteur donné
 */
router.get('/ticketrappor',async (req, res) => {
  if (req.session.userId) {
    const idrappor = req.body.idrappor;
    if(idrappor == null){
      res.status(400).json({message: 'bad request - Missing properties'})
      return;
    }
    const sql = "SELECT * FROM ticket  WHERE ID_rapporteur = $1  ORDER BY id_ticket ASC"
    const result = (await client.query({
      text: sql,
      values: [idrappor]
    })).rows
    res.status(200).json(result);
  } else {
    res.status(400).json({message: 'bad request - no user logged in.'})
  }
})

/**
 * Cette route permet de recuperer un ticket donné
 */
router.get('/ticketunique',async (req, res) => {
  if (req.session.userId) {
    const idticket = req.body.idticket;
    if(idticket == null){
      res.status(400).json({message: 'bad request - Missing properties'})
      return;
    }
    const sql = "SELECT * FROM ticket  WHERE id_ticket = $1  ORDER BY id_ticket ASC"
    const result = (await client.query({
      text: sql,
      values: [idticket]
    })).rows
    res.status(200).json(result);
  } else {
    res.status(400).json({message: 'bad request - no user logged in.'})
  }
})

module.exports = router

