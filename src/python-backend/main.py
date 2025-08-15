
import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client

# Load environment variables from .env file
load_dotenv()

# Supabase setup
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# Check if Supabase credentials are set
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase URL and Key must be set in the .env file")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI()

# CORS middleware setup
origins = [
    "http://localhost:3000",  # Default Next.js development server
    # You can add other origins here if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/resume")
def get_resume():
    """
    Fetches the complete resume data from the Supabase 'resume' table.
    """
    try:
        # Query the 'resume' table
        response = supabase.table("resume").select("*").limit(1).execute()

        # Check if the response contains data
        if not response.data:
            raise HTTPException(status_code=404, detail="Resume data not found")

        # The result is a list, get the first item
        resume_data = response.data[0]

        # Format the response to match the API documentation
        # Note the transformation from 'jabs' in the DB to 'jobs' in the API response
        formatted_data = {
            "contact": resume_data.get("contact"),
            "education": resume_data.get("education"),
            "jobs": resume_data.get("jobs"),
            "projects": resume_data.get("projects"),
            "skills": resume_data.get("skills"),
            "about_me": resume_data.get("about_me")
        }

        return formatted_data

    except Exception as e:
        # Log the error for debugging purposes
        print(f"An error occurred: {e}")
        # Raise a generic 500 error to the client
        raise HTTPException(status_code=500, detail="An internal server error occurred.")

