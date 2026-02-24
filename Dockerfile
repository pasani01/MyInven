FROM python:3.12-slim

WORKDIR /app

COPY MyInventory/backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY MyInventory/backend/ .

RUN mkdir -p static && python manage.py collectstatic --noinput

ENV PORT=8000

CMD python manage.py migrate && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 3