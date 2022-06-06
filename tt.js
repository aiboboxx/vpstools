const { tFormat, sleep, clearBrowser, getRndInteger, randomOne, randomString } = require('./common.js');
const { sbFreeok, login, loginWithCookies, resetPwd, resetRss } = require('./utils.js');
const dayjs = require('dayjs')
let utc = require('dayjs/plugin/utc') // dependent on utc plugin
let timezone = require('dayjs/plugin/timezone')
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault("Asia/Hong_Kong")
Date.prototype.format = tFormat;
let d = new Date()
console.log(d.toLocaleString())
console.log(d.toString())
console.log(d.format('yyyy-MM-dd hh:mm:ss'))
console.log(dayjs.tz().format('YYYY-MM-DD HH:mm:ss'))