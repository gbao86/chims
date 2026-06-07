# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
"""Create or update a demo user with username 'demo' and password 'demo123' without modifying other data."""
import asyncio
import sys
from pathlib import Path
from datetime import datetime, timezone
from passlib.context import CryptContext

ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT))

from app.database import connect_db, close_db, get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def main():
    print("⏳ Connecting to database...")
    await connect_db()
    db = get_db()
    
    username = "demo"
    password = "demo123"
    role = "admin"
    full_name = "Tài khoản Demo (Chỉ xem)"
    
    # Hash password
    password_hash = pwd_context.hash(password)
    now = datetime.now(timezone.utc)
    
    # Check if user already exists
    existing_user = await db.users.find_one({"username": username})
    
    if existing_user:
        print(f"🔄 User '{username}' already exists. Updating credentials and role...")
        result = await db.users.update_one(
            {"_id": existing_user["_id"]},
            {
                "$set": {
                    "password_hash": password_hash,
                    "full_name": full_name,
                    "role": role,
                    "is_active": True,
                    "updated_at": now
                }
            }
        )
        print(f"✅ User '{username}' updated successfully.")
    else:
        print(f"➕ Creating new user '{username}'...")
        user_doc = {
            "username": username,
            "password_hash": password_hash,
            "full_name": full_name,
            "role": role,
            "email": "demo@chims.io",
            "phone": "0987654321",
            "is_active": True,
            "created_at": now,
            "updated_at": now
        }
        result = await db.users.insert_one(user_doc)
        print(f"✅ User '{username}' created successfully with ID: {result.inserted_id}")
        
    print("\n──────────────────────────────────")
    print("Demo user details:")
    print(f"  Username: {username}")
    print(f"  Password: {password}")
    print(f"  Role:     {role} (Read-only on Backend)")
    print("──────────────────────────────────\n")
    
    await close_db()

if __name__ == "__main__":
    asyncio.run(main())
