const { tFormat, sleep, clearBrowser, getRndInteger, randomOne, randomString } = require('./common.js');
const { sbFreeok, login, loginWithCookies, resetPwd, resetRss } = require('./utils.js');
const dayjs = require('dayjs')
let utc = require('dayjs/plugin/utc') // dependent on utc plugin
let timezone = require('dayjs/plugin/timezone')
dayjs.extend(utc)
dayjs.extend(timezone)
//dayjs.tz.setDefault("Asia/Hong_Kong")

console.log(dayjs.tz("2022-06-10 04:49:53","America/New_York").local().format('YYYY-MM-DD HH:mm:ss'))

console.log(dayjs("2022-06-10 04:49:53").tz("America/New_York").format('YYYY-MM-DD HH:mm:ss'))
console.log(dayjs("2022-06-10 04:49:53").tz("America/New_York",true).format('YYYY-MM-DD HH:mm:ss'))