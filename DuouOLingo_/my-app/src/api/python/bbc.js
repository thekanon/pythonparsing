/*
    사용자명과, url주소를 주면 해당 이미지를 특정 사이트에서 캡쳐한다.
*/
'use strict';

// 몽고디비 세팅
const { MongoClient } = require("mongodb");
// Replace the uri string with your MongoDB deployment's connection string.
const uri =
    "mongodb://192.168.0.2:27017";
const client = new MongoClient(uri);
async function run() {
    //step1 MBTI가 있는 모든 문서를 가져옴
    await client.connect()
    const MBTIs = ["INFP", "ENFP", "ESFJ", "ISFJ", "ISFP", "ESFP", "INTP", "INFJ", "ENFJ", "ENTP", "ESTJ", "ISTJ", "INTJ", "ISTP", "ESTP", "ENTJ"]


    //step2 MBTI별로 유저 목록을 가져와서 해당 유저의 '분류'란에 가장 많은 빈도수를 가진 top 5를 가져온다.
    const MBTIObj = {}

    for (var i = 0; i < MBTIs.length; i++) {
        MBTIObj[MBTIs[i]] = await findUser(MBTIs[i])
    }
    console.log(MBTIObj)
    await client.close()

    return
}
async function findUser(mbti) {
    const database = client.db('mbti');
    const profileDB = database.collection('profiles');

    const query = { 'MBTI': mbti };

    // MBTI가 있는 모든 문서 찾기
    const users = []
    await profileDB.find(query).forEach(function (p) { users.push(p) })

    const countObj = {}
    Object.values(users).map(e => {
        e["분류"].map(el => {
            if (countObj[el])
                countObj[el]++
            else
                countObj[el] = 1
        })
        // console.log(e.title)
    })
    const sortable = Object.entries(countObj)
        .sort(([, a], [, b]) => b - a)
        .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

    const userGroup = {}
    const idx = Object.keys(sortable)
    userGroup[idx[0]] = sortable[idx[0]]
    userGroup[idx[1]] = sortable[idx[1]]
    userGroup[idx[2]] = sortable[idx[2]]
    userGroup[idx[3]] = sortable[idx[3]]
    userGroup[idx[4]] = sortable[idx[4]]
    return sortable
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
    const selector = await page.$$eval("#item > ul > li", (options)=>
        options.map((option)=> [option.children[0].textContent,option.children[2].textContent ])
        // options.map((option)=> option.textContent)
    );
    // await page.goto(imgUrl);
    await browser.close();
    return selector
};

// async function run (){
//     const a = await getText()

//     console.log(a)    
// }
// exports.getText = getText
run()