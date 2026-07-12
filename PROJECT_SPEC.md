# Abyss Survivor PROJECT_SPEC

## 현재 구현 기준

현재 저장소는 v10.1 확장 단계다. 코드에는 v8 심연 지도 시스템과 v9 엔드게임 시스템이 반영되어 있으며, v10.1에서는 저장 호환성을 유지한 상태로 빌드/선택 편의 UI, 미니 목표, 보스/정예 예고, 접근성 난이도 보정을 추가한다.

## 개발 조건

```text
순수 HTML, CSS, JavaScript만 사용
ES Module, import/export 금지
외부 라이브러리, npm, 번들러 금지
일반 <script src=""> 로딩 유지
window.AbyssSurvivor 전역 네임스페이스 유지
GitHub Pages 루트 배포 기준 상대 경로 사용
localStorage abyssSurvivorSave 호환 유지
```

## 파일 구조

```text
index.html
style.css
data.js
state.js
feedback.js
game.js
render.js
ui.js
pwa.js
main.js
manifest.json
service-worker.js
icons/icon.svg
icons/icon-192.png
icons/icon-512.png
icons/apple-touch-icon.png
test-runner.html
tests.js
README.md
version-up.txt
development-history.txt
PROJECT_SPEC.md
```

## 스크립트 로딩 순서

```html
<script src="data.js"></script>
<script src="state.js"></script>
<script src="feedback.js"></script>
<script src="game.js"></script>
<script src="render.js"></script>
<script src="ui.js"></script>
<script src="pwa.js"></script>
<script src="main.js"></script>
```

## 전역 네임스페이스

```text
AbyssSurvivor.Data
AbyssSurvivor.State
AbyssSurvivor.Feedback
AbyssSurvivor.Game
AbyssSurvivor.Render
AbyssSurvivor.UI
AbyssSurvivor.PWA
AbyssSurvivor.Main
```

## 저장 데이터

저장 키는 `abyssSurvivorSave`다. 현재 schema 숫자는 `version: 9`를 유지한다. v10은 schema 숫자를 올리지 않고 누락 필드와 잘못된 값을 fallback으로 보정한다.

주요 저장 필드:

```text
version
bestTime
bestKills
totalRuns
totalClears
shards
selectedClassId
selectedWeaponId
selectedZoneId
selectedChallengeId
selectedRunModeId
selectedEventId
upgrades
abyss
mastery
unlocks
stats
missions
endgame
settings
```

localStorage 접근 실패, JSON 파싱 실패, 누락 필드, 잘못된 selected id, NaN/Infinity 숫자는 기본값으로 복구한다. 기존 저장 데이터는 삭제하지 않는다. 새 설정과 성장 항목은 누락 시 기본값으로 보정한다.

## 게임 상태

```text
title
running
paused
mapChoice
levelup
gameover
clear
```

전투 업데이트는 `running`에서만 진행한다. `paused`, `mapChoice`, `levelup`, `gameover`, `clear`에서는 입력 이동값을 정리하고 전투 시간이 진행되지 않아야 한다.

## 구현된 주요 기능

```text
5분 생존 모드
보스 러시
이벤트 런
보조무기
공격별 데미지 통계
심연 단계
v8 심연 지도 선택
v9 엔드게임
유물/진화/임무/숙련도/해금
결과 화면 요약
아이콘 fallback
가벼운 PWA
빌드 현황 패널
레벨업 선택지 리롤/고정/제외
추천 조합 프리셋
접근성 난이도 보정
봉화 미니 목표
보스/정예 예고 표시
```

## PWA

```text
manifest.json
service-worker.js
icons/icon.svg
icons/icon-192.png
icons/icon-512.png
icons/apple-touch-icon.png
```

캐시명은 `abyss-survivor-v10.2.0`이다. manifest는 192px/512px PNG와 maskable 아이콘을 제공하고 iOS는 180px apple-touch-icon을 사용한다. Android 계열은 `beforeinstallprompt`, iOS는 홈 화면 추가 안내를 사용한다. 이미 standalone으로 실행 중이면 설치 버튼을 숨긴다. service worker는 게임 실행에 필요한 파일과 설치 아이콘을 캐시하고 `test-runner.html`, `tests.js`, 문서 파일은 캐시하지 않는다.

## 안정화 기준

```text
콘솔 치명 오류 없이 로딩
script 순서 유지
import/export 미사용
저장 데이터 migration/fallback 정상
상태 전환 중 전투 업데이트 정지
finishRun 중복 보상 방어
임무/숙련도/엔드게임 보상 중복 방어
NaN/Infinity 방어
객체 배열 상한 유지
생존 모드와 보스 러시 흐름 분리
v8 지도 선택 중 전투 정지와 결과 경로 표시
v9 최종 보스/변종 보스/첫 클리어 보상 중복 방어
아이콘 fallback과 정렬 유지
모바일 전체 페이지 스크롤 방지
PWA manifest/service worker/icon 연결
빌드 현황과 임무 HUD 표시
레벨업 선택지 시너지, 리롤, 고정, 제외 기능
추천 조합과 접근성 난이도 설정
효과음, 진동, 화면 흔들림과 효과 감소 설정
적 유형별 실루엣, 정예/보스 외곽선, 플레이어 중심 표식
능력 선택 카드의 신규/강화와 희귀도 정보 계층
봉화 미니 목표 완료/실패 기록
보스/정예 예고 effect 표시
```

## 테스트 기준

`test-runner.html`과 `tests.js`에서 저장값을 백업·복원하며 다음 항목을 자동 확인한다.

```text
필수 게임 모듈 로딩
기본 저장 스키마
손상된 JSON fallback
잘못된 선택 ID와 숫자 보정
게임 시작 상태와 도전 횟수 반영
일시정지 중 업데이트 정지
프레임 delta 상한
종료 보상과 통계의 중복 반영 방지
NaN/Infinity 피해와 damageStats 방어
기기 픽셀 배율에 따른 Canvas 버퍼 크기
피드백 설정 fallback과 화면 흔들림 감소
잘못된 상태 전환 거부
```
