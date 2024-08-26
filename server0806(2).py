import cv2
import numpy as np
from ultralytics import YOLO
import time
import serial
from flask import Flask, request, jsonify

# Initialize Flask app
app = Flask(__name__)

# YOLOv8 model and Arduino setup
model = YOLO('best.pt')
arduino = serial.Serial('COM12', 9600)
time.sleep(2)

# Open webcam
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 609)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 609)

if not cap.isOpened():
    print("Cannot open webcam")
    exit()

def process_frame(frame):
    fruit_coords = {}
    fruit_counts = {}

    results = model(frame)
    for result in results:
        boxes = result.boxes
        for box in boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            label = int(box.cls[0])
            conf = box.conf[0]
            fruit_name = model.names[label]

            center_x = (x1 + x2) / 2
            center_y = (y1 + y2) / 2

            if fruit_name not in fruit_coords:
                fruit_coords[fruit_name] = []
                fruit_counts[fruit_name] = 0
            fruit_coords[fruit_name].append((center_x, center_y))
            fruit_counts[fruit_name] += 1

            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.circle(frame, (int(center_x), int(center_y)), 5, (0, 0, 255), -1)
            cv2.putText(frame, f'{fruit_name} {conf:.2f}', (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    return fruit_coords, fruit_counts

@app.route('/detect', methods=['GET'])
def detect_fruits():
    ret, frame = cap.read()
    if not ret:
        return jsonify({"error": "Failed to read frame from webcam"}), 500

    fruit_coords, fruit_counts = process_frame(frame)
    return jsonify({"fruit_coords": fruit_coords, "fruit_counts": fruit_counts})

@app.route('/send', methods=['POST'])
def send_coords():
    data = request.json
    fruit_type = data.get('fruit_type')
    fruit_count = data.get('fruit_count')

    if fruit_type is None or fruit_count is None:
        return jsonify({"error": "Missing fruit_type or fruit_count"}), 400

    ret, frame = cap.read()
    if not ret:
        return jsonify({"error": "Failed to read frame from webcam"}), 500

    fruit_coords, fruit_counts = process_frame(frame)
    if fruit_type in fruit_coords and fruit_counts[fruit_type] >= fruit_count:
        coords = fruit_coords[fruit_type][:fruit_count]
        for coord in coords:
            x, y = coord
            arduino.write(f'{fruit_type},{x},{y}\n'.encode())
            print(f'과일은={fruit_type},x={x},y={y}\n'.encode())
            time.sleep(7)

        return jsonify({"message": f"Sent {fruit_count} {fruit_type}(s) to Arduino"}), 200
    else:
        return jsonify({"error": "Not enough fruits detected"}), 400

@app.route('/stop', methods=['GET'])
def stop_server():
    cap.release()
    arduino.close()
    func = request.environ.get('werkzeug.server.shutdown')
    if func is None:
        raise RuntimeError('Not running with the Werkzeug Server')
    func()
    return 'Server shutting down...'

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
