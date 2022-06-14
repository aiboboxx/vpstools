async function main(){
const puppeteer = require('puppeteer');
const browser = await puppeteer.launch()
const page = await browser.newPage()
const navigationPromise = page.waitForNavigation()

await page.goto('https://b.luxury/signin')

await page.setViewport({ width: 1229, height: 603 })



await browser.close()
}
main()