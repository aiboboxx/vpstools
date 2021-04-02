const fs = require("fs")
const sqlite = require('./asqlite3.js')
  
async function mainApp() {
   
 console.log(await sqlite.open('./freeok.db'))
   
 // Starting a new cycle to access the data
  

console.log("Select one user:")
   
 var sql = "SELECT  usr, pwd, id from freeok WHERE usr='eroslp@139.com'"
 r = await sqlite.get(sql)
 console.log("Read:", r.id, r.usr, r.pwd) 
   
 console.log("Get all users:")
   
 sql = "SELECT * FROM freeok"
 r = await sqlite.all(sql, [])
 r.forEach(function(row) {
 console.log("Read:", row.id, row.usr, row.pwd)
 })
   
 console.log("Get some users:")
   
 sql = "SELECT * FROM freeok WHERE usr=?"
 r = await sqlite.all(sql, ['eroslp@163.com'])
 r.forEach(function(row) {
    console.log("Read:", row.id, row.usr, row.pwd)
 })
  
  console.log("One by one:")
   
 sql = "SELECT * FROM freeok"
 r = await sqlite.each(sql, [], function(row) {
    console.log("Read:", row.id, row.usr, row.pwd)
 })
  
 if(r) console.log("Done.") 
  
 sqlite.close();
}
  
/* try {
 fs.unlinkSync("./users.db")
}
catch(e) {
} */
  
mainApp()