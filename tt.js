async function freeok_sbyzm(page){
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
  await page.addScriptTag({content: injectedScript});
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
    let rets1 = await page.evaluate((selecter)=>getCanvasValue(selecter),selecter);
    //console.log("rets1",rets1);
    selecter = 'body > div.geetest_fullpage_click.geetest_float.geetest_wind.geetest_slide3 > div.geetest_fullpage_click_wrap > div.geetest_fullpage_click_box > div > div.geetest_wrap > div.geetest_widget > div > a > div.geetest_canvas_img.geetest_absolute > canvas';
    await page.waitForSelector(selecter);
    let rets2 = await page.evaluate((selecter)=>getCanvasValue(selecter),selecter);
    //await page.evaluate(()=>dlbg(),);
    //console.log("rets2",rets2);
    let dest = getLeftest ( differentSet (rets1,rets2));
    //console.log('dest',dest);
    return dest.x; 
  }
  const distance = await getDistance();
  const button = await  page.waitForSelector("body > div.geetest_fullpage_click.geetest_float.geetest_wind.geetest_slide3 > div.geetest_fullpage_click_wrap > div.geetest_fullpage_click_box > div > div.geetest_wrap > div.geetest_slider.geetest_ready > div.geetest_slider_button");
  const box = await button.boundingBox();
  const axleX = Math.floor(box.x + box.width / 2);
  const axleY = Math.floor(box.y + box.height / 2);
  await btnSlider(distance);
  async function btnSlider(distance) {
    await page.mouse.move(axleX, axleY);
    await page.mouse.down();
    await myfuns.Sleep(200);
    await page.mouse.move(box.x + distance / 4+ getRndInteger(-8,10), axleY + getRndInteger(-8,10), { steps: + getRndInteger(10,100) });
    await myfuns.Sleep(200);
    await page.mouse.move(box.x + distance / 3+ getRndInteger(-8,10), axleY+ getRndInteger(-8,10), { steps:  getRndInteger(10,100) });
    await myfuns.Sleep(350);
    await page.mouse.move(box.x + distance / 2+ getRndInteger(-8,10), axleY+ getRndInteger(-8,10), { steps: getRndInteger(10,100) });
    await myfuns.Sleep(400);
    await page.mouse.move(box.x + (distance / 3) * 2+ getRndInteger(-8,10), axleY+ getRndInteger(-8,10), { steps:  getRndInteger(10,100) });
    await myfuns.Sleep(350);
    await page.mouse.move(box.x + (distance / 4) * 3+ getRndInteger(-8,10), axleY+ getRndInteger(-8,10), { steps:  getRndInteger(10,100)  });
    await myfuns.Sleep(350);
    await page.mouse.move(box.x + distance +  getRndInteger(40,80), axleY+ getRndInteger(-8,10), { steps:  getRndInteger(10,100) });
    await myfuns.Sleep(300);
    await page.mouse.move(box.x + distance + 30+ getRndInteger(0,6), axleY+ getRndInteger(-8,10), { steps: getRndInteger(10,100)});
    await myfuns.Sleep(300);
    await page.mouse.up();
    await myfuns.Sleep(1000);
  
   const text = await page.evaluate(() => {
      return document.querySelector("#embed-captcha > div").innerText;
    });
    console.log('text',text);
    let step = 0;
    if (text) {
      // 如果失败重新获取滑块
      if (
        text.includes("怪物吃了拼图") ||
        text.includes("拖动滑块将悬浮图像正确拼合")
      ) {
        await page.waitFor(2000);
        await page.click("#embed-captcha > div");
        await page.waitFor(1000);
        step = await getDistance();
        await btnSlider(step);
      } else if (text.includes("速度超过")) {
        console.log("success");
      }
    }
  }
}

