FROM python:3.11-slim

WORKDIR /app

# System deps for Pillow and ONNX
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the default model so cold starts are faster
# Models are cached in ~/.u2net by default; we move them to /app/models
ENV U2NET_HOME=/app/models
RUN python -c "from rembg import new_session; new_session('isnet-general-use')" || true

COPY main.py .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
