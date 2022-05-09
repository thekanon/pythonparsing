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
async function get() {
    //step1 MBTI가 있는 모든 문서를 가져옴
    await client.connect()

    let toDay = await toDayData()
    if(!toDay){
        const text = await getText()
        await insertNews(text)
        toDay = await toDayData()
    }
    console.log("run")

    // console.log("complete")
    await client.close()

    return toDay
}
async function toDayData() {
    let today = new Date();
    let year = today.getFullYear(); // 년도
    let month = today.getMonth() + 1;  // 월
    let date = today.getDate();  // 날짜

    if(month < 10)
        month="0"+month
    if(date < 10)
        date="0"+date

    // if(month<10)
    //     month="0"+month

    // if(date<10)
    //     date="0"+date

    const database = client.db('engData');
    const newsCn = database.collection('news');
    const title = year + '' + month + '' + date

    const result = await newsCn.findOne({title:title})
    return result
}
async function getDateList(){
    await client.connect()
    const database = client.db('engData');
    const newsCn = database.collection('news');
    const result = await newsCn.find({},{projection:{_id:0,title:1}}).toArray()
    return result
}

async function getDate(date){
    await client.connect()
    const database = client.db('engData');
    const newsCn = database.collection('news');
    const result = await newsCn.findOne({title:date})
    return result
}

async function insertNews(text) {
    const database = client.db('engData');
    const newsCn = database.collection('news');
    const newsObj = {}
    const tranKor = []

    for(var el of text){
        // console.log(el[0]+"\n"+el[1])
        const response = await (await fetch('http://192.168.0.2:3001/translate/', {
            method: "POST",
            body: JSON.stringify({ data: el[0]+"\n"+el[1] }),
            headers: {
                'Content-Type': 'application/json'
            }
        })).json()
        console.log(response)
        tranKor.push(response.message.result.translatedText.split("\n"))
    }

    let today = new Date();
    let year = today.getFullYear(); // 년도
    let month = today.getMonth() + 1;  // 월
    if(month < 10)
        month="0"+month
    let date = today.getDate();  // 날짜
    if(date < 10)
        date="0"+date

    newsObj.title = year + '' + month + '' + date
    newsObj.textEng = text
    newsObj.textKor = tranKor
    newsObj.clearText = text.map(e => false)


    await newsCn.insertOne(newsObj)

}
async function getText() {
    const puppeteer = require('puppeteer');
    const path = require('path');
    const fs = require('fs');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    // const iPhone = puppeteer.devices['iPhone 6'];
    // await page.emulate(iPhone);

    await page.goto("https://feeds.bbci.co.uk/news/world/rss.xml");
    // console.log(keyword)
    await page.waitForSelector("#item > ul > li");
    // console.log(imgUrl)
    const selector = await page.$$eval("#item > ul > li", (options) =>
        options.map((option) => [option.children[0].textContent, option.children[2].textContent])
        // options.map((option)=> option.textContent)
    );
    // await page.goto(imgUrl);
    await browser.close();
    return selector
};

async function run (){
    await client.connect()

    await get()
}
exports.get = get
exports.getDate = getDate
exports.getDateList = getDateList
run()