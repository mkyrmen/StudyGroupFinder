import os
from sqlalchemy import create_engine, text

uri_encoded = "postgresql://postgres:%23http_Khraw@localhost:5432/studygroupfinder"

try:
    engine = create_engine(uri_encoded)
    with engine.connect() as conn:
        print("--- USERS ---")
        result = conn.execute(text("SELECT id, name, email FROM users ORDER BY id DESC LIMIT 5"))
        for row in result:
            print(f"ID: {row[0]}, Name: {row[1]}, Email: {row[2]}")
            
        print("\n--- GROUPS ---")
        result = conn.execute(text("SELECT id, name, subject, creator_id FROM groups ORDER BY id DESC LIMIT 5"))
        for row in result:
            print(f"ID: {row[0]}, Name: {row[1]}, Subject: {row[2]}, Creator ID: {row[3]}")
            
        print("\n--- GROUP MEMBERS ---")
        result = conn.execute(text("SELECT group_id, user_id FROM group_members ORDER BY id DESC LIMIT 5"))
        for row in result:
            print(f"Group ID: {row[0]}, User ID: {row[1]}")
except Exception as e:
    print(f"Verification failed: {e}")
