FROM python:3.11-slim

WORKDIR /app

# (optional but recommended) system basics for wheels and runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl libgomp1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Install core dependencies first (required for building some packages like shap)
RUN pip install --no-cache-dir numpy==1.26.4 pandas==1.5.3 scipy==1.13.1

# Install shap separately (needs numpy available during build)
# Pin to version with pre-built wheels to avoid compilation issues
RUN pip install --no-cache-dir "shap>=0.45.0"

# Install CPU-only PyTorch wheels (no CUDA) from PyTorch index
# Using torch 2.2.2 for compatibility with Opacus 1.5.4
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu \
    torch==2.2.2 torchvision==0.17.2 torchaudio==2.2.2

COPY synth_worker/requirements.txt .
# Install remaining dependencies (numpy/pandas/shap already installed, so pip will skip them)
# Explicitly install critical packages first to ensure they're available
RUN pip install --no-cache-dir supabase==2.5.1 python-jose==3.3.0 httpx==0.27.2 sdv==1.26.0 scikit-learn==1.4.2 python-dateutil==2.9.0.post0
# Install remaining requirements
RUN pip install --no-cache-dir -r requirements.txt || \
    (pip install --no-cache-dir $(grep -v "^#" requirements.txt | grep -v "^$" | grep -v "shap" | tr '\n' ' ') && \
     pip install --no-cache-dir synthcity --no-deps || pip install --no-cache-dir synthcity)
# Verify critical packages are installed
RUN pip list | grep -E "(supabase|synthcity|torch|opacus)" || echo "Warning: Some packages may be missing"

# Patch Opacus to work with torch 2.2.2 (RMSNorm doesn't exist in torch <2.3)
COPY synth_worker/patch_opacus.py /tmp/patch_opacus.py
RUN python /tmp/patch_opacus.py && rm /tmp/patch_opacus.py

# Copy synth_worker files
COPY synth_worker/ /app/

# Copy libs directory (for compliance module)
COPY libs/ /app/libs/

# Ensure unbuffered stdout/stderr so logs appear in `docker logs`
ENV PYTHONUNBUFFERED=1
CMD ["python", "-u", "worker.py"]
