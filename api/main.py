# Vercel entry point - imports from backend/api/main.py
import sys
import os

# Add the backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Import the FastAPI app from the backend
from api.main import app

# Export the app for Vercel
handler = app
