const fs = require("fs")
const sqlite = require('./asqlite3.js')
  
async function mainApp() {
   
 console.log(await sqlite.open('./users.db'))
   
 // Adds a table
   
 var r = await sqlite.run('CREATE TABLE users(ID integer NOT NULL PRIMARY KEY, name text, city text)')
 if(r) console.log("Table created")
  
 // Fills the table
   
 let users = {
  "Naomi": "chicago",
  "Julia": "Frisco",
  "Amy": "New York",
  "Scarlett": "Austin",
  "Amy": "Seattle"
 }
   
 var id = 1
 for(var x in users) {
  var entry = `'${id}','${x}','${users[x]}'`
  //var sql = "INSERT INTO users(ID, name, city) VALUES (" + entry + ")"
 // r = await sqlite.run(sql)
 r = await sqlite.run("INSERT INTO users(ID, name, city) VALUES (?,?,?)" ,[id,x,users[x]])
  if(r) console.log(r)
  id++ 
 }
  
 // Starting a new cycle to access the data
  
 await sqlite.close();
 await sqlite.open('./users.db')
  
 console.log("Select one user:")
   
 var sql = "SELECT ID, name, city FROM users WHERE name='Naomi'"
 r = await sqlite.get(sql)
 console.log("Read:", r.ID, r.name, r.city)
   
 console.log("Get all users:")
   
 sql = "SELECT * FROM users"
 r = await sqlite.all(sql, [])
 r.forEach(function(row) {
  console.log("Read:", row.ID, row.name, row.city)
 })
   
 console.log("Get some users:")
   
 sql = "SELECT * FROM users WHERE name=?"
 r = await sqlite.all(sql, ['Amy'])
 r.forEach(function(row) {
  console.log("Read:", row.ID, row.name, row.city)
 })
  
 console.log("One by one:")
   
 sql = "SELECT * FROM users"
 r = await sqlite.each(sql, [], function(row) {
  console.log("Read:", row.ID, row.name, row.city)
 })
  
 if(r) console.log("Done.")
  
 sqlite.close();
}
  
try {
 fs.unlinkSync("./users.db")
}
catch(e) {
}
  
mainApp()