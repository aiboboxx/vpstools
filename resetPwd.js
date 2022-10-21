//4小时运行一次
const fs = require("fs");
const puppeteer = require('puppeteer-extra');
// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { tFormat, sleep, clearBrowser, getRndInteger, randomOne, randomString } = require('./common.js');
const { sbFreeok,login,loginWithCookies,resetPwd } = require('./utils.js');
//Date.prototype.format =Format;
const mysql = require('mysql2/promise');
const dayjs = require('dayjs')
let utc = require('dayjs/plugin/utc') // dependent on utc plugin
let timezone = require('dayjs/plugin/timezone')
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault("Asia/Hong_Kong")
let resetUrl = ''
let resetUrlArr = []
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
  charset:'utf8' //字符集设置
});
async function resetMM(row,page,pool) {
    await clearBrowser(page) //clear all cookies
    await page.goto('https://okgg.xyz/password/reset', { timeout: 8000 }).catch((err) => console.log('首页超时'));
    await page.waitForSelector("#email", { timeout: 5000 })
    await page.type('#email', row.usr, { delay: 20 });
    await page.click('#reset');
    await page.waitForNavigation({ timeout: 3000 }).catch((err) => console.log('跳转超时'));
    await sleep(500);
    //await clearBrowser(page) //clear all cookies
    let pwd = setup.pwd;
    let i = 0
    do {
        getResetUrl(page)
        await sleep(10000)
        i++
    } while (resetUrl == '' && i < 10)
    console.log("getResetUrl:", resetUrl)
    if (resetUrl == "") return Promise.reject(new Error('重置链接获取失败'));
    i = 0;
    while (i < resetUrlArr.length) {
        console.log(i,resetUrlArr[i]);
        await resetPWDaction(page,resetUrlArr[i],"780830lp")
        await sleep(3000)
        i++;
    }
}
async function resetPWDaction(page,resetUrl,pwd){
    await clearBrowser(page) //clear all cookies
    await page.goto(resetUrl, { timeout: 8000 }).catch((err) => console.log('网页超时'))
    let selecter, innerHtml
    selecter = "#password"
    await page.waitForSelector(selecter,{ timeout: 30000 })
    .catch(async (error)=>{await page.goto(resetUrl, { timeout: 8000 }).catch((err) => console.log('网页超时'))})
    await sleep(1000)
    //return
    console.info(`➞ wait`);
    await page.waitForSelector(selecter,{ timeout: 30000 })
    .catch(async (error)=>{await page.goto(resetUrl, { timeout: 8000 }).catch((err) => console.log('网页超时'))})
    await sleep(1000)
    await page.waitForSelector(selecter,{ timeout: 30000 })
    await page.type('#password', pwd)
    await page.type('#repasswd', pwd)
    await page.click("#reset")
    await page.waitForNavigation({ timeout: 5000 }).catch((err) => console.log('重置超时'));
    await sleep(5000)
}
function getResetUrl() {
  let since = dayjs.tz().subtract(1, 'day').toISOString()
  //var fs = require("fs")
  var Imap = require('imap')
  var MailParser = require("mailparser").MailParser
  var imap = new Imap({
      user: 'dgfwvj520@qq.com', //你的邮箱账号
      password: 'ktuqswqfgrjobgfc', //你的邮箱密码
      host: 'imap.qq.com', //邮箱服务器的主机地址
      port: 993, //邮箱服务器的端口地址
      tls: true, //使用安全传输协议
      //tlsOptions: { rejectUnauthorized: false } //禁用对证书有效性的检查
  });

  function openInbox(cb) {
      imap.openBox('INBOX', false, cb);
  }

  imap.once('ready', function () {
      openInbox(function (err, box) {
          console.log("打开邮箱");
          if (err) throw err;
          imap.search([['SINCE', since], ['HEADER', 'SUBJECT', 'okgg.top']],function (err, results) {//搜寻2017-05-20以后未读的邮件
              try {
                  imap.setFlags(results, ['\\Seen'], function (err) {
                      if (!err) {
                          console.log("marked as read");
                      } else {
                          console.log(JSON.stringify(err, null, 2));
                      }
                  });
                  var f = imap.fetch(results, { bodies: '' });//抓取邮件（默认情况下邮件服务器的邮件是未读状态）

                  f.on('message', function (msg, seqno) {

                      var mailparser = new MailParser();

                      msg.on('body', function (stream, info) {

                          stream.pipe(mailparser);//将为解析的数据流pipe到mailparser

                          //邮件头内容
                          mailparser.on("headers", function (headers) {
                              console.log("邮件头信息>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
                              console.log("邮件主题: " + headers.get('subject'));
                              console.log("发件人: " + headers.get('from').text);
                              console.log("收件人: " + headers.get('to').text);
                          });

                          //邮件内容

                          mailparser.on("data",function (data) {
                              if (data.type === 'text') {//邮件正文
                                  console.log("邮件内容信息>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
                                  //console.log("邮件内容: " + data.html);
                                  const regex = /(https?|http):\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]/g;
                                  let myArray = [];
                                  while ((myArray = regex.exec(data.html)) !== null) {
                                      //console.log(`Found ${myArray[0]}. Next starts at ${regex.lastIndex}.`)
                                      if (myArray[0].includes('okgg.top/password')) {
                                          resetUrl = myArray[0]
                                          resetUrlArr.push(myArray[0])
                                          console.log("push:",resetUrl)
                                          //break;
                                      }
                                  }

                              }
                              /*                         if (data.type === 'attachment') {//附件
                                                          console.log("邮件附件信息>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
                                                          console.log("附件名称:"+data.filename);//打印附件的名称
                                                          data.content.pipe(fs.createWriteStream(data.filename));//保存附件到当前目录下
                                                          data.release();
                                                      } */
                          });

                      });
                      msg.once('end', function () {
                          console.log(seqno + '完成');
                      });
                  });
                  f.once('error', function (err) {
                      console.log('抓取出现错误: ' + err);
                  });
                  f.once('end', function () {
                      console.log('所有邮件抓取完成!');
                      imap.end();
                  });
              }catch(err){
                  console.log(err)
              }

          });


      });
  });

  imap.once('error', function (err) {
      console.log(err);
  });

  imap.once('end', function () {
      console.log('关闭邮箱');
      return (resetUrl)
  });

  imap.connect();
}
async function main() {
  browser = await puppeteer.launch({
    headless: runId ? true : false,
    //headless: true,
    args: [
      '--window-size=1920,1080',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      runId ? '' : setup.proxy.changeip,
      //runId ? '' :setup.proxy.normal
      //setup.proxy.changeip,
    ],
    defaultViewport: null,
    ignoreHTTPSErrors: true
  });
  //console.log(await sqlite.open('./freeok.db'))
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36');
  await page.authenticate({username:setup.proxy.usr, password:setup.proxy.pwd});
  page.on('dialog', async dialog => {
    //console.info(`➞ ${dialog.message()}`);
    await dialog.dismiss();
  });

  console.log(`*****************开始dailyReset ${Date()}*******************\n`);
  let sql = `SELECT id,usr,pwd,cookies 
             FROM freeok 
             WHERE err = 1 and site = "okgg"
             order by id asc 
             limit 1;`
   sql = "SELECT * FROM freeok WHERE  id = 799;"
  let r = await pool.query(sql);
  let i = 0;
  console.log(`共有${r[0].length}个账户要ResetPwd`)
  //console.log(JSON.stringify(r))
  for (let row of r[0]) {
    i++;
    console.log("user:", i, row.id, row.usr);
    if (i % 3 == 0) await sleep(3000)
    if (row.usr && row.pwd) await resetMM(row, page)
       .then(async () => {
        console.log("成功")   
      })
/*       .catch(async (error) => {
        console.log('error: ', error.message)
      }) */
  } 
  await pool.end()
  if (runId ? true : false) await browser.close();
  //await browser.close();
}
main()

