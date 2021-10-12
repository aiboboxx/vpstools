const puppeteer = require('puppeteer-extra')

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())
let browser;
async function name(params) {
    browser = await puppeteer.launch({ ignoreDefaultArgs: ["--enable-automation"], headless: false }); //去除自动化测试的提醒
    const page = await browser.newPage()


    }) 
    await page.goto('https://v2.freeyes.xyz/auth/register?code=wsOq');
    await page.goto('https://bot.sannysoft.com/');

}
name();