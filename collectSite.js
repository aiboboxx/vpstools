const fs = require("fs")
const { chromium } = require('playwright-extra')
const stealth = require('puppeteer-extra-plugin-stealth')()
chromium.use(stealth)
const { removeRepeatArray, sleep, clearBrowser, getRndInteger, randomOne, randomString, findFrames, findFrame, md5 } = require('./common.js');
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
  charset:'utf8' //字符集设置
});
let runId = process.env.runId;
let browser
async function launchBrowser() {
  browser = await chromium.launch({
    //headless: runId ? true : false,
    headless: false,
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
async function collectSite(row,page){
  await pool.query("UPDATE link SET collected = 1  WHERE id = ?", [row.id])

  //console.log('collectSite...')
  await page.goto(row.url)
  .catch(async (error)=>{console.log('error: ', error.message);isError=true})
  await page.locator('body').press('PageDown')
  await page.waitForTimeout(1000)
  await page.locator('body').press('PageDown')
  await page.waitForTimeout(1000)
  await page.locator('body').press('PageDown')
  await page.waitForTimeout(1000)

  let links = await page.$$eval('a',
  (links) => links.map((link) => link.href))
  links = links.map(item=>item.replace(/(^https?:\/\/.*?)(:\d+)?\/.*$/,'$1')) 
  links = removeRepeatArray(links)
  links = links.filter(item=>{
    return item.indexOf('http') == 0
  })
  console.log("抓取到网站：",links.length);
  for (let link of links) {
    //console.log(link);
    await pool.query("INSERT IGNORE INTO site( url ) VALUES (?)", [link])
    //if (r) console.log(r)
  }
  //await page.screenshot({ path: 'stealth.png', fullPage: true })
  console.log('All done, collectSite. ✨')
}
async function main() {
  await launchBrowser()
  const context = await browser.newContext()
  //await context.addCookies(cookies);
  const page = await context.newPage()
  page.setDefaultTimeout(15000);
  console.log(`*****************开始collectSite*******************\n`);
  let sql = `SELECT id,url
             FROM link 
             WHERE collected = 0
             order by id asc 
             limit 10;`
  //console.log(sql);
  let r = await pool.query(sql)
  console.log(`共有${r[0].length}个账户要collectSite`);
  //console.log(JSON.stringify(r));
  for (let row of r[0]) {
    console.log(row.id, row.url);
    if (row.url) await collectSite(row,page).catch(async (error)=>{console.log('error: ', error.message);})
  }
  await pool.end()
  await page.close()
  await context.close()
  await browser.close()
}
main()