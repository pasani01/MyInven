# Base image
FROM python:3.12-slim

# Çalışma dizini
WORKDIR /app

# Requirements yükle
COPY MyInventory/backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Proje dosyalarını kopyala
COPY MyInventory/backend/ .

# Collectstatic ve migrate (Railway deployment için)
RUN python manage.py collectstatic --noinput
RUN python manage.py migrate

# Railway port env var
ENV PORT 8000

# Gunicorn ile production server
CMD gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 3