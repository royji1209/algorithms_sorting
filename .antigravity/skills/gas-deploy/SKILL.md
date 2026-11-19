---
name: gas-deploy
description: 지정된 하위 폴더(또는 gas 폴더)의 Google Apps Script 프로젝트를 웹앱으로 정식 배포하고 접속 URL을 반환하는 스킬. "GAS 배포", "웹앱 배포", "새 버전 배포", "clasp deploy" 요청 시 트리거됩니다.
version: 1.1.0
tools:
- bash
---

# GAS Web App Deployment Procedure

1. **대상 GAS 폴더 경로 확인**
   - 사용자가 특정 하위 폴더를 지정했는지 확인한다 (예: `<하위폴더>/gas` 또는 `<하위폴더>`). 별도 지정이 없으면 기본 `gas` 폴더를 대상으로 한다.
   - 모든 명령어는 반드시 해당 대상 폴더로 이동(`cd <대상폴더>`)한 상태에서 실행한다.

2. **배포 전 필수 파일(`.clasp.json`, `appsscript.json`) 확인**
   - 대상 폴더 내에 `.clasp.json` 파일이 존재하는지 확인한다. (없다면 먼저 `gas-sync` 절차에 따라 프로젝트를 생성한다.)
   - 웹앱 URL이 정상 발급되려면 `appsscript.json` 매니페스트에 반드시 `"webapp"` 블록(`"executeAs": "USER_DEPLOYING"`, `"access": "ANYONE_ANONYMOUS"`)이 포함되어 있어야 하므로 이를 확인한다.

3. **최신 코드 원격 푸시 (동기화)**
   - 배포 전 최신 코드와 매니페스트가 반영되도록 원격 서버에 강제 푸시를 수행한다:
     ```bash
     cd <대상폴더> && npx clasp push -f
     ```

4. **웹앱 정식 배포 실행**
   - 새 버전을 생성하며 웹앱으로 배포한다 (기존 배포 ID를 유지하며 업데이트하려면 `-i <배포ID>` 옵션을 추가할 수 있다):
     ```bash
     cd <대상폴더> && npx clasp deploy --description "Update WebApp"
     ```

5. **웹앱 접속 URL 확인 및 안내**
   - 위 명령어 출력 결과에서 생성된 배포 ID(`Deployment ID`: `AKfycb...` 형태)를 추출한다.
   - 만약 배포 목록 확인이 필요하면 아래 명령어로 조회한다:
     ```bash
     cd <대상폴더> && npx clasp deployments
     ```
   - 최종 웹앱 접속 URL을 아래 형식으로 조합하여 사용자에게 반환한다:
     `https://script.google.com/macros/s/<추출한_배포_ID>/exec`
