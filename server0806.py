import sys
import cv2
import numpy as np
from ultralytics import YOLO
import time
import serial
from flask import Flask, render_template, Response, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all origins

# YOLOv8 model load
model = YOLO('best.pt')

# Arduino serial communication setup
arduino = serial.Serial('COM12', 9600)
time.sleep(2)

# Open webcam
cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 609)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 609)

if not cap.isOpened():
    print("Cannot open webcam")
    exit()

# Store current frame
current_frame = None

def process_frame(frame):
    """Extract fruit coordinates and counts from the frame."""
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

def generate_frames():
    global current_frame
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        current_frame = frame
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
    action = request.json.get('action')
    print(f"Received action: {action}")
    if action == 'start':
        print("Starting stream...")
        return Response(status=200)
    elif action == 'stop':
        cap.release()
        print("Stopping stream...")
        return Response(status=200)
    return Response(status=400)

@app.route('/send_fruit_data', methods=['POST'])
def send_fruit_data():
    global current_frame
    data = request.json
    fruit_type = data.get('fruit_type')
    fruit_count = data.get('fruit_count')

    if not fruit_type or not isinstance(fruit_count, int):
        return jsonify({"error": "Invalid input"}), 400

    if current_frame is None:
        return jsonify({"error": "No frame available"}), 500

    fruit_coords, fruit_counts = process_frame(current_frame)

    if fruit_type in fruit_coords and fruit_counts[fruit_type] >= fruit_count:
        coords = fruit_coords[fruit_type][:fruit_count]
        print(f"{fruit_type}: Coordinates {coords}, Count: {fruit_count}")

        for coord in coords:
            x, y = coord
            arduino.write(f'{fruit_type},{x},{y}\n'.encode())
            print(f'Fruit type: {fruit_type}, x: {x}, y: {y}\n')
            time.sleep(7)

        return jsonify({"message": "Data sent successfully"}), 200

    return jsonify({"error": "Requested fruit type or count not found"}), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
