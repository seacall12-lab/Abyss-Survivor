(function () {
  "use strict";

  const AS = window.AbyssSurvivor || {};
  const storageKey = AS.Data && AS.Data.storageKey ? AS.Data.storageKey : "abyssSurvivorSave";
  const results = [];
  let originalStorage = null;
  let storageAvailable = false;

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message || "검증 조건을 만족하지 못했습니다.");
    }
  }

  function assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error((message || "값이 일치하지 않습니다.") + " (expected: " + expected + ", actual: " + actual + ")");
    }
  }

  function assertFinite(value, message) {
    assert(Number.isFinite(value), (message || "유한한 숫자가 아닙니다.") + " (actual: " + value + ")");
  }

  function test(name, callback) {
    try {
      callback();
      results.push({ name: name, passed: true });
    } catch (error) {
      results.push({
        name: name,
        passed: false,
        error: error && error.stack ? error.stack : String(error)
      });
    }
  }

  function backupStorage() {
    try {
      originalStorage = window.localStorage.getItem(storageKey);
      storageAvailable = true;
    } catch (error) {
      storageAvailable = false;
    }
  }

  function restoreStorage() {
    if (!storageAvailable) {
      return;
    }

    try {
      if (originalStorage === null) {
        window.localStorage.removeItem(storageKey);
      } else {
        window.localStorage.setItem(storageKey, originalStorage);
      }
    } catch (error) {
      results.push({ name: "원래 저장 데이터 복원", passed: false, error: String(error) });
    }
  }

  function useFreshSave() {
    AS.State.save = AS.State.createDefaultSave();
    AS.State.current = null;
    return AS.State.save;
  }

  function renderResults() {
    const summary = document.getElementById("summary");
    const list = document.getElementById("results");
    const passed = results.filter(function (result) { return result.passed; }).length;
    const failed = results.length - passed;

    summary.textContent = failed === 0
      ? "전체 " + results.length + "개 테스트 통과"
      : passed + "개 통과, " + failed + "개 실패";
    summary.classList.add(failed === 0 ? "pass" : "fail");
    document.title = failed === 0 ? "PASS · Abyss Survivor" : "FAIL · Abyss Survivor";

    results.forEach(function (result) {
      const item = document.createElement("li");
      item.className = result.passed ? "pass" : "fail";
      item.textContent = (result.passed ? "통과 · " : "실패 · ") + result.name;
      if (result.error) {
        const detail = document.createElement("pre");
        detail.textContent = result.error;
        item.appendChild(detail);
      }
      list.appendChild(item);
    });

    window.AbyssTestResults = {
      total: results.length,
      passed: passed,
      failed: failed,
      results: results.slice()
    };
  }

  backupStorage();

  try {
    test("필수 게임 모듈 로드", function () {
      assert(AS.Data, "Data 모듈이 없습니다.");
      assert(AS.State, "State 모듈이 없습니다.");
      assert(AS.Feedback, "Feedback 모듈이 없습니다.");
      assert(AS.Game, "Game 모듈이 없습니다.");
      assert(AS.Render, "Render 모듈이 없습니다.");
      assert(AS.UI, "UI 모듈이 없습니다.");
      assert(AS.PWA, "PWA 모듈이 없습니다.");
    });

    test("기본 저장 데이터 스키마", function () {
      const save = AS.State.createDefaultSave();
      assertEqual(save.version, 9, "저장 버전이 다릅니다.");
      assertEqual(save.selectedClassId, "wanderer");
      assertEqual(save.selectedWeaponId, "abyssBullet");
      assertEqual(save.selectedRunModeId, "survival");
      assert(save.settings && save.unlocks && save.stats && save.missions && save.endgame, "필수 저장 영역이 없습니다.");
      assertEqual(save.settings.soundEnabled, true);
      assertEqual(save.settings.vibrationEnabled, true);
      assertEqual(save.settings.screenShakeEnabled, true);
    });

    test("손상된 JSON 저장값 기본 복구", function () {
      if (!storageAvailable) {
        return;
      }
      window.localStorage.setItem(storageKey, "{broken-json");
      AS.State.save = null;
      const save = AS.State.loadSave();
      assertEqual(save.selectedClassId, "wanderer");
      assertEqual(save.shards, 0);
    });

    test("잘못된 선택값과 숫자 저장값 보정", function () {
      if (!storageAvailable) {
        return;
      }
      window.localStorage.setItem(storageKey, JSON.stringify({
        version: 1,
        shards: -50,
        bestTime: "not-a-number",
        selectedClassId: "missing-class",
        selectedWeaponId: "missing-weapon",
        selectedZoneId: "missing-zone",
        selectedRunModeId: "missing-mode"
      }));
      AS.State.save = null;
      const save = AS.State.loadSave();
      assertEqual(save.selectedClassId, "wanderer");
      assertEqual(save.selectedWeaponId, "abyssBullet");
      assertEqual(save.selectedZoneId, "riftGate");
      assertEqual(save.selectedRunModeId, "survival");
      assertFinite(save.bestTime);
      assertFinite(save.shards);
    });

    test("게임 시작 시 상태와 도전 횟수 갱신", function () {
      const save = useFreshSave();
      const before = save.totalRuns;
      const run = AS.State.startRun();
      assertEqual(run.mode, AS.Data.states.running);
      assertEqual(AS.State.getSave().totalRuns, before + 1);
    });

    test("일시정지 상태에서는 전투 시간이 흐르지 않음", function () {
      useFreshSave();
      const run = AS.State.startRun();
      run.time = 12;
      AS.State.setMode(AS.Data.states.paused);
      AS.Game.update(run, 0.05);
      assertEqual(run.time, 12);
    });

    test("실행 상태의 delta 상한 적용", function () {
      useFreshSave();
      const run = AS.State.startRun();
      run.time = 0;
      AS.Game.update(run, 10);
      assert(run.time > 0, "실행 상태에서 시간이 증가하지 않았습니다.");
      assert(run.time <= 0.05, "한 프레임 delta 상한을 초과했습니다.");
    });

    test("게임 종료 보상 중복 지급 방지", function () {
      useFreshSave();
      const run = AS.State.startRun();
      run.time = 90;
      run.kills = 25;
      run.runMissions = [];
      AS.State.finishRun(false);
      const firstShards = AS.State.getSave().shards;
      const firstStats = AS.State.getSave().stats.totalKills;
      AS.State.finishRun(false);
      assertEqual(AS.State.getSave().shards, firstShards, "조각 보상이 중복 지급되었습니다.");
      assertEqual(AS.State.getSave().stats.totalKills, firstStats, "통계가 중복 반영되었습니다.");
      assertEqual(run.mode, AS.Data.states.gameover);
    });

    test("피해 통계의 NaN·Infinity 방어", function () {
      useFreshSave();
      const run = AS.State.startRun();
      AS.Game.recordDamage(run, "test", "테스트 공격", NaN, null);
      AS.Game.recordDamage(run, "test", "테스트 공격", Infinity, null);
      AS.Game.recordDamage(run, "test", "테스트 공격", 25, { isBoss: true });
      const ranking = AS.Game.getDamageRanking(run, 5);
      assertEqual(ranking.length, 1);
      assertEqual(ranking[0].damage, 25);
      assertEqual(ranking[0].bossDamage, 25);
      assertFinite(ranking[0].dps);
    });

    test("Canvas가 기기 픽셀 배율에 맞는 버퍼 사용", function () {
      const canvas = document.createElement("canvas");
      const logicalWidth = AS.Data.game.width;
      const logicalHeight = AS.Data.game.height;
      const expectedRatio = Math.max(1, Math.min(window.devicePixelRatio || 1, AS.Data.game.maxCanvasPixelRatio));

      assert(AS.Render.init(canvas), "Canvas 2D context를 초기화하지 못했습니다.");
      assertEqual(canvas.width, Math.round(logicalWidth * expectedRatio));
      assertEqual(canvas.height, Math.round(logicalHeight * expectedRatio));
      assertEqual(AS.Render.getPixelRatio(), expectedRatio);

      useFreshSave();
      const run = AS.State.startRun();
      run.enemies = [
        { type: "normal", x: 120, y: 180, radius: 10, hp: 10, maxHp: 10, color: "#6bb7d6" },
        { type: "fast", x: 160, y: 180, radius: 9, hp: 8, maxHp: 10, color: "#9cf070" },
        { type: "tank", x: 200, y: 180, radius: 14, hp: 20, maxHp: 25, color: "#f0b35f", elite: true },
        { type: "boss", x: 240, y: 180, radius: 24, hp: 80, maxHp: 100, color: "#d85c7a", isBoss: true, auraRadius: 48 }
      ];
      run.effects = [{ type: "warningCircle", x: 180, y: 280, radius: 42, life: 0.4, maxLife: 0.5 }];
      AS.Render.draw(run);
      assert(canvas.getContext("2d").getImageData(180 * expectedRatio, 280 * expectedRatio, 1, 1).data[3] > 0, "전투 렌더링 결과가 비어 있습니다.");
    });

    test("피드백 설정과 화면 흔들림 감소", function () {
      useFreshSave();
      const run = AS.State.startRun();

      AS.State.setSetting("soundEnabled", false);
      AS.State.setSetting("vibrationEnabled", false);
      AS.Feedback.emit("playerHit", run);
      assert(run.screenShakeTimer > 0, "피격 화면 흔들림이 생성되지 않았습니다.");
      AS.Feedback.update(run, 1);
      assertEqual(run.screenShakeTimer, 0);
      AS.State.setSetting("reducedEffects", true);
      AS.Feedback.emit("boss", run);
      assertEqual(run.screenShakeTimer, 0, "효과 줄이기 설정에서 흔들림이 생성되었습니다.");
    });

    test("잘못된 상태 전환 거부", function () {
      useFreshSave();
      const run = AS.State.resetRun();
      const originalMode = run.mode;
      AS.State.setMode("not-a-real-state");
      assertEqual(run.mode, originalMode);
    });
  } finally {
    restoreStorage();
    AS.State.save = null;
    AS.State.current = null;
    renderResults();
  }
})();
