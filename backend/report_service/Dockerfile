FROM python:3.11-slim

WORKDIR /app

# System deps for WeasyPrint (Cairo/Pango/Fonts)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b \
    libgdk-pixbuf-2.0-0 libffi-dev libjpeg62-turbo \
    libxml2 libxslt1.1 fonts-dejavu-core fonts-liberation && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8010"]
