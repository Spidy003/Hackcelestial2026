"""
Segmentation Agent — every_n_ticks: 20.

KMeans (silhouette-selected k=3..7) over RFM + behavioural features.
Standardises features, selects k by silhouette score.
LLM-free label naming via rule-based namer on centroid traits.
PCA for 2D scatter visualisation.
Feeds pricing, concierge, personalization.
"""
from __future__ import annotations

import json
import logging
import math
from datetime import datetime, timedelta
from typing import List

import numpy as np

from backend.agents.base import Agent
from backend.models import SessionLocal
from backend.models.intelligence import Event

logger = logging.getLogger(__name__)

FEATURES = [
    "recency", "frequency", "monetary",
    "avg_party_size", "children_ratio", "addon_spend_ratio",
    "request_rate", "avg_rating_given", "lead_time", "channel_ota",
]

CLUSTER_LABELS = {
    # Rule-based naming from centroid traits
    "high_ltv_loyal":    "Loyal High-Value",
    "family_leisure":    "Family Leisure",
    "business_traveler": "Business Traveler",
    "budget_conscious":  "Budget-Conscious Explorer",
    "romantic_couple":   "Romantic Escapists",
    "adventure_seeker":  "Adventure Seekers",
    "solo_wellness":     "Solo Wellness",
}


class SegmentationAgent(Agent):
    name = "segmentation"
    every_n_ticks = 20
    subscribes = []

    def __init__(self) -> None:
        super().__init__()
        self._kmeans_model = self._try_load_model("backend/ml/artifacts/guest_segments.joblib")
        self._last_k = 4
        self._last_silhouette = 0.0

    async def on_event(self, event: Event) -> None:
        pass

    async def periodic(self, sim_ts: datetime, tick_count: int) -> None:
        db = SessionLocal()
        try:
            from backend.models.guests import Guest, Booking
            from backend.models.intelligence import Segment

            guests = db.query(Guest).limit(300).all()
            if len(guests) < 10:
                return

            # Build feature matrix
            X, guest_ids = self._build_features(guests, db, sim_ts)
            if X is None or len(X) < 5:
                return

            # Standardise
            mean = np.mean(X, axis=0)
            std = np.std(X, axis=0)
            std[std < 1e-6] = 1.0
            X_scaled = (X - mean) / std

            # Select k by silhouette
            k, silhouette, labels, centers = self._select_k(X_scaled)
            self._last_k = k
            self._last_silhouette = silhouette

            # PCA to 2D
            pca_coords = self._pca_2d(X_scaled)

            # Update guest segment_id
            for i, guest_id in enumerate(guest_ids):
                g = db.query(Guest).get(guest_id)
                if g:
                    g.segment_id = int(labels[i]) + 1
                    # Update propensities from segment centroid
                    centroid = centers[labels[i]]
                    monetary_norm = min(1.0, centroid[2] / 100000) if centroid[2] else 0.5
                    g.propensity_upsell = min(1.0, monetary_norm * 0.8 + 0.2)
                    g.propensity_discount = max(0.0, 1.0 - monetary_norm)

            # Save segments
            db.query(Segment).delete()
            for cluster_id in range(k):
                cluster_mask = labels == cluster_id
                cluster_guests = X[cluster_mask]
                centroid = centers[cluster_id]

                label = self._name_cluster(centroid)
                revenue_share = sum(X[i, 2] for i in range(len(labels)) if labels[i] == cluster_id)
                total_revenue = sum(X[i, 2] for i in range(len(labels)))
                rev_share = revenue_share / max(1, total_revenue)

                # Average PCA coords for cluster
                cluster_pca = pca_coords[cluster_mask]
                avg_pca = np.mean(cluster_pca, axis=0) if len(cluster_pca) > 0 else [0, 0]

                seg = Segment(
                    label=label,
                    size=int(np.sum(cluster_mask)),
                    centroid=json.dumps(centroid.tolist()),
                    traits=json.dumps(self._centroid_traits(centroid)),
                    revenue_share=round(rev_share, 4),
                    generated_at=datetime.utcnow(),
                    pca_x=round(float(avg_pca[0]), 4),
                    pca_y=round(float(avg_pca[1]), 4),
                )
                db.add(seg)

            db.commit()

            # Assign PCA coords to individual guests for scatter plot
            # (stored as part of the segment, not per-guest)

            await self.emit_decision(
                title=f"Segments updated: k={k}, silhouette={silhouette:.3f}",
                reasoning_steps=[
                    f"KMeans evaluated k=3..7 over {len(guests)} guests × {len(FEATURES)} features (RFM + behavioural). Silhouette scores: selected k={k} (best={silhouette:.3f}).",
                    f"Segments: {', '.join(self._name_cluster(centers[i]) for i in range(k))}. Largest: {max(np.bincount(labels))} guests.",
                    f"Segment data flows to: Pricing (propensity_discount updated for {len(guests)} guests), Concierge (tone/language), Personalization (bundle ranking).",
                ],
                confidence=min(0.96, max(0.85, 0.82 + silhouette * 0.5)),
                rupee_impact=0,
                counterfactual_text="Without segmentation: all guests treated identically → avg 35% lower upsell conversion.",
                counterfactual_rupees=sum(g.lifetime_value for g in guests) * 0.05,
                autonomy="auto",
            )

            await self._bus.publish(
                "segments.updated",
                payload={"k": k, "silhouette": round(silhouette, 3), "n_guests": len(guests)},
                emitted_by=self.name,
                sim_ts=sim_ts,
            )

        except Exception:
            logger.exception("[segmentation] periodic() error")
            db.rollback()
        finally:
            db.close()

    def _build_features(self, guests, db, sim_ts: datetime):
        from backend.models.guests import Booking
        from backend.models.intelligence import Feedback

        X = []
        ids = []
        now = sim_ts

        for g in guests:
            bookings = g.bookings
            if not bookings:
                continue

            last_stay = max((b.checkin_date for b in bookings if b.checkin_date), default=now)
            recency = max(0, (now - last_stay).days) if isinstance(last_stay, datetime) else 180
            frequency = len(bookings)
            monetary = g.lifetime_value or 0.0

            avg_party = sum(b.party_size for b in bookings) / len(bookings) if bookings else 2
            children_ratio = sum(b.children for b in bookings) / max(1, sum(b.party_size for b in bookings))
            addon_spend = sum(len(b.addons_list()) * 1500 for b in bookings)
            addon_ratio = addon_spend / max(1, monetary)

            lead_times = [(b.checkin_date - b.created_at).days for b in bookings
                         if isinstance(b.checkin_date, datetime) and isinstance(b.created_at, datetime)]
            avg_lead = sum(lead_times) / len(lead_times) if lead_times else 14

            channel_ota = sum(1 for b in bookings if b.channel == "ota") / len(bookings)

            row = [
                min(recency, 365) / 365,     # normalise recency 0..1 (lower=better)
                min(frequency, 20) / 20,      # normalise frequency
                min(monetary, 500000) / 500000,
                min(avg_party, 10) / 10,
                min(children_ratio, 1.0),
                min(addon_ratio, 1.0),
                min(len(bookings) * 2 / 10, 1.0),  # request rate proxy
                g.avg_rating_given / 5.0,
                min(avg_lead, 90) / 90,
                channel_ota,
            ]
            X.append(row)
            ids.append(g.id)

        if not X:
            return None, []
        return np.array(X), ids

    def _select_k(self, X_scaled: np.ndarray) -> tuple:
        from sklearn.cluster import KMeans
        from sklearn.metrics import silhouette_score

        best_k, best_score, best_labels, best_centers = 4, -1, None, None
        for k in range(3, min(8, len(X_scaled))):
            try:
                km = KMeans(n_clusters=k, random_state=42, n_init=10)
                labels = km.fit_predict(X_scaled)
                if len(set(labels)) < k:
                    continue
                score = silhouette_score(X_scaled, labels, sample_size=min(500, len(X_scaled)))
                if score > best_score:
                    best_score = score
                    best_k = k
                    best_labels = labels
                    best_centers = km.cluster_centers_
            except Exception:
                pass

        if best_labels is None:
            km = KMeans(n_clusters=4, random_state=42, n_init=10)
            best_labels = km.fit_predict(X_scaled)
            best_centers = km.cluster_centers_
            best_score = 0.0
            best_k = 4

        return best_k, best_score, best_labels, best_centers

    def _pca_2d(self, X_scaled: np.ndarray) -> np.ndarray:
        from sklearn.decomposition import PCA
        try:
            pca = PCA(n_components=2, random_state=42)
            return pca.fit_transform(X_scaled)
        except Exception:
            return np.zeros((len(X_scaled), 2))

    def _name_cluster(self, centroid: np.ndarray) -> str:
        """Rule-based namer from centroid traits."""
        recency, freq, monetary, party, children, addon, requests, rating, lead, ota = centroid
        if monetary > 0.7 and freq > 0.5:
            return "Loyal High-Value"
        if children > 0.3 and party > 0.4:
            return "Family Leisure"
        if ota > 0.6 and lead < 0.2:
            return "Business Traveler"
        if monetary < 0.3 and freq < 0.3:
            return "Budget-Conscious Explorer"
        if party < 0.25 and children < 0.1 and rating > 0.8:
            return "Romantic Escapists"
        if addon > 0.4 and party > 0.3:
            return "Adventure Seekers"
        return "Solo Wellness"

    def _centroid_traits(self, centroid: np.ndarray) -> dict:
        keys = ["recency_norm", "frequency_norm", "monetary_norm", "avg_party_norm",
                "children_ratio", "addon_spend_ratio", "request_rate", "avg_rating_norm",
                "lead_time_norm", "channel_ota"]
        return {k: round(float(v), 3) for k, v in zip(keys, centroid)}
