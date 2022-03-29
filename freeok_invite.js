const fs = require("fs");
const core = require('@actions/core');
const github = require('@actions/github');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { tFormat, sleep, clearBrowser, getRndInteger, randomOne, randomString } = require('./common.js');
const { sbFreeok, login, loginWithCookies, resetPwd } = require('./utils.js');
//Date.prototype.format =Format;
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
  timezone: '08:00',//时区配置
  charset:'utf8' //字符集设置
});

async function freeokBuy(row, page) {
  //console.log(row.id,row.level);
  await clearBrowser(page); //clear all cookies
  if (row.cookies == null) {
    if (!runId) await login(row, page);
  } else {
    await loginWithCookies(row, page).catch(async () => {
      if (!runId) await login(row, page);
    });
  }
  while (await page.$('#reactive', { timeout: 3000 })) {
    await page.type('#email', row.usr);
    await page.click('#reactive');
    await sleep(1000);
    console.log('账户解除限制');
  }
  await page.goto('https://ggme.xyz/user/invite');
  await sleep(3000);
  let selecter, innerHtml;
  selecter = 'body > main > div.container > section > div > div:nth-child(1) > div > div > div > div > p:nth-child(8) > small:nth-child(5)';
  await page.waitForSelector(selecter, { timeout: 10000 })
    .then(async () => {
      console.log('进入页面：invite');
      //await page.goto('https://ggme.xyz/user');
    });
  selecter = "body > main > div.content-header.ui-content-header > div > h1";
  //////////do something
  //score
  innerHtml = await page.evaluate(() => document.querySelector('body > main > div.container > section > div > div:nth-child(1) > div > div > div > div > p:nth-child(8) > small:nth-child(5)').innerText.trim());
  //console.log( innerHtml);
  innerHtml = innerHtml.split('=')[1].trim();
  row.score = Number(innerHtml);
  console.log("score: " + innerHtml);
  if (row.score > 3.3) {
    if (row.balance < 1 & row.level == 1 & row.id > 20) {
      //await resetPwd(browser);
      row.fetcher = null;
      row.level = 0;
    }
  }
  //console.log('row.level',row.level);
  //invite 邀请码
  innerHtml = await page.evaluate(() => document.querySelector("body > main > div.container > section > div > div:nth-child(2) > div > div > div > div > div:nth-child(4) > input").value.trim());
  row.invite = innerHtml;
  //剩余要请
  innerHtml = await page.evaluate(() => document.querySelector("body > main > div.container > section > div > div:nth-child(2) > div > div > div > div > p:nth-child(2) > code").innerText.trim());
  let times = Number(innerHtml);
  if (times < 50 && row.level > 0 && row.balance > 5) {
    selecter = '#buy-invite-num';
    await page.type(selecter, '50');
    await page.click('#buy-invite > span')
    await sleep(2000);
  }
  cookies = await page.cookies();
  row.cookies = JSON.stringify(cookies, null, '\t');
  //console.log(row.id,row.level);
  return row;
}

async function main() {
  //await v2raya();
  browser = await puppeteer.launch({
    headless: runId ? true : false,
    args: [
      '--window-size=1920,1080',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      //setup.proxy.changeip
      setup.proxy.normal
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
  let sql = `SELECT id,usr,pwd,cookies,balance,level,fetcher,score,invite 
             FROM freeok  
             where  level > 0  and (invite_refresh_time < date_sub(now(), interval 16 hour) or invite_refresh_time is null) 
             order by invite_refresh_time asc 
             limit 20;`
  let r = await pool.query(sql);
  let i = 0;
  console.log(`共有${r[0].length}个账户要invite`);
  for (let row of r[0]) {
    i++;
    console.log("user:", i, row.id, row.usr);
    if (i % 3 == 0) await sleep(3000).then(() => console.log('暂停3秒！'));
    if (row.usr && row.pwd) await freeokBuy(row, page)
      .then(async () => {
        //console.log(JSON.stringify(row)); 
        //console.log(row.id,row.level);   
        let sql, arr;
        sql = `UPDATE freeok  SET  cookies = ?,  score = ?, invite = ?, invite_refresh_time = NOW(), level = ?  WHERE id = ?`;
        arr = [row.cookies, row.score, row.invite, row.level, row.id];
        sql = await pool.format(sql, arr);
        await pool.query(sql)
        .then((result) => { console.log('changedRows', result[0].changedRows); sleep(3000); })
        .catch((error) => { console.log('UPDATEerror: ', error.message); sleep(3000); });
      })
      .catch(async (error) => {
        let sql, arr;
        sql = 'UPDATE `freeok` SET  `invite_refresh_time` = NOW()  WHERE `id` = ?';
        arr = [row.id];
        sql = await pool.format(sql, arr);
        await pool.query(sql)
        .then((result) => { console.log('changedRows2', result[0].changedRows); sleep(3000); })
        .catch((error) => { console.log('UPDATEerror: ', error.message); sleep(3000); });
        console.log('buyerror: ', error.message)
      });
  }
  await pool.end();
  if (runId ? true : false) await browser.close();
}

main();
