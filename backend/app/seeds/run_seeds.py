"""Seed roles + companies from JSON files.

Run with:
    cd backend && python -m app.seeds.run_seeds
"""
from __future__ import annotations

import asyncio
import logging

from app.core.database import AsyncSessionLocal
from app.services import intelligence_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
log = logging.getLogger("seeds")


async def main() -> None:
    async with AsyncSessionLocal() as db:
        counts = await intelligence_service.seed_roles_and_companies(db)
        log.info("Seed complete: %s", counts)


if __name__ == "__main__":
    asyncio.run(main())
