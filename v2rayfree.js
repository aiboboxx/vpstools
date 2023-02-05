const fs = require("fs");
const { tFormat, sleep, clearBrowser, getRndInteger, randomOne, randomString, waitForString } = require('./common.js');
const dayjs = require('dayjs')
let utc = require('dayjs/plugin/utc') // dependent on utc plugin
let timezone = require('dayjs/plugin/timezone')
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault("Asia/Hong_Kong")
const mysql = require('mysql2/promise');
let setup = JSON.parse(fs.readFileSync('./setup.json', 'utf8'));
const pool = mysql.createPool({
  host: setup.mysql.host,
  user: setup.mysql.user,
  password: setup.mysql.password,
  port: setup.mysql.port,
  database: setup.mysql.database,
  waitForConnections: true, //连接超额是否等待
  connectionLimit: 10, //一次创建的最大连接数
  queueLimit: 0, //可以等待的连接的个数
  //timezone: '+08:00',//时区配置
  charset: 'utf8' //字符集设置
});

main()
async function main() {

  console.log(`*****************开始v2rayfree签到 ${Date()}*******************\n`);
  let sql = `SELECT id,usr,pwd,reset_time
             FROM freeok 
             where site = 'v2rayfree' and level = 1 and (reset_time < date_sub(now(), interval 6 hour) or reset_time IS NULL) 
             limit 1;`
  let r = await pool.query(sql, []);
  let i = 0;
  console.log(`共有${r[0].length}个账户要重置rss`);
  //console.log(JSON.stringify(r));
  for (let row of r[0]) {
    i++;
    console.log("user:", i, row.id, row.usr);
    let sql, arr;
    let rss = "https://f.kxyz.eu.org/fc.php?t="+String(dayjs().unix());
    //console.log(row.reset_time,dayjs(row.reset_time).utc(true).local().format('YYYY-MM-DD HH:mm:ss'),dayjs.tz().format('YYYY-MM-DD HH:mm:ss'))
    if ( dayjs(row.reset_time).utc(true).unix()-dayjs().startOf('day').unix() < 0 ){
        sql = 'UPDATE `freeok` SET `rss`=?, `count`=0,`reset_time`=NOW() WHERE `id`=?';

    }else{
        sql = 'UPDATE `freeok` SET `rss`=?,`reset_time`=NOW() WHERE `id`=?';
    }
    console.log(sql)
    arr = [rss, row.id];
    sql = await pool.format(sql, arr);
    //console.log(sql);
    await pool.query(sql)
      .then(async (reslut) => { console.log('changedRows', reslut[0].changedRows); await sleep(3000); })
      .catch(async (error) => { console.error('UPDATEerror: ', error.message); await sleep(3000); });
  }
  //sqlite.close();
  await pool.end();
}
