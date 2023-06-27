const { expect } = require('./expect.js')
const fs = require("fs")
const { chromium } = require('playwright-extra')
const stealth = require('puppeteer-extra-plugin-stealth')()
chromium.use(stealth)
const { removeRepeatArray, sleep, clearBrowser, getRndInteger, randomOne, randomString, findFrames, findFrame, md5 } = require('./common.js');
const mysql = require('mysql2/promise')
const setup = JSON.parse(fs.readFileSync('./setup.json', 'utf8'))
let item 
let runId = process.env.runId
let browser
async function launchBrowser() {
    browser = await chromium.launch({
        headless: runId ? true : false,
        //headless: true,
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
    async function comment(row,page){
        await page.goto(row.url)
        .catch(async (error)=>{console.log('goto error: ', error.message);isError=true})
        //if (isError) return Promise.reject(new Error('出错返回。'))
        //抓取友情链接
        //let links = page.getByRole('link', { name: /友链$/,includeHidden: true })
        //fs.writeFileSync('body.txt', await page.locator('body').innerHTML())
        //fs.writeFileSync('body2.txt', await page.$eval('body', e => e.outerHTML))
        //fs.writeFileSync('html.txt', await page.content())
        await page.waitForTimeout(3000);
          let nick = randomOne(setup[item].nick)
          let links =   page.locator('input[name="nick"]')
              .or(page.locator('input[name="author"]'))
              .or(page.getByPlaceholder('昵称'))
        await expect(links.first()).toBeAttached()
          //console.log('nick:',randomOne(setup[item].nick))
        //  for (const link of await links.all()){
        //     console.log('link:',await link.evaluate (node => node.outerHTML))
        //     //console.log('link:',await link.innerHTML())
        //     //console.log(await link.evaluate (node => node.href))

        console.log('All done, comment. ✨')
      }
    let row ={}
    row.id = 1
    row.url = "https://easyf12.top/friends/" 
    item = randomOne(setup.workflow)
    await comment(row,page).catch(async (error)=>{console.log('error: ', error.message);})
    // await page.close()
    // await context.close()
    // await browser.close()
}
expect("a").not.toBe("b")
main()
