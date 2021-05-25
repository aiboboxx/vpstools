const fs = require("fs");
//const sqlite = require('./asqlite3.js')
const puppeteer = require('puppeteer');
const core = require('@actions/core');
const github = require('@actions/github');
const myfuns = require('./myfuns.js');
Date.prototype.Format = myfuns.Format;
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: 'app.aiboboxx.ml',
  user: 'aiboboxx',
  password : 'LaI9DCyNBpEKWe9pn5B',   
  port: '33060',  
  database: 'mydb',
  waitForConnections: true, //连接超额是否等待
  connectionLimit: 10, //一次创建的最大连接数
  queueLimit: 0 //可以等待的连接的个数
});
const runId = github.context.runId;
let browser;
async function login(usr,pwd,page){
  await page.goto('https://v2.freeok.xyz/auth/login',{timeout: 10000}).catch((err)=>console.log('首页超时'));
//await page.waitForSelector("#email");
  await page.type('#email', usr, {delay: 20});
  await page.type('#passwd', pwd, {delay: 20});
  await page.click('body > div.authpage > div > form > div > div.auth-help.auth-row > div > div > label > span.checkbox-circle-icon.icon');
  await myfuns.Sleep(1000);
  await page.waitForSelector('#embed-captcha > div')
  .catch((error)=>{console.log(error.message);myfuns.Sleep(2000);});;
  await page.click('#embed-captcha > div');
  await page.waitForFunction(
   (selecter) => document.querySelector(selecter).innerHTML.includes("验证成功"),
   {timeout:60000},
   '#embed-captcha > div'
 );
  await myfuns.Sleep(1000);
  await Promise.all([
    page.waitForNavigation({timeout: 5000}), 
    //等待页面跳转完成，一般点击某个按钮需要跳转时，都需要等待 page.waitForNavigation() 执行完毕才表示跳转成功
    page.click('#login'),    
  ])
  .then(()=>console.log ('登录成功'))
  .catch(async (err)=>{
    let msg = await page.evaluate(()=>document.querySelector('#msg').innerHTML);
    if (msg == "账号在虚无之地，请尝试重新注册") {
      return Promise.reject(new Error('账号在虚无之地'));
    }else{
      return Promise.reject(new Error('登录失败'));
    }    
  });
}
async function  main () {
   browser = await puppeteer.launch({ 
    headless: runId?true:false ,
    args: ['--window-size=1920,1080'],
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
    let devices = ['Galaxy Note 3','Galaxy Note II','iPhone 11','Galaxy S III','Galaxy S5','iPad Mini','iPad','iPhone 6','iPhone 6 Plus','iPhone 7','iPhone 7 Plus','iPhone XR'];
    await page.emulate(puppeteer.devices[randomOne(devices)]); 
  console.log(`*****************开始freeok注册 ${Date()}*******************\n`);  
  await myfuns.clearBrowser(page); //clear all cookies
  let usr='',pwd='780830lp';
  let selecter, inner_html;
  const aEmails = ['@126.com','@163.com','@qq.com','@gmail.com'];
  usr=randomString(5, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')+randomString(3, '0123456789')+randomOne(aEmails);
  console.log(usr);
   await page.goto('https://okme.xyz/auth/register?code=4G8v');
   await page.waitForSelector('#name',{timeout:10000});
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
   await page.click('#embed-captcha > div');
   await page.waitForFunction(
    (selecter) => document.querySelector(selecter).innerHTML.includes("验证成功"),
    {timeout:60000},
    '#embed-captcha > div'
  );
  await myfuns.Sleep(1000);
  await page.click('#tos');
  await myfuns.Sleep(500);
  await page.click('#reg');
  await page.waitForNavigation({timeout: 5000})
  await myfuns.Sleep(1000);
  let sql,arr;   
  sql = 'insert into  freeok (usr,pwd,regtime) values (?,?,NOW());';
  arr = [usr,pwd];
  sql = await pool.format(sql,arr);
  await pool.query(sql)
  .then((reslut)=>{console.log('添加成功:',reslut[0].insertId);myfuns.Sleep(2000);});
  await page.goto('https://v2.freeok.xyz/auth/login',{timeout: 10000}).catch((err)=>console.log('首页超时'));
  await page.waitForSelector("body > div.authpage > div > form > div > div.auth-help.auth-row > div > div > label > span.checkbox-circle-icon.icon");
    await page.type('#email', usr);
    await page.type('#passwd', pwd);
    await page.click('body > div.authpage > div > form > div > div.auth-help.auth-row > div > div > label > span.checkbox-circle-icon.icon');
    await myfuns.Sleep(1000);
    await page.waitForSelector('#embed-captcha > div');
    await page.click('#embed-captcha > div');
    await page.waitForFunction(
     (selecter) => document.querySelector(selecter).innerHTML.includes("验证成功"),
     {timeout:60000},
     '#embed-captcha > div'
   );
    await myfuns.Sleep(1000);
    await Promise.all([
      page.waitForNavigation({timeout: 5000}), 
      //等待页面跳转完成，一般点击某个按钮需要跳转时，都需要等待 page.waitForNavigation() 执行完毕才表示跳转成功
      page.click('#login'),    
    ])
    .then(async ()=>{
      console.log ('登录成功');
    },
    async (err)=>{
      let msg = await page.evaluate(()=>document.querySelector('#msg').innerHTML);
      if (msg == "账号在虚无之地，请尝试重新注册") {
        return Promise.reject(new Error('账号在虚无之地'));
      }else{
        return Promise.reject(new Error('登录失败'));
      }    
    });
    let cookies = [],ck = '',msg='';
    selecter = 'body > main > div.container > section > div.ui-card-wrap > div:nth-child(1) > div > div.user-info-main > div.nodemain > div.nodehead.node-flex > div';
    await page.waitForSelector(selecter,{timeout:10000});
    await myfuns.Sleep(1000);
    selecter = 'body > main > div.content-header.ui-content-header > div > h1';
    await page.waitForSelector(selecter);
    cookies = await page.cookies();
    ck = JSON.stringify(cookies, null, '\t');
    sql = 'update  freeok set cookies = ? where usr = ?;';
    arr = [ck,usr];
    sql = await pool.format(sql,arr);
    //console.log(sql);
    await pool.query(sql)
    .then((reslut)=>{msg='update成功:'+usr;console.log('添加成功:',reslut[0].changedRows);myfuns.Sleep(2000);})
    .catch((error)=>{msg='update失败:'+error.message;console.log('添加失败:', error.message);myfuns.Sleep(2000);});
    await page.evaluate((selecter,text) => document.querySelector(selecter).innerText=text,selecter,msg);
    await pool.end();
    if ( runId?true:false ) await browser.close();
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
main();

