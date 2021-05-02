const fs = require("fs");
//const sqlite = require('./asqlite3.js')
const puppeteer = require('puppeteer');
const core = require('@actions/core');
const github = require('@actions/github');
const myfuns = require('./myfuns.js');
Date.prototype.Format = myfuns.Format;
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: 'app.aiboboxx.ml',
  user: 'aiboboxx',
  password : 'LaI9DCyNBpEKWe9pn5B',   
  port: '33060',  
  database: 'mydb',
  waitForConnections: true, //连接超额是否等待
  connectionLimit: 10, //一次创建的最大连接数
  queueLimit: 0 //可以等待的连接的个数
});
async function  freeokSign  (row,page) {
    //let inner_html, date;
    await myfuns.clearBrowser(page); //clear all cookies
    await page.goto('https://v2.freeok.xyz/auth/login',{timeout: 10000}).catch((err)=>console.log('首页超时'));
    await myfuns.Sleep(1000);
    //await page.waitForSelector("#email");
    await page.type('#email', row.usr, {delay: 20});
    await page.type('#passwd', row.pwd, {delay: 20});
    await myfuns.Sleep(1000);
    await Promise.all([
      page.waitForNavigation({timeout: 10000}), 
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
    if (await page.$('#reactive',{timeout:3000})) {
      await pool.query("UPDATE freeok SET Invalid = 1  WHERE id = ?", [row.id]);
      return Promise.reject(new Error('账户被限制'));
    }
    await myfuns.Sleep(1000);
    let selecter, inner_html;
    selecter = 'body > main > div.container > section > div.ui-card-wrap > div:nth-child(1) > div > div.user-info-main > div.nodemain > div.nodehead.node-flex > div';
    await page.waitForSelector(selecter,{timeout:3000})
    .then(async ()=>{
      console.log('进入页面：',await page.evaluate((selecter)=>document.querySelector(selecter).innerHTML,selecter));
      //await page.goto('https://v2.freeok.xyz/user');
    });
    //余额
    inner_html = await page.evaluate(() => document.querySelector( 'body > main > div.container > section > div.ui-card-wrap > div:nth-child(2) > div > div.user-info-main > div.nodemain > div.nodemiddle.node-flex > div' ).innerHTML.trim());
    inner_html = inner_html.split(' ')[0];
    //console.log( "余额: " + inner_html);
    row.balance = Number(inner_html);
    //等级过期时间
    inner_html = await page.evaluate(() => document.evaluate('/html/body/main/div[2]/section/div[1]/div[6]/div[1]/div/div/dl/dd[1]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.innerHTML );
    inner_html = inner_html.split(';')[1];
    //console.log( "等级过期时间: " +  inner_html);
    row.level_end_time = inner_html;

    inner_html = await page.evaluate(() => document.querySelector("body > main > div.container > section > div.ui-card-wrap > div.col-xx-12.col-sm-4 > div:nth-child(1) > div > div > dl > dd:nth-child(25)").innerHTML.trim());
    inner_html = inner_html.split(';')[1];
    console.log( "上次使用时间: " +  inner_html);
    if (inner_html == '从未使用')
      row.last_used_time = null;
    else
      row.last_used_time = inner_html;
    //是否清空fetcher
    if (row.fetcher !== null){
      let unixtimes = [
        new Date(row.regtime).getTime(),
        new Date(row.last_used_time).getTime(),
        new Date(row.fetch_time).getTime()
      ];
      console.log((Date.now()-Math.max(...unixtimes))/(24*60*60*1000),unixtimes[1]<unixtimes[2]?0.5:1.5);
      if ((Date.now()-Math.max(...unixtimes))/(24*60*60*1000)>(unixtimes[1]<unixtimes[2]?0.5:1.5)){
        await pool.query("UPDATE email SET getrss = 1  WHERE email = ?", [row.fetcher]);
        row.fetcher = null;
        //console.log('清空fetcher',row.regtime,row.last_used_time,row.fetch_time);
        console.log('清空fetcher');
      }else{
        //console.log(row.fetcher,row.regtime,row.last_used_time,row.fetch_time);
      }
    }
      //今日已用
      selecter = 'body > main > div.container > section > div.ui-card-wrap > div.col-xx-12.col-sm-4 > div:nth-child(2) > div > div > div:nth-child(1) > div.label-flex > div > code';
      inner_html =await page.evaluate((selecter)=>document.querySelector(selecter).innerText,selecter);
      console.log( "今日已用: " + inner_html,Number(inner_html.slice(0,inner_html.length-2)));
      if (inner_html.slice(-2) == 'GB'){
        if (Number(inner_html.slice(0,inner_html.length-2))>6){
          await page.click("body > main > div.container > section > div.ui-card-wrap > div.col-xx-12.col-sm-8 > div.card.quickadd > div > div > div.cardbtn-edit > div.reset-flex > a")
          await page.waitForFunction(
            'document.querySelector("#msg").innerText.includes("已重置您的订阅链接")',
            {timeout:5000}
          ).then(async ()=>{
            console.log('重置订阅链接',await page.evaluate(()=>document.querySelector('#msg').innerHTML));
            await myfuns.Sleep(2000);        
            await pool.query("UPDATE email SET getrss = 1  WHERE email = ?", [row.fetcher]);
            row.fetcher = null;   
            row.rss_refresh_time = (new Date).Format('yyyy-MM-dd hh:mm:ss');
          })   
        }
      }
      //rss
      inner_html = await page.evaluate(() => document.querySelector( '#all_v2ray_windows > div.float-clear > input' ).value.trim());
      //console.log( "rss: " + inner_html);
      row.rss = inner_html;
    //await myfuns.Sleep(10000);
    await page.click('#checkin', {delay:200})
    .then(async ()=>{
        await page.waitForFunction('document.querySelector("#msg").innerText.includes("获得了")',{timeout:3000})
        .then(async ()=>{
          console.log('签到成功',await page.evaluate(()=>document.querySelector('#msg').innerHTML));
          //await page.goto('https://v2.freeok.xyz/user');
        })
        .catch((err)=>console.log('签到超时'));
      })
    .catch((err)=>console.log('今日已签到'));
    await myfuns.Sleep(2000);
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
    let sql = "SELECT * FROM freeok where Invalid IS NULL order by sign_time asc limit 15;"
    let r =  await pool.query(sql, []);
    let i = 0;
    console.log(`共有${r[0].length}个账户要签到`);
    for (let row of r[0]) {
      i++;
      console.log("user:",i, row.id, row.usr);      
      if (i % 3 == 0) await myfuns.Sleep(3000).then(()=>console.log('暂停3秒！'));
      if (row.usr&&row.pwd) await freeokSign(row,page)
      .then(async row => {
        //console.log(JSON.stringify(row));    
        let sql,arr;   
          sql = 'UPDATE `freeok` SET `balance`=?,`level_end_time`=?,`rss`=?,`last_used_time`=?,`fetcher`=?,`sign_time`=NOW(),`rss_refresh_time`=? WHERE `id`=?';
          //sql = 'UPDATE `freeok` SET `balance`=?,`level_end_time`=?,`rss`=?,`last_used_time`=?,`fetcher`=?,`sign_time`=NOW() WHERE `id`=?';
          arr = [row.balance,row.level_end_time,row.rss,row.last_used_time,row.fetcher,row.rss_refresh_time,row.id];
          sql = await pool.format(sql,arr);
          console.log(sql);
          await pool.query(sql)
          .then((reslut)=>{console.log('changedRows',reslut[0].changedRows);myfuns.Sleep(3000);})
          .catch((error)=>{console.log('UPDATEerror: ', error.message);myfuns.Sleep(3000);});
        })
      .catch(error => console.log('signerror: ', error.message));
     }
    //sqlite.close();
    await pool.end();
    if ( runId?true:false ) await browser.close();
}
main();

