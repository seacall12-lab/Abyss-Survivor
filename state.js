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

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
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
      version: 5,
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
        growth: 0,
        masteryTraining: 0,
        combatSense: 0,
        abyssAdaptation: 0
      },
      abyss: {
        selectedDepth: 0,
        maxUnlockedDepth: 0,
        bestDepthByZone: {},
        bestClearByDepth: {}
      },
      mastery: {
        classes: {},
        weapons: {},
        zones: {}
      },
      unlocks: {
        classes: {
          wanderer: true,
          guardian: true,
          chaser: true
        },
        weapons: {
          abyssBullet: true,
          orbitBlade: true,
          lightningChain: true
        },
        zones: {
          riftGate: true,
          swampEdge: true,
          abyssCore: true
        },
        features: {
          abyssDepth: true,
          mastery: true,
          advancedUpgrades: false
        }
      },
      stats: {
        totalKills: 0,
        totalBossKills: 0,
        totalLevelUps: 0,
        totalRelicsTaken: 0,
        totalEliteKills: 0,
        totalPlayTime: 0
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
      growth: Math.min(10, safeInteger(source.growth, 0)),
      masteryTraining: Math.min(10, safeInteger(source.masteryTraining, 0)),
      combatSense: Math.min(10, safeInteger(source.combatSense, 0)),
      abyssAdaptation: Math.min(10, safeInteger(source.abyssAdaptation, 0))
    };
  }

  function sanitizeBooleanMap(source) {
    const input = source && typeof source === "object" ? source : {};
    const result = {};
    let key;

    for (key in input) {
      if (Object.prototype.hasOwnProperty.call(input, key) && input[key]) {
        result[key] = true;
      }
    }

    return result;
  }

  function sanitizeStatsMap(stats) {
    const source = stats && typeof stats === "object" ? stats : {};

    return {
      totalKills: safeInteger(source.totalKills, 0),
      totalBossKills: safeInteger(source.totalBossKills, 0),
      totalLevelUps: safeInteger(source.totalLevelUps, 0),
      totalRelicsTaken: safeInteger(source.totalRelicsTaken, 0),
      totalEliteKills: safeInteger(source.totalEliteKills, 0),
      totalPlayTime: Math.max(0, safeNumber(source.totalPlayTime, 0))
    };
  }

  function getMaxAbyssDepth() {
    return Math.max(0, safeInteger((Data.abyss || {}).maxDepth, 20));
  }

  function sanitizeAbyssMap(abyss) {
    const source = abyss && typeof abyss === "object" ? abyss : {};
    const maxDepth = getMaxAbyssDepth();
    const maxUnlockedDepth = clamp(safeInteger(source.maxUnlockedDepth, 0), 0, maxDepth);
    const selectedDepth = clamp(safeInteger(source.selectedDepth, 0), 0, maxUnlockedDepth);
    const bestDepthSource = source.bestDepthByZone && typeof source.bestDepthByZone === "object" ? source.bestDepthByZone : {};
    const bestClearSource = source.bestClearByDepth && typeof source.bestClearByDepth === "object" ? source.bestClearByDepth : {};
    const bestDepthByZone = {};
    const bestClearByDepth = {};
    let key;

    for (key in bestDepthSource) {
      if (Object.prototype.hasOwnProperty.call(bestDepthSource, key)) {
        bestDepthByZone[key] = clamp(safeInteger(bestDepthSource[key], 0), 0, maxDepth);
      }
    }

    for (key in bestClearSource) {
      if (Object.prototype.hasOwnProperty.call(bestClearSource, key) && bestClearSource[key]) {
        bestClearByDepth[String(clamp(safeInteger(key, 0), 0, maxDepth))] = true;
      }
    }

    return {
      selectedDepth: selectedDepth,
      maxUnlockedDepth: maxUnlockedDepth,
      bestDepthByZone: bestDepthByZone,
      bestClearByDepth: bestClearByDepth
    };
  }

  function sanitizeMasteryEntry(entry) {
    const source = entry && typeof entry === "object" ? entry : {};
    const maxLevel = Math.max(1, safeInteger((Data.mastery || {}).maxLevel, 10));
    const level = clamp(safeInteger(source.level, 1), 1, maxLevel);

    return {
      exp: level >= maxLevel ? 0 : safeInteger(source.exp, 0),
      level: level
    };
  }

  function sanitizeMasteryGroup(group) {
    const source = group && typeof group === "object" ? group : {};
    const result = {};
    let key;

    for (key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        result[key] = sanitizeMasteryEntry(source[key]);
      }
    }

    return result;
  }

  function sanitizeMasteryMap(mastery) {
    const source = mastery && typeof mastery === "object" ? mastery : {};

    return {
      classes: sanitizeMasteryGroup(source.classes),
      weapons: sanitizeMasteryGroup(source.weapons),
      zones: sanitizeMasteryGroup(source.zones)
    };
  }

  function defaultUnlocksForSource(source) {
    const unlocks = {
      classes: { wanderer: true, guardian: true, chaser: true },
      weapons: { abyssBullet: true, orbitBlade: true, lightningChain: true },
      zones: { riftGate: true, swampEdge: true, abyssCore: true },
      features: { abyssDepth: true, mastery: true, advancedUpgrades: false }
    };

    if (source && typeof source.selectedClassId === "string") {
      unlocks.classes[source.selectedClassId] = true;
    }
    if (source && typeof source.selectedWeaponId === "string") {
      unlocks.weapons[source.selectedWeaponId] = true;
    }
    if (source && typeof source.selectedZoneId === "string") {
      unlocks.zones[source.selectedZoneId] = true;
    }

    return unlocks;
  }

  function sanitizeUnlockMap(unlocks, source) {
    const base = defaultUnlocksForSource(source);
    const input = unlocks && typeof unlocks === "object" ? unlocks : {};

    return {
      classes: Object.assign(base.classes, sanitizeBooleanMap(input.classes)),
      weapons: Object.assign(base.weapons, sanitizeBooleanMap(input.weapons)),
      zones: Object.assign(base.zones, sanitizeBooleanMap(input.zones)),
      features: Object.assign(base.features, sanitizeBooleanMap(input.features))
    };
  }

  function isUnlocked(save, category, id) {
    const unlocks = save && save.unlocks ? save.unlocks : {};
    const group = unlocks[category] && typeof unlocks[category] === "object" ? unlocks[category] : {};
    return !!group[id];
  }

  function isFeatureUnlocked(save, featureId) {
    const features = save && save.unlocks && save.unlocks.features ? save.unlocks.features : {};
    return !!features[featureId];
  }

  function chooseUnlockedId(save, category, items, id, fallbackId) {
    const selected = findById(items, id, fallbackId);
    const fallback = findById(items, fallbackId, fallbackId);
    const list = Array.isArray(items) ? items : [];

    if (selected.id && isUnlocked(save, category, selected.id)) {
      return selected.id;
    }
    if (fallback.id && isUnlocked(save, category, fallback.id)) {
      return fallback.id;
    }
    for (let i = 0; i < list.length; i += 1) {
      if (list[i].id && isUnlocked(save, category, list[i].id)) {
        return list[i].id;
      }
    }

    return fallback.id || selected.id || fallbackId;
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
    const result = {
      version: Math.max(base.version, safeInteger(source.version, base.version) || base.version),
      bestTime: Math.max(0, safeNumber(source.bestTime, base.bestTime)),
      bestKills: safeInteger(source.bestKills, base.bestKills),
      totalRuns: safeInteger(source.totalRuns, base.totalRuns),
      totalClears: safeInteger(source.totalClears, base.totalClears),
      shards: safeInteger(source.shards, base.shards),
      selectedClassId: "wanderer",
      selectedWeaponId: "abyssBullet",
      selectedZoneId: "riftGate",
      selectedChallengeId: findById(Data.challenges, typeof source.selectedChallengeId === "string" ? source.selectedChallengeId : base.selectedChallengeId, "normal").id || "normal",
      upgrades: sanitizeUpgradeMap(source.upgrades),
      abyss: sanitizeAbyssMap(source.abyss),
      mastery: sanitizeMasteryMap(source.mastery),
      unlocks: sanitizeUnlockMap(source.unlocks, source),
      stats: sanitizeStatsMap(source.stats),
      missions: sanitizeMissionMap(source.missions)
    };

    checkUnlocks(result);
    result.selectedClassId = chooseUnlockedId(result, "classes", Data.classes, typeof source.selectedClassId === "string" ? source.selectedClassId : base.selectedClassId, "wanderer");
    result.selectedWeaponId = chooseUnlockedId(result, "weapons", Data.weapons, typeof source.selectedWeaponId === "string" ? source.selectedWeaponId : base.selectedWeaponId, "abyssBullet");
    result.selectedZoneId = chooseUnlockedId(result, "zones", Data.zones, typeof source.selectedZoneId === "string" ? source.selectedZoneId : base.selectedZoneId, "riftGate");
    result.abyss.selectedDepth = clamp(safeInteger(result.abyss.selectedDepth, 0), 0, safeInteger(result.abyss.maxUnlockedDepth, 0));
    return result;
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

  function getMasteryEntry(save, category, id) {
    const mastery = save && save.mastery ? save.mastery : {};
    const group = mastery[category] && typeof mastery[category] === "object" ? mastery[category] : {};
    return sanitizeMasteryEntry(group[id]);
  }

  function getMasteryLevel(save, category, id) {
    return safeInteger(getMasteryEntry(save, category, id).level, 1);
  }

  function getMasteryRequiredExp(level) {
    const mastery = Data.mastery || {};
    return Math.max(1, safeInteger(mastery.baseRequiredExp, 40) + Math.max(0, safeInteger(level, 1) - 1) * safeInteger(mastery.requiredExpPerLevel, 30));
  }

  function getAbyssModifiers(depth, save) {
    const abyss = Data.abyss || {};
    const upgrades = sanitizeUpgradeMap(save && save.upgrades);
    const safeDepth = clamp(safeInteger(depth, 0), 0, getMaxAbyssDepth());
    const adaptation = clamp(safeInteger(upgrades.abyssAdaptation, 0), 0, 10);
    const damagePenaltyScale = clamp(1 - adaptation * 0.015, 0.75, 1);

    return {
      depth: safeDepth,
      enemyHpMultiplier: clamp(1 + safeDepth * safeNumber(abyss.enemyHpPerDepth, 0.08), 1, safeNumber(abyss.maxEnemyHpMultiplier, 3)),
      enemySpeedMultiplier: clamp(1 + safeDepth * safeNumber(abyss.enemySpeedPerDepth, 0.025), 1, safeNumber(abyss.maxEnemySpeedMultiplier, 1.6)),
      enemyDamageMultiplier: clamp(1 + safeDepth * safeNumber(abyss.enemyDamagePerDepth, 0.05) * damagePenaltyScale, 1, safeNumber(abyss.maxEnemyDamageMultiplier, 2.5)),
      bossHpMultiplier: clamp(1 + safeDepth * safeNumber(abyss.bossHpPerDepth, 0.1), 1, safeNumber(abyss.maxBossHpMultiplier, 3.5)),
      eliteChanceBonus: clamp(safeDepth * safeNumber(abyss.eliteChancePerDepth, 0.006), 0, safeNumber(abyss.maxEliteChanceBonus, 0.15)),
      rewardMultiplier: clamp(1 + safeDepth * safeNumber(abyss.rewardPerDepth, 0.08), 1, safeNumber(abyss.maxRewardMultiplier, 2.8))
    };
  }

  function hasClearDepth(save, depth) {
    const bestClear = save && save.abyss && save.abyss.bestClearByDepth ? save.abyss.bestClearByDepth : {};
    return !!bestClear[String(safeInteger(depth, 0))];
  }

  function getUnlockMessage(category, id) {
    if (category === "classes" && id === "bloodSeeker") {
      return "총 처치 300 이상";
    }
    if (category === "classes" && id === "engineer") {
      return "총 런 5회 이상";
    }
    if (category === "classes" && id === "abyssApostle") {
      return "심연 3단계 클리어";
    }
    if (category === "weapons" && id === "bloodScythe") {
      return "흡혈자 해금 또는 클리어 1회";
    }
    if (category === "weapons" && id === "riftSpear") {
      return "보스 처치 3회";
    }
    if (category === "weapons" && id === "starDust") {
      return "레벨업 선택 누적 30회";
    }
    if (category === "zones" && id === "brokenSanctum") {
      return "심연 2단계 클리어";
    }
    if (category === "zones" && id === "deadCorridor") {
      return "총 처치 800 이상";
    }
    if (category === "zones" && id === "stormRift") {
      return "심연 4단계 클리어";
    }
    if (category === "features" && id === "advancedUpgrades") {
      return "심연 0단계 클리어";
    }
    return "조건 달성 필요";
  }

  function meetsUnlockCondition(save, category, id) {
    const stats = save && save.stats ? save.stats : {};
    const totalKills = safeInteger(stats.totalKills, 0);
    const totalRuns = safeInteger(save && save.totalRuns, 0);
    const totalClears = safeInteger(save && save.totalClears, 0);
    const totalBossKills = safeInteger(stats.totalBossKills, 0);
    const totalLevelUps = safeInteger(stats.totalLevelUps, 0);

    if (category === "classes" && id === "bloodSeeker") {
      return totalKills >= 300;
    }
    if (category === "classes" && id === "engineer") {
      return totalRuns >= 5;
    }
    if (category === "classes" && id === "abyssApostle") {
      return hasClearDepth(save, 3);
    }
    if (category === "weapons" && id === "bloodScythe") {
      return isUnlocked(save, "classes", "bloodSeeker") || totalClears >= 1;
    }
    if (category === "weapons" && id === "riftSpear") {
      return totalBossKills >= 3;
    }
    if (category === "weapons" && id === "starDust") {
      return totalLevelUps >= 30;
    }
    if (category === "zones" && id === "brokenSanctum") {
      return hasClearDepth(save, 2);
    }
    if (category === "zones" && id === "deadCorridor") {
      return totalKills >= 800;
    }
    if (category === "zones" && id === "stormRift") {
      return hasClearDepth(save, 4);
    }
    if (category === "features" && id === "advancedUpgrades") {
      return hasClearDepth(save, 0) || totalClears >= 1;
    }

    return false;
  }

  function checkUnlocks(save) {
    const unlocks = save && save.unlocks ? save.unlocks : null;
    const newlyUnlocked = [];
    const targets = {
      classes: ["bloodSeeker", "engineer", "abyssApostle"],
      weapons: ["bloodScythe", "riftSpear", "starDust"],
      zones: ["brokenSanctum", "deadCorridor", "stormRift"],
      features: ["advancedUpgrades"]
    };
    let category;

    if (!unlocks) {
      return newlyUnlocked;
    }

    for (category in targets) {
      if (Object.prototype.hasOwnProperty.call(targets, category)) {
        if (!unlocks[category]) {
          unlocks[category] = {};
        }
        for (let i = 0; i < targets[category].length; i += 1) {
          const id = targets[category][i];
          if (!unlocks[category][id] && meetsUnlockCondition(save, category, id)) {
            unlocks[category][id] = true;
            newlyUnlocked.push({ category: category, id: id, name: getUnlockName(category, id) });
          }
        }
      }
    }

    return newlyUnlocked;
  }

  function getUnlockName(category, id) {
    if (category === "classes") {
      return findById(Data.classes, id, id).name || id;
    }
    if (category === "weapons") {
      return findById(Data.weapons, id, id).name || id;
    }
    if (category === "zones") {
      return findById(Data.zones, id, id).name || id;
    }
    if (category === "features" && id === "advancedUpgrades") {
      return "고급 성장";
    }
    return id;
  }

  function getRewardMasteryMultiplier(save) {
    const classLevel = getMasteryLevel(save, "classes", save.selectedClassId);
    const weaponLevel = getMasteryLevel(save, "weapons", save.selectedWeaponId);
    const zoneLevel = getMasteryLevel(save, "zones", save.selectedZoneId);
    let multiplier = 1;

    if (classLevel >= 10) {
      multiplier += 0.05;
    }
    if (weaponLevel >= 10) {
      multiplier += 0.05;
    }
    if (zoneLevel >= 5) {
      multiplier += 0.05;
    }
    if (zoneLevel >= 10) {
      multiplier += 0.1;
    }

    return multiplier;
  }

  function createPlayer() {
    const game = Data.game || {};
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
    const classMasteryLevel = getMasteryLevel(save, "classes", save.selectedClassId);
    const zoneMasteryLevel = getMasteryLevel(save, "zones", save.selectedZoneId);
    const modifiers = getChallengeModifiers(save);
    const upgrades = sanitizeUpgradeMap(save.upgrades);
    const maxHp = Math.max(1, (safeNumber(source.maxHp, fallbackPlayer.maxHp) * safeNumber(selectedClass.maxHpMultiplier, 1) + upgrades.vitality * 5 + (classMasteryLevel >= 3 ? 3 : 0)) * safeNumber(modifiers.playerMaxHpMultiplier, 1));
    const speed = safeNumber(source.speed, fallbackPlayer.speed) * safeNumber(selectedClass.speedMultiplier, 1);
    const damage = (safeNumber(source.damage, fallbackPlayer.damage) * safeNumber(selectedClass.damageMultiplier, 1) + upgrades.power + (classMasteryLevel >= 5 ? 1 : 0)) * safeNumber(modifiers.playerDamageMultiplier, 1);
    const attackCooldown = safeNumber(source.attackCooldown, fallbackPlayer.attackCooldown) * safeNumber(selectedClass.attackCooldownMultiplier, 1);
    const pickupRadius = safeNumber(source.pickupRadius, fallbackPlayer.pickupRadius) + safeNumber(selectedClass.pickupRadiusBonus, 0) + upgrades.growth * 3 + (classMasteryLevel >= 7 ? 3 : 0);
    const worldWidth = Math.max(safeNumber(game.width, 360), safeNumber(game.worldWidth, safeNumber(game.width, 360)));
    const worldHeight = Math.max(safeNumber(game.height, 560), safeNumber(game.worldHeight, safeNumber(game.height, 560)));

    return {
      x: worldWidth / 2,
      y: worldHeight / 2,
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
      expMultiplier: zoneMasteryLevel >= 3 ? 1.03 : 1,
      gemHealChance: 0,
      gemHealAmount: 0,
      orbitalDamageMultiplier: 1,
      lifeStealOnKill: Math.max(0, safeNumber(selectedClass.lifeStealOnKill, 0)),
      killHealMultiplier: 1,
      mineBonus: Math.max(0, safeInteger(selectedClass.mineBonus, 0)),
      chainBonus: Math.max(0, safeInteger(selectedClass.chainBonus, 0)),
      abyssPowerBonus: Math.max(0, safeNumber(selectedClass.abyssPowerBonus, 0)),
      effectDurationMultiplier: Math.max(0.1, safeNumber(selectedClass.effectDurationMultiplier, 1)),
      meleeDamageMultiplier: 1,
      lineDamageMultiplier: 1,
      spreadDamageMultiplier: 1,
      chainDamageMultiplier: 1,
      explosionDamageMultiplier: 1,
      waveDamageMultiplier: 1,
      mineRadiusMultiplier: 1,
      explosionRadiusMultiplier: 1,
      waveRadiusMultiplier: 1,
      eliteDamageMultiplier: (1 + upgrades.combatSense * 0.02) * (zoneMasteryLevel >= 7 ? 1.05 : 1),
      bossDamageMultiplier: 1 + upgrades.combatSense * 0.02,
      projectilePierceBonus: 0,
      novaRadiusBonus: 0,
      novaCooldownBonus: 0
    };
  }

  function createInitialRun() {
    const game = Data.game || {};
    const save = AS.State && AS.State.getSave ? AS.State.getSave() : sanitizeSave(null);
    const challenge = getChallenge(save);
    const zone = findById(Data.zones, save.selectedZoneId, "riftGate");
    const modifiers = getChallengeModifiers(save);
    const selectedDepth = clamp(safeInteger(save.abyss && save.abyss.selectedDepth, 0), 0, safeInteger(save.abyss && save.abyss.maxUnlockedDepth, 0));
    const abyssModifiers = getAbyssModifiers(selectedDepth, save);
    const runDuration = Math.max(1, safeNumber(modifiers.runDuration, safeNumber(game.runDuration, 180)));
    const bossSpawnTime = Math.max(1, safeNumber(modifiers.bossSpawnTime, safeNumber(game.bossSpawnTime, 120)));
    const rewardMultiplier = clamp(safeNumber(challenge.rewardMultiplier, 1) * safeNumber(zone.rewardMultiplier, 1) * safeNumber(abyssModifiers.rewardMultiplier, 1) * getRewardMasteryMultiplier(save), 0, 4);
    const viewportWidth = Math.max(1, safeNumber(game.width, 360));
    const viewportHeight = Math.max(1, safeNumber(game.height, 560));
    const worldWidth = Math.max(viewportWidth, safeNumber(game.worldWidth, viewportWidth));
    const worldHeight = Math.max(viewportHeight, safeNumber(game.worldHeight, viewportHeight));
    const player = createPlayer();
    const camera = {
      x: Math.max(0, Math.min(worldWidth - viewportWidth, safeNumber(player.x, worldWidth / 2) - viewportWidth / 2)),
      y: Math.max(0, Math.min(worldHeight - viewportHeight, safeNumber(player.y, worldHeight / 2) - viewportHeight / 2)),
      width: viewportWidth,
      height: viewportHeight
    };

    return {
      mode: states.title || "title",
      selectedClassId: save.selectedClassId || "wanderer",
      selectedWeaponId: save.selectedWeaponId || "abyssBullet",
      selectedZoneId: save.selectedZoneId || "riftGate",
      selectedChallengeId: save.selectedChallengeId || "normal",
      selectedDepth: selectedDepth,
      abyssModifiers: abyssModifiers,
      weaponMasteryLevel: getMasteryLevel(save, "weapons", save.selectedWeaponId),
      runDuration: runDuration,
      bossSpawnTime: bossSpawnTime,
      rewardMultiplier: rewardMultiplier,
      challengeModifiers: Object.assign(copyObject(modifiers), {
        enemyHpMultiplier: safeNumber(modifiers.enemyHpMultiplier, 1) * safeNumber(abyssModifiers.enemyHpMultiplier, 1),
        enemySpeedMultiplier: safeNumber(modifiers.enemySpeedMultiplier, 1) * safeNumber(abyssModifiers.enemySpeedMultiplier, 1),
        enemyDamageMultiplier: safeNumber(modifiers.enemyDamageMultiplier, 1) * safeNumber(abyssModifiers.enemyDamageMultiplier, 1)
      }),
      world: {
        width: worldWidth,
        height: worldHeight
      },
      camera: camera,
      time: 0,
      remainingTime: runDuration,
      kills: 0,
      level: 1,
      exp: 0,
      expToNext: 24,
      pendingAbilities: [],
      abilityLevels: {},
      weaponGrowth: {},
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
      masteryGranted: false,
      unlockChecked: false,
      newlyUnlocked: [],
      depthUnlocked: false,
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

      player: player,
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
      damageTexts: [],

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

  function addMasteryExp(save, category, id, amount) {
    const mastery = save.mastery || sanitizeMasteryMap(null);
    const group = mastery[category] || {};
    const maxLevel = Math.max(1, safeInteger((Data.mastery || {}).maxLevel, 10));
    const result = sanitizeMasteryEntry(group[id]);
    let gained = Math.max(0, safeInteger(amount, 0));
    let leveled = false;

    while (gained > 0 && result.level < maxLevel) {
      const required = getMasteryRequiredExp(result.level);
      const needed = Math.max(1, required - safeInteger(result.exp, 0));
      const applied = Math.min(needed, gained);

      result.exp += applied;
      gained -= applied;

      if (result.exp >= required) {
        result.level += 1;
        result.exp = 0;
        leveled = true;
      }
    }

    group[id] = sanitizeMasteryEntry(result);
    mastery[category] = group;
    save.mastery = sanitizeMasteryMap(mastery);
    return { id: id, level: group[id].level, leveled: leveled };
  }

  function grantMastery(save, run, isClear) {
    const upgrades = sanitizeUpgradeMap(save.upgrades);
    const baseExp = Math.floor(safeNumber(run.time, 0) / 10) + Math.floor(safeInteger(run.kills, 0) / 10);
    const clearBonus = isClear ? 15 : 0;
    const depthBonus = safeInteger(run.selectedDepth, 0) * 2;
    const multiplier = 1 + upgrades.masteryTraining * 0.03;
    const masteryExp = Math.max(0, Math.floor((baseExp + clearBonus + depthBonus) * multiplier));
    const results = [];

    if (run.masteryGranted) {
      return results;
    }

    run.masteryGranted = true;
    results.push(addMasteryExp(save, "classes", run.selectedClassId || save.selectedClassId, masteryExp));
    results.push(addMasteryExp(save, "weapons", run.selectedWeaponId || save.selectedWeaponId, masteryExp));
    results.push(addMasteryExp(save, "zones", run.selectedZoneId || save.selectedZoneId, masteryExp));
    run.masteryExpGained = masteryExp;
    run.masteryResults = results;
    return results;
  }

  function updateRunStats(save, run, isClear) {
    const stats = sanitizeStatsMap(save.stats);

    stats.totalKills += safeInteger(run.kills, 0);
    stats.totalBossKills += isClear || run.bossDefeated ? 1 : 0;
    stats.totalLevelUps += Math.max(0, safeInteger(run.level, 1) - 1);
    stats.totalRelicsTaken += (run.relics || []).length;
    stats.totalEliteKills += safeInteger(run.eliteKills, 0);
    stats.totalPlayTime += Math.max(0, safeNumber(run.time, 0));
    save.stats = sanitizeStatsMap(stats);
  }

  function updateAbyssProgress(save, run, isClear) {
    const abyss = sanitizeAbyssMap(save.abyss);
    const selectedDepth = clamp(safeInteger(run.selectedDepth, 0), 0, getMaxAbyssDepth());
    const zoneId = run.selectedZoneId || save.selectedZoneId || "riftGate";

    if (!isClear) {
      save.abyss = abyss;
      return;
    }

    abyss.bestDepthByZone[zoneId] = Math.max(safeInteger(abyss.bestDepthByZone[zoneId], 0), selectedDepth);
    abyss.bestClearByDepth[String(selectedDepth)] = true;

    if (selectedDepth >= safeInteger(abyss.maxUnlockedDepth, 0) && selectedDepth < getMaxAbyssDepth()) {
      abyss.maxUnlockedDepth = selectedDepth + 1;
      abyss.selectedDepth = selectedDepth + 1;
      run.depthUnlocked = true;
    }

    save.abyss = sanitizeAbyssMap(abyss);
    run.selectedDepth = selectedDepth;
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
      updateRunStats(save, run, isClear);
      updateAbyssProgress(save, run, isClear);
      grantMastery(save, run, isClear);

      if (isClear) {
        save.totalClears = safeInteger(save.totalClears, 0) + 1;
        run.mode = states.clear || "clear";
      } else {
        run.mode = states.gameover || "gameover";
      }

      if (!run.unlockChecked) {
        run.unlockChecked = true;
        run.newlyUnlocked = checkUnlocks(save);
      }

      this.writeSave();
      return save;
    },

    setSelectedClass: function (classId) {
      const save = this.getSave();
      if (!isUnlocked(save, "classes", classId)) {
        return save;
      }
      save.selectedClassId = findById(Data.classes, classId, "wanderer").id || "wanderer";
      this.writeSave();
      return save;
    },

    setSelectedWeapon: function (weaponId) {
      const save = this.getSave();
      if (!isUnlocked(save, "weapons", weaponId)) {
        return save;
      }
      save.selectedWeaponId = findById(Data.weapons, weaponId, "abyssBullet").id || "abyssBullet";
      this.writeSave();
      return save;
    },

    setSelectedZone: function (zoneId) {
      const save = this.getSave();
      if (!isUnlocked(save, "zones", zoneId)) {
        return save;
      }
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

    setSelectedDepth: function (depth) {
      const save = this.getSave();
      const abyss = sanitizeAbyssMap(save.abyss);
      abyss.selectedDepth = clamp(safeInteger(depth, 0), 0, safeInteger(abyss.maxUnlockedDepth, 0));
      save.abyss = abyss;
      this.writeSave();
      return save;
    },

    getUpgradeCost: function (upgradeId) {
      const save = this.getSave();
      const currentLevel = safeInteger((save.upgrades || {})[upgradeId], 0);
      if (upgradeId === "masteryTraining") {
        return 40 + currentLevel * 18;
      }
      if (upgradeId === "combatSense") {
        return 45 + currentLevel * 20;
      }
      if (upgradeId === "abyssAdaptation") {
        return 50 + currentLevel * 22;
      }
      return 10 + currentLevel * 8;
    },

    buyUpgrade: function (upgradeId) {
      const save = this.getSave();
      const upgrades = save.upgrades || sanitizeUpgradeMap(null);
      const currentLevel = safeInteger(upgrades[upgradeId], 0);
      const cost = this.getUpgradeCost(upgradeId);
      const upgradeData = findById(Data.permanentUpgrades, upgradeId, "");

      if (upgradeData.advanced && !isFeatureUnlocked(save, upgradeData.unlockFeature || "advancedUpgrades")) {
        return false;
      }

      if (!Object.prototype.hasOwnProperty.call(upgrades, upgradeId) || currentLevel >= safeInteger(upgradeData.maxLevel, 10) || safeInteger(save.shards, 0) < cost) {
        return false;
      }

      upgrades[upgradeId] = currentLevel + 1;
      save.upgrades = sanitizeUpgradeMap(upgrades);
      save.shards = Math.max(0, safeInteger(save.shards, 0) - cost);
      this.writeSave();
      return true;
    },

    isUnlocked: function (category, id) {
      return isUnlocked(this.getSave(), category, id);
    },

    isFeatureUnlocked: function (featureId) {
      return isFeatureUnlocked(this.getSave(), featureId);
    },

    getUnlockMessage: function (category, id) {
      return getUnlockMessage(category, id);
    },

    getUnlockRows: function () {
      const save = this.getSave();
      const rows = [];
      const groups = [
        { category: "classes", ids: ["bloodSeeker", "engineer", "abyssApostle"], label: "클래스" },
        { category: "weapons", ids: ["bloodScythe", "riftSpear", "starDust"], label: "무기" },
        { category: "zones", ids: ["brokenSanctum", "deadCorridor", "stormRift"], label: "구역" },
        { category: "features", ids: ["advancedUpgrades"], label: "기능" }
      ];

      for (let g = 0; g < groups.length; g += 1) {
        for (let i = 0; i < groups[g].ids.length; i += 1) {
          const id = groups[g].ids[i];
          rows.push({
            category: groups[g].category,
            label: groups[g].label,
            id: id,
            name: getUnlockName(groups[g].category, id),
            unlocked: groups[g].category === "features" ? isFeatureUnlocked(save, id) : isUnlocked(save, groups[g].category, id),
            condition: getUnlockMessage(groups[g].category, id)
          });
        }
      }

      return rows;
    },

    getMasteryEntry: function (category, id) {
      return getMasteryEntry(this.getSave(), category, id);
    },

    getMasteryRequiredExp: getMasteryRequiredExp,

    getAbyssModifiers: function (depth) {
      return getAbyssModifiers(depth, this.getSave());
    },

    checkUnlocks: function () {
      const save = this.getSave();
      const result = checkUnlocks(save);
      this.writeSave();
      return result;
    }
  };

  AS.State.loadSave();
  AS.State.resetRun();
})();
