"""Integration test for Module 1 — Role & Company Intelligence Engine.

Exercises:
  - register + login
  - GET /intelligence/roles (20 roles)
  - GET /intelligence/companies (12 companies)
  - GET /intelligence/companies/{slug}/pattern (full pattern)
  - POST /intelligence/skill-gap (30-day plan)
  - error: unknown role
  - auth gate: 401 without token
"""
from __future__ import annotations

import time

import httpx
import pytest


@pytest.mark.asyncio
async def test_intelligence_endpoints(base_url: str):
    async with httpx.AsyncClient(base_url=base_url, timeout=30) as c:
        # 1. register + login
        email = f"intel_it_{int(time.time())}@test.com"
        r = await c.post(
            "/api/v1/auth/register",
            json={"email": email, "password": "Test123!x", "full_name": "Intel IT"},
        )
        assert r.status_code == 201, r.text
        r = await c.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "Test123!x"},
        )
        assert r.status_code == 200, r.text
        token = r.json()["data"]["access_token"]
        h = {"Authorization": f"Bearer {token}"}

        # 2. list roles — expect >= 20
        r = await c.get("/api/v1/intelligence/roles", headers=h)
        assert r.status_code == 200, r.text
        roles = r.json()
        assert len(roles) >= 20, f"expected >=20 roles, got {len(roles)}"
        slugs = {r["slug"] for r in roles}
        assert "software-developer-sde" in slugs
        assert "data-scientist" in slugs

        # 3. list companies — expect 12
        r = await c.get("/api/v1/intelligence/companies", headers=h)
        assert r.status_code == 200
        comps = r.json()
        assert len(comps) == 12
        assert {c["slug"] for c in comps} >= {"tcs", "google", "microsoft", "amazon"}

        # 4. full pattern for tcs
        r = await c.get("/api/v1/intelligence/companies/tcs/pattern", headers=h)
        assert r.status_code == 200
        tcs = r.json()
        assert tcs["name"] == "TCS"
        assert len(tcs["sections"]) >= 1
        assert tcs["distribution"]  # easy/medium/hard pct dict

        # 5. skill-gap -> study plan
        r = await c.post(
            "/api/v1/intelligence/skill-gap",
            headers=h,
            json={
                "role_slug": "software-developer-sde",
                "company_slug": "tcs",
                "ratings": {"DSA": "weak", "System Design": "weak"},
            },
        )
        assert r.status_code == 201, r.text
        plan = r.json()["plan"]
        assert len(plan["days"]) == 30
        assert plan["estimated_readiness_pct"] >= 0
        assert len(plan["weekly_milestones"]) == 4

        # 6. bad role -> 400
        r = await c.post(
            "/api/v1/intelligence/skill-gap",
            headers=h,
            json={"role_slug": "no-such-role"},
        )
        assert r.status_code == 400

        # 7. auth gate — no token -> 401
        r = await c.get("/api/v1/intelligence/roles")
        assert r.status_code == 401
