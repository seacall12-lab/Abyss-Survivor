(function () {
  window.AbyssSurvivor = window.AbyssSurvivor || {};
  const AS = window.AbyssSurvivor;
  const Data = AS.Data || {};
  const states = Data.states || {
    title: "title",
    running: "running",
    paused: "paused",
    levelup: "levelup",
    gameover: "gameover",
    clear: "clear"
  };
  const storageKey = Data.storageKey || "abyssSurvivorSave";

  function warnStorage(message, error) {
    if (window.console && typeof window.console.warn === "function") {
      window.console.warn(message, error);
    }
  }

  function safeNumber(value, fallback) {
    const numberValue = Number(value);
    const safeFallback = Number.isFinite(Number(fallback)) ? Number(fallback) : 0;
    return Number.isFinite(numberValue) ? numberValue : safeFallback;
  }

  function safeInteger(value, fallback) {
    return Math.max(0, Math.floor(safeNumber(value, fallback)));
  }

  function copyObject(source) {
    return Object.assign({}, source || {});
  }

  function countCompletedMissions(missions) {
    const completed = missions && missions.completed ? missions.completed : {};
    let count = 0;
    let key;

    for (key in completed) {
      if (Object.prototype.hasOwnProperty.call(completed, key) && completed[key]) {
        count += 1;
      }
    }

    return count;
  }

  function createDefaultSave() {
    return {
      version: 4,
      bestTime: 0,
      bestKills: 0,
      totalRuns: 0,
      totalClears: 0,
      shards: 0,
      selectedClassId: "wanderer",
      selectedWeaponId: "abyssBullet",
      selectedZoneId: "riftGate",
      selectedChallengeId: "normal",
      upgrades: {
        vitality: 0,
        power: 0,
        growth: 0
      },
      missions: {
        completed: {},
        progress: {}
      }
    };
  }

  function sanitizeUpgradeMap(upgrades) {
    const source = upgrades && typeof upgrades === "object" ? upgrades : {};

    return {
      vitality: Math.min(10, safeInteger(source.vitality, 0)),
      power: Math.min(10, safeInteger(source.power, 0)),
      growth: Math.min(10, safeInteger(source.growth, 0))
    };
  }

  function sanitizeMissionMap(missions) {
    const source = missions && typeof missions === "object" ? missions : {};
    const completedSource = source.completed && typeof source.completed === "object" ? source.completed : {};
    const progressSource = source.progress && typeof source.progress === "object" ? source.progress : {};
    const completed = {};
    const progress = {};
    let key;

    for (key in completedSource) {
      if (Object.prototype.hasOwnProperty.call(completedSource, key) && completedSource[key]) {
        completed[key] = true;
      }
    }

    for (key in progressSource) {
      if (Object.prototype.hasOwnProperty.call(progressSource, key)) {
        progress[key] = safeInteger(progressSource[key], 0);
      }
    }

    return {
      completed: completed,
      progress: progress
    };
  }

  function sanitizeSave(save) {
    const base = createDefaultSave();
    const source = save && typeof save === "object" ? save : {};

    return {
      version: Math.max(base.version, safeInteger(source.version, base.version) || base.version),
      bestTime: Math.max(0, safeNumber(source.bestTime, base.bestTime)),
      bestKills: safeInteger(source.bestKills, base.bestKills),
      totalRuns: safeInteger(source.totalRuns, base.totalRuns),
      totalClears: safeInteger(source.totalClears, base.totalClears),
      shards: safeInteger(source.shards, base.shards),
      selectedClassId: findById(Data.classes, typeof source.selectedClassId === "string" ? source.selectedClassId : base.selectedClassId, "wanderer").id || "wanderer",
      selectedWeaponId: findById(Data.weapons, typeof source.selectedWeaponId === "string" ? source.selectedWeaponId : base.selectedWeaponId, "abyssBullet").id || "abyssBullet",
      selectedZoneId: findById(Data.zones, typeof source.selectedZoneId === "string" ? source.selectedZoneId : base.selectedZoneId, "riftGate").id || "riftGate",
      selectedChallengeId: findById(Data.challenges, typeof source.selectedChallengeId === "string" ? source.selectedChallengeId : base.selectedChallengeId, "normal").id || "normal",
      upgrades: sanitizeUpgradeMap(source.upgrades),
      missions: sanitizeMissionMap(source.missions)
    };
  }

  function findById(items, id, fallbackId) {
    const list = Array.isArray(items) ? items : [];
    let fallback = null;

    for (let i = 0; i < list.length; i += 1) {
      if (list[i].id === fallbackId) {
        fallback = list[i];
      }
      if (list[i].id === id) {
        return list[i];
      }
    }

    return fallback || list[0] || {};
  }

  function getChallenge(save) {
    return findById(Data.challenges, save && save.selectedChallengeId, "normal");
  }

  function getChallengeModifiers(save) {
    const challenge = getChallenge(save);
    return challenge.modifiers && typeof challenge.modifiers === "object" ? challenge.modifiers : {};
  }

  function createPlayer() {
    const fallbackPlayer = {
      x: 180,
      y: 280,
      radius: 12,
      maxHp: 100,
      hp: 100,
      speed: 145,
      damage: 12,
      attackCooldown: 0.55,
      projectileSpeed: 280,
      projectileRadius: 4,
      pickupRadius: 32,
      invincibleTime: 0.6
    };
    const source = copyObject(Data.player || fallbackPlayer);
    const save = AS.State && AS.State.getSave ? AS.State.getSave() : sanitizeSave(null);
    const selectedClass = findById(Data.classes, save.selectedClassId, "wanderer");
    const modifiers = getChallengeModifiers(save);
    const upgrades = sanitizeUpgradeMap(save.upgrades);
    const maxHp = Math.max(1, (safeNumber(source.maxHp, fallbackPlayer.maxHp) * safeNumber(selectedClass.maxHpMultiplier, 1) + upgrades.vitality * 5) * safeNumber(modifiers.playerMaxHpMultiplier, 1));
    const speed = safeNumber(source.speed, fallbackPlayer.speed) * safeNumber(selectedClass.speedMultiplier, 1);
    const damage = (safeNumber(source.damage, fallbackPlayer.damage) * safeNumber(selectedClass.damageMultiplier, 1) + upgrades.power) * safeNumber(modifiers.playerDamageMultiplier, 1);
    const attackCooldown = safeNumber(source.attackCooldown, fallbackPlayer.attackCooldown) * safeNumber(selectedClass.attackCooldownMultiplier, 1);
    const pickupRadius = safeNumber(source.pickupRadius, fallbackPlayer.pickupRadius) + safeNumber(selectedClass.pickupRadiusBonus, 0) + upgrades.growth * 3;

    return {
      x: safeNumber(source.x, fallbackPlayer.x),
      y: safeNumber(source.y, fallbackPlayer.y),
      radius: Math.max(1, safeNumber(source.radius, fallbackPlayer.radius)),
      maxHp: maxHp,
      hp: maxHp,
      speed: Math.max(0, speed),
      damage: Math.max(1, damage),
      attackCooldown: Math.max(0.15, attackCooldown),
      projectileSpeed: Math.max(0, safeNumber(source.projectileSpeed, fallbackPlayer.projectileSpeed)),
      projectileRadius: Math.max(1, safeNumber(source.projectileRadius, fallbackPlayer.projectileRadius)),
      pickupRadius: Math.max(1, pickupRadius),
      invincibleTime: Math.max(0, safeNumber(source.invincibleTime, fallbackPlayer.invincibleTime)),
      damageTakenMultiplier: Math.max(0.1, safeNumber(selectedClass.damageTakenMultiplier, 1)),
      expMultiplier: 1,
      gemHealChance: 0,
      gemHealAmount: 0,
      orbitalDamageMultiplier: 1,
      novaRadiusBonus: 0,
      novaCooldownBonus: 0
    };
  }

  function createInitialRun() {
    const game = Data.game || {};
    const save = AS.State && AS.State.getSave ? AS.State.getSave() : sanitizeSave(null);
    const challenge = getChallenge(save);
    const modifiers = getChallengeModifiers(save);
    const runDuration = Math.max(1, safeNumber(modifiers.runDuration, safeNumber(game.runDuration, 180)));
    const bossSpawnTime = Math.max(1, safeNumber(modifiers.bossSpawnTime, safeNumber(game.bossSpawnTime, 120)));
    const rewardMultiplier = Math.max(0, safeNumber(challenge.rewardMultiplier, 1));

    return {
      mode: states.title || "title",
      selectedClassId: save.selectedClassId || "wanderer",
      selectedWeaponId: save.selectedWeaponId || "abyssBullet",
      selectedZoneId: save.selectedZoneId || "riftGate",
      selectedChallengeId: save.selectedChallengeId || "normal",
      runDuration: runDuration,
      bossSpawnTime: bossSpawnTime,
      rewardMultiplier: rewardMultiplier,
      challengeModifiers: copyObject(modifiers),
      time: 0,
      remainingTime: runDuration,
      kills: 0,
      level: 1,
      exp: 0,
      expToNext: 20,
      pendingAbilities: [],
      abilityLevels: {},
      evolutions: {
        piercingShot: false,
        splitShot: false,
        orbitalShield: false,
        abyssNova: false
      },
      bossSpawned: false,
      bossDefeated: false,
      finished: false,
      rewardGranted: false,
      missionChecked: false,
      shardReward: 0,
      baseShardReward: 0,
      missionShardReward: 0,
      completedMissionIds: [],
      eliteKills: 0,
      relics: [],
      relicChoices: [],
      relicOfferCount: 0,
      buildBonuses: [],

      player: createPlayer(),
      input: {
        active: false,
        moveX: 0,
        moveY: 0,
        pointerId: null,
        keys: {}
      },
      enemies: [],
      projectiles: [],
      gems: [],
      orbitals: [],
      effects: [],

      spawnTimer: 0,
      attackTimer: 0,
      invincibleTimer: 0,
      messageTimer: 0,
      novaTimer: 0,
      novaPulseTimer: 0,
      message: ""
    };
  }

  function isKnownMode(mode) {
    let key;

    for (key in states) {
      if (Object.prototype.hasOwnProperty.call(states, key) && states[key] === mode) {
        return true;
      }
    }

    return false;
  }

  function countRunEvolutions(run) {
    const evolutions = run && run.evolutions ? run.evolutions : {};
    let count = 0;
    let key;

    for (key in evolutions) {
      if (Object.prototype.hasOwnProperty.call(evolutions, key) && evolutions[key]) {
        count += 1;
      }
    }

    return count;
  }

  function getMissionValue(run, missionId, shardReward, isClear) {
    if (missionId === "runKills100") {
      return safeInteger(run.kills, 0);
    }
    if (missionId === "bossKill") {
      return isClear || run.bossDefeated ? 1 : 0;
    }
    if (missionId === "twoEvolutions") {
      return countRunEvolutions(run);
    }
    if (missionId === "twoRelics") {
      return (run.relics || []).length;
    }
    if (missionId === "earn30Shards") {
      return safeInteger(shardReward, 0);
    }
    if (missionId === "challenge120") {
      return run.selectedChallengeId !== "normal" ? Math.floor(safeNumber(run.time, 0)) : 0;
    }
    if (missionId === "eliteKills3") {
      return safeInteger(run.eliteKills, 0);
    }
    return 0;
  }

  function applyMissionRewards(save, run, shardReward, isClear) {
    const missions = Array.isArray(Data.missions) ? Data.missions : [];
    const missionState = sanitizeMissionMap(save.missions);
    let reward = 0;

    if (run.missionChecked) {
      return 0;
    }

    run.missionChecked = true;
    run.completedMissionIds = [];

    for (let i = 0; i < missions.length; i += 1) {
      const mission = missions[i];
      const target = Math.max(1, safeInteger(mission.target, 1));
      const value = Math.min(target, getMissionValue(run, mission.id, shardReward, isClear));
      missionState.progress[mission.id] = Math.max(safeInteger(missionState.progress[mission.id], 0), value);

      if (!missionState.completed[mission.id] && value >= target) {
        missionState.completed[mission.id] = true;
        reward += safeInteger(mission.reward, 0);
        run.completedMissionIds.push(mission.id);
      }
    }

    save.missions = missionState;
    run.missionShardReward = Math.max(0, reward);
    run.missionCompletedCount = countCompletedMissions(missionState);
    return reward;
  }

  AS.State = {
    current: null,
    save: null,

    createDefaultSave: createDefaultSave,

    loadSave: function () {
      let parsed = null;
      let raw = null;

      try {
        raw = window.localStorage ? window.localStorage.getItem(storageKey) : null;
      } catch (error) {
        warnStorage("저장 데이터를 불러오지 못했습니다.", error);
      }

      if (raw) {
        try {
          parsed = JSON.parse(raw);
        } catch (error) {
          warnStorage("저장 데이터가 손상되어 기본값으로 복구합니다.", error);
        }
      }

      this.save = sanitizeSave(parsed);
      return this.save;
    },

    writeSave: function () {
      if (!this.save) {
        this.save = createDefaultSave();
      }

      this.save = sanitizeSave(this.save);

      try {
        if (window.localStorage) {
          window.localStorage.setItem(storageKey, JSON.stringify(this.save));
        }
      } catch (error) {
        warnStorage("저장 데이터를 기록하지 못했습니다.", error);
      }

      return this.save;
    },

    resetSave: function () {
      this.save = createDefaultSave();
      this.writeSave();
      return this.save;
    },

    createInitialRun: createInitialRun,

    resetRun: function () {
      this.current = createInitialRun();
      return this.current;
    },

    startRun: function () {
      const run = this.resetRun();
      const save = this.getSave();

      run.mode = states.running || "running";
      save.totalRuns = safeInteger(save.totalRuns, 0) + 1;
      this.writeSave();

      return run;
    },

    setMode: function (mode) {
      if (!mode || !isKnownMode(mode)) {
        return this.getRun();
      }

      if (!this.current) {
        this.resetRun();
      }

      this.current.mode = mode;
      return this.current;
    },

    getRun: function () {
      if (!this.current) {
        this.resetRun();
      }

      return this.current;
    },

    getSave: function () {
      if (!this.save) {
        this.loadSave();
      }

      return this.save;
    },

    finishRun: function (isClear) {
      const run = this.getRun();
      const save = this.getSave();
      const runTime = Math.max(0, safeNumber(run.time, 0));
      const runKills = safeInteger(run.kills, 0);
      const killReward = Math.floor(runKills / 5);
      const timeReward = Math.floor(runTime / 30);
      const clearReward = isClear ? 20 : 0;
      const baseShardReward = Math.max(0, safeInteger(killReward + timeReward + clearReward, 0));
      const shardReward = Math.max(0, Math.floor(baseShardReward * Math.max(0, safeNumber(run.rewardMultiplier, 1))));
      let missionReward = 0;

      if (run.rewardGranted) {
        return save;
      }

      run.finished = true;
      run.rewardGranted = true;
      run.baseShardReward = baseShardReward;
      run.shardReward = shardReward;
      missionReward = applyMissionRewards(save, run, shardReward, isClear);
      save.bestTime = Math.max(safeNumber(save.bestTime, 0), runTime);
      save.bestKills = Math.max(safeInteger(save.bestKills, 0), runKills);
      save.shards = safeInteger(save.shards, 0) + shardReward + missionReward;

      if (isClear) {
        save.totalClears = safeInteger(save.totalClears, 0) + 1;
        run.mode = states.clear || "clear";
      } else {
        run.mode = states.gameover || "gameover";
      }

      this.writeSave();
      return save;
    },

    setSelectedClass: function (classId) {
      const save = this.getSave();
      save.selectedClassId = findById(Data.classes, classId, "wanderer").id || "wanderer";
      this.writeSave();
      return save;
    },

    setSelectedWeapon: function (weaponId) {
      const save = this.getSave();
      save.selectedWeaponId = findById(Data.weapons, weaponId, "abyssBullet").id || "abyssBullet";
      this.writeSave();
      return save;
    },

    setSelectedZone: function (zoneId) {
      const save = this.getSave();
      save.selectedZoneId = findById(Data.zones, zoneId, "riftGate").id || "riftGate";
      this.writeSave();
      return save;
    },

    setSelectedChallenge: function (challengeId) {
      const save = this.getSave();
      save.selectedChallengeId = findById(Data.challenges, challengeId, "normal").id || "normal";
      this.writeSave();
      return save;
    },

    getUpgradeCost: function (upgradeId) {
      const save = this.getSave();
      const currentLevel = safeInteger((save.upgrades || {})[upgradeId], 0);
      return 10 + currentLevel * 8;
    },

    buyUpgrade: function (upgradeId) {
      const save = this.getSave();
      const upgrades = save.upgrades || sanitizeUpgradeMap(null);
      const currentLevel = safeInteger(upgrades[upgradeId], 0);
      const cost = this.getUpgradeCost(upgradeId);

      if (!Object.prototype.hasOwnProperty.call(upgrades, upgradeId) || currentLevel >= 10 || safeInteger(save.shards, 0) < cost) {
        return false;
      }

      upgrades[upgradeId] = currentLevel + 1;
      save.upgrades = sanitizeUpgradeMap(upgrades);
      save.shards = Math.max(0, safeInteger(save.shards, 0) - cost);
      this.writeSave();
      return true;
    }
  };

  AS.State.loadSave();
  AS.State.resetRun();
})();
