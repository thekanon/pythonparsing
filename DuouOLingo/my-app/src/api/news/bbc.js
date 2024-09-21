/*
    사용자명과, url주소를 주면 해당 이미지를 특정 사이트에서 캡쳐한다.
*/
"use strict";

// 몽고디비 세팅
const { MongoClient } = require("mongodb");
const { fetch } = require("cross-fetch");
// Replace the uri string with your MongoDB deployment's connection string.
const uri = "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);
async function get() {
  console.log("get");
  await client.connect();

  let toDay = await toDayData();
  if (!toDay) {
    const text = await getText();
    await insertNews(text);
    toDay = await toDayData();
  }
  console.log("run");

  // console.log("complete")
  await client.close();

  return toDay;
}
async function toDayData() {
  let today = new Date();
  let year = today.getFullYear(); // 년도
  let month = today.getMonth() + 1; // 월
  let date = today.getDate(); // 날짜

  if (month < 10) month = "0" + month;
  if (date < 10) date = "0" + date;

  // if(month<10)
  //     month="0"+month

  // if(date<10)
  //     date="0"+date

  const database = client.db("engData");
  const newsCn = database.collection("news");
  const title = year + "" + month + "" + date;

  const result = await newsCn.findOne({ title: title });
  return result;
}
async function getDateList() {
  await client.connect();
  const database = client.db("engData");
  const newsCn = database.collection("news");
  const result = await newsCn
    .find({}, { projection: { _id: 0, title: 1 } })
    .toArray();
  return result;
}

async function getDate(date) {
  await client.connect();
  const database = client.db("engData");
  const newsCn = database.collection("news");
  const result = await newsCn.findOne({ title: date });
  return result;
}

async function insertNews(text) {
  const database = client.db("engData");
  const newsCn = database.collection("news");
  const newsObj = {};
  const tranKor = [];

  console.log(text);

  for (var el of text) {
    const rawResponse = await fetch("http://localhost:3001/translate/", {
      method: "POST",
      body: JSON.stringify({ data: el[0] + "\n" + el[1] }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!rawResponse.ok) {
      console.error(
        `Error from translation service: ${rawResponse.statusText}`
      );
      continue; // Skip this iteration and continue with the next one
    }

    const response = await rawResponse.json();
    console.log(response);
    tranKor.push(response.message.result.translatedText.split("\n"));
  }

  let today = new Date();
  let year = today.getFullYear(); // 년도
  let month = today.getMonth() + 1; // 월
  if (month < 10) month = "0" + month;
  let date = today.getDate(); // 날짜
  if (date < 10) date = "0" + date;

  newsObj.title = year + "" + month + "" + date;
  newsObj.textEng = text;
  newsObj.textKor = tranKor;
  newsObj.clearText = text.map((e) => false);

  await newsCn.insertOne(newsObj);
}

const xml2js = require("xml2js");

async function getText() {
  try {
    const response = await fetch("https://feeds.bbci.co.uk/news/world/rss.xml");
    const body = await response.text();
    const parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: true,
    });
    const result = await parser.parseStringPromise(body);

    const items = result.rss.channel.item;
    const formattedItems = items.map((item) => ({
      title: item.title,
      description: item.description,
      link: item.link,
      pubDate: item.pubDate,
    }));

    return formattedItems;
  } catch (error) {
    console.error("Error parsing RSS feed:", error);
  }
}

async function run() {
  await client.connect();

  await get();
}
exports.get = get;
exports.getDate = getDate;
exports.getDateList = getDateList;
run();
