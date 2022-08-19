/*
    사용자명과, url주소를 주면 해당 이미지를 특정 사이트에서 캡쳐한다.
*/
'use strict';

// 몽고디비 세팅
const { MongoClient } = require("mongodb");
const { fetch } = require("cross-fetch")
// Replace the uri string with your MongoDB deployment's connection string.
const uri =
    "mongodb://192.168.0.2:27017";
const client = new MongoClient(uri);
async function get(userInfo) {
    await client.connect()


    // console.log("complete")
    await client.close()

    return user
}
async function getUser(uid) {
    // if(month<10)
    //     month="0"+month

    // if(date<10)
    //     date="0"+date

    const database = client.db('engData');
    const newsCn = database.collection('users');

    const result = await newsCn.findOne({uid:uid})
    return result
}
async function insertBookmark(text) {
    const database = client.db('engData');
    const usersCol = database.collection('users');

    await usersCol.insertOne(text)

}

// async function run (){
//     const a = await getText()

//     console.log(a)    
// }
exports.insertBookmark = insertBookmark
// run()
