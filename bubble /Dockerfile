FROM python:3.11-slim

ENV PYTHONUNBUFFERED=True
WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./

# 파일명이 main.py면 main:app, app.py면 app:app
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 main:app
