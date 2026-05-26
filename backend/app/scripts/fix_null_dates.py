# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
"""Fix documents with created_at/updated_at = None in inventory collection."""
import asyncio, sys
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT))

from app.database import connect_db, close_db, get_db

async def main():
    await connect_db()
    db = get_db()
    now = datetime.now(timezone.utc)
    
    # Fix documents where created_at is None
    r1 = await db.inventory.update_many(
        {"created_at": None},
        {"$set": {"created_at": now}}
    )
    print(f"Fixed created_at=None: {r1.modified_count} documents")
    
    # Fix documents where updated_at is None
    r2 = await db.inventory.update_many(
        {"updated_at": None},
        {"$set": {"updated_at": now}}
    )
    print(f"Fixed updated_at=None: {r2.modified_count} documents")
    
    await close_db()

if __name__ == "__main__":
    asyncio.run(main())
