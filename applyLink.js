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
  charset: 'utf8' //字符集设置
});
let item
let runId = process.env.runId
let browser

async function applyLink(row, page) {
  console.log(`UPDATE link SET ${item} = 1  WHERE id = ?`)
  await pool.query(`UPDATE link SET ${item} = 1  WHERE id = ?`, [row.id])

  await page.goto(row.url)
    .catch(async (error) => { console.log('goto error: ', error.message); isError = true })

  //抓取友情链接
  //let links = page.getByRole('link', { name: /友链$/,includeHidden: true })
  //fs.writeFileSync('body.txt', await page.locator('body').innerHTML())
  //fs.writeFileSync('body2.txt', await page.$eval('body', e => e.outerHTML))
  //fs.writeFileSync('html.txt', await page.content())
  for (let i=0;i<8;i++){
    await page.locator('body').press('PageDown')
    await page.waitForTimeout(500)
  }
  //console.log(`waitForTimeout`)
  if ((await page.locator('body').innerHTML()).indexOf(setup[item].site) === -1) {
    let nick = randomOne(setup[item].nick)
    await page.locator('input[name="nick"]')
      .or(page.locator('input[name="author"]'))
      .or(page.locator('input:has-text("昵称")'))
      .or(page.getByPlaceholder('昵称'))
      .first()
      .fill(nick)
    //console.log('nick:',nick)
    //  for (const link of await links.all()){
    //     console.log('link:',await link.evaluate (node => node.outerHTML))
    //     //console.log('link:',await link.innerHTML())
    //     //console.log(await link.evaluate (node => node.href))
    // } 
    await page.locator('input[name="mail"]')
      .or(page.locator('input[name="email"]'))
      .or(page.locator('input:has-text("电子邮件")'))
      .or(page.getByPlaceholder('邮箱'))
      .first()
      .fill(setup[item].mail)
    await page.locator('input[name="link"]')
      .or(page.locator('input[name="url"]'))
      .or(page.locator('input:has-text("网站")'))
      .or(page.getByPlaceholder('站点'))
      .first()
      .fill(setup[item].site)
    let content = setup[item].content.replace("xxxxxx", nick)
    let locators = page.locator('textarea')
    for (const locator of await locators.all()) {
      //await page.waitForTimeout(2000)
      //console.log('locator:',await locator.evaluate (node => node.outerHTML))
      await locator.type(content).catch(async (error) => { console.log('fill error'); })
    }
    await page.waitForTimeout(1000)
        //机器人
    await page.locator('label').filter({ hasText: '我不是机器人' }).locator('span')
      .or(page.locator('label').filter({ hasText: '滴，学生卡' }).locator('span'))
      .click()
      .catch(async (error)=>{})
    await page.getByRole('button', { name: '发送' })
      .or(page.getByRole('button', { name: '提交' }))
      .or(page.getByRole('button', { name: '评论' }))
      .or(page.getByRole('button', { name: 'send' }))
      .or(page.getByRole('button', { name: 'Submit' }))
      .or(page.getByRole('button', { name: 'BiuBiuBiu~' }))
      .or(page.getByRole('link', { name: '提交' }))
      .click()
      .catch(async (error) => {
        let locators = page.getByRole('button').filter({ hasNotText: /登录|预览|Search|Login/ })
        for (const locator of await locators.all()) {
          //console.log('locator:',await locator.evaluate (node => node.outerHTML))
          //console.log('textContent:',await locator.textContent())
          let str = await locator.textContent()
          if (!str) {
            try {
              str = await locator.inputValue()
            } catch (error) {
            }
          }
          if (str) {
            //console.log('locator:', await locator.evaluate(node => node.outerHTML))
            await locator.click().catch(async (error) => { console.log('click error'); })
          }
        }

      })
    await page.waitForTimeout(10000);
  } else {
    console.log('已有友链')
  }
  console.log('All done, applyLink. ✨')
}
async function launchBrowser() {
  browser = await chromium.launch({
    //headless: runId ? true : false,
    headless: false,
    args: [
      '--window-size=1920,1080',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      runId ? '' : setup.proxy.changeip,
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
  console.log(`*****************开始applyLink*******************\n`);
  if (runId){
    for (let i=0;i<5;i++){
      item = randomOne(setup.workflow)
      console.log("item:",item)
      let sql = `SELECT id,url
        FROM link 
        WHERE (${item} = 0 or ${item} IS NULL)
        ORDER BY RAND() 
        limit 2;`
      ////console.log(sql);
      let  r = await pool.query(sql)
      console.log(`共有${r[0].length}个账户要applyLink`);
      for (let row of r[0]) {
        console.log(row.id, row.url);
        if (row.url) await applyLink(row,page).catch(async (error)=>{console.log('error: ', error.message);})
      }
    }
    await pool.end()
    await page.close()
    await context.close()
    await browser.close()
  }else{
    let row = {}
    row.id = 1
    row.url = "https://blog.meta-code.top/link/"
    item = randomOne(setup.workflow)
    await applyLink(row, page).catch(async (error) => { console.log('error: ', error.message); })
  }
}
main()