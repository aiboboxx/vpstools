const fs = require("fs");
const core = require('@actions/core');
const github = require('@actions/github');
const puppeteer = require('puppeteer-extra');
// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { tFormat, sleep, clearBrowser, getRndInteger, randomOne, randomString, waitForString } = require('./common.js');
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
main()
async function freeokSign(row, page) {
  let reset = { pwd: false, rss: false, fetcher: false, block: false };
  let cookies = [];
  await clearBrowser(page); //clear all cookies
  if (row.cookies == null) {
    await login(row, page, pool);
  } else {
    await loginWithCookies(row, page, pool).catch(async () => {
      await login(row, page, pool);
    });
  }
  let selecter, innerHtml;
  if ((dayjs.tz().unix() -  dayjs.tz(row.fetch_time).unix()) / (24 * 60 * 60) > 7 && row.level === 1 && row.count !== 0) {
     // await pool.query("UPDATE freeok SET count = 0  WHERE id = ?", [row.id])
      reset.pwd = true;
      reset.rss = true;
      console.log("7天重置")
    }

  //今日已用
  selecter = '.list-inline > li:nth-of-type(1) > .d-sm-block';
  innerHtml = await page.evaluate((selecter) => document.querySelector(selecter).innerText, selecter);
  row.used = innerHtml;
  console.log("今日已用: " + innerHtml, Number(innerHtml.slice(0, innerHtml.length - 2)));

  if (innerHtml.slice(-2) == 'GB' && row.level == 1) {
    if (Number(innerHtml.slice(0, innerHtml.length - 2)) > 4) {
      if ((dayjs.tz().startOf('date').unix() - dayjs.tz(row.rss_refresh_time).unix()) > 0 ) {
        await pool.query("UPDATE email SET bind = 1 WHERE rss = ?", [row.rss]);
        reset.pwd = true;
        reset.rss = true;
        row.rss_refresh_time = dayjs.tz().format('YYYY-MM-DD HH:mm:ss');

      }
    }
  }

  if (reset.pwd) {
    //await resetPwd(row, browser, pool);
    console.log("reset.pwd");
  }
  if (reset.rss) {
    await page.click(".reset-link")
    await page.waitForFunction(
      'document.querySelector(".el-message-box__header").innerText.includes("重置成功")',
      { timeout: 5000 }
    ).then(async () => {
      //console.log('重置订阅链接',await page.evaluate(()=>document.querySelector('#msg').innerHTML));
      await sleep(3000);
      console.log("reset.rss");
    });
  }

  //rss 必须放最后，因为前面有rss重置
  innerHtml = await page.evaluate(() => document.querySelector('#all_v2rayn > div.float-clear > input').value.trim());
  //console.log( "rss: " + innerHtml);
  row.rss = innerHtml;
  if (row.rss_refresh_time) row.rss_refresh_time = dayjs.tz(row.rss_refresh_time).utc().format('YYYY-MM-DD HH:mm:ss');
  await page.click('#succedaneum', { delay: 200 })
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
  console.log(`*****************开始chinaG签到 ${Date()}*******************\n`);
  let sql = `SELECT id,usr,pwd,cookies,rss,count
             FROM freeok 
             where site = 'chinaG' and level = 1 
             order by sign_time asc 
             limit 25;`
  //and (sign_time < date_sub(now(), interval 3 hour) or sign_time is null)
  //sql = "SELECT * FROM freeok where level = 1 and count = 1 order by fetch_time asc limit 25;"
  //sql = "SELECT * FROM freeok where id=585"
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
        sql = 'UPDATE `freeok` SET `cookies`=?,`rss`=?,`sign_time`=NOW(),`used`=? WHERE `id`=?';
        arr = [row.cookies, row.rss, row.used, row.id];
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
    await page.goto('https://b.luxury/signin', { timeout: 15000 }).catch((err) => console.log('首页超时'));
    await page.waitForSelector('.demo-ruleForm > .el-form-item:nth-child(1) > .el-form-item__content > .el-input > .el-input__inner')
    await page.type('.demo-ruleForm > .el-form-item:nth-child(1) > .el-form-item__content > .el-input > .el-input__inner',row.usr)   
    await page.type('.demo-ruleForm > .el-form-item:nth-child(2) > .el-form-item__content > .el-input > .el-input__inner', row.pwd)
    await page.click('div > .demo-ruleForm > .el-form-item > .el-form-item__content > .el-button')
    await waitForString(page,"body > div.el-message-box__wrapper > div","请切换服务器")
    await page.click("body > div.el-message-box__wrapper > div > div.el-message-box__btns > button > span")
    await waitForString(page,"#app > div > div:nth-child(3) > div > div > div.el-dialog__body","有问题需要反馈")
    await page.click("#app > div > div:nth-child(3) > div > div > div.el-dialog__footer > span > button > span")
    await page.waitForSelector('.bg-gradient-yellow > .card-body', { visible: true,timeout: 30000 })
      .then(async () => {
        console.log('模拟登录成功');
      })
      .catch(async (err) => {
        return Promise.reject(new Error('模拟登录失败'));
      });
  }
async function loginWithCookies(row, page, pool) {
    let cookies = JSON.parse(row.cookies);
    await page.setCookie(...cookies);
    await page.goto('https://b.luxury/user', { timeout: 15000 });
    //console.log('开始cookie登录');
    await page.waitForFunction(
      (selecter) => {
        if (document.querySelector(selecter)) {
          return document.querySelector(selecter).innerText.includes("今日已用流量");
        } else {
          return false;
        }
      },
      { timeout: 20000 },
      'body'
    )
    let selecter, innerHtml;
    selecter = '.bg-gradient-yellow > .card-body'; //订阅
    await page.waitForSelector(selecter, { timeout: 30000 })
      .then(
        async () => {
            return true;
        },
        async (err) => {
            return Promise.reject(new Error('登录失败'));
        });
  }
