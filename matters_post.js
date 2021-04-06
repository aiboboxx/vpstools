const fs = require("fs")
const sqlite = require('./asqlite3.js')
const puppeteer = require('puppeteer');
const core = require('@actions/core');
const github = require('@actions/github');

async function  mattersPost (rsss,page) {
    await page.goto('https://matters.news/');
    await page.waitForSelector('#__next > div > main > article > header > section > section > section > button.jsx-2415535273.container.isTransparent.centering-y.spacing-x-loose.bg-active-grey-lighter > div > div');
    await page.waitFor(1000);
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
    await Promise.all([
        page.click('#__next > div > main > article > header > section > section.jsx-1977480329.right > button > div > span > span'),
        page.waitForNavigation()  
    ]);
    await page.waitForSelector("body > reach-portal > div:nth-child(3) > div > div > div.l-container.full > div > div > header > section.jsx-53354085.right > button > div > span > span");
    await page.waitFor(1500);
    await Promise.all([
        page.click('body > reach-portal > div:nth-child(3) > div > div > div.l-container.full > div > div > header > section.jsx-53354085.right > button > div > span > span'),
        page.waitForNavigation()  
    ]);
}  
// 对Date的扩展，将 Date 转化为指定格式的String  
// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符，   
// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)   
// 例子：   
// (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423   
// (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18   
  
Date.prototype.Format = function(fmt){  
    var o = {  
         "M+": this.getMonth()+1,  
         "d+": this.getDate(),  
         "H+": this.getHours(),  
         "m+": this.getMinutes(),  
         "s+": this.getSeconds(),  
         "S+": this.getMilliseconds()  
    };  
    //因位date.getFullYear()出来的结果是number类型的,所以为了让结果变成字符串型，下面有两种方法：  
    if(/(y+)/.test(fmt)){  
        //第一种：利用字符串连接符“+”给date.getFullYear()+""，加一个空字符串便可以将number类型转换成字符串。  
  
        fmt=fmt.replace(RegExp.$1,(this.getFullYear()+"").substr(4-RegExp.$1.length));  
    }  
    for(var k in o){  
        if (new RegExp("(" + k +")").test(fmt)){  
  
            //第二种：使用String()类型进行强制数据类型转换String(date.getFullYear())，这种更容易理解。  
  
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(String(o[k]).length)));  
        }  
    }     
    return fmt;  
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
