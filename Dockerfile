FROM python:3.12-slim

WORKDIR /app

COPY MyInventory/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY MyInventory/backend/ .

# static klasörü yoksa oluştur
RUN mkdir -p static && python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2"]