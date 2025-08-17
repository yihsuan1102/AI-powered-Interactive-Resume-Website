# Resume Website with AI Q&A

## Introduction

A website that showcases my personal experience and technical skills.

## Features

*   **Dynamic Resume Display**: Presents personal, education, work experience, projects, and skills sections.
*   **Interactive AI Q&A**: Allows users to ask questions about the resume content, powered by a RAG (Retrieval-Augmented Generation) system.
*   **Supabase Integration**: Utilizes Supabase as the primary database for storing structured resume data.
*   **Modular Architecture**: Separates frontend (Next.js) and backend (FastAPI) for maintainability and scalability.

## Project Architecture

-   Frontend (`src/nextjs`): Next.js App Router, Tailwind CSS. Provides resume pages and the `ChatWidget` chat interface.
-   Backend (`src/python-backend`): FastAPI exposes `/rag/query` and optional `/api/resume`.
    -   `rag.py`: RAG pipeline (OpenAI Embeddings + in-memory retrieval + Chat Completions).
    -   `main.py`: FastAPI app, CORS, optional Supabase resume API, AWS Lambda handler (Mangum).
-   Data and Types:
    -   Resume data: `src/nextjs/data/resume.json` (default source for RAG)
    -   Type definitions: `src/nextjs/types/`, `src/nextjs/lib/types.ts`
-   Docs and Deployment: `doc/` (design and AWS Amplify deployment notes), `Dockerfile`

```text
resume_website/
  ├─ src/
  │  ├─ nextjs/            # Frontend Next.js + Tailwind
  │  └─ python-backend/    # Backend FastAPI + RAG
  └─ doc/                  # Docs: design, deployment, data model
```

## Tech Stack

-   **Languages**: TypeScript, Python
-   **Frontend**: Next.js (App Router), React, Tailwind CSS
-   **Backend**: FastAPI, Uvicorn, Mangum (AWS Lambda)
-   **AI/LLM**: OpenAI API (Chat Completions, Embeddings)
-   **Database**: Supabase (Postgres, optional, used by the resume API)
-   **Retrieval/Vector**: OpenAI Embeddings + in-memory retrieval (no external vector DB yet)
-   **Tooling**: Node.js, npm / Yarn, Python, pip
-   **Cloud/Deploy**: AWS Amplify (see `doc/deploy/`), Docker

## Detailed Setup and Installation

Follow these steps to get the project up and running on your local machine.

### Prerequisites

Make sure you have the following installed:

*   **Node.js** (LTS version) & **npm** (or Yarn)
*   **Python** (3.8+) & **pip**
*   **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/yihsuan1102/yihsuan1102-AI-powered-Interactive-Resume-Website.git
cd resume_website
```

### 2. (Optional) Supabase Setup

1.  **Create a New Project**: Go to [Supabase](https://supabase.com/) and create a new project.
2.  **Create `resume` Table**: In Supabase Table Editor, create a `resume` table. Columns reference `doc/design/Data_model.md`:
    *   `id` (UUID, Primary Key)
    *   `about_me` (TEXT)
    *   `contact` (JSONB)
    *   `education` (JSONB)
    *   `jobs` (JSONB)
    *   `projects` (JSONB)
    *   `skills` (JSONB)
    *   `created_at` (TIMESTAMPTZ)
    *   `updated_at` (TIMESTAMPTZ)
3.  **Insert Resume Data**: Insert at least one row of resume data (ensure JSONB columns are valid).
4.  **Row Level Security (RLS)**: Enabled by default. To allow public read access, run in SQL Editor:

    ```sql
    ALTER TABLE public.resume ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow public read access to resume" 
    ON public.resume 
    FOR SELECT 
    USING (true);
    ```
5.  **Get Supabase Credentials**: In Project Settings -> API, obtain `Project URL` and `anon public` key.

### 3. Backend Setup (FastAPI)

1.  **Navigate to Backend Directory**：
    ```bash
    cd src/python-backend
    ```
2.  **Create `.env` File**: Create `.env` and fill the required environment variables (optional as needed):
    ```env
    # OpenAI and model
    OPENAI_API_KEY=YOUR_OPENAI_API_KEY
    OPENAI_MODEL=gpt-5-nano                 # optional; defaults to gpt-5-nano

    # RAG and frontend CORS
    ALLOWED_ORIGINS=http://localhost:3000   # comma-separated list
    RAG_API_KEY=YOUR_RAG_API_KEY            # optional; if set, clients must send X-API-Key header

    # Resume data source (defaults to src/nextjs/data/resume.json)
    RESUME_JSON_PATH=../nextjs/data/resume.json

    # Supabase (optional; used by /api/resume)
    SUPABASE_URL=YOUR_SUPABASE_URL
    SUPABASE_KEY=YOUR_SUPABASE_KEY
    ```
3.  **Install Dependencies**：
    ```bash
    pip install -r requirements.txt
    ```
4.  **Run the Backend Server**：
    ```bash
    uvicorn main:app --reload
    ```
    The FastAPI backend will start, typically accessible at `http://127.0.0.1:8000`.

### 4. Frontend Setup (Next.js)

1.  **Navigate to Frontend Directory**：
    ```bash
    cd src/nextjs
    ```
2.  **Install Dependencies**：
    ```bash
    npm install # or yarn install
    ```
3.  **Run the Development Server**：
    ```bash
    npm run dev # or yarn dev
    ```
    The Next.js frontend will start, typically accessible at `http://localhost:3000`.
