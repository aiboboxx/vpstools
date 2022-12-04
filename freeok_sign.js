const fs = require("fs");
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { tFormat, sleep, clearBrowser, getRndInteger, randomOne, randomString } = require('./common.js');
const { sbFreeok, login, loginWithCookies, resetPwd, resetRss } = require('./utils.js');
const dayjs = require('dayjs')
let utc = require('dayjs/plugin/utc') // dependent on utc plugin
let timezone = require('dayjs/plugin/timezone')
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault("Asia/Hong_Kong")
let resetUrl = ''
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
  queueLimit: 10, //可以等待的连接的个数
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
  await sleep(1000)
  while (await page.$('#reactive')) {
    await page.type('#email', row.usr);
    await page.click('#reactive');
    await sleep(1000);
    console.log('账户解除限制');
    await page.goto('https://okgg.top/user',{ timeout: 8000 });
  }
  //await sleep(3000);
  let selecter, innerHtml;
  selecter = 'body > main > div.container > section > div.ui-card-wrap > div:nth-child(1) > div > div.user-info-main > div.nodemain > div.nodehead.node-flex > div';
  await page.waitForSelector(selecter, { timeout: 8000 })
  //上次使用时间
  innerHtml = await page.evaluate(() => document.querySelector("body > main > div.container > section > div.ui-card-wrap > div.col-xx-12.col-sm-4 > div:nth-child(1) > div > div > dl > dd:nth-child(25)").innerHTML.trim());
  innerHtml = innerHtml.split(';')[1];
  console.log("上次使用时间: " + innerHtml);
  if (innerHtml == '从未使用')
    row.last_used_time = "2020-06-13 09:29:18";
  else
    row.last_used_time = innerHtml;
  //等级过期时间 xpath
  innerHtml = await page.evaluate(() => document.evaluate('/html/body/main/div[2]/section/div[1]/div[6]/div[1]/div/div/dl/dd[1]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.innerHTML);
  innerHtml = innerHtml.split(';')[1];
  row.level_end_time = innerHtml;
  //console.log( "等级过期时间: " , row.level_end_time, innerHtml);
  
  let unixtimes = [
    dayjs.tz(row.last_used_time).unix(), //new Date(row.last_used_time).getTime(),
    dayjs.tz(row.fetch_time).unix()//new Date(row.fetch_time).getTime()
  ];
  //console.log(row.fetch_time,dayjs.tz(row.fetch_time).unix())
  //console.log(dayjs.tz().toString(),dayjs.tz().unix())
  if ((dayjs.tz().unix() -  unixtimes[1]) / (24 * 60 * 60) > 3 && row.level === 1 && row.count !== 0) {
      await pool.query("UPDATE freeok SET count = 0  WHERE id = ?", [row.id])
      reset.pwd = true;
      reset.rss = true;
      console.log("3天重置")
    } 
  //今日已用
  selecter = 'body > main > div.container > section > div.ui-card-wrap > div.col-xx-12.col-sm-4 > div:nth-child(2) > div > div > div:nth-child(1) > div.label-flex > div > code';
  innerHtml = await page.evaluate((selecter) => document.querySelector(selecter).innerText, selecter);
  row.used = innerHtml;
  console.log("今日已用: " + innerHtml, Number(innerHtml.slice(0, innerHtml.length - 2)));
  if (row.used === "0B") {
    if ((dayjs.tz().unix() - Math.max(...unixtimes)) / (60 * 60) > (unixtimes[0] < unixtimes[1] ? 6 : 24) && row.level === 1 && row.count !== 0) {
      reset.pwd = true;
      reset.rss = true;
      await pool.query("UPDATE freeok SET count = 0  WHERE id = ?", [row.id])
      //console.log('清空fetcher',new Date(row.regtime).format('yyyy-MM-dd hh:mm:ss'),new Date(row.last_used_time).format('yyyy-MM-dd hh:mm:ss'),new Date(row.fetch_time).format('yyyy-MM-dd hh:mm:ss'));
    }
  } 
  //console.log( innerHtml,row.level);
  if (innerHtml.slice(-2) == 'GB' && row.level === 1) {
    let used = Math.abs(Number(innerHtml.slice(0, innerHtml.length - 2)))
    if (used > 4) {
      if ((dayjs.tz().startOf('date').unix() - dayjs.tz(row.rss_refresh_time?row.rss_refresh_time:"2022-07-14 06:54:17").unix()) > 0 ) {
        if (used > 4) {
          innerHtml = await page.evaluate(() => document.querySelector('#all_v2rayn > div.float-clear > input').value.trim());
          console.log( "bind rss: " + innerHtml);
          row.rss = innerHtml;
          await pool.query("UPDATE email SET bind = 1 WHERE rss = ?", [row.rss]);
        }
        reset.pwd = true;
        reset.rss = true;
        row.rss_refresh_time = dayjs.tz().format('YYYY-MM-DD HH:mm:ss');

      }
    }
  }
  //cookies = await page.cookies();
  if (reset.pwd) {
    selecter = "#ui_menu_detect > li:nth-child(2) > a"
    await page.waitForSelector(selecter, { timeout: 8000 })
    await page.click(selecter)
    await sleep(1000)
    selecter = '#sspwd';
    await page.waitForSelector(selecter, { timeout: 8000 })
    await resetPwd(row,page,pool)
    console.log("reset.pwd")
    //await page.bringToFront()
    //await page.reload({ timeout: 15000 })
    selecter = '#ui_menu_me > li:nth-child(1) > a';
    await page.waitForSelector(selecter, { timeout: 8000 })
    await page.click(selecter)
    await sleep(1000)
  }
  //await page.bringToFront()
  //await page.reload({ timeout: 15000 })
  //await page.waitForSelector(selecter, { timeout: 8000 })
  if (reset.rss) {
    //await page.bringToFront()
    await sleep(2500);
    await page.click("body > main > div.container > section > div.ui-card-wrap > div.col-xx-12.col-sm-8 > div.card.quickadd > div > div > div.cardbtn-edit > div.reset-flex > a")
    await page.waitForFunction(
      'document.querySelector("#msg").innerText.includes("已重置您的订阅链接")',
      { timeout: 10000 }
    ).then(async () => {
      //console.log('重置订阅链接',await page.evaluate(()=>document.querySelector('#msg').innerHTML));
      await sleep(2500);
      console.log("reset.rss");
    });
  }
  selecter = 'body > main > div.container > section > div.ui-card-wrap > div:nth-child(1) > div > div.user-info-main > div.nodemain > div.nodehead.node-flex > div'
  //余额
  innerHtml = await page.evaluate(() => document.querySelector('body > main > div.container > section > div.ui-card-wrap > div:nth-child(2) > div > div.user-info-main > div.nodemain > div.nodemiddle.node-flex > div').innerHTML.trim());
  innerHtml = innerHtml.split(' ')[0];
  //console.log( "余额: " + innerHtml);
  row.balance = Number(innerHtml)
  //rss 必须放最后，因为前面有rss重置
  innerHtml = await page.evaluate(() => document.querySelector('#all_v2rayn > div.float-clear > input').value.trim());
  //console.log( "rss: " + innerHtml);
  row.rss = innerHtml;
  //row.last_used_time = dayjs.tz(row.last_used_time).utc().format('YYYY-MM-DD HH:mm:ss');
  //if (row.rss_refresh_time) row.rss_refresh_time = dayjs.tz(row.rss_refresh_time).utc().format('YYYY-MM-DD HH:mm:ss');
  await page.click('#checkin', { delay: 200 })
    .then(async () => {
      await page.waitForFunction('document.querySelector("#msg").innerText.includes("获得了")', { timeout: 3000 })
        .then(async () => {
          console.log('签到成功', await page.evaluate(() => document.querySelector('#msg').innerHTML));
          //await page.goto('https://okgg.top/user');
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
      //setup.proxy.changeip,
    ],
    defaultViewport: null,
    ignoreHTTPSErrors: true
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36');
  //await page.setUserAgent('Mozilla/5.0 (Windows NT 5.1; rv:5.0) Gecko/20100101 Firefox/5.0')
  await page.authenticate({ username: setup.proxy.usr, password: setup.proxy.pwd });
  page.on('dialog', async dialog => {
    //console.info(`➞ ${dialog.message()}`);
    await dialog.dismiss();
  });
  console.log(`*****************开始freeok签到 ${Date()}*******************\n`);
  let sql = `SELECT id,usr,pwd,cookies,rss_refresh_time,level,fetch_time
             FROM freeok 
             WHERE site = "okgg" and level = 1 and (sign_time < date_sub(now(), interval 2 hour) or sign_time is null)
             order by sign_time asc 
             limit 20;`
  //sql = "SELECT * FROM freeok where site = 'okgg' and err=1 order by fetch_time asc;"
  //sql = "SELECT * FROM freeok where level = 1 and count = 1 order by fetch_time asc limit 25;"
  //sql = "SELECT * FROM freeok where id=18"
  //console.log(sql);
  let r = await pool.query(sql);
  let i = 0;
  console.log(`共有${r[0].length}个账户要签到`);
  //console.log(JSON.stringify(r));
  for (let row of r[0]) {
    i++;
    console.log("user:", i, row.id, row.usr);
    //if (i % 3 == 0) await sleep(3000)
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
        sql = 'UPDATE `freeok` SET `sign_time`=NOW() WHERE `id`=?';
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
  //if (runId ? true : false) await browser.close();
  await browser.close();
}
main();
