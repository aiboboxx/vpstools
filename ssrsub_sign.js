const fs = require("fs");
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const {sleep, clearBrowser, getRndInteger, randomOne, randomString, waitForString,cutString} = require('./common.js');
const dayjs = require('dayjs')
let utc = require('dayjs/plugin/utc') // dependent on utc plugin
let timezone = require('dayjs/plugin/timezone')
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault("Asia/Hong_Kong")
const mysql = require('mysql2/promise');
let runId = process.env.runId;
let browser;
let setup = JSON.parse(fs.readFileSync('./setup.json', 'utf8'));
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

main()
async function freeokSign(row, page) {
  await clearBrowser(page); //clear all cookies
  await login(row, page)
  await sleep(3000)
  let selecter, innerHtml,isCancel = false, isBuy = false
  if (await page.$("#main-container > div > div.alert.alert-danger > p > a")) isCancel = true
  if (await page.$("#main-container > div > div > div:nth-child(1) > div > div.block-content > div > div > div > div:nth-child(1) > div > p > span")) {
    isBuy = false
  }else{
    isBuy = true
  }
/*   selecter = "#main-container > div > div.alert.alert-danger > p > a"
  await page.waitForSelector(selecter,{ timeout: 3000})
  .then(async () => {
    await cancel(page)
  }).catch(async (error)=>{console.log('无未支付订单');})
  selecter = "#main-container > div > div > div:nth-child(1) > div > div.block-content > div > div > div > div:nth-child(1) > div > p > span"
  await page.waitForSelector(selecter,{ timeout: 3000})
  .catch(async (error)=>{
    console.log('无订阅');
    await buy(row, page)
    await sleep(2000)
  }) */
  if (isCancel) await cancel(page)
  if (isBuy) await buy(row, page)
  await page.goto("https://sub.ssrsub.com/#/subscribe",{ timeout: 8000})
  selecter = "#main-container > div > div.block.block-rounded.mb-4 > div > div > div:nth-child(1) > div > p > span"
  await page.waitForSelector(selecter,{ timeout: 5000})
  innerHtml = await page.evaluate((selecter) => document.querySelector(selecter).innerText, selecter);
  let traffic = cutString(innerHtml,"已用 "," / ")
  console.log("流量: " , innerHtml,traffic);
  row.used = traffic
  switch (traffic.slice(-2,-1)) {
    case 'G':
      row.used_num = Number(traffic.slice(0,-2))
      break
    default:
      row.used_num = 0
      break
  }
  console.log(row.used,row.used_num)
  selecter = "#main-container > div > div.block.block-rounded.mb-4 > div > div > div:nth-child(1) > p > span"
  await page.waitForSelector(selecter,{ timeout: 5000})
  innerHtml = await page.evaluate((selecter) => document.querySelector(selecter).innerText, selecter);
  let datetime = cutString(innerHtml,"于 "," 到期")
  console.log("到期时间 " , innerHtml,datetime);
  if (dayjs.tz().isAfter(dayjs.tz(row.regtime).add(273,'day'))) {// 默认毫秒)
    await pool.query("UPDATE freeok SET level = 0  WHERE id = ?", [row.id]);
    console.log('账户过期')
  } 
  if (dayjs.tz().isAfter(dayjs.tz(row.reset_time).add(3,'day'))) {// 默认毫秒)
    //await page.goto("https://sub.ssrsub.com/#/subscribe",{ timeout: 6000})
    selecter = '#main-container > div > div.block.block-rounded.mb-4 > div > div > div.p-1.p-md-3.col-md-6.col-xs-12.text-md-right > a.btn.btn-sm.btn-outline-primary.btn-rounded.px-3.mr-1.my-1.ant-dropdown-trigger';
    await page.waitForSelector(selecter, { timeout: 8000 })
    await page.click(selecter)
    await sleep(1500)
    selecter = ".ant-dropdown-menu,.ant-dropdown-menu-light,.ant-dropdown-menu-root,.ant-dropdown-menu-vertical > li:nth-child(2)"
    //body > div:nth-child(8) > div > div > ul > li:nth-child(2) > a
    await page.waitForSelector(selecter, { timeout: 5000 })
    await sleep(1500)
    await page.click(selecter)
    await sleep(1500)
    //selecter = "body > div:nth-child(9) > div > div.ant-modal-wrap > div > div.ant-modal-content > div > div > div.ant-modal-confirm-btns > button.ant-btn.ant-btn-primary"
    selecter = ".ant-btn,.ant-btn-primary"
    await page.waitForSelector(selecter, { timeout: 5000 })
    await page.click(selecter)
    await sleep(1500)
    await pool.query("UPDATE freeok SET count = 0,reset_time = now()  WHERE id = ?", [row.id]);
    console.log('三天重置')
  } 
  //return Promise.reject(new Error('test'));
  await page.goto("https://sub.ssrsub.com/#/subscribe",{ timeout: 6000})
  //rss
  selecter = "#main-container > div > div.block.block-rounded.mb-4 > div > div > div.p-1.p-md-3.col-md-6.col-xs-12.text-md-right > a.btn.btn-sm.btn-primary.btn-rounded.px-3.mr-1.my-1"
  await page.waitForSelector(selecter, { timeout: 5000 })
  await page.click(selecter)
  await sleep(1500)
  //selecter = "body > div:nth-child(7) > div > div.ant-modal-wrap.ant-modal-centered > div > div.ant-modal-content > div > div > div.item___yrtOv.subsrcibe-for-link > div:nth-child(2)"
  selecter = ".item___yrtOv,.subsrcibe-for-link"
  await page.waitForSelector(selecter, { timeout: 5000 })
  await page.click(selecter)
  await sleep(1500)
  const text =await page.evaluate(() => navigator.clipboard.readText());
  console.log(text);
  row.rss = text
  return row
}

async function main() {
  //console.log(await sqlite.open('./freeok.db'))
  browser = await puppeteer.launch({
    headless: runId ? true : false,
    //headless: true,
    args: [
      '--window-size=1920,1080',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      runId ? '' : setup.proxy.changeip,
      //setup.proxy.normal,
      //setup.proxy.changeip,
    ],
    defaultViewport: null,
    ignoreHTTPSErrors: true
  });
  const context = browser.defaultBrowserContext();
  context.overridePermissions("https://sub.ssrsub.com/", ['clipboard-read'])
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36');
  await page.authenticate({ username: setup.proxy.usr, password: setup.proxy.pwd });
  page.on('dialog', async dialog => {
    //console.info(`➞ ${dialog.message()}`);
    await dialog.dismiss();
  });
  console.log(`*****************开始 ${Date()}*******************\n`);
  let sql = `SELECT id,usr,pwd,regtime,reset_time
             FROM freeok 
             where site = 'ssrsub' and (sign_time < date_sub(now(), interval 8 hour) or sign_time is null)
             order by sign_time asc
             limit 100;`
  //sql = "select id,usr,pwd from freeok where site='ssrsub' limit 1"
  let r = await pool.query(sql, []);
  let i = 0;
  console.log(`共有${r[0].length}个账户要sign`);
  //console.log(JSON.stringify(r));
  for (let row of r[0]) {
    i++;
    console.log("user:", i, row.id, row.usr);
    if (i % 3 == 0) await sleep(3000)
    if (row.usr && row.pwd) await freeokSign(row, page)
      .then(async () => {
        //console.log(JSON.stringify(row));    
        let sql, arr;
        sql = 'UPDATE `freeok` SET `used`=?,`used_num`=?,`rss`=?,`sign_time` = NOW() WHERE `id`=?';
        arr = [row.used,row.used_num,row.rss,row.id];
        sql = await pool.format(sql, arr);
        //console.log(sql);
        await pool.query(sql)
          .then(async (reslut) => { console.log('changedRows', reslut[0].changedRows); await sleep(3000); })
          .catch(async (error) => { console.error('UPDATEerror: ', error.message); await sleep(3000); });
      })
      .catch(async (error) => {
        console.error('signerror: ', error.message)
      });
  }
  //sqlite.close();
  await pool.end();
  if (runId ? true : false) await browser.close();
  //await browser.close();
}
async function login(row, page) {
  await page.goto('https://sub.ssrsub.com/#/login', { timeout: 10000 }).catch((err) => console.log('首页超时'));
  await page.waitForSelector(".row > .col-md-12 > .block-content > .form-group:nth-child(2) > .form-control", { timeout: 8000 })
  await page.type('.row > .col-md-12 > .block-content > .form-group:nth-child(2) > .form-control', row.usr, { delay: 20 });
  await page.type('.row > .col-md-12 > .block-content > .form-group:nth-child(3) > .form-control', row.pwd, { delay: 20 });
  await sleep(1000);
  await Promise.all([
    page.waitForNavigation({ timeout: 10000 }),
    //等待页面跳转完成，一般点击某个按钮需要跳转时，都需要等待 page.waitForNavigation() 执行完毕才表示跳转成功
    page.click('.col-md-12 > .block-content > .form-group > .btn > span'),
  ])
    .then(async () => {
      console.log('登录成功');
    })
    .catch(async (err) => {
      console.log("登录失败")
    });
}
async function buy(row, page) {
    console.log("buy")
    let select
    await page.goto('https://sub.ssrsub.com/#/plan', { timeout: 10000 }).catch((err) => console.log('超时'));
    select = "#main-container > div > div.row > div > a > div.block-content.bg-body > div"
    await page.waitForSelector(select, { timeout: 8000 })
    await page.click(select)
    await sleep(1000);
    select = "#cashier > div.col-md-4.col-sm-12 > div.block.block-link-pop.block-rounded.px-3.py-3.mb-2.text-light > input"
    await page.waitForSelector(select, { timeout: 8000 })
    await sleep(1000);
    await page.type(select, "ssrsub-999");
    await sleep(500);
    //验证优惠码
    select = "#cashier > div.col-md-4.col-sm-12 > div.block.block-link-pop.block-rounded.px-3.py-3.mb-2.text-light > button"
    await page.click(select)
    await sleep(2000);
    await waitForString(page,"#cashier > div.col-md-4.col-sm-12 > div:nth-child(2) > div:nth-child(3) > div.row.no-gutters.py-3 > div.col-4.text-right","999.00")
    // 结账
    select = "#cashier > div.col-md-4.col-sm-12 > div:nth-child(2) > button"
    await page.waitForSelector(select, { timeout: 8000 })
    await sleep(1000);
    await page.click(select)
    await page.waitForNavigation()
    select = "#cashier > div.col-md-4.col-sm-12 > div > button"
    await page.waitForSelector(select, { timeout: 8000 })
    await sleep(2000);   
    await page.click(select)
    select = "#cashier > div > div:nth-child(1) > div > div > div.ant-result-title"
    await page.waitForSelector(select, { timeout: 8000 })
  }
async function cancel(page){
    let selecter
    await page.goto("https://sub.ssrsub.com/#/order",{ timeout: 8000})
    selecter = "#main-container > div > div > div > div > div > div > div > div > div.ant-table-fixed-right > div > div > table > tbody > tr > td > div > a:nth-child(3)"
    await page.waitForSelector(selecter,{ timeout: 6000})
    await page.click(selecter)
    await sleep(3000)
}
  