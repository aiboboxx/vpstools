
const { sleep } = require('./common')
const dayjs = require('dayjs')
let utc = require('dayjs/plugin/utc') // dependent on utc plugin
let timezone = require('dayjs/plugin/timezone')
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault("Asia/Hong_Kong")
let resetUrl = '';
function getResetUrl() {
    let since = dayjs.tz().subtract(3, 'day').toISOString()
    //var fs = require("fs")
    var Imap = require('imap')
    var MailParser = require("mailparser").MailParser
    var imap = new Imap({
        user: 'dgfwvj520@qq.com', //你的邮箱账号
        password: 'ktuqswqfgrjobgfc', //你的邮箱密码
        host: 'imap.qq.com', //邮箱服务器的主机地址
        port: 993, //邮箱服务器的端口地址
        tls: true, //使用安全传输协议
        //tlsOptions: { rejectUnauthorized: false } //禁用对证书有效性的检查
    });

    function openInbox(cb) {
        imap.openBox('INBOX', false, cb);
    }

    imap.once('ready', function () {
        openInbox(function (err, box) {
            console.log("打开邮箱");
            if (err) throw err;
            imap.search(['UNSEEN', ['SINCE', since], ['HEADER', 'SUBJECT', 'okgg.top']], function (err, results) {//搜寻2017-05-20以后未读的邮件
                try {
                    imap.setFlags(results, ['\\Seen'], function (err) {
                        if (!err) {
                            console.log("marked as read");
                        } else {
                            console.log(JSON.stringify(err, null, 2));
                        }
                    });
                    var f = imap.fetch(results, { bodies: '' });//抓取邮件（默认情况下邮件服务器的邮件是未读状态）

                    f.on('message', function (msg, seqno) {

                        var mailparser = new MailParser();

                        msg.on('body', function (stream, info) {

                            stream.pipe(mailparser);//将为解析的数据流pipe到mailparser

                            //邮件头内容
                            mailparser.on("headers", function (headers) {
                                console.log("邮件头信息>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
                                console.log("邮件主题: " + headers.get('subject'));
                                console.log("发件人: " + headers.get('from').text);
                                console.log("收件人: " + headers.get('to').text);
                            });

                            //邮件内容

                            mailparser.on("data", function (data) {
                                if (data.type === 'text') {//邮件正文
                                    console.log("邮件内容信息>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
                                    //console.log("邮件内容: " + data.html);
                                    const regex = /(https?|http):\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]+[-A-Za-z0-9+&@#/%=~_|]/g;
                                    let myArray = [];
                                    while ((myArray = regex.exec(data.html)) !== null) {
                                        //console.log(`Found ${myArray[0]}. Next starts at ${regex.lastIndex}.`)
                                        if (myArray[0].includes('okgg.top/password/')) {
                                            resetUrl = myArray[0];
                                            //console.log(resetUrl)
                                            break;
                                        }
                                    }

                                }
                                /*                         if (data.type === 'attachment') {//附件
                                                            console.log("邮件附件信息>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
                                                            console.log("附件名称:"+data.filename);//打印附件的名称
                                                            data.content.pipe(fs.createWriteStream(data.filename));//保存附件到当前目录下
                                                            data.release();
                                                        } */
                            });

                        });
                        msg.once('end', function () {
                            console.log(seqno + '完成');
                        });
                    });
                    f.once('error', function (err) {
                        console.log('抓取出现错误: ' + err);
                    });
                    f.once('end', function () {
                        console.log('所有邮件抓取完成!');
                        imap.end();
                    });
                }catch(err){
                    console.log(err)
                }

            });


        });
    });

    imap.once('error', function (err) {
        console.log(err);
    });

    imap.once('end', function () {
        console.log('关闭邮箱');
        return (resetUrl)
    });

    imap.connect();
}
async function main() {
    let i = 0
    do {
        getResetUrl()
        await sleep(10000)
        i++
    } while (resetUrl == '' && i < 10)
    console.log("end:", resetUrl)

}
main()


