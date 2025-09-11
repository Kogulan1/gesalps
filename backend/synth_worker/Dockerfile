FROM python:3.11-slim

WORKDIR /app

# (optional but recommended) system basics for wheels and runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl libgomp1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

# Install CPU-only PyTorch wheels (no CUDA) from PyTorch index
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu \
    torch==2.3.1 torchvision==0.18.1 torchaudio==2.3.1

RUN pip install --no-cache-dir --upgrade pip setuptools wheel

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure unbuffered stdout/stderr so logs appear in `docker logs`
ENV PYTHONUNBUFFERED=1
CMD ["python", "-u", "worker.py"]
