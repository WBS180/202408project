/////수확버튼///////////////////////////
document.getElementById('harvest-form').addEventListener('submit', function(event) {
    event.preventDefault(); // 폼 제출 막기

    const fruitSelect = document.getElementById('fruit-select');
    const fruitQuantity = document.getElementById('fruit-quantity').value;
    const selectedFruit = fruitSelect.options[fruitSelect.selectedIndex].text;

    if (!fruitQuantity) {
        alert("숫자를 입력하세요");
    } else {
        alert(`${selectedFruit}을(를) ${fruitQuantity}개만큼 수확합니다.`);
    }
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
    open()
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