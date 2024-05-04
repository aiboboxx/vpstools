const dns = require('dns');
const dnsPromises = dns.promises;
(async () => {
    await dnsPromises.resolve('www.c333.net', 'A')
    .then(async (result) => {
        console.log(result);
    })
})()