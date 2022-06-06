const { tFormat, sleep, clearBrowser, getRndInteger, randomOne, randomString } = require('./common.js');
const { sbFreeok, login, loginWithCookies, resetPwd, resetRss } = require('./utils.js');
Date.prototype.format = tFormat;
let d = new Date()
console.log(d.toLocaleString())
console.log(d.toString())
console.log(d.format('yyyy-MM-dd hh:mm:ss'))