#!/usr/bin/env node
const crypto = require("crypto");
const fs = require('fs');
const path = require('path');
const util = require('util');
const ncp = require('copy-paste');

const program = require('commander');
const qiniu = require("qiniu");

const config = require('../config/config.json');

program
    .version(require('../package.json').version)
    .usage('<picture path>', 'picture path (relative or absolute)')
    .option('-i, --personalinfo', 'Show qiniu personal info')
    .option('-a, --access_key <your access_key>', 'Set your access_key of www.qiniu.com')
    .option('-s, --secret_key <your secret_key>', 'Set your secret_key of www.qiniu.com')
    .option('-b, --bucket <your bucket>', 'Set your bucket of www.qiniu.com')
    .option('-n, --hostname <your hostname>', 'Set your hostname of your bucket')
    .parse(process.argv);

if (program.access_key) {
    config.access_key = program.access_key;
}
if (program.secret_key) {
    config.secret_key = program.secret_key;
}
if (program.bucket) {
    config.bucket = program.bucket;
}
if (program.hostname) {
    config.hostname = program.hostname;
}
if (program.access_key || program.secret_key || program.bucket || program.hostname) {
    fs.writeFileSync(path.join(path.parse(__dirname).dir, 'config/config.json'), JSON.stringify(config));
    process.exit();
}
if (!(config.access_key && config.secret_key && config.bucket && config.hostname)) {
    console.log('请先设置您的七牛云账户的 access_key, secret_key, bucket, hostname');
    process.exit();

}
if (program.personalinfo) { // 查询个人七牛云账户信息
    var personalinfo = JSON.parse(fs.readFileSync(path.join(path.parse(__dirname).dir, 'config/config.json')));
    console.log('您的七牛云账户个人信息：');
    console.log(`1. ACCESS_KEY：${personalinfo.access_key}`);
    console.log(`2. SECRET_KEY：${personalinfo.secret_key}`);
    console.log(`3. BUCKET_NAME：${personalinfo.bucket}`);
    console.log(`4. BUCKET_HOSTNAME：${personalinfo.hostname}`);
    process.exit();
} 

// 获取文件 md5 hash 值
function getMd5Hash(filePath) {
    var buffer = fs.readFileSync(filePath);
    var md5Hash = crypto.createHash('md5');
    md5Hash.update(buffer);
    return md5Hash.digest('hex');
}

// 获取文件后缀名
function getFileExt(filePath) {
    return (filePath.split('.'))[1];
}

//构建上传策略函数
function uptoken(bucket, key) {
  var putPolicy = new qiniu.rs.PutPolicy(bucket+":"+key);
  return putPolicy.token();
}

// 构造上传函数
function uploadFile(uptoken, key, localFile, host) {
  var extra = new qiniu.io.PutExtra();
    qiniu.io.putFile(uptoken, key, localFile, extra, function(err, ret) {
      if(!err) {
        // 上传成功， 处理返回值
        //console.dir(ret);
        ncp.copy(host + '/' + ret.key, () => {
            console.log(localFile + ' 上传成功, 外链 URL 已复制到粘贴板...');
        });
      } else {
        // 上传失败， 处理返回代码
        console.log(err);
      }
  });
}

// 配置
qiniu.conf.ACCESS_KEY = config.access_key;
qiniu.conf.SECRET_KEY = config.secret_key;
bucket = config.bucket;

const host = config.hostname;

var args = process.argv.splice(2);

var filePath = args[0]; // 要上传文件的本地路径

var key = getMd5Hash(filePath) + '.' + getFileExt(filePath);

// 生成上传 Token
token = uptoken(bucket, key);

//调用uploadFile上传
uploadFile(token, key, filePath, host);