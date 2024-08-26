const express = require('express');
const path = require('path');
const mysql = require('mysql2');

const app = express();
const port = 3000;

// 템플릿 엔진 설정/////////////////////////////////////////////////////////////////
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 정적 파일 제공////////////////////////////////////////////////////////////////////
app.use(express.static(path.join(__dirname, 'public')));

////////////////////////////////////////////////////



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











//////////////////////////////////////////////////////////////////////////
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
