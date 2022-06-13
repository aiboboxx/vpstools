const fs = require("fs");
const core = require('@actions/core');
const github = require('@actions/github');
const mysql = require('mysql2/promise');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const runId = github.context.runId;
const { tFormat, sleep, clearBrowser, getRndInteger, randomOne, randomString } = require('./common.js');
const { sbFreeok } = require('./utils.js');
//Date.prototype.format = tFormat;
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
  await page.goto(`https://okgg.xyz/auth/register?code=${invite}`, { timeout: 30000 })
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
  //await sleep (300);
  await page.type('#wechat', randomString(10, '0123456789'));
  //await sleep (300);
  await page.click('#imtype');
  await sleep(100);
  await page.click('body > div.authpage.auth-reg > div > section > div > div:nth-child(6) > div > div > ul > li:nth-child(4) > a');
  await sleep(100);
  await page.waitForSelector('#embed-captcha > div')
    .catch((error) => { console.log(error.message); sleep(2000); });
  await page.click('#embed-captcha > div');
  await sleep(2500);
  console.log("识别验证码");
  await sbFreeok(page);
  await page.waitForFunction(
    (selecter) => document.querySelector(selecter).innerHTML.includes("验证成功"),
    { timeout: 60000 },
    '#embed-captcha > div'
  );
  await sleep(1000);
  await page.waitForSelector( '#tos',{visible: true} )
  await sleep(1000);
  await page.click('#tos');
  await sleep(1000);
  await page.waitForSelector( '#reg',{visible: true} )
  await sleep(1000);
  await page.click('#reg');
  await sleep(3000);

  await page.goto('https://okgg.xyz/auth/login', { timeout: 15000 }).catch((err) => console.log('首页超时'));
  await sleep(1500);
  await page.waitForSelector("body > div.authpage > div > form > div > div.auth-help.auth-row > div > div > label > span.checkbox-circle-icon.icon");
  await page.type('#email', usr);
  await page.type('#passwd', pwd);
  await sleep(200);
  await page.click('body > div.authpage > div > form > div > div.auth-help.auth-row > div > div > label > span.checkbox-circle-icon.icon');
  await sleep(1000);
/*   await page.waitForSelector('#embed-captcha > div');
  await page.click('#embed-captcha > div');
  await sleep(2500);
  await sbFreeok(page);
  await page.waitForFunction(
    (selecter) => document.querySelector(selecter).innerHTML.includes("验证成功"),
    { timeout: 60000 },
    '#embed-captcha > div'
  ); */
  await sleep(1000);
  await Promise.all([
    page.waitForNavigation({ timeout: 5000 }),
    page.click('#login'),
  ])
    .then(
      async () => {
        console.log('登录成功');
      },
      async (err) => {
        let msg = await page.evaluate(() => document.querySelector('#msg').innerHTML);
        if (msg == "账号在虚无之地，请尝试重新注册") {
          return Promise.reject(new Error('账号在虚无之地'));
        } else {
          return Promise.reject(new Error('登录失败'));
        }
      });
  selecter = 'body > main > div.container > section > div.ui-card-wrap > div:nth-child(1) > div > div.user-info-main > div.nodemain > div.nodehead.node-flex > div';
  await page.waitForSelector(selecter, { timeout: 10000 });
  await sleep(1000);
  selecter = 'body > main > div.content-header.ui-content-header > div > h1';
  await page.waitForSelector(selecter);
  innerHtml = await page.evaluate(() => document.querySelector('body > main > div.container > section > div.ui-card-wrap > div:nth-child(2) > div > div.user-info-main > div.nodemain > div.nodemiddle.node-flex > div').innerHTML.trim());
  innerHtml = innerHtml.split(' ')[0];
  //console.log( "余额: " + innerHtml);
  if (innerHtml == '0.99') {
  cookies = await page.cookies();
  ck = JSON.stringify(cookies, null, '\t');
  let sql, arr;
  sql = 'insert into  freeok (usr,pwd,cookies,level,reset_time,site) values (?,?,?,3,now(),"okgg");';
  arr = [usr, pwd, ck];
  sql = await pool.format(sql, arr);
  await pool.query(sql)
    .then((reslut) => { msg = '添加成功:' + usr; console.log('添加成功:', reslut[0].insertId); sleep(2000); })
    .catch((error) => { msg = '添加失败:' + error.message; console.log('添加失败:', error.message); sleep(2000); });
  //console.log(sql);
  //购买套餐
  await page.goto('https://okgg.xyz/user/shop');
  await page.click('body > main > div.container > div > section > div.shop-flex > div:nth-child(2) > div > a', {
    delay: 500
  })
    .catch(async (err) => {
      console.log("购买失败");
    });
  await sleep(3500);
  await page.click('#coupon_input', { delay: 200 });
  await sleep(2000);
  //await page.waitForSelector("#order_input");
  await page.click('#order_input', { delay: 200 });
  await sleep(2000);
  innerHtml = await page.evaluate(() => document.querySelector('#msg').innerHTML);
  if (innerHtml == '')
    console.log("购买成功！");
  else
    console.log("购买套餐结果: " + innerHtml);
  await sleep(1000);
  } else {
    msg = '不添加数据库：' + usr;
  }
  console.log(msg);
  await page.evaluate((selecter, text) => document.querySelector(selecter).innerText = text, selecter, msg);

}
async function main() {
  let sql = "SELECT count(*) AS Number FROM freeok where site = 'okgg' and level = 3 and count < 4;"
  let r = await pool.query(sql);
  if ( r[0][0].Number >= 1 ) {
    console.log('已有1个level=3空闲账户');
    return;
  }
  console.log('已有账户：',r[0][0].Number);
  //sql =  "SELECT invite FROM freeok where level = 1 and balance < 160 order by id asc limit 1;"
  sql =  "SELECT invite FROM freeok where site = 'okgg' and level < 4 and balance < 1  order by level desc,id asc  limit 1;"
  //sql =  "SELECT invite FROM freeok where id < 20 order by balance asc limit 1;"
  //sql =  "SELECT invite FROM freeok where usr = 'ZQEyqq118@163.com' limit 1;"
  r = await pool.query(sql);
  let invite = r[0][0].invite;
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
      runId ? '' : setup.proxy.changeip
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
  // permissions设置
await page.evaluateOnNewDocument(() => {
  const originalQuery = window.navigator.permissions.query; //notification伪装
  window.navigator.permissions.query = (parameters) =>
      parameters.name === 'notifications'
      ? Promise.resolve({ state: Notification.permission })
      : originalQuery(parameters);
});
    // WebGL设置
  await page.evaluateOnNewDocument(() => {
      const getParameter = WebGLRenderingContext.getParameter;
      WebGLRenderingContext.prototype.getParameter = function (parameter) {
          // UNMASKED_VENDOR_WEBGL
          if (parameter === 37445) {
              return 'Intel Inc.';
          }
          // UNMASKED_RENDERER_WEBGL
          if (parameter === 37446) {
              return 'Intel(R) Iris(TM) Graphics 6100';
          }
          return getParameter(parameter);
      };
  });

  console.log(`*****************开始freeok注册 ${Date()}*******************\n`);
  await regFreeok(page,invite)
  .catch(async (error) => { console.log('error: ', error.message); });
  console.log(`*****************freeok注册结束 ${Date()}*******************\n`);
  await pool.end();
  if (runId ? true : false) await browser.close();
}
main();

