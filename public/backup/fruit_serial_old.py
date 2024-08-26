import cv2
import numpy as np
from ultralytics import YOLO
import time
import serial
from flask import Flask, render_template, Response, request, jsonify
from flask_cors import CORS

# Flask 애플리케이션 초기화 및 CORS 설정
app = Flask(__name__)
CORS(app)

# YOLOv8 모델 로드 ('best.pt'는 YOLOv8 모델의 경로입니다)
model = YOLO('best.pt')

# 아두이노와 직렬 통신 설정 ('COM12'를 아두이노가 연결된 포트로 변경해야 합니다)
arduino = serial.Serial('COM12', 9600)
time.sleep(2)  # 아두이노와 연결 대기

# 웹캠 열기 및 설정 (웹캠이 열리지 않으면 프로그램 종료)
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 600)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 600)

if not cap.isOpened():
    print("웹캠을 열 수 없습니다.")
    exit()

def process_frame(frame):
    """프레임에서 과일 좌표와 개수를 추출합니다."""
    fruit_coords = {}
    fruit_counts = {}
    
    # YOLOv8 모델로 객체 탐지
    results = model(frame)

    # 결과에서 바운딩 박스 정보 추출
    for result in results:
        boxes = result.boxes  # 바운딩 박스 정보
        for box in boxes:
            # 바운딩 박스 좌표와 라벨
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            label = int(box.cls[0])
            conf = box.conf[0]
            
            # 과일 종류 라벨을 적절히 변환해야 합니다. (예: 'apple', 'banana' 등)
            fruit_name = model.names[label]

            # 바운딩 박스 중심 좌표 계산
            center_x = (x1 + x2) / 2
            center_y = (y1 + y2) / 2

            # 딕셔너리에 과일 종류별로 좌표 저장 및 개수 세기
            if fruit_name not in fruit_coords:
                fruit_coords[fruit_name] = []
                fruit_counts[fruit_name] = 0
            fruit_coords[fruit_name].append((center_x, center_y))
            fruit_counts[fruit_name] += 1

            # 바운딩 박스와 중심 좌표를 프레임에 그리기
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.circle(frame, (int(center_x), int(center_y)), 5, (0, 0, 255), -1)
            cv2.putText(frame, f'{fruit_name} {conf:.2f}', (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    return frame, fruit_coords, fruit_counts

def generate_frames():
    """웹캠에서 프레임을 캡처하고 처리된 프레임을 생성합니다."""
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame, fruit_coords, fruit_counts = process_frame(frame)
        _, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

# 루트 URL에 대한 라우트 정의
@app.route('/')
def index():
    return render_template('index.html')

# 비디오 피드를 제공하는 라우트 정의
@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

# 과일 데이터를 아두이노로 전송하는 엔드포인트
@app.route('/send_fruit_data', methods=['POST'])
def send_fruit_data():
    data = request.json
    fruit_type = data.get('fruit_type')
    fruit_count = data.get('fruit_count')

    if not fruit_type or not isinstance(fruit_count, int):
        return jsonify({"error": "Invalid input"}), 400

    while True:
        ret, frame = cap.read()
        if not ret:
            return jsonify({"error": "Unable to read frame"}), 500

        _, fruit_coords, fruit_counts = process_frame(frame)

        if fruit_type in fruit_coords and fruit_counts[fruit_type] >= fruit_count:
            coords = fruit_coords[fruit_type][:fruit_count]
            print(f"{fruit_type}: 좌표 {coords}, 개수: {fruit_count}")

            # 과일 종류와 개수를 아두이노로 전송
            arduino.write(f'{fruit_type},{fruit_count}\n'.encode())
            time.sleep(0.1)  # 데이터 전송 후 잠시 대기

            # 과일 좌표를 아두이노로 전송
            for coord in coords:
                x, y = coord
                arduino.write(f'{x},{y}\n'.encode())
                time.sleep(0.1)  # 데이터 전송 후 잠시 대기

            return jsonify({"message": "Data sent successfully"}), 200

        time.sleep(0.1)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
