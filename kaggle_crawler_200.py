# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
"""
Kaggle-ready CHIMS crawler for 200 popular SKUs.

- Search the whole internet (DuckDuckGo + Bing)
- Parse product pages for title, specs, and gallery
- Normalize specs into category-specific seed-like fields
- Output one JSON report with 200 SKUs

Install:
    pip install requests beautifulsoup4

Run:
    python kaggle_crawler_200.py
"""

from __future__ import annotations

import json
import re
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import quote_plus, urljoin, urlparse

import requests
from bs4 import BeautifulSoup

REPORT_PATH = Path("kaggle_catalog_200_report.json")
IMAGES_DIR = Path("catalog_images")
IMAGES_DIR.mkdir(exist_ok=True)

POPULAR_SKUS = [
    # CPU 16
    {"sku_code": "CPU-001", "name": "AMD Ryzen 5 5600X", "category": "CPU", "brand": "AMD"},
    {"sku_code": "CPU-002", "name": "Intel Core i7-13700K", "category": "CPU", "brand": "Intel"},
    {"sku_code": "CPU-003", "name": "AMD Ryzen 9 7950X", "category": "CPU", "brand": "AMD"},
    {"sku_code": "CPU-004", "name": "Intel Core i5-12400F", "category": "CPU", "brand": "Intel"},
    {"sku_code": "CPU-005", "name": "Intel Core i5-13400F", "category": "CPU", "brand": "Intel"},
    {"sku_code": "CPU-006", "name": "Intel Core i5-13600K", "category": "CPU", "brand": "Intel"},
    {"sku_code": "CPU-007", "name": "Intel Core i7-12700K", "category": "CPU", "brand": "Intel"},
    {"sku_code": "CPU-008", "name": "Intel Core i7-14700K", "category": "CPU", "brand": "Intel"},
    {"sku_code": "CPU-009", "name": "AMD Ryzen 5 7500F", "category": "CPU", "brand": "AMD"},
    {"sku_code": "CPU-010", "name": "AMD Ryzen 5 7600", "category": "CPU", "brand": "AMD"},
    {"sku_code": "CPU-011", "name": "AMD Ryzen 7 7700X", "category": "CPU", "brand": "AMD"},
    {"sku_code": "CPU-012", "name": "AMD Ryzen 7 7800X3D", "category": "CPU", "brand": "AMD"},
    {"sku_code": "CPU-013", "name": "AMD Ryzen 9 7900X", "category": "CPU", "brand": "AMD"},
    {"sku_code": "CPU-014", "name": "AMD Ryzen 9 7950X3D", "category": "CPU", "brand": "AMD"},
    {"sku_code": "CPU-015", "name": "Intel Core i9-13900K", "category": "CPU", "brand": "Intel"},
    {"sku_code": "CPU-016", "name": "Intel Core i9-14900K", "category": "CPU", "brand": "Intel"},
    # GPU 18
    {"sku_code": "GPU-001", "name": "NVIDIA RTX 4060 Ti", "category": "GPU", "brand": "NVIDIA"},
    {"sku_code": "GPU-002", "name": "AMD RX 7800 XT", "category": "GPU", "brand": "AMD"},
    {"sku_code": "GPU-003", "name": "NVIDIA RTX 4090", "category": "GPU", "brand": "NVIDIA"},
    {"sku_code": "GPU-004", "name": "NVIDIA RTX 4060", "category": "GPU", "brand": "NVIDIA"},
    {"sku_code": "GPU-005", "name": "NVIDIA RTX 4070", "category": "GPU", "brand": "NVIDIA"},
    {"sku_code": "GPU-006", "name": "NVIDIA RTX 4070 Super", "category": "GPU", "brand": "NVIDIA"},
    {"sku_code": "GPU-007", "name": "NVIDIA RTX 4080 Super", "category": "GPU", "brand": "NVIDIA"},
    {"sku_code": "GPU-008", "name": "NVIDIA RTX 3050", "category": "GPU", "brand": "NVIDIA"},
    {"sku_code": "GPU-009", "name": "AMD RX 7600", "category": "GPU", "brand": "AMD"},
    {"sku_code": "GPU-010", "name": "AMD RX 7700 XT", "category": "GPU", "brand": "AMD"},
    {"sku_code": "GPU-011", "name": "AMD RX 7900 XT", "category": "GPU", "brand": "AMD"},
    {"sku_code": "GPU-012", "name": "AMD RX 7900 XTX", "category": "GPU", "brand": "AMD"},
    {"sku_code": "GPU-013", "name": "NVIDIA RTX 3060", "category": "GPU", "brand": "NVIDIA"},
    {"sku_code": "GPU-014", "name": "NVIDIA RTX 3070", "category": "GPU", "brand": "NVIDIA"},
    {"sku_code": "GPU-015", "name": "AMD RX 6800 XT", "category": "GPU", "brand": "AMD"},
    {"sku_code": "GPU-016", "name": "AMD RX 6700 XT", "category": "GPU", "brand": "AMD"},
    {"sku_code": "GPU-017", "name": "NVIDIA RTX 4080", "category": "GPU", "brand": "NVIDIA"},
    {"sku_code": "GPU-018", "name": "AMD RX 7900 GRE", "category": "GPU", "brand": "AMD"},
    # RAM 16
    {"sku_code": "RAM-001", "name": "Kingston Fury Beast DDR4 16GB", "category": "RAM", "brand": "Kingston"},
    {"sku_code": "RAM-002", "name": "Corsair Vengeance DDR5 32GB", "category": "RAM", "brand": "Corsair"},
    {"sku_code": "RAM-003", "name": "G.Skill Trident Z5 RGB DDR5 32GB", "category": "RAM", "brand": "G.Skill"},
    {"sku_code": "RAM-004", "name": "Kingston Fury Beast DDR5 16GB", "category": "RAM", "brand": "Kingston"},
    {"sku_code": "RAM-005", "name": "Kingston Fury Beast DDR5 32GB", "category": "RAM", "brand": "Kingston"},
    {"sku_code": "RAM-006", "name": "Corsair Vengeance DDR4 16GB", "category": "RAM", "brand": "Corsair"},
    {"sku_code": "RAM-007", "name": "Corsair Vengeance DDR5 16GB", "category": "RAM", "brand": "Corsair"},
    {"sku_code": "RAM-008", "name": "G.Skill Flare X5 DDR5 32GB", "category": "RAM", "brand": "G.Skill"},
    {"sku_code": "RAM-009", "name": "TeamGroup T-Force Delta RGB DDR5 32GB", "category": "RAM", "brand": "TeamGroup"},
    {"sku_code": "RAM-010", "name": "Adata XPG Lancer DDR5 32GB", "category": "RAM", "brand": "Adata"},
    {"sku_code": "RAM-011", "name": "Patriot Viper Venom DDR5 32GB", "category": "RAM", "brand": "Patriot"},
    {"sku_code": "RAM-012", "name": "Crucial Pro DDR5 32GB", "category": "RAM", "brand": "Crucial"},
    {"sku_code": "RAM-013", "name": "Lexar Thor RGB DDR5 32GB", "category": "RAM", "brand": "Lexar"},
    {"sku_code": "RAM-014", "name": "PNY XLR8 Gaming DDR5 32GB", "category": "RAM", "brand": "PNY"},
    {"sku_code": "RAM-015", "name": "Silicon Power XPOWER Zenith DDR5 32GB", "category": "RAM", "brand": "Silicon Power"},
    {"sku_code": "RAM-016", "name": "GeIL Orion RGB DDR5 32GB", "category": "RAM", "brand": "GeIL"},
    # Storage 18
    {"sku_code": "SSD-001", "name": "Samsung 980 PRO 1TB", "category": "Storage", "brand": "Samsung"},
    {"sku_code": "SSD-002", "name": "WD Black SN850X 2TB", "category": "Storage", "brand": "WD"},
    {"sku_code": "SSD-003", "name": "Samsung 990 PRO 1TB", "category": "Storage", "brand": "Samsung"},
    {"sku_code": "SSD-004", "name": "Samsung 990 PRO 2TB", "category": "Storage", "brand": "Samsung"},
    {"sku_code": "SSD-005", "name": "WD Black SN850X 1TB", "category": "Storage", "brand": "WD"},
    {"sku_code": "SSD-006", "name": "Kingston NV2 1TB", "category": "Storage", "brand": "Kingston"},
    {"sku_code": "SSD-007", "name": "Kingston KC3000 1TB", "category": "Storage", "brand": "Kingston"},
    {"sku_code": "SSD-008", "name": "Crucial P3 Plus 1TB", "category": "Storage", "brand": "Crucial"},
    {"sku_code": "SSD-009", "name": "Crucial P5 Plus 2TB", "category": "Storage", "brand": "Crucial"},
    {"sku_code": "SSD-010", "name": "Lexar NM790 1TB", "category": "Storage", "brand": "Lexar"},
    {"sku_code": "SSD-011", "name": "Lexar NM710 1TB", "category": "Storage", "brand": "Lexar"},
    {"sku_code": "SSD-012", "name": "Adata XPG Gammix S70 Blade 1TB", "category": "Storage", "brand": "Adata"},
    {"sku_code": "SSD-013", "name": "Adata XPG Gammix S70 Blade 2TB", "category": "Storage", "brand": "Adata"},
    {"sku_code": "SSD-014", "name": "Seagate BarraCuda 2TB", "category": "Storage", "brand": "Seagate"},
    {"sku_code": "SSD-015", "name": "WD Blue SN580 1TB", "category": "Storage", "brand": "WD"},
    {"sku_code": "SSD-016", "name": "Samsung 870 EVO 1TB", "category": "Storage", "brand": "Samsung"},
    {"sku_code": "SSD-017", "name": "WD Blue 2TB HDD", "category": "Storage", "brand": "WD"},
    {"sku_code": "SSD-018", "name": "Seagate IronWolf 4TB", "category": "Storage", "brand": "Seagate"},
    # Mainboard 16
    {"sku_code": "MB-001", "name": "ASUS ROG STRIX B550-F Gaming", "category": "Mainboard", "brand": "ASUS"},
    {"sku_code": "MB-002", "name": "MSI MAG Z790 TOMAHAWK WiFi", "category": "Mainboard", "brand": "MSI"},
    {"sku_code": "MB-003", "name": "MSI B650 Tomahawk WiFi", "category": "Mainboard", "brand": "MSI"},
    {"sku_code": "MB-004", "name": "ASUS TUF Gaming B650-Plus WiFi", "category": "Mainboard", "brand": "ASUS"},
    {"sku_code": "MB-005", "name": "ASUS ROG STRIX B760-F Gaming WiFi", "category": "Mainboard", "brand": "ASUS"},
    {"sku_code": "MB-006", "name": "Gigabyte B650 AORUS Elite AX", "category": "Mainboard", "brand": "Gigabyte"},
    {"sku_code": "MB-007", "name": "Gigabyte Z790 AORUS Elite AX", "category": "Mainboard", "brand": "Gigabyte"},
    {"sku_code": "MB-008", "name": "MSI B760M Mortar WiFi", "category": "Mainboard", "brand": "MSI"},
    {"sku_code": "MB-009", "name": "ASRock B650M Pro RS", "category": "Mainboard", "brand": "ASRock"},
    {"sku_code": "MB-010", "name": "ASRock B760M Pro RS", "category": "Mainboard", "brand": "ASRock"},
    {"sku_code": "MB-011", "name": "Gigabyte B760M DS3H", "category": "Mainboard", "brand": "Gigabyte"},
    {"sku_code": "MB-012", "name": "MSI PRO B650M-A WiFi", "category": "Mainboard", "brand": "MSI"},
    {"sku_code": "MB-013", "name": "ASUS PRIME B650M-A WiFi", "category": "Mainboard", "brand": "ASUS"},
    {"sku_code": "MB-014", "name": "Gigabyte B550M DS3H", "category": "Mainboard", "brand": "Gigabyte"},
    {"sku_code": "MB-015", "name": "MSI PRO Z790-A WiFi", "category": "Mainboard", "brand": "MSI"},
    {"sku_code": "MB-016", "name": "ASUS ROG STRIX X670E-F Gaming WiFi", "category": "Mainboard", "brand": "ASUS"},
    # PSU 12
    {"sku_code": "PSU-001", "name": "Corsair RM850x 850W", "category": "PSU", "brand": "Corsair"},
    {"sku_code": "PSU-002", "name": "Seasonic Focus GX-1000 1000W", "category": "PSU", "brand": "Seasonic"},
    {"sku_code": "PSU-003", "name": "Corsair RM1000e", "category": "PSU", "brand": "Corsair"},
    {"sku_code": "PSU-004", "name": "Seasonic Focus GX-850", "category": "PSU", "brand": "Seasonic"},
    {"sku_code": "PSU-005", "name": "Cooler Master MWE Gold 750", "category": "PSU", "brand": "Cooler Master"},
    {"sku_code": "PSU-006", "name": "Cooler Master MWE Gold 850", "category": "PSU", "brand": "Cooler Master"},
    {"sku_code": "PSU-007", "name": "Antec NeoECO Gold 850W", "category": "PSU", "brand": "Antec"},
    {"sku_code": "PSU-008", "name": "Corsair RM850x Shift", "category": "PSU", "brand": "Corsair"},
    {"sku_code": "PSU-009", "name": "DeepCool PX850G", "category": "PSU", "brand": "DeepCool"},
    {"sku_code": "PSU-010", "name": "MSI MAG A850GL", "category": "PSU", "brand": "MSI"},
    {"sku_code": "PSU-011", "name": "Thermaltake Toughpower GF3 850W", "category": "PSU", "brand": "Thermaltake"},
    {"sku_code": "PSU-012", "name": "FSP Hydro G Pro 850W", "category": "PSU", "brand": "FSP"},
    # Case 14
    {"sku_code": "CASE-001", "name": "NZXT H510 Flow", "category": "Case", "brand": "NZXT"},
    {"sku_code": "CASE-002", "name": "NZXT H5 Flow", "category": "Case", "brand": "NZXT"},
    {"sku_code": "CASE-003", "name": "NZXT H7 Flow", "category": "Case", "brand": "NZXT"},
    {"sku_code": "CASE-004", "name": "Lian Li Lancool 216", "category": "Case", "brand": "Lian Li"},
    {"sku_code": "CASE-005", "name": "Cooler Master TD500 Mesh", "category": "Case", "brand": "Cooler Master"},
    {"sku_code": "CASE-006", "name": "Corsair 4000D Airflow", "category": "Case", "brand": "Corsair"},
    {"sku_code": "CASE-007", "name": "Montech Air 903 Max", "category": "Case", "brand": "Montech"},
    {"sku_code": "CASE-008", "name": "Montech X3 Mesh", "category": "Case", "brand": "Montech"},
    {"sku_code": "CASE-009", "name": "DeepCool CH560", "category": "Case", "brand": "DeepCool"},
    {"sku_code": "CASE-010", "name": "Fractal Design Pop Air", "category": "Case", "brand": "Fractal Design"},
    {"sku_code": "CASE-011", "name": "Antec NX410", "category": "Case", "brand": "Antec"},
    {"sku_code": "CASE-012", "name": "Phanteks XT Pro", "category": "Case", "brand": "Phanteks"},
    {"sku_code": "CASE-013", "name": "Thermaltake S200 TG", "category": "Case", "brand": "Thermaltake"},
    {"sku_code": "CASE-014", "name": "Aqua 3 ARGB", "category": "Case", "brand": "Aqua"},
    # Cooling 14
    {"sku_code": "COOL-001", "name": "Noctua NH-D15", "category": "Cooling", "brand": "Noctua"},
    {"sku_code": "COOL-002", "name": "DeepCool AK620", "category": "Cooling", "brand": "DeepCool"},
    {"sku_code": "COOL-003", "name": "DeepCool LS720", "category": "Cooling", "brand": "DeepCool"},
    {"sku_code": "COOL-004", "name": "Thermalright Peerless Assassin 120", "category": "Cooling", "brand": "Thermalright"},
    {"sku_code": "COOL-005", "name": "Noctua NH-U12A", "category": "Cooling", "brand": "Noctua"},
    {"sku_code": "COOL-006", "name": "Arctic Liquid Freezer II 360", "category": "Cooling", "brand": "Arctic"},
    {"sku_code": "COOL-007", "name": "Cooler Master Hyper 212", "category": "Cooling", "brand": "Cooler Master"},
    {"sku_code": "COOL-008", "name": "DeepCool AG620", "category": "Cooling", "brand": "DeepCool"},
    {"sku_code": "COOL-009", "name": "be quiet! Pure Loop 2 FX 360", "category": "Cooling", "brand": "be quiet!"},
    {"sku_code": "COOL-010", "name": "NZXT Kraken 360", "category": "Cooling", "brand": "NZXT"},
    {"sku_code": "COOL-011", "name": "Corsair H150i Elite Capellix", "category": "Cooling", "brand": "Corsair"},
    {"sku_code": "COOL-012", "name": "ID-COOLING SE-226-XT", "category": "Cooling", "brand": "ID-COOLING"},
    {"sku_code": "COOL-013", "name": "Thermalright Frozen Edge 360", "category": "Cooling", "brand": "Thermalright"},
    {"sku_code": "COOL-014", "name": "DeepCool AK400", "category": "Cooling", "brand": "DeepCool"},
    # Monitor 14
    {"sku_code": "MON-001", "name": "ASUS TUF Gaming VG249Q1A", "category": "Monitor", "brand": "ASUS"},
    {"sku_code": "MON-002", "name": "LG 27GN800-B", "category": "Monitor", "brand": "LG"},
    {"sku_code": "MON-003", "name": "Dell S2721DGF", "category": "Monitor", "brand": "Dell"},
    {"sku_code": "MON-004", "name": "Gigabyte M27Q", "category": "Monitor", "brand": "Gigabyte"},
    {"sku_code": "MON-005", "name": "Samsung Odyssey G5 27", "category": "Monitor", "brand": "Samsung"},
    {"sku_code": "MON-006", "name": "AOC 24G2", "category": "Monitor", "brand": "AOC"},
    {"sku_code": "MON-007", "name": "LG 24GN60R", "category": "Monitor", "brand": "LG"},
    {"sku_code": "MON-008", "name": "MSI G274QPF-QD", "category": "Monitor", "brand": "MSI"},
    {"sku_code": "MON-009", "name": "BenQ MOBIUZ EX2710Q", "category": "Monitor", "brand": "BenQ"},
    {"sku_code": "MON-010", "name": "Samsung Odyssey G7 32", "category": "Monitor", "brand": "Samsung"},
    {"sku_code": "MON-011", "name": "ASUS ROG Strix XG27AQ", "category": "Monitor", "brand": "ASUS"},
    {"sku_code": "MON-012", "name": "Dell Alienware AW2723DF", "category": "Monitor", "brand": "Dell"},
    {"sku_code": "MON-013", "name": "ViewSonic VX2728-2K", "category": "Monitor", "brand": "ViewSonic"},
    {"sku_code": "MON-014", "name": "Gigabyte G27Q", "category": "Monitor", "brand": "Gigabyte"},
    # Keyboard 14
    {"sku_code": "KB-001", "name": "Keychron K2", "category": "Keyboard", "brand": "Keychron"},
    {"sku_code": "KB-002", "name": "Logitech G Pro X TKL", "category": "Keyboard", "brand": "Logitech"},
    {"sku_code": "KB-003", "name": "Akko 3087B Plus", "category": "Keyboard", "brand": "Akko"},
    {"sku_code": "KB-004", "name": "Razer BlackWidow V4", "category": "Keyboard", "brand": "Razer"},
    {"sku_code": "KB-005", "name": "Keychron K8 Pro", "category": "Keyboard", "brand": "Keychron"},
    {"sku_code": "KB-006", "name": "Keychron K10 Pro", "category": "Keyboard", "brand": "Keychron"},
    {"sku_code": "KB-007", "name": "Akko 3098B", "category": "Keyboard", "brand": "Akko"},
    {"sku_code": "KB-008", "name": "Corsair K70 RGB Pro", "category": "Keyboard", "brand": "Corsair"},
    {"sku_code": "KB-009", "name": "Logitech G915 TKL", "category": "Keyboard", "brand": "Logitech"},
    {"sku_code": "KB-010", "name": "Ducky One 3", "category": "Keyboard", "brand": "Ducky"},
    {"sku_code": "KB-011", "name": "MonsGeek M1", "category": "Keyboard", "brand": "MonsGeek"},
    {"sku_code": "KB-012", "name": "Razer Huntsman V2 TKL", "category": "Keyboard", "brand": "Razer"},
    {"sku_code": "KB-013", "name": "Wooting 60HE", "category": "Keyboard", "brand": "Wooting"},
    {"sku_code": "KB-014", "name": "Logitech MX Keys", "category": "Keyboard", "brand": "Logitech"},
    # Mouse 14
    {"sku_code": "MOUSE-001", "name": "Logitech G Pro X Superlight", "category": "Mouse", "brand": "Logitech"},
    {"sku_code": "MOUSE-002", "name": "Razer DeathAdder V3 Pro", "category": "Mouse", "brand": "Razer"},
    {"sku_code": "MOUSE-003", "name": "Logitech G304", "category": "Mouse", "brand": "Logitech"},
    {"sku_code": "MOUSE-004", "name": "Razer Basilisk V3", "category": "Mouse", "brand": "Razer"},
    {"sku_code": "MOUSE-005", "name": "Logitech G502 X", "category": "Mouse", "brand": "Logitech"},
    {"sku_code": "MOUSE-006", "name": "Razer Viper V2 Pro", "category": "Mouse", "brand": "Razer"},
    {"sku_code": "MOUSE-007", "name": "SteelSeries Aerox 5", "category": "Mouse", "brand": "SteelSeries"},
    {"sku_code": "MOUSE-008", "name": "Glorious Model O", "category": "Mouse", "brand": "Glorious"},
    {"sku_code": "MOUSE-009", "name": "Corsair M65 RGB Ultra", "category": "Mouse", "brand": "Corsair"},
    {"sku_code": "MOUSE-010", "name": "Logitech MX Master 3S", "category": "Mouse", "brand": "Logitech"},
    {"sku_code": "MOUSE-011", "name": "Razer Naga V2 Pro", "category": "Mouse", "brand": "Razer"},
    {"sku_code": "MOUSE-012", "name": "Pulsar X2", "category": "Mouse", "brand": "Pulsar"},
    {"sku_code": "MOUSE-013", "name": "Endgame Gear XM2we", "category": "Mouse", "brand": "Endgame Gear"},
    {"sku_code": "MOUSE-014", "name": "ASUS ROG Keris Wireless", "category": "Mouse", "brand": "ASUS"},
    # Headset 14
    {"sku_code": "HS-001", "name": "HyperX Cloud II", "category": "Headset", "brand": "HyperX"},
    {"sku_code": "HS-002", "name": "Razer BlackShark V2", "category": "Headset", "brand": "Razer"},
    {"sku_code": "HS-003", "name": "Logitech G Pro X Headset", "category": "Headset", "brand": "Logitech"},
    {"sku_code": "HS-004", "name": "SteelSeries Arctis Nova 7", "category": "Headset", "brand": "SteelSeries"},
    {"sku_code": "HS-005", "name": "HyperX Cloud Alpha", "category": "Headset", "brand": "HyperX"},
    {"sku_code": "HS-006", "name": "Corsair HS80 Max", "category": "Headset", "brand": "Corsair"},
    {"sku_code": "HS-007", "name": "Razer Kraken V3", "category": "Headset", "brand": "Razer"},
    {"sku_code": "HS-008", "name": "Logitech G733", "category": "Headset", "brand": "Logitech"},
    {"sku_code": "HS-009", "name": "SteelSeries Arctis 7+", "category": "Headset", "brand": "SteelSeries"},
    {"sku_code": "HS-010", "name": "Sony WH-1000XM5", "category": "Headset", "brand": "Sony"},
    {"sku_code": "HS-011", "name": "JBL Quantum 910", "category": "Headset", "brand": "JBL"},
    {"sku_code": "HS-012", "name": "Astro A50", "category": "Headset", "brand": "Astro"},
    {"sku_code": "HS-013", "name": "Razer Barracuda X", "category": "Headset", "brand": "Razer"},
    {"sku_code": "HS-014", "name": "Corsair Void RGB Elite", "category": "Headset", "brand": "Corsair"},
]

CATEGORY_SPEC_RULES = {
    "CPU": lambda: {
        "socket": "",
        "cores": "",
        "threads": "",
        "base_clock": "",
        "boost_clock": "",
        "l2_cache": "",
        "l3_cache": "",
        "tdp": "",
        "process": "",
        "package": "Boxed",
        "supports_overclock": "Yes",
    },
    "GPU": lambda: {
        "vram": "",
        "cuda_cores": "",
        "stream_processors": "",
        "boost_clock": "",
        "power": "",
        "interface": "PCIe 4.0 x16",
        "architecture": "",
        "memory_bus": "",
        "recommended_psu": "",
        "outputs": "HDMI / DisplayPort",
    },
    "RAM": lambda: {
        "bus": "",
        "capacity": "",
        "type": "",
        "latency": "",
        "voltage": "",
        "form_factor": "UDIMM",
        "rgb": "",
        "xmp_expo": "",
    },
    "Storage": lambda: {
        "capacity": "",
        "type": "",
        "read_speed": "",
        "write_speed": "",
        "interface": "",
        "form_factor": "M.2 2280",
        "endurance": "",
        "warranty": "",
    },
    "Mainboard": lambda: {
        "socket": "",
        "chipset": "",
        "form_factor": "",
        "ram_slots": "",
        "max_ram": "",
        "memory_support": "",
        "storage_slots": "",
        "network": "",
    },
    "PSU": lambda: {
        "wattage": "",
        "efficiency": "80+ Gold",
        "modular": "Full",
        "fan_size": "",
        "form_factor": "ATX",
        "rail": "+12V Single Rail",
        "protections": "OVP/UVP/OCP/OPP/SCP/OTP",
    },
    "Case": lambda: {
        "type": "Mid Tower",
        "material": "",
        "max_gpu_length": "",
        "fans_included": "",
        "panel": "Tempered Glass",
    },
    "Cooling": lambda: {
        "type": "Air Cooler",
        "fan_count": "",
        "tdp_rating": "",
        "noise_level": "",
        "socket_support": "",
        "airflow": "",
    },
    "Monitor": lambda: {
        "size": "",
        "resolution": "",
        "refresh_rate": "",
        "panel": "",
        "response_time": "",
        "brightness": "",
    },
    "Keyboard": lambda: {
        "layout": "",
        "switch_type": "",
        "connection": "",
        "backlight": "",
        "hot_swap": "",
    },
    "Mouse": lambda: {
        "dpi": "",
        "sensor": "",
        "connection": "",
        "weight": "",
        "buttons": "",
    },
    "Headset": lambda: {
        "driver_size": "",
        "connection": "",
        "mic": "",
        "surround": "",
        "impedance": "",
    },
    "Other": lambda: {
        "notes": "",
    },
}


@dataclass
class CrawlItem:
    sku_code: str
    name: str
    category: str
    brand: str
    matched: bool = False
    title: str = ""
    url: str = ""
    images: List[str] = field(default_factory=list)
    specs: Dict[str, Any] = field(default_factory=dict)
    normalized_specs: Dict[str, Any] = field(default_factory=dict)
    reason: str = ""


class SearchEngine:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        })

    def search(self, query: str, limit: int = 8) -> List[str]:
        urls: List[str] = []
        for q in [f'site:gearvn.com "{query}"', f'site:memoryzone.com.vn "{query}"', query]:
            try:
                urls.extend(self._duckduckgo(q, limit))
            except Exception:
                pass
            try:
                urls.extend(self._bing(q, limit))
            except Exception:
                pass
        out, seen = [], set()
        for u in urls:
            k = self._norm(u)
            if k not in seen:
                seen.add(k)
                out.append(u)
            if len(out) >= limit:
                break
        return out

    def _duckduckgo(self, query: str, limit: int) -> List[str]:
        html = self.session.get(f"https://duckduckgo.com/html/?q={quote_plus(query)}", timeout=20).text
        soup = BeautifulSoup(html, "html.parser")
        out = []
        for a in soup.select("a.result__a"):
            href = a.get("href") or ""
            if href:
                out.append(href)
            if len(out) >= limit:
                break
        return out

    def _bing(self, query: str, limit: int) -> List[str]:
        html = self.session.get(f"https://www.bing.com/search?q={quote_plus(query)}", timeout=20).text
        soup = BeautifulSoup(html, "html.parser")
        out = []
        for li in soup.select("li.b_algo"):
            a = li.select_one("h2 a")
            if a and a.get("href"):
                out.append(a.get("href"))
            if len(out) >= limit:
                break
        return out

    def _norm(self, url: str) -> str:
        p = urlparse(url)
        return f"{p.netloc}{p.path}".rstrip("/")


class Parser:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        })

    def parse(self, url: str) -> Optional[CrawlItem]:
        try:
            html = self.session.get(url, timeout=25).text
        except Exception as exc:
            return CrawlItem(sku_code="", name="", category="", brand="", matched=False, reason=f"fetch failed: {exc}")
        soup = BeautifulSoup(html, "html.parser")
        title = self._title(soup, url)
        images = self._images(soup, url)
        specs = self._specs(soup)
        brand = self._brand(title)
        category = self._category(url, title)
        return CrawlItem(sku_code="", name=title, category=category, brand=brand, matched=True, title=title, url=url, images=images, specs=specs)

    def _title(self, soup: BeautifulSoup, url: str) -> str:
        meta = soup.select_one("meta[property='og:title']")
        if meta and meta.get("content"):
            return meta.get("content").strip()
        h1 = soup.select_one("h1")
        if h1 and h1.get_text(strip=True):
            return h1.get_text(" ", strip=True)
        title = soup.select_one("title")
        if title and title.get_text(strip=True):
            return title.get_text(" ", strip=True)
        return url.rsplit("/", 1)[-1]

    def _images(self, soup: BeautifulSoup, base: str) -> List[str]:
        out: List[str] = []
        for img in soup.select("img[src], img[data-src], img[data-zoom-image]"):
            for attr in ["src", "data-src", "data-zoom-image"]:
                src = img.get(attr) or ""
                if not src:
                    continue
                if src.startswith("//"):
                    src = "https:" + src
                full = urljoin(base, src)
                if any(ext in full.lower() for ext in [".jpg", ".jpeg", ".png", ".webp"]):
                    if full not in out:
                        out.append(full)
        return out[:8]

    def _specs(self, soup: BeautifulSoup) -> Dict[str, Any]:
        specs: Dict[str, Any] = {}
        for row in soup.select("table tr"):
            cells = row.find_all(["th", "td"])
            if len(cells) >= 2:
                k = cells[0].get_text(" ", strip=True)
                v = cells[1].get_text(" ", strip=True)
                if k and v:
                    specs[k] = v
        return specs

    def _brand(self, title: str) -> str:
        brands = ["Intel", "AMD", "NVIDIA", "ASUS", "MSI", "Gigabyte", "Kingston", "Corsair", "Samsung", "WD", "Seagate", "Noctua", "NZXT", "G.Skill", "Razer", "Logitech", "DeepCool", "Adata", "Crucial", "Lexar", "Thermalright", "Montech", "Lian Li", "SteelSeries", "HyperX", "BenQ", "Dell", "LG", "AOC"]
        for b in brands:
            if b.lower() in title.lower():
                return b
        return ""

    def _category(self, url: str, title: str) -> str:
        hay = f"{url} {title}".lower()
        rules = [
            ("cpu", "CPU"), ("gpu", "GPU"), ("vga", "GPU"), ("ram", "RAM"), ("ssd", "Storage"), ("hdd", "Storage"),
            ("mainboard", "Mainboard"), ("motherboard", "Mainboard"), ("psu", "PSU"), ("nguon", "PSU"),
            ("case", "Case"), ("cool", "Cooling"), ("fan", "Cooling"), ("monitor", "Monitor"),
            ("man-hinh", "Monitor"), ("keyboard", "Keyboard"), ("mouse", "Mouse"), ("chuot", "Mouse"),
            ("headset", "Headset"), ("tai-nghe", "Headset"),
        ]
        for needle, cat in rules:
            if needle in hay:
                return cat
        return "Other"


class Normalizer:
    def normalize(self, item: CrawlItem) -> Dict[str, Any]:
        base = CATEGORY_SPEC_RULES.get(item.category, CATEGORY_SPEC_RULES["Other"])()
        specs = self._merge_specs(base, item.specs, item.category)
        return {
            "sku_code": item.sku_code,
            "name": item.name,
            "category": item.category,
            "brand": item.brand,
            "image_url": item.images[0] if item.images else "",
            "image_urls": item.images[:8],
            "specs": specs,
            "source_url": item.url,
        }

    def _merge_specs(self, base: Dict[str, Any], raw: Dict[str, Any], category: str) -> Dict[str, Any]:
        merged = dict(base)
        norm = {self._key(k): v for k, v in raw.items()}
        if category == "CPU":
            merged["socket"] = self._pick(norm, ["socket", "bo-mach"])
            merged["cores"] = self._pick(norm, ["cores", "core"])
            merged["threads"] = self._pick(norm, ["threads", "luong"])
            merged["base_clock"] = self._pick(norm, ["baseclock", "xungco ban", "base clock"])
            merged["boost_clock"] = self._pick(norm, ["boostclock", "xungtoc do toi da", "boost clock"])
            merged["l2_cache"] = self._pick(norm, ["l2cache"])
            merged["l3_cache"] = self._pick(norm, ["l3cache"])
            merged["tdp"] = self._pick(norm, ["tdp", "power"])
            merged["process"] = self._pick(norm, ["process", "node", "congnghe"])
        elif category == "GPU":
            merged["vram"] = self._pick(norm, ["vram", "memory", "bo nho"])
            merged["cuda_cores"] = self._pick(norm, ["cuda cores", "cuda_cores"])
            merged["stream_processors"] = self._pick(norm, ["stream processors", "stream_processors"])
            merged["boost_clock"] = self._pick(norm, ["boost clock", "boostclock"])
            merged["power"] = self._pick(norm, ["power", "tdp"])
            merged["architecture"] = self._pick(norm, ["architecture", "arch"])
            merged["memory_bus"] = self._pick(norm, ["memory bus", "memory_bus", "bus"])
            merged["recommended_psu"] = self._pick(norm, ["recommended psu", "psu"])
        elif category == "RAM":
            merged["bus"] = self._pick(norm, ["bus", "speed", "toc do bus"])
            merged["capacity"] = self._pick(norm, ["capacity", "dung luong"])
            merged["type"] = self._pick(norm, ["type", "loai", "ddr"])
            merged["latency"] = self._pick(norm, ["latency", "cl"])
            merged["voltage"] = self._pick(norm, ["voltage", "dien ap"])
            merged["rgb"] = self._pick(norm, ["rgb"])
            merged["xmp_expo"] = self._pick(norm, ["xmp", "expo"])
        elif category == "Storage":
            merged["capacity"] = self._pick(norm, ["capacity", "dung luong"])
            merged["type"] = self._pick(norm, ["type", "loai"])
            merged["read_speed"] = self._pick(norm, ["read speed", "read_speed"])
            merged["write_speed"] = self._pick(norm, ["write speed", "write_speed"])
            merged["interface"] = self._pick(norm, ["interface", "giao tiep"])
            merged["form_factor"] = self._pick(norm, ["form factor", "form_factor"])
            merged["endurance"] = self._pick(norm, ["endurance", "tbw"])
            merged["warranty"] = self._pick(norm, ["warranty", "bao hanh"])
        elif category == "Mainboard":
            merged["socket"] = self._pick(norm, ["socket", "bo-mach"])
            merged["chipset"] = self._pick(norm, ["chipset"])
            merged["form_factor"] = self._pick(norm, ["form factor", "form_factor"])
            merged["ram_slots"] = self._pick(norm, ["ram slots", "slots"])
            merged["max_ram"] = self._pick(norm, ["max ram", "memory capacity"])
            merged["memory_support"] = self._pick(norm, ["memory support", "supported memory"])
            merged["storage_slots"] = self._pick(norm, ["storage slots", "m.2", "sata"])
            merged["network"] = self._pick(norm, ["network", "lan", "wifi"])
        elif category == "PSU":
            merged["wattage"] = self._pick(norm, ["wattage", "power", "cong suat"])
            merged["efficiency"] = self._pick(norm, ["efficiency", "80+"])
            merged["modular"] = self._pick(norm, ["modular"])
            merged["fan_size"] = self._pick(norm, ["fan size", "fan_size"])
            merged["rail"] = self._pick(norm, ["rail"])
            merged["protections"] = self._pick(norm, ["protections", "ovp", "uvp", "ocp"])
        elif category == "Case":
            merged["type"] = self._pick(norm, ["type", "form factor"])
            merged["material"] = self._pick(norm, ["material"])
            merged["max_gpu_length"] = self._pick(norm, ["max gpu length", "gpu length"])
            merged["fans_included"] = self._pick(norm, ["fans included", "included fans"])
            merged["panel"] = self._pick(norm, ["panel", "glass"])
        elif category == "Cooling":
            merged["type"] = self._pick(norm, ["type", "aio", "air cooler"])
            merged["fan_count"] = self._pick(norm, ["fan count", "fans"])
            merged["tdp_rating"] = self._pick(norm, ["tdp rating", "tdp"])
            merged["noise_level"] = self._pick(norm, ["noise level", "dba"])
            merged["socket_support"] = self._pick(norm, ["socket support", "supported sockets"])
            merged["airflow"] = self._pick(norm, ["airflow", "cfm"])
        elif category == "Monitor":
            merged["size"] = self._pick(norm, ["size", "inch"])
            merged["resolution"] = self._pick(norm, ["resolution"])
            merged["refresh_rate"] = self._pick(norm, ["refresh rate", "hz"])
            merged["panel"] = self._pick(norm, ["panel", "ips", "va"])
            merged["response_time"] = self._pick(norm, ["response time", "ms"])
            merged["brightness"] = self._pick(norm, ["brightness", "nits"])
        elif category == "Keyboard":
            merged["layout"] = self._pick(norm, ["layout"])
            merged["switch_type"] = self._pick(norm, ["switch", "switch type"])
            merged["connection"] = self._pick(norm, ["connection", "wireless", "wired"])
            merged["backlight"] = self._pick(norm, ["backlight", "rgb"])
            merged["hot_swap"] = self._pick(norm, ["hot swap", "hotswap"])
        elif category == "Mouse":
            merged["dpi"] = self._pick(norm, ["dpi"])
            merged["sensor"] = self._pick(norm, ["sensor"])
            merged["connection"] = self._pick(norm, ["connection", "wireless", "wired"])
            merged["weight"] = self._pick(norm, ["weight", "grams"])
            merged["buttons"] = self._pick(norm, ["buttons"])
        elif category == "Headset":
            merged["driver_size"] = self._pick(norm, ["driver size", "driver"])
            merged["connection"] = self._pick(norm, ["connection", "wireless", "wired"])
            merged["mic"] = self._pick(norm, ["mic", "microphone"])
            merged["surround"] = self._pick(norm, ["surround"])
            merged["impedance"] = self._pick(norm, ["impedance", "ohm"])
        return merged

    def _key(self, k: str) -> str:
        return re.sub(r"[^a-z0-9]+", "", k.lower())

    def _pick(self, norm: Dict[str, Any], candidates: List[str]) -> Any:
        for c in candidates:
            ck = self._key(c)
            for k, v in norm.items():
                if ck in k:
                    return v
        return ""


def score(query: str, item: CrawlItem) -> int:
    q = re.sub(r"[^a-z0-9]+", "", query.lower())
    t = re.sub(r"[^a-z0-9]+", "", item.title.lower())
    s = 0
    if q and q in t:
        s += 50
    for tok in [x for x in re.split(r"[^a-z0-9]+", query.lower()) if len(x) > 2]:
        if tok in item.title.lower():
            s += 10
    if item.brand and item.brand.lower() in query.lower():
        s += 10
    return s


def main():
    searcher = SearchEngine()
    parser = Parser()
    normalizer = Normalizer()

    started = time.perf_counter()
    results: List[Dict[str, Any]] = []

    for idx, sku in enumerate(POPULAR_SKUS, start=1):
        query = sku["name"]
        print(f"\n[{idx}/{len(POPULAR_SKUS)}] {sku['sku_code']} | {query}")
        item = None
        try:
            urls = searcher.search(query, limit=8)
            print(f"[search] candidates={len(urls)}")
            best_score = -1
            best_item = None
            for url in urls:
                print(f"[parse] {url}")
                parsed = parser.parse(url)
                if not parsed or not parsed.matched:
                    continue
                sc = score(query, parsed)
                if sc > best_score:
                    best_score = sc
                    best_item = parsed
                if sc >= 60:
                    best_item = parsed
                    break
            item = best_item
        except Exception as exc:
            results.append({"sku_code": sku["sku_code"], "name": query, "status": "error", "reason": str(exc)})
            print(f"[error] {exc}")
            continue

        if not item:
            results.append({"sku_code": sku["sku_code"], "name": query, "status": "no_match", "reason": "no match"})
            print("[result] no match")
            continue

        normalized = normalizer.normalize(item)
        normalized["sku_code"] = sku["sku_code"]
        normalized["name"] = sku["name"]
        normalized["category"] = sku["category"]
        normalized["brand"] = sku["brand"]

        # save image URLs only in report; download disabled by default on Kaggle speed.
        normalized["image_urls"] = normalized.get("image_urls", [])[:8]
        results.append({
            "sku_code": sku["sku_code"],
            "name": sku["name"],
            "category": sku["category"],
            "status": "ok",
            "title": item.title,
            "url": item.url,
            "images": len(item.images),
            "specs": normalized["specs"],
            "normalized_specs": normalized["specs"],
        })
        print(f"[result] ok | images={len(item.images)} | specs={len(item.specs)}")

    payload = {
        "summary": {
            "total": len(results),
            "ok": sum(1 for r in results if r["status"] == "ok"),
            "failed": sum(1 for r in results if r["status"] != "ok"),
            "elapsed_seconds": round(time.perf_counter() - started, 1),
        },
        "results": results,
    }

    REPORT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nSaved report to {REPORT_PATH.resolve()}")


if __name__ == "__main__":
    main()

