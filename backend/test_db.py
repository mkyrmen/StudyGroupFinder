import os
from sqlalchemy import create_url, create_engine, text

default_db = "postgresql://postgres:#http_Khraw@localhost:5432/studygroupfinder"
uri = os.environ.get("DATABASE_URL", default_db)

# Handle the encoded # manually if needed, but app.py has %23
# Wait, app.py has postgresql://postgres:%23http_Khraw@localhost:5432/studygroupfinder
# So URI is already encoded.

uri_encoded = "postgresql://postgres:%23http_Khraw@localhost:5432/studygroupfinder"

print(f"Testing connection to: {uri_encoded}")

try:
    engine = create_engine(uri_encoded)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print(f"Connection successful: {result.fetchone()}")
        
        result = conn.execute(text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'"))
        print("Tables in public schema:")
        for row in result:
            print(f" - {row[0]}")
except Exception as e:
    print(f"Connection failed: {e}")
