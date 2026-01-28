FROM gesalps-ml-base:latest

WORKDIR /app

# The base image already has all libraries. 
# We only copy the application code for instant updates.
RUN pip uninstall -y fpdf && pip install --no-cache-dir fpdf2
COPY synth_worker/ /app/
COPY libs/ /app/libs/
COPY services/ /app/services/
COPY requirements.txt /app/requirements.txt

# Install new dependencies (OMOP Engine)
RUN pip install --no-cache-dir -r /app/requirements.txt

# Re-apply patch if code changed (safeguard)
RUN python patch_opacus.py || echo "Patching skipped"

ENV PYTHONUNBUFFERED=1
CMD ["python", "-u", "worker.py"]
