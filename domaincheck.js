const fs = require("fs")
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
const domainExcludes = ['yuanshare.org','yunshare.org','eu.org','.pp.ua','.free.hr','.tk','.cn','.cc']
const ipExcludes = ['0.0.0.0','127.0.0.1']
let browser

function isIncludeArrayElement(e,array) {
    for (let a of array)  {
        if (e.includes(a)) return true
    }   
    return false
}

async function getIp(row, page) {
    if ( isIncludeArrayElement( row.domain.trim(),domainExcludes ) ) {
        console.log('domainExcludes:',row.domain.trim())
        await pool.query(`UPDATE domain SET off = 2 WHERE id = ${row.id}`)
    }else{
        await dnsPromises.resolve(row.domain.trim(), 'A')
        .then(async (result) => {
            console.log(result);
            if ( [2,3].includes(result.length) ){  //ip个数为2或3
                if ( !isIncludeArrayElement( result,ipExcludes ) ) {
                    for (let i = 0; i < result.length; i++) {
                        //await pool.query(`INSERT INTO ip ( ip ) VALUES  ( "${result[i]}" )  ON DUPLICATE KEY UPDATE id = id`)
                        await pool.query(`INSERT IGNORE INTO ip ( ip ) VALUES  ( "${result[i]}" )`)
                        .then((r) => { console.log('添加成功:', r[0].insertId, result[i]); sleep(200); })
                    }
                    await pool.query(`UPDATE domain SET ips = ?, ip_count = ?, update_time = now(), off = 1  WHERE id = ?`, [JSON.stringify(result, null, '\t'),result.length,row.id])
                }else{
                    await pool.query(`UPDATE domain SET ips = ?, ip_count = ?, update_time = now(), off = 2  WHERE id = ?`, [JSON.stringify(result, null, '\t'),result.length,row.id])
                }
            }else{
                await pool.query(`UPDATE domain SET ips = ?, ip_count = ?, update_time = now(), off = 2  WHERE id = ?`, [JSON.stringify(result, null, '\t'),result.length,row.id])
            }
        })
        .catch(async (error) => {
                await pool.query(`UPDATE domain SET ips = ?, ip_count = 0, update_time = now(), off = 3  WHERE id = ?`, ["",row.id])
                console.log('error: ', error.message); 
            })
        await sleep(300)
    }
    //console.log('All done, getIp. ✨')
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
    let sql = `SELECT id,domain
        FROM domain 
        WHERE good_count_time > date_sub(now(), interval 7 day) and off = 1 and update_time < date_sub(now(), interval 7 day) and ip_count = 3
        ORDER BY update_time asc
        limit 200;`
    //sql = `SELECT id,domain   FROM domain  WHERE (update_time < date_sub(now(), interval 7 day) or update_time is null) and off < 2 ORDER BY update_time asc  limit 1;`
    let r = await pool.query(sql)
    console.log(`共有${r[0].length}个domain`);
    for (let row of r[0]) {
        console.log(row.id, row.domain);
        if (row.domain) await getIp(row, page).catch(async (error) => { console.log('error: ', error.message); })
    }
    //return
    console.log('All done ✨')
    await pool.end()
    await page.close()
    await context.close()
    await browser.close()
}
main()