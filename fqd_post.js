const fs = require("fs")
const sqlite = require('./asqlite3.js')
//const puppeteer = require('puppeteer');
const core = require('@actions/core');
const github = require('@actions/github');
const myfuns = require('./myfuns.js');
// puppeteer-extra is a drop-in replacement for puppeteer,
// it augments the installed puppeteer with plugin functionality
const puppeteer = require('puppeteer-extra')
// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())
Date.prototype.Format = myfuns.Format;
async function  autoPost (rsss,page) {
    var selecter;
    await page.goto('https://fanqiangdang.com/forum.php');
    await myfuns.Sleep(7000);
    selecter = '#ls_username';
    await page.waitForSelector(selecter,{timeout:3000})
    .catch(async ()=>{
        console.log ('等待输入用户名');
        await myfuns.Sleep(3000);
        //await page.goto('https://fanqiangdang.com/forum.php');
        await page.waitForSelector(selecter,{timeout:3000});
    });
    //await page.waitFor(1000);
    //await page.type(selecter, 'eroslp');
    await page.evaluate(() => document.querySelector('#ls_username').value = 'eroslp').then(()=>console.log('用户名：eroslp'));
    //await page.type('#ls_password', '780830lp');
    await page.evaluate(() => document.querySelector('#ls_password').value = '780830lp').then(()=>console.log('密码：780830lp'));
    selecter = '#lsform > div > div > table > tbody > tr:nth-child(2) > td.fastlg_l > button > em';
    await Promise.all([
      page.waitForNavigation({timeout:10000}), 
      //等待页面跳转完成，一般点击某个按钮需要跳转时，都需要等待 page.waitForNavigation() 执行完毕才表示跳转成功
      page.click(selecter)   
    ])
    .then(()=>console.log ('登录成功'))
    .catch(async (err) => {
        console.log ("登录失败: "+ err);
        await Promise.all([
            page.waitForNavigation({timeout:20000}), 
            //等待页面跳转完成，一般点击某个按钮需要跳转时，都需要等待 page.waitForNavigation() 执行完毕才表示跳转成功
            page.evaluate(() => document.querySelector('#lsform > div > div > table > tbody > tr:nth-child(2) > td.fastlg_l > button > em').click())    
          ])
          .then(()=>console.log ('又登录成功'),
                err=>{
                    console.log ("又登录失败: "+ err);
                    return Promise.reject(new Error('登录失败，返回'));
                });
        });
    await page.goto('https://fanqiangdang.com/forum.php?mod=post&action=newthread&fid=51');
    //await page.waitFor(1500);
    selecter = '#typeid_ctrl';
    await page.waitForSelector(selecter);
    await page.click(selecter);
    await myfuns.Sleep(500);
    selecter = '#typeid_ctrl_menu > ul > li:nth-child(3)';
    await page.click(selecter);
    await myfuns.Sleep(500);
    selecter = '#subject';
    await page.type(selecter,
        `私人专属 v2ray 免费点阅地址 ${(new Date()).Format("yyyy-MM-dd") }更新`
        );
    let content = `
每个订阅地址限制一个客户端使用，长期可用
v2ray 免费点阅地址 ${(new Date()).Format("yyyy-MM-dd") }更新
${rsss}
获取专属的私人订阅请留邮箱，或到以下地址获取
https://www.aiboboxx.ml/post/v2ray-mian-fei-dian-yue-di-zhi
`;
    //find frame index
/*     const frames = await page.mainFrame().childFrames();   
    let i = 0;
    for (let frame of frames){
        i++;
        console.log(frames.length,frame.setContent(i));//查看得到的frame列表数量
    } */
    //return;
    const frame = (await page.mainFrame().childFrames())[2];   
    await frame.waitForSelector('body');
    await frame.type('body', content);
    selecter = '#postsubmit > span';
    await page.waitForSelector(selecter);
    //await page.waitFor(1000);
    await page.click(selecter);
    await  page.waitForNavigation();
}  
async function  main () {
    let runId = github.context.runId;
        console.log(await sqlite.open('./freeok.db'))
    const browser = await puppeteer.launch({ 
        headless: runId?true:false ,
        args: ['--window-size=1920,1080'],
        defaultViewport: null,
        //ignoreHTTPSErrors: true,
        ignoreDefaultArgs: ["--enable-automation"]
    });
    const page = await browser.newPage();
    //page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36");
    // 当页面中的脚本使用“alert”、“prompt”、“confirm”或“beforeunload”时发出
    page.on('dialog', async dialog => {
        //console.info(`➞ ${dialog.message()}`);
        await dialog.dismiss();
    });
    console.log(`*****************开始matters发帖 ${Date()}*******************\n`);  
    var rsss = '';
    var sql = "SELECT id, rss FROM freeok WHERE id > 3  ORDER BY sendout_time asc limit 3;"
    var r = await sqlite.all(sql, []);
    console.log(`共有${r.length}个账户要发布`);
    for (let row of r) {
      //console.log("user:", row.usr ,row.rss);
      rsss = rsss + row.rss +'\n';
    }
    console.log(rsss); 
    await autoPost(rsss,page).then(()=>{
        for (let row of r) {
            sqlite.run("UPDATE freeok SET  sendout_time = datetime('now')  WHERE id = ?", [row.id]);
          }
    });
    sqlite.close();
    if ( runId?true:false ) await browser.close();
}
main().catch(error => console.log('error: ', error.message));
