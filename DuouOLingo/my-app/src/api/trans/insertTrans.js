const { MongoClient } = require("mongodb");
const fs = require("graceful-fs");
// Replace the uri string with your MongoDB deployment's connection string.
const uri = "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri);
async function run() {
  await client.connect();

  const korList = require("./kor.json");
  const engList = require("./eng.json");
  let title = 20220600;
  for (var i = 0; i < korList.length; ) {
    let cnt = 0;
    const korListArr = [];
    const engListArr = [];
    while (cnt < 25 && i < korList.length) {
      korListArr.push([korList[i], korList[i + 1]]);
      engListArr.push([engList[i], engList[i + 1]]);
      i += 2;
      cnt++;
    }
    title += 1;
    await insertProfile(title, korListArr, engListArr);
    // console.log(i)
  }

  await client.close();

  return;
}
async function insertProfile(title, korList, engList) {
  const database = client.db("engData");
  const namu = database.collection("news");
  const clearArr = Array.from(korList, () => false);
  const element = {
    title: "" + title,
    textEng: engList,
    textKor: korList,
    clearText: clearArr,
  };
  await namu.insertMany([element]);
  // await findProfile()
  console.log(title, "insertSuccess");
}
run();
