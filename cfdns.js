const fs = require("fs");
const dns = require('dns');
const dnsPromises = dns.promises;
const domains = fs.readFileSync('domains.txt','utf8').split('\n');
if (fs.existsSync('./output/domainlist.txt')) {
    fs.unlinkSync('./output/domainlist.txt');
    fs.unlinkSync('./output/domain2ip.txt');
    fs.unlinkSync('./output/domain2ip.txt.info');
  };
(async function() {   
    for (const domain of domains){
        console.log(domain); 
        await dnsPromises.resolve4(domain)
        .then((result) => { 
            console.log(result); 
            fs.appendFileSync('./output/domainlist.txt', domain + '\n')
            fs.appendFileSync('./output/domain2ip.txt', result[0] + '\n')
            fs.appendFileSync('./output/domain2ip.txt.info', domain + ' ' + result[0] +'\n')
        })
        .catch((error)=>{console.log('error: ', error.message);})
    }
    console.log('Done')
})(); 






