const { sleep, getRndInteger, randomOne, randomString } = require('./common.js');
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
/*   let selecter = 'body > div.geetest_fullpage_click.geetest_float.geetest_wind.geetest_slide3 > div.geetest_fullpage_click_wrap > div.geetest_fullpage_click_box > div > div.geetest_wrap > div.geetest_widget > div > a > div.geetest_canvas_img.geetest_absolute > div > canvas.geetest_canvas_bg.geetest_absolute';
  let el;
  while (el === undefined ) {
    let el = await page.waitForSelector(selecter);
    await sleep(500);
  } */
  //await sleep(5000);
  const distance = await _getDistance();
  const button = await page.waitForSelector("body > div.geetest_fullpage_click.geetest_float.geetest_wind.geetest_slide3 > div.geetest_fullpage_click_wrap > div.geetest_fullpage_click_box > div > div.geetest_wrap > div.geetest_slider.geetest_ready > div.geetest_slider_button");
  const box = await button.boundingBox();
  const axleX = Math.floor(box.x + box.width / 2);
  const axleY = Math.floor(box.y + box.height / 2);
  await btnSlider(distance);
  async function btnSlider(distance) {
    await page.mouse.move(axleX, axleY);
    await page.mouse.down();
    await sleep(getRndInteger(50, 90));
    await page.mouse.move(box.x + distance / 4 + getRndInteger(-8, 10), axleY + getRndInteger(-8, 10), { steps: +getRndInteger(50, 90) });
    //await sleep (getRndInteger(50, 200));
    await page.mouse.move(box.x + distance / 2 + getRndInteger(-8, 10), axleY + getRndInteger(-8, 10), { steps: getRndInteger(50, 90) });
    //await sleep (getRndInteger(50, 200));
    await page.mouse.move(box.x + (distance / 8) * 7 + getRndInteger(-8, 10), axleY + getRndInteger(-8, 10), { steps: getRndInteger(50, 90) });
    //await sleep (getRndInteger(50, 200));
    await page.mouse.move(box.x + distance + getRndInteger(-8, 10), axleY + getRndInteger(-8, 10), { steps: getRndInteger(50, 90) });
    //await sleep (getRndInteger(50, 200));
    await page.mouse.move(box.x + distance + getRndInteger(20, 40), axleY + getRndInteger(-8, 10), { steps: getRndInteger(50, 90) });
    //await sleep (getRndInteger(50, 200));
    await page.mouse.move(box.x + distance + 30 + getRndInteger(-1, 3), axleY + getRndInteger(-8, 10), { steps: getRndInteger(50, 90) });
    await sleep(getRndInteger(50, 200));
    await page.mouse.up();
    await sleep(2000);

    let text = await page.evaluate(() => {
      return document.querySelector("#embed-captcha > div > div.geetest_btn > div.geetest_radar_btn > div.geetest_radar_tip").innerText;
    });
    let text2 = await page.evaluate(() => {
      return document.querySelector("#embed-captcha > div").innerText;
    });
    //console.log(text, text2);
    let step = 0;
    if (text) {
      // 如果失败重新获取滑块
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
        await btnSlider(step);
      } else if (text.includes("请完成验证")) {
        step = await _getDistance();
        await btnSlider(step);
      }
    }
  }
}

exports.login = async function login(row, page, pool) {
  await page.goto('https://v2.freeyes.xyz/auth/login', { timeout: 30000 }).catch((err) => console.log('首页超时'));
  await page.waitForSelector("#email", { timeout: 30000 });
  await page.type('#email', row.usr, { delay: 20 });
  await page.type('#passwd', row.pwd, { delay: 20 });
  await page.click('body > div.authpage > div > form > div > div.auth-help.auth-row > div > div > label > span.checkbox-circle-icon.icon');
  await sleep(1000);
  await page.waitForSelector('#embed-captcha > div');
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
  await Promise.all([
    page.waitForNavigation({ timeout: 10000 }),
    //等待页面跳转完成，一般点击某个按钮需要跳转时，都需要等待 page.waitForNavigation() 执行完毕才表示跳转成功
    page.click('#login'),
  ])
    .then(async () => {
      console.log('登录成功');
    })
    .catch(async (err) => {
      let msg = await page.evaluate(() => document.querySelector('#msg').innerHTML);
      if (msg == "账号在虚无之地，请尝试重新注册") {
        await pool.query("UPDATE freeok SET level = 0  WHERE id = ?", [row.id]);
        return Promise.reject(new Error('账号在虚无之地'));
      }
    });
}
exports.loginWithCookies = async function loginWithCookies(row, page, pool) {
  let cookies = JSON.parse(row.cookies);
  await page.setCookie(...cookies);
  await page.goto('https://v2.freeyes.xyz/user', { timeout: 30000 });
  console.log('开始cookie登录');
  await page.waitForFunction(
    (selecter) => {
      if (document.querySelector(selecter)) {
        return document.querySelector(selecter).innerText.includes("用户中心");
      } else {
        return false;
      }
    },
    { timeout: 5000 },
    'body'
  ).then(async () => { console.log("无需验证"); await sleep(1000); });
  //await sleep(6000);
  let selecter, innerHtml;
  selecter = 'body > header > ul.nav.nav-list.pull-right > div > ul > li:nth-child(2) > a'; //退出
  await page.waitForSelector(selecter, { timeout: 30000 })
    .then(
      async () => {
        console.log('登录成功');
        //await page.goto('https://v2.freeyes.xyz/user');
        return true;
      },
      async (err) => {
        let msg = await page.evaluate(() => document.querySelector('#msg').innerHTML);
        if (msg == "账号在虚无之地，请尝试重新注册") {
          await pool.query("UPDATE freeok SET level = 1  WHERE id = ?", [row.id]);
          return Promise.reject(new Error('账号在虚无之地'));
        } else {
          return Promise.reject(new Error('登录失败'));
        }
      });
}
exports.resetPwd = async function resetPwd(browser) {
  const page = await browser.newPage();
  page.on('dialog', async dialog => {
    //console.info(`➞ ${dialog.message()}`);
    await dialog.dismiss();
  });
  await page.goto('https://v2.freeyes.xyz/user/edit');
  await sleep(1000);
  let selecter, innerHtml;
  selecter = '#sspwd';
  await page.waitForSelector(selecter, { timeout: 10000 })
    .then(async () => {
      console.log('进入页面：修改资料');
      //await page.goto('https://v2.freeyes.xyz/user');
    });
  //innerHtml = await page.$eval(selecter, el => el.value);
  await page.type(selecter, Math.random().toString(36).slice(-8));
  await page.click('#ss-pwd-update')
    .then(async () => {
      await page.waitForFunction('document.querySelector("#msg").innerText.includes("修改成功")', { timeout: 3000 })
        .then(async () => {
          console.log('修改v2ray密码成功');
          //await page.goto('https://v2.freeyes.xyz/user');
        })
        .catch((err) => console.log('修改v2ray密码失败'));
    });
  await sleep(1000);
  await page.close();
}
