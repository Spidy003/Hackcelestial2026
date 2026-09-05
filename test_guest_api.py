import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def test_personalized_booking():
    payload = {
        "name": "Aarav & Simran Wedding",
        "phone": "+91 98200 99887",
        "language": "en",
        "checkin_date": "2026-11-20T14:00:00",
        "checkout_date": "2026-11-23T11:00:00",
        "party_size": 120,
        "adults": 100,
        "children": 20,
        "occasion": "wedding",
        "room_type_id": 1,
        "selected_bundle_id": "wedding_decor",
        "bundle_name": "Royal Mandwa Wedding Banquet & Mandap Package",
        "bundle_price": 120000.0,
        "food_plan": "maharashtrian_royal",
        "veg_count": 80,
        "nonveg_count": 30,
        "jain_count": 10,
        "special_notes": "Mandap near beachfront lawn + Shehnai music on arrival."
    }
    r = requests.post(f"{BASE_URL}/api/guests/create-personalized-booking", json=payload)
    print("Booking response:", r.status_code, r.json())
    assert r.status_code == 200
    assert r.json()["status"] == "confirmed"
    assert "Mahal Banquet Hall" in r.json()["venue_assigned"]
    print("[PASS] Personalized booking verified successfully!")
    return r.json()["guest_id"]

def test_raise_ticket(guest_id):
    payload = {
        "guest_id": guest_id,
        "guest_name": "Aarav & Simran",
        "room_number": "Presidential Suite 501",
        "ticket_type": "spa",
        "title": "Couple Ayurvedic Abhyanga Massage",
        "details": "Requested 2 therapist slots at 5:00 PM today.",
        "priority": 2
    }
    r = requests.post(f"{BASE_URL}/api/guests/raise-ticket", json=payload)
    print("Ticket response:", r.status_code, r.json())
    assert r.status_code == 200
    assert r.json()["status"] == "dispatched"
    print("[PASS] Guest ticket verified successfully!")

def test_feedback_escalation(guest_id):
    payload = {
        "guest_id": guest_id,
        "guest_name": "Aarav & Simran",
        "room_number": "Presidential Suite 501",
        "rating": 1.5,
        "category": "dining",
        "review_text": "Room service took 55 minutes and the food was cold.",
        "aspects": [{"aspect": "food_quality", "polarity": "negative"}]
    }
    r = requests.post(f"{BASE_URL}/api/guests/submit-feedback", json=payload)
    print("Feedback response:", r.status_code, r.json())
    assert r.status_code == 200
    assert r.json()["escalated_to_owner"] == True
    print("[PASS] Negative feedback escalated to owner verified successfully!")

def test_get_alerts():
    r = requests.get(f"{BASE_URL}/api/resort/alerts")
    if r.status_code == 404:
        r = requests.get(f"{BASE_URL}/api/alerts")
    print("Alerts response:", r.status_code, len(r.json()), "alerts found")
    assert r.status_code == 200
    print("[PASS] Get alerts verified successfully!")

if __name__ == "__main__":
    for attempt in range(10):
        try:
            r = requests.get(f"{BASE_URL}/health")
            if r.status_code == 200:
                print("Backend health OK!")
                break
        except Exception:
            time.sleep(1)
    
    gid = test_personalized_booking()
    test_raise_ticket(gid)
    test_feedback_escalation(gid)
    test_get_alerts()
    print(">>> ALL BACKEND APIS FUNCTIONING PROPERLY! <<<")
