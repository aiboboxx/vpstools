const dns = require('dns');
const dnsPromises = dns.promises;
(async () => {
    await dnsPromises.resolve('cf.cdn.cmliu.net', 'A')
    .then(async (result) => {
        console.log(result);
    })
})()