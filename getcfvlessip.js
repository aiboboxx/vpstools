const fs = require("fs");
const { removeRepeatArray, sleep, cutString, getRndInteger, randomOne, randomString, md5 } = require('./common.js');
const mysql = require('mysql2/promise')
const setup = JSON.parse(fs.readFileSync('./setup.json', 'utf8'))
const pool = mysql.createPool({
    host: setup.mysql.host,
    user: setup.mysql.user,
    password: setup.mysql.password,
    port: setup.mysql.port,
    database: setup.mysql.database,
    waitForConnections: true, //连接超额是否等待
    connectionLimit: 10, //一次创建的最大连接数
    queueLimit: 0, //可以等待的连接的个数
    timezone: '+08:00',//时区配置
    charset: 'utf8' //字符集设置
});
let arr = fs.readFileSync('cfvless.txt', 'utf8').split('\n')
let nodes = [...new Set(arr)];

(async function () {
    //await dnsPromises.setServers(['8.8.8.8'])
    for (const node of nodes) {
        //let ip = cutString( node,'@',':',false)
        let ip = node.trim()
        console.log(ip)
        //await pool.query(`INSERT INTO ip_fd ( ip ) VALUES  ( "${ip}" )  ON DUPLICATE KEY UPDATE id = id`)
        await pool.query(`INSERT INTO ip ( ip ) VALUES  ( "${ip}" )  ON DUPLICATE KEY UPDATE id = id`)
         .then((r) => { console.log('添加成功:', r[0].insertId, ip); sleep(200); })
    }
    console.log('getcfvlessip.js Done')
    await pool.end()
})();






