//专注于购买套餐
const fs = require("fs");
const core = require('@actions/core');
const github = require('@actions/github');
const puppeteer = require('puppeteer-extra');
// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { tFormat, sleep, clearBrowser, getRndInteger, randomOne, randomString } = require('./common.js');
const { sbFreeok, login, loginWithCookies, resetPwd,resetRss  } = require('./utils.js');
const dayjs = require('dayjs')
let utc = require('dayjs/plugin/utc') // dependent on utc plugin
let timezone = require('dayjs/plugin/timezone')
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault("Asia/Hong_Kong")
//Date.prototype.format = tFormat;
const mysql = require('mysql2/promise');
const runId = github.context.runId;
let browser;
let setup = {};
if (!runId) {
  setup = JSON.parse(fs.readFileSync('./setup.json', 'utf8'));
} else {
  setup = JSON.parse(process.env.SETUP);
}
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

async function freeokBuy(row, page) {
  let cookies = [];
  await clearBrowser(page); //clear all cookies
  if (row.cookies == null) {
    await login(row, page, pool);
  } else {
    await loginWithCookies(row, page, pool).catch(async () => {
      await login(row, page, pool);
    });
  }
  while (await page.$('#reactive')) {
    await page.type('#email', row.usr);
    await page.click('#reactive');
    await sleep(1000);
    console.log('账户解除限制');
    if (row.level === 1) {
      await resetPwd(row,browser,pool);
      await resetRss(browser);
    }
    await page.goto('https://okgg.xyz/user');
  }
  await sleep(3000);
  let selecter, innerHtml;
  selecter = 'body > main > div.container > section > div.ui-card-wrap > div:nth-child(1) > div > div.user-info-main > div.nodemain > div.nodehead.node-flex > div';
  await page.waitForSelector(selecter, { timeout: 30000 })
    .then(async () => {
      //console.log('进入页面：', await page.evaluate((selecter) => document.querySelector(selecter).innerHTML, selecter));
      //await page.goto('https://okgg.xyz/user');
    });
  //////////do something

  //余额
  innerHtml = await page.evaluate(() => document.querySelector('body > main > div.container > section > div.ui-card-wrap > div:nth-child(2) > div > div.user-info-main > div.nodemain > div.nodemiddle.node-flex > div').innerHTML.trim());
  innerHtml = innerHtml.split(' ')[0];
  //console.log( "余额: " + innerHtml);
  row.balance = Number(innerHtml);
  //等级过期时间 xpath
  innerHtml = await page.evaluate(() => document.evaluate('/html/body/main/div[2]/section/div[1]/div[6]/div[1]/div/div/dl/dd[1]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.innerHTML);
  innerHtml = innerHtml.split(';')[1];
  //console.log( "等级过期时间: " +  innerHtml);
  row.level_end_time = innerHtml;
  //购买套餐
  //date = dayjs.tz(row.level_end_time);
  if ((dayjs.tz(row.level_end_time).unix() < dayjs.tz().unix()) || row['balance'] == 0.99) {
    //await page.waitFor(1500);
    await page.goto('https://okgg.xyz/user/shop');
    await page.click('body > main > div.container > div > section > div.shop-flex > div:nth-child(2) > div > a', {
      delay: 500
    })
      .catch(async (err) => {
        return Promise.reject(new Error('购买失败'));
      });
    await sleep(3500);
    await page.click('#coupon_input', { delay: 200 });
    await sleep(2000);
    //await page.waitForSelector("#order_input");
    await page.click('#order_input', { delay: 200 });
    await sleep(2000);
    innerHtml = await page.evaluate(() => document.querySelector('#msg').innerHTML);
    if (innerHtml == '') {
      console.log("购买成功！");
      //await resetPwd(row,browser,pool)
      //await resetRss(browser)
    } else {
      console.log("购买套餐结果: " + innerHtml)
    }
    await sleep(1000);
  }
  await page.goto('https://okgg.xyz/user')
  selecter = 'body > main > div.container > section > div.ui-card-wrap > div:nth-child(1) > div > div.user-info-main > div.nodemain > div.nodehead.node-flex > div';
  await page.waitForSelector(selecter, { timeout: 10000 })
    .then(async () => {
      //console.log('进入页面：', await page.evaluate((selecter) => document.querySelector(selecter).innerHTML, selecter));
      //await page.goto('https://okgg.xyz/user');
    })
  //rss
  innerHtml = await page.evaluate(() => document.querySelector('#all_v2rayn > div.float-clear > input').value.trim());
  //console.log( "rss: " + innerHtml);
  row.rss = innerHtml;
  //等级过期时间 xpath
  innerHtml = await page.evaluate(() => document.evaluate('/html/body/main/div[2]/section/div[1]/div[6]/div[1]/div/div/dl/dd[1]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.innerHTML);
  innerHtml = innerHtml.split(';')[1];
  console.log( "等级过期时间: " +  innerHtml);
  row.level_end_time = innerHtml;
  row.level_end_time = dayjs.tz(row.level_end_time).utc().format('YYYY-MM-DD HH:mm:ss');
  await sleep(2000);
  cookies = await page.cookies();
  row.cookies = JSON.stringify(cookies, null, '\t');
  return row;
}
async function main() {
  //await v2raya();
  browser = await puppeteer.launch({
    headless: runId ? true : false,
    //headless: true,
    args: [
      '--window-size=1920,1080',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      //runId ? '' : setup.proxy.changeip, 
      runId ? '' : setup.proxy.normal 
    ],
    defaultViewport: null,
    ignoreHTTPSErrors: true
  });
  //console.log(await sqlite.open('./freeok.db'))
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36');
  await page.authenticate({ username: setup.proxy.usr, password: setup.proxy.pwd });
  page.on('dialog', async dialog => {
    //console.info(`➞ ${dialog.message()}`);
    await dialog.dismiss();
  });

  console.log(`*****************开始freeok购买套餐 ${Date()}*******************\n`);
  let sql = `SELECT id,usr,pwd,cookies,balance,level
             FROM freeok 
             WHERE site = "okgg" and level >0  and (level_end_time < NOW() or level_end_time IS NULL or balance = 0.99) 
             order by update_time asc 
             limit 30;`
  //sql = "SELECT * FROM freeok  order by level_end_time asc limit 20;"
  let r = await pool.query(sql);
  let i = 0;
  console.log(`共有${r[0].length}个账户要购买套餐`);
  for (let row of r[0]) {
    i++;
    console.log("user:", i, row.id, row.usr);
    if (i % 3 == 0) await sleep(3000).then(() => console.log('暂停3秒！'));
    if (row.usr && row.pwd) await freeokBuy(row, page)
      .then(async () => {
        //console.log(JSON.stringify(row));    
        let sql, arr;
        sql = 'UPDATE `freeok` SET `cookies`=?,`balance` = ?, `level_end_time` = ?, `rss` = ?, `update_time` = NOW() WHERE `id` = ?';
        arr = [row.cookies, row.balance, row.level_end_time, row.rss, row.id];
        sql = await pool.format(sql, arr);
        //console.log(sql);
        await pool.query(sql)
          .then(async(result) => { console.log('changedRows', result[0].changedRows);await sleep(3000); })
          .catch(async(error) => { console.log('UPDATEerror: ', error.message);await sleep(3000); });
      })
      .catch(async (error) => {
        console.log('buyerror: ', error.message)
        let sql, arr;
        sql = 'UPDATE `freeok` SET `update_time` = NOW() WHERE `id` = ?';
        arr = [row.id];
        sql = await pool.format(sql, arr);
        //console.log(sql);
        await pool.query(sql)
          .then(async(result) => { console.log('changedRows', result[0].changedRows);await sleep(3000); })
          .catch(async(error) => { console.log('UPDATEerror: ', error.message);await sleep(3000); });
      });
  }
  await pool.end();
  if (runId ? true : false) await browser.close();
}
main();

