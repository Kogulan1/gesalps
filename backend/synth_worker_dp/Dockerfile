FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl libgomp1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

# CPU-only PyTorch 1.13.x compatible with synthcity 0.2.x and opacus 1.2.x
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu \
    torch==1.13.1 torchvision==0.14.1 torchaudio==0.13.1

RUN pip install --no-cache-dir --upgrade pip setuptools wheel

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1
CMD ["python", "-u", "worker.py"]
