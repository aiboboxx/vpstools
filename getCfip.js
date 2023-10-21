const fs = require("fs")
const { chromium } = require('playwright-extra')
const stealth = require('puppeteer-extra-plugin-stealth')()
chromium.use(stealth)
const { removeRepeatArray, sleep, clearBrowser, getRndInteger, randomOne, randomString,  md5 } = require('./common.js');
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
let item
let runId = process.env.runId
let browser

async function launchBrowser() {
  browser = await chromium.launch({
    //headless: runId ? true : false,
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
  const ips = fs.readFileSync('ip.txt','utf8').split('\n')
  //const ips = ["116.214.34.66"]
  //console.log(ips)
  //return
  let domains = []
  for (const ip of ips){
    await page.goto(`https://ipchaxun.com/${ip}/`)
    .catch(async (error)=>{console.log('error: ', error.message);})
    await sleep(500)
    let urls = []
    let links =   page.locator('div[id="J_domain"] a')
    //console.log('links个数：',await links.count())
    //console.log(JSON.stringify(links))
    urls = await links.evaluateAll(
      list => list.map(element => element.href.replace("https://ipchaxun.com/","").replace("/","")));
    //console.log(urls.join('\n'))
    domains.push(...urls)
  }

  fs.writeFileSync('domains.txt', removeRepeatArray(domains).join('\n'))
  console.log('Done')
  await pool.end()
  await page.close()
  await context.close()
  await browser.close()
}
main()