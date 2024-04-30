const fs = require("fs");
const axios = require('axios').default;
const { removeRepeatArray, sleep, clearBrowser, getRndInteger, randomOne, randomString, md5 } = require('./common.js');
const sethost_url = "http://sh.bzshare.com/"
//"$sethost_url/sethost.php?host=$domain&tags=$tag$num&token=dzakYE8TAga7")
const cfpros = fs.readFileSync('cfpros.txt', 'utf8').split('\n').filter(item => item.trim())
const zones = ['jp','hk','sg','vn','us','ust','gb','de','tr']
let tags = []
for (let zone of zones){
    //console.log(zone)
    for (let i=1; i<7; i++){
        tags.push(zone + i.toString().padStart(2,0))
    } 
}
(async () => {
    for (let i=0; i<tags.length; i++) {
        let index = i%cfpros.length
        //console.log(index)
        await axios.get(`${sethost_url}/sethost.php?host=${cfpros[index]}&tags=${tags[i]}&token=dzakYE8TAga7`)
        .then( (response) => {
            console.log(index,`${sethost_url}/sethost.php?host=${cfpros[index]}&tags=${tags[i]}&token=dzakYE8TAga7`,response.data)
        }).catch( (error) => console.log(error))
    }
})()