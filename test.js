
const dayjs = require('dayjs')
let utc = require('dayjs/plugin/utc') // dependent on utc plugin
let timezone = require('dayjs/plugin/timezone')
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault("Asia/Hong_Kong")
console.log("diff day!",dayjs.unix(1687060844).format('YYYY-MM-DD') )
const date1 = dayjs('2019-01-25')
const date2 = dayjs('2018-06-05')

console.log(date1.diff(date2) )
console.log(date2.diff(date1) )