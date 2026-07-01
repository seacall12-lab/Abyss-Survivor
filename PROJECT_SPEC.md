# Abyss Survivor PROJECT_SPEC

## 현재 구현 기준

현재 저장소는 v10.0 안정화 단계다. 코드에는 v8 심연 지도 시스템과 v9 엔드게임 시스템이 이미 반영되어 있으므로, v10에서는 새 대형 게임 기능을 만들지 않고 기존 기능의 로딩, 저장, 상태 전환, 보상, 아이콘, PWA, 테스트를 안정화한다.

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
game.js
render.js
ui.js
main.js
manifest.json
service-worker.js
icons/icon-192.png
icons/icon-512.png
test-runner.html
README.md
version-up.txt
development-history.txt
PROJECT_SPEC.md
```

## 스크립트 로딩 순서

```html
<script src="data.js"></script>
<script src="state.js"></script>
<script src="game.js"></script>
<script src="render.js"></script>
<script src="ui.js"></script>
<script src="main.js"></script>
```

## 전역 네임스페이스

```text
AbyssSurvivor.Data
AbyssSurvivor.State
AbyssSurvivor.Game
AbyssSurvivor.Render
AbyssSurvivor.UI
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

localStorage 접근 실패, JSON 파싱 실패, 누락 필드, 잘못된 selected id, NaN/Infinity 숫자는 기본값으로 복구한다. 기존 저장 데이터는 삭제하지 않는다.

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
```

## PWA

```text
manifest.json
service-worker.js
icons/icon-192.png
icons/icon-512.png
```

캐시명은 `abyss-survivor-v10.0.0`이다. service worker는 게임 실행에 필요한 최소 파일만 캐시한다. `test-runner.html`과 문서 파일은 캐시하지 않는다. 등록 실패는 게임 실행 실패로 이어지면 안 된다.

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
```

## 테스트 기준

`test-runner.html`에서 다음 항목을 확인한다.

```text
모듈 존재
일반 script 로딩
저장 데이터 fallback
상태 전환 중 업데이트 정지
보상 중복 방어
NaN/Infinity 방어
damageStats 방어
생존/보스 러시 분리
아이콘 fallback
v8 지도 선택
v9 엔드게임 보상 중복 방어
PWA 연결
```
