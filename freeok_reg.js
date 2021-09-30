const fs = require("fs");
//const sqlite = require('./asqlite3.js')
const puppeteer = require('puppeteer-extra');
// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const core = require('@actions/core');
const github = require('@actions/github');
const myfuns = require('./myfuns.js');
Date.prototype.Format = myfuns.Format;
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
  queueLimit: 0 //可以等待的连接的个数
});

async function main() {
  browser = await puppeteer.launch({
    headless: runId ? true : false,
    args: [
      '--window-size=1920,1080',
      setup.proxyL
    ],
    defaultViewport: null,
    ignoreHTTPSErrors: true
  });
  //console.log(await sqlite.open('./freeok.db'))
  const page = await browser.newPage();
  // 当页面中的脚本使用“alert”、“prompt”、“confirm”或“beforeunload”时发出
  page.on('dialog', async dialog => {
    //console.info(`➞ ${dialog.message()}`);
    await dialog.dismiss();
  });
  console.log(`*****************开始freeok注册 ${Date()}*******************\n`);
  await myfuns.clearBrowser(page); //clear all cookies
  let usr = '', pwd = setup.pwd;
  let selecter, inner_html;
  const aEmails = ['@126.com', '@163.com', '@qq.com'];
  usr = randomString(6, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ') + randomString(3, '0123456789') + randomOne(aEmails);
  console.log(usr);
  await page.goto('https://v2.freeyes.xyz/auth/register?code=L8Dv', { timeout: 60000 });
  // console.log("a");
  await page.waitForFunction(
    (selecter) => {
      if (document.querySelector(selecter)) {
        return document.querySelector(selecter).innerText.includes("确认注册");
      } else {
        return false;
      }
    },
    { timeout: 60000 },
    'body'
  ).then(async () => { console.log("无需验证"); await myfuns.Sleep(1000); });
  await page.waitForSelector('#name', { timeout: 60000 });
  console.log("b");
  await page.type('#name', usr);
  //await myfuns.Sleep(100);
  await page.type('#email', usr);
  //await myfuns.Sleep(100);
  await page.type('#passwd', pwd);
  //await myfuns.Sleep(100);
  await page.type('#repasswd', pwd);
  //await myfuns.Sleep(300);
  await page.type('#wechat', randomString(10, '0123456789'));
  //await myfuns.Sleep(300);
  await page.click('#imtype');
  await myfuns.Sleep(100);
  await page.click('body > div.authpage.auth-reg > div > section > div > div:nth-child(6) > div > div > ul > li:nth-child(4) > a');
  await myfuns.Sleep(100);
  await page.waitForSelector('#embed-captcha > div')
    .catch((error) => { console.log(error.message); myfuns.Sleep(2000); });
  await page.click('#embed-captcha > div');
  await myfuns.Sleep(3500);
  await freeok_sbyzm(page);
  await page.waitForFunction(
    (selecter) => document.querySelector(selecter).innerHTML.includes("验证成功"),
    { timeout: 60000 },
    '#embed-captcha > div'
  );
  await myfuns.Sleep(1000);
  await page.click('#tos');
  await myfuns.Sleep(500);
  await page.click('#reg');
  await myfuns.Sleep(3000);


  await page.goto('https://v2.freeyes.xyz/auth/login', { timeout: 10000 }).catch((err) => console.log('首页超时'));
  await myfuns.Sleep(3000);
  await page.waitForSelector("body > div.authpage > div > form > div > div.auth-help.auth-row > div > div > label > span.checkbox-circle-icon.icon");
  await page.type('#email', usr, { delay: 20 });
  await page.type('#passwd', pwd, { delay: 20 });
  await myfuns.Sleep(200);
  await page.click('body > div.authpage > div > form > div > div.auth-help.auth-row > div > div > label > span.checkbox-circle-icon.icon');
  await myfuns.Sleep(1000);
  await page.waitForSelector('#embed-captcha > div');
  await page.click('#embed-captcha > div');
  await myfuns.Sleep(3500);
  await freeok_sbyzm(page);
  await page.waitForFunction(
    (selecter) => document.querySelector(selecter).innerHTML.includes("验证成功"),
    { timeout: 60000 },
    '#embed-captcha > div'
  );
  await myfuns.Sleep(1000);
  await Promise.all([
    page.waitForNavigation({ timeout: 5000 }),
    //等待页面跳转完成，一般点击某个按钮需要跳转时，都需要等待 page.waitForNavigation() 执行完毕才表示跳转成功
    page.click('#login'),
  ])
    .then(async () => {
      console.log('登录成功');
    },
      async (err) => {
        let msg = await page.evaluate(() => document.querySelector('#msg').innerHTML);
        if (msg == "账号在虚无之地，请尝试重新注册") {
          return Promise.reject(new Error('账号在虚无之地'));
        } else {
          return Promise.reject(new Error('登录失败'));
        }
      });
  let cookies = [], ck = '', msg = '';
  selecter = 'body > main > div.container > section > div.ui-card-wrap > div:nth-child(1) > div > div.user-info-main > div.nodemain > div.nodehead.node-flex > div';
  await page.waitForSelector(selecter, { timeout: 15000 });
  await myfuns.Sleep(1000);
  selecter = 'body > main > div.content-header.ui-content-header > div > h1';
  await page.waitForSelector(selecter);
  inner_html = await page.evaluate(() => document.querySelector( 'body > main > div.container > section > div.ui-card-wrap > div:nth-child(2) > div > div.user-info-main > div.nodemain > div.nodemiddle.node-flex > div' ).innerHTML.trim());
  inner_html = inner_html.split(' ')[0];
  //console.log( "余额: " + inner_html);
  if (inner_html== '0.99'){
    cookies = await page.cookies();
    ck = JSON.stringify(cookies, null, '\t');
    let sql, arr;
    sql = 'insert into  freeok (usr,pwd,regtime,cookies) values (?,?,NOW(),?);';
    arr = [usr, pwd, ck];
    sql = await pool.format(sql, arr);
    await pool.query(sql)
      .then((reslut) => { msg = '添加成功:' + usr; console.log('添加成功:', reslut[0].insertId); myfuns.Sleep(2000); })
      .catch((error) => { msg = '添加失败:' + error.message; console.log('添加失败:', error.message); myfuns.Sleep(2000); });
    //console.log(sql);
    /*   await pool.query(sql)
        .then((reslut) => { msg = 'update成功:' + usr; console.log('添加成功:', reslut[0].changedRows); myfuns.Sleep(2000); })
        .catch((error) => { msg = 'update失败:' + error.message; console.log('添加失败:', error.message); myfuns.Sleep(2000); }); */
  }else{
    msg = '不添加数据库：'+ usr;
  }
  console.log(msg);
  await page.evaluate((selecter, text) => document.querySelector(selecter).innerText = text, selecter, msg);
  await pool.end();
  if (runId ? true : false) await browser.close();
}
function randomString(length, chars) {
  var result = '';
  for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}
/**
 * 随机获取数组中的一个元素
 * @param arr 数组
 * @returns {*}  数组中的任意一个元素
 */
function randomOne(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
async function freeok_sbyzm(page) {
  const injectedScript = `
    const getCanvasValue = (selector) => {
        let canvas = document.querySelector(selector)
        let ctx = canvas.getContext('2d')
        let [width, height] = [canvas.width, canvas.height]
        let rets = [...Array(height)].map(_ => [...Array(width)].map(_ => 0))
        for (let i = 0; i < height; ++i) { 
            for (let j = 0; j < width; ++j) { 
                rets[i][j] = Object.values(ctx.getImageData(j,i,1,1).data)
            }
        }        
        return rets
    }
`
  await page.addScriptTag({ content: injectedScript });
  async function getDistance() {
    const THRESHOLD = 1
    const _equals = (a, b) => {
      if (a.length !== b.length) {
        return false
      }
      for (let i = 0; i < a.length; ++i) {
        let delta = Math.abs(a[i] - b[i])
        if (delta > THRESHOLD) {
          return false
        }
      }
      return true
    }
    const differentSet = (a1, a2) => {
      //console.log("a1", a1)
      //console.log("a2", a2)
      let rets = []
      a1.forEach((el, y) => {
        el.forEach((el2, x) => {
          if (!_equals(el2, a2[y][x])) {
            rets.push({
              x,
              y,
              v: el2,
              v2: a2[y][x]
            })
          }
        })
      })
      return rets
    }
    const getLeftest = (array) => {
      return array.sort((a, b) => {
        if (a.x < b.x) {
          return -1
        }
        else if (a.x == b.x) {
          if (a.y <= b.y) {
            return -1
          }
          return 1
        }
        return 1
      }).shift()
    }
    let selecter = 'body > div.geetest_fullpage_click.geetest_float.geetest_wind.geetest_slide3 > div.geetest_fullpage_click_wrap > div.geetest_fullpage_click_box > div > div.geetest_wrap > div.geetest_widget > div > a > div.geetest_canvas_img.geetest_absolute > div > canvas.geetest_canvas_bg.geetest_absolute';
    await page.waitForSelector(selecter);
    let rets1 = await page.evaluate((selecter) => getCanvasValue(selecter), selecter);
    //console.log("rets1",rets1);
    selecter = 'body > div.geetest_fullpage_click.geetest_float.geetest_wind.geetest_slide3 > div.geetest_fullpage_click_wrap > div.geetest_fullpage_click_box > div > div.geetest_wrap > div.geetest_widget > div > a > div.geetest_canvas_img.geetest_absolute > canvas';
    await page.waitForSelector(selecter);
    let rets2 = await page.evaluate((selecter) => getCanvasValue(selecter), selecter);
    //await page.evaluate(()=>dlbg(),);
    //console.log("rets2",rets2);
    let dest = getLeftest(differentSet(rets1, rets2));
    //console.log('dest',dest);
    return dest.x;
  }
  const distance = await getDistance();
  const button = await page.waitForSelector("body > div.geetest_fullpage_click.geetest_float.geetest_wind.geetest_slide3 > div.geetest_fullpage_click_wrap > div.geetest_fullpage_click_box > div > div.geetest_wrap > div.geetest_slider.geetest_ready > div.geetest_slider_button");
  const box = await button.boundingBox();
  const axleX = Math.floor(box.x + box.width / 2);
  const axleY = Math.floor(box.y + box.height / 2);
  await btnSlider(distance);
  async function btnSlider(distance) {
    await page.mouse.move(axleX, axleY);
    await page.mouse.down();
    await myfuns.Sleep(getRndInteger(100, 200));
    await page.mouse.move(box.x + distance / 4 + getRndInteger(-8, 10), axleY + getRndInteger(-8, 10), { steps: +getRndInteger(60, 100) });
    await myfuns.Sleep(getRndInteger(50, 200));
    await page.mouse.move(box.x + distance / 2 + getRndInteger(-8, 10), axleY + getRndInteger(-8, 10), { steps: getRndInteger(60, 100) });
    await myfuns.Sleep(getRndInteger(50, 200));
    await page.mouse.move(box.x + (distance / 8) * 7 + getRndInteger(-8, 10), axleY + getRndInteger(-8, 10), { steps: getRndInteger(60, 100) });
    await myfuns.Sleep(getRndInteger(50, 200));
    await page.mouse.move(box.x + distance / 10 * 9 + getRndInteger(-8, 10), axleY + getRndInteger(-8, 10), { steps: getRndInteger(60, 100) });
    await myfuns.Sleep(getRndInteger(50, 200));
    await page.mouse.move(box.x + distance + getRndInteger(10, 50), axleY + getRndInteger(-8, 10), { steps: getRndInteger(60, 100) });
    await myfuns.Sleep(getRndInteger(50, 200));
    await page.mouse.move(box.x + distance + 30 + getRndInteger(-1, 3), axleY + getRndInteger(-8, 10), { steps: getRndInteger(60, 100) });
    await myfuns.Sleep(getRndInteger(50, 200));
    await page.mouse.up();
    await myfuns.Sleep(2000);

    let text = await page.evaluate(() => {
      return document.querySelector("#embed-captcha > div > div.geetest_btn > div.geetest_radar_btn > div.geetest_radar_tip").innerText;
    });
    let text2 = await page.evaluate(() => {
      return document.querySelector("#embed-captcha > div").innerText;
    });
    console.log(text, text2);
    let step = 0;
    if (text) {
      // 如果失败重新获取滑块
      if (
        text.includes("怪物吃了拼图") ||
        text.includes("拖动滑块将悬浮图像正确拼合") ||
        text.includes("网络不给力请点击重试")
      ) {
        await page.waitFor(1000);
        await page.click("#embed-captcha > div > div.geetest_btn > div.geetest_radar_btn > div.geetest_radar_tip");
        await page.waitFor(2000);
        step = await getDistance();
        await btnSlider(step);
      } else if (text.includes("请完成验证")) {
        step = await getDistance();
        await btnSlider(step);
      }
    }
  }
}


main();

