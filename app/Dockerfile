# 파이썬 3.11 슬림 리눅스 베이스 이미지
FROM python:3.11-slim

# 파이썬 표준 입출력 버퍼링 비활성화 (Cloud Run 콘솔 로그 즉시 확인용)
ENV PYTHONUNBUFFERED=True

# 작업 디렉터리 생성 및 설정
WORKDIR /app

# 종속성 파일 복사 및 설치 (도커 레이어 캐시 활용)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 전체 애플리케이션 소스 복사
COPY . ./

# Gunicorn WSGI 서버 실행 (PORT 환경 변수 바인딩 및 main:app 구동)
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 main:app
