import sys
import cv2
import numpy as np
from ultralytics import YOLO
import time
import serial
from flask import Flask, render_template, Response, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # CORS 설정을 통해 모든 출처에서의 요청을 허용합니다.

# YOLOv8 모델 로드
model = YOLO('best.pt')  # 'best.pt'는 YOLOv8 모델의 경로입니다.

# 아두이노와 직렬 통신 설정
arduino = serial.Serial('COM12', 9600)  # 아두이노가 연결된 포트로 설정합니다.
time.sleep(2)  # 아두이노와 연결이 안정될 때까지 잠시 대기합니다.

# 웹캠 열기
cap = cv2.VideoCapture(0)  # 기본 웹캠을 열어줍니다.

if not cap.isOpened():
    print("웹캠을 열 수 없습니다.")
    exit()  # 웹캠을 열 수 없는 경우 프로그램을 종료합니다.

# 현재 프레임을 저장할 변수
current_frame = None  # 현재 웹캠에서 캡처한 프레임을 저장할 변수입니다.

def process_frame(frame):
    """프레임에서 과일 좌표와 개수를 추출합니다."""
    fruit_coords = {}  # 과일 좌표를 저장할 딕셔너리
    fruit_counts = {}  # 과일 개수를 저장할 딕셔너리
    
    results = model(frame)  # YOLOv8 모델을 사용하여 프레임에서 객체를 탐지합니다.

    for result in results:
        boxes = result.boxes  # 바운딩 박스 정보
        for box in boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])  # 바운딩 박스의 좌표를 정수로 변환합니다.
            label = int(box.cls[0])  # 객체의 라벨을 정수로 변환합니다.
            conf = box.conf[0]  # 객체 탐지의 신뢰도를 가져옵니다.
            fruit_name = model.names[label]  # 라벨을 과일 이름으로 변환합니다.

            # 바운딩 박스 중심 좌표 계산
            center_x = (x1 + x2) / 2  # 바운딩 박스의 중심 X 좌표
            center_y = (y1 + y2) / 2  # 바운딩 박스의 중심 Y 좌표

            # 딕셔너리에 과일 종류별로 좌표 저장 및 개수 세기
            if fruit_name not in fruit_coords:
                fruit_coords[fruit_name] = []  # 새로운 과일 종류가 발견된 경우, 빈 리스트를 생성합니다.
                fruit_counts[fruit_name] = 0  # 새로운 과일 종류의 개수를 0으로 초기화합니다.
            fruit_coords[fruit_name].append((center_x, center_y))  # 중심 좌표를 리스트에 추가합니다.
            fruit_counts[fruit_name] += 1  # 과일 개수를 증가시킵니다.

            # 바운딩 박스와 중심 좌표를 프레임에 그리기
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)  # 바운딩 박스를 그립니다.
            cv2.circle(frame, (int(center_x), int(center_y)), 5, (0, 0, 255), -1)  # 중심 좌표를 원으로 표시합니다.
            cv2.putText(frame, f'{fruit_name} {conf:.2f}', (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)  # 라벨과 신뢰도를 프레임에 텍스트로 표시합니다.

    return fruit_coords, fruit_counts  # 과일 좌표와 개수를 반환합니다.

def generate_frames():
    global current_frame  # 전역 변수 current_frame을 사용합니다.
    while True:
        ret, frame = cap.read()  # 웹캠에서 프레임을 읽습니다.
        if not ret:
            break  # 프레임을 읽지 못한 경우 루프를 종료합니다.

        current_frame = frame  # 현재 프레임을 저장합니다.
        _, buffer = cv2.imencode('.jpg', frame)  # 프레임을 JPEG 형식으로 인코딩합니다.
        frame = buffer.tobytes()  # 인코딩된 프레임을 바이트로 변환합니다.

        yield (b'--frame\r\n'   
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')  # 클라이언트에게 JPEG 이미지를 스트리밍합니다.

@app.route('/')
def index():
    return render_template('index.html')  # 기본 페이지를 렌더링합니다.

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')  # 비디오 피드를 클라이언트에게 스트리밍합니다.

@app.route('/control_stream', methods=['POST'])
def control_stream():
    action = request.json.get('action')  # 클라이언트로부터 받은 액션을 가져옵니다.
    print(f"Received action: {action}")  # 요청된 액션을 로그로 출력합니다.
    if action == 'start':
        print("Starting stream...")
        return Response(status=200)  # 스트리밍 시작을 성공적으로 처리합니다.
    elif action == 'stop':
        cap.release()  # 웹캠을 해제합니다.
        print("Stopping stream...")
        return Response(status=200)  # 스트리밍 중지를 성공적으로 처리합니다.
    return Response(status=400)  # 잘못된 요청에 대해 400 상태 코드를 반환합니다.

@app.route('/send_fruit_data', methods=['POST'])
def send_fruit_data():
    global current_frame  # 전역 변수 current_frame을 사용합니다.
    data = request.json  # 클라이언트로부터 JSON 데이터를 가져옵니다.
    fruit_type = data.get('fruit_type')  # 과일 종류를 가져옵니다.
    fruit_count = data.get('fruit_count')  # 과일 개수를 가져옵니다.

    # 입력 검증
    if not fruit_type or not isinstance(fruit_count, int):
        return jsonify({"error": "Invalid input"}), 400  # 유효하지 않은 입력에 대해 오류 응답을 반환합니다.

    if current_frame is None:
        return jsonify({"error": "No frame available"}), 500  # 현재 프레임이 없는 경우 오류 응답을 반환합니다.

    # 현재 프레임을 처리합니다
    fruit_coords, fruit_counts = process_frame(current_frame)  # 현재 프레임에서 과일 데이터를 추출합니다.

    if fruit_type in fruit_coords and fruit_counts[fruit_type] >= fruit_count:
            coords = fruit_coords[fruit_type][:fruit_count]
            print(f"{fruit_type}: 좌표 {coords}, 개수: {fruit_count}")

            # 과일 좌표를 아두이노로 전송
            for coord in coords:
                x, y = coord
                arduino.write(f'{fruit_type},{x},{y}\n'.encode())
                print(f'과일종류 : {fruit_type}, x : {x}, y : {y}\n')
                time.sleep(7)  # 데이터 전송 후 잠시 대기

            return jsonify({"message": "Data sent successfully"}), 200  # 데이터 전송 성공 응답을 반환합니다.

    return jsonify({"error": "Requested fruit type or count not found"}), 404  # 요청한 과일 종류나 개수가 없는 경우 오류 응답을 반환합니다.

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)  # 서버를 실행합니다.
