document.addEventListener('DOMContentLoaded', function() {
    const harvestForm = document.getElementById('harvest-form');
    const datePicker = document.getElementById('datePicker');
    const graphContainer = document.querySelector('.graph-container');
    let harvestChart;

    harvestForm.addEventListener('submit', function(event) {
        event.preventDefault(); // 폼 제출 기본 동작 방지
        
        const fruit = document.getElementById('fruit-select').value;
        const quantity = document.getElementById('fruit-quantity').value;

        if (quantity === '' || isNaN(quantity) || quantity <= 0) {
            alert('1 이상의 숫자를 입력하세요.');
            return;
        }

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

    datePicker.addEventListener('change', function() {
        const selectedDate = this.value;
        fetchHarvestDataAndRenderChart(selectedDate);
    });

    function fetchHarvestDataAndRenderChart(date) {
        fetch(`/harvest-data?date=${date}`)
            .then(response => response.json())
            .then(data => {
                const labels = data.map(item => item.fruit);
                const quantities = data.map(item => item.total);

                if (labels.length === 0) {
                    alert('선택한 날짜에 대한 수확 데이터가 없습니다.');
                    graphContainer.style.display = 'none';
                    return;
                }

                graphContainer.style.display = 'block';
                
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
    
});

///////////////////////////////////////////


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

//////////////////////////스트리밍 뭐시기///////////////////////////////////
// 스트리밍 시작 함수
function startStream() {
    fetch('http://192.168.0.14:5000/control_stream', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'start' })
    }).then(response => {
        if (response.ok) {
            document.getElementById('stream').src = 'http://192.168.0.14:5000/video_feed';
        } else {
            console.error('Failed to start stream');
        }
    }).catch(error => {
        console.error('Error starting stream:', error);
    });
}

// 스트리밍 중지 함수
function stopStream() {
    fetch('http://192.168.0.14:5000/control_stream', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'stop' })
    }).then(response => {
        if (response.ok) {
            document.getElementById('stream').src = '';
        } else {
            console.error('Failed to stop stream');
        }
    }).catch(error => {
        console.error('Error stopping stream:', error);
    });
}
///////////////////////////////////////////////////////////////////




/////////////////////////esp32 카메라///////////////////////////////////

var client = new WebSocket('ws://localhost:9999');
var canvas = document.querySelector('canvas');
var player = new jsmpeg(client, {
  canvas: canvas 
});


document.getElementById('startStream').addEventListener('click', function() {
    fetch('/start-stream', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Stream started') {
                client = new WebSocket('ws://localhost:9999');
                player = new jsmpeg(client, {
                    canvas: canvas
                });
            } else {
                alert(data.message);
            }
        });
});

document.getElementById('stopStream').addEventListener('click', function() {
    fetch('/stop-stream', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            if (data.message === 'Stream stopped') {
                if (client) {
                    client.close();
                    client = null;
                    player = null;
                    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
                }
            } else {
                alert(data.message);
            }
        });
});

//////////////////////////////esp 스트리밍 뭐시기///////////////////////////
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