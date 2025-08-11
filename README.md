# Resume Website with AI Q&A

A personal resume website featuring dynamic content display and an interactive AI-powered Q&A chatbot. The site is built with Next.js for the frontend and a FastAPI backend, leveraging Supabase for data storage and AI capabilities.

## Features

*   **Dynamic Resume Display**: Presents personal, education, work experience, projects, and skills sections.
*   **Interactive AI Q&A**: Allows users to ask questions about the resume content, powered by a RAG (Retrieval-Augmented Generation) system.
*   **Supabase Integration**: Utilizes Supabase as the primary database for storing structured resume data.
*   **Modular Architecture**: Separates frontend (Next.js) and backend (FastAPI) for maintainability and scalability.

## Detailed Setup and Installation

Follow these steps to get the project up and running on your local machine.

### Prerequisites

Make sure you have the following installed:

*   **Node.js** (LTS version) & **npm** (or Yarn)
*   **Python** (3.8+) & **pip**
*   **Git**

### 1. Clone the Repository

```bash
git clone <YOUR_REPOSITORY_URL_HERE>
cd resume_website
```

### 2. Supabase Setup

1.  **Create a New Project**: Go to [Supabase](https://supabase.com/) and create a new project.
2.  **Create `resume` Table**: In your Supabase project dashboard, navigate to the "Table Editor" and create a new table named `resume`. Define its columns as per `doc/Data_model.md`:
    *   `id` (UUID, Primary Key)
    *   `about_me` (TEXT)
    *   `contact` (JSONB)
    *   `education` (JSONB)
    *   `jobs` (JSONB) - *Note: The database column is `jabs` as per `Data_model.md`, but the API expects `jobs`.*
    *   `projects` (JSONB)
    *   `skills` (JSONB)
    *   `created_at` (TIMESTAMPTZ)
    *   `updated_at` (TIMESTAMPTZ)
3.  **Insert Resume Data**: Insert at least one row of your resume data into the `resume` table. Ensure the data structure matches the column types (especially JSONB fields).
4.  **Configure Row Level Security (RLS)**: By default, RLS is enabled and prevents API access. To allow your application to read data, go to the "SQL Editor" in your Supabase dashboard and run the following SQL query:

    ```sql
    ALTER TABLE public.resume ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow public read access to resume" 
    ON public.resume 
    FOR SELECT 
    USING (true);
    ```
5.  **Get Supabase Credentials**: Go to "Project Settings" -> "API" to find your `Project URL` and `anon public` key. You will need these for the backend setup.

### 3. Backend Setup (FastAPI)

1.  **Navigate to Backend Directory**:
    ```bash
    cd D:\project\resume_website\python-backend
    ```
2.  **Create `.env` File**: Create a file named `.env` in this directory with the following content:
    ```
    SUPABASE_URL=YOUR_SUPABASE_URL
    SUPABASE_KEY=YOUR_SUPABASE_KEY
    ```
    Replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_KEY` with the credentials you obtained from Supabase.
3.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
4.  **Run the Backend Server**:
    ```bash
    uvicorn main:app --reload
    ```
    The FastAPI backend will start, typically accessible at `http://127.0.0.1:8000`.

### 4. Frontend Setup (Next.js)

1.  **Navigate to Frontend Directory**:
    ```bash
    cd D:\project\resume_website\src\nextjs
    ```
2.  **Install Dependencies**:
    ```bash
    npm install # or yarn install
    ```
3.  **Run the Development Server**:
    ```bash
    npm run dev # or yarn dev
    ```
    The Next.js frontend will start, typically accessible at `http://localhost:3000`.
