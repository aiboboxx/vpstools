//专注于购买套餐
const fs = require("fs");
const core = require('@actions/core');
const github = require('@actions/github');
const puppeteer = require('puppeteer-extra');
// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { tFormat, sleep, clearBrowser, getRndInteger, randomOne, randomString } = require('./common.js');
const { sbFreeok, login, loginWithCookies, resetPwd,resetRss  } = require('./utils.js');
//Date.prototype.format =Format;
const mysql = require('mysql2/promise');
const runId = github.context.runId;
let browser;
let setup = {};
if (!runId) {
    setup = JSON.parse(fs.readFileSync('./setup.json', 'utf8'));
} else {
    setup = JSON.parse(process.env.SETUP);
}
const pool = mysql.createPool({
    host: setup.mysql.host,
    user: setup.mysql.user,
    password: setup.mysql.password,
    port: setup.mysql.port,
    database: setup.mysql.database,
    waitForConnections: true, //连接超额是否等待
    connectionLimit: 10, //一次创建的最大连接数
    queueLimit: 0, //可以等待的连接的个数
    timezone: '+08:00',//时区配置
    charset: 'utf8' //字符集设置
});

async function freeokBuy(row, page) {
    //let cookies = [];
    await clearBrowser(page); //clear all cookies
    if (row.cookies == null) {
        if (!runId) await login(row, page, pool);
    } else {
        await loginWithCookies(row, page, pool).catch(async () => {
            if (!runId) await login(row, page, pool);
        });
    }
    while (await page.$('#reactive')) {
        await page.type('#email', row.usr);
        await page.click('#reactive');
        await sleep(1000);
        console.log('账户解除限制');
        await page.goto('https://okgg.xyz/user');
    }
    await sleep(3000);
    let selecter, innerHtml;
    selecter = 'body > main > div.container > section > div.ui-card-wrap > div:nth-child(1) > div > div.user-info-main > div.nodemain > div.nodehead.node-flex > div';
    await page.waitForSelector(selecter, { timeout: 15000 })
        .then(async () => {
            //console.log('进入页面：', await page.evaluate((selecter) => document.querySelector(selecter).innerHTML, selecter));
            //await page.goto('https://okgg.xyz/user');
        });
    //////////do something
    let vip,balance,used
    //vip等级
    selecter = "body > main > div.container > section > div.ui-card-wrap > div:nth-child(1) > div > div.user-info-main > div.nodemain > div.nodemiddle.node-flex > div > dd"
    vip = await page.$eval(selecter, el => el.innerText)
    //console.log(vip)
    //余额
    innerHtml = await page.evaluate(() => document.querySelector('body > main > div.container > section > div.ui-card-wrap > div:nth-child(2) > div > div.user-info-main > div.nodemain > div.nodemiddle.node-flex > div').innerHTML.trim());
    balance = innerHtml.split(' ')[0];
    //console.log("余额: " + innerHtml);
    //今日已用
    selecter = 'body > main > div.container > section > div.ui-card-wrap > div.col-xx-12.col-sm-4 > div:nth-child(2) > div > div > div:nth-child(1) > div.label-flex > div > code';
    innerHtml = await page.evaluate((selecter) => document.querySelector(selecter).innerText, selecter);
    used = innerHtml
    row.used = used
    //console.log("今日已用: " + innerHtml, Number(innerHtml.slice(0, innerHtml.length - 2)));
    console.log(vip,"余额: " + balance,"今日已用: " + used)
      //上次使用时间
    innerHtml = await page.evaluate(() => document.querySelector("body > main > div.container > section > div.ui-card-wrap > div.col-xx-12.col-sm-4 > div:nth-child(1) > div > div > dl > dd:nth-child(25)").innerHTML.trim());
    row.last_used_time = innerHtml.split(';')[1];
  //console.log("上次使用时间: " + innerHtml);
    await sleep(5000);
    return row;
}
async function main() {
    //await v2raya();
    browser = await puppeteer.launch({
        headless: runId ? true : false,
        //headless: true,
        args: [
            '--window-size=1920,1080',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            runId ? '' : setup.proxy.changeip
            //setup.proxy.normal
        ],
        defaultViewport: null,
        ignoreHTTPSErrors: true
    });
    //console.log(await sqlite.open('./freeok.db'))
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36');
    await page.authenticate({ username: setup.proxy.usr, password: setup.proxy.pwd });
    page.on('dialog', async dialog => {
        //console.info(`➞ ${dialog.message()}`);
        await dialog.dismiss();
    });

    console.log(`*****************开始查看payUser ${Date()}*******************\n`);
    let sql = `SELECT id,usr,pwd,cookies
             FROM freeok 
             WHERE balance >1 
             order by id;`
    //let sql = "SELECT * FROM freeok WHERE id>40 order by update_time asc limit 2;"
    let r = await pool.query(sql);
    let i = 0;
    console.log(`共有${r[0].length}个账户已购买套餐`);
    for (let row of r[0]) {
        i++;
        console.log("user:", i, row.id, row.usr);
        if (i % 3 === 0) await sleep(3000)
        if (row.usr && row.pwd) await freeokBuy(row, page)
            .then(async () => {
                console.log("成功");
                //console.log(JSON.stringify(row));    
              let sql, arr;
                sql = 'UPDATE `freeok` SET `cookies`=?,`used`=?,`last_used_time`=? WHERE `id` = ?';
                arr = [row.cookies,row.used,row.last_used_time,row.id];
                sql = await pool.format(sql, arr);
                //console.log(sql);
                await pool.query(sql)
                    .then((result) => { console.log('changedRows', result[0].changedRows); sleep(3000); })
                    .catch((error) => { console.log('UPDATEerror: ', error.message); sleep(3000); })
            })
            .catch(async (error) => {
                console.log('buyerror: ', error.message)
            });
    }
    await pool.end();
    if (runId ? true : false) await browser.close();
}
main();

