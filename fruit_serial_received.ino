#include <Servo.h>
#include <math.h>

const int SERVOS = 6;
Servo myservo[SERVOS];

int PIN[SERVOS], ANA[SERVOS], value[SERVOS], currentAngle[SERVOS];
int MIN[SERVOS], MAX[SERVOS], INITANGLE[SERVOS], READYANGLE[SERVOS];

float d = 185.0;
float a = 163.0;
float b = 163.0;
float pixel = 0.6944;
float pixelx = 0.8044;

void setup() {
  Serial.begin(9600);

  PIN[0] = 4; ANA[0] = A1; MIN[0] = 0; MAX[0] = 180;
  PIN[1] = 7; ANA[1] = A3; MIN[1] = 0; MAX[1] = 180;
  PIN[2] = 6; ANA[2] = A2; MIN[2] = 0; MAX[2] = 180;
  PIN[3] = 5; ANA[3] = A0; MIN[3] = 0; MAX[3] = 180;
  PIN[4] = 8; ANA[4] = A4; MIN[4] = 0; MAX[4] = 180;
  PIN[5] = 9; ANA[5] = A5; MIN[5] = 90; MAX[5] = 180;

  Serial.println("Initialize 6DOF ROBOT Arm.");

  home();
  
  Serial.println("Init Complete");
}

void loop() {
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    float x = 0.0;
    float y = 0.0;
    int fruit_code;

    // 받은 데이터 처리
    int commaIndex = input.indexOf(',');
    if (commaIndex > 0) {
      String type = input.substring(0, commaIndex);
      String value = input.substring(commaIndex + 1);
      // type이 과일 종류인 경우
      if (type.equals("appleG") || type.equals("peach") || type.equals("orange") || type.equals("appleR") || type.equals("pepperR") || type.equals("pepperG")) {
        if(type == 'peach'){
          fruit_code = 1;
        }
        else if(type == 'appleR'){
          fruit_code = 1;
        }
        else if(type == 'appleG'){
          fruit_code = 1;
        }
        else if(type == 'pepperR'){
          fruit_code = 2;
        }
        else if(type == 'pepperG'){
          fruit_code = 2;
        }
        else if(type == 'orange'){
          fruit_code = 3;
        }
      }
      // x,y 좌표인 경우
    int xIndex = value.indexOf(',');
    if (xIndex > 0) {
      x = value.substring(0, xIndex).toFloat();
      y = value.substring(xIndex + 1).toFloat();
      Serial.print("x: ");
      Serial.print(x);
      Serial.print(", y: ");
      Serial.println(y);

      fruit_grip(x,y,fruit_code);
      basket();
      home();
    }
    x = 0.0;
    y = 0.0;
    fruit_code = 0;
    }
  }
}


void fruit_grip(float x, float y, int fruitType){
  float xze = 323.5;
  float yze = 419.5;
  x = x-xze;
  y = yze-y;
  x = x * pixelx;
  y = y * pixel;

  float R = sqrt((d*d) + (x*x));
  float r = sqrt((R*R) + (y*y));

  if (r > 2 * a) {
    Serial.println("Error: r의 값이 2a를 초과하여 h의 값이 NaN이 발생");
    return;
  }
  
  if (y > 150 || y <= 200){
    r =  r + 20;
  }
  else if (y > 200 || y <= 250){
    r =  r + 5;
  }
  else if (y > 250 || y <= 300){
    r =  r + 3;
  }

  float h = sqrt((a*a)-((r/2)*(r/2)));

  float al = degrees(asin(h/a));

  float be = 90.0 - al;
  float se = degrees(asin(y/r));
  float gam = degrees(asin(x/r));

  float targetAngles[SERVOS] = {95 - gam, 230 - (2 * be), 90.0, se+ al, 74.0, 70.0};

  for (int i = 0; i < SERVOS; i++){
    Serial.println(targetAngles[i]);
  }

  switch (fruitType) {
    case 1:
      targetAngles[5] = 95.0; // 사과, 복숭아
      break;
    case 2:
      targetAngles[5] = 115.0; // 고추
      break;
    case 3:
      targetAngles[5] = 85.0; // 감
      break;
    default:
      targetAngles[5] = 60.0; // 기본값
  }

  for (int i = 0; i < SERVOS; i++) {
    myservo[i].attach(PIN[i]);
  }
  
  // Smoothly move servos to target angles
  smoothMoveServos(targetAngles, 20); // 20ms delay per step

  // Move myservo[5] separately
  smoothMoveServo5(targetAngles[5], 20);
}

void smoothMoveServos(float targetAngles[], int delayTime) {
  bool moving = true;
  while (moving) {
    moving = false;
    for (int i = 0; i < SERVOS - 1; i++) { // Exclude myservo[5]
      float currentAngle = myservo[i].read();
      float targetAngle = targetAngles[i];
      
      if (abs(currentAngle - targetAngle) > 1) {
        moving = true;
        if (currentAngle < targetAngle) {
          currentAngle += 1; // Increment angle
          if (currentAngle > targetAngle) currentAngle = targetAngle; // Cap to target
        } else {
          currentAngle -= 1; // Decrement angle
          if (currentAngle < targetAngle) currentAngle = targetAngle; // Cap to target
        }
        
        myservo[i].write(currentAngle);
      }
    }
    delay(delayTime);
  }
}

void smoothMoveServo5(float targetAngle, int delayTime) {
  bool moving = true;
  while (moving) {
    moving = false;
    float currentAngle = myservo[5].read();
    
    if (abs(currentAngle - targetAngle) > 1) {
      moving = true;
      if (currentAngle < targetAngle) {
        currentAngle += 1; // Increment angle
        if (currentAngle > targetAngle) currentAngle = targetAngle; // Cap to target
      } else {
        currentAngle -= 1; // Decrement angle
        if (currentAngle < targetAngle) currentAngle = targetAngle; // Cap to target
      }
      
      myservo[5].write(currentAngle);
    }
    delay(delayTime);
  }
}

void home(){
  float targetAngles[SERVOS] = {95.0, 170.0, 170.0, 170.0, 74.0, 60.0};

  for (int i = 0; i < SERVOS; i++) {
    myservo[i].attach(PIN[i]);
  }

  smoothMoveServos(targetAngles, 20);

  // Move myservo[5] separately
  smoothMoveServo5(targetAngles[5], 20);
}

void basket(){
  float targetAngles[SERVOS] = {95.0, 164.0, 149.0, 83.0, 74.0, 60.0};

  for (int i = 0; i < SERVOS; i++) {
    myservo[i].attach(PIN[i]);
  }

  smoothMoveServos(targetAngles, 20);

  // Move myservo[5] separately
  smoothMoveServo5(targetAngles[5], 20);
}

void serialEvent(){
  int inByte=Serial.read();
  Serial.println(inByte); 
  switch(inByte){
    case 'h':
      home();
      break;
    case 'a':
      fruit_grip(162.0, 250.5, 1);
      break;
    case 'b':
      fruit_grip(410.0, 196.5, 1);
      break;
    case 'c':
      fruit_grip(126.5, 296.0, 1);
      break;
    case 'd':
      fruit_grip(317.5, 296.5, 1);
      break;
    case 'e':
      fruit_grip(489.5, 295.0, 1);
      break;
    case 'z':
      fruit_grip(323.5, 419.5, 1);
      break;
    case 'k':
      basket();
      break;
  }
}