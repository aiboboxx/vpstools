const mysql = require('mysql2/promise');
const runId = github.context.runId;
let setup = {};
if (!runId) {
  setup  = JSON.parse(fs.readFileSync('./setup.json', 'utf8'));
}else{
  setup  = JSON.parse(process.env.SETUP);
}
const pool = mysql.createPool({
  host: setup.mysql.host,
  user: setup.mysql.user,
  password : setup.mysql.password,   
  port: setup.mysql.port,  
  database: setup.mysql.database,
  waitForConnections: true, //连接超额是否等待
  connectionLimit: 10, //一次创建的最大连接数
  queueLimit: 0 //可以等待的连接的个数
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
