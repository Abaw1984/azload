FROM python:3.10-slim-bullseye

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_HOME=/app \
    MODELS_DIR=/app/models \
    UPLOADS_DIR=/app/uploads

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Create directories
RUN mkdir -p $APP_HOME $MODELS_DIR $UPLOADS_DIR
WORKDIR $APP_HOME

# Copy application
COPY ml_pipeline/ $APP_HOME/ml_pipeline/

# Install Python dependencies
RUN pip install --upgrade pip
COPY requirements.txt .
RUN pip install -r requirements.txt

# Expose API port
EXPOSE 8000

# Start application
CMD ["uvicorn", "ml_pipeline.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
