const fs = require("fs");
const { spawnLog,sleepSync } = require('./common.js');
const { spawn } = require('child_process');
let subprocess = spawn('cmd.exe', ['/c', 'taskkill /F /IM v2rayn.exe']);
//const bat = spawn('cmd.exe', ['/c', 'my.bat']);
spawnLog(subprocess);
sleepSync(3000);
run();

subprocess = spawn('cmd.exe', ['/c', 'startV2rayN.bat']);
spawnLog(subprocess);
sleepSync(3000);
//run();
//bat.kill('SIGTERM');
 function run() {
    const fileArr = fs.readdirSync('D:/networks/v2rayN-Core/configs');
    console.log(fileArr);
    //changeProxy(fileArr[1]);
     for(let configFile of fileArr){
      console.log('-config=D:/networks/v2rayN-Core/configs/' + configFile);
      subprocess = spawn('D:/networks/v2rayN-Core/v2ray.exe', ['-config=D:/networks/v2rayN-Core/configs/' + configFile]);
        sleepSync(30000);
        subprocess.kill('SIGTERM');
    }
} 
