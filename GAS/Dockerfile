# 파이썬 경량 베이스 이미지 지정
FROM python:3.11-slim

# 파이썬 버퍼링 비활성화 (로그 즉시 출력)
ENV PYTHONUNBUFFERED True

# 작업 디렉터리 설정
WORKDIR /app

# 종속성 파일 복사 및 설치
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 소스 복사
COPY . ./

# Gunicorn WSGI 서버를 사용하여 8080 포트로 서비스 기동
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 main:app
