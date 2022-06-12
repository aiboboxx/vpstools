async function main(){
const puppeteer = require('puppeteer');
const browser = await puppeteer.launch()
const page = await browser.newPage()
const navigationPromise = page.waitForNavigation()

await page.goto('https://b.luxury/signin')

await page.setViewport({ width: 1229, height: 603 })

await page.waitForSelector('.el-form:nth-child(3) > .el-form-item:nth-child(1) > .el-form-item__content > .el-input > .el-input__inner')
await page.click('.el-form:nth-child(3) > .el-form-item:nth-child(1) > .el-form-item__content > .el-input > .el-input__inner')
await page.type('.el-form:nth-child(3) > .el-form-item:nth-child(1) > .el-form-item__content > .el-input > .el-input__inner',"eroslp@gmail.com")

await page.waitForSelector('.el-form:nth-child(3) > .el-form-item:nth-child(2) > .el-form-item__content > .el-input > .el-input__inner')
await page.click('.el-form:nth-child(3) > .el-form-item:nth-child(2) > .el-form-item__content > .el-input > .el-input__inner')

await page.waitForSelector('.el-form > .el-form-item:nth-child(3) > .el-form-item__content > .el-input > .el-input__inner')
await page.click('.el-form > .el-form-item:nth-child(3) > .el-form-item__content > .el-input > .el-input__inner')

await page.waitForSelector('.el-form > .el-form-item:nth-child(4) > .el-form-item__content > .el-input > .el-input__inner')
await page.click('.el-form > .el-form-item:nth-child(4) > .el-form-item__content > .el-input > .el-input__inner')

await page.waitForSelector('div > .el-form > .el-form-item:nth-child(7) > .el-form-item__content > .el-button')
await page.click('div > .el-form > .el-form-item:nth-child(7) > .el-form-item__content > .el-button')

await page.waitForSelector('.el-message-box__container > .el-message-box__message > div > .el-button--primary > span')
await page.click('.el-message-box__container > .el-message-box__message > div > .el-button--primary > span')

await page.waitForSelector('.demo-ruleForm > .el-form-item:nth-child(1) > .el-form-item__content > .el-input > .el-input__inner')
await page.click('.demo-ruleForm > .el-form-item:nth-child(1) > .el-form-item__content > .el-input > .el-input__inner')

await page.type('.demo-ruleForm > .el-form-item:nth-child(1) > .el-form-item__content > .el-input > .el-input__inner', 'eroslp99@gmail.com')

await page.waitForSelector('.demo-ruleForm > .el-form-item:nth-child(2) > .el-form-item__content > .el-input > .el-input__inner')
await page.click('.demo-ruleForm > .el-form-item:nth-child(2) > .el-form-item__content > .el-input > .el-input__inner')

await page.waitForSelector('.el-form-item:nth-child(3) > .el-form-item__content > .el-checkbox > .el-checkbox__input > .el-checkbox__inner')
await page.click('.el-form-item:nth-child(3) > .el-form-item__content > .el-checkbox > .el-checkbox__input > .el-checkbox__inner')

await page.waitForSelector('.el-form-item:nth-child(3) > .el-form-item__content > .el-checkbox > .el-checkbox__input > .el-checkbox__inner')
await page.click('.el-form-item:nth-child(3) > .el-form-item__content > .el-checkbox > .el-checkbox__input > .el-checkbox__inner')

await page.waitForSelector('div > .demo-ruleForm > .el-form-item > .el-form-item__content > .el-button')
await page.click('div > .demo-ruleForm > .el-form-item > .el-form-item__content > .el-button')

await page.waitForSelector('.el-message-box__wrapper > .el-message-box > .el-message-box__btns > .el-button > span')
await page.click('.el-message-box__wrapper > .el-message-box > .el-message-box__btns > .el-button > span')

await navigationPromise

await page.waitForSelector('.el-dialog__wrapper > .el-dialog--center > .el-dialog__header > .el-dialog__headerbtn > .el-dialog__close')
await page.click('.el-dialog__wrapper > .el-dialog--center > .el-dialog__header > .el-dialog__headerbtn > .el-dialog__close')

await browser.close()
}
main()