/////수확버튼///////////////////////////
// 수확 버튼 이벤트 리스너
document.addEventListener('DOMContentLoaded', function() {
    const harvestForm = document.getElementById('harvest-form');
    /////////////////////그래프 토글///////////////////
    const toggleGraphBtn = document.getElementById('toggleGraphBtn');
    const graphContainer = document.querySelector('.graph-container');
    let harvestChart;
    ////////////////////////////////////////////////
    
    harvestForm.addEventListener('submit', function(event) {
        event.preventDefault(); // 폼 제출 기본 동작 방지
        
        const fruit = document.getElementById('fruit-select').value;
        const quantity = document.getElementById('fruit-quantity').value;

        if (quantity === '' || isNaN(quantity) || quantity <= 0) {
            alert('1 이상의 숫자를 입력하세요.');
            return;
        }

        // 확인 창을 띄웁니다.
        const userConfirmed = confirm(`과일 종류: ${fruit}, 수량: ${quantity}. 수확하시겠습니까?`);

        if (userConfirmed) {
            const data = {
                fruit: fruit,
                quantity: quantity
            };

            fetch('/harvest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(data => {
                console.log('Success:', data);
                alert('수확 요청이 성공적으로 전송되었습니다.');
            })
            .catch((error) => {
                console.error('Error:', error);
                alert('수확 요청을 전송하는 중 오류가 발생했습니다.');
            });
        } else {
            alert('수확 요청이 취소되었습니다.');
        }
    });
    /////////////////////////////////////////////////////////////
    function fetchHarvestDataAndRenderChart() {
        fetch('/harvest-data')
            .then(response => response.json())
            .then(data => {
                const labels = data.map(item => item.fruit);
                const quantities = data.map(item => item.total);

                const ctx = document.getElementById('harvestChart').getContext('2d');
                if (harvestChart) {
                    harvestChart.destroy();
                }
                harvestChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: '수확한 개수',
                            data: quantities,
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            })
            .catch((error) => {
                console.error('Error fetching harvest data:', error);
            });
    }
    // 페이지 로드 시 차트 데이터 로드
    //loadChartData();
    ///////////////////////////////////////////////////////////
});
/////////////////////////////////////////////////////////////
document.addEventListener('DOMContentLoaded', function() {
    var calendarEl = document.getElementById('calendar');
    var ctx = document.getElementById('harvestChart1').getContext('2d');
    var chart;

    var calendar = new FullCalendar.Calendar(calendarEl, {
        plugins: [ 'dayGrid' ],
        dateClick: function(info) {
            fetch(`/harvest-data/${info.dateStr}`)
                .then(response => response.json())
                .then(data => {
                    var labels = data.map(item => item.fruit);
                    var quantities = data.map(item => item.total);
                    
                    if (chart) {
                        chart.destroy();
                    }

                    chart = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: 'Quantity',
                                data: quantities,
                                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                                borderColor: 'rgba(75, 192, 192, 1)',
                                borderWidth: 1
                            }]
                        },
                        options: {
                            scales: {
                                y: {
                                    beginAtZero: true
                                }
                            }
                        }
                    });
                });
        }
    });

    calendar.render();
});

///////////////////////////////
//usb카메라
// var streamVideo
// if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia )
// {
//     alert("Media Device not supported")
// } else {
//     document.getElementById("openBtn").addEventListener('click',open)
//     document.getElementById("closeBtn").addEventListener('click',close)
//     open()
// }
// function open() {
//     close()
//     navigator.mediaDevices.getUserMedia({video:true}).then(stream => {
//     streamVideo = stream
//     var cameraView = document.getElementById("cameraview");
//     cameraView.srcObject = stream;
//     cameraView.play()
// })
// }
// function close() {
//     if (streamVideo) {
//     var track = streamVideo.getTracks()
//     track[0].stop()
//     streamVideo = null
//     }
// }
//////////////////////////////////////////////////////////////////////////

//////////////////////////usb스트리밍 뭐시기///////////////////////////////////
// 스트리밍 시작 함수
function startStream() {
    // 서버에 스트리밍 시작 요청을 보냅니다.
    fetch('http://192.168.0.14:5000/control_stream', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({action: 'start'}) // 스트리밍 시작 요청 데이터
    }).then(response => {
        if (response.ok) {
            // 스트리밍이 시작되면 'stream' 이미지를 업데이트합니다.
            document.getElementById('stream').src = 'http://192.168.0.14:5000/video_feed';
        }
    });
}

// 스트리밍 중지 함수
function stopStream() {
    // 서버에 스트리밍 중지 요청을 보냅니다.
    fetch('http://192.168.0.14:5000/control_stream', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({action: 'stop'}) // 스트리밍 중지 요청 데이터
    }).then(response => {
        if (response.ok) {
            // 스트리밍이 중지되면 'stream' 이미지 소스를 빈 문자열로 설정합니다.
            document.getElementById('stream').src = '';
        }
    });
}

///////////////////////////////////////////////////////////////////




/////////////////////////esp32 카메라///////////////////////////////////

var client = new WebSocket('ws://localhost:9999');// WebSocket 클라이언트를 생성합니다.
var canvas = document.querySelector('canvas');  // 캔버스 요소를 선택합니다.
var player = new jsmpeg(client, {
 canvas: canvas  // JSMpeg 라이브러리를 사용하여 WebSocket에서 비디오 스트림을 캔버스에 렌더링합니다.
});

// ESP32 카메라 스트리밍 시작 버튼 이벤트 리스너
document.getElementById('startStream').addEventListener('click', function() {
    // 서버에 스트리밍 시작 요청을 보냅니다.
    fetch('/start-stream', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Stream started') {
                // 스트리밍이 시작되면 WebSocket 클라이언트를 생성하고 JSMpeg 플레이어를 초기화합니다.
                client = new WebSocket('ws://localhost:9999');
                player = new jsmpeg(client, {
                    canvas: canvas
                });
            } else {
                alert(data.message); // 스트리밍 시작 실패 시 메시지를 표시합니다.
            }
        });
});

// ESP32 카메라 스트리밍 중지 버튼 이벤트 리스너
document.getElementById('stopStream').addEventListener('click', function() {
    // 서버에 스트리밍 중지 요청을 보냅니다.
    fetch('/stop-stream', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Stream stopped') {
                if (client) {
                     // 스트리밍이 중지되면 WebSocket 클라이언트를 닫고 캔버스를 초기화합니다.
                    client.close();
                    client = null;
                    player = null;
                    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
                }
            } else {
                alert(data.message); // 스트리밍 중지 실패 시 메시지를 표시합니다.
            }
        });
});
//////////////////////////////etsp 스트리밍 뭐시기///////////////////////////
// const canvas = document.getElementById('videoCanvas');
// const context = canvas.getContext('2d');
// const startButton = document.getElementById('startButton');
// const stopButton = document.getElementById('stopButton');

// const ws = new WebSocket(`ws://${window.location.hostname}:${window.location.port}`);
// ws.binaryType = 'arraybuffer';

// ws.onmessage = (event) => {
//     const imageData = new Uint8Array(event.data);
//     const blob = new Blob([imageData], { type: 'image/jpeg' });
//     const url = URL.createObjectURL(blob);
//     const img = new Image();
//     img.onload = () => {
//         context.drawImage(img, 0, 0, canvas.width, canvas.height);
//         URL.revokeObjectURL(url);
//     };
//     img.src = url;
// };

// ws.onopen = () => {
//     console.log('WebSocket connection opened');
// };

// ws.onclose = () => {
//     console.log('WebSocket connection closed');
// };

// startButton.addEventListener('click', () => {
//     ws.send('start');
// });

// stopButton.addEventListener('click', () => {
//     ws.send('stop');
// });
//////////////////////////////////////////////