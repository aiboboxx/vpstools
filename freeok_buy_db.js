const fs = require("fs")
const sqlite = require('./asqlite3.js')
const puppeteer = require('puppeteer');
const core = require('@actions/core');
const github = require('@actions/github');
const f = require('./myfuns.js');
async function  freeokBuy (row,page) {
    await clearBrowser(page); //clear all cookies
    await page.goto('https://okgg.xyz/auth/login',{timeout: 10000}).catch((err)=>console.log('首页超时'));
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
        await sqlite.run("UPDATE freeok SET level = 1  WHERE id = ?", [row.id]);
        return Promise.reject(new Error('账号在虚无之地'));
      }else{
        return Promise.reject(new Error('登录失败'));
      }    
    });
    //await page.waitFor(1500);
    await page.goto('https://okgg.xyz/user/shop');
    await page.click('body > main > div.container > div > section > div.shop-flex > div:nth-child(2) > div > a', {
      delay: 200
    })
    .catch(async (err) => {
      if (await page.$('#reactive',{timeout: 3000})) {
        await sqlite.run("UPDATE freeok SET level = 1  WHERE id = ?", [row.id]);
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
    let innerHtml = await page.evaluate(()=>document.querySelector('#msg').innerHTML);
    if (innerHtml == '')
    console.log( "购买成功！");
    else
    console.log( "购买套餐结果: " + innerHtml );
    await page.goto('https://okgg.xyz/user')
    innerHtml = await page.evaluate( () => document.querySelector( 'body > main > div.container > section > div.ui-card-wrap > div:nth-child(2) > div > div.user-info-main > div.nodemain > div.nodemiddle.node-flex > div' ).innerHTML.trim());
    innerHtml = innerHtml.split(' ')[0];
    //console.log( "余额: " + innerHtml);
    row.balance = Number(innerHtml);
    //等级过期时间
    innerHtml = await page.evaluate( () => document.evaluate('/html/body/main/div[2]/section/div[1]/div[6]/div[1]/div/div/dl/dd[1]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.innerHTML );
    innerHtml = innerHtml.split(';')[1];
    //console.log( "等级过期时间: " +  innerHtml);
    row.level_end_time = innerHtml;
    //rss
    innerHtml = await page.evaluate( () => document.querySelector( '#all_v2ray_windows > div.float-clear > input' ).value.trim());
    console.log( "rss: " + innerHtml);
    row.rss = innerHtml;
    return row;
}  

async function  main () {
    let runId = github.context.runId;
    console.log(await sqlite.open('./freeok.db'))
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
    //let sql = "SELECT * FROM freeok WHERE level IS NULL  and (level_end_time < datetime('now') or level_end_time IS NULL);"
    let sql = "SELECT * FROM freeok WHERE id >40 limit 2;"
    let r = await sqlite.all(sql, []);
    let i = 0;
    console.log(`共有${r.length}个账户要购买套餐`);
    for (let row of r) {
      i++;
      console.log("user:", row.id, row.usr);
      if (i % 3 == 0) await sleep(3000).then(()=>console.log('暂停3秒！'));
      if (row.usr&&row.pwd) await freeokBuy(row,page)
      .then(async row => {
        //console.log(row);
        await sqlite.run("UPDATE freeok SET balance = ?, level_end_time = ?  WHERE id = ?", [row.balance,row.level_end_time,row.id])
        .then((reslut)=>{console.log(reslut);f.sleep(1000);})
        })
      .catch(error => console.log('error: ', error.message));;
     }
    sqlite.close();
    if ( runId?true:false ) await browser.close();
}
main().catch(error => console.log('main-error: ', error.message));
