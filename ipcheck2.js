const fs = require("fs")
const axios = require('axios').default;
const { chromium } = require('playwright-extra')
const stealth = require('puppeteer-extra-plugin-stealth')()
chromium.use(stealth)
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc') // dependent on utc plugin
const timezone = require('dayjs/plugin/timezone')
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault("Asia/Hong_Kong")
const { removeRepeatArray, sleep, clearBrowser, getRndInteger, randomOne, randomString, md5 } = require('./common.js');
const dns = require('dns');
const dnsPromises = dns.promises;
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
const runId = process.env.runId
const domainExcludes = ['yuanshare.org','yunshare.org','eu.org','.pp.ua','.free.hr','.tk','.cn']
const ipExcludes = ['0.0.0.0','127.0.0.1']
let browser

function isIncludeArrayElement(e,array) {
    for (let a of array)  {
        if (e.includes(a)) return true
    }   
    return false
}
async function ipFdCheck(row, page) {
    //console.log(`UPDATE ip SET update_time = now()  WHERE id = ?`)
    let data = (await axios.get(`https://ipinfo.io/${row.ip}?token=1d890b269ee157`)
    .catch(async (error)=>{
        await pool.query(`UPDATE ip_fd SET off = 3 WHERE id = ?`, [row.id]);
    })
    ).data
    console.log(data["ip"],data["timezone"])
    await pool.query(`UPDATE ip_fd SET timezone = ?  WHERE id = ?`, [data["timezone"],row.id])
    await sleep(300)
    //console.log('All done, getDomain. ✨')
  }

async function ipProCheck(row, page) {
    //console.log(`UPDATE ip SET update_time = now()  WHERE id = ?`)
    let data = (await axios.get(`https://ipinfo.io/${row.ip}?token=1d890b269ee157`)
        .catch(async (error)=>{
            //console.log(error)
            await pool.query(`UPDATE ip SET update_time = now(), off = 3 WHERE id = ?`, [row.id]);
        })
    ).data
    console.log(data["ip"],data["timezone"])
    await pool.query(`UPDATE ip SET  timezone = ? WHERE id = ?`, [data["timezone"],row.id])
    await sleep(300)
    //console.log('All done, getDomain. ✨')
  }

async function launchBrowser() {
    browser = await chromium.launch({
        headless: runId ? true : false,
        headless: true,
        args: [
            '--window-size=1920,1080',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
        ],
        defaultViewport: null,
        ignoreHTTPSErrors: true,
    })
}
async function main() {
    await launchBrowser()
    const context = await browser.newContext()
    const page = await browser.newPage()
    page.setDefaultTimeout(20000);
    //过滤google广告
    await page.route('**/*', (route, request) => {
        // Block All Images
        if (request.url().includes("googleadservices.com")) {
            route.abort();
        } else if (request.resourceType() === 'video') {
            route.abort();
        }
        else {
            route.continue()
        }
    });
    // let sql = `SELECT id,ip
    //     FROM ip_fd 
    //     WHERE  good_count_time > 0
    //     ORDER BY id asc
    //     limit 1000;`
    // //sql = `SELECT id,ip   FROM ip   ORDER BY update_time asc  limit 1;`
    // let r = await pool.query(sql)
    // console.log(`共有${r[0].length}个ip ipFdCheck`);
    // for (let row of r[0]) {
    //     console.log(row.id, row.ip);
    //     if (row.ip) await ipFdCheck(row, page).catch(async (error) => { console.log('error: ', error.message); })
    // }
    // //return
    // console.log('ipFdCheck done ✨')

    sql = `SELECT id,ip
    FROM ip
    WHERE  off = 1
    ORDER BY update_time asc
    limit 500;`
    //sql = `SELECT id,ip   FROM ip   ORDER BY update_time asc  limit 1;`
    r = await pool.query(sql)
    console.log(`共有${r[0].length}个ip ipProCheck`);
    for (let row of r[0]) {
        console.log(row.id, row.ip);
        if (row.ip) await ipProCheck(row, page).catch(async (error) => { console.log('error: ', error.message); })
    }
    //return
    console.log('ipProCheck done ✨')  

    await pool.end()
    await page.close()
    await context.close()
    await browser.close()
}
main()