const dns = require('dns');
const dnsPromises = dns.promises;
(async () => {
    await dnsPromises.resolve('cname.volcengine.eu.org', 'A')
    .then(async (result) => {
        console.log(result);
    })
})()