# Abyss Survivor

Abyss Survivor는 순수 HTML, CSS, JavaScript로 만든 모바일 세로 화면 기반 생존 로그라이트 게임입니다. 외부 라이브러리, ES Module, npm, 번들러 없이 GitHub Pages 루트 배포 기준으로 바로 실행됩니다.

## 현재 버전

v10.0 최종 안정화 / 가벼운 PWA / 아이콘 마감

이번 버전은 새 대형 게임 기능을 추가하지 않고, 저장 데이터 호환성, 상태 전환, 보상 중복 방어, NaN/Infinity 방어, 아이콘 fallback, PWA 설치 지원, 테스트 러너를 정리한 안정화 버전입니다.

## 플레이 흐름

- 로비에서 클래스, 무기, 구역, 도전, 런 모드, 이벤트, 심연 단계를 선택합니다.
- Canvas 드래그 또는 WASD/방향키로 이동합니다.
- 플레이어는 가장 가까운 적을 자동 공격합니다.
- 경험치 보석을 모아 레벨업하고 능력, 진화, 유물, 보조무기를 선택합니다.
- 생존 모드는 5분 생존이 클리어 조건이며, 보스 처치는 최종 웨이브를 여는 중간 목표입니다.
- 보스 러시는 여러 보스를 순서대로 처치하는 별도 모드입니다.
- 결과에 따라 심연 조각, 임무 보상, 숙련도, 해금, 엔드게임 기록이 저장됩니다.

## 구현된 주요 시스템

- 클래스, 시작 무기, 보조무기, 구역, 도전 모드, 이벤트 런
- 5분 생존 모드와 보스 러시
- v8 심연 지도 선택: 생존 모드 중간 경로 선택과 결과 화면 경로 표시
- v9 엔드게임: 심연 왕좌, 최종 보스, 변종 보스, 심연 10/15/20 첫 클리어 보상
- 공격별 누적 데미지, 히트 수, 보스/정예 데미지, DPS 결과 표시
- localStorage 저장과 migration/fallback
- 유니코드 아이콘 fallback과 카드/선택지 아이콘 정렬
- 가벼운 PWA: manifest, service worker, 앱 아이콘

## PWA

GitHub Pages 또는 로컬 HTTPS/localhost에서 접속하면 브라우저가 설치 가능한 앱으로 인식할 수 있습니다.

캐시 버전은 `service-worker.js`의 `CACHE_NAME = "abyss-survivor-v10.0.0"`로 관리합니다. 업데이트가 바로 반영되지 않으면 브라우저 새로고침, 앱 재실행, 또는 사이트 데이터 삭제 후 다시 접속하세요.

캐시 대상은 게임 실행에 필요한 최소 파일입니다. `test-runner.html`과 문서 파일은 캐시하지 않습니다.

## 실행 방법

저장소 루트의 `index.html`을 브라우저에서 열면 실행됩니다. PWA와 service worker 동작까지 확인하려면 로컬 서버나 GitHub Pages에서 실행하세요.

## 테스트 방법

`test-runner.html`을 브라우저에서 열어 다음 항목을 확인합니다.

- 모듈 로딩과 일반 script 순서
- 저장 데이터 migration/fallback
- 상태 전환 중 전투 업데이트 정지
- 보상 중복 지급 방어
- NaN/Infinity 방어와 damageStats
- 생존 모드와 보스 러시 분리
- v8 지도 선택 상태 전환
- v9 엔드게임 첫 클리어 보상 중복 방어
- 아이콘 fallback
- manifest/service worker/PWA 아이콘 연결

## 파일 구조

- `index.html`: 게임 화면과 일반 script 로딩
- `style.css`: 모바일 세로 UI, 아이콘 정렬, 오버레이
- `data.js`: 게임 데이터, 아이콘 fallback
- `state.js`: 저장 데이터, migration, 런 생성, 보상 처리
- `game.js`: 전투 업데이트, 모드별 진행, 데미지 통계
- `render.js`: Canvas 렌더링
- `ui.js`: HUD, 로비, 선택지, 결과 화면
- `main.js`: 초기화, 루프, service worker 등록
- `manifest.json`: PWA manifest
- `service-worker.js`: v10 캐시
- `icons/icon-192.png`, `icons/icon-512.png`: PWA 앱 아이콘
- `test-runner.html`: 브라우저 기반 최종 검수

## 개발 조건

- 순수 HTML, CSS, JavaScript만 사용
- import/export, ES Module, 외부 라이브러리, npm, 번들러 금지
- 일반 `<script src="">` 로딩 유지
- `window.AbyssSurvivor` 전역 네임스페이스 유지
- 기존 `localStorage` 저장 데이터 삭제 금지, fallback으로 보정
