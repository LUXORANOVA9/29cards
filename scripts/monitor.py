import requests
import time

API_URL = "https://29cards-api.railway.app/health"

def check_health():
    try:
        response = requests.get(API_URL)
        if response.status_code == 200:
            print("API is healthy")
        else:
            print(f"API is unhealthy, status code: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"Error connecting to API: {e}")

if __name__ == "__main__":
    while True:
        check_health()
        time.sleep(60) # Check every 60 seconds
