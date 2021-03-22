const puppeteer = require('puppeteer');
const core = require('@actions/core');
const github = require('@actions/github');

(async () => {
  let runId = github.context.runId;
  const browser = await puppeteer.launch({ headless: runId?true:false });
  const page = await browser.newPage();
  // 当页面中的脚本使用“alert”、“prompt”、“confirm”或“beforeunload”时发出
  page.on('dialog', async dialog => {
    console.info(`➞ ${dialog.message()}`);
    await dialog.dismiss();
  });
  await page.goto('https://v2.freeok.xyz/auth/login');
  //await page.waitForSelector("#email");
    await page.type('#email', 'eroslp@163.com', {delay: 20});
    await page.type('#passwd', '780830lp', {delay: 20});
    await Promise.all([
      page.waitForNavigation({timeout: 10000}), 
      //等待页面跳转完成，一般点击某个按钮需要跳转时，都需要等待 page.waitForNavigation() 执行完毕才表示跳转成功
      page.click('#login'),    
    ])
    .then(function () {
      ('登录成功');
    })
    .catch(function (err) {
      console.log('登录失败');
    });
    try {
/*       await page.waitForSelector('#checkin', {
        timeout: 3000,
      }) */
      let checkin = await page.$('#checkin');
      if (checkin) {
       await Promise.all([
         checkin.click(),
         page.waitForNavigation({timeout: 10000})  
       ])
       .then(function () {
         console.log('签到成功');
       })
       .catch(function (err) {
         console.log('签到失败');
       });
       } else {
        console.log('今日已签到');
       }
    }
    catch(err){
      console.log('签到失败:' + err);
    }
   
    await page.waitFor(1000)
    await page.goto('https://v2.freeok.xyz/user/shop');
    await page.click('body > main > div.container > div > section > div.shop-flex > div:nth-child(2) > div > a', {
      delay: 200
    });
    //await setTimeout(() => {  console.log("等待两秒"); }, 2000);
    //await page.waitForSelector("#coupon_input");
    await page.waitFor(1500);
    await page.click('#coupon_input', {
      delay: 200
    });
    await page.waitFor(1500);
    //await page.waitForSelector("#order_input");
    await page.click('#order_input', {
      delay: 200
    });  
    await page.waitFor(3000);
    const inner_html = await page.evaluate( () => document.querySelector( '#msg' ).innerHTML );
    console.log( "购买套餐结果: " + inner_html );
    if ( runId?true:false ) await browser.close();
})().catch(error => console.log('error: ', error.message));
