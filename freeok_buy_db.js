const fs = require("fs")
const sqlite = require('./asqlite3.js')
const puppeteer = require('puppeteer');
const core = require('@actions/core');
const github = require('@actions/github');

async function  freeokBuy (row,page) {
    await page.goto('https://v2.freeok.xyz/auth/login');
  //await page.waitForSelector("#email");
    await page.type('#email', row.usr, {delay: 20});
    await page.type('#passwd', row.pwd, {delay: 20});
    await Promise.all([
      page.waitForNavigation({timeout: 10000}), 
      //等待页面跳转完成，一般点击某个按钮需要跳转时，都需要等待 page.waitForNavigation() 执行完毕才表示跳转成功
      page.click('#login'),    
    ])
    .then( () =>  console.log ('登录成功'))
    .catch( (err) => console.log ("登录失败: "+ err));
    //await page.waitFor(1500);
    await page.goto('https://v2.freeok.xyz/user/shop');
    await page.click('body > main > div.container > div > section > div.shop-flex > div:nth-child(2) > div > a', {
      delay: 200
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
    await page.waitFor(2500);
    let inner_html = await page.evaluate( () => document.querySelector( '#msg' ).innerHTML );
    console.log( "购买套餐结果: " + inner_html );
    await page.goto('https://v2.freeok.xyz/user')
    inner_html = await page.evaluate( () => document.querySelector( 'body > main > div.container > section > div.ui-card-wrap > div:nth-child(2) > div > div.user-info-main > div.nodemain > div.nodemiddle.node-flex > div' ).innerHTML.trim());
    inner_html = inner_html.split(' ')[0];
    console.log( "余额: " + inner_html);
    row.balance = Number(inner_html);
    //等级过期时间
    inner_html = await page.evaluate( () => document.evaluate('/html/body/main/div[2]/section/div[1]/div[6]/div[1]/div/div/dl/dd[1]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.innerHTML );
    inner_html = inner_html.split(';')[1];
    console.log( "等级过期时间: " +  inner_html);
    row.level_end_time = inner_html;
    await page.goto('https://v2.freeok.xyz/user/logout');
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
    console.log(`*****************开始freeok购买套餐*******************\n`);  
    var sql = "SELECT * FROM freeok WHERE balance != 0 and level_end_time < datetime('now','+8 hour');"
    var r = await sqlite.all(sql, []);
    for (let row of r) {
      console.log("user:", row.id, row.usr, row.pwd);
      if (row.usr&&row.pwd) await freeokBuy(row,page).then(row => {
        //console.log(row);
        sqlite.run("UPDATE freeok SET balance = ?, level_end_time = ?, update_time = datetime('now')  WHERE id = ?", [row.balance,row.level_end_time,row.id])
        .then((reslut)=>console.log(reslut))
      });
     }
    sqlite.close();
    if ( runId?true:false ) await browser.close();
}
main().catch(error => console.log('error: ', error.message));
