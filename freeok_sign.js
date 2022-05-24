const fs = require("fs");
const core = require('@actions/core');
const github = require('@actions/github');
const puppeteer = require('puppeteer-extra');
// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { tFormat, sleep, clearBrowser, getRndInteger, randomOne, randomString } = require('./common.js');
const { sbFreeok, login, loginWithCookies, resetPwd, resetRss } = require('./utils.js');
Date.prototype.format = tFormat;
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


async function freeokSign(row, page) {
  let reset = { pwd: false, rss: false, fetcher: false, block: false };
  //let needreset = false;
  let cookies = [];
  await clearBrowser(page); //clear all cookies
  if (row.cookies == null) {
    await login(row, page, pool);
  } else {
    await loginWithCookies(row, page, pool).catch(async () => {
      await login(row, page, pool);
    });
  }
  //cookies = await page.cookies();
  //row.cookies = JSON.stringify(cookies, null, '\t');
  while (await page.$('#reactive')) {
    await page.type('#email', row.usr);
    await page.click('#reactive');
    await sleep(1000);
    console.log('账户解除限制');
    if (row.level === 1) {
      await resetPwd(row, browser, pool);
      await resetRss(browser);
    }

    await page.goto('https://okgg.xyz/user');
  }
  //await sleep(3000);
  let selecter, innerHtml;
  selecter = 'body > main > div.container > section > div.ui-card-wrap > div:nth-child(1) > div > div.user-info-main > div.nodemain > div.nodehead.node-flex > div';
  await page.waitForSelector(selecter, { timeout: 30000 })
  //上次使用时间
  innerHtml = await page.evaluate(() => document.querySelector("body > main > div.container > section > div.ui-card-wrap > div.col-xx-12.col-sm-4 > div:nth-child(1) > div > div > dl > dd:nth-child(25)").innerHTML.trim());
  innerHtml = innerHtml.split(';')[1];
  console.log("上次使用时间: " + innerHtml);
  if (innerHtml == '从未使用')
    row.last_used_time = null;
  else
    row.last_used_time = innerHtml;


  //等级过期时间 xpath
  innerHtml = await page.evaluate(() => document.evaluate('/html/body/main/div[2]/section/div[1]/div[6]/div[1]/div/div/dl/dd[1]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.innerHTML);
  innerHtml = innerHtml.split(';')[1];
  //console.log( "等级过期时间: " +  innerHtml);
  row.level_end_time = innerHtml;
  
  let unixtimes = [
    new Date(row.last_used_time).getTime(),
    new Date(row.fetch_time).getTime()
  ];
  if ((Date.now() -  unixtimes[1]) / (24 * 60 * 60 * 1000) > 5 && row.level === 1 && row.count !== 0) {
     // await pool.query("UPDATE freeok SET count = 0  WHERE id = ?", [row.id])
      reset.pwd = true;
      reset.rss = true;
      console.log("5天重置")
    }
  if ((Date.now() - Math.max(...unixtimes)) / (60 * 60 * 1000) > (unixtimes[0] < unixtimes[1] ? 3 : 23) && row.level === 1 && row.count !== 0) {
      reset.pwd = true;
      reset.rss = true;
      //console.log('清空fetcher',new Date(row.regtime).format('yyyy-MM-dd hh:mm:ss'),new Date(row.last_used_time).format('yyyy-MM-dd hh:mm:ss'),new Date(row.fetch_time).format('yyyy-MM-dd hh:mm:ss'));
  }
  //今日已用
  selecter = 'body > main > div.container > section > div.ui-card-wrap > div.col-xx-12.col-sm-4 > div:nth-child(2) > div > div > div:nth-child(1) > div.label-flex > div > code';
  innerHtml = await page.evaluate((selecter) => document.querySelector(selecter).innerText, selecter);
  row.used = innerHtml;
  console.log("今日已用: " + innerHtml, Number(innerHtml.slice(0, innerHtml.length - 2)));
  if (innerHtml.slice(-2) == 'GB' && row.level == 1) {
    if (Number(innerHtml.slice(0, innerHtml.length - 2)) > 4) {
      if ((new Date().setHours(0, 0, 0, 0) - new Date(row.rss_refresh_time).getTime()) > 0 ) {
        reset.pwd = true;
        reset.rss = true;
        row.rss_refresh_time = (new Date).format('yyyy-MM-dd hh:mm:ss');
      }
    }
  }

  if (reset.pwd) {
    await resetPwd(row, browser, pool);
    console.log("reset.pwd");
  }
  if (reset.rss) {
    await page.click("body > main > div.container > section > div.ui-card-wrap > div.col-xx-12.col-sm-8 > div.card.quickadd > div > div > div.cardbtn-edit > div.reset-flex > a")
    await page.waitForFunction(
      'document.querySelector("#msg").innerText.includes("已重置您的订阅链接")',
      { timeout: 5000 }
    ).then(async () => {
      //console.log('重置订阅链接',await page.evaluate(()=>document.querySelector('#msg').innerHTML));
      await sleep(3000);
      console.log("reset.rss");
    });
  }
  //余额
  innerHtml = await page.evaluate(() => document.querySelector('body > main > div.container > section > div.ui-card-wrap > div:nth-child(2) > div > div.user-info-main > div.nodemain > div.nodemiddle.node-flex > div').innerHTML.trim());
  innerHtml = innerHtml.split(' ')[0];
  //console.log( "余额: " + innerHtml);
  row.balance = Number(innerHtml)
  //rss 必须放最后，因为前面有rss重置
  innerHtml = await page.evaluate(() => document.querySelector('#all_v2rayn > div.float-clear > input').value.trim());
  //console.log( "rss: " + innerHtml);
  row.rss = innerHtml;

  await page.click('#checkin', { delay: 200 })
    .then(async () => {
      await page.waitForFunction('document.querySelector("#msg").innerText.includes("获得了")', { timeout: 3000 })
        .then(async () => {
          console.log('签到成功', await page.evaluate(() => document.querySelector('#msg').innerHTML));
          //await page.goto('https://okgg.xyz/user');
        })
        .catch((err) => console.log('签到超时'));
    })
    .catch((err) => console.log('今日已签到'));
  await sleep(1000);
  cookies = await page.cookies();
  row.cookies = JSON.stringify(cookies, null, '\t');
  return row;
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
      runId ? '' :setup.proxy.normal
    ],
    defaultViewport: null,
    ignoreHTTPSErrors: true
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36');
  await page.authenticate({ username: setup.proxy.usr, password: setup.proxy.pwd });
  page.on('dialog', async dialog => {
    //console.info(`➞ ${dialog.message()}`);
    await dialog.dismiss();
  });
  console.log(`*****************开始freeok签到 ${Date()}*******************\n`);
  let sql = `SELECT id,usr,pwd,cookies,rss_refresh_time,level,fetch_time,count
             FROM freeok 
             where level = 1 and (sign_time < date_sub(now(), interval 4 hour) or sign_time is null)
             order by sign_time asc 
             limit 25;`
  //sql = "SELECT * FROM freeok where err=1 order by fetch_time asc;"
  //sql = "SELECT * FROM freeok  order by fetch_time asc limit 25;"
  //sql = "SELECT * FROM freeok where err=1"
  let r = await pool.query(sql, []);
  let i = 0;
  console.log(`共有${r[0].length}个账户要签到`);
  //console.log(JSON.stringify(r));
  for (let row of r[0]) {
    i++;
    console.log("user:", i, row.id, row.usr);
    if (i % 3 == 0) await sleep(3000)
    if (row.usr && row.pwd) await freeokSign(row, page)
      .then(async () => {
        //console.log(JSON.stringify(row));    
        let sql, arr;
        sql = 'UPDATE `freeok` SET `cookies`=?,`balance`=?,`rss`=?,`sign_time`=NOW(),`rss_refresh_time`=?,`used`=?,`last_used_time`=?,`err` = NULL WHERE `id`=?';
        arr = [row.cookies, row.balance, row.rss, row.rss_refresh_time, row.used, row.last_used_time, row.id];
        sql = await pool.format(sql, arr);
        //console.log(sql);
        await pool.query(sql)
          .then(async (reslut) => { console.log('changedRows', reslut[0].changedRows); await sleep(3000); })
          .catch(async (error) => { console.error('UPDATEerror: ', error.message); await sleep(3000); });
      })
      .catch(async (error) => {
        console.error('signerror: ', error.message)
        let sql, arr;
        sql = 'UPDATE `freeok` SET `sign_time`=NOW(),`err`=1 WHERE `id`=?';
        arr = [row.id];
        sql = await pool.format(sql, arr);
        //console.log(sql);
        await pool.query(sql)
          .then(async (reslut) => { console.error('changedRows2', reslut[0].changedRows); await sleep(3000); })
          .catch(async (error) => { console.error('UPDATEerror2: ', error.message); await sleep(3000); });
      });
  }
  //sqlite.close();
  await pool.end();
  if (runId ? true : false) await browser.close();
}
main();
