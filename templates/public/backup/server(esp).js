const express = require('express');
const path = require('path');
const mysql = require('mysql2');

const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const Stream = require('node-rtsp-stream');


const app = express();
const port = 3000;

// 템플릿 엔진 설정/////////////////////////////////////////////////////////////////
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 정적 파일 제공////////////////////////////////////////////////////////////////////
app.use(express.static(path.join(__dirname, 'public')));

/////////////////////////////////
app.use(bodyParser.json());
app.use(express.static('public'));
/////////////////////////

let stream = null;

/////////////////////파이썬 호출///////////////////////////////
app.use(express.json());

app.post('/harvest', (req, res) => {
    const { fruit, quantity } = req.body;
    console.log(`Fruit: ${fruit}, Quantity: ${quantity}`);

    // Python 스크립트를 호출하여 데이터 처리
    const pythonProcess = spawn('python', ['process_fruits.py', fruit, quantity]);

    pythonProcess.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
        // Python 프로세스가 종료된 후 응답을 보냅니다.
        res.json({ message: 'Data sent to Arduino successfully!' });
    });
});

//////////////////////////////////////////////////////////////////////////



// MySQL 데이터베이스 연결//////////////////////////////////////////////////////
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root', // MySQL 사용자 이름으로 바꾸세요
    password: '0000',  // MySQL 비밀번호로 바꾸세요
    database: 'fruit' // 실제 데이터베이스 이름으로 바꾸세요
});

connection.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL database.');
});

// HTML 페이지 라우팅
app.get('/', (req, res) => {
    connection.query('SELECT * FROM fruit.fruit', (err, results) => {
        if (err) throw err;
        res.render('exam', { data: results });
    });
});



///////////////rtsp/////////////////////////////////////////

const streamUrl = "rtsp://192.168.0.20:8554/mjpeg/1"; // rtsp 영상 주소

stream = new Stream({
    name: 'foscam_stream',
    streamUrl: streamUrl,
    wsPort: 9999, // 10000이나 10001 등으로 안겹칠만한 포트번호로 설정하면 된다.
    width: 400,
    height: 300,
    ffmpegOptions: {
        '-vf': 'scale=400:300', // 해상도 조정
    }
});



//////////////////////////////////////////////////////////////////////////
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
