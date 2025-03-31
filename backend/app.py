from fastapi import FastAPI
from database import engine, get_db
from models import Base

app = FastAPI()

# Create tables on startup if they do not exist.
@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created or verified.")

# Your additional route definitions go here...
