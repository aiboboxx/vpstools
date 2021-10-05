const fs = require("fs");
//const sqlite = require('./asqlite3.js')
const puppeteer = require('puppeteer-extra');
// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const core = require('@actions/core');
const github = require('@actions/github');
const f = require('./myfuns.js');
Date.prototype.Format =Format;
const mysql = require('mysql2/promise');
const runId = github.context.runId;
let browser;
let setup = {};
if (!runId) {
  setup  = JSON.parse(fs.readFileSync('./setup.json', 'utf8'));
}else{
  setup  = JSON.parse(process.env.SETUP);
}
const pool = mysql.createPool({
  host: setup.mysql.host,
  user: setup.mysql.user,
  password : setup.mysql.password,   
  port: setup.mysql.port,  
  database: setup.mysql.database,
  waitForConnections: true, //连接超额是否等待
  connectionLimit: 10, //一次创建的最大连接数
  queueLimit: 0 //可以等待的连接的个数
});
async function login(row,page){
  await page.goto('https://v2.freeyes.xyz/auth/login',{timeout: 10000}).catch((err)=>console.log('首页超时'));
  await page.waitForSelector("#email",{timeout:30000});
  await page.type('#email', row.usr, {delay: 20});
  await page.type('#passwd', row.pwd, {delay: 20});
  await page.click('body > div.authpage > div > form > div > div.auth-help.auth-row > div > div > label > span.checkbox-circle-icon.icon');
  await sleep(1000);
  await page.waitForSelector('#embed-captcha > div');
  await page.click('#embed-captcha > div');
  await page.waitForFunction(
   (selecter) => document.querySelector(selecter).innerHTML.includes("验证成功"),
   {timeout:60000},
   '#embed-captcha > div'
 );
  await sleep(1000);
  await Promise.all([
    page.waitForNavigation({timeout: 5000}), 
    //等待页面跳转完成，一般点击某个按钮需要跳转时，都需要等待 page.waitForNavigation() 执行完毕才表示跳转成功
    page.click('#login'),    
  ])
  .then(async ()=>{
    console.log ('登录成功');
    await pool.query("UPDATE freeok SET level = null  WHERE id = ?", [row.id]);
  })
  .catch(async (err)=>{
    let msg = await page.evaluate(()=>document.querySelector('#msg').innerHTML);
    if (msg == "账号在虚无之地，请尝试重新注册") {
      await pool.query("UPDATE freeok SET level = 1  WHERE id = ?", [row.id]);
      return Promise.reject(new Error('账号在虚无之地'));
    }else{
      await pool.query("UPDATE freeok SET level = 2  WHERE id = ?", [row.id]);
      return Promise.reject(new Error('登录失败'));
    }    
  });
}
async function loginWithCookies(row,page){
  let cookies = JSON.parse(row.cookies);
  await page.setCookie(...cookies);
  await page.goto('https://v2.freeyes.xyz/user',{timeout:30000});
  await page.waitForFunction(
    (selecter) => {
        if (document.querySelector(selecter)){
            return document.querySelector(selecter).innerText.includes("用户中心");
        }else{
            return false;
        }
    },
    { timeout: 60000 },
    'body'
)      .then(async () => { console.log("无需验证"); await sleep(1000); });
  let selecter, innerHtml;
  selecter = 'body > header > ul.nav.nav-list.pull-right > div > ul > li:nth-child(2) > a'; //退出
  await page.waitForSelector(selecter,{timeout:30000})
  .then(
    async ()=>{
    console.log('登录成功');
    //await page.goto('https://v2.freeyes.xyz/user');
    return true;
  },
  async (err)=>{
    let msg = await page.evaluate(()=>document.querySelector('#msg').innerHTML);
    if (msg == "账号在虚无之地，请尝试重新注册") {
      await pool.query("UPDATE freeok SET level = 1  WHERE id = ?", [row.id]);
      return Promise.reject(new Error('账号在虚无之地'));
    }else{
      return Promise.reject(new Error('登录失败'));
    }    
  }
  );

}
async function  freeokBuy (row,page) {
  await clearBrowser(page); //clear all cookies
  if (row.cookies == null){
    if (!runId) await login(row,page);
  }else{
    await loginWithCookies(row,page).catch(async ()=> {
      if (!runId) await login(row,page);
      //await sleep(6000);
    });
  }
  if (await page.$('#reactive',{timeout:3000})) {
    await page.type('#email', row.usr);
    await page.click('#reactive');
    console.log ('账户解除限制');
  }
  await page.goto('https://v2.freeyes.xyz/user/invite');
  await sleep(3000);
  let selecter, innerHtml;
  selecter = 'body > main > div.container > section > div.ui-card-wrap > div:nth-child(1) > div > div.user-info-main > div.nodemain > div.nodehead.node-flex > div';
  await page.waitForSelector(selecter,{timeout:10000})
  .then(async ()=>{
    console.log('进入页面：',await page.evaluate((selecter)=>document.querySelector(selecter).innerHTML,selecter));
    //await page.goto('https://v2.freeyes.xyz/user');
  });
  console.log('do something');
  selecter = "body > main > div.content-header.ui-content-header > div > h1" ;
  //await page.evaluate((selecter,test) => document.querySelector(selecter).innerText=test,selecter,"兴文并");
//////////do something
    //score
    innerHtml = await page.evaluate(() => document.querySelector( 'body > main > div.container > section > div > div:nth-child(1) > div > div > div > div > p:nth-child(8) > small:nth-child(5)' ).innerText.trim());
    //console.log( innerHtml);
    innerHtml = innerHtml.split('=')[1].trim();
    row.score = Number(innerHtml);
    console.log( "score: " + innerHtml);
    cookies = await page.cookies();
    row.cookies = JSON.stringify(cookies, null, '\t');
    return row;
}  

async function  main () {
   browser = await puppeteer.launch({ 
    headless: runId?true:false ,
    args: [
      '--window-size=1920,1080',
      setup.proxy
    ],
    defaultViewport: null,
    ignoreHTTPSErrors: true
  });
    //console.log(await sqlite.open('./freeok.db'))
    const page = await browser.newPage();
    page.on('dialog', async dialog => {
        await dialog.dismiss();
    });
    console.log(`*****************开始freeokgetrss ${Date()}*******************\n`);  
    //let sql = "SELECT * FROM freeok WHERE level IS NULL and rss IS NULL;"
    let sql = "SELECT * FROM freeok WHERE level = 6;"
    let r = await pool.query(sql, []);
    let i = 0;
    console.log(`共有${r[0].length}个账户要getrss`);
    for (let row of r[0]) {
      i++;
      console.log("user:",i, row.id, row.usr);      
      if (i % 3 == 0) await sleep(3000).then(()=>console.log('暂停3秒！'));
      if (row.usr&&row.pwd) await freeokBuy(row,page)
      .then(async row => {
        //console.log(row);
        await pool.query("UPDATE freeok SET cookies = ?  WHERE id = ?", [row.cookies,row.id])
        .then((reslut)=>{console.log(row.usr,"update_time");f.sleep(3000);})
        })
      .catch(error => console.log('error: ', error.message));
     }
     await pool.end();
    if ( runId?true:false ) await browser.close();
}
main();
