from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import logging
import subprocess
import re
import platform
import json
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="WiFi Scanner Backend")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","https://circle-apps.github.io"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class WifiNetwork(BaseModel):
    macAddress: str
    signalStrength: int
    channel: Optional[int] = None
    age: Optional[int] = None


class WifiResponse(BaseModel):
    networks: List[WifiNetwork]
    error: Optional[str] = None


def scan_wifi_macos() -> List[WifiNetwork]:
    try:
        # Check if airport command exists and is accessible
        airport_path = '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport'
        if not os.path.exists(airport_path):
            logger.error(f"airport utility not found at {airport_path}")
            raise Exception(
                "airport utility not found. Please ensure you have the correct permissions.")

        logger.info("Starting WiFi scan using airport utility...")

        # First try scanning with -s (human readable format)
        cmd = [airport_path, '-s']
        logger.info(f"Running command: {' '.join(cmd)}")
        process = subprocess.run(cmd, capture_output=True, text=True)

        if process.returncode != 0:
            logger.error(
                f"airport scan failed with return code {process.returncode}")
            logger.error(f"stderr: {process.stderr}")
            raise Exception(f"airport command failed: {process.stderr}")

        logger.info("Successfully ran airport scan command")
        logger.debug(f"Raw output: {process.stdout}")

        # Parse the human-readable output
        networks = []
        lines = process.stdout.split('\n')[1:]  # Skip header
        for line in lines:
            if not line.strip():
                continue
            try:
                # Split on multiple spaces
                parts = [p for p in re.split(r'\s+', line.strip()) if p]
                if len(parts) >= 4:
                    # Format is typically: SSID MAC_ADDR RSSI CHANNEL SECURITY
                    mac_addr = parts[1]
                    rssi = int(parts[2])
                    channel_str = parts[3]

                    # Extract channel number
                    channel_match = re.search(r'\d+', channel_str)
                    channel = int(channel_match.group()
                                  ) if channel_match else None

                    networks.append(WifiNetwork(
                        macAddress=mac_addr,
                        signalStrength=rssi,
                        channel=channel
                    ))
                    logger.debug(
                        f"Found network: MAC={mac_addr}, Signal={rssi}dBm, Channel={channel}")
            except Exception as e:
                logger.warning(f"Failed to parse line '{line}': {str(e)}")
                continue

        if not networks:
            logger.warning("No networks found in the scan output")
            logger.debug("Full stdout:")
            logger.debug(process.stdout)
        else:
            logger.info(f"Successfully parsed {len(networks)} networks")

        return networks

    except Exception as e:
        logger.error(f"Error scanning WiFi on macOS: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def scan_wifi_windows() -> List[WifiNetwork]:
    try:
        # Use netsh command to get network info
        cmd = ['netsh', 'wlan', 'show', 'networks', 'mode=Bssid']
        process = subprocess.run(
            cmd, capture_output=True, text=True, encoding='utf-8')

        if process.returncode != 0:
            raise Exception(f"netsh command failed: {process.stderr}")

        networks = []
        current_network = {}

        for line in process.stdout.split('\n'):
            line = line.strip()
            if not line:
                if current_network.get('macAddress'):
                    networks.append(WifiNetwork(**current_network))
                current_network = {}
                continue

            if 'BSSID' in line:
                mac = re.search(
                    r'([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})', line)
                if mac:
                    current_network['macAddress'] = mac.group()
            elif 'Signal' in line:
                signal = re.search(r'(\d+)%', line)
                if signal:
                    # Convert percentage to approximate dBm
                    percentage = int(signal.group(1))
                    signal_strength = -100 + \
                        (percentage * 0.7)  # Rough approximation
                    current_network['signalStrength'] = int(signal_strength)
            elif 'Channel' in line:
                channel = re.search(r':\s*(\d+)', line)
                if channel:
                    current_network['channel'] = int(channel.group(1))

        # Add the last network if exists
        if current_network.get('macAddress'):
            networks.append(WifiNetwork(**current_network))

        return networks

    except Exception as e:
        logger.error(f"Error scanning WiFi on Windows: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def scan_wifi() -> List[WifiNetwork]:
    system = platform.system().lower()
    if system == 'darwin':
        return scan_wifi_macos()
    elif system == 'windows':
        return scan_wifi_windows()
    else:
        raise HTTPException(
            status_code=501, detail=f"Unsupported operating system: {system}")


@app.get("/api/wifi", response_model=WifiResponse)
async def get_wifi_networks():
    """
    Scan and return available WiFi networks.
    Returns a list of networks with their MAC addresses and signal strengths.
    """
    try:
        networks = scan_wifi()
        logger.info(f"Found {len(networks)} WiFi networks")
        return WifiResponse(networks=networks)
    except Exception as e:
        logger.error(f"Error in get_wifi_networks: {str(e)}")
        return WifiResponse(networks=[], error=str(e))

if __name__ == "__main__":
    # Set more detailed logging
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
