const express = require('express');
const path = require('path');
const mysql = require('mysql2');

const app = express();
const port = 3000;

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'exam.html'));
});



//////////////////////////////////////////////////////////////////////////////////////
// MySQL 데이터베이스 연결
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root', // MySQL 사용자 이름으로 바꾸세요
    password: '0000',  // MySQL 비밀번호로 바꾸세요
    database: 'esp32_dht' // 실제 데이터베이스 이름으로 바꾸세요
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL database:', err);
        return;
    }
    console.log('Connected to MySQL database.');
});


  // 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

  // 데이터 API 라우팅 (마지막 데이터만 가져옴)
app.get('/data', (req, res) => {
    connection.query('SELECT * FROM dht11 ORDER BY idx DESC LIMIT 1', (err, results) => {
        if (err) {
            console.error('Error fetching data from MySQL:', err);
            res.status(500).json({ error: 'Database query error' });
            return;
        }
        res.json(results);
    });
});



//////////////////////////////////////////////////////////////////////////
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});