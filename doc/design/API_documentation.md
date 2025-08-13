# API Documentation

This document provides the API specification for the resume website, designed to meet the user requirements for displaying resume information and providing an interactive AI Q&A experience.

## Base URL

The base URL for all API endpoints will be `/api`.

---

## 1. Get Resume Data

This endpoint retrieves the full structured content of the resume. It directly addresses **UR-01: 瀏覽履歷與個人資訊**.

### `GET /resume`

**Description:**
Fetches the complete resume data, including contact information, education, work experience, projects, and skills. The frontend will use this data to render the main sections of the website.

**Request:**
-   **Method:** `GET`
-   **Headers:**
    -   `Content-Type: application/json`
-   **Body:** None

**Responses:**

-   **`200 OK`**

    Successfully retrieved the resume data.

    **Body Example:**
    ```json
    {
      "contact": {
        "first_name": "Yihsuan",
        "last_name": "Liao",
        "github": "https://github.com/yihsuan1102",
        "linkedin": "https://www.linkedin.com/in/yi-hsuan-liao-a120a3168/",
        "email": "logan.yihsuan.liao@gmail.com",
      },
      "education": [
        {
          "school": "National Cheng Kung University",
          "degree": "M.S., Electrical Engineering",
          "start_year": 2020,
          "end_year": 2024
        }
      ],
      "jobs": [
        {
          "company": "National Cheng Kung University",
          "overview": "Improved student affairs service quality...",
          "tasks": [...]
        }
      ],
      "projects": [
        {
          "title": "Full-Stack Software Development",
          "overview": "A web application to help college students enhance their programming skills...",
          "tasks": [...]
        }
      ],
      "skills": {
        "Programming Language": ["Python", "C/C++", "Java", ...],
        "Machine Learning": ["TensorFlow", "Pandas", "Opencv"]
      }
    }
    ```

-   **`404 Not Found`**

    The requested resume data could not be found.

---

## 2. AI Chat (Streaming)

This endpoint handles the AI Q&A functionality. It accepts a user's question and streams back the AI-generated response. This design fulfills both **UR-02: AI 問答** and **UR-03: 即時顯示 AI 生成過程**.

### `POST /chat`

**Description:**
Submits a question to the RAG (Retrieval-Augmented Generation) system. The system finds relevant sections from the resume, generates an answer using an LLM, and streams the response back to the client in real-time.

**Request:**

-   **Method:** `POST`
-   **Headers:**
    -   `Content-Type: application/json`
-   **Body:**
    ```json
    {
      "question": "Do you have experience with AI-related projects?"
    }
    ```

**Responses:**

-   **`200 OK`**

    The request was successful, and the response is being streamed.

    -   **Content-Type:** `text/event-stream`
    -   **Body:** A stream of Server-Sent Events (SSE). The client should listen for `data` events to construct the answer. The stream will end with a special `[DONE]` message. A final event may contain the source documents used for the answer.

    **Stream Example:**
    ```
    data: {"token": "Based"}

    data: {"token": " on"}

    data: {"token": " my"}

    data: {"token": " resume,"}

    data: {"token": " I"}

    data: {"token": " worked"}

    data: {"token": " on"}

    data: {"token": " an"}

    data: {"token": " 'Integrated"}

    data: {"token": " Gesture"}

    data: {"token": " Recognition"}

    data: {"token": " System'"}

    data: {"token": "."}

    data: {"type": "sources", "data": [{"content": "Designed and implemented an automated visual acuity testing system by integrating an existing pose estimation model with a self-trained LSTM-based gesture recognizer.", "metadata": {"title": "Integrated Gesture Recognition System with Model Training"}}]}

    data: [DONE]
    ```

-   **`400 Bad Request`**

    The request is malformed (e.g., the `question` field is missing).

-   **`500 Internal Server Error`**

    An error occurred on the server, such as a failure to connect to the AI model or the database.