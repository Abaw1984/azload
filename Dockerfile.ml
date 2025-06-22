FROM python:3.10-slim-bullseye

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=off \
    APP_HOME=/app

RUN apt-get update && apt-get install -y \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR $APP_HOME

# Copy all required assets
COPY ml_pipeline/ $APP_HOME/ml_pipeline/
COPY staad_guide.pdf $APP_HOME/
COPY components.json $APP_HOME/
COPY staad_model.png $APP_HOME/

# Fallback for missing config
RUN if [ ! -f "components.json" ]; then echo '{"model_type": "default"}' > components.json; fi

# Install dependencies
RUN pip install --upgrade pip && \
    pip install numpy pandas scikit-learn tensorflow opencv-python-headless python-dotenv pypdf2 plotly

ENTRYPOINT ["python", "ml_pipeline/main.py"]
