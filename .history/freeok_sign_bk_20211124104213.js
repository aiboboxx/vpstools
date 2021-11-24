const fs = require("fs");
const core = require('@actions/core');
const github = require('@actions/github');
const puppeteer = require('puppeteer-extra');
// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { tFormat, sleep, clearBrowser, getRndInteger, randomOne, randomString } = require('./common.js');
const { sbFreeok,login,loginWithCookies,resetPwd } = require('./utils.js');
Date.prototype.format =tFormat;
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


async function  freeokSign  (row,page) {
  let needreset = false;
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
  if (await page.$('#reactive')) {
    await page.type('#email', row.usr);
    await page.click('#reactive');
    console.log('账户解除限制');
    if (row.fetcher !== null) {
      await pool.query("UPDATE email SET getrss = 1  WHERE email = ?", [row.fetcher]);
      await pool.query("UPDATE freeok SET fetcher = null  WHERE id = ?", [row.id]);
    }
    await page.goto('https://ggme.xyz/user');
  }
  await sleep(3000);
  let selecter, innerHtml;
  selecter = 'body > main > div.container > section > div.ui-card-wrap > div:nth-child(1) > div > div.user-info-main > div.nodemain > div.nodehead.node-flex > div';
  await page.waitForSelector(selecter, { timeout: 15000 })
  .then(async ()=>{
    console.log('进入页面：',await page.evaluate((selecter)=>document.querySelector(selecter).innerHTML,selecter));
    //await page.goto('https://ggme.xyz/user');
  });
//////////do something
  
    //余额
    innerHtml = await page.evaluate(() => document.querySelector( 'body > main > div.container > section > div.ui-card-wrap > div:nth-child(2) > div > div.user-info-main > div.nodemain > div.nodemiddle.node-flex > div' ).innerHTML.trim());
    innerHtml = innerHtml.split(' ')[0];
    //console.log( "余额: " + innerHtml);
    row.balance = Number(innerHtml);
    //等级过期时间 xpath
    innerHtml = await page.evaluate(() => document.evaluate('/html/body/main/div[2]/section/div[1]/div[6]/div[1]/div/div/dl/dd[1]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.innerHTML );
    innerHtml = innerHtml.split(';')[1];
    //console.log( "等级过期时间: " +  innerHtml);
    row.level_end_time = innerHtml;
    //上次使用时间
    innerHtml = await page.evaluate(() => document.querySelector("body > main > div.container > section > div.ui-card-wrap > div.col-xx-12.col-sm-4 > div:nth-child(1) > div > div > dl > dd:nth-child(25)" ).innerHTML.trim());
    innerHtml = innerHtml.split(';')[1];
    console.log( "上次使用时间: " +  innerHtml);
    if (innerHtml == '从未使用')
      row.last_used_time = null;
    else
      row.last_used_time = innerHtml;
    //是否清空fetcher
    let unixtimes = [
      new Date(row.regtime).getTime(),
      new Date(row.last_used_time).getTime(),
      new Date(row.fetch_time).getTime()
    ];
    if (row.fetcher !== null){
      //console.log((Date.now()-Math.max(...unixtimes))/60*60*1000),unixtimes[1]<unixtimes[2]?3:24);
      if ((Date.now()-Math.max(...unixtimes))/(60*60*1000)>(unixtimes[1]<unixtimes[2]?3:24)){  
        await page.click("body > main > div.container > section > div.ui-card-wrap > div.col-xx-12.col-sm-8 > div.card.quickadd > div > div > div.cardbtn-edit > div.reset-flex > a")
        await page.waitForFunction(
          'document.querySelector("#msg").innerText.includes("已重置您的订阅链接")',
          {timeout:5000}
        ).then(async ()=>{
          console.log('超时重置：',await page.evaluate(()=>document.querySelector('#msg').innerHTML));
          await sleep(3000);        
        });     
        row.fetcher = null;
        //console.log('清空fetcher',new Date(row.regtime).Format('yyyy-MM-dd hh:mm:ss'),new Date(row.last_used_time).Format('yyyy-MM-dd hh:mm:ss'),new Date(row.fetch_time).Format('yyyy-MM-dd hh:mm:ss'));
        if (unixtimes[1]<unixtimes[2]){
          await pool.query("UPDATE email SET getrss = 1  WHERE email = ?", [row.fetcher]);
          console.log('三小时内未使用');
          needreset = true;
        }
        if ((Date.now()-Math.max(unixtimes[0],unixtimes[2]))/(24*60*60*1000)>10){
          await page.click("body > main > div.container > section > div.ui-card-wrap > div.col-xx-12.col-sm-8 > div.card.quickadd > div > div > div.cardbtn-edit > div.reset-flex > a")
          await page.waitForFunction(
            'document.querySelector("#msg").innerText.includes("已重置您的订阅链接")',
            {timeout:5000}
          ).then(async ()=>{
            //console.log('重置订阅链接',await page.evaluate(()=>document.querySelector('#msg').innerHTML));
            await sleep(3000);        
          });     
          row.fetcher = null;
          //console.log('清空fetcher',new Date(row.regtime).Format('yyyy-MM-dd hh:mm:ss'),new Date(row.last_used_time).Format('yyyy-MM-dd hh:mm:ss'),new Date(row.fetch_time).Format('yyyy-MM-dd hh:mm:ss'));
          console.log('10天重置');
          needreset = true;
        }  
    }

      //今日已用
      selecter = 'body > main > div.container > section > div.ui-card-wrap > div.col-xx-12.col-sm-4 > div:nth-child(2) > div > div > div:nth-child(1) > div.label-flex > div > code';
      innerHtml =await page.evaluate((selecter)=>document.querySelector(selecter).innerText,selecter);
      console.log( "今日已用: " + innerHtml,Number(innerHtml.slice(0,innerHtml.length-2)));
      if (innerHtml.slice(-2) == 'GB'){
        if (Number(innerHtml.slice(0,innerHtml.length-2))>4){
          //console.log(new Date().setHours(0,0,0,0),new Date(row.rss_refresh_time).getTime(),new Date(new Date().setHours(0,0,0,0)),new Date(row.rss_refresh_time));
          //console.log((new Date().setHours(0,0,0,0)-new Date(row.rss_refresh_time).getTime())>0);
          if((new Date().setHours(0,0,0,0)-new Date(row.rss_refresh_time).getTime())>0&&row.fetcher!=null&&row.id>10){
            await page.click("body > main > div.container > section > div.ui-card-wrap > div.col-xx-12.col-sm-8 > div.card.quickadd > div > div > div.cardbtn-edit > div.reset-flex > a")
            await page.waitForFunction(
              'document.querySelector("#msg").innerText.includes("已重置您的订阅链接")',
              {timeout:5000}
            ).then(async ()=>{
              console.log('超流量重置：',await page.evaluate(()=>document.querySelector('#msg').innerHTML));
              await sleep(3000); 
            });  
            await pool.query("UPDATE email SET getrss = 1  WHERE email = ?", [row.fetcher]); //屏蔽email
            row.fetcher = null;   
            row.rss_refresh_time = (new Date).Format('yyyy-MM-dd hh:mm:ss');
            needreset = true;
          }
        }
      }
      if (needreset) {
        
      }
      //rss
      innerHtml = await page.evaluate(() => document.querySelector( '#all_v2ray_windows > div.float-clear > input' ).value.trim());
      //console.log( "rss: " + innerHtml);
      row.rss = innerHtml;
    //await sleep(10000);
    await page.click('#checkin', {delay:200})
    .then(async ()=>{
        await page.waitForFunction('document.querySelector("#msg").innerText.includes("获得了")',{timeout:3000})
        .then(async ()=>{
          console.log('签到成功',await page.evaluate(()=>document.querySelector('#msg').innerHTML));
          //await page.goto('https://ggme.xyz/user');
        })
        .catch((err)=>console.log('签到超时'));
      })
    .catch((err)=>console.log('今日已签到'));
    await sleep(2000);
    return row;
}  

async function  main () {
    let runId = github.context.runId;
    //console.log(await sqlite.open('./freeok.db'))
    const browser = await puppeteer.launch({ 
        headless: runId?true:false ,
        args: ['--window-size=1920,1080'],
        defaultViewport: null,
        ignoreHTTPSErrors: true
    });
    const page = await browser.newPage();
    // 当页面中的脚本使用“alert”、“prompt”、“confirm”或“beforeunload”时发出
    page.on('dialog', async dialog => {
        //console.info(`➞ ${dialog.message()}`);
        await dialog.dismiss();
    });
    console.log(`*****************开始freeok签到 ${Date()}*******************\n`);  
    //let sql = "SELECT * FROM freeok where id = 9;"
    let sql = "SELECT * FROM freeok where level > 0  order by sign_time asc limit 20;"
    //let sql = "SELECT * FROM freeok where level IS NULL and fetcher is null order by sign_time asc limit 1;"
    let r =  await pool.query(sql, []);
    let i = 0;
    console.log(`共有${r[0].length}个账户要签到`);
    for (let row of r[0]) {
      i++;
      console.log("user:",i, row.id, row.usr);      
      if (i % 3 == 0) await sleep(3000).then(()=>console.log('暂停3秒！'));
      if (row.usr&&row.pwd) await freeokSign(row,page)
      .then(async row => {
        //console.log(JSON.stringify(row));    
        let sql,arr;   
          sql = 'UPDATE `freeok` SET `cookies`=?,`balance`=?,`level_end_time`=?,`rss`=?,`last_used_time`=?,`fetcher`=?,`sign_time`=NOW(),`rss_refresh_time`=? WHERE `id`=?';
          arr = [row.cookies,row.balance,row.level_end_time,row.rss,row.last_used_time,row.fetcher,row.rss_refresh_time,row.id];
          sql = await pool.format(sql,arr);
          //console.log(sql);
          await pool.query(sql)
          .then((reslut)=>{console.log('changedRows',reslut[0].changedRows);sleep(3000);})
          .catch((error)=>{console.log('UPDATEerror: ', error.message);sleep(3000);});
        })
      .catch(error => console.log('signerror: ', error.message));
     }
    //sqlite.close();
    await pool.end();
    if ( runId?true:false ) await browser.close();
}
main();

