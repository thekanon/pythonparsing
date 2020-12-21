// express 모듈 가져옴.
const express = require('express')
// 미들웨어 선언
const app = express()

//Python 파일 경로
const path = require('path')
const pyPath = path.join(__dirname, 'api\\python\\bbc.py')


// 클라이언트 정보 추가
const client_id = 'n3RO1LZqp6aV3zGYnzha'
const client_secret = 'rGLmrR9FZL'
// const client_id = 'd2BuiwA0wIr6CU4jZJ3J'
// const client_secret = 'qZX0BRaY3Y'

//크로스도메인 이슈 해결
const cors = require('cors');
app.use(cors());

// 내장 미들웨어 연결
app.use(express.json());

app.listen(3000, function () {
    console.log(pyPath)
})
//파이썬 데이터를 가져온다. 
app.get('/viewNews', function (req, res) {
    try{
        const spawn = require("child_process").spawn 
        const process = spawn('python',[pyPath] )
        process.stdout.on('data', function(data) { 
            // res = convertWebToString(data)
            // console.log(data.toString())
            res.send(convertWebToString(data))
            res.end()
        }) 
        return
        // process.stdout.pipe(res)
    } catch(error) {
        console.error(error)
        // res.send(process) //??
        res.status(500).send({error: error.message})
        res.end()
        return
    }
})
app.post('/translate', function (req, res, next) {
    const api_url = 'https://openapi.naver.com/v1/papago/n2mt'
    const request = require('request')
    const tran = req.body.data
    console.log(req.body.data)
    const options = {
        url: api_url,
        form: {'source':'en', 'target':'ko', 'text':tran},
        headers: {'X-Naver-Client-Id':client_id, 'X-Naver-Client-Secret': client_secret}
    }
    request.post(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        res.writeHead(200, {'Content-Type': 'text/json; charset=UTF-8'})
        console.log(body)
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