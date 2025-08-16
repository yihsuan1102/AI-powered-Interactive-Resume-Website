FROM public.ecr.aws/lambda/python:3.12

WORKDIR /var/task

# Install dependencies
COPY src/python-backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/python-backend/*.py ./

# Copy resume data (used by rag.py via RESUME_JSON_PATH)
COPY src/nextjs/data/resume.json ./resume.json

# Default envs (can be overridden in Lambda configuration)
ENV RESUME_JSON_PATH=/var/task/resume.json

# Lambda handler entrypoint
CMD ["main.handler"]


