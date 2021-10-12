const randomUseragent = require('random-useragent');
const fs = require("fs");
const core = require('@actions/core');
const github = require('@actions/github');
const mysql = require('mysql2/promise');
const puppeteer = require('puppeteer-extra')

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())
const runId = github.context.runId;
const { tFormat, sleep, clearBrowser, getRndInteger, randomOne, randomString } = require('./common.js');
const { sbFreeok } = require('./utils.js');
//const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36';
let browser;
let setup = {};
if (!runId) {
  setup = JSON.parse(fs.readFileSync('./setup.json', 'utf8'));
} else {
  setup = JSON.parse(process.env.SETUP);
}
async function createPage (browser,url) {
    browser = await puppeteer.launch({
        headless: runId ? true : false,
        args: [
          '--window-size=1920,1080',
          setup.proxyL
        ],
        defaultViewport: null,
        ignoreHTTPSErrors: true
      });

    await page.goto(url, { waitUntil: 'networkidle2',timeout: 0 } );
    return page;
}
createPage(browser,'https://v2.freeyes.xyz/auth/register?code=wsOq')
//createPage(browser,'https://bot.sannysoft.com/')