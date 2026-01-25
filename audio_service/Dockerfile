# Audio Service Dockerfile - v6.0
# Instalação em etapas para evitar conflitos
FROM python:3.11-slim

WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    espeak-ng \
    ffmpeg \
    libsndfile1 \
    libgomp1 \
    build-essential \
    pkg-config \
    libavformat-dev \
    libavcodec-dev \
    libavutil-dev \
    libswscale-dev \
    libswresample-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Instalar Python packages em ordem
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir "numpy>=1.24,<2.0" && \
    pip install --no-cache-dir torch==2.2.0 --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir scipy numba scikit-learn && \
    pip install --no-cache-dir soundfile audioread pydub && \
    pip install --no-cache-dir librosa && \
    pip install --no-cache-dir fastapi "uvicorn[standard]" python-multipart pydantic httpx && \
    pip install --no-cache-dir gTTS faster-whisper && \
    pip install --no-cache-dir phonemizer jellyfish && \
    pip install --no-cache-dir pandas openpyxl sqlalchemy psycopg2-binary && \
    pip install --no-cache-dir python-dotenv

# Copiar aplicação e criar diretórios
COPY app.py .
RUN mkdir -p audio_cache /root/.cache/whisper && chmod -R 777 audio_cache

# Configuração
EXPOSE 8001
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

CMD ["python", "app.py"]
