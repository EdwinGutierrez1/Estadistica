"""
Ejecutar una sola vez después del primer deploy desde Render Shell:
    python scripts/init_db.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db

app = create_app()
with app.app_context():
    db.create_all()
    print("✅ Tablas creadas exitosamente en PostgreSQL")
    print("   Tablas disponibles:")
    from sqlalchemy import inspect
    inspector = inspect(db.engine)
    for table in inspector.get_table_names():
        print(f"   · {table}")
