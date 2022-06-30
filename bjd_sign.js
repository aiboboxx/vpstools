const fs = require("fs");
const core = require('@actions/core');
const github = require('@actions/github');
const puppeteer = require('puppeteer-extra');
// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { tFormat, sleep, clearBrowser, getRndInteger, randomOne, randomString } = require('./common.js');
const dayjs = require('dayjs')
let utc = require('dayjs/plugin/utc') // dependent on utc plugin
let timezone = require('dayjs/plugin/timezone')
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault("Asia/Hong_Kong")
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

main()
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
    await page.goto('https://v2.bujidao.org/user');
  }
  if ((dayjs.tz().unix() -  dayjs.tz(row.regtime).unix()) / (24 * 60 * 60) > 20 && row.level === 1) {
      await pool.query("UPDATE freeok SET level = 0  WHERE id = ?", [row.id])
      return Promise.reject(new Error('账户即将失效'));
  }

  let selecter, innerHtml;
    //剩余流量
    selecter = "#remain"
    innerHtml = await page.evaluate((selecter) => document.querySelector(selecter).innerText, selecter);
    console.log("剩余流量: " + innerHtml, Number(innerHtml.slice(0, innerHtml.length - 2)));
    if (innerHtml.slice(-2) !== 'GB') {
      await pool.query("UPDATE freeok SET level = 0  WHERE id = ?", [row.id])
      return Promise.reject(new Error('账户即将失效'));
    }
  //await sleep(3000);

  selecter = '.card-tag.tag-red';
  await page.waitForSelector(selecter, { timeout: 15000 })

  //今日已用
  selecter = '.card-tag.tag-red';
  innerHtml = await page.evaluate((selecter) => document.querySelector(selecter).innerText, selecter);
  row.used = innerHtml;
  console.log("今日已用: " + innerHtml, Number(innerHtml.slice(0, innerHtml.length - 2)));

  //rss 必须放最后，因为前面有rss重置
  await page.click('.tab-nav.margin-top-no li:nth-child(2) a')
  await sleep(500)
  innerHtml = await page.evaluate(() => document.querySelector("#sub_center_windows > p:nth-child(3) > a.copy-text.btn-dl").getAttribute("data-clipboard-text"));
  console.log( "rss: " + innerHtml);
  row.rss = innerHtml;
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
  console.log(`*****************开始bjd签到 ${Date()}*******************\n`);
  let sql = `SELECT id,usr,pwd,cookies,regtime
             FROM freeok 
             where site = 'bjd' and level = 1 and (sign_time < date_sub(now(), interval 6 hour) or sign_time is null)
             order by sign_time asc 
             limit 10;`
  //sql = "SELECT * FROM freeok where  site = 'bjd' and err=1 order by fetch_time asc;"
  //sql = "SELECT * FROM freeok  order by fetch_time asc limit 25;"
  //sql = "SELECT * FROM freeok where id=605"
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
        sql = 'UPDATE `freeok` SET `cookies`=?,`rss`=?,`sign_time`=NOW(),`used`=?,`err` = NULL WHERE `id`=?';
        arr = [row.cookies,  row.rss, row.used, row.id];
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
async function login(row, page, pool) {
  let cookies = []
  //cookies = JSON.parse(fs.readFileSync('./cookies.json', 'utf8'));
  //await page.setCookie(...cookies);
  await page.goto('https://v2.bujidao.org/auth/login', { timeout: 15000 }).catch((err) => console.log('首页超时'));
  await page.waitForSelector("#email", { timeout: 30000 })
  .then(async () => {
    //cookies = await page.cookies();
    //fs.writeFileSync('./cookies.json', JSON.stringify(cookies, null, '\t'));
  });
  await page.type('#email', row.usr, { delay: 20 });
  await page.type('#passwd', row.pwd, { delay: 20 });
  await page.click('body > div.authpage > div > form > div > div.auth-help.auth-row > div > div > label > span.checkbox-circle-icon.icon');
  await sleep(1000);
  await Promise.all([
    page.waitForNavigation({ timeout: 10000 }),
    //等待页面跳转完成，一般点击某个按钮需要跳转时，都需要等待 page.waitForNavigation() 执行完毕才表示跳转成功
    page.click('#login'),
  ])
    .then(async () => {
      console.log('模拟登录成功');
    })
    .catch(async (err) => {
      let msg = await page.evaluate(() => document.querySelector('#msg').innerHTML);
      if (msg == "账号在虚无之地，请尝试重新注册") {
        //console.log('虚无之地',row.id,(dayjs.tz().unix()-dayjs.tz(row.level_end_time).unix()),(dayjs.tz().unix()-dayjs.tz(row.level_end_time).unix())/(24 * 60 * 60));
        return Promise.reject(new Error('账号在虚无之地'));
      }
    });
}
async function loginWithCookies(row, page, pool) {
  let cookies = JSON.parse(row.cookies);
  await page.setCookie(...cookies);
  await page.goto('https://v2.bujidao.org/user', { timeout: 15000 });
  //console.log('开始cookie登录');
  await page.waitForFunction(
    (selecter) => {
      if (document.querySelector(selecter)) {
        return document.querySelector(selecter).innerText.includes("用户中心");
      } else {
        return false;
      }
    },
    { timeout: 10000 },
    'body'
  )
  //.then(async () => { console.log("无需验证"); await sleep(1000); });

  let selecter, innerHtml;
  selecter = 'body > header > ul.nav.nav-list.pull-right > div > ul > li:nth-child(2) > a'; //退出
  await page.waitForSelector(selecter, { timeout: 30000 })
    .then(
      async () => {
        //console.log('cookie登录成功');
        return true;
      },
      async (err) => {
        let msg = await page.evaluate(() => document.querySelector('#msg').innerHTML);
        if (msg == "账号在虚无之地，请尝试重新注册") {
          return Promise.reject(new Error('账号在虚无之地'));
        } else {
          return Promise.reject(new Error('登录失败'));
        }
      });
}
async function resetPwd(row,browser,pool) {
  const page = await browser.newPage();
  page.on('dialog', async dialog => {
    //console.info(`➞ ${dialog.message()}`);
    await dialog.dismiss();
  });
  await page.goto('https://v2.bujidao.org/user/edit');
  await sleep(1000);
  if (row.leveel > 1){
    await page.waitForSelector('#group')
    await page.click('#group')
    await sleep(1000);
    await page.waitForSelector('.card-inner > .open > .dropdown-menu > li:nth-child(2) > .dropdown-option')
    await page.click('.card-inner > .open > .dropdown-menu > li:nth-child(2) > .dropdown-option')
    await sleep(1000);
    await page.waitForSelector('.card-inner > .card-inner > .cardbtn-edit > #group-update > .icon')
    await page.click('.card-inner > .card-inner > .cardbtn-edit > #group-update > .icon')
    await page.waitForNavigation()
    await sleep(2000);
  } 
  let selecter;
  selecter = '#sspwd';
  await page.waitForSelector(selecter, { timeout: 10000 })
    .then(async () => {
      //console.log('进入页面：修改资料');
      //await page.goto('https://okgg.xyz/user');
    });
  await page.type(selecter, Math.random().toString(36).slice(-12));
  await sleep(1500);
  await page.click('#ss-pwd-update')
    .then(async () => {
      await page.waitForFunction('document.querySelector("#msg").innerText.includes("修改成功")', { timeout: 13000 })
        .then(async () => {
          console.log('修改v2ray密码成功');
          if (row.level === 1) await pool.query("UPDATE freeok SET count = 0  WHERE id = ?", [row.id]);
          //await page.goto('https://okgg.xyz/user');
        })
        .catch((err) => console.log('修改v2ray密码失败'));
    });
  await sleep(2000);
  await page.close();
}
