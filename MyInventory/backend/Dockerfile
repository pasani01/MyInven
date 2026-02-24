FROM python:3.12-slim

WORKDIR /app

COPY MyInventory/backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt

COPY MyInventory/backend/ .

RUN python manage.py collectstatic --noinput