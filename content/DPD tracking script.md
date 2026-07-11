---
publish: true
aliases:
  - DPD Tracking Script
created: 2026-07-11T20:55:13.066Z
modified: 2026-07-11T21:28:42.743Z
---

# DPD Tracking Script

##

Chatty G made me a thing.

Returns fraud is real. DPD give us a limited time from when the parcel "enters their network" (meaning it's dropped off/handed over).

Our/DPD's API's miss things sometimes. I did have a workflow going to grab all the returns that are "in flight" (from a report), do some quick wizardry to show what hadn't moved for a while, then contact DPD to get them looked at. That _kinda_ worked, but the report had bunk data (those "1899-12-31" dates) and could show that (generally meaning it hadn't been sent) even if a parcel had, in fact, been sent. Meaning my old method missed some. But the report is the report, it is what we have, so I needed a better source, one with more accurate and up to date data. So here we are.

Script masquerades as different browsers, switches up its window size, and only runs about 30 queries in a row before taking a little break, all in an attempt to not make parcelsapp.com freak out about getting abused. Which typing this out now, I _do_ kinda feel bad about.

The actual DPD site has too many captchas though, and this way it's reusable for any courier, not just DPD.

![[tracker 1.py]]

[[DPD tracking script]]

```
import pandas as pd
import time
import os
import re
import random
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By

desktop_path = os.path.expanduser("~/Desktop")
input_csv = os.path.join(desktop_path, "dpd_list.csv")
output_csv = os.path.join(desktop_path, "dpd_results.csv")

if not os.path.exists(input_csv):
    print("Error: Could not find 'dpd_list.csv' on your Desktop.")
    exit()

# Load the file
df = pd.read_csv(input_csv)

# Ensure our output columns exist in the dataframe so we can check them
if 'Last update' not in df.columns:
    df['Last update'] = ""
if 'Date of last update' not in df.columns:
    df['Date of last update'] = ""

# Clean up NaN values to empty strings for easy comparison
df['Last update'] = df['Last update'].fillna("").astype(str)
df['Date of last update'] = df['Date of last update'].fillna("").astype(str)

# FANCY PARTS: Stealth Pools for Rotations
USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0"
]

WINDOW_SIZES = [
    (1366, 768), (1440, 900), (1536, 864), (1920, 1080), (1280, 720)
]

def launch_stealth_browser():
    """Launches a highly randomized, custom stealth browser instance"""
    options = uc.ChromeOptions()
    
    # Pick a random user agent from the pool
    chosen_ua = random.choice(USER_AGENTS)
    options.add_argument(f"user-agent={chosen_ua}")
    
    driver = uc.Chrome(options=options)
    
    # Resize window randomly to emulate different physical monitors
    width, height = random.choice(WINDOW_SIZES)
    driver.set_window_size(width, height)
    
    return driver

def get_parcelsapp_status(driver, tracking_id):
    if pd.isna(tracking_id):
        return "No ID", "No Date"
    
    url = f"https://parcelsapp.com/en/tracking/{int(tracking_id)}"
    
    try:
        driver.get(url)
        time.sleep(5) # Let dynamic data load
        
        page_text = driver.find_element(By.TAG_NAME, "body").text
        clean_text = page_text.replace('\n', ' | ')
        
        # Smart detection for rate-limiting or information-not-found screens
        if "Information has not been found yet" in page_text or "try to check again" in page_text or "TRY AGAIN" in page_text:
            return "TRY AGAIN", "Rate Limited / Retrying Later"
            
        match = re.search(r"Add package title\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)", clean_text)
        
        if match:
            date_part = match.group(1).strip()
            time_part = match.group(2).strip()
            status_part = match.group(3).strip()
            return status_part, f"{date_part} {time_part}"
            
        lines = page_text.split('\n')
        for i, line in enumerate(lines):
            if "Your parcel" in line or "Delivered" in line or "dropped off" in line or "delay" in line:
                possible_date = lines[i-1] if i > 0 else "Unknown Date"
                return line.strip(), possible_date.strip()
                
        return "Status Not Found", "Date Not Found"
            
    except Exception as e:
        print(f" -> Critical Error: {str(e)[:50]}")
        return "Error/Blocked", "Error/Blocked"

# Step 1: Identify what actually needs tracking
unique_ids = df['Return Tracking ID'].dropna().unique()
ids_to_track = []

# Map existing data into a cache first so we know what we already have
results_cache = {}
for _, row in df.iterrows():
    tid = row['Return Tracking ID']
    if pd.notna(tid):
        is_failed_row = row['Last update'] in ["", "Layout Changed", "Error/Blocked", "TRY AGAIN", "Status Not Found"]
        if row['Last update'] and not is_failed_row:
            results_cache[tid] = {"Last update": row['Last update'], "Date of last update": row['Date of last update']}

# Filter unique list down to ONLY what is missing or needs a rerun
for tid in unique_ids:
    if tid not in results_cache:
        ids_to_track.append(tid)

print(f"Total unique items: {len(unique_ids)}")
print(f"Already tracked successfully: {len(results_cache)}")
print(f"Items left to track (including failures/blanks): {len(ids_to_track)}")

if len(ids_to_track) == 0:
    print("Everything is already tracked successfully! Nothing to do.")
    exit()

print("\nInitializing stealth browser config...")
driver = launch_stealth_browser()

try:
    success_count = 0
    for idx, tid in enumerate(ids_to_track):
        
        # Batching Guard: Every 35 requests, rotate completely to a new browser profile & size
        if success_count > 0 and success_count % 35 == 0:
            print("\n=== Taking an 8-minute cool-down break to clear fingerprints... ===")
            driver.quit() 
            time.sleep(480) 
            print("Cycling browser identity and resuming...")
            driver = launch_stealth_browser()

        status, date = get_parcelsapp_status(driver, tid)
        
        if status == "TRY AGAIN":
            print(f"[{idx+1}/{len(ids_to_track)}] Hit rate limit warning at item {tid}. Saving status and continuing...")
            
        results_cache[tid] = {"Last update": status, "Date of last update": date}
        print(f"[{idx+1}/{len(ids_to_track)}] Tracked: {tid} -> {status}")
        success_count += 1
        
        # Humanized randomized request spacing
        time.sleep(random.uniform(4.5, 7.5)) 
finally:
    # Save whatever data we managed to grab back to the file
    df['Last update'] = df['Return Tracking ID'].map(lambda x: results_cache.get(x, {}).get("Last update", ""))
    df['Date of last update'] = df['Return Tracking ID'].map(lambda x: results_cache.get(x, {}).get("Date of last update", ""))
    
    df.to_csv(output_csv, index=False)
    driver.quit()
    print("\nProgress saved to 'dpd_results.csv' on your desktop.")
```

In action:

![[attachment/My Movie 5.mov]]

## Making it Available for Non-nerds

Apparently can compile into a little .exe for my windows friends to run, no command line needed. I haven't tested this part yet.

```
docker run --rm -v "$(pwd):/src" cdrx/pyinstaller-windows "pip install pandas selenium undetected-chromedriver && pyinstaller --onefile track_dpd.py"
```

run that on linux box after grabbing Tracker.py

### Or in Windows

1. Open Command Prompt (`cmd`) and install the tools:

```cmd
pip install pandas selenium undetected-chromedriver pyinstaller
```

2. Navigate to where you saved the `track_dpd.py` script and run:

```cmd
pyinstaller --onefile track_dpd.py
```

2. Look inside the newly created `dist` folder. You will find **track\_dpd.exe**.
