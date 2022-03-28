const fs = require("fs");
const core = require('@actions/core');
const github = require('@actions/github');
const puppeteer = require('puppeteer-extra');
// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { tFormat, sleep, clearBrowser, getRndInteger, randomOne, randomString } = require('./common.js');
const { sbFreeok, login, loginWithCookies, resetPwd } = require('./utils.js');
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
  queueLimit: 0 //可以等待的连接的个数
});


async function freeokSign(row, page) {
  let reset = { pwd: false, rss: false, fetcher: false, block: false };
  //let needreset = false;
  let cookies = [];
  await clearBrowser(page); //clear all cookies
  if (row.cookies == null) {
    if (!runId) await login(row, page, pool);
  } else {
    await loginWithCookies(row, page, pool).catch(async () => {
      if (!runId) await login(row, page, pool);
    });
  }
  //cookies = await page.cookies();
  //row.cookies = JSON.stringify(cookies, null, '\t');
  while (await page.$('#reactive')) {
    await page.type('#email', row.usr);
    await page.click('#reactive');
    await sleep(1000);
    console.log('账户解除限制');
    if (row.fetcher !== null) {
      //await pool.query("UPDATE email SET getrss = 1  WHERE email = ?", [row.fetcher]);
      //await pool.query("UPDATE freeok SET fetcher = null  WHERE id = ?", [row.id]);
      reset.pwd = true;
      reset.rss = true;
      reset.fetcher = true;
      //reset.block = true;
    }
    await page.goto('https://ggme.xyz/user');
  }
  //await sleep(3000);
  let selecter, innerHtml;
  selecter = 'body > main > div.container > section > div.ui-card-wrap > div:nth-child(1) > div > div.user-info-main > div.nodemain > div.nodehead.node-flex > div';
  await page.waitForSelector(selecter, { timeout: 15000 })
    .then(async () => {
      console.log('进入页面：', await page.evaluate((selecter) => document.querySelector(selecter).innerHTML, selecter));
      //await page.goto('https://ggme.xyz/user');
    });

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
  //上次使用时间
  innerHtml = await page.evaluate(() => document.querySelector("body > main > div.container > section > div.ui-card-wrap > div.col-xx-12.col-sm-4 > div:nth-child(1) > div > div > dl > dd:nth-child(25)").innerHTML.trim());
  innerHtml = innerHtml.split(';')[1];
  console.log("上次使用时间: " + innerHtml);
  if (innerHtml == '从未使用')
    row.last_used_time = null;
  else
    row.last_used_time = innerHtml;
  //是否reset

  let unixtimes = [
    new Date(row.regtime).getTime(),
    new Date(row.last_used_time).getTime(),
    new Date(row.fetch_time).getTime()
  ];
  if (row.fetcher !== null) {
    //console.log(unixtimes,(Date.now()-Math.max(...unixtimes))/60*60*1000,unixtimes[1]<unixtimes[2]?3:24);
    if ((Date.now() - Math.max(...unixtimes)) / (60 * 60 * 1000) > (unixtimes[1] < unixtimes[2] ? 3 : 24)) {
      reset.fetcher = true;
      reset.pwd = true;
      reset.rss = true;
      console.log('清空fetcher',new Date(row.regtime).format('yyyy-MM-dd hh:mm:ss'),new Date(row.last_used_time).format('yyyy-MM-dd hh:mm:ss'),new Date(row.fetch_time).format('yyyy-MM-dd hh:mm:ss'));
      if (unixtimes[1] < unixtimes[2]) {
        //await pool.query("UPDATE email SET getrss = 1  WHERE email = ?", [row.fetcher]);
        console.log('三小时内未使用');
        reset.block = true;
      }
      if ((Date.now() - Math.max(unixtimes[0], unixtimes[2])) / (24 * 60 * 60 * 1000) > 15) {
        reset.fetcher = true;
        reset.pwd = true;
        reset.rss = true;
        //console.log('清空fetcher',new Date(row.regtime).Format('yyyy-MM-dd hh:mm:ss'),new Date(row.last_used_time).Format('yyyy-MM-dd hh:mm:ss'),new Date(row.fetch_time).Format('yyyy-MM-dd hh:mm:ss'));
        console.log('15天重置');
      }
    }
  }
  //今日已用
  selecter = 'body > main > div.container > section > div.ui-card-wrap > div.col-xx-12.col-sm-4 > div:nth-child(2) > div > div > div:nth-child(1) > div.label-flex > div > code';
  innerHtml = await page.evaluate((selecter) => document.querySelector(selecter).innerText, selecter);
  console.log("今日已用: " + innerHtml, Number(innerHtml.slice(0, innerHtml.length - 2)));
  if (innerHtml.slice(-2) == 'GB') {
    if (Number(innerHtml.slice(0, innerHtml.length - 2)) > 4) {
      //console.log(new Date().setHours(0,0,0,0),new Date(row.rss_refresh_time).getTime(),new Date(new Date().setHours(0,0,0,0)),new Date(row.rss_refresh_time));
      //console.log((new Date().setHours(0,0,0,0)-new Date(row.rss_refresh_time).getTime())>0);
      if ((new Date().setHours(0, 0, 0, 0) - new Date(row.rss_refresh_time).getTime()) > 0 && row.fetcher != null && row.level == 1) {
        reset.fetcher = true;
        reset.pwd = true;
        reset.rss = true;
        reset.block = true;
        row.rss_refresh_time = (new Date).format('yyyy-MM-dd hh:mm:ss');
      }
    }
  }
  if (reset.pwd) {
    await resetPwd(browser);
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
    });
    console.log("reset.rss");
  }
  if (reset.block) {
    let bindtime = (new Date).format('yyyy-MM-dd hh:mm:ss')
    await pool.query("UPDATE email SET bindtime = ?  WHERE email = ?", [bindtime,row.fetcher]); //屏蔽email
    console.log("reset.block",bindtime);
  }
  if (reset.fetcher) {
    row.fetcher = null;
  }
    //rss 必须放最后，因为前面有rss重置
    innerHtml = await page.evaluate(() => document.querySelector('#all_v2rayn > div.float-clear > input').value.trim());
    //console.log( "rss: " + innerHtml);
    row.rss = innerHtml;
  await page.click('#checkin', { delay: 200 })
    .then(async () => {
      await page.waitForFunction('document.querySelector("#msg").innerText.includes("获得了")', { timeout: 3000 })
        .then(async () => {
          console.log('签到成功', await page.evaluate(() => document.querySelector('#msg').innerHTML));
          //await page.goto('https://ggme.xyz/user');
        })
        .catch((err) => console.log('签到超时'));
    })
    .catch((err) => console.log('今日已签到'));
  await sleep(2000);
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
      //setup.proxy.changeip
      setup.proxy.normal
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
  let sql = `SELECT id,usr,pwd,cookies,balance,level_end_time,rss,last_used_time,fetcher,sign_time,rss_refresh_time,regtime,fetch_time
             FROM freeok 
             where level > 0 and (sign_time < date_sub(now(), interval 4 hour) or sign_time is null)
             order by sign_time asc 
             limit 15;`
  //let sql = "SELECT * FROM freeok where level IS NULL and fetcher is null order by sign_time asc limit 1;"
  //sql = "SELECT * FROM freeok where id = 523;" and sign_time < date_sub(now(), interval 4 hour) 
  let r = await pool.query(sql, []);
  let i = 0;
  console.log(`共有${r[0].length}个账户要签到`);
  //console.log(JSON.stringify(r));
  for (let row of r[0]) {
    i++;
    console.log("user:", i, row.id, row.usr);
    if (i % 3 == 0) await sleep(3000).then(() => console.log('暂停3秒！'));
    if (row.usr && row.pwd) await freeokSign(row, page)
      .then(async () => {
        //console.log(JSON.stringify(row));    
        let sql, arr;
        sql = 'UPDATE `freeok` SET `cookies`=?,`balance`=?,`level_end_time`=?,`rss`=?,`last_used_time`=?,`fetcher`=?,`sign_time`=NOW(),`rss_refresh_time`=? WHERE `id`=?';
        arr = [row.cookies, row.balance, row.level_end_time, row.rss, row.last_used_time, row.fetcher, row.rss_refresh_time, row.id];
        sql = await pool.format(sql, arr);
        //console.log(sql);
        await pool.query(sql)
          .then((reslut) => { console.log('changedRows', reslut[0].changedRows); sleep(3000); })
          .catch((error) => { console.log('UPDATEerror: ', error.message); sleep(3000); });
      })
      .catch(async (error) => {
        console.log('signerror: ', error.message)
        let sql, arr;
        sql = 'UPDATE `freeok` SET `sign_time`=NOW() WHERE `id`=?';
        arr = [row.id];
        sql = await pool.format(sql, arr);
        //console.log(sql);
        await pool.query(sql)
          .then((reslut) => { console.log('changedRows2', reslut[0].changedRows); sleep(3000); })
          .catch((error) => { console.log('UPDATEerror2: ', error.message); sleep(3000); });
      } );
  }
  //sqlite.close();
  await pool.end();
  if (runId ? true : false) await browser.close();
}
main();
