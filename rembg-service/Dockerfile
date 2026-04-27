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
# Default is birefnet-general-lite (~178MB) — better quality on illustrations + text
# than ISNet. birefnet-dis lazy-loads on first use to keep image size manageable.
RUN python -c "from rembg import new_session; new_session('birefnet-general-lite')" || true

COPY main.py .

EXPOSE 8000

# Railway/Fly inject $PORT; fall back to 8000 for local dev
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
