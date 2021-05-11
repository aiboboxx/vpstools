const fs = require("fs");
//const sqlite = require('./asqlite3.js')
const puppeteer = require('puppeteer');
const core = require('@actions/core');
const github = require('@actions/github');
const myfuns = require('./myfuns.js');
Date.prototype.Format = myfuns.Format;

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

    let cookies,allck = JSON.parse(fs.readFileSync('./allck.json', 'utf8'));
    //let cookies = JSON.parse(fs.readFileSync('./cookie.txt', 'utf8'));
    cookies = allck['aiboboxx@163.com'];
    await page.setCookie(...cookies);
    await page.goto('https://mail.163.com/');
    await myfuns.Sleep(3000);
    cookies = await page.cookies();
    allck['aiboboxx@163.com'] = cookies;
    //sqlite.close();
    fs.writeFileSync('./allck.json', JSON.stringify(allck, null, '\t'))
    if ( runId?true:false ) await browser.close();
}
main();

