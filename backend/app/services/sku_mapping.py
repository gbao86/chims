# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
from __future__ import annotations

from dataclasses import dataclass
from typing import List


@dataclass(frozen=True)
class PopularSkuQuery:
    sku_code: str
    query: str
    category: str


POPULAR_QUERIES: List[PopularSkuQuery] = [
    PopularSkuQuery("CPU-001", "AMD Ryzen 5 5600X", "CPU"),
    PopularSkuQuery("CPU-002", "Intel Core i7-13700K", "CPU"),
    PopularSkuQuery("CPU-003", "AMD Ryzen 9 7950X", "CPU"),
    PopularSkuQuery("GPU-001", "NVIDIA RTX 4060 Ti", "GPU"),
    PopularSkuQuery("GPU-002", "AMD RX 7800 XT", "GPU"),
    PopularSkuQuery("GPU-003", "NVIDIA RTX 4090", "GPU"),
    PopularSkuQuery("RAM-001", "Kingston Fury Beast DDR4 16GB", "RAM"),
    PopularSkuQuery("RAM-002", "Corsair Vengeance DDR5 32GB", "RAM"),
    PopularSkuQuery("RAM-003", "G.Skill Trident Z5 RGB DDR5 32GB", "RAM"),
    PopularSkuQuery("SSD-001", "Samsung 980 PRO 1TB", "Storage"),
    PopularSkuQuery("SSD-002", "WD Black SN850X 2TB", "Storage"),
    PopularSkuQuery("HDD-001", "Seagate BarraCuda 2TB", "Storage"),
    PopularSkuQuery("MB-001", "ASUS ROG STRIX B550-F Gaming", "Mainboard"),
    PopularSkuQuery("MB-002", "MSI MAG Z790 TOMAHAWK WiFi", "Mainboard"),
    PopularSkuQuery("PSU-001", "Corsair RM850x 850W", "PSU"),
    PopularSkuQuery("PSU-002", "Seasonic Focus GX-1000 1000W", "PSU"),
    PopularSkuQuery("CASE-001", "NZXT H510 Flow", "Case"),
    PopularSkuQuery("FAN-001", "Noctua NH-D15", "Cooling"),
]


def generate_popular_queries(limit: int = 200) -> List[PopularSkuQuery]:
    """Generate a wider crawl set from known popular models.

    The first entries are the concrete seed SKUs; the rest expand into common
    product families so the crawler can search across the internet without being
    locked to just two sites.
    """
    base = list(POPULAR_QUERIES)
    if len(base) >= limit:
        return base[:limit]

    templates = [
        ("CPU", [
            "Intel Core i5-12400F",
            "Intel Core i5-13400F",
            "Intel Core i7-14700K",
            "AMD Ryzen 5 7500F",
            "AMD Ryzen 7 7800X3D",
            "AMD Ryzen 7 7700X",
            "AMD Ryzen 9 7900X",
        ]),
        ("GPU", [
            "NVIDIA RTX 3050",
            "NVIDIA RTX 3060",
            "NVIDIA RTX 4060",
            "NVIDIA RTX 4070",
            "NVIDIA RTX 4070 Ti SUPER",
            "AMD RX 7600",
            "AMD RX 7700 XT",
            "AMD RX 7900 XTX",
        ]),
        ("RAM", [
            "Kingston Fury Beast DDR4 8GB",
            "Kingston Fury Beast DDR4 16GB",
            "Corsair Vengeance DDR4 16GB",
            "Corsair Vengeance DDR5 32GB",
            "G.Skill Trident Z5 RGB DDR5 32GB",
            "TeamGroup T-Force Delta RGB DDR5 32GB",
        ]),
        ("Storage", [
            "Samsung 970 EVO Plus 1TB",
            "Samsung 990 PRO 1TB",
            "WD Blue SN580 1TB",
            "WD Black SN850X 1TB",
            "Crucial P3 Plus 1TB",
            "Lexar NM790 2TB",
            "Seagate Barracuda 4TB",
        ]),
        ("Mainboard", [
            "ASUS TUF GAMING B650-PLUS WIFI",
            "MSI B550M PRO-VDH WIFI",
            "MSI MAG B650 TOMAHAWK WIFI",
            "Gigabyte B760M DS3H DDR4",
            "Gigabyte Z790 AORUS ELITE AX",
        ]),
        ("PSU", [
            "Corsair RM750e 750W",
            "Corsair RM1000e 1000W",
            "Seasonic Focus GX-850 850W",
            "Cooler Master MWE Gold 650W",
            "Antec NeoECO Gold 750W",
        ]),
        ("Case", [
            "NZXT H5 Flow",
            "NZXT H7 Flow",
            "Lian Li LANCOOL 216",
            "Cooler Master TD500 Mesh V2",
            "Thermaltake S200 TG ARGB",
        ]),
        ("Cooling", [
            "DeepCool AK400",
            "DeepCool AK620",
            "Noctua NH-U12A",
            "Thermalright Peerless Assassin 120",
            "Corsair iCUE H100i",
        ]),
        ("Monitor", [
            "LG 24GN60R 24 inch 144Hz",
            "LG 27GN800-B 27 inch 144Hz",
            "Dell G2724D 27 inch 165Hz",
            "Samsung Odyssey G5 27 inch",
            "ASUS TUF Gaming VG249Q3A",
        ]),
        ("Keyboard", [
            "Keychron K2",
            "Keychron K8",
            "Akko 5075B Plus",
            "Logitech G Pro X Keyboard",
            "Razer BlackWidow V4",
        ]),
        ("Mouse", [
            "Logitech G102 Lightsync",
            "Logitech G304 Lightspeed",
            "Razer DeathAdder V3",
            "Razer Viper Mini",
            "Lamzu Atlantis Mini",
        ]),
        ("Headset", [
            "HyperX Cloud Stinger 2",
            "SteelSeries Arctis Nova 1",
            "Razer BlackShark V2 X",
            "Logitech G335",
            "Corsair HS55 Stereo",
        ]),
    ]

    idx = 1
    for category, models in templates:
        for model in models:
            base.append(PopularSkuQuery(f"AUTO-{idx:03d}", model, category))
            idx += 1
            if len(base) >= limit:
                return base[:limit]
    return base[:limit]

