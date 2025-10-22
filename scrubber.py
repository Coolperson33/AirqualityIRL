#scrubber.py
import requests
from zwave_js_server import client
import time
API_KEY="AIzaSyDShPnrhxN5F1vNRK1sCXTV2Ni6iWQJxpM"
PROJECT_ID="airquality-71cef"
URL = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/data/?key={API_KEY}"
zwavenodeid=5
zwaveserver_url="ws://localhost:3000"
Client=client(zwaveserver_url)
node=client.nodes[zwavenodeid]
threshold_small=1050
threshold_large=101
def getLatestReading():
    response=requests.get(URL)
    if response.status_code!=200:
        print(f'Didnt work mate :(')
        return None
    docs=response.json().get("documents", [])
    if not docs:
        return None
    def doc_date(doc):
        if "timestamp" in doc["fields"]:
            return int(doc["fields"]["timestamp"]['integerValue'])
        else:
            return 0
    latest_doc=max(docs, key=doc_date)
    fields=latest_doc["fields"]
    small=int(fields.get("small", {}).get("integerValue", 0))
    large=int(fields.get("large", {}).get("integerValue", 0))
    return {"Small": small, "Large": large }
while True:
    reading=getLatestReading()
    if reading:
        small=reading["Small"]
        large=reading["Large"]
        if small>threshold_small or large>threshold_large:
            node.set_value("targetValue",True)
        elif small<(threshold_small-300) or large<(threshold_large-25):
            node.set_value("targetValue", True)
    time.sleep(60)