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
const logon = require("./api/logon/logon")

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
  const result = await bbcGet(date)
  console.log("viewNews")
  res.json([result.textEng,result.textKor])
})
app.get('/tranIdx', async function (req, res) {
  const result = await bbcGet()
  // console.log(result.textKor[req.body.data])
  res.json(result.textKor[req.query.idx])
})
app.get('/dateIdx', async function (req, res) {
  const result = await bbcGetDateIdx(req.query.date,req.query.idx)
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
app.post('/sessionLogin', async function (req, res) {
  // Get ID token and CSRF token.
  const idToken = req.body.data;

  const result = await logonGet(idToken)
  console.log(result)
  res.json(result)

//   // Set session expiration to 5 days.
//   const expiresIn = 60 * 60 * 24 * 5 * 1000;
//   // Create the session cookie. This will also verify the ID token in the process.
//   // The session cookie will have the same claims as the ID token.
//   // We could also choose to enforce that the ID token auth_time is recent.
//   admin.auth().verifyIdToken(idToken).then(function (decodedClaims) {
//     console.log("decodedClaims")
//     console.log(decodedClaims)
//     // In this case, we are enforcing that the user signed in in the last 5 minutes.
//     if (new Date().getTime() / 1000 - decodedClaims.auth_time < 5 * 60) {
//       return admin.auth().createSessionCookie(idToken, { expiresIn: expiresIn });
//     }
//     throw new Error('UNAUTHORIZED REQUEST!');
//   })
//     .then(function (sessionCookie) {
//       // Note httpOnly cookie will not be accessible from javascript.
//       // secure flag should be set to true in production.
//       const options = { maxAge: expiresIn };
//       res.cookie('session', sessionCookie, options);
//       res.cookie('session', sessionCookie, { maxAge: 1000 * 60 * 10, httpOnly: false });

//       res.setHeader('Set-Cookie', ['session=' + sessionCookie, 'language=javascript']);
//       res.setHeader("test", "ttest")
//       res.end(JSON.stringify({ status: 'success', cookie: sessionCookie }));
//     })
//     .catch(function (error) {
//       res.status(401).send('UNAUTHORIZED REQUEST!');
//     });
});
app.post('/logon', function (req, res, next) {
  const api_url = 'https://openapi.naver.com/v1/papago/n2mt'
  const request = require('request')
  const tran = req.body.data
  console.log(req.body.data)

  getAuth()
    .verifyIdToken(idToken)
    .then((decodedToken) => {
      const uid = decodedToken.uid;
      // ...
    })
    .catch((error) => {
      // Handle error
    });

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

function convertWebToString(data) {
  //가져온 데이터가 Object 형태인데, 왜인지 모르겠지만 eval로 다시 초기화 하지 않으면 버퍼로 데이터를 가지고 있음
  let myJsonString = (data.toString());
  myJsonString = eval(myJsonString);
  console.log(myJsonString)
  return myJsonString
  // //eval로 초기화 시 array형태의 데이터 얻을 수 있음.
  // console.log(myJsonString)
  // 
}
async function bbcGet(date) {
  console.log(date)
  if(date){
    return await bbc.getDate(date)  
  } else {
    return await bbc.get()
  }
}
async function bbcGetDateIdx(date,idx) {
  const result = await bbc.getDateIdx(date,idx)
  return result
}
async function logonGet(user){
    const result = await logon.get(user)
    return result
}