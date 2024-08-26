import cv2
import numpy as np
from ultralytics import YOLO
import time

# YOLOv8 모델 로드
model = YOLO('best.pt')  # 'best.pt'는 YOLOv8 모델의 경로입니다.

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

# 시작 시간 기록
start_time = time.time()

while True:
    # 웹캠에서 프레임 읽기
    ret, frame = cap.read()
    if not ret:
        print("프레임을 읽을 수 없습니다.")
        break

    # 웹캠 프레임을 화면에 표시
    fruit_coords, fruit_counts = process_frame(frame)

    # 현재 시간
    current_time = time.time()

    # 10초마다 캡처 및 처리
    if current_time - start_time >= 10:
        # 결과 출력
        print("10초마다 캡쳐된 화면에서의 과일 좌표 및 개수:")
        for fruit, coords in fruit_coords.items():
            count = fruit_counts[fruit]
            print(f"{fruit}: 좌표 {coords}, 개수: {count}")

        # 시작 시간 갱신
        start_time = current_time

    # 결과를 화면에 표시
    cv2.imshow('Fruit Detection', frame)

    # 'q' 키를 눌러서 종료
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# 웹캠과 창 해제
cap.release()
cv2.destroyAllWindows()
