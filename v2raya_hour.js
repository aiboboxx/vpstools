const fs = require("fs");
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { tFormat, sleep, clearBrowser, getRndInteger, randomOne, randomString, waitForString } = require('./common.js');
const dayjs = require('dayjs')
let utc = require('dayjs/plugin/utc') // dependent on utc plugin
let timezone = require('dayjs/plugin/timezone')
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault("Asia/Hong_Kong")
const mysql = require('mysql2/promise');
let runId = process.env.runId;
let browser;
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
  timezone: '+08:00',//时区配置
  charset: 'utf8' //字符集设置
});

main()
async function freeokSign(row, page) {
  let cookies = [];
  await login(row, page, pool);
  //return Promise.reject(new Error('test'));
  let selecter, innerHtml;
  selecter = "#main-container > div > div > div:nth-child(1) > div > div.block-content > div > div > div > div:nth-child(1) > div > p > span"
  await page.waitForSelector(selecter)
  innerHtml = await page.evaluate((selecter) => document.querySelector(selecter).innerText, selecter);
  console.log("流量: " , innerHtml);
  await page.goto("https://www.v2raya.eu.org/#/subscribe",{ timeout: 6000})
  selecter = '#main-container > div > div.block.block-rounded.mb-4 > div > div > div.p-1.p-md-3.col-md-6.col-xs-12.text-md-right > a.btn.btn-sm.btn-outline-primary.btn-rounded.px-3.mr-1.my-1.ant-dropdown-trigger';
  await page.waitForSelector(selecter, { timeout: 5000 })
  await page.click(selecter)
  await sleep(500)
  selecter = "body > div:nth-child(7) > div > div > ul > li:nth-child(2)"
  await page.waitForSelector(selecter, { timeout: 5000 })
  await sleep(500)
  await page.click(selecter)
  await sleep(1000)
  selecter = "body > div:nth-child(9) > div > div.ant-modal-wrap > div > div.ant-modal-content > div > div > div.ant-modal-confirm-btns > button.ant-btn.ant-btn-primary"
  // xpath = "/html/body/div[4]/div/div[2]/div/div[2]/div/div/div[2]/button[2]"
  await page.waitForSelector(selecter, { timeout: 5000 })
  await page.click(selecter)
  await sleep(1500)
  //rss
  selecter = "#main-container > div > div.block.block-rounded.mb-4 > div > div > div.p-1.p-md-3.col-md-6.col-xs-12.text-md-right > a.btn.btn-sm.btn-primary.btn-rounded.px-3.mr-1.my-1"
  await page.waitForSelector(selecter, { timeout: 5000 })
  await page.click(selecter)
  await sleep(500)
  selecter = "body > div:nth-child(10) > div > div.ant-modal-wrap.ant-modal-centered > div > div.ant-modal-content > div > div > div.item___yrtOv.subsrcibe-for-link > div:nth-child(2)"
  await page.waitForSelector(selecter, { timeout: 5000 })
  await page.click(selecter)
  await sleep(500)
  const text =await page.evaluate(() => navigator.clipboard.readText());
  console.log(text);
  row.rss = text
  return row
}

async function main() {

  //console.log(await sqlite.open('./freeok.db'))
  browser = await puppeteer.launch({
    headless: runId ? true : false,
    //headless: true,
    args: [
      '--window-size=1920,1080',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      //runId ? '' : setup.proxy.changeip,
      //runId ? '' : setup.proxy.normal
      //setup.proxy.changeip,
    ],
    defaultViewport: null,
    ignoreHTTPSErrors: true
  });
  const context = browser.defaultBrowserContext();
  context.overridePermissions("https://www.v2raya.eu.org", ['clipboard-read'])
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36');
  await page.authenticate({ username: setup.proxy.usr, password: setup.proxy.pwd });
  page.on('dialog', async dialog => {
    //console.info(`➞ ${dialog.message()}`);
    await dialog.dismiss();
  });
  console.log(`*****************开始bjd签到 ${Date()}*******************\n`);
  let sql = `SELECT id,usr,pwd
             FROM freeok 
             where site = 'v2raya' and level = 1 and (reset_time < date_sub(now(), interval 6 hour) or reset_time IS NULL) 
             limit 1;`
  let r = await pool.query(sql, []);
  let i = 0;
  console.log(`共有${r[0].length}个账户要重置rss`);
  //console.log(JSON.stringify(r));
  for (let row of r[0]) {
    i++;
    console.log("user:", i, row.id, row.usr);
    if (i % 3 == 0) await sleep(3000)
    if (row.usr && row.pwd) await freeokSign(row, page)
      .then(async () => {
        //console.log(JSON.stringify(row));    
        let sql, arr;
        sql = 'UPDATE `freeok` SET `rss`=?,`reset_time` = NOW() WHERE `id`=?';
        arr = [row.rss, row.id];
        sql = await pool.format(sql, arr);
        //console.log(sql);
        await pool.query(sql)
          .then(async (reslut) => { console.log('changedRows', reslut[0].changedRows); await sleep(3000); })
          .catch(async (error) => { console.error('UPDATEerror: ', error.message); await sleep(3000); });
      })
      .catch(async (error) => {
        console.error('signerror: ', error.message)
      });
  }
  //sqlite.close();
  await pool.end();
  //if (runId ? true : false) await browser.close();
  await browser.close();
}
async function login(row, page, pool) {
  let cookies = []
  //cookies = JSON.parse(fs.readFileSync('./cookies.json', 'utf8'));
  //await page.setCookie(...cookies);
  await page.goto('https://www.v2raya.eu.org/#/login', { timeout: 15000 }).catch((err) => console.log('首页超时'));
  await page.waitForSelector(".row > .col-md-12 > .block-content > .form-group:nth-child(2) > .form-control", { timeout: 10000 })
   await page.type('.row > .col-md-12 > .block-content > .form-group:nth-child(2) > .form-control', row.usr, { delay: 20 });
  await page.type('.row > .col-md-12 > .block-content > .form-group:nth-child(3) > .form-control', row.pwd, { delay: 20 });
  await sleep(1000);
  await Promise.all([
    page.waitForNavigation({ timeout: 10000 }),
    //等待页面跳转完成，一般点击某个按钮需要跳转时，都需要等待 page.waitForNavigation() 执行完毕才表示跳转成功
    page.click('.col-md-12 > .block-content > .form-group > .btn > span'),
  ])
    .then(async () => {
      console.log('登录成功');
    })
    .catch(async (err) => {
      console.log("登录失败")
    });
}
