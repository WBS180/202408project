/////수확버튼///////////////////////////
document.addEventListener('DOMContentLoaded', function() {
    const harvestForm = document.getElementById('harvest-form');
    
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
});



///////////////////////////////
//usb카메라
var streamVideo
if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia )
{
    alert("Media Device not supported")
} else {
    document.getElementById("openBtn").addEventListener('click',open)
    document.getElementById("closeBtn").addEventListener('click',close)
    //open()
}
function open() {
    close()
    navigator.mediaDevices.getUserMedia({video:true}).then(stream => {
    streamVideo = stream
    var cameraView = document.getElementById("cameraview");
    cameraView.srcObject = stream;
    cameraView.play()
})
}
function close() {
    if (streamVideo) {
    var track = streamVideo.getTracks()
    track[0].stop()
    streamVideo = null
    }
}

/////////////////////////esp32 카메라///////////////////////////////////

var client = new WebSocket('ws://localhost:9999');
var canvas = document.querySelector('canvas');
var player = new jsmpeg(client, {
 canvas: canvas 
});


