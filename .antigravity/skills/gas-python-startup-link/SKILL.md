---
name: gas-python-startup-link
description: Google Apps Script(GAS) 웹앱 시작 시 Python 백엔드 서버와 연결을 확인하고, 연결하기/연결끊기 버튼으로 세션을 제어하는 코드를 GAS(Code.gs, index.html)와 Python 서버(main.py)에 자동 생성·연동하는 스킬
version: 1.0.0
---

# GAS - Python 서버 시작 연결 및 수동 제어 스킬

GAS 웹앱 초기 로드 시 Python 서버(`main.py` 등)와의 연결을 자동으로 확인하고, 사용자가 언제든 **연결하기** 및 **연결끊기** 버튼으로 연결 상태를 전환할 수 있는 코드를 GAS와 Python 서버에 자동 생성한다. 첫 화면의 데이터 영역은 초기 빈 상태(empty state)를 유지한다.

## 핵심 규칙

1. **서버 URL 관리**: Python 서버 주소는 프론트엔드에 하드코딩하지 않고 `Code.gs`의 `PropertiesService.getScriptProperties()`(`PYTHON_SERVER_URL`)에서 읽어 사용한다.
2. **연결 상태 및 버튼 제어**:
   - **연결됨(`connected`)**: `연결하기` 버튼 비활성화(`disabled`), `연결끊기` 버튼 활성화.
   - **연결끊김/미연결(`disconnected` / `error`)**: `연결하기` 버튼 활성화, `연결끊기` 버튼 비활성화(`disabled`). 연결끊기 상태에서는 자동/수동 서버 호출을 중단하고 `"연결이 끊어졌습니다"` 상태로 표시한다.
3. **초기 빈 상태 유지**: 연결 상태 변경과 무관하게 초기 데이터 목록·테이블·차트·결과 영역은 비워 두고 샘플/더미 데이터를 넣지 않는다.
4. **서버 엔드포인트 및 CORS**: Python 서버(FastAPI 등)에 시작/수동 연결 확인용 `GET /health` 엔드포인트와 GAS 도메인(`https://script.google.com`, `https://script.googleusercontent.com`) CORS 설정을 반영한다.

## 자동 생성 코드 기준

### `Code.gs`
```javascript
function getPythonServerUrl_() {
  const url = PropertiesService.getScriptProperties().getProperty('PYTHON_SERVER_URL');
  return url ? url.trim() : '';
}

function connectPythonServer() {
  const baseUrl = getPythonServerUrl_();
  const startedAt = Date.now();

  if (!baseUrl) {
    return {
      connected: false,
      status: 'unconfigured',
      message: 'PYTHON_SERVER_URL 스크립트 속성이 설정되지 않았습니다.',
      latencyMs: 0
    };
  }

  try {
    const endpoint = baseUrl.replace(/\/+$/, '') + '/health';
    const res = UrlFetchApp.fetch(endpoint, {
      method: 'get',
      muteHttpExceptions: true,
      followRedirects: true
    });
    const code = res.getResponseCode();
    const latencyMs = Date.now() - startedAt;

    return {
      connected: code >= 200 && code < 300,
      status: code >= 200 && code < 300 ? 'connected' : 'error',
      httpStatus: code,
      message: code >= 200 && code < 300 ? 'Python 서버 연결됨' : `응답 코드 ${code}`,
      latencyMs: latencyMs
    };
  } catch (err) {
    return {
      connected: false,
      status: 'unreachable',
      message: err && err.message ? err.message : 'Python 서버 연결 실패',
      latencyMs: Date.now() - startedAt
    };
  }
}

function disconnectPythonServer() {
  return {
    connected: false,
    status: 'disconnected',
    message: 'Python 서버 연결이 끊어졌습니다.',
    latencyMs: 0
  };
}
```

### `index.html` (프론트엔드 연결 제어 예시)
```html
<div class="flex items-center gap-3">
  <button id="btn-connect" onclick="handleConnect()" class="px-3 py-1.5 rounded bg-emerald-600 text-white disabled:opacity-50">연결하기</button>
  <button id="btn-disconnect" onclick="handleDisconnect()" class="px-3 py-1.5 rounded bg-rose-600 text-white disabled:opacity-50" disabled>연결끊기</button>
  <span id="conn-status" class="text-sm font-mono text-slate-400">연결 상태 확인 중...</span>
</div>

<script>
  function updateConnectionUI(res) {
    const isConn = res && res.connected;
    document.getElementById('btn-connect').disabled = isConn;
    document.getElementById('btn-disconnect').disabled = !isConn;
    document.getElementById('conn-status').textContent = 
      isConn ? `연결됨 (${res.latencyMs || 0}ms)` : (res.message || '연결 끊김');
  }

  function handleConnect() {
    document.getElementById('conn-status').textContent = '서버 연결 시도 중...';
    google.script.run
      .withSuccessHandler(updateConnectionUI)
      .withFailureHandler(() => updateConnectionUI({ connected: false, message: '연결 실패' }))
      .connectPythonServer();
  }

  function handleDisconnect() {
    google.script.run
      .withSuccessHandler(updateConnectionUI)
      .disconnectPythonServer();
  }

  window.addEventListener('DOMContentLoaded', handleConnect);
</script>
```

### `main.py` (FastAPI CORS 및 헬스체크 예시)
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://script.google.com",
        "https://script.googleusercontent.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Python backend active"}
```
