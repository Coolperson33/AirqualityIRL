#monitor.py
import serial
import time 
import datetime
import requests
port="COM6"
baud=9600
interval=60
API_KEY="AIzaSyDShPnrhxN5F1vNRK1sCXTV2Ni6iWQJxpM"
PROJECT_ID="airquality-71cef"
class dataCollector:
    def __init__(self,port=None,baud=9600):
        self.port= port
        self.baud=baud
    def read_latest_counts(self):
        try:
            with serial.Serial(port=self.port, baudrate=self.baud, timeout=10) as ser:
                time.sleep(2)
                ser.reset_input_buffer()
                print("→ Sending 'D' command…")
                ser.write(b'D\r\n')
                while True:
                    raw = ser.readline()
                    if not raw:
                        raise IOError("No data received from serial port.")
                    text = raw.decode('ascii', errors='ignore').strip()
                    #print(f" Received: {text}")
                    if text == "MIN":
                        continue 
                    parts = text.split(",")
                    if len(parts) != 2:    
                        continue
                    try:
                        small = int(parts[0])
                        large = int(parts[1])
                        print(f'Small Particles: {small} ,Large Particles: {large}')
                        return small, large
                    except ValueError:
                        continue
        except Exception as e:
            print(f'Serial read error: {e}')
            raise
    def collect_and_send(self):
        timestamp = datetime.datetime.now().replace(second=0, microsecond=0)
        parts=str(timestamp).split(' ')
        if len(parts)==2:
            date=parts[0]
        try:
            small, large = self.read_latest_counts()
            #print(timestamp, small, large)
            URL = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/data/?key={API_KEY}"
            payload = {
                "fields": {
                    "timestamp": {"stringValue": timestamp.isoformat()},
                    "small": {"integerValue": str(small)},
                    "large": {"integerValue": str(large)},
                    "date": {"stringValue": date}
                    }
                }
            r = requests.post(URL, json=payload)
            if r.status_code == 200:
                print("Uploaded to Firestore")
            else:
                print("Error uploading:", r.text)
            return True
        except Exception as e:
            print(f"Error collecting latest data: {e}")
            return False
def main():
    print('Script Started Successfully!')
    print(f'port: {port}')
    print(f'Baudrate: {baud}')
    try:
        collector = dataCollector(
            port=port,
            baud=baud
        )
    except Exception:
        print("[Error] Could not initialize data collector. Exiting.")
        return
    while True:
        try:
            success = collector.collect_and_send()
            if success:
                print(f"Next poll in {interval} seconds…")
            else:
                print(f" Failed to collect data; retrying after {interval} seconds…")

        except KeyboardInterrupt:
            print("\n Shutting down data collector…")
            break

        except Exception as e:
            print(f"[Error] Unexpected error in main loop: {e}")

        time.sleep(interval)

main()
