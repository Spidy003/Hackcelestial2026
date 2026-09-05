"""
Seed script — builds the entire Meridian Bay Resort from scratch.
Run once on startup if the DB is empty.

Produces:
  - 84 rooms across 5 types and 8 zones
  - 42 staff with realistic Maharashtrian names
  - 120 assets (3 on a degradation curve)
  - 90 inventory SKUs with Recipe BOMs
  - 40 menu items
  - 6 service types with slot grids
  - 300 historical guests with stay histories
  - 180 days of consumption logs (so ML models have training data)
"""
from __future__ import annotations

import json
import logging
import random
from datetime import datetime, timedelta
from typing import List

from sqlalchemy.orm import Session

from backend.models import SessionLocal
from backend.models.resort import Zone, RoomType, Room
from backend.models.people import Staff, Task
from backend.models.guests import Guest, Booking
from backend.models.assets import Asset, Telemetry, Inspection
from backend.models.inventory import InventoryItem, Batch, ConsumptionLog, MenuItem, Recipe, PurchaseOrder
from backend.models.revenue import ServiceSlot, RateCalendar, Offer
from backend.models.intelligence import Feedback, Segment, Event, Alert

logger = logging.getLogger(__name__)

# Seed for reproducibility
random.seed(42)

# ------------------------------------------------------------------ #
# Names
# ------------------------------------------------------------------ #
MAHARASHTRIAN_FIRST = [
    "Aditya","Akshay","Amol","Anand","Anil","Aniket","Anita","Anjali",
    "Arjun","Ashok","Bharat","Chetan","Deepa","Devi","Dinesh","Ganesh",
    "Girish","Harish","Hemant","Jyoti","Kiran","Komal","Lata","Mahesh",
    "Mangesh","Meena","Milind","Nandini","Nilesh","Poonam","Prachi",
    "Prakash","Prashant","Priya","Rahul","Rajesh","Ram","Rekha","Rohit",
    "Sachin","Sandeep","Sandesh","Sanjay","Savita","Seema","Shailesh",
    "Shyam","Smita","Sneha","Suhas","Sujata","Suresh","Swati","Uma",
    "Vaishali","Vijay","Vikas","Vinod","Yogesh","Yash",
]
MAHARASHTRIAN_LAST = [
    "Bhosale","Chavan","Dalvi","Desai","Gaikwad","Jadhav","Joshi",
    "Kamble","Khandagale","Kulkarni","More","Naik","Patil","Pawar",
    "Shinde","Thakur","Thorat","Wagh","Yadav","Salvi","Surve",
]

def random_name() -> str:
    return f"{random.choice(MAHARASHTRIAN_FIRST)} {random.choice(MAHARASHTRIAN_LAST)}"


# ------------------------------------------------------------------ #
# Zone definitions
# ------------------------------------------------------------------ #
ZONE_DEFS = [
    {"name": "Block A – Garden Wing",    "kind": "rooms",      "floor": 1, "capacity": 30, "staff_required_baseline": 4},
    {"name": "Block B – Sea View Wing",  "kind": "rooms",      "floor": 2, "capacity": 28, "staff_required_baseline": 4},
    {"name": "Block C – Suite Tower",    "kind": "rooms",      "floor": 3, "capacity": 22, "staff_required_baseline": 3},
    {"name": "Sagar Restaurant",         "kind": "fnb",        "floor": 1, "capacity": 80, "staff_required_baseline": 6},
    {"name": "Ananda Spa",              "kind": "spa",        "floor": 1, "capacity": 12, "staff_required_baseline": 3},
    {"name": "Mahal Banquet Hall",       "kind": "banquet",    "floor": 1, "capacity": 200,"staff_required_baseline": 8},
    {"name": "Front Desk & Lobby",       "kind": "frontdesk",  "floor": 1, "capacity": 5,  "staff_required_baseline": 2},
    {"name": "Kitchen & Grounds",        "kind": "kitchen",    "floor": 1, "capacity": 20, "staff_required_baseline": 5},
]

# ------------------------------------------------------------------ #
# Room types
# ------------------------------------------------------------------ #
ROOM_TYPE_DEFS = [
    {"name": "Garden View",   "base_rate": 6500,  "max_occupancy": 2, "count": 30,
     "amenities": ["AC","TV","WiFi","Minibar"]},
    {"name": "Sea View",      "base_rate": 9500,  "max_occupancy": 2, "count": 28,
     "amenities": ["AC","TV","WiFi","Minibar","Balcony","Sea View"]},
    {"name": "Suite",         "base_rate": 15000, "max_occupancy": 3, "count": 14,
     "amenities": ["AC","TV","WiFi","Minibar","Balcony","Jacuzzi","Living Room"]},
    {"name": "Villa",         "base_rate": 25000, "max_occupancy": 4, "count": 8,
     "amenities": ["AC","TV","WiFi","Private Pool","Kitchen","Butler"]},
    {"name": "Presidential",  "base_rate": 45000, "max_occupancy": 4, "count": 4,
     "amenities": ["AC","TV","WiFi","Private Pool","Kitchen","Butler","Rooftop Deck"]},
]

# ------------------------------------------------------------------ #
# Staff roles
# ------------------------------------------------------------------ #
STAFF_ROLES = {
    "housekeeping": {"count": 12, "skills": ["room_cleaning","linen","inspection"], "shift_options": [(7,15),(15,23)]},
    "fnb":          {"count": 8,  "skills": ["service","bartending","hosting"],     "shift_options": [(7,15),(12,20),(18,2)]},
    "maintenance":  {"count": 6,  "skills": ["electrical","plumbing","AC","hvac"],  "shift_options": [(8,16),(16,0)]},
    "frontdesk":    {"count": 4,  "skills": ["checkin","concierge","billing"],      "shift_options": [(7,15),(15,23)]},
    "spa":          {"count": 4,  "skills": ["massage","yoga","beauty"],            "shift_options": [(9,17),(13,21)]},
    "security":     {"count": 4,  "skills": ["patrol","access_control"],           "shift_options": [(7,15),(15,23),(23,7)]},
    "chef":         {"count": 4,  "skills": ["cooking","baking","pastry"],          "shift_options": [(6,14),(14,22)]},
}

# ------------------------------------------------------------------ #
# Inventory SKUs
# ------------------------------------------------------------------ #
FOOD_SKUS = [
    ("FOOD001","Basmati Rice","kg",45,2,30,"Sahyadri Foods"),
    ("FOOD002","Paneer","kg",180,1,7,"LocalDairy Alibaug"),
    ("FOOD003","Chicken","kg",220,1,3,"Coastal Meats"),
    ("FOOD004","Fish (Pomfret)","kg",350,1,2,"Alibaug Fish Market"),
    ("FOOD005","Tomatoes","kg",35,1,5,"Farm Fresh"),
    ("FOOD006","Onions","kg",28,1,14,"Farm Fresh"),
    ("FOOD007","Potatoes","kg",22,1,14,"Farm Fresh"),
    ("FOOD008","Coconut Milk","L",95,2,30,"Konkan Foods"),
    ("FOOD009","Ghee","kg",580,3,90,"Amul"),
    ("FOOD010","Maida (Flour)","kg",42,3,60,"Modern Flour Mills"),
    ("FOOD011","Sugar","kg",48,3,90,"Renuka Sugars"),
    ("FOOD012","Salt","kg",18,7,180,"Tata Salt"),
    ("FOOD013","Turmeric","kg",280,7,180,"Spice Garden"),
    ("FOOD014","Red Chilli Powder","kg",320,7,180,"Spice Garden"),
    ("FOOD015","Coriander Powder","kg",240,7,180,"Spice Garden"),
    ("FOOD016","Garam Masala","kg",480,7,90,"Everest Spices"),
    ("FOOD017","Cream","L",140,1,5,"LocalDairy Alibaug"),
    ("FOOD018","Milk","L",55,1,3,"LocalDairy Alibaug"),
    ("FOOD019","Eggs","dozen",85,1,14,"Poultry Farm"),
    ("FOOD020","Butter","kg",380,2,21,"Amul"),
    ("FOOD021","Marigold Flowers","bunch",120,1,3,"Flower Market"),
    ("FOOD022","Cashews","kg",850,3,90,"Konkan Cashews"),
    ("FOOD023","Raisins","kg",320,3,90,"Nafees"),
    ("FOOD024","Yogurt","kg",60,1,5,"LocalDairy Alibaug"),
    ("FOOD025","Lemon","dozen",45,1,7,"Farm Fresh"),
    ("FOOD026","Ginger","kg",120,2,14,"Farm Fresh"),
    ("FOOD027","Garlic","kg",150,2,21,"Farm Fresh"),
    ("FOOD028","Green Chilli","kg",80,1,7,"Farm Fresh"),
    ("FOOD029","Capsicum","kg",65,1,7,"Farm Fresh"),
    ("FOOD030","Mushroom","kg",180,1,5,"Agro Farms"),
    ("FOOD031","Spinach","kg",45,1,3,"Farm Fresh"),
    ("FOOD032","Cauliflower","kg",40,1,5,"Farm Fresh"),
    ("FOOD033","Bread (Loaf)","loaf",55,1,3,"Modern Bakery"),
    ("FOOD034","Beer (Kingfisher)","can",95,3,90,"United Breweries"),
    ("FOOD035","Wine (Red)","bottle",1200,7,365,"Sula Vineyards"),
    ("FOOD036","Wine (White)","bottle",950,7,365,"Sula Vineyards"),
    ("FOOD037","Whisky","bottle",1800,7,365,"Diageo"),
    ("FOOD038","Soda Water","bottle",25,3,180,"Bisleri"),
    ("FOOD039","Mango Pulp","can",85,3,180,"Maaza"),
    ("FOOD040","Coffee Beans","kg",650,7,90,"Coorg Coffee"),
    ("FOOD041","Tea Leaves","kg",420,7,90,"Tata Tea"),
    ("FOOD042","Vanilla Ice Cream","L",220,2,30,"Amul"),
    ("FOOD043","Gulab Jamun Mix","kg",180,7,90,"Gits"),
    ("FOOD044","Pav Bhaji Masala","kg",380,7,90,"Everest"),
    ("FOOD045","Noodles","kg",65,7,90,"Maggi"),
]

HK_SKUS = [
    ("HK001","Bath Towels","unit",180,7,365,"Trident Linen"),
    ("HK002","Hand Towels","unit",85,7,365,"Trident Linen"),
    ("HK003","Bed Sheets (Single)","unit",320,7,365,"Trident Linen"),
    ("HK004","Bed Sheets (Double)","unit",480,7,365,"Trident Linen"),
    ("HK005","Pillow Covers","unit",120,7,365,"Trident Linen"),
    ("HK006","Shampoo (50ml)","unit",28,14,365,"Himalaya"),
    ("HK007","Conditioner (50ml)","unit",28,14,365,"Himalaya"),
    ("HK008","Soap Bar","unit",22,14,365,"Dove"),
    ("HK009","Body Lotion (30ml)","unit",35,14,365,"Himalaya"),
    ("HK010","Toothbrush","unit",18,14,365,"Colgate"),
    ("HK011","Toothpaste (5g)","unit",12,14,365,"Colgate"),
    ("HK012","Shower Cap","unit",8,14,365,"Generic"),
    ("HK013","Toilet Paper Roll","roll",22,7,365,"Tissue World"),
    ("HK014","Tissues (Box)","box",65,7,365,"Kleenex"),
    ("HK015","Room Freshener","can",180,14,365,"Febreze"),
    ("HK016","Laundry Bags","unit",12,14,365,"Generic"),
    ("HK017","Sewing Kit","unit",45,30,365,"Generic"),
    ("HK018","Shoehorn","unit",85,90,365,"Generic"),
    ("HK019","Coffee Sachets","unit",18,14,365,"Nescafe"),
    ("HK020","Tea Bags","unit",12,14,365,"Tata Tea"),
    ("HK021","Sugar Sachets","unit",3,14,365,"Tata Sugar"),
    ("HK022","Creamer","unit",5,14,365,"Coffee-mate"),
    ("HK023","Minibar Water (1L)","bottle",25,3,365,"Bisleri"),
    ("HK024","Minibar Juice","bottle",45,3,30,"Tropicana"),
    ("HK025","Minibar Snacks","unit",55,7,90,"Various"),
]

MAINT_SKUS = [
    ("MNT001","AC Filter (Split)","unit",850,7,365,"Blue Star"),
    ("MNT002","Geyser Element","unit",1200,7,365,"Racold"),
    ("MNT003","PVC Pipe (3m)","unit",280,3,365,"Supreme"),
    ("MNT004","Electrical Wire (10m)","roll",420,3,365,"Havells"),
    ("MNT005","MCB Switch","unit",320,3,365,"Havells"),
    ("MNT006","Pool Chlorine Tablets","kg",480,7,180,"Mahavir Chemicals"),
    ("MNT007","Pump Seal","unit",650,7,365,"Kirloskar"),
    ("MNT008","Lubricant (WD-40)","can",320,7,365,"WD-40"),
    ("MNT009","Light Bulb (LED 9W)","unit",120,7,365,"Syska"),
    ("MNT010","Drain Cleaner","L",180,14,365,"Drano"),
    ("MNT011","Silicone Sealant","tube",280,14,365,"Fevicol"),
    ("MNT012","Screws & Bolts (Box)","box",220,7,365,"Generic"),
]

SPA_SKUS = [
    ("SPA001","Massage Oil (Jojoba)","L",1200,7,365,"Forest Essentials"),
    ("SPA002","Aromatherapy Oil Set","unit",2800,7,365,"Forest Essentials"),
    ("SPA003","Hot Stone Set","unit",4500,90,365,"Spa Supplies India"),
    ("SPA004","Face Pack (Clay)","kg",680,14,90,"Biotique"),
    ("SPA005","Aloe Vera Gel","L",380,14,90,"Patanjali"),
    ("SPA006","Rose Water","L",280,14,90,"Kama Ayurveda"),
    ("SPA007","Body Scrub","kg",920,14,90,"Forest Essentials"),
    ("SPA008","Eye Patches (Pair)","unit",35,14,365,"Generic"),
]

# ------------------------------------------------------------------ #
# Menu items (40 items)
# ------------------------------------------------------------------ #
MENU_DEFS = [
    # Breakfast
    ("Idli Sambar",       True,  180, "breakfast", 1.2),
    ("Poha",              True,  150, "breakfast", 1.1),
    ("Masala Omelette",   False, 220, "breakfast", 1.0),
    ("Continental Platter",False,350, "breakfast", 0.9),
    ("Pancakes",          True,  280, "breakfast", 0.8),
    ("Fresh Fruit Bowl",  True,  200, "breakfast", 0.7),
    # Lunch / Dinner
    ("Veg Thali",         True,  480, "main",      1.4),
    ("Fish Curry Rice",   False, 580, "main",      1.3),
    ("Chicken Tikka Masala",False,620,"main",      1.2),
    ("Paneer Butter Masala",True, 520,"main",      1.3),
    ("Dal Makhani",       True,  380, "main",      1.1),
    ("Malvani Chicken",   False, 650, "main",      1.0),
    ("Prawn Koliwada",    False, 780, "main",      0.9),
    ("Vegetable Biryani", True,  450, "main",      1.2),
    ("Chicken Biryani",   False, 550, "main",      1.4),
    ("Mutton Rogan Josh", False, 720, "main",      0.8),
    ("Palak Paneer",      True,  420, "main",      1.1),
    ("Aloo Gobhi",        True,  350, "main",      0.9),
    ("Naan",              True,  60,  "breads",    1.5),
    ("Paratha",           True,  80,  "breads",    1.2),
    ("Steamed Rice",      True,  80,  "main",      1.6),
    # Snacks
    ("Vada Pav",          True,  80,  "snacks",    1.3),
    ("Samosa",            True,  60,  "snacks",    1.1),
    ("Bhel Puri",         True,  120, "snacks",    1.0),
    ("French Fries",      True,  180, "snacks",    1.2),
    ("Nachos",            True,  220, "snacks",    0.9),
    # Desserts
    ("Gulab Jamun",       True,  150, "dessert",   1.1),
    ("Kulfi",             True,  180, "dessert",   1.0),
    ("Chocolate Brownie", True,  220, "dessert",   0.9),
    ("Seasonal Fruit Platter",True,200,"dessert",  0.8),
    # Beverages
    ("Fresh Lime Soda",   True,  100, "beverages", 1.5),
    ("Mango Lassi",       True,  140, "beverages", 1.3),
    ("Masala Chai",       True,  80,  "beverages", 1.8),
    ("Filter Coffee",     True,  90,  "beverages", 1.4),
    ("Cold Coffee",       True,  160, "beverages", 1.2),
    # Bar
    ("Kingfisher Beer",   False, 280, "bar",       1.0),
    ("Whisky Sour",       False, 450, "bar",       0.9),
    ("Coconut Cocktail",  False, 380, "bar",       1.1),
    ("Virgin Mojito",     True,  220, "bar",       1.2),
    ("Red Wine (Glass)",  False, 650, "bar",       0.8),
]


# ------------------------------------------------------------------ #
# Asset kinds and their per-zone distribution
# ------------------------------------------------------------------ #
ASSET_KINDS_BY_ZONE = {
    "rooms":      [("ac", 1), ("geyser", 1)],
    "fnb":        [("kitchen_equip", 3)],
    "spa":        [("ac", 1), ("geyser", 1)],
    "banquet":    [("ac", 4)],
    "frontdesk":  [],
    "kitchen":    [("kitchen_equip", 4), ("pump", 1)],
    "grounds":    [("pump", 2), ("genset", 1), ("pool_filter", 1)],
}


def seed_all(db: Session) -> None:
    """Idempotent: checks if zones already exist."""
    if db.query(Zone).first():
        logger.info("DB already seeded — skipping.")
        return

    logger.info("Seeding Meridian Bay Resort...")
    rng = random.Random(42)  # deterministic

    # 1. Zones
    zones = []
    for zd in ZONE_DEFS:
        z = Zone(**zd)
        db.add(z)
        zones.append(z)
    db.flush()

    zone_by_kind = {z.kind: z for z in zones}
    zone_by_name = {z.name: z for z in zones}

    # 2. Room types
    rtypes = []
    for rtd in ROOM_TYPE_DEFS:
        rt = RoomType(
            name=rtd["name"],
            base_rate=rtd["base_rate"],
            max_occupancy=rtd["max_occupancy"],
            count=rtd["count"],
            amenities=json.dumps(rtd["amenities"]),
        )
        db.add(rt)
        rtypes.append(rt)
    db.flush()

    # 3. Rooms — distribute across zones and types
    rooms = []
    room_num = 101
    zone_room_map = {
        "Block A – Garden Wing":   (rtypes[0], 30),   # Garden View
        "Block B – Sea View Wing": (rtypes[1], 28),   # Sea View
        "Block C – Suite Tower":   (rtypes[2], 14),   # Suite (14 of 22)
    }
    # Block C also has Villas and Presidential
    zone_c = [z for z in zones if "Suite Tower" in z.name][0]
    zone_a = [z for z in zones if "Garden Wing" in z.name][0]
    zone_b = [z for z in zones if "Sea View Wing" in z.name][0]

    for zone, rtype, count in [
        (zone_a, rtypes[0], 30),
        (zone_b, rtypes[1], 28),
        (zone_c, rtypes[2], 14),
        (zone_c, rtypes[3], 8),
        (zone_c, rtypes[4], 4),
    ]:
        for i in range(count):
            r = Room(
                number=str(room_num),
                floor=zone.floor,
                zone_id=zone.id,
                type_id=rtype.id,
                status=rng.choice(["vacant_clean"] * 4 + ["occupied"] * 5 + ["vacant_dirty"]),
                view="sea" if rtype.name in ("Sea View","Suite","Villa","Presidential") else "garden",
                last_cleaned_at=datetime.utcnow() - timedelta(hours=rng.randint(0, 8)),
            )
            db.add(r)
            rooms.append(r)
            room_num += 1
    db.flush()

    # 4. Staff
    staff_list = []
    staff_id_counter = 0
    for role, cfg in STAFF_ROLES.items():
        room_zones = [z for z in zones if z.kind == "rooms"]
        fnb_zones = [z for z in zones if z.kind in ("fnb", "bar", "kitchen")] or [zone_by_kind.get("fnb", zones[0])]
        for i in range(cfg["count"]):
            # Distribute staff evenly across relevant sectors
            if role == "housekeeping":
                home_zone = room_zones[i % len(room_zones)] if room_zones else zones[0]
            elif role in ("fnb", "chef"):
                dining_zone = zone_by_name.get("Mandwa Coastal Dining", zones[5])
                lounge_zone = zone_by_name.get("Sunset Beach Lounge", zones[6])
                home_zone = dining_zone if i % 2 == 0 else lounge_zone
            elif role == "maintenance":
                home_zone = zones[i % len(zones)]
            elif role == "spa":
                home_zone = zone_by_kind.get("spa", zones[0])
            elif role == "frontdesk":
                home_zone = zone_by_kind.get("frontdesk", zones[0])
            elif role == "security":
                home_zone = zones[(i * 2) % len(zones)]
            else:
                home_zone = zones[i % len(zones)]
            shift = rng.choice(cfg["shift_options"])
            s = Staff(
                name=random_name(),
                role=role,
                skills=json.dumps(rng.sample(cfg["skills"], k=rng.randint(1, len(cfg["skills"])))),
                languages=json.dumps(rng.sample(["en","hi","mr"], k=rng.randint(1,3))),
                home_zone_id=home_zone.id,
                current_zone_id=home_zone.id,
                shift_start=shift[0],
                shift_end=shift[1],
                hours_this_week=rng.uniform(20, 40),
                days_worked_streak=rng.randint(0, 6),
                status=rng.choice(["idle", "idle", "idle", "busy", "break"]),
                avg_task_minutes=rng.uniform(12, 35),
                quality_rating=rng.uniform(3.5, 5.0),
            )
            db.add(s)
            staff_list.append(s)
    db.flush()

    # 5. Assets (120 total) — 3 pre-seeded on degradation curve
    assets = []
    degrading_asset_ids = set()
    asset_room_map = {}  # asset_id -> room

    # Per-room AC and geyser
    for room in rooms[:84]:
        zone_id = room.zone_id
        for kind in ["ac", "geyser"]:
            install_date = datetime(2020, 1, 1) + timedelta(days=rng.randint(0, 365*3))
            last_service = install_date + timedelta(days=rng.randint(30, 300))
            a = Asset(
                name=f"{kind.upper()} Room {room.number}",
                kind=kind,
                zone_id=zone_id,
                room_id=room.id,
                install_date=install_date,
                last_service_date=last_service,
                service_interval_days=90,
                runtime_hours=rng.uniform(1000, 8000),
                criticality=2,
                replacement_cost=35000 if kind == "ac" else 12000,
                health_score=rng.uniform(65, 100),
                predicted_days_to_failure=rng.uniform(60, 365),
            )
            db.add(a)
            assets.append(a)

        if len(assets) > 110:
            break  # cap at ~110 room assets

    # Zone-level assets
    for zone in zones:
        for kind, count in ASSET_KINDS_BY_ZONE.get(zone.kind, []):
            for i in range(count):
                a = Asset(
                    name=f"{kind.replace('_',' ').title()} {zone.name} #{i+1}",
                    kind=kind,
                    zone_id=zone.id,
                    room_id=None,
                    install_date=datetime(2019, 6, 1) + timedelta(days=rng.randint(0,365)),
                    last_service_date=datetime(2025, 1, 1) + timedelta(days=rng.randint(0,200)),
                    service_interval_days=60 if kind in ("pump","genset") else 120,
                    runtime_hours=rng.uniform(2000, 15000),
                    criticality=3 if kind in ("genset","pump","elevator") else 2,
                    replacement_cost=rng.randint(50000, 300000),
                    health_score=rng.uniform(55, 95),
                )
                db.add(a)
                assets.append(a)

    db.flush()

    # Mark 3 assets as degrading for demo
    # Pick Block C AC, a geyser, and the main pump
    block_c_acs = [a for a in assets if a.kind == "ac" and a.zone_id == zone_c.id]
    geysers = [a for a in assets if a.kind == "geyser"]
    pumps = [a for a in assets if a.kind == "pump"]
    demo_assets = []
    if block_c_acs:
        demo_assets.append(rng.choice(block_c_acs))
    if geysers:
        demo_assets.append(rng.choice(geysers))
    if pumps:
        demo_assets.append(pumps[0])

    for da in demo_assets:
        da.health_score = rng.uniform(28, 42)
        da.predicted_days_to_failure = rng.uniform(3, 8)
        da.last_service_date = datetime.utcnow() - timedelta(days=rng.randint(80, 120))
        db.add(da)

    db.flush()
    degrading_asset_ids = {a.id for a in demo_assets}

    # 6. Inventory items
    items = {}
    all_skus = (
        [(s + ("food",)) for s in FOOD_SKUS]
        + [(s + ("housekeeping",)) for s in HK_SKUS]
        + [(s + ("maintenance",)) for s in MAINT_SKUS]
        + [(s + ("spa",)) for s in SPA_SKUS]
    )
    for row in all_skus:
        sku, name, unit, unit_cost, lead_days, shelf_days, supplier, category = row
        on_hand = rng.uniform(20, 200)
        item = InventoryItem(
            sku=sku,
            name=name,
            unit=unit,
            unit_cost=unit_cost,
            lead_time_days=lead_days,
            shelf_life_days=shelf_days,
            supplier=supplier,
            category=category,
            on_hand=on_hand,
        )
        db.add(item)
        items[sku] = item
    db.flush()

    # Add batches for each item
    for sku, item in items.items():
        recv = datetime.utcnow() - timedelta(days=rng.randint(0, 10))
        expires = recv + timedelta(days=item.shelf_life_days)
        batch = Batch(item_id=item.id, qty=item.on_hand, received_at=recv, expires_at=expires)
        db.add(batch)
    db.flush()

    # 7. Menu items + Recipes
    menu_items = []
    for name, is_veg, price, station, pop_weight in MENU_DEFS:
        mi = MenuItem(name=name, is_veg=is_veg, price=price, station=station, popularity_weight=pop_weight)
        db.add(mi)
        menu_items.append(mi)
    db.flush()

    # Simple recipe BOM — link each menu item to 2-4 food SKUs
    food_items = [item for sku, item in items.items() if sku.startswith("FOOD")]
    for mi in menu_items:
        for fi in rng.sample(food_items, k=rng.randint(2, 4)):
            recipe = Recipe(menu_item_id=mi.id, item_id=fi.id, qty_per_cover=rng.uniform(0.01, 0.15))
            db.add(recipe)
    db.flush()

    # 8. Guests (300 historical + 84 in-house on day 1)
    guests = []
    for i in range(300):
        tier = rng.choices(["none","silver","gold","platinum"], weights=[0.6,0.2,0.15,0.05])[0]
        lang = rng.choices(["en","hi","mr"], weights=[0.5,0.3,0.2])[0]
        g = Guest(
            name=random_name(),
            phone=f"+91{rng.randint(7000000000,9999999999)}",
            language=lang,
            loyalty_tier=tier,
            stays_count=rng.randint(0,15),
            lifetime_value=rng.uniform(0, 500000),
            avg_rating_given=rng.uniform(3.0, 5.0),
            preferences=json.dumps({
                "diet": rng.choice(["veg","nonveg","jain"]),
                "pillow": rng.choice(["soft","firm"]),
                "floor": rng.choice(["low","high","any"]),
                "wake_time": f"{rng.randint(6,9)}:00",
                "interests": rng.sample(["spa","pool","water_sports","yoga","sightseeing","food"], k=rng.randint(1,3)),
            }),
            gers_score=rng.uniform(0, 30),
        )
        db.add(g)
        guests.append(g)
    db.flush()

    # Pre-seed one guest who will hit GERS>70 quickly
    at_risk_guest = guests[0]
    at_risk_guest.gers_score = 65.0
    at_risk_guest.gers_drivers = json.dumps([
        "2 open maintenance tickets",
        "AC reported not cooling",
        "No concierge contact in 3 hours",
    ])
    db.add(at_risk_guest)

    # 9. Bookings — active in-house bookings for occupied rooms
    occupied_rooms = [r for r in rooms if r.status == "occupied"]
    checkin_base = datetime.utcnow().replace(hour=14, minute=0, second=0, microsecond=0)
    for i, room in enumerate(occupied_rooms[:min(50, len(occupied_rooms))]):
        g = guests[i % len(guests)]
        nights = rng.randint(1, 5)
        ci = checkin_base - timedelta(days=rng.randint(0, nights))
        co = ci + timedelta(days=nights)
        booking = Booking(
            guest_id=g.id,
            room_id=room.id,
            channel=rng.choice(["direct","ota","corporate"]),
            checkin_date=ci,
            checkout_date=co,
            nights=nights,
            adults=rng.randint(1,2),
            children=rng.randint(0,1),
            party_size=rng.randint(1,3),
            occasion=rng.choice(["none"]*6 + ["honeymoon","family","corporate","friends"]),
            veg_count=rng.randint(0,2),
            nonveg_count=rng.randint(0,2),
            rate_locked=room.room_type.base_rate * rng.uniform(0.9, 1.3),
            status="checked_in",
        )
        db.add(booking)
        room.current_booking_id = None  # will be set after flush
    db.flush()

    # 10. Service slots — generate next 7 days
    service_kinds = [
        ("spa",      "Swedish Massage",     1, 3500),
        ("spa",      "Deep Tissue",         1, 4500),
        ("activity", "Sunset Boat Tour",    8, 2500),
        ("activity", "Kayaking Session",    6, 1800),
        ("cabana",   "Pool Cabana Day Use", 4, 1500),
        ("restaurant","Chef's Table",       6, 5000),
    ]
    slot_hours = [9, 11, 14, 16, 18]
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    for day_offset in range(8):
        d = today + timedelta(days=day_offset)
        for kind, name, cap, base_price in service_kinds:
            for hour in slot_hours:
                start = d.replace(hour=hour)
                if start < datetime.utcnow():
                    continue
                booked = rng.randint(0, cap)
                slot = ServiceSlot(
                    kind=kind, name=name, capacity=cap,
                    start_ts=start,
                    booked=booked,
                    base_price=base_price,
                    current_price=base_price,
                    fill_pct=(booked / cap * 100),
                    minutes_to_expiry=(start - datetime.utcnow()).total_seconds() / 60,
                )
                db.add(slot)

    # 11. Rate calendar — next 30 days
    for room_type in rtypes:
        for day_offset in range(30):
            d = today + timedelta(days=day_offset)
            is_weekend = d.weekday() >= 4  # Fri/Sat/Sun
            demand_mult = rng.uniform(1.1, 1.35) if is_weekend else rng.uniform(0.9, 1.1)
            rc = RateCalendar(
                date=d,
                room_type_id=room_type.id,
                base_rate=room_type.base_rate,
                current_rate=room_type.base_rate * demand_mult,
                demand_index=rng.uniform(0.4, 0.85),
                reason="baseline_weekend" if is_weekend else "baseline",
            )
            db.add(rc)

    # 12. Historical consumption logs (180 sim-days) — critical for ML training
    food_item_list = list(items.values())
    history_start = today - timedelta(days=180)
    for day_offset in range(180):
        d = history_start + timedelta(days=day_offset)
        occ = rng.uniform(0.45, 0.95)
        rooms_occ = int(occ * 84)
        for item in food_item_list[:20]:  # top 20 food items
            for meal_hour in [8, 13, 20]:
                qty = rooms_occ * rng.uniform(0.01, 0.05) * rng.uniform(0.9, 1.1)
                if qty > 0.01:
                    log = ConsumptionLog(
                        item_id=item.id,
                        ts=d.replace(hour=meal_hour),
                        qty=round(qty, 3),
                        driver="covers",
                    )
                    db.add(log)
        # HK consumption
        for item in list(items.values())[45:55]:  # HK items
            qty = rooms_occ * rng.uniform(0.002, 0.008)
            log = ConsumptionLog(
                item_id=item.id,
                ts=d.replace(hour=11),
                qty=round(qty, 3),
                driver="room_nights",
            )
            db.add(log)

    # 13. Historical feedback
    for i in range(400):
        g = rng.choice(guests)
        is_positive = rng.random() < 0.72
        from backend.sim.generators import FEEDBACK_POSITIVE, FEEDBACK_NEGATIVE
        text = rng.choice(FEEDBACK_POSITIVE if is_positive else FEEDBACK_NEGATIVE)
        rating = rng.uniform(4.0, 5.0) if is_positive else rng.uniform(1.5, 3.5)
        fb = Feedback(
            guest_id=g.id,
            ts=today - timedelta(days=rng.randint(0, 180)),
            source=rng.choice(["app", "review", "survey"]),
            rating=round(rating, 1),
            text=text,
            sentiment="positive" if is_positive else "negative",
            aspects=json.dumps([]),
        )
        db.add(fb)

    # 14. Historical telemetry for ML training (key assets, 30 days)
    for asset in demo_assets:
        t = today - timedelta(days=30)
        health_start = 80.0
        while t <= today:
            health_now = health_start - (30 - (today - t).days) * 1.5
            health_now = max(10, health_now)
            if asset.kind == "ac":
                temp = 19 + (100 - health_now) * 0.08 + rng.gauss(0, 0.5)
                power = 1.2 + (100 - health_now) * 0.008 + rng.gauss(0, 0.05)
                db.add(Telemetry(asset_id=asset.id, ts=t, metric="cooling_temp", value=round(temp,2)))
                db.add(Telemetry(asset_id=asset.id, ts=t, metric="power_draw_kw", value=round(power,3)))
            elif asset.kind == "geyser":
                outlet = 48 - (100 - health_now) * 0.3 + rng.gauss(0, 1.0)
                db.add(Telemetry(asset_id=asset.id, ts=t, metric="outlet_temp_c", value=round(outlet,2)))
            t += timedelta(hours=4)

    db.commit()
    logger.info("✅ Seed complete: 84 rooms, 42 staff, %d assets, 90 SKUs, 300 guests", len(assets))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    from backend.models import Base, engine
    # Import all models so tables are created
    import backend.models.resort
    import backend.models.people
    import backend.models.guests
    import backend.models.assets
    import backend.models.inventory
    import backend.models.revenue
    import backend.models.intelligence
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_all(db)
    finally:
        db.close()
