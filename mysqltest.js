const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: '192.168.1.100',
  user: 'aiboboxx',
  password : 'LaI9DCyNBpEKWe9pn5B',   
  port: '33060',  
  database: 'mydb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
async function example1 () {
    var  sql = 'SELECT * FROM freeok where usr = ?'; 
    const result = await pool.query(sql,["eroslp@139.com"]);
    console.log('--------------------------SELECT----------------------------');
    //console.log(JSON.stringify(result));
    console.log(JSON.stringify(result[0]));
    console.log('------------------------------------------------------------\n\n');  
    console.log(result[0][0].rss);
    await pool.end();
  }
example1();
