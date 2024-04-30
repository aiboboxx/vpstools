const fs = require("fs");
const { removeRepeatArray, sleep, clearBrowser, getRndInteger, randomOne, randomString, md5 } = require('./common.js');
const dns = require('dns');
const dnsPromises = dns.promises;
//let arr = [...fs.readFileSync('source-domains.txt', 'utf8').split('\n'), ...fs.readFileSync('result-domains.txt', 'utf8').split('\n')]
let arr = fs.readFileSync('source-domains.txt', 'utf8').split('\n')
let domains = [...new Set(arr)]
if (fs.existsSync('./_ip.txt')) {
    fs.unlinkSync('./_ip.txt');
    //     fs.unlinkSync('./output/domain2ip.txt');
    //     fs.unlinkSync('./output/domain2ip.txt.info');
};
(async function () {
    //await dnsPromises.setServers(['8.8.8.8'])
    for (const domain of domains) {
        console.log(domain);
        //await sleep(300)
        await dnsPromises.resolve(domain.trim(), 'A')
            .then((result) => {
                console.log(result);
                //fs.appendFileSync('./output/domainlist.txt', domain + '\n')
                fs.appendFileSync('./_ip.txt', result.join('\n') + '\n')
                //fs.appendFileSync('./output/domain2ip.txt.info', domain + ' ' + result[0] +'\n')
            })
            .catch((error) => { console.log('error: ', error.message); })
    }
    let arr = [...fs.readFileSync('source-ip.txt', 'utf8').split('\n'), ...fs.readFileSync('_ip.txt', 'utf8').split('\n')];
    // 合并source-ip.txt、_ip.txt 到 ip.txt
    //console.log(removeRepeatArray(arr))
    fs.writeFileSync('./ip.txt', [...new Set(arr)].join('\n'))
    console.log('cfdns.js Done')
})();






