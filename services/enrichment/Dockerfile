# Paperama enrichment service (sumy + crawl4ai)
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY services/enrichment/requirements.txt /tmp/requirements.txt
COPY vendor/sumy /vendor/sumy

RUN pip install --no-cache-dir -e /vendor/sumy \
    && pip install --no-cache-dir -r /tmp/requirements.txt \
    && python -m playwright install --with-deps chromium

COPY services/enrichment /app

EXPOSE 8100

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8100"]
