const dns = require('dns');
const dnsPromises = dns.promises;
(async () => {
    await dnsPromises.resolve('u5jj.com', 'A')
    .then(async (result) => {
        console.log(result);
    })
})()