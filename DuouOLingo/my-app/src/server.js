//firebase 초기화
const admin = require('firebase-admin')
const serviceAccount = require("./firebase/bbcnews-ee071-firebase-adminsdk-7nueo-6eb0f7aa53.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://bbcnews-ee071-default-rtdb.firebaseio.com"
});
// express 모듈 가져옴.
const express = require('express')
// 미들웨어 선언

const app = express()

//Python 파일 경로
const path = require('path')
const bbc = require("./api/news/bbc")
const profile = require("./api/profile/profile")
// const bookmark = require("./api/boomark/bookmark")

// 클라이언트 정보 추가
// const client_id = 'n3RO1LZqp6aV3zGYnzha'
// const client_secret = 'rGLmrR9FZL'
const client_id = 'd2BuiwA0wIr6CU4jZJ3J'
const client_secret = 'qZX0BRaY3Y'

//크로스도메인 이슈 해결
const corsOptions = {
  credentials: true,
  ///..other options
};
const cors = require('cors');
const { request } = require('express');
app.use(cors(corsOptions));
// 내장 미들웨어 연결
app.use(express.json());

app.listen(3001, function () {
  console.log("server start")
})
//뉴스 데이터를 가져온다.
app.get('/viewNews', async function (req, res) {
  let date
  console.log(req.query)
  if(req.query.date){
    date= req.query.date
  }
  const result = await bbc.getDate(date)
  console.log("viewNews")
  res.json([result.textEng,result.textKor])
})
app.get('/dateList', async function (req, res) {
  const result = await bbc.getDateList()
  // console.log(result.textKor[req.body.data])
  res.json(result)
})
app.post('/translate', function (req, res, next) {
  const api_url = 'https://openapi.naver.com/v1/papago/n2mt'
  const request = require('request')
  const tran = req.body.data
  console.log(req.body.data)
  const options = {
    url: api_url,
    form: { 'source': 'en', 'target': 'ko', 'text': tran },
    headers: { 'X-Naver-Client-Id': client_id, 'X-Naver-Client-Secret': client_secret }
  }
  request.post(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      res.writeHead(200, { 'Content-Type': 'text/json; charset=UTF-8' })
      res.end(body)
    } else {
      res.status(response.statusCode).end()
      console.log('error = ' + response.statusCode)
    }
  })
});
app.post('/setCurrentIndex', async function (req, res) {
  // Get ID token and CSRF token.
  const obj = req.body.data;

  const result = await setIndex(obj)
  console.log(result)
  res.json(result)
});
app.post('/sessionLogin', async function (req, res) {
  // Get ID token and CSRF token.
  const idToken = req.body.data;

  const result = await profileGet(idToken)
  console.log("result : ")
  console.log(result)
  res.json(result)
});
app.post('/userBookmark', async function (req, res) {
  // Get ID token and CSRF token.
  const bookmark = req.body.data;

  const result = await setBookMark(bookmark)
  console.log(result)
  res.json(result)
});
async function setIndex(obj){
  console.log("obj : ")
  console.log(obj)
  const result = await profile.setCurrentIndex(obj)
  return result

  return 
}
async function bbcGet(date) {
  console.log(date)
  if(date){
    return await bbc.getDate(date)  
  } else {
    return await bbc.get()
  }
}
async function profileGet(user){
    const result = await profile.get(user)
    return result
}
async function setBookMark(data){
  const result = await bookmark.insertBookmark(data)
  return result
}