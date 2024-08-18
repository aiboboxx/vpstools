const fs = require("fs");
const axios = require('axios').default;
const { removeRepeatArray, sleep, clearBrowser, getRndInteger, randomOne, getRndElements, md5 } = require('./common.js');
const sethost_url = "https://sh.bzshare.com"
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
    let tags = [];
    for (let zone of zones){
        //console.log(zone)
        for (let i=5; i<11; i++){
            tags.push(zone + i.toString().padStart(2,0))
        } 
    }
    tags = getRndElements (tags,tags.length) //随机排序
    let sql = `SELECT ip
        FROM ip_fd
        WHERE (good_count > 20 and off = 1 and good_count_time > date_sub(now(), interval 10 HOUR)) or stick = 1
        ORDER BY good_count desc
        limit 54;`

    let r = await pool.query(sql)
    console.log(`共有${r[0].length}个 ip`);
    if ( r[0].length > 10 ) {
            //return
        for (let i=0; i<tags.length; i++) {
            let index = i%r[0].length
            //console.log(index)
            await axios.get(`${sethost_url}/sethost.php?host=${r[0][index].ip}&tags=${tags[i]}&token=dzakYE8TAga7`)
            .then( (response) => {
                console.log(index,`${sethost_url}/sethost.php?host=${r[0][index].ip}&tags=${tags[i]}&token=dzakYE8TAga7`,response.data)
            }).catch( (error) => console.log(error))
        }
    }
    await pool.end()  
    console.log('All done ✨')
})()
