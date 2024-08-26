import cv2
import numpy as np
from ultralytics import YOLO
import time
import serial  # pyserial 라이브러리 임포트

# YOLOv8 모델 로드
model = YOLO('best.pt')  # 'best.pt'는 YOLOv8 모델의 경로입니다.

# 아두이노와 직렬 통신 설정
arduino = serial.Serial('COM12', 9600)  # 'COM12'를 아두이노가 연결된 포트로 변경해야 합니다.
time.sleep(2)  # 아두이노와 연결 대기

# 웹캠 열기
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 609)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 609)

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

    return fruit_coords, fruit_counts

while True:
    # 웹캠에서 프레임 읽기
    ret, frame = cap.read()
    if not ret:
        print("프레임을 읽을 수 없습니다.")
        break

    # 웹캠 프레임을 화면에 표시
    fruit_coords, fruit_counts = process_frame(frame)

    # 결과를 화면에 표시
    cv2.imshow('Fruit Detection', frame)

    # 사용자 입력 처리
    if cv2.waitKey(1) & 0xFF == ord('i'):  # 'i' 키를 누르면 입력 모드로 전환
        fruit_type = input("과일 종류를 입력하세요: ")
        fruit_count = int(input("개수를 입력하세요: "))

        if fruit_type in fruit_coords and fruit_counts[fruit_type] >= fruit_count:
            coords = fruit_coords[fruit_type][:fruit_count]
            print(f"{fruit_type}: 좌표 {coords}, 개수: {fruit_count}")

            # 과일 좌표를 아두이노로 전송
            for coord in coords:
                x, y = coord
                arduino.write(f'{fruit_type},{x},{y}\n'.encode())
                print(f'과일종류 : {fruit_type}, x : {x}, y : {y}\n')
                time.sleep(7)  # 데이터 전송 후 잠시 대기

    # 'q' 키를 눌러서 종료
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# 웹캠과 창 해제
cap.release()
cv2.destroyAllWindows()
arduino.close()  # 직렬 포트 닫기
