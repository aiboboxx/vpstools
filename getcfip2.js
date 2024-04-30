const fs = require("fs")
const { chromium } = require('playwright-extra')
const stealth = require('puppeteer-extra-plugin-stealth')()
chromium.use(stealth)
const dayjs = require('dayjs')
let utc = require('dayjs/plugin/utc') // dependent on utc plugin
let timezone = require('dayjs/plugin/timezone')
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault("Asia/Hong_Kong")
const { removeRepeatArray, sleep, clearBrowser, getRndInteger, randomOne, randomString,  md5 } = require('./common.js');
const setup = JSON.parse(fs.readFileSync('./setup.json', 'utf8'))
let runId = process.env.runId
console.log(dayjs().diff(dayjs.unix(setup.iptxt.unix),'day'),setup.iptxt.unix,dayjs.tz().unix())
if ( dayjs().diff(dayjs.unix(setup.iptxt.unix),'day') > 2) { // 每三天
  console.log("new day!")
  fs.writeFileSync('domains.txt', fs.readFileSync('source-domains.txt', 'utf8'))
  setup.iptxt.line = 0
  setup.iptxt.unix = dayjs.tz().unix()
  fs.writeFileSync('setup.json', JSON.stringify(setup, null, '\t'))
}
let ipline = setup.iptxt.line
let browser
async function launchBrowser() {
  browser = await chromium.launch({
    headless: runId ? true : false,
    headless: true,
    args: [
      '--window-size=1920,1080',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
    defaultViewport: null,
    ignoreHTTPSErrors: true,
  })
}
async function main() {
  await launchBrowser()
  const context = await browser.newContext()
  const page = await browser.newPage()
  page.setDefaultTimeout(20000);
  //过滤google广告
  await page.route('**/*', (route, request) => {
    // Block All Images
    if (request.url().includes("googleadservices.com")) {
        route.abort();
    } else if (request.resourceType() === 'video') {
        route.abort();
    }
    else {
        route.continue()
    }
  });
  const ips = fs.readFileSync('source-ip.txt','utf8').split('\n')
  // 通过ip.txt 获取 域名列表 domains.txt
  //const ips = ["116.214.34.66"]
  //console.log(ips)
  //return
  let domains = []
  let i = 0
  //if (ipline >= ips.length) ipline = 0
  for (ipline;ipline < ips.length; ipline++){
    i++; if ( i > 20) break;
    await page.goto(`https://www.qvdv.net/tools/qvdv-gethost.html?ip=${ips[ipline]}`)
    .catch(async (error)=>{console.log('error: ', error.message);})
    await sleep(500)
    let links =  page.locator('p#gethost_out > .layui-table td:nth-of-type(1)')
    //console.log('links个数：',await links.count())
    //console.log(JSON.stringify(links))
    await links.evaluateAll(
      list => list.map(element => element.innerHTML))
      .then(async (result) => {
      domains.push(...result)
      console.log(i,'取得域名：',result)
      })
      .catch(async (error)=>{console.log('error: ', error.message);})
    await sleep(1000)
  }

  let arr = [...domains,...fs.readFileSync('domains.txt','utf8').split('\n')];
  fs.writeFileSync('domains.txt', [...new Set(arr)].join('\n'))
  setup.iptxt.line = ipline
  fs.writeFileSync('setup.json', JSON.stringify(setup, null, '\t'))
  console.log('getcfip2 Done')
  await page.close()
  await context.close()
  await browser.close()
}
main()