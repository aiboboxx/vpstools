const fs = require("fs");
const { removeRepeatArray, sleep, clearBrowser, getRndInteger, randomOne, randomString,  md5 } = require('./common.js');
const dns = require('dns');
const dnsPromises = dns.promises;
let domains = fs.readFileSync('domains.txt','utf8').split('\n')
// 解析alldomain.txt中的域名到_ip.txt
if (fs.existsSync('domain2ip.txt')) {
    fs.unlinkSync('domain2ip.txt');
    fs.unlinkSync('domain2ip.txt.info');
   };
(async function() {   
    //await dnsPromises.setServers(['8.8.8.8'])
    for (const domain of domains){
        console.log(domain); 
        //await sleep(300)
        await dnsPromises.resolve(domain.trim(),'A')
        .then((result) => { 
            console.log(result); 
            fs.appendFileSync('domain2ip.txt', result.join('\n') + '\n' )
            fs.appendFileSync('domain2ip.txt.info', domain + '  ' + result.join('\n' + domain + '  ') + '\n')
        })
        .catch((error)=>{console.log('error: ', error.message);})
    }
    console.log('domain2ip.js Done')
})(); 
