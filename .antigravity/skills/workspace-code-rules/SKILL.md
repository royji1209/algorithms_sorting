---
name: workspace-code-rules
description: 같은 폴더 Python 모듈 임포트 구조와 GAS-Python 서버 시작 연결 및 연결하기/연결끊기 버튼 제어 규칙을 적용하는 작업 룰 스킬
version: 1.0.0
---

# 작업 코드 규칙

## 1. 같은 폴더 Python 모듈(.py) 임포트
- `main.py`와 같은 디렉터리에 있는 다른 `.py` 파일의 함수·클래스·상수·라우터는 명시적으로 `import`해 사용한다.
- 실행 진입점은 `if __name__ == "__main__":` 블록으로 분리한다.
- 보조 `.py` 파일을 `import`할 때 테스트 출력이나 서버/작업이 자동 실행되지 않도록 단독 실행 코드를 가드한다.
- 순환 `import`가 생기지 않도록 모듈 간 의존 방향을 단방향으로 정리한다.

## 2. GAS - Python 서버 시작 연결 및 수동 제어
- 웹앱 시작 시 Python 서버 연결 상태를 자동 확인하되, 첫 화면의 데이터 영역은 빈 상태(empty state)로 유지하고 기본/더미/샘플 데이터는 넣지 않는다.
- Python 서버 주소는 프론트엔드에 하드코딩하지 않고 `Code.gs`의 `PropertiesService.getScriptProperties()`(`PYTHON_SERVER_URL`)에서 읽어 사용한다.
- `index.html`에 **연결하기**와 **연결끊기** 버튼을 두고, 연결 상태에 따라 `disabled` 상태를 전환한다 (`connected`일 때 연결하기 비활성·연결끊기 활성, `disconnected`/`error`일 때 연결하기 활성·연결끊기 비활성).
- Python 서버(`main.py` 등)에는 시작/수동 연결 확인용 `/health` 엔드포인트와 GAS 출처(`https://script.google.com`, `https://script.googleusercontent.com`) CORS 설정을 반영한다.
