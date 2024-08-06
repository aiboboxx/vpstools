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
async function getDomain(row, page) {
    //console.log(`UPDATE ip SET update_time = now()  WHERE id = ?`)
    await pool.query(`UPDATE ip SET update_time = now()  WHERE id = ?`, [row.id])
    await page.goto(`https://www.qvdv.net/tools/qvdv-gethost.html?ip=${row.ip}`)
        .catch(async (error) => { console.log('error: ', error.message); })
    await sleep(500)
    let links = page.locator('p#gethost_out > .layui-table td:nth-of-type(1)')
    //console.log('links个数：',await links.count())
    //console.log(JSON.stringify(links))
    await links.evaluateAll(
        list => list.map(element => element.innerHTML))
        .then(async (result) => {
            console.log('取得域名：', result)
            //console.log(Math.min(6,result.length))
            for ( let i = 0; i < Math.min( 8,result.length ); i++) {
                if ( !isIncludeArrayElement( result[i],domainExcludes ) ) await pool.query(`INSERT INTO domain ( domain ) VALUES  ( "${result[i]}" )  ON DUPLICATE KEY UPDATE id = id`)
                .then((r) => { console.log('添加成功:', r[0].insertId, result[i]); sleep(200); })
            }
        })
        //.catch(async (error) => { console.log('error: ', error.message); })
    await sleep(1000)
    console.log('All done, getDomain. ✨')
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
    let sql = `SELECT id,ip
        FROM ip 
        WHERE update_time is null and off = 1
        ORDER BY update_time asc
        limit 20;`
    //sql = `SELECT id,ip   FROM ip   ORDER BY update_time asc  limit 1;`
    let r = await pool.query(sql)
    console.log(`共有${r[0].length}个ip`);
    for (let row of r[0]) {
        console.log(row.id, row.ip);
        if (row.ip) await getDomain(row, page).catch(async (error) => { console.log('error: ', error.message); })
    }
    //return
    console.log('All done ✨')
    await pool.end()
    await page.close()
    await context.close()
    await browser.close()
}
main()