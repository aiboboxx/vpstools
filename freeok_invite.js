/*
  主要功能：更新level=0、score、invite，购买邀请次数
*/
const fs = require("fs");
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { tFormat, sleep, clearBrowser, getRndInteger, randomOne, randomString } = require('./common.js');
const { sbFreeok, login, loginWithCookies, resetPwd, resetRss, selectAsiaGroup } = require('./utils.js');
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
  charset:'utf8' //字符集设置
});

async function freeokBuy(row, page) {
  //console.log(row.id,row.level);
  await clearBrowser(page); //clear all cookies
  if (row.cookies == null) {
      await login(row, page);
  } else {
    await loginWithCookies(row, page).catch(async () => {
        await login(row, page);
    });
  }
  while (await page.$('#reactive', { timeout: 3000 })) {
    await page.type('#email', row.usr);
    await page.click('#reactive');
    await sleep(1000);
    if (row.level === 1) {
      await resetPwd(row,browser,pool);
      await resetRss(browser);
    }
    console.log('账户解除限制');
  }
  await page.goto('https://okgg.xyz/user/invite',{ timeout: 8000 });
  //await sleep(1000);
  let selecter, innerHtml;
  selecter = 'body > main > div.container > section > div > div:nth-child(1) > div > div > div > div > p:nth-child(8) > small:nth-child(5)';
  await page.waitForSelector(selecter, { timeout: 8000 })
    .then(async () => {
      //console.log('进入页面：invite');
      //await page.goto('https://okgg.xyz/user');
    });
  selecter = "body > main > div.content-header.ui-content-header > div > h1";
  //////////do something

  //score
  innerHtml = await page.evaluate(() => document.querySelector('body > main > div.container > section > div > div:nth-child(1) > div > div > div > div > p:nth-child(8) > small:nth-child(5)').innerText.trim());
  //console.log( innerHtml);
  innerHtml = innerHtml.split('=')[1].trim();
  row.score = Number(innerHtml);
  console.log("score: " + innerHtml);
  let array = [1,2,3,8]
  if (row.score > 3.3) {
    if (row.balance < 1 && array.includes(row.level) && row.id > 200) {
      row.level = 0;
    }
  }
  //console.log('row.level',row.level,row.balance);
  await sleep(1000)
  //invite 邀请码
  innerHtml = await page.evaluate(() => document.querySelector("body > main > div.container > section > div > div:nth-child(2) > div > div > div > div > div:nth-child(4) > input").value.trim());
  row.invite = innerHtml;
  //剩余要请
  innerHtml = await page.evaluate(() => document.querySelector("body > main > div.container > section > div > div:nth-child(2) > div > div > div > div > p:nth-child(2) > code").innerText.trim());
  //console.log( "剩余要请:",innerHtml);
  let times = Number(innerHtml);
  //console.log('row.level',row.level,row.balance,times);
  if (times < 10 && row.level > 0 && row.balance > 1) {
    selecter = '#buy-invite-num'
    await page.waitForSelector(selecter)
    await page.type(selecter, '30')
    await page.click('#buy-invite > span')
    await sleep(2000);
  }
  array = [2,3,8,4]
  if (array.includes(row.level)) await selectAsiaGroup(browser)
  array = [5,6,7]
  if (array.includes(row.level)) {
    if (dayjs.tz().date() % 3 === 0) await selectAsiaGroup(browser)
  }
  //if (row.level > 1) await selectAsiaGroup(browser)
  let cookies = [];
  cookies = await page.cookies();
  row.cookies = JSON.stringify(cookies, null, '\t');
  //console.log(row.id,row.level);
  return row;
}

async function main() {
  console.log("runId:",runId);
  browser = await puppeteer.launch({
    headless: runId ? true : false,
    //headless: true,
    args: [
      '--window-size=1920,1080',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      //runId ? '' : setup.proxy.normal,
      runId ? '' : setup.proxy.changeip
      //setup.proxy.changeip
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

  console.log(`*****************开始freeok invite ${Date()}*******************\n`);
  //level,balance必须有
  let sql = `SELECT id,usr,pwd,cookies,level,balance,level_end_time
             FROM freeok  
             where  site = "okgg" and level > 0  and (invite_refresh_time < date_sub(now(), interval 8 hour) or invite_refresh_time is null) 
             order by invite_refresh_time asc 
             limit 25;` //必须要有level，不然level置0
  //sql = "SELECT id,usr,pwd,cookies,level,balance,level_end_time from freeok where id = 1075";
  let r = await pool.query(sql);
  let i = 0;
  console.log(`共有${r[0].length}个账户要invite`);
  for (let row of r[0]) {
    i++;
    console.log("user:", i, row.id, row.usr);
    if (i % 3 == 0) await sleep(3000)
    if (row.usr && row.pwd) await freeokBuy(row, page)
      .then(async () => {
        //console.log(JSON.stringify(row)); 
        //console.log(row.id,row.level);   
        let sql, arr;
        sql = `UPDATE freeok  SET  cookies = ?,  score = ?, invite = ?, invite_refresh_time = NOW(), level = ?  WHERE id = ?`;
        arr = [row.cookies, row.score, row.invite, row.level, row.id];
        sql = await pool.format(sql, arr);
        await pool.query(sql)
        .then(async(result) => { console.log('changedRows', result[0].changedRows);await sleep(3000); })
        .catch(async(error) => { console.log('UPDATEerror: ', error.message);await sleep(3000); });
      })
      .catch(async (error) => {
        let sql, arr;
        sql = 'UPDATE `freeok` SET  `invite_refresh_time` = NOW()  WHERE `id` = ?';
        arr = [row.id];
        sql = await pool.format(sql, arr);
        await pool.query(sql)
        .then(async(result) => { console.log('changedRows2', result[0].changedRows);await sleep(3000); })
        .catch(async(error) => { console.log('UPDATEerror: ', error.message);await sleep(3000); });
        console.log('buyerror: ', error.message)
      });
  }
  await pool.end();
  //if (runId ? true : false) await browser.close();
  await browser.close();
}

main();
