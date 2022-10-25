//专注于购买套餐
const fs = require("fs");
const puppeteer = require('puppeteer-extra');
// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { tFormat, sleep, clearBrowser, getRndInteger, randomOne, randomString } = require('./common.js');
const { sbFreeok,login,loginWithCookies,resetPwd } = require('./utils.js');
//Date.prototype.format =Format;
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
  let cookies = [];
  await clearBrowser(page); //clear all cookies
  if (row.cookies == null) {
    if (!runId) await login(row, page, pool);
  } else {
    await loginWithCookies(row, page, pool).catch(async () => {
      if (!runId) await login(row, page, pool);
    });
  }
  while (await page.$('#reactive')) {
    await page.type('#email', row.usr);
    await page.click('#reactive');
    await sleep(1000);
    console.log('账户解除限制');
    await page.goto('https://okgg.xyz/user');
  }
  await sleep(3000);
  let selecter, innerHtml;
    await resetPwd(row,browser,pool);
    console.log("reset.pwd");
    await page.click("body > main > div.container > section > div.ui-card-wrap > div.col-xx-12.col-sm-8 > div.card.quickadd > div > div > div.cardbtn-edit > div.reset-flex > a")
    await page.waitForFunction(
      'document.querySelector("#msg").innerText.includes("已重置您的订阅链接")',
      { timeout: 5000 }
    ).then(async () => {
      //console.log('重置订阅链接',await page.evaluate(()=>document.querySelector('#msg').innerHTML));
      await sleep(3000);
      console.log("reset.rss");
    });
      //rss
  innerHtml = await page.evaluate(() => document.querySelector('#all_v2rayn > div.float-clear > input').value.trim());
  //console.log( "rss: " + innerHtml);
  row.rss = innerHtml;
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
      //runId ? '' :setup.proxy.normal
      setup.proxy.changeip,
    ],
    defaultViewport: null,
    ignoreHTTPSErrors: true
  });
  //console.log(await sqlite.open('./freeok.db'))
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36');
  await page.authenticate({username:setup.proxy.usr, password:setup.proxy.pwd});
  page.on('dialog', async dialog => {
    //console.info(`➞ ${dialog.message()}`);
    await dialog.dismiss();
  });

  console.log(`*****************开始Reset ${Date()}*******************\n`);
  let sql = `SELECT id,usr,pwd,cookies 
             FROM freeok 
             WHERE id = 24
            ;`
  //sql = "SELECT id,usr,pwd,cookies FROM freeok WHERE level = 0 order by update_time asc ;"
  let r = await pool.query(sql);
  let i = 0;
  console.log(`共有${r[0].length}个账户要Reset`);
  for (let row of r[0]) {
    i++;
    console.log("user:", i, row.id, row.usr);
    if (i % 3 == 0) await sleep(3000)
    if (row.usr && row.pwd) await freeokBuy(row, page)
      .then(async () => {
        //console.log(JSON.stringify(row));    
        let sql, arr;
        sql = 'UPDATE `freeok` SET `cookies`=?, `rss` = ?, `count` = 0, `reset_time` = NOW() WHERE `id` = ?';
        arr = [row.cookies, row.rss, row.id];
        sql = await pool.format(sql, arr);
        //console.log(sql);
        await pool.query(sql)
          .then(async(result) => { console.log('changedRows', result[0].changedRows);await sleep(3000); })
          .catch(async(error) => { console.log('UPDATEerror: ', error.message);await sleep(3000); });
      })
      .catch(async (error) => {
        console.log('Reset error: ', error.message)
      });
  }
  await pool.end();
  if (runId ? true : false) await browser.close();
}
main();

