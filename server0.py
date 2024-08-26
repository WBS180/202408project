from flask import Flask, render_template, Response, request
from flask_cors import CORS
import cv2
from ultralytics import YOLO
import time
import serial

app = Flask(__name__)
CORS(app)  # CORS 설정 추가

# YOLOv8 모델 로드
model = YOLO('best.pt')  # 'best.pt'는 YOLOv8 모델의 경로입니다.

# 웹캠 초기화 변수
cap = None

def initialize_camera():
    global cap
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 600)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 600)
    if not cap.isOpened():
        print("웹캠을 열 수 없습니다.")
        cap = None  # 웹캠을 열지 못하면 cap을 None으로 설정

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
    global cap
    while True:
        if cap is None or not cap.isOpened():
            print("카메라가 초기화되지 않았거나 열리지 않았습니다.")
            time.sleep(1)  # 재시도 전 대기
            continue
        
        ret, frame = cap.read()
        if not ret:
            print("프레임을 읽어오지 못했습니다.")
            break

        frame, fruit_coords, fruit_counts = process_frame(frame)
        _, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/control_stream', methods=['POST'])
def control_stream():
    global cap
    action = request.json.get('action')
    print(f"Received action: {action}")  # 요청된 액션 로그 출력
    if action == 'start':
        if cap is None or not cap.isOpened():
            initialize_camera()
        print("Starting stream...")  # 스트리밍 시작 로그
        return Response(status=200)
    elif action == 'stop':
        if cap is not None and cap.isOpened():
            cap.release()
            cap = None  # 카메라 중지 시 cap을 None으로 설정
        print("Stopping stream...")  # 스트리밍 중지 로그
        return Response(status=200)
    return Response(status=400)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
