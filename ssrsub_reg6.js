const fs = require("fs");
const axios = require('axios').default;
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const {sleep, clearBrowser, getRndInteger, randomOne, randomString, waitForString,cutString} = require('./common.js');
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
  charset:'utf8' //字符集设置
});
async function regFreeok(page,invite){
  await clearBrowser(page); //clear all cookies
  let cookies = [], ck = '', msg = '';
  let usr = '', pwd = setup.pwd;
  let selecter, innerHtml;
  usr = randomString(6, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ') + randomString(3, '0123456789')
  //usr = '437385458@qq.com';
  console.log(usr);
  await page.goto('https://sub.ssrsub.com/#/register', { timeout: 10000 })
    .catch(async (error) => { console.log('error: ', error.message); })
  selecter = "#main-container > div.no-gutters.v2board-auth-box > div > div > div > div.row.no-gutters > div > div > div:nth-child(2) > div.form-group.v2board-email-whitelist-enable > input"
  await page.waitForSelector(selecter, { timeout: 6000 });
  await page.type(selecter, usr);
  selecter = "#main-container > div.no-gutters.v2board-auth-box > div > div > div > div.row.no-gutters > div > div > div:nth-child(2) > div:nth-child(2) > input"
  await page.type(selecter, pwd);
  selecter = "#main-container > div.no-gutters.v2board-auth-box > div > div > div > div.row.no-gutters > div > div > div:nth-child(2) > div:nth-child(3) > input"
  await page.type(selecter, pwd);
  selecter = "#main-container > div.no-gutters.v2board-auth-box > div > div > div > div.row.no-gutters > div > div > div:nth-child(2) > div:nth-child(4) > input"
  await page.type(selecter, "FVl9wR41");
  // 点击注册
  selecter = "#main-container > div.no-gutters.v2board-auth-box > div > div > div > div.row.no-gutters > div > div > div:nth-child(2) > div.form-group.mb-0 > button > span"
  await page.click(selecter);
  await sleep(5000)
  await sbyzm(page)
  await sleep(500);
  // https://sub.ssrsub.com/#/dashboard
  selecter = "#main-container > div > div:nth-child(2) > div:nth-child(1) > div > div.block-header.block-header-default > h3"
  await page.waitForSelector(selecter, { timeout: 6000 });
  await sleep(3000);
  let sql, arr;
  sql = 'insert into  freeok (usr,pwd,reset_time,site,level) values (?,?,NOW(),"ssrsub",6);';
  arr = [usr+"@gmail.com", pwd];
  sql = await pool.format(sql, arr);
  await pool.query(sql)
    .then((reslut) => { msg = '添加成功:' + usr; console.log('添加成功:', reslut[0].insertId); sleep(2000); })
    .catch((error) => { msg = '添加失败:' + error.message; console.log('添加失败:', error.message); sleep(2000); });

}
async function main() {
  let invite = "vip"
  let ignoreA = false,ignoreB = false
  let sql = "SELECT count(*) AS Number FROM freeok where site = 'ssrsub' and level = 6 and used_num < 35;"
  let r = await pool.query(sql);
  //console.log(JSON.stringify(r))
  if ( r[0][0].Number >= 4 ) {
    console.log('已有4以上个level=6 ssrsub账户',r[0][0].Number);
    ignoreA = true;
  }
/*   sql = "SELECT count(*) AS Number FROM freeok where site = 'bjd' and level = 1 and err IS NULL AND reset_time > DATE_SUB(now(), INTERVAL 2 DAY) ;"
  r = await pool.query(sql)
  if ( r[0][0].Number >= 5 ) {
    console.log('已有两天以上有效期账户',r[0][0].Number);
    ignoreB = true;
  } */
  //if (ignoreA && ignoreB ) return
  if (ignoreA) return
  browser = await puppeteer.launch({
    headless: runId ? true : false,
    //headless: true,
    args: [
      '--window-size=1920,1080',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      //runId ? '' : setup.proxy.changeip,
      //runId ? '' : setup.proxy.normal
      setup.proxy.changeip,
    ],
    defaultViewport: null,
    ignoreHTTPSErrors: true,
    dumpio: false
  });
  //console.log(await sqlite.open('./freeok.db'))
  const page = await browser.newPage();
  //await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36');
  await page.authenticate({username:setup.proxy.usr, password:setup.proxy.pwd});
  page.on('dialog', async dialog => {
    //console.info(`➞ ${dialog.message()}`);
    await dialog.dismiss();
  });

  console.log(`*****************开始ssrsub-6注册 ${Date()}*******************\n`);
  await regFreeok(page,invite)
  .catch(async (error) => { console.log('error: ', error.message); });
  console.log(`*****************ssrsub注册结束 ${Date()}*******************\n`);
  await pool.end();
  if (runId ? true : false) await browser.close();
  //await browser.close();
}
async function sbyzm (page){
    let injectedScript = `
    function findRecaptchaClients() {
        // eslint-disable-next-line camelcase
        if (typeof (___grecaptcha_cfg) !== 'undefined') {
          // eslint-disable-next-line camelcase, no-undef
          return Object.entries(___grecaptcha_cfg.clients).map(([cid, client]) => {
            const data = { id: cid, version: cid >= 10000 ? 'V3' : 'V2' };
            const objects = Object.entries(client).filter(([_, value]) => value && typeof value === 'object');
      
            objects.forEach(([toplevelKey, toplevel]) => {
              const found = Object.entries(toplevel).find(([_, value]) => (
                value && typeof value === 'object' && 'sitekey' in value && 'size' in value
              ));
           
              if (typeof toplevel === 'object' && toplevel instanceof HTMLElement && toplevel['tagName'] === 'DIV'){
                  data.pageurl = toplevel.baseURI;
              }
              
              if (found) {
                const [sublevelKey, sublevel] = found;
      
                data.sitekey = sublevel.sitekey;
                const callbackKey = data.version === 'V2' ? 'callback' : 'promise-callback';
                const callback = sublevel[callbackKey];
                if (!callback) {
                  data.callback = null;
                  data.function = null;
                } else {
                  data.function = callback;
                  const keys = [cid, toplevelKey, sublevelKey, callbackKey].map((key) => \`['\${key}']\`).join('');
                  data.callback = \`___grecaptcha_cfg.clients\${keys}\`;
                }
              }
            });
            return data;
          });
        }
        return [];
      }
`
await page.addScriptTag({ content: injectedScript })
const sitekey = await page.evaluate(() => findRecaptchaClients()[0].sitekey);
//console.log ("sitekey:",sitekey)
const clientKey = '7501dd3a87c0bfd780989dbed0edd3b70fb1f54510427'  // 请替换成自己的TOKEN
const websiteURL = "https://sub.ssrsub.com/#/register"
let taskId,result
await axios.post('https://china.yescaptcha.com/createTask',{
    "clientKey": "7501dd3a87c0bfd780989dbed0edd3b70fb1f54510427",
    "task": {
        "websiteURL": websiteURL,
        "websiteKey": sitekey,
        "type": "NoCaptchaTaskProxyless"
    }
})
.then( (response) => {
        //console.log(response)
        taskId = response.data.taskId
        console.log('taskId',taskId)
    })
    .catch( (error) => console.log(error))
let i = 0,stop = false
while (i<120){
  await axios.post('https://china.yescaptcha.com/getTaskResult',{
    "clientKey": clientKey,
    "taskId": taskId
})
.then( (response) => {
        //console.log(response)
        console.log(response.data.status)
        if (response.data.status == "ready") {
          result = response.data.solution.gRecaptchaResponse
          stop = true
        }

    })
    .catch( (error) => console.log(error))
    if (stop) break
    await sleep(3000)
    i += 1
}
//console.log("result:",result)
injectedScript = `
(function (response) {
  const ele = document.getElementById("g-recaptcha-response");
  if (ele) {
    ele.innerHTML = response;
    ele.text = response;
  }

  const base = Object.values(___grecaptcha_cfg.clients)[0];
  for (let k0 of Object.keys(base)) {
    for (let k1 of Object.keys(base[k0])) {
        if (base[k0][k1] && base[k0][k1].callback && typeof base[k0][k1].callback === 'function') {
          base[k0][k1].callback(response);
          return true;
        }
    }
  }
  return false;
})('${result}');
`
//console.log(injectedScript)
await page.addScriptTag({ content: injectedScript })

}
async function getResult(){
await axios.post('https://china.yescaptcha.com/getTaskResult',{
        "clientKey": "7501dd3a87c0bfd780989dbed0edd3b70fb1f54510427",
        "taskId": 'a07153ac-3da8-11ed-9287-02e08e6ca02d'
    })
    .then( (response) => {
            console.log(response.data)
        })
        .catch( (error) => console.log(error))
//console.log (result)
}
//getResult()
main();

