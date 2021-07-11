const fs = require("fs");
//const sqlite = require('./asqlite3.js')
const puppeteer = require('puppeteer');
const core = require('@actions/core');
const github = require('@actions/github');
const myfuns = require('./myfuns.js');
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
async function  freeokBuy (row,page) {
    await myfuns.clearBrowser(page); //clear all cookies
    await page.goto('https://v2.freeyes.xyz/auth/login',{timeout: 10000}).catch((err)=>console.log('首页超时'));
  //await page.waitForSelector("#email");
    await page.type('#email', row.usr, {delay: 20});
    await page.type('#passwd', row.pwd, {delay: 20});
    await Promise.all([
      page.waitForNavigation({timeout: 5000}), 
      //等待页面跳转完成，一般点击某个按钮需要跳转时，都需要等待 page.waitForNavigation() 执行完毕才表示跳转成功
      page.click('#login'),    
    ])
    .then(()=>console.log ('登录成功'))
    .catch(async (err)=>{
      let msg = await page.evaluate(()=>document.querySelector('#msg').innerHTML);
      if (msg == "账号在虚无之地，请尝试重新注册") {
        await pool.query("UPDATE freeok SET Invalid = 1  WHERE id = ?", [row.id]);
        return Promise.reject(new Error('账号在虚无之地'));
      }else{
        return Promise.reject(new Error('登录失败'));
      }    
    });
    //await page.goto('https://v2.freeyes.xyz/user')
    let inner_html = await page.evaluate(() => document.querySelector( 'body > main > div.container > section > div.ui-card-wrap > div:nth-child(2) > div > div.user-info-main > div.nodemain > div.nodemiddle.node-flex > div' ).innerHTML.trim());
    inner_html = inner_html.split(' ')[0];
    //console.log( "余额: " + inner_html);
    row.balance = Number(inner_html);
    //等级过期时间 xpath
    inner_html = await page.evaluate(() => document.evaluate('/html/body/main/div[2]/section/div[1]/div[6]/div[1]/div/div/dl/dd[1]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.innerHTML );
    inner_html = inner_html.split(';')[1];
    //console.log( "等级过期时间: " +  inner_html);
    row.level_end_time = inner_html;
    //上次使用时间
    inner_html = await page.evaluate(() => document.querySelector("body > main > div.container > section > div.ui-card-wrap > div.col-xx-12.col-sm-4 > div:nth-child(1) > div > div > dl > dd:nth-child(25)" ).innerHTML.trim());
    inner_html = inner_html.split(';')[1];
    console.log( "上次使用时间: " +  inner_html);
    if (inner_html == '从未使用')
        row.last_used_time = null;
    else
       row.last_used_time = inner_html;
    //rss
    inner_html = await page.evaluate( () => document.querySelector( '#all_v2ray_windows > div.float-clear > input' ).value.trim());
    //console.log( "rss: " + inner_html);
    row.rss = inner_html;
    let  date = new Date(row.level_end_time);
    if  (date.getTime() < Date.now()){
      //await page.waitFor(1500);
      await page.goto('https://v2.freeyes.xyz/user/shop');
      await page.click('body > main > div.container > div > section > div.shop-flex > div:nth-child(2) > div > a', {
        delay: 200
      })
      .catch(async (err) => {
        if (await page.$('#reactive',{timeout: 3000})) {
            await pool.query("UPDATE freeok SET Invalid = 1  WHERE id = ?", [row.id]);
          return Promise.reject(new Error('账户被限制'));
        }else{
          return Promise.reject(new Error('购买失败'));
        }
      });
      await page.waitFor(1500)
      await page.click('#coupon_input', {
        delay: 200
      });
      await page.waitFor(1500);
      //await page.waitForSelector("#order_input");
      await page.click('#order_input', {
        delay: 200
      });  
      await page.waitFor(1500);
      inner_html = await page.evaluate(()=>document.querySelector('#msg').innerHTML);
      if (inner_html == '')
      console.log( "购买成功！");
      else
      console.log( "购买套餐结果: " + inner_html );
      }
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

    console.log(`*****************开始freeok购买套餐 ${Date()}*******************\n`);  
    //let sql = "SELECT * FROM freeok WHERE Invalid IS NULL  and (level_end_time < NOW() or level_end_time IS NULL) order by update_time asc limit 20;"
    let sql = "SELECT * FROM freeok WHERE id > 40 order by update_time asc limit 2;"
    let r =  await pool.query(sql, []);
    let i = 0;
    console.log(`共有${r[0].length}个账户要购买套餐`);
    for (let row of r[0]) {
      i++;
      console.log("user:", row.id, row.usr);
      if (i % 3 == 0) await myfuns.Sleep(3000).then(()=>console.log('暂停3秒！'));
      if (row.usr&&row.pwd) await freeokBuy(row,page)
      .then(async row => {
        console.log(row);
        if (row.last_userd_time === null){
          let sql =
          `UPDATE freeok  
          SET balance = ?, level_end_time = ?, rss = ?,
          fetcher = (case when datediff(NOW(),regtime)>3  then null else fetcher end)	
          WHERE id =?;
          `
          await pool.query(sql, [row.balance,row.level_end_time,row.rss,row.id])
          .then((reslut)=>{console.log('changedRows',reslut[0].changedRows);myfuns.Sleep(3000);})
          .catch(error => console.log('UPDATEerror: ', error.message));
        }else{
          let sql =
          `UPDATE freeok  
          SET balance = ?, level_end_time = ?, last_used_time = ?, rss = ?,
          fetcher = (case when datediff(NOW(),last_used_time)>3  then null else fetcher end)	
          WHERE id =?;
          `
          await pool.query(sql, [row.balance, row.level_end_time, row.last_used_time, row.rss, row.id])
          .then((reslut)=>{console.log('changedRows',reslut[0].changedRows);myfuns.Sleep(3000);})
          .catch(error => console.log('UPDATEerror: ', error.message));
        }

        })
      .catch(error => console.log('error: ', error.message));
     }
    //sqlite.close();
    await pool.end();
    if ( runId?true:false ) await browser.close();
}
main().catch(error => console.log('main-error: ', error.message));