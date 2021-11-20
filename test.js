const fs = require("fs");
const request = require('request');
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
  queueLimit: 0 //可以等待的连接的个数
});
async function regFreeok(page){
  await clearBrowser(page); //clear all cookies
  let usr = '', pwd = setup.pwd;
  let selecter, innerHtml;
  const aEmails = ['@126.com', '@163.com', '@qq.com'];
  usr = randomString(6, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ') + randomString(3, '0123456789') + randomOne(aEmails);
  //usr = '437385458@qq.com';
  console.log(usr);
  await page.goto('https://ggme.xyz/auth/register?code=wsOq', { timeout: 30000 })
    .catch(async (error) => { console.log('error: ', error.message); });
  // console.log("a");
/*   await page.waitForFunction(
    (selecter) => {
      if (document.querySelector(selecter)) {
        return document.querySelector(selecter).innerText.includes("确认注册");
      } else {
        return false;
      }
    },
    { timeout: 60000 },
    'body'
  ).then(async () => { console.log("无需验证"); await sleep(1000); }); */
  await page.waitForSelector('#name', { timeout: 60000 });
  //console.log("b");
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
  await sbFreeok(page);
  await page.waitForFunction(
    (selecter) => document.querySelector(selecter).innerHTML.includes("验证成功"),
    { timeout: 60000 },
    '#embed-captcha > div'
  );
  await sleep(1000);
  await page.click('#tos');
  await sleep(500);
  await page.click('#reg');
  await sleep(3000);


  await page.goto('https://ggme.xyz/auth/login', { timeout: 30000 }).catch((err) => console.log('首页超时'));
  await sleep(3000);
  await page.waitForSelector("body > div.authpage > div > form > div > div.auth-help.auth-row > div > div > label > span.checkbox-circle-icon.icon");
  await page.type('#email', usr);
  await page.type('#passwd', pwd);
  await sleep(200);
  await page.click('body > div.authpage > div > form > div > div.auth-help.auth-row > div > div > label > span.checkbox-circle-icon.icon');
  await sleep(1000);
  await page.waitForSelector('#embed-captcha > div');
  await page.click('#embed-captcha > div');
  await sleep(2500);
  await sbFreeok(page);
  await page.waitForFunction(
    (selecter) => document.querySelector(selecter).innerHTML.includes("验证成功"),
    { timeout: 60000 },
    '#embed-captcha > div'
  );
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
  let cookies = [], ck = '', msg = '';
  selecter = 'body > main > div.container > section > div.ui-card-wrap > div:nth-child(1) > div > div.user-info-main > div.nodemain > div.nodehead.node-flex > div';
  await page.waitForSelector(selecter, { timeout: 15000 });
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
    sql = 'insert into  freeok (usr,pwd,regtime,cookies) values (?,?,NOW(),?);';
    arr = [usr, pwd, ck];
    sql = await pool.format(sql, arr);
    await pool.query(sql)
      .then((reslut) => { msg = '添加成功:' + usr; console.log('添加成功:', reslut[0].insertId); sleep(2000); })
      .catch((error) => { msg = '添加失败:' + error.message; console.log('添加失败:', error.message); sleep(2000); });
    //console.log(sql);
    /*   await pool.query(sql)
        .then((reslut) => { msg = 'update成功:' + usr; console.log('添加成功:', reslut[0].changedRows); sleep (2000); })
        .catch((error) => { msg = 'update失败:' + error.message; console.log('添加失败:', error.message); sleep (2000); }); */
  } else {
    msg = '不添加数据库：' + usr;
  }
  console.log(msg);
  await page.evaluate((selecter, text) => document.querySelector(selecter).innerText = text, selecter, msg);
  
}
async function main() {
  browser = await puppeteer.launch({
    headless: runId ? true : false,
    args: [
      '--window-size=1920,1080',
      setup.proxyL
    ],
    defaultViewport: null,
    ignoreHTTPSErrors: true
  });
  //console.log(await sqlite.open('./freeok.db'))
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36');
  // 当页面中的脚本使用“alert”、“prompt”、“confirm”或“beforeunload”时发出
  page.on('dialog', async dialog => {
    //console.info(`➞ ${dialog.message()}`);
    await dialog.dismiss();
  });
  // 打开拦截请求
await page.setRequestInterception(true);
// 请求拦截器
// 这里的作用是在所有js执行前都插入我们的js代码抹掉puppeteer的特征
page.on("request", async (req, res2) => {
    // 非js脚本返回
    // 如果html中有inline的script检测html中也要改，一般没有
    if (req.resourceType() !== "script") {
        req.continue()
        return
    }
    // 获取url
    const url = req.url()
    await new Promise((resolve, reject) => {
        // 使用request/axios等请求库获取js文件
        request.get(url, (err, _res) => {
           // 删掉navigator.webdriver
           // 这里不排除有其它特征检测，每个网站需要定制化修改
            let newRes = "navigator.webdriver && delete Navigator.prototype.webdriver;" + _res.body
            // 返回删掉了webdriver的js
            req.respond({
                body: newRes
            })
            resolve()
        })
    })

})

  console.log(`*****************开始freeok注册 ${Date()}*******************\n`);
  await regFreeok(page)
  .catch(async (error) => { console.log('error: ', error.message); });
  console.log(`*****************freeok注册结束 ${Date()}*******************\n`);
  await pool.end();
  if (runId ? true : false) await browser.close();
}
main();

