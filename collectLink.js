const fs = require("fs")
const { chromium } = require('playwright-extra')
const stealth = require('puppeteer-extra-plugin-stealth')()
chromium.use(stealth)
const { removeRepeatArray, sleep, clearBrowser, getRndInteger, randomOne, randomString, findFrames, findFrame, md5 } = require('./common.js');
const mysql = require('mysql2/promise')
const setup = JSON.parse(fs.readFileSync('./setup.json', 'utf8'));
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
    headless: runId ? true : false,
    //headless: true,
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
async function collectLink(row,page){
  await pool.query("UPDATE site SET collected = 1  WHERE id = ?", [row.id])
  let isError = false
  await page.goto(row.url)
  .catch(async (error)=>{console.log('goto error: ', error.message);isError=true})
  //if (isError) return Promise.reject(new Error('出错返回。'))
  //抓取友情链接
  let links = page.getByRole('link', { name: '友情链接',includeHidden: true })
    .or(page.getByRole('link', { name: /友链$/,includeHidden: true }))
    .or(page.getByRole('link', { name: '友人帐',includeHidden: true }))
    .or(page.getByRole('link', { name: 'freinds',includeHidden: true }))
  //console.log('links个数：',await links.count())
  //console.log(JSON.stringify(links))
  for (const link of await links.all()){
    let href = await link.evaluate (node => node.href)
    //console.log('link:',await link.innerHTML())
    if (href.indexOf('http') === 0) {
      console.log('友情链接:',href)
      await pool.query("INSERT IGNORE INTO link( url ) VALUES (?)", [href])
      break
    }
  } 

  //抓取留言板链接
  links =  page.getByRole('link', { name: '留言',includeHidden: true })
  for (const link of await links.all()){
    let href = await link.evaluate (node => node.href)
    //console.log('link:',await link.innerHTML())
    if (href.indexOf('http') === 0) {
      console.log('留言板:',href)
      await pool.query("INSERT IGNORE INTO comment( url ) VALUES (?)", [href])
      break
    }
  } 
  console.log('All done, collectLink. ✨')
}
async function main() {
  await launchBrowser()
  const context = await browser.newContext()
  const page = await browser.newPage()
  page.setDefaultTimeout(20000);
console.log(`*****************开始collectLink*******************\n`);  
  sql = `SELECT id,url
             FROM site 
             WHERE collected = 0
             order by id asc 
             limit 50;`
  //console.log(sql);
    let  r = await pool.query(sql)
    console.log(`共有${r[0].length}个账户要collectLind`);
    for (let row of r[0]) {
      console.log(row.id, row.url);
      if (row.url) await collectLink(row,page).catch(async (error)=>{console.log('error: ', error.message);})
    }
  // let row ={}
  // row.id = 1
  // row.url = "https://www.hin.cool/" 
  // await collectLink(row,page) 

  await page.close()
  await pool.end()
  await context.close()
  await browser.close()
}
main()