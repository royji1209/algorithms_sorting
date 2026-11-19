---
name: gas-sync
description: 지정된 하위 폴더(또는 gas 폴더)의 code.gs, index.html, appsscript.json 파일을 원격 Google Apps Script 프로젝트로 생성 및 업로드(동기화)할 때 사용하는 스킬. "GAS 업로드", "코드 올려줘", "clasp push", "GAS 동기화" 요청 시 트리거됩니다.
version: 1.1.0
tools:
- bash
---

# GAS Code Upload (Sync) Procedure

1. **대상 GAS 폴더 경로 확인**
   - 사용자가 특정 하위 폴더를 지정했는지 확인한다 (예: `<하위폴더>/gas` 또는 `<하위폴더>`). 별도 지정이 없으면 기본 `gas` 폴더를 대상으로 한다.
   - 대상 폴더가 없으면 생성(`mkdir -p <대상폴더>`)하고, 모든 명령어는 반드시 해당 폴더로 이동(`cd <대상폴더>`)한 상태에서 실행한다.

2. **`.clasp.json` 확인 및 프로젝트 초기화**
   - 대상 폴더 내에 `.clasp.json` 파일이 존재하는지 확인한다 (`"rootDir": "."` 확인).
   - 만약 `.clasp.json` 파일이 없다면, 상위(또는 전역)에 설치된 `clasp`를 이용해 새 웹앱 프로젝트를 생성한다:
     ```bash
     cd <대상폴더> && npx clasp create --title "Antigravity-WebApp" --type webapp --rootDir .
     ```

3. **매니페스트(`appsscript.json`) 설정 확인 및 수정**
   - 대상 폴더의 `appsscript.json` 파일에 한국 시간대(`Asia/Seoul`), 웹앱 외부 접속 허용(`ANYONE_ANONYMOUS`), 외부 API(Cloud Run 등) 호출 권한(`script.external_request`)이 포함되어 있는지 확인하고 아래 내용으로 맞춘다:
     ```json
     {
       "timeZone": "Asia/Seoul",
       "dependencies": {},
       "exceptionLogging": "STACKDRIVER",
       "runtimeVersion": "V8",
       "webapp": {
         "executeAs": "USER_DEPLOYING",
         "access": "ANYONE_ANONYMOUS"
       },
       "oauthScopes": [
         "https://www.googleapis.com/auth/script.external_request"
       ]
     }
     ```

4. **원격 GAS 서버로 코드 강제 동기화**
   - 터미널에서 아래 명령을 실행하여 로컬 파일(`code.gs`, `index.html`, `appsscript.json` 등)을 원격 GAS 서버에 덮어쓴다:
     ```bash
     cd <대상폴더> && npx clasp push -f
     ```
