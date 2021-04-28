const fs = require("fs")
const puppeteer = require('puppeteer');
const core = require('@actions/core');
const github = require('@actions/github');
const myfuns = require('./myfuns.js');
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: 'app.aiboboxx.ml',
  user: 'aiboboxx',
  password : 'LaI9DCyNBpEKWe9pn5B',   
  port: '33060',  
  database: 'mydb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
async function  freeokBuy (row,page) {
  await myfuns.clearBrowser(page); //clear all cookies
  await page.goto('https://v2.freeok.xyz/auth/login',{timeout: 10000}).catch((err)=>console.log('首页超时'));
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
    //await page.waitFor(1500);
    //await page.goto('https://v2.freeok.xyz/user')
    inner_html = await page.evaluate( () => document.querySelector( '#all_v2ray_windows > div.float-clear > input' ).value.trim());
    console.log( "rss: " + inner_html);
    row.rss = inner_html;
    return row;
}  

async function  main () {
    let runId = github.context.runId;
    const browser = await puppeteer.launch({ 
        headless: runId?true:false ,
        args: ['--window-size=1920,1080'],
        defaultViewport: null,
        ignoreHTTPSErrors: true
    });
    const page = await browser.newPage();
    page.on('dialog', async dialog => {
        await dialog.dismiss();
    });
    console.log(`*****************开始freeokgetrss ${Date()}*******************\n`);  
    let sql = "SELECT * FROM freeok WHERE Invalid IS NULL and rss IS NULL;"
    let r = await pool.query(sql, []);
    let i = 0;
    console.log(`共有${r[0].length}个账户要getrss`);
    for (let row of r[0]) {
      i++;
      console.log("user:",i, row.id, row.usr);      
      if (i % 3 == 0) await myfuns.Sleep(3000).then(()=>console.log('暂停3秒！'));
      if (row.usr&&row.pwd) await freeokBuy(row,page)
      .then(async row => {
        //console.log(row);
        await pool.query("UPDATE freeok SET rss = ?, update_time = NOW()  WHERE id = ?", [row.rss,row.id])
        .then((reslut)=>{console.log(row.usr,"update_time");myfuns.Sleep(3000);})
        })
      .catch(error => console.log('error: ', error.message));
     }
     await pool.end();
    if ( runId?true:false ) await browser.close();
}
main().catch(error => console.log('main-error: ', error.message));

