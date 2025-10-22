#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>
//Switch pins
#define SWITCH_PIN 
// Wi-Fi Credentials
const char* ssid = "IoT_IRL";
const char* password = "DePaulIRL";
bool switch_on=false;
// Firebase credentials
const String FIRESTORE_URL = "https://firestore.googleapis.com/v1/projects/airquality-71cef/databases/(default)/documents/switch/?key={API_KEY}";
const String API_KEY = "AIzaSyDShPnrhxN5F1vNRK1sCXTV2Ni6iWQJxpM";
void connectWiFi() {
    WiFi.begin(ssid, password);
    Serial.print("Connecting to WiFi...");
    
    int retries = 0; //retries 20 times 
    while (WiFi.status() != WL_CONNECTED && retries < 20) {
        delay(1000);
        Serial.print(".");
        retries++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\nWiFi connected!");
        Serial.print("IP Address: ");
        Serial.println(WiFi.localIP());
    } else {
        Serial.println("\nFailed to connect to WiFi.");
    }
}
void send() { // sends under the switch collection, should only update 1 file?
  if (WiFi.status()==WL_CONNECTED) {
    String jsonPayload=("{\"fields\": {\"Switch_on\": {\"booleanValue\": ")+(switch_on ? "true" : "false")+"}}}"; //payload structure for http request.
    HTTPClient http;
    String url=FIRESTORE_URL
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    int httpResponseCode=http.sendRequest("PATCH", jsonPayload.c_str());
    if (httpResponseCode>0) {
      Serial.print("HTTP Response code: ");
      Serial.println(httpResponseCode);
      String response=http.getString();
      Serial.println(response);
    } else {
      Serial.print"Error code: ");
      Serial.println(httpResponseCode);
    }
    http.end();
    }
}
void setup() {
  Serial.begin(115200);
  delay(50);
  pinMode(SWITCH_PIN, INPUT);
  connectWiFi();
}
void loop() {
    bool currentState =digitalRead(SWITCH_PIN==HIGH);
    if (currentState!=switch_on) {
      switch_on=currentState;
      send();
      delay(300);
    }
    delay(1000);
}
