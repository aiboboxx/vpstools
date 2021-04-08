const fs = require("fs")
const sqlite = require('./asqlite3.js')
const puppeteer = require('puppeteer');
const core = require('@actions/core');
const github = require('@actions/github');
const myfuns = require('./myfuns.js');
Date.prototype.Format = myfuns.Format;
async function  mattersPost (rsss,page) {
    await page.goto('https://matters.news/');
    await page.waitForSelector('#__next > div > main > article > header > section > section > section > button.jsx-2415535273.container.isTransparent.centering-y.spacing-x-loose.bg-active-grey-lighter > div > div');
    await page.waitFor(500);
    await page.click('#__next > div > main > article > header > section > section > section > button.jsx-2415535273.container.isTransparent.centering-y.spacing-x-loose.bg-active-grey-lighter > div > div');
    await page.waitForSelector('#field-email');
    //await page.waitFor(1000);
    await page.type('#field-email', 'aiboboxx@gmail.com');
    await page.type('#field-password', '780830lp');
    await Promise.all([
      page.waitForNavigation(), 
      //等待页面跳转完成，一般点击某个按钮需要跳转时，都需要等待 page.waitForNavigation() 执行完毕才表示跳转成功
      page.click('body > reach-portal > div:nth-child(3) > div > div > div.l-container.full > div > div > header > section.jsx-53354085.right > button > div > span > span'),    
    ])
    .then( () =>  console.log ('登录成功'))
    .catch( (err) => console.log ("登录失败: "+ err));
    //await page.waitFor(1500);
    await page.waitForSelector("#__next > div > main > nav > section > ul > li:nth-child(5) > button > div > span > span");
    await Promise.all([
        page.click('#__next > div > main > nav > section > ul > li:nth-child(5) > button > div > span > span'),
        page.waitForNavigation()  
    ])
    let content = `
每个订阅地址限制一个客户端使用，长期可用
v2ray 免费点阅地址 ${(new Date()).Format("yyyy-MM-dd") }更新
${rsss}
获取专属的私人订阅请留邮箱，或到以下地址获取
https://www.aiboboxx.ml/post/v2ray-mian-fei-dian-yue-di-zhi
`;
    await page.waitForSelector('#editor-article-container > div > div > div.ql-editor.ql-blank');
    await page.type('#editor-article-container > div > div > div.ql-editor.ql-blank', content);
    await page.type('#__next > div > main > article > section > div > header > input[type=text]',
        `私人专属 v2ray 免费点阅地址 ${(new Date()).Format("yyyy-MM-dd") }更新`
        );
    await page.waitForSelector("#__next > div > main > article > header > section > section.jsx-1977480329.right > button > div > span > span");
    await page.waitFor(1000);
    page.click('#__next > div > main > article > header > section > section.jsx-1977480329.right > button > div > span > span');
/*     await Promise.all([
        page.click('#__next > div > main > article > header > section > section.jsx-1977480329.right > button > div > span > span'),
        page.waitForNavigation()  
    ]); */
    await page.waitFor(1500);
    await page.waitForSelector("body > reach-portal > div:nth-child(3) > div > div > div.l-container.full > div > div > header > section.jsx-53354085.right > button > div > span > span");
    await page.waitFor(1500);
    await Promise.all([
        page.click('body > reach-portal > div:nth-child(3) > div > div > div.l-container.full > div > div > header > section.jsx-53354085.right > button > div > span > span')
        .then(()=>console.log(`最后发布`)),
        page.waitForNavigation()  
    ]);
}  
async function  main () {
    let runId = github.context.runId;
        console.log(await sqlite.open('./freeok.db'))
    const browser = await puppeteer.launch({ 
        headless: runId?true:false ,
        args: ['--window-size=1920,1080','--proxy-server=127.0.0.1:10809'],
        defaultViewport: null,
        ignoreHTTPSErrors: true
    });
    const page = await browser.newPage();
    // 当页面中的脚本使用“alert”、“prompt”、“confirm”或“beforeunload”时发出
    page.on('dialog', async dialog => {
        //console.info(`➞ ${dialog.message()}`);
        await dialog.dismiss();
    });
    console.log(`*****************开始matters发帖 ${Date()}*******************\n`);  
    var rsss = '';
    var sql = "SELECT * FROM freeok WHERE id > 3  ORDER BY RANDOM() limit 3;"
    var r = await sqlite.all(sql, []);
    console.log(`共有${r.length}个账户要发布`);
    for (let row of r) {
      //console.log("user:", row.usr ,row.rss);
      rsss = rsss + row.rss +'\n';
    }
    console.log(rsss);
    sqlite.close();
    await mattersPost(rsss,page);
    if ( runId?true:false ) await browser.close();
}
main().catch(error => console.log('error: ', error.message));
