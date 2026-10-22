FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
ENV PORT=8080

WORKDIR /app

# 전체 소스를 임시 폴더로 복사한 뒤, midterm 폴더 안의 파일들을 /app으로 이동
COPY . /tmp/repo/
RUN if [ -f "/tmp/repo/midterm/main.py" ]; then \
        cp -r /tmp/repo/midterm/* /app/; \
    else \
        cp -r /tmp/repo/* /app/; \
    fi && rm -rf /tmp/repo

# 패키지 직접 설치 (requirements.txt 파일명 오타나 경로 문제로 인한 빌드 실패 원천 차단)
RUN pip install --no-cache-dir Flask==3.0.3 Flask-Cors==4.0.1 gunicorn==22.0.0

# Cloud Run 표준 Gunicorn 실행
CMD ["sh", "-c", "gunicorn --bind :${PORT:-8080} --workers 1 --threads 8 --timeout 0 main:app"]
