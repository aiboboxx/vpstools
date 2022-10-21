const fs = require("fs");
const { sleep, getRndInteger, randomOne, randomString,clearBrowser } = require('./common.js');
const dayjs = require('dayjs')
let utc = require('dayjs/plugin/utc') // dependent on utc plugin
let timezone = require('dayjs/plugin/timezone')
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault("Asia/Hong_Kong")
let resetUrl = '';
exports.sbFreeok = async function sbFreeok(page) {
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
  async function _getDistance() {
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
    const _differentSet = (a1, a2) => {
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
    const _getLeftest = (array) => {
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
    let el = await page.waitForSelector(selecter);
    await page.waitForTimeout(500);
    //console.log(el);
    let rets1 = await page.evaluate((selecter) => getCanvasValue(selecter), selecter);
    //console.log("rets1",rets1);
    selecter = 'body > div.geetest_fullpage_click.geetest_float.geetest_wind.geetest_slide3 > div.geetest_fullpage_click_wrap > div.geetest_fullpage_click_box > div > div.geetest_wrap > div.geetest_widget > div > a > div.geetest_canvas_img.geetest_absolute > canvas';
    await page.waitForSelector(selecter);
    //await page.waitForTimeout(500);
    let rets2 = await page.evaluate((selecter) => getCanvasValue(selecter), selecter);
    //await page.evaluate(()=>dlbg(),);
    //console.log("rets2",rets2);
    let dest = _getLeftest(_differentSet(rets1, rets2));
    //console.log('dest',dest);
    return dest.x;
  }

  const distance = await _getDistance();
  const button = await page.waitForSelector("body > div.geetest_fullpage_click.geetest_float.geetest_wind.geetest_slide3 > div.geetest_fullpage_click_wrap > div.geetest_fullpage_click_box > div > div.geetest_wrap > div.geetest_slider.geetest_ready > div.geetest_slider_button");
  const box = await button.boundingBox();
  const axleX = Math.floor(box.x + box.width / 2);
  const axleY = Math.floor(box.y + box.height / 2);
  let count = 0;
  await btnSlider(distance);
  async function btnSlider(distance) {
    await page.mouse.move(axleX, axleY);
    await page.mouse.down();
    await sleep(getRndInteger(50, 90));
    await page.mouse.move(box.x + distance / 4 + getRndInteger(-18, 18), axleY + getRndInteger(-8, 8), { steps: getRndInteger(10, 20) });
    await sleep (getRndInteger(50, 200));
    await page.mouse.move(box.x + distance / 2 + getRndInteger(-18, 20), axleY + getRndInteger(-8, 10), { steps: getRndInteger(5, 15) });
    await sleep (getRndInteger(50, 200));
    await page.mouse.move(box.x + (distance / 8) * 7 + getRndInteger(-18, 18), axleY + getRndInteger(-8, 1), { steps: getRndInteger(6, 15) });
    await sleep (getRndInteger(50, 200));
    await page.mouse.move(box.x + distance + getRndInteger(-18, 20), axleY + getRndInteger(-8, 10), { steps: getRndInteger(8, 15) });
    await sleep (getRndInteger(50, 200));
    await page.mouse.move(box.x + distance + getRndInteger(20, 40), axleY + getRndInteger(-8, 8), { steps: getRndInteger(10, 30)});
    await sleep (getRndInteger(50, 200));
    await page.mouse.move(box.x + distance + 30 + getRndInteger(-1, 1), axleY + getRndInteger(-8, 10), { steps: getRndInteger(10, 30) });
    await sleep(getRndInteger(50, 200));
    await page.mouse.up();
    await sleep(2000);

    let text = await page.evaluate(() => {
      return document.querySelector("#embed-captcha > div > div.geetest_btn > div.geetest_radar_btn > div.geetest_radar_tip").innerText;
    });
    // let text2 = await page.evaluate(() => {
    //   return document.querySelector("#embed-captcha > div").innerText;
    // });
    console.log(text);
    let step = 0;
    //if (count > 5) return Promise.reject(new Error("识别验证码超次"))
    if (count > 5) return
      if (
        text.includes("怪物吃了拼图") ||
        text.includes("拖动滑块将悬浮图像正确拼合") ||
        text.includes("网络不给力请点击重试")
      ) {
        await sleep(2500);
        await page.click("#embed-captcha > div > div.geetest_btn > div.geetest_radar_btn > div.geetest_radar_tip");
        //await page.waitForResponse(response =>  response.url().match(encodeURIComponent('https://api.geetest.com/ajax.php')) && response.ok());
        await sleep(2500);
        step = await _getDistance();
        count ++
        await btnSlider(step);
      } else if (text.includes("请完成验证")) {
        step = await _getDistance();
        count ++
        await btnSlider(step);
      }
  }
}
function getResetUrl() {
  let since = dayjs.tz().subtract(3, 'day').toISOString()
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
          imap.search(['UNSEEN', ['SINCE', since], ['HEADER', 'SUBJECT', 'okgg.top']], function (err, results) {//搜寻2017-05-20以后未读的邮件
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

                          mailparser.on("data", function (data) {
                              if (data.type === 'text') {//邮件正文
                                  console.log("邮件内容信息>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
                                  //console.log("邮件内容: " + data.html);
                                  const regex = /(https?|http):\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]/g;
                                  let myArray = [];
                                  while ((myArray = regex.exec(data.html)) !== null) {
                                      //console.log(`Found ${myArray[0]}. Next starts at ${regex.lastIndex}.`)
                                      if (myArray[0].includes('okgg.top/password')) {
                                          resetUrl = myArray[0];
                                          //console.log(resetUrl)
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
async function resetMM(row,page,pool) {
  console.log("重置密码：resetMM")
  await clearBrowser(page) //clear all cookies
  await page.goto('https://okgg.xyz/password/reset', { timeout: 8000 }).catch((err) => console.log('首页超时'));
  await page.waitForSelector("#email", { timeout: 5000 })
  await page.type('#email', row.usr, { delay: 20 });
  await page.click('#reset');
  await page.waitForNavigation({ timeout: 3000 }).catch((err) => console.log('跳转超时'));
  await sleep(500);
  await clearBrowser(page) //clear all cookies
  let i = 0
  do {
      getResetUrl()
      await sleep(10000)
      i++
  } while (resetUrl == '' && i < 10)
  console.log("getResetUrl:", resetUrl)
  if (resetUrl == "") return Promise.reject(new Error('重置链接获取失败'));
  //await reset(browser,resetUrl,pwd)
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
  await page.type('#password', "780830lp")
  await page.type('#repasswd', "780830lp")
  await page.click("#reset")
  await page.waitForNavigation({ timeout: 5000 }).catch((err) => console.log('重置超时'));
  await sleep(1000)
  await exports.login(row, page, pool)  
}
exports.login = async function login(row, page, pool) {
  let cookies = []
  //cookies = JSON.parse(fs.readFileSync('./cookies.json', 'utf8'));
  //await page.setCookie(...cookies);
  await page.goto('https://okgg.xyz/auth/login', { timeout: 8000 }).catch((err) => console.log('首页超时'));
  await page.waitForSelector("#email", { timeout: 5000 })
  .then(async () => {
    //cookies = await page.cookies();
    //fs.writeFileSync('./cookies.json', JSON.stringify(cookies, null, '\t'));
  });
  await sleep(1000)
  await page.type('#email', row.usr, { delay: 20 });
  await page.waitForSelector("#passwd", { timeout: 5000 })
  await sleep(300)
  await page.type('#passwd', row.pwd, { delay: 20 });
  await sleep(300)
  await page.click('body > div.authpage > div > form > div > div.auth-help.auth-row > div > div > label > span.checkbox-circle-icon.icon');
  await sleep(500);
  /*await page.waitForSelector('#embed-captcha > div');
  await page.click('#embed-captcha > div');
  await sleep(2500);
  //await page.waitForResponse(response =>  response.url().match(encodeURIComponent('https://api.geetest.com/ajax.php')) && response.ok());
  await exports.sbFreeok(page);
  await page.waitForFunction(
    (selecter) => document.querySelector(selecter).innerHTML.includes("验证成功"),
    { timeout: 60000 },
    '#embed-captcha > div'
  );
  await sleep(1000);
  */
  await Promise.all([
    page.waitForNavigation({ timeout: 6000 }),
    //等待页面跳转完成，一般点击某个按钮需要跳转时，都需要等待 page.waitForNavigation() 执行完毕才表示跳转成功
    page.click('#login'),
  ])
    .then(async () => {
      console.log('模拟登录成功');
    })
    .catch(async (err) => {
      let msg = await page.evaluate(() => document.querySelector('#msg').innerHTML);
      if (msg.includes("账号在虚无之地，请尝试重新注册")) {
        //console.log('虚无之地',row.id,(dayjs.tz().unix()-dayjs.tz(row.level_end_time).unix()),(dayjs.tz().unix()-dayjs.tz(row.level_end_time).unix())/(24 * 60 * 60));
/*         if ((dayjs.tz().unix()-dayjs.tz(row.level_end_time).unix())/(24 * 60 * 60)>1){
          await pool.query("UPDATE freeok SET level = 0  WHERE id = ?", [row.id]);
          console.log('账户置0')
        } */
        let array = [1,2,3,8]
        if (array.includes(row.level)){
          await pool.query("UPDATE freeok SET level = 0  WHERE id = ?", [row.id]);
          console.log('账户置0')
        }else{
          await pool.query("UPDATE freeok SET err = 1  WHERE id = ?", [row.id]);
        }
        return Promise.reject(new Error('账号在虚无之地'));
      }
      msg = await page.evaluate(() => document.querySelector("#result > div > div > div.modal-inner").innerText);
      if (msg.includes('忘记密码了？请尝试重置密码')) {
        let array = [1,2,3,8]
        if (array.includes(row.level)){
          await pool.query("UPDATE freeok SET level = 0  WHERE id = ?", [row.id]);
          console.log('账户置0')
        }else{
          await pool.query("UPDATE freeok SET err = 1  WHERE id = ?", [row.id]);
          await resetMM(row, page, pool)
          return
        }
        return Promise.reject(new Error('请尝试重置密码'));
      }
      return Promise.reject(new Error('模拟登录失败'));
    });
}
exports.loginWithCookies = async function loginWithCookies(row, page, pool) {
  let cookies = JSON.parse(row.cookies);
  await page.setCookie(...cookies);
  await page.goto('https://okgg.xyz/user', { timeout: 10000 });
  //console.log('开始cookie登录');
  await page.waitForFunction(
    (selecter) => {
      if (document.querySelector(selecter)) {
        return document.querySelector(selecter).innerText.includes("用户面板");
      } else {
        return false;
      }
    },
    { timeout: 8000 },
    'body'
  )
  //.then(async () => { console.log("无需验证"); await sleep(1000); });
  let selecter, innerHtml;
  selecter = 'body > header > ul.nav.nav-list.pull-right > div > ul > li:nth-child(2) > a'; //退出
  await page.waitForSelector(selecter, { timeout: 8000 })
    .then(
      async () => {
        //console.log('cookie登录成功');
        return true;
      },
      async (err) => {
        let msg = await page.evaluate(() => document.querySelector('#msg').innerHTML);
        if (msg == "账号在虚无之地，请尝试重新注册") {
          if ((dayjs.tz().unix()-dayjs.tz(row.level_end_time).unix())/(24 * 60 * 60)>1){
            await pool.query("UPDATE freeok SET level = 0 WHERE id = ?", [row.id]);
          }
          return Promise.reject(new Error('账号在虚无之地'));
        } else {
          return Promise.reject(new Error('登录失败'));
        }
      });
}
exports.selectAsiaGroup = async function selectAsiaGroup(browser) {
  const page = await browser.newPage();
  page.on('dialog', async dialog => {
    //console.info(`➞ ${dialog.message()}`);
    await dialog.dismiss();
  });
  await page.goto('https://okgg.xyz/user/edit',{ timeout: 8000 });
  await sleep(1000);
  await page.waitForSelector('#group')
  await page.click('#group')
  await sleep(1000);
  await page.waitForSelector('.card-inner > .open > .dropdown-menu > li:nth-child(2) > .dropdown-option')
  await page.click('.card-inner > .open > .dropdown-menu > li:nth-child(2) > .dropdown-option')
  await sleep(1000);
  await page.waitForSelector('.card-inner > .card-inner > .cardbtn-edit > #group-update > .icon')
  await page.click('.card-inner > .card-inner > .cardbtn-edit > #group-update > .icon')
  await page.waitForNavigation()
  await sleep(1000);
  await page.close();
}
exports.resetPwd = async function resetPwd(row,browser,pool) {
  const page = await browser.newPage();
  page.on('dialog', async dialog => {
    //console.info(`➞ ${dialog.message()}`);
    await dialog.dismiss();
  });
  await page.goto('https://okgg.xyz/user/edit',{ timeout: 8000 });
  await sleep(1000);
/*   if (row.leveel > 0){
    await page.waitForSelector('#group')
    await page.click('#group')
    await sleep(1000);
    await page.waitForSelector('.card-inner > .open > .dropdown-menu > li:nth-child(2) > .dropdown-option')
    await page.click('.card-inner > .open > .dropdown-menu > li:nth-child(2) > .dropdown-option')
    await sleep(1000);
    await page.waitForSelector('.card-inner > .card-inner > .cardbtn-edit > #group-update > .icon')
    await page.click('.card-inner > .card-inner > .cardbtn-edit > #group-update > .icon')
    await page.waitForNavigation()
    await sleep(1000);
  }  */
  let selecter;
  selecter = '#sspwd';
  await page.waitForSelector(selecter, { timeout: 8000 })
    .then(async () => {
      //console.log('进入页面：修改资料');
      //await page.goto('https://okgg.xyz/user');
    });
  await page.type(selecter, Math.random().toString(36).slice(-12));
  await sleep(1000);
  await page.click('#ss-pwd-update')
    .then(async () => {
      await page.waitForFunction('document.querySelector("#msg").innerText.includes("修改成功")', { timeout: 8000 })
        .then(async () => {
          console.log('修改v2ray密码成功',row.id);
          if (row.level === 1) await pool.query("UPDATE freeok SET count = 0  WHERE id = ?", [row.id])
          //.catch((err) => console.log('重置count失败'));
          //await page.goto('https://okgg.xyz/user');
        })

    });
  await sleep(3000);
  await page.close();
}
exports.resetRss = async function resetRss(browser){
  const page = await browser.newPage()
  page.on('dialog', async dialog => {
    //console.info(`➞ ${dialog.message()}`);
    await dialog.dismiss();
  });
  await page.goto('https://okgg.xyz/user',{ timeout: 8000 });
  await sleep(1000);
  let selecter;
  selecter = "body > main > div.container > section > div.ui-card-wrap > div.col-xx-12.col-sm-8 > div.card.quickadd > div > div > div.cardbtn-edit > div.reset-flex > a";
  await page.waitForSelector(selecter, { timeout: 8000 })
    await page.click(selecter)
    await page.waitForFunction(
      'document.querySelector("#msg").innerText.includes("已重置您的订阅链接")',
      { timeout: 5000 }
    ).then(async () => {
      console.log('重置订阅链接成功')
      await sleep(1000)
    })
    await page.close()
}

