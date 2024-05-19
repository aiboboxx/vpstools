const fs = require("fs");
const axios = require('axios').default;
const { removeRepeatArray, sleep, clearBrowser, getRndInteger, randomOne, getRndElements, md5 } = require('./common.js');
const sethost_url = "http://sh.bzshare.com/"
//"$sethost_url/sethost.php?host=$domain&tags=$tag$num&token=dzakYE8TAga7")
const mysql = require('mysql2/promise')
const setup = JSON.parse(fs.readFileSync('./setup.json', 'utf8'))
const pool = mysql.createPool({
    host: setup.mysql.host,
    user: setup.mysql.user,
    password: setup.mysql.password,
    port: setup.mysql.port,
    database: setup.mysql.database,
    waitForConnections: true,  //连接超额是否等待
    connectionLimit: 10,  //一次创建的最大连接数
    queueLimit: 0,       //可以等待的连接的个数
    timezone: '+08:00',  //时区配置
    charset: 'utf8'      //字符集设置
});
const zones = ['jp','hk','sg','vn','us','ust','gb','de','tr'];
(async () => {
    let tags = []
    for (let zone of zones){
        //console.log(zone)
        for (let i=1; i<6; i++){
            tags.push(zone + i.toString().padStart(2,0))
        } 
    }
    tags = getRndElements (tags,tags.length) //随机排序
    //console.log(tags)
    let sql = `SELECT id,domain
        FROM domain
        WHERE ips = 3 and off = 0
        ORDER BY id asc
        limit 20;`

    let r = await pool.query(sql)
    console.log(`共有${r[0].length}个domain`);
    //return
    for (let i=0; i<tags.length; i++) {
        let index = i%r[0].length
        //console.log(index)
        await axios.get(`${sethost_url}/sethost.php?host=${r[0][index].domain}&tags=${tags[i]}&token=dzakYE8TAga7`)
        .then( (response) => {
            console.log(index,`${sethost_url}/sethost.php?host=${r[0][index].domain}&tags=${tags[i]}&token=dzakYE8TAga7`,response.data)
        }).catch( (error) => console.log(error))
    }

    tags = []
    for (let zone of zones){
        //console.log(zone)
        for (let i=5; i<7; i++){
            tags.push(zone + i.toString().padStart(2,0))
        } 
    }
    tags = getRndElements (tags,tags.length) //随机排序
    sql = `SELECT id,domain
        FROM domain
        WHERE ips = 2
        ORDER BY id asc
        limit 18;`

    r = await pool.query(sql)
    console.log(`共有${r[0].length}个domain`);
    //return
    for (let i=0; i<tags.length; i++) {
        let index = i%r[0].length
        //console.log(index)
        await axios.get(`${sethost_url}/sethost.php?host=${r[0][index].domain}&tags=${tags[i]}&token=dzakYE8TAga7`)
        .then( (response) => {
            console.log(index,`${sethost_url}/sethost.php?host=${r[0][index].domain}&tags=${tags[i]}&token=dzakYE8TAga7`,response.data)
        }).catch( (error) => console.log(error))
    }   
    await pool.end()  
    console.log('All done ✨')
})()