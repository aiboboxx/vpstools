const fs = require("fs")
const dns = require('dns');
const dnsPromises = dns.promises;
const domains = fs.readFileSync('domains.txt','utf8').split('\n');

(async function() {   
    for (const domain of domains){
        console.log(domain); 
        await dnsPromises.resolve4(domain)
        .then((result) => { 
            console.log(result); 
            fs.appendFileSync('./output/domainlist.txt', domain + '\n')
            for (const r of result){            
                fs.appendFileSync('./output/domain2ip.txt', r + '\n')
                fs.appendFileSync('./output/domain2ip.txt.info', domain + ' ' + r +'\n')
            }
        })
        .catch((error)=>{console.log('error: ', error.message);})
    }
    console.log('Done')
})(); 






