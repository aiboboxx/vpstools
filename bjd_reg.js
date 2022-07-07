const fs = require("fs");
const core = require('@actions/core');
const github = require('@actions/github');
const mysql = require('mysql2/promise');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { tFormat, sleep, clearBrowser, getRndInteger, randomOne, randomString } = require('./common.js');
const { sbFreeok } = require('./utils.js');

//Date.prototype.format = tFormat;
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
  charset:'utf8' //字符集设置
});
async function regFreeok(page,invite){
  await clearBrowser(page); //clear all cookies
  let cookies = [], ck = '', msg = '';
  let usr = '', pwd = setup.pwd;
  let selecter, innerHtml;
  const aEmails = ['@126.com', '@163.com', '@qq.com'];
  //cookies = JSON.parse(fs.readFileSync('./cookies.json', 'utf8'));
  //await page.setCookie(...cookies);
  //console.log("写入cookies");
  usr = randomString(6, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ') + randomString(3, '0123456789') + randomOne(aEmails);
  //usr = '437385458@qq.com';
  console.log(usr);
  await page.goto(`https://v2.bujidao.org/auth/register?code=${invite}`, { timeout: 30000 })
    .catch(async (error) => { console.log('error: ', error.message); });
  // console.log("a");
  await page.waitForFunction(
    (selecter) => {
      if (document.querySelector(selecter)) {
        return document.querySelector(selecter).innerText.includes("确认注册");
      } else {
        return false;
      }
    },
    { timeout: 60000 },
    'body'
  ).then(async () => { console.log("过5秒盾"); await sleep(1000); });
  await page.waitForSelector('#name', { timeout: 60000 });
  //cookies = await page.cookies();
  //fs.writeFileSync('./cookies.json', JSON.stringify(cookies, null, '\t'));
  //console.log("保存cookies");
  await page.type('#name', usr);
  //await sleep (100);
  await page.type('#email', usr);
  //await sleep (100);
  await page.type('#passwd', pwd);
  //await sleep (100);
  await page.type('#repasswd', pwd);

  await page.waitForSelector( '#tos',{visible: true} )
  await page.click('#tos');
  await sleep(1000);
  await page.waitForSelector( '#reg',{visible: true} )
  await sleep(1000);
  await page.click('#reg');
  await sleep(3000);

  cookies = await page.cookies();
  ck = JSON.stringify(cookies, null, '\t');
  let sql, arr;
  sql = 'insert into  freeok (usr,pwd,cookies,reset_time,site) values (?,?,?,NOW(),"bjd");';
  arr = [usr, pwd, ck];
  sql = await pool.format(sql, arr);
  await pool.query(sql)
    .then((reslut) => { msg = '添加成功:' + usr; console.log('添加成功:', reslut[0].insertId); sleep(2000); })
    .catch((error) => { msg = '添加失败:' + error.message; console.log('添加失败:', error.message); sleep(2000); });

}
async function main() {
  let sql = "SELECT count(*) AS Number FROM freeok where site = 'bjd' and level = 1;"
  let r = await pool.query(sql);
  //console.log(JSON.stringify(r))
  if ( r[0][0].Number >= 15 ) {
    console.log('已有15个level=1 bjd账户',r[0][0].Number);
    return;
  }
  console.log('已有bjd账户：',r[0][0].Number);
  let invite = "vip";
  //invite = "uwc0"
  console.log(invite);
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
    ignoreHTTPSErrors: true,
    dumpio: false
  });
  //console.log(await sqlite.open('./freeok.db'))
  const page = await browser.newPage();
  //await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36');
  await page.authenticate({username:setup.proxy.usr, password:setup.proxy.pwd});
  page.on('dialog', async dialog => {
    //console.info(`➞ ${dialog.message()}`);
    await dialog.dismiss();
  });

  console.log(`*****************开始bjd注册 ${Date()}*******************\n`);
  await regFreeok(page,invite)
  .catch(async (error) => { console.log('error: ', error.message); });
  console.log(`*****************bjd注册结束 ${Date()}*******************\n`);
  await pool.end();
  if (runId ? true : false) await browser.close();
}
main();

