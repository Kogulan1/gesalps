# Dockerfile for GreenGuard backend API
# Use a lightweight Python image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Copy only requirements first for better caching
COPY . .

# Install system dependencies (if any) and Python packages
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && pip install --no-cache-dir -r requirements.txt && apt-get purge -y --auto-remove gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# Copy the entire backend source code


# Create a folder for temporary files (PDFs, CSVs)
RUN mkdir -p /app/tmp

# Expose the FastAPI port
EXPOSE 8000

# Environment variables (override as needed at runtime)
ENV SUPABASE_URL=http://mock
ENV SUPABASE_SERVICE_ROLE_KEY="mock-key"
ENV PYTHONPATH="/app"

# Command to run the API server
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
