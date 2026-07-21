---
publish: true
title: DPD Tracking Script
created: 2026-07-11T21:55:13
modified: 2026-07-21T23:36:31
tags:
  - Pyhon
  - dayjob
  - code
---

# DPD Tracking Script

Chatty G made me a thing.

Returns can go walkies, but also fraud is real. DPD give us a limited time from when the parcel "enters their network" (meaning it's dropped off/handed over).

Our/DPD's API's miss things sometimes. I did have a workflow going to grab all the returns that are in flight (from a report), do some quick wizardry to show what hadn't moved for a while, then contact DPD to get them looked at. That _kinda_ worked, but the report had bunk data (those "1899-12-31" dates) and could show that, generally meaning it hadn't been sent, even if a parcel had, in fact, been sent. Meaning my old method missed some. But the report is the report, it is what we have, so I needed a better source, one with more accurate and up to date data. So here we are.

Script masquerades as different browsers, switches up its window size, and only runs about 30 queries in a row before taking a little break, all in an attempt to not make parcelsapp.com freak out about getting abused. Which typing this out now, I _do_ kinda feel bad about.

The actual DPD site has too many captchas though, and this way it's reusable for any courier, not only them.

![[tracker 1.py]]

## The Actual Script

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

In action (not real time, some flashing, photosensitive peeps be warned):

![[Attachments/attachment/My Movie 5.mov]]

# Making it Available for Non-nerds

Apparently can compile into a little .exe for my windows friends to run, no command line needed. I haven't tested this part yet.

```
docker run --rm -v "$(pwd):/src" cdrx/pyinstaller-windows "pip install pandas selenium undetected-chromedriver && pyinstaller --onefile track_dpd.py"
```

run that on linux box after grabbing Tracker.py

## Or in Windows

1. Open Command Prompt (`cmd`) and install the tools:

```cmd
pip install pandas selenium undetected-chromedriver pyinstaller
```

1. Navigate to where you saved the `track_dpd.py` script and run:

```cmd
pyinstaller --onefile track_dpd.py
```

1. Look inside the newly created `dist` folder. You will find **track\_dpd.exe**.

Skipped all that palaver and made the exe in _github itself_, what a time to be alive. <https://github.com/Doghouse-Mike/exe-maker/actions/runs/29374361748#artifacts>

What I need to check now is if that lad actually works, _and_ if it's the latest version of the script (asks for a file, and where to save output etc)

python -m PyInstaller --onefile track\_dpd.py

```Traceback (most recent call last):
  File "tracker.py", line 147, in main
    run_tracker()
  File "tracker.py", line 118, in run_tracker
    driver = launch_stealth_browser()
             ^^^^^^^^^^^^^^^^^^^^^^^^
  File "tracker.py", line 28, in launch_stealth_browser
    driver = uc.Chrome(options=options)
             ^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "undetected_chromedriver\__init__.py", line 466, in __init__
    super(Chrome, self).__init__(
  File "selenium\webdriver\chrome\webdriver.py", line 45, in __init__
  File "selenium\webdriver\chromium\webdriver.py", line 66, in __init__
  File "selenium\webdriver\common\webdriver.py", line 25, in __init__
  File "selenium\webdriver\remote\webdriver.py", line 300, in __init__
  File "undetected_chromedriver\__init__.py", line 724, in start_session
    super(selenium.webdriver.chrome.webdriver.WebDriver, self).start_session(
  File "selenium\webdriver\remote\webdriver.py", line 396, in start_session
  File "selenium\webdriver\remote\webdriver.py", line 492, in execute
  File "selenium\webdriver\remote\errorhandler.py", line 232, in check_response
selenium.common.exceptions.SessionNotCreatedException: Message: session not created: cannot connect to chrome at 127.0.0.1:64018
from session not created: This version of ChromeDriver only supports Chrome version 151
Current browser version is 150.0.7871.125; For documentation on this error, please visit: https://www.selenium.dev/documentation/webdriver/troubleshooting/errors#sessionnotcreatedexception
Stacktrace:
        undetected_chromedriver!GetHandleVerifier [0xb621f3+ff93]
        undetected_chromedriver!GetHandleVerifier [0xb62234+ffd4]
        undetected_chromedriver!(No symbol) [0x959210]
        undetected_chromedriver!(No symbol) [0x995c32]
        undetected_chromedriver!(No symbol) [0x994c4c]
        undetected_chromedriver!(No symbol) [0x98ae75]
        undetected_chromedriver!(No symbol) [0x98ac96]
        undetected_chromedriver!(No symbol) [0x9d194f]
        undetected_chromedriver!(No symbol) [0x9d1167]
        undetected_chromedriver!(No symbol) [0x9c5656]
        undetected_chromedriver!(No symbol) [0x998819]
        undetected_chromedriver!(No symbol) [0x9995e4]
        undetected_chromedriver!GetHandleVerifier [0xdfcaea+2aa88a]
        undetected_chromedriver!GetHandleVerifier [0xdf7ff1+2a5d91]
        undetected_chromedriver!GetHandleVerifier [0xb8d582+3b322]
        undetected_chromedriver!GetHandleVerifier [0xb7c3c6+2a166]
        undetected_chromedriver!GetHandleVerifier [0xb8319d+30f3d]
        undetected_chromedriver!GetHandleVerifier [0xb6b778+19518]
        undetected_chromedriver!GetHandleVerifier [0xb6b925+196c5]
        undetected_chromedriver!GetHandleVerifier [0xb5434f+20ef]
        KERNEL32!BaseThreadInitThunk [0x76715d49+19]
        ntdll!RtlInitializeExceptionChain [0x7744e00b+6b]
        ntdll!RtlGetAppContainerNamedObjectPath [0x7744df91+231]
```

---

### Carry on from Here, Probs Bin the above Instructions:

Done. Here's what changed from your original:

The user-agent fix (--user-agent=...) so no more junk tab, and your custom agents actually get applied now.

All the top-level code moved into run\_tracker(), which is called from main(), which only runs under if **name** == "**main**". This is the change that matters for the .exe — it stops undetected\_chromedriver's subprocess relaunch from re-triggering your file dialog and tracking loop.

multiprocessing.freeze\_support() as the first line inside the guard — required for frozen builds that spawn subprocesses.

Error handling that pauses: any crash now prints a full traceback and waits for Enter, so the console window stays open long enough for your colleague to screenshot the error instead of it vanishing.

Two smaller robustness tweaks I slipped in: the finally block no longer throws its own NameError if the browser fails to launch (previously driver.quit() would blow up and hide the real error), and the Tk root gets destroyed after the dialog so it doesn't linger.

To build it:

pyinstaller --onefile --console --collect-all undetected\_chromedriver --collect-all selenium tracker.py

Keep --console at least until it's working — once you're confident, you can rebuild with --noconsole for the polished version, but you'll lose the error window if you do, so I'd hold off. And do test the resulting .exe on an actual colleague's machine, since undetected\_chromedriver needs Chrome present and writes a patched driver to temp on first run, which a locked-down work laptop can block.

python -m PyInstaller --onefile --console --collect-all undetected\_chromedriver --collect-all selenium tracker.py

Total items left to track: 37

Saved! Open 'dpd\_results.csv' in the same folder.

\=== Something went wrong ===

Traceback (most recent call last):

File "tracker.py", line 147, in main

File "tracker.py", line 118, in run\_tracker

File "tracker.py", line 28, in launch\_stealth\_browser

File "undetected\_chromedriver\__init_\_.py", line 466, in **init**

```
super(Chrome, self).__init__(
```

File "selenium\webdriver\chrome\webdriver.py", line 45, in **init**

```
super().__init__(
```

File "selenium\webdriver\chromium\webdriver.py", line 66, in **init**

```
super().__init__(command_executor=executor, options=self.options)
```

File "selenium\webdriver\common\webdriver.py", line 25, in **init**

```
super().__init__(*args, **kwargs)
```

File "selenium\webdriver\remote\webdriver.py", line 300, in **init**

```
self.start_session(capabilities)
```

File "undetected\_chromedriver\__init_\_.py", line 724, in start\_session

```
super(selenium.webdriver.chrome.webdriver.WebDriver, self).start_session(
```

File "selenium\webdriver\remote\webdriver.py", line 396, in start\_session

```
response = self.execute(Command.NEW_SESSION, caps)["value"]
```

File "selenium\webdriver\remote\webdriver.py", line 492, in execute

```
self.error_handler.check_response(response)
```

File "selenium\webdriver\remote\errorhandler.py", line 232, in check\_response

```
raise exception_class(message, screen, stacktrace)
```

selenium.common.exceptions.SessionNotCreatedException: Message: session not created: cannot connect to chrome at 127.0.0.1:53593

from session not created: This version of ChromeDriver only supports Chrome version 151

Current browser version is 150.0.7871.125; For documentation on this error, please visit: <https://www.selenium.dev/documentation/webdriver/troubleshooting/errors#sessionnotcreatedexception>

Stacktrace:

```
    undetected_chromedriver!GetHandleVerifier [0x4f21f3+ff93]

    undetected_chromedriver!GetHandleVerifier [0x4f2234+ffd4]

    undetected_chromedriver!(No symbol) [0x2e9210]

    undetected_chromedriver!(No symbol) [0x325c32]

    undetected_chromedriver!(No symbol) [0x324c4c]

    undetected_chromedriver!(No symbol) [0x31ae75]

    undetected_chromedriver!(No symbol) [0x31ac96]

    undetected_chromedriver!(No symbol) [0x36194f]

    undetected_chromedriver!(No symbol) [0x361167]

    undetected_chromedriver!(No symbol) [0x355656]

    undetected_chromedriver!(No symbol) [0x328819]

    undetected_chromedriver!(No symbol) [0x3295e4]

    undetected_chromedriver!GetHandleVerifier [0x78caea+2aa88a]

    undetected_chromedriver!GetHandleVerifier [0x787ff1+2a5d91]

    undetected_chromedriver!GetHandleVerifier [0x51d582+3b322]

    undetected_chromedriver!GetHandleVerifier [0x50c3c6+2a166]

    undetected_chromedriver!GetHandleVerifier [0x51319d+30f3d]

    undetected_chromedriver!GetHandleVerifier [0x4fb778+19518]

    undetected_chromedriver!GetHandleVerifier [0x4fb925+196c5]

    undetected_chromedriver!GetHandleVerifier [0x4e434f+20ef]

    KERNEL32!BaseThreadInitThunk [0x76715d49+19]

    ntdll!RtlInitializeExceptionChain [0x7744e00b+6b]

    ntdll!RtlGetAppContainerNamedObjectPath [0x7744df91+231]
```
