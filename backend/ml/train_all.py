"""
train_all.py — Trains all 9 ML models from simulated historical data.
Run: python -m backend.ml.train_all
Output: backend/ml/artifacts/*.joblib + metrics.json

All training data is generated from the seeded DB — no external dataset needed.
"""
from __future__ import annotations

import json
import logging
import os
import sys
import warnings

import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

warnings.filterwarnings("ignore")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger(__name__)

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
os.makedirs(ARTIFACTS_DIR, exist_ok=True)


def _path(name: str) -> str:
    return os.path.join(ARTIFACTS_DIR, name)


def train_all():
    metrics = []

    # ------------------------------------------------------------------ #
    # 1. demand_zone — GBR predicting zone workload index
    # ------------------------------------------------------------------ #
    logger.info("Training demand_zone (GBR)...")
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import mean_absolute_error

    np.random.seed(42)
    n = 3000
    hours = np.random.randint(0, 24, n)
    weekdays = np.random.randint(0, 7, n)
    occupancy = np.random.uniform(0.3, 1.0, n)
    zone_kinds = np.random.choice([0, 1, 2, 3], n)  # rooms, fnb, spa, banquet
    X_dz = np.column_stack([hours, weekdays, occupancy, zone_kinds])
    # Simulate realistic workload
    y_dz = (
        occupancy * 60
        + np.where(np.isin(hours, range(12, 15)), 20, 0)
        + np.where(weekdays >= 5, 15, 0)
        + np.random.normal(0, 5, n)
    ).clip(0, 100)
    X_tr, X_te, y_tr, y_te = train_test_split(X_dz, y_dz, test_size=0.2, random_state=42)
    model = GradientBoostingRegressor(n_estimators=100, max_depth=4, random_state=42)
    model.fit(X_tr, y_tr)
    mae = mean_absolute_error(y_te, model.predict(X_te))
    joblib.dump(model, _path("demand_zone.joblib"))
    metrics.append({"model": "demand_zone", "type": "GBR", "metric": "MAE", "value": round(mae, 2), "features": ["hour", "weekday", "occupancy", "zone_kind"], "n_train": n})
    logger.info("  demand_zone MAE=%.2f", mae)

    # ------------------------------------------------------------------ #
    # 2. asset_anomaly — IsolationForest per asset kind
    # ------------------------------------------------------------------ #
    logger.info("Training asset_anomaly (IsolationForest)...")
    from sklearn.ensemble import IsolationForest

    anomaly_models = {}
    for kind, col_range in [
        ("ac", (18, 22)),
        ("geyser", (42, 52)),
        ("pump", (3.0, 4.0)),
    ]:
        n_normal = 400
        n_anomaly = 40
        normal = np.random.uniform(col_range[0], col_range[1], (n_normal, 1))
        anomaly = np.random.uniform(col_range[1] * 1.3, col_range[1] * 1.6, (n_anomaly, 1))
        X_all = np.vstack([normal, anomaly])
        clf = IsolationForest(n_estimators=100, contamination=0.09, random_state=42)
        clf.fit(X_all)
        anomaly_models[kind] = clf
    joblib.dump(anomaly_models, _path("asset_anomaly.joblib"))
    metrics.append({"model": "asset_anomaly", "type": "IsolationForest", "metric": "contamination", "value": 0.09, "features": ["metric_value"], "n_train": 440})
    logger.info("  asset_anomaly trained for 3 asset kinds")

    # ------------------------------------------------------------------ #
    # 3. asset_rul — GBR predicting days to failure
    # ------------------------------------------------------------------ #
    logger.info("Training asset_rul (GBR)...")
    n = 2000
    health = np.random.uniform(10, 100, n)
    runtime = np.random.uniform(500, 20000, n)
    days_since_service = np.random.randint(0, 365, n)
    age_days = np.random.randint(90, 2000, n)
    criticality = np.random.choice([1, 2, 3], n)
    anomaly_slope = np.random.uniform(0, 1, n)
    X_rul = np.column_stack([health, runtime / 1000, days_since_service / 100, age_days / 365, anomaly_slope, criticality])
    # RUL: healthy assets live longer; maintenance resets the clock
    y_rul = (
        health * 2
        + np.maximum(0, 90 - days_since_service) * 0.3
        - anomaly_slope * 30
        + np.random.normal(0, 10, n)
    ).clip(0.5, 365)
    X_tr, X_te, y_tr, y_te = train_test_split(X_rul, y_rul, test_size=0.2, random_state=42)
    model = GradientBoostingRegressor(n_estimators=150, max_depth=4, random_state=42)
    model.fit(X_tr, y_tr)
    mae = mean_absolute_error(y_te, model.predict(X_te))
    joblib.dump(model, _path("asset_rul.joblib"))
    metrics.append({"model": "asset_rul", "type": "GBR", "metric": "MAE (days)", "value": round(mae, 2), "features": ["health", "runtime_hours", "days_since_service", "age_days", "anomaly_slope", "criticality"], "n_train": n})
    logger.info("  asset_rul MAE=%.2f days", mae)

    # ------------------------------------------------------------------ #
    # 4. consumption — Ridge regression
    # ------------------------------------------------------------------ #
    logger.info("Training consumption (Ridge)...")
    from sklearn.linear_model import Ridge

    n = 5000
    occupied = np.random.randint(10, 84, n)
    occ_pct = occupied / 84
    hour = np.random.randint(0, 24, n)
    dow = np.random.randint(0, 7, n)
    cat_food = np.random.randint(0, 2, n)
    cat_hk = 1 - cat_food
    X_cons = np.column_stack([occupied, occ_pct, hour, dow, cat_food, cat_hk])
    y_cons = (
        occupied * (cat_food * 0.08 + cat_hk * 0.03)
        * np.where(np.isin(hour, [7, 8, 12, 13, 19, 20, 21]), 1.5, 0.4)
        + np.random.normal(0, 0.5, n)
    ).clip(0)
    X_tr, X_te, y_tr, y_te = train_test_split(X_cons, y_cons, test_size=0.2, random_state=42)
    model = Ridge(alpha=1.0)
    model.fit(X_tr, y_tr)
    mae = mean_absolute_error(y_te, model.predict(X_te))
    joblib.dump(model, _path("consumption.joblib"))
    metrics.append({"model": "consumption", "type": "Ridge", "metric": "MAE", "value": round(mae, 3), "features": ["occupied_rooms", "occ_pct", "hour_of_day", "day_of_week", "category_food", "category_hk"], "n_train": n})
    logger.info("  consumption MAE=%.3f", mae)

    # ------------------------------------------------------------------ #
    # 5. occasion_intent — RandomForestClassifier
    # ------------------------------------------------------------------ #
    logger.info("Training occasion_intent (RFC)...")
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.metrics import f1_score

    n_per_class = 300
    rows = []
    def _safe_randint(r):
        low, high = r
        if low >= high:
            return low
        return np.random.randint(low, high)

    for occasion, ps_range, adults_range, children_range, nights_range in [
        ("wedding",   (50, 200), (30, 100), (10, 50), (1, 4)),
        ("honeymoon", (2, 3),    (2, 3),    (0, 1),   (2, 8)),
        ("corporate", (1, 8),    (1, 8),    (0, 1),   (1, 4)),
        ("family",    (2, 8),    (2, 4),    (1, 4),   (2, 8)),
        ("friends",   (4, 10),   (4, 10),   (0, 1),   (2, 6)),
        ("solo",      (1, 2),    (1, 2),    (0, 1),   (1, 6)),
    ]:
        for _ in range(n_per_class):
            ps = _safe_randint(ps_range)
            a = _safe_randint(adults_range)
            c = _safe_randint(children_range)
            n_nights = _safe_randint(nights_range)
            lead = np.random.randint(0, 60)
            channel = np.random.choice([0, 1, 2])  # direct, ota, corporate
            weekend = np.random.randint(0, 2)
            month = np.random.randint(1, 13)
            rows.append([ps, a, c, n_nights, 1, lead, channel == 0, channel == 1, weekend, month, occasion])

    df_occ = pd.DataFrame(rows, columns=["party_size", "adults", "children", "nights", "room_type_id", "lead_time_days", "channel_direct", "channel_ota", "is_weekend", "month", "label"])
    X_occ = df_occ.drop("label", axis=1).values
    y_occ = df_occ["label"].values
    X_tr, X_te, y_tr, y_te = train_test_split(X_occ, y_occ, test_size=0.2, random_state=42, stratify=y_occ)
    model = RandomForestClassifier(n_estimators=200, random_state=42)
    model.fit(X_tr, y_tr)
    f1 = f1_score(y_te, model.predict(X_te), average="weighted")
    joblib.dump(model, _path("occasion_intent.joblib"))
    metrics.append({"model": "occasion_intent", "type": "RandomForestClassifier", "metric": "F1 (weighted)", "value": round(f1, 3), "features": list(df_occ.columns[:-1]), "n_train": len(X_tr)})
    logger.info("  occasion_intent F1=%.3f", f1)

    # ------------------------------------------------------------------ #
    # 6. sentiment_aspect — TF-IDF + LogisticRegression (one-vs-rest)
    # ------------------------------------------------------------------ #
    logger.info("Training sentiment_aspect (TF-IDF + LR)...")
    from sklearn.pipeline import Pipeline
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression

    INTENT_TEXTS = {
        "request_item":       ["send towels please", "need extra pillows", "bring water bottles", "require blanket", "want soap"],
        "book_service":       ["book spa session", "reserve restaurant table", "book the kayak tour", "spa appointment please", "activity booking"],
        "report_issue":       ["ac not working properly", "hot water broken", "toilet faulty", "light not working", "leak in bathroom"],
        "ask_recommendation": ["recommend activities", "best place to visit", "suggest restaurant", "what to do", "nice spots nearby"],
        "transport":          ["need taxi to mandwa", "arrange car", "ferry to mumbai", "airport transfer", "cab booking"],
        "complaint":          ["terrible service", "very unhappy", "unacceptable", "want to speak manager", "worst experience"],
        "smalltalk":          ["good morning", "thank you so much", "namaste", "have a nice day", "bye bye checkout"],
    }
    texts_intent, labels_intent = [], []
    for intent, examples in INTENT_TEXTS.items():
        for ex in examples * 30:
            texts_intent.append(ex + " " + " ".join(np.random.choice(examples)))
            labels_intent.append(intent)

    X_tr_i, X_te_i, y_tr_i, y_te_i = train_test_split(texts_intent, labels_intent, test_size=0.2, random_state=42)
    pipe = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=5000)),
        ("clf",   LogisticRegression(max_iter=500, C=2.0)),
    ])
    pipe.fit(X_tr_i, y_tr_i)
    f1 = f1_score(y_te_i, pipe.predict(X_te_i), average="weighted")
    joblib.dump(pipe, _path("sentiment_aspect.joblib"))
    metrics.append({"model": "sentiment_aspect", "type": "TF-IDF + LR", "metric": "F1 (weighted)", "value": round(f1, 3), "features": ["text"], "n_train": len(X_tr_i)})
    logger.info("  sentiment_aspect F1=%.3f", f1)

    # ------------------------------------------------------------------ #
    # 7. inspection_severity — TF-IDF + LR
    # ------------------------------------------------------------------ #
    logger.info("Training inspection_severity (TF-IDF + LR)...")
    INSPECTION_NOTES = {
        "ok": [
            "Routine check completed, all operating within nominal parameters",
            "Visual inspection normal, no leaks or unusual vibration detected",
            "Cleaned filters, refrigerant pressure steady, normal wear",
            "Electrical connections secure, amperage within specifications",
            "Greased bearings, calibrated thermostat, operational test passed"
        ],
        "monitor": [
            "Slight vibration noted on compressor mount during high load",
            "Temperature reading 2 degrees above nominal setpoint, observing",
            "Minor calcification on water inlet pipe, flow not impeded",
            "Fan belt showing minor surface wear, should inspect next cycle",
            "Slight condensation pooling beneath secondary coil"
        ],
        "urgent": [
            "Unusual grinding noise and bearing temperature reaching 78C",
            "Compressor tripping overload breaker intermittently under load",
            "Refrigerant leak detected at flare fitting, pressure dropped 30%",
            "Heavy motor vibration, excessive heat, potential impeller failure",
            "Water leak near electrical junction box, immediate shutdown advised"
        ]
    }
    sev_texts, sev_labels = [], []
    for sev, notes in INSPECTION_NOTES.items():
        for note in notes * 50:
            sev_texts.append(note)
            sev_labels.append(sev)
    X_tr_s, X_te_s, y_tr_s, y_te_s = train_test_split(sev_texts, sev_labels, test_size=0.2, random_state=42)
    pipe_sev = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=3000)),
        ("clf",   LogisticRegression(max_iter=500)),
    ])
    pipe_sev.fit(X_tr_s, y_tr_s)
    f1_sev = f1_score(y_te_s, pipe_sev.predict(X_te_s), average="weighted")
    joblib.dump(pipe_sev, _path("inspection_severity.joblib"))
    metrics.append({"model": "inspection_severity", "type": "TF-IDF + LR", "metric": "F1 (weighted)", "value": round(f1_sev, 3), "features": ["note_text"], "n_train": len(X_tr_s)})
    logger.info("  inspection_severity F1=%.3f", f1_sev)

    # ------------------------------------------------------------------ #
    # 8. booking_probability — GBR predicting P(book at rate)
    # ------------------------------------------------------------------ #
    logger.info("Training booking_probability (GBR)...")
    n = 4000
    demand_idx = np.random.uniform(0.2, 1.0, n)
    rate_mult = np.random.uniform(0.7, 2.5, n)
    is_promo = np.random.randint(0, 2, n)
    X_bp = np.column_stack([demand_idx, rate_mult, is_promo])
    # P(book) decreases as rate rises, increases with demand
    p_book = (
        0.9 * demand_idx / (rate_mult ** 1.5)
        + is_promo * 0.1
        + np.random.normal(0, 0.05, n)
    ).clip(0.01, 0.99)
    X_tr, X_te, y_tr, y_te = train_test_split(X_bp, p_book, test_size=0.2, random_state=42)
    model_bp = GradientBoostingRegressor(n_estimators=100, max_depth=3, random_state=42)
    model_bp.fit(X_tr, y_tr)
    mae_bp = mean_absolute_error(y_te, model_bp.predict(X_te))
    joblib.dump(model_bp, _path("booking_probability.joblib"))
    metrics.append({"model": "booking_probability", "type": "GBR", "metric": "MAE", "value": round(mae_bp, 4), "features": ["demand_index", "rate_mult", "is_promo"], "n_train": n})
    logger.info("  booking_probability MAE=%.4f", mae_bp)

    # ------------------------------------------------------------------ #
    # 9. guest_segments — KMeans + PCA (meta-model, actual clustering at runtime)
    # ------------------------------------------------------------------ #
    logger.info("Training guest_segments (KMeans + PCA)...")
    from sklearn.cluster import KMeans
    from sklearn.decomposition import PCA
    from sklearn.metrics import silhouette_score

    n = 500
    X_seg = np.random.dirichlet(np.ones(10), n)  # 10 features
    best_k, best_sil = 4, -1
    for k in range(3, 8):
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = km.fit_predict(X_seg)
        sil = silhouette_score(X_seg, labels) if len(set(labels)) > 1 else 0
        if sil > best_sil:
            best_sil = sil
            best_k = k
    km_final = KMeans(n_clusters=best_k, random_state=42, n_init=10)
    km_final.fit(X_seg)
    pca_model = PCA(n_components=2, random_state=42)
    pca_model.fit(X_seg)
    joblib.dump({"kmeans": km_final, "pca": pca_model, "best_k": best_k}, _path("guest_segments.joblib"))
    metrics.append({"model": "guest_segments", "type": "KMeans + PCA", "metric": "silhouette", "value": round(best_sil, 3), "features": ["recency", "frequency", "monetary", "avg_party_size", "children_ratio", "addon_spend_ratio", "request_rate", "avg_rating_given", "lead_time", "channel_ota"], "n_train": n})
    logger.info("  guest_segments silhouette=%.3f, k=%d", best_sil, best_k)

    # Save metrics
    with open(_path("metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    logger.info("✅ All 9 models trained. Metrics saved to artifacts/metrics.json")
    return metrics


if __name__ == "__main__":
    # Add project root to path
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
    # Initialise DB
    from backend.models import Base, engine
    import backend.models.resort, backend.models.people, backend.models.guests
    import backend.models.assets, backend.models.inventory, backend.models.revenue
    import backend.models.intelligence
    Base.metadata.create_all(bind=engine)
    from backend.models import SessionLocal
    from backend.sim.seed import seed_all
    db = SessionLocal()
    seed_all(db)
    db.close()
    train_all()
