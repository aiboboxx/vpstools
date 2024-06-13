const dns = require('dns');
const dnsPromises = dns.promises;
(async () => {
    await dnsPromises.resolve('v2ph.com', 'A')
    .then(async (result) => {
        console.log(result);
    })
})()