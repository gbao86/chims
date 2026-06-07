# Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
# This file is part of the chims project.
# Licensed under the GNU General Public License v3.0; see LICENSE for details.
"""Script to securely update passwords for admin, techguy, and salesperson by prompting the user in terminal."""
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
    print("🔑 CẬP NHẬT MẬT KHẨU TÀI KHOẢN HỆ THỐNG 🔑")
    print("------------------------------------------")
    print("Vui lòng nhập mật khẩu mới cho các tài khoản bên dưới.")
    print("Nếu để trống, tài khoản đó sẽ KHÔNG bị thay đổi mật khẩu.\n")
    
    admin_pass = input("1. Mật khẩu mới cho 'admin': ").strip()
    tech_pass = input("2. Mật khẩu mới cho 'techguy': ").strip()
    sales_pass = input("3. Mật khẩu mới cho 'salesperson': ").strip()
    
    any_update = admin_pass or tech_pass or sales_pass
    if not any_update:
        print("\n❌ Không có mật khẩu nào được nhập. Thoát chương trình.")
        return

    print("\n⏳ Đang kết nối tới cơ sở dữ liệu...")
    await connect_db()
    db = get_db()
    
    now = datetime.now(timezone.utc)
    
    updates = [
        ("admin", admin_pass),
        ("techguy", tech_pass),
        ("salesperson", sales_pass)
    ]
    
    for username, plain_password in updates:
        if not plain_password:
            continue
            
        user = await db.users.find_one({"username": username})
        if not user:
            print(f"❌ Không tìm thấy tài khoản '{username}' trong database.")
            continue
            
        # Hash and update
        password_hash = pwd_context.hash(plain_password)
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"password_hash": password_hash, "updated_at": now}}
        )
        print(f"✅ Đã cập nhật mật khẩu mới cho tài khoản '{username}' thành công.")
        
    print("\n🎉 Tất cả thao tác hoàn tất!")
    await close_db()

if __name__ == "__main__":
    asyncio.run(main())
