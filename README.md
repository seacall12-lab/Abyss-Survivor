# Abyss Survivor

Abyss Survivor는 순수 HTML, CSS, JavaScript로 만든 모바일 세로 화면 기반 생존 로그라이트 게임입니다. 외부 라이브러리, ES Module, npm, 번들러 없이 GitHub Pages 루트 배포 기준으로 바로 실행됩니다.

## 현재 버전

v10.1 게임성/편의성 확장 / SVG-only PWA

이번 버전은 저장 데이터 호환성을 유지하면서 빌드 현황, 선택지 리롤/고정/제외, 추천 조합, 접근성 난이도, 미니 목표, 보스/정예 예고 표시를 추가한 확장 버전입니다.

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
- 런 중 빌드 현황 패널, 임무 HUD, 레벨업 선택지 시너지 표시
- 선택지 리롤/고정/제외와 추천 조합 프리셋
- 봉화 미니 목표와 위험 보상 구조
- 보스 돌진/장판, 정예 등장 예고 표시
- 표준/편의/도전 난이도 보정 설정
- 합성 효과음, 모바일 진동, 감쇠형 화면 흔들림과 개별 설정
- 일반·고속·탱크·정예·보스 실루엣 구분과 강화된 위험 예고
- 능력 선택 카드의 신규/강화·희귀도 동시 표시
- 공격별 누적 데미지, 히트 수, 보스/정예 데미지, DPS 결과 표시
- localStorage 저장과 migration/fallback
- 유니코드 아이콘 fallback과 카드/선택지 아이콘 정렬
- 설치 가능한 PWA: manifest, service worker, PNG/maskable/iOS 앱 아이콘

## PWA

Abyss Survivor는 192px/512px PNG 아이콘, maskable 아이콘, iOS 180px 아이콘을 제공하며 standalone 세로 앱으로 실행됩니다.

PWA 설치 테스트는 GitHub Pages 주소로 접속해서 진행하세요. `raw.githubusercontent.com` 주소는 올바른 웹앱 배포 환경이 아니므로 설치 테스트에 사용하지 않습니다.

Android Chrome/Edge에서는 설치 조건을 충족하면 로비에 `앱 설치` 버튼이 나타납니다. iPhone Safari에서는 로비의 `홈 화면에 설치` 버튼을 눌러 안내를 확인한 뒤 공유 메뉴에서 `홈 화면에 추가`를 선택합니다.

캐시 버전은 `service-worker.js`의 `CACHE_NAME = "abyss-survivor-v10.2.0"`로 관리합니다. 업데이트 후 이전 버전이 보이면 Chrome 사이트 데이터 삭제 또는 앱 재설치가 필요할 수 있습니다.

다음 수정 때는 `service-worker.js`의 `CACHE_NAME`을 반드시 올려야 합니다.

캐시 대상은 게임 실행에 필요한 최소 파일입니다. `test-runner.html`, `tests.js`, 문서 파일은 캐시하지 않습니다.

## 실행 방법

저장소 루트의 `index.html`을 브라우저에서 열면 실행됩니다. PWA와 service worker 동작까지 확인하려면 로컬 서버나 GitHub Pages에서 실행하세요.

## 테스트 방법

개발 중에는 `test-runner.html`을 브라우저에서 엽니다. 테스트 전 저장값을 백업하고 종료 시 원래 값으로 복원하며 다음 항목을 자동 확인합니다.

- 필수 게임 모듈 로딩
- 기본 저장 스키마와 손상 데이터 fallback
- 잘못된 선택 ID와 숫자 보정
- 게임 시작 상태와 도전 횟수
- 일시정지 중 전투 업데이트 정지
- 프레임 delta 상한
- 종료 보상과 통계의 중복 반영 방지
- NaN/Infinity 피해와 damageStats 방어
- 기기 픽셀 배율에 따른 Canvas 버퍼 크기
- 피드백 설정 fallback과 화면 흔들림 감소
- 잘못된 상태 전환 거부

## 파일 구조

- `index.html`: 게임 화면과 일반 script 로딩
- `style.css`: 모바일 세로 UI, 아이콘 정렬, 오버레이
- `data.js`: 게임 데이터, 아이콘 fallback
- `state.js`: 저장 데이터, migration, 런 생성, 보상 처리
- `feedback.js`: Web Audio 효과음, 진동, 화면 흔들림 상태
- `game.js`: 전투 업데이트, 모드별 진행, 데미지 통계
- `render.js`: 기기 픽셀 배율을 반영한 Canvas 렌더링
- `ui.js`: HUD, 로비, 선택지, 결과 화면
- `pwa.js`: 설치 프롬프트, standalone/iOS 설치 안내
- `main.js`: 초기화, 루프, service worker 등록
- `manifest.json`: PWA manifest
- `service-worker.js`: v10 캐시
- `icons/icon.svg`: 앱 아이콘 원본
- `icons/icon-192.png`, `icons/icon-512.png`: Android/데스크톱 설치 아이콘
- `icons/apple-touch-icon.png`: iPhone/iPad 홈 화면 아이콘
- `test-runner.html`: 저장값을 보호하는 내부 브라우저 테스트 화면
- `tests.js`: 상태·저장·보상·수치 회귀 테스트

## 개발 조건

- 순수 HTML, CSS, JavaScript만 사용
- import/export, ES Module, 외부 라이브러리, npm, 번들러 금지
- 일반 `<script src="">` 로딩 유지
- `window.AbyssSurvivor` 전역 네임스페이스 유지
- 기존 `localStorage` 저장 데이터 삭제 금지, fallback으로 보정
