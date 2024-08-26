const express = require('express');
const path = require('path');
const mysql = require('mysql2');

const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const Stream = require('node-rtsp-stream');

const http = require('http');
const WebSocket = require('ws');
const request = require('request');

const app = express();
const port = 3001;

//////////////////http////
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
////////////////////////////

// 템플릿 엔진 설정/////////////////////////////////////////////////////////////////
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 정적 파일 제공////////////////////////////////////////////////////////////////////
app.use(express.static(path.join(__dirname, 'public')));

/////////////////////////////////
app.use(bodyParser.json());
//app.use(express.static('public'));
/////////////////////////

let stream = null;

/////////////////////////////////////////////////////////


/////////////////////파이썬 호출///////////////////////////////
app.use(express.json());

app.post('/harvest', (req, res) => {
    const { fruit, quantity } = req.body;
    console.log(`Fruit: ${fruit}, Quantity: ${quantity}`);

    // Python 스크립트를 호출하여 데이터 처리
    const pythonProcess = spawn('python', ['fruit_serial1.py', fruit, quantity]);

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

    ////////////////////////////////mysql에 제대로 데이터가 들어가는 지 확인하기 위해(성공여부와는 상관x)//////////////////
    // const query = 'INSERT INTO harvest (fruit, quantity) VALUES (?, ?)';
    // connection.query(query, [fruit, quantity], (err, result) => {
    //     if (err) throw err;
    //     console.log('Data inserted into MySQL:', result);
    //     res.json({ message: 'Data sent to Arduino and MySQL successfully!' });
    // });
    ////////////////////////////////////////////////////////////////////////
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
///////////////////////////////////
// HTML 페이지 라우팅
app.get('/', (req, res) => {
    connection.query(`
        SELECT 
            id,
            fruit,
            quantity,
            DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:%s') as formatted_date
        FROM harvest
        ORDER BY id DESC LIMIT 5
    `, (err, results) => {
        if (err) throw err;
        res.render('exam', { data: results });
    });//FROM fruit.harvest
});

// 수확 데이터를 가져오는 API
// app.get('/harvest-data', (req, res) => {
//     connection.query(`
//         SELECT 
//             fruit, 
//             SUM(quantity) as total,
//             DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:%s') as formatted_date 
//         FROM harvest 
//         GROUP BY fruit, formatted_date
//     `, (err, results) => {
//         if (err) {
//             res.status(500).json({ message: 'Error fetching data from MySQL.' });
//             return;
//         }
//         res.json(results);
//     });
// });
///////////////////////특정 날짜의 수확량 데이터를 가져오는 API 엔드포인트///////////////////////////
app.get('/harvest-data', (req, res) => {
    const date = req.query.date;
    connection.query(`
        SELECT 
            fruit, 
            SUM(quantity) as total 
        FROM harvest 
        WHERE DATE(timestamp) = ?
        GROUP BY fruit
    `, [date], (err, results) => {
        if (err) {
            res.status(500).json({ message: 'Error fetching data from MySQL.' });
            return;
        }
        res.json(results);
    });
});
////////////////////////////////////////////////////////////////////////////////////



// 파이썬 호출 및 MySQL 저장
app.post('/harvest', (req, res) => {
    const { fruit, quantity } = req.body;
    console.log(`Fruit: ${fruit}, Quantity: ${quantity}`);

    // Python 스크립트를 호출하여 데이터 처리
    const pythonProcess = spawn('python', ['fruit_serial1.py', fruit, quantity]);

    pythonProcess.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        if (code === 0) {
            console.log('Python process exited successfully.');

            // Python 프로세스가 정상 종료된 후 MySQL에 데이터 저장
            const query = 'INSERT INTO harvest (fruit, quantity) VALUES (?, ?)';
            connection.query(query, [fruit, quantity], (err, result) => {
                if (err) throw err;
                console.log('Data inserted into MySQL:', result);
                res.json({ message: 'Data sent to Arduino and MySQL successfully!' });
            });
        } else {
            console.error(`Python process exited with error code ${code}`);
            res.status(500).json({ message: 'Error processing data with Python script.' });
        }
    });
});
/////////////////////////////////////////////////////


////////////////////////////////

///////////////rtsp/////////////////////////////////////////

// 스트림 시작 API
app.post('/start-stream', (req, res) => {
    if (stream) {
        res.status(400).json({ message: 'Stream already started' });
        return;
    }

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
    res.json({ message: 'Stream started' });
});
  
  // 스트림 중지 API
  app.post('/stop-stream', (req, res) => {
    if (!stream) {
      res.status(400).json({ message: 'No stream to stop' });
      return;
    }
  
    stream.stop();
    stream = null;
  
    res.json({ message: 'Stream stopped' });
  });
  

///////////////////////////////////////////////////////////////////


///////////////////////////////http stream/////////////////////////

// const ESP32_CAM_URL = 'http://192.168.0.55:81/stream'; // ESP32-CAM의 스트림 URL
// let isStreaming = false;
// let fetchStream;

// wss.on('connection', (ws) => {
//     console.log('WebSocket connection established');

//     ws.on('message', (message) => {
//         if (message === 'start' && !isStreaming) {
//             isStreaming = true;
//             fetchStream = request.get(ESP32_CAM_URL);
//             fetchStream.on('data', (chunk) => {
//                 if (isStreaming) {
//                     ws.send(chunk);
//                 }
//             }).on('error', (err) => {
//                 console.error('Error fetching stream:', err);
//                 ws.close();
//             });
//         } else if (message === 'stop' && isStreaming) {
//             isStreaming = false;
//             fetchStream.abort();
//         }
//     });

//     ws.on('close', () => {
//         console.log('WebSocket connection closed');
//         isStreaming = false;
//         if (fetchStream) {
//             fetchStream.abort();
//         }
//     });
// });


/////////////////////
app.post('/send_fruit_data', (req, res) => {
    fruitData = req.body;
    res.json({ status: 'success' });
});

app.get('/get_fruit_data', (req, res) => {
    res.json(fruitData);
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

//////////////////


//////////////////////////////////////////////////////////////////////////
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
