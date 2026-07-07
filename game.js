(function () {
  window.AbyssSurvivor = window.AbyssSurvivor || {};
  const AS = window.AbyssSurvivor;
  const Data = AS.Data || {};
  const states = Data.states || {};

  function safeNumber(value, fallback) {
    const numberValue = Number(value);
    const safeFallback = Number.isFinite(Number(fallback)) ? Number(fallback) : 0;
    return Number.isFinite(numberValue) ? numberValue : safeFallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function distanceSquared(a, b) {
    const dx = safeNumber(a.x, 0) - safeNumber(b.x, 0);
    const dy = safeNumber(a.y, 0) - safeNumber(b.y, 0);
    return dx * dx + dy * dy;
  }

  function normalize(x, y) {
    const length = Math.sqrt(x * x + y * y);

    if (!Number.isFinite(length) || length <= 0.0001) {
      return { x: 0, y: 0 };
    }

    return { x: x / length, y: y / length };
  }

  function getEnemyData(type) {
    const enemies = Data.enemies || {};
    return enemies[type] || enemies.normal || {
      id: "normal",
      name: "심연의 잔해",
      hp: 24,
      speed: 48,
      damage: 10,
      radius: 10,
      exp: 8,
      score: 1,
      color: "#6bb7d6",
      spawnWeight: 70
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

  function getZone(run) {
    return findById(Data.zones, run && run.selectedZoneId, "riftGate");
  }

  function getChallengeModifiers(run) {
    const modifiers = run && run.challengeModifiers && typeof run.challengeModifiers === "object" ? run.challengeModifiers : {};
    const roomModifiers = run && run.activeRoomModifiers && typeof run.activeRoomModifiers === "object" ? run.activeRoomModifiers : {};
    const bossVariantModifiers = run && run.activeBossVariantModifiers && typeof run.activeBossVariantModifiers === "object" ? run.activeBossVariantModifiers : {};
    const result = Object.assign({}, modifiers);

    result.spawnIntervalMultiplier = safeNumber(modifiers.spawnIntervalMultiplier, 1) * safeNumber(roomModifiers.spawnIntervalMultiplier, 1) * safeNumber(bossVariantModifiers.spawnIntervalMultiplier, 1);
    result.enemyHpMultiplier = safeNumber(modifiers.enemyHpMultiplier, 1) * safeNumber(roomModifiers.enemyHpMultiplier, 1) * safeNumber(bossVariantModifiers.enemyHpMultiplier, 1);
    result.enemyDamageMultiplier = safeNumber(modifiers.enemyDamageMultiplier, 1) * safeNumber(roomModifiers.enemyDamageMultiplier, 1) * safeNumber(bossVariantModifiers.enemyDamageMultiplier, 1);
    result.enemySpeedMultiplier = safeNumber(modifiers.enemySpeedMultiplier, 1) * safeNumber(roomModifiers.enemySpeedMultiplier, 1) * safeNumber(bossVariantModifiers.enemySpeedMultiplier, 1);
    result.eliteChanceBonus = safeNumber(modifiers.eliteChanceBonus, 0) + safeNumber(roomModifiers.eliteChanceBonus, 0) + safeNumber(bossVariantModifiers.eliteChanceBonus, 0);
    result.maxEnemiesBonus = safeInteger(modifiers.maxEnemiesBonus, 0) + safeInteger(roomModifiers.maxEnemiesBonus, 0) + safeInteger(bossVariantModifiers.maxEnemiesBonus, 0);
    return result;
  }

  function getWaveConfig(time) {
    const waves = Array.isArray(Data.waves) ? Data.waves : [];
    const elapsed = safeNumber(time, 0);

    for (let i = 0; i < waves.length; i += 1) {
      if (elapsed >= safeNumber(waves[i].start, 0) && elapsed < safeNumber(waves[i].end, 9999)) {
        return waves[i];
      }
    }

    return waves[waves.length - 1] || { spawnInterval: 1.2, weights: { normal: 70, fast: 20, tank: 10 } };
  }

  function getBossData(run) {
    const zone = getZone(run);
    const bosses = Data.bosses || {};
    if (isBossRushRun(run) && run && run.bossRushBossId && bosses[run.bossRushBossId]) {
      return bosses[run.bossRushBossId];
    }
    return bosses[zone.bossId] || bosses.watcher || getEnemyData("boss");
  }

  function getBossVariantData(variantId) {
    return findById(Data.bossVariants, variantId, "bloodVariant");
  }

  function getBossVariantChance(run) {
    const depth = safeInteger(run && run.selectedDepth, 0);
    const chances = Array.isArray(Data.endgame && Data.endgame.variantChances) ? Data.endgame.variantChances : [];

    if (!run || isBossRushRun(run) || run.selectedZoneId === "abyssThrone") {
      return 0;
    }

    for (let i = 0; i < chances.length; i += 1) {
      if (depth >= safeInteger(chances[i] && chances[i].minDepth, 0)) {
        return clamp(safeNumber(chances[i].chance, 0), 0, 1);
      }
    }

    return depth >= 10 ? 0.25 : 0;
  }

  function chooseBossVariant(run) {
    const variants = Array.isArray(Data.bossVariants) ? Data.bossVariants : [];
    const forcedId = run && run.forceBossVariantId;

    if (forcedId) {
      return getBossVariantData(forcedId);
    }
    if (!variants.length || Math.random() >= getBossVariantChance(run)) {
      return null;
    }

    return variants[Math.floor(Math.random() * variants.length)] || null;
  }

  function applyBossVariant(enemy, variant) {
    if (!enemy || !variant) {
      return enemy;
    }

    enemy.variantId = variant.id || "";
    enemy.variantName = variant.name || "변종 보스";
    enemy.name = (variant.shortName || variant.name || "변종") + " " + (enemy.name || "보스");
    enemy.maxHp = Math.max(1, safeNumber(enemy.maxHp, 1) * safeNumber(variant.hpMultiplier, 1));
    enemy.hp = enemy.maxHp;
    enemy.damage = Math.max(1, safeNumber(enemy.damage, 1) * safeNumber(variant.damageMultiplier, 1));
    enemy.speed = Math.max(0, safeNumber(enemy.speed, 0) * safeNumber(variant.speedMultiplier, 1));
    enemy.score = Math.max(0, safeNumber(enemy.score, 0) * safeNumber(variant.rewardMultiplier, 1));
    enemy.auraDamageBonus = Math.max(0, safeNumber(variant.auraDamageBonus, 0));
    enemy.summonIntervalMultiplier = clamp(safeNumber(variant.summonIntervalMultiplier, 1), 0.35, 2);
    enemy.chargeCooldownMultiplier = clamp(safeNumber(variant.chargeCooldownMultiplier, 1), 0.35, 2);
    enemy.baseSpeed = enemy.speed;
    return enemy;
  }

  function applyFinalBossScaling(enemy, run) {
    const depth = safeInteger(run && run.selectedDepth, 0);
    const endgame = Data.endgame || {};

    if (!enemy || enemy.bossId !== "abyssSovereign") {
      return enemy;
    }

    enemy.finalBoss = true;
    if (depth >= 20) {
      enemy.maxHp = Math.max(1, safeNumber(enemy.maxHp, 1) * safeNumber(endgame.finalBossDepth20HpMultiplier, 1.22));
      enemy.hp = enemy.maxHp;
      enemy.damage = Math.max(1, safeNumber(enemy.damage, 1) * safeNumber(endgame.finalBossDepth20DamageMultiplier, 1.14));
      enemy.phaseCooldownMultiplier = 0.9;
    }

    return enemy;
  }

  function isBossRushRun(run) {
    return !!(run && (run.bossRush || run.selectedRunModeId === "bossRush"));
  }

  function getBossRushBossIds() {
    const bosses = Data.bosses || {};
    const preferred = ["watcher", "swampGuardian", "coreDevourer", "sanctumBreaker", "deadLord", "stormDevourer"];
    const result = [];
    let key;

    for (let i = 0; i < preferred.length; i += 1) {
      if (bosses[preferred[i]]) {
        result.push(preferred[i]);
      }
    }

    for (key in bosses) {
      if (Object.prototype.hasOwnProperty.call(bosses, key) && result.indexOf(key) < 0) {
        result.push(key);
      }
    }

    return result.length ? result : ["watcher"];
  }

  function getBossRushBossId(run) {
    const ids = getBossRushBossIds();
    const index = safeInteger(run && run.bossRushIndex, 0);
    return ids[index % ids.length] || ids[0];
  }

  function getWeapon(run) {
    return findById(Data.weapons, run && run.selectedWeaponId, "abyssBullet");
  }

  function getSupportWeaponData(id) {
    return findById(Data.supportWeapons, id, "supportBullet");
  }

  function getSupportWeaponLimits() {
    const limits = Data.supportWeaponLimits || {};
    return {
      maxSlots: clamp(safeInteger(limits.maxSlots, 3), 1, 6),
      maxLevel: clamp(safeInteger(limits.maxLevel, 3), 1, 6),
      offerChance: clamp(safeNumber(limits.offerChance, 0.3), 0, 1)
    };
  }

  function findRunSupportWeapon(run, id) {
    const supportWeapons = run && Array.isArray(run.supportWeapons) ? run.supportWeapons : [];

    for (let i = 0; i < supportWeapons.length; i += 1) {
      if (supportWeapons[i] && supportWeapons[i].id === id) {
        return supportWeapons[i];
      }
    }

    return null;
  }

  function ensureRunCollections(run) {
    if (!run.supportWeapons) {
      run.supportWeapons = [];
    }
    if (!run.damageStats) {
      run.damageStats = {};
    }
  }

  function getViewportWidth() {
    return Math.max(1, safeNumber((Data.game || {}).width, 360));
  }

  function getViewportHeight() {
    return Math.max(1, safeNumber((Data.game || {}).height, 560));
  }

  function getWorldWidth(run) {
    const game = Data.game || {};
    const world = run && run.world ? run.world : {};
    return Math.max(getViewportWidth(), safeNumber(world.width, safeNumber(game.worldWidth, getViewportWidth())));
  }

  function getWorldHeight(run) {
    const game = Data.game || {};
    const world = run && run.world ? run.world : {};
    return Math.max(getViewportHeight(), safeNumber(world.height, safeNumber(game.worldHeight, getViewportHeight())));
  }

  function updateCamera(run) {
    const viewportWidth = getViewportWidth();
    const viewportHeight = getViewportHeight();
    const worldWidth = getWorldWidth(run);
    const worldHeight = getWorldHeight(run);
    const player = run && run.player ? run.player : {};

    if (!run.camera) {
      run.camera = { x: 0, y: 0, width: viewportWidth, height: viewportHeight };
    }

    run.camera.width = viewportWidth;
    run.camera.height = viewportHeight;
    run.camera.x = clamp(safeNumber(player.x, worldWidth / 2) - viewportWidth / 2, 0, Math.max(0, worldWidth - viewportWidth));
    run.camera.y = clamp(safeNumber(player.y, worldHeight / 2) - viewportHeight / 2, 0, Math.max(0, worldHeight - viewportHeight));
  }

  function getViewportMargin() {
    return clamp(safeNumber((Data.game || {}).targetViewportMargin, 64), 0, 140);
  }

  function isFinalWaveActive(run) {
    return !!(run && run.finalWaveStarted && !run.finished && safeNumber(run.remainingTime, 0) > 0);
  }

  function getFinalWaveForceTime(run) {
    const game = Data.game || {};
    const runDuration = safeNumber(run && run.runDuration, safeNumber(game.runDuration, 300));
    const configured = safeNumber(game.finalWaveForceTime, 270);

    return clamp(configured, Math.max(1, safeNumber(run && run.bossSpawnTime, safeNumber(game.bossSpawnTime, 210))), Math.max(1, runDuration - 5));
  }

  function getDepthPower(run) {
    const abyssModifiers = run && run.abyssModifiers ? run.abyssModifiers : {};
    return Math.max(0, safeNumber(abyssModifiers.depthPower, safeNumber(run && run.selectedDepth, 0)));
  }

  function getFinalWaveDepthScale(run) {
    const depthPower = getDepthPower(run);

    return clamp(1 + Math.max(0, depthPower - 5) * 0.035, 1, 1.8);
  }

  function getMaxEnemies(run) {
    const game = Data.game || {};
    const modifiers = getChallengeModifiers(run);
    const baseMax = Math.max(1, safeNumber(game.maxEnemies, 80));
    const depthFinalBonus = isFinalWaveActive(run) ? Math.floor(Math.max(0, getDepthPower(run) - 5) * 1.2) : 0;
    const bonus = isFinalWaveActive(run) ? Math.max(0, safeNumber(game.finalWaveMaxEnemiesBonus, 0)) + depthFinalBonus : 0;
    const eventBonus = Math.max(0, safeNumber(modifiers.maxEnemiesBonus, 0));

    if (isBossRushRun(run)) {
      return clamp(Math.max(24, safeNumber(game.bossRushMaxEnemies, 46)) + eventBonus, 1, 90);
    }

    return clamp(baseMax + bonus + eventBonus, 1, 150);
  }

  function isInsideTargetViewport(run, enemy, margin) {
    const viewportMargin = Math.max(0, safeNumber(margin, getViewportMargin()));
    const viewportWidth = getViewportWidth();
    const viewportHeight = getViewportHeight();
    const camera = run && run.camera ? run.camera : { x: 0, y: 0 };
    const x = safeNumber(enemy && enemy.x, 0);
    const y = safeNumber(enemy && enemy.y, 0);
    const radius = Math.max(0, safeNumber(enemy && enemy.radius, 0));
    const left = safeNumber(camera.x, 0) - viewportMargin - radius;
    const top = safeNumber(camera.y, 0) - viewportMargin - radius;
    const right = safeNumber(camera.x, 0) + viewportWidth + viewportMargin + radius;
    const bottom = safeNumber(camera.y, 0) + viewportHeight + viewportMargin + radius;

    return x >= left && x <= right && y >= top && y <= bottom;
  }

  function isEnemyTargetable(run, enemy, origin, maxRange, margin) {
    const range = Math.max(0, safeNumber(maxRange, 0));
    const source = origin || (run && run.player) || {};

    if (!run || !enemy || range <= 0 || !isInsideTargetViewport(run, enemy, margin)) {
      return false;
    }

    return distanceSquared(source, enemy) <= range * range;
  }

  function safeInteger(value, fallback) {
    return Math.max(0, Math.floor(safeNumber(value, fallback)));
  }

  function getWeaponGrowth(run, stat) {
    const growth = run && run.weaponGrowth && typeof run.weaponGrowth === "object" ? run.weaponGrowth : {};
    return safeNumber(growth[stat], 0);
  }

  function getWeaponStats(run) {
    const player = run && run.player ? run.player : {};
    const weapon = getWeapon(run);
    const basePlayer = Data.player || {};
    const baseProjectileSpeed = Math.max(1, safeNumber(basePlayer.projectileSpeed, 280));
    const baseProjectileRadius = Math.max(1, safeNumber(basePlayer.projectileRadius, 4));
    const speedScale = clamp(safeNumber(player.projectileSpeed, baseProjectileSpeed) / baseProjectileSpeed, 0.65, 2.4);
    const sizeScale = clamp(safeNumber(player.projectileRadius, baseProjectileRadius) / baseProjectileRadius, 0.65, 2.6);
    const minCooldown = Math.max(0.01, safeNumber((Data.limits || {}).minAttackCooldown, 0.12));
    const attackType = weapon.attackType || "projectile";
    const powerGrowth = getWeaponGrowth(run, "weaponPower");
    const speedGrowth = getWeaponGrowth(run, "weaponSpeed");
    const sizeGrowth = getWeaponGrowth(run, "weaponSize");
    const countGrowth = getWeaponGrowth(run, "weaponCount");
    const weaponMasteryLevel = safeInteger(run && run.weaponMasteryLevel, 1);
    const weaponMasteryDamage = weaponMasteryLevel >= 3 ? 1.03 : 1;
    const weaponMasteryCooldown = weaponMasteryLevel >= 5 ? 0.97 : 1;
    const weaponMasterySize = weaponMasteryLevel >= 7 ? 1.03 : 1;
    const damageBonus = 1 + powerGrowth * 0.12;
    const cooldownBonus = 1 - speedGrowth * 0.08;
    const sizeBonus = 1 + sizeGrowth * 0.08;
    const weaponTags = Array.isArray(weapon.tags) ? weapon.tags : [];
    const hasProjectileTag = weaponTags.indexOf("projectile") >= 0;
    const hasAbyssTag = weaponTags.indexOf("abyss") >= 0;
    const hasSplitShot = !!(run && run.evolutions && run.evolutions.splitShot);
    const hasPiercingShot = !!(run && run.evolutions && run.evolutions.piercingShot);
    const hasBulletBonus = hasBuildBonus(run, "bulletExpert") && hasProjectileTag;
    const hasExplosionBonus = hasBuildBonus(run, "explosionBuild") || hasBuildBonus(run, "explosionAddict");
    const hasAbyssBonus = hasBuildBonus(run, "abyssContractor") && hasAbyssTag;
    const abyssPowerBonus = hasAbyssTag ? 1 + safeNumber(player.abyssPowerBonus, 0) * 0.07 : 1;
    const stats = {
      weapon: weapon,
      attackType: attackType,
      damage: clamp(safeNumber(player.damage, 12) * safeNumber(weapon.damageMultiplier, 1) * damageBonus * (hasAbyssBonus ? 1.08 : 1) * abyssPowerBonus * weaponMasteryDamage, 1, 999),
      cooldown: clamp(safeNumber(player.attackCooldown, 0.55) * safeNumber(weapon.cooldownMultiplier, 1) * cooldownBonus * weaponMasteryCooldown, minCooldown, 4),
      projectileSpeed: clamp(safeNumber(player.projectileSpeed, 280) * (1 + speedGrowth * 0.08) * (hasBulletBonus ? 1.08 : 1), 30, 900),
      projectileRadius: clamp(safeNumber(player.projectileRadius, 4) * sizeBonus * (hasBulletBonus ? 1.08 : 1) * weaponMasterySize, 1, 20),
      projectileCount: clamp(safeInteger(weapon.projectileCount, 1) + countGrowth, 1, 9)
    };

    stats.orbitCount = clamp(1 + getWeaponGrowth(run, "orbitCount") + Math.floor(countGrowth / 2) + (hasSplitShot ? 1 : 0), 1, 6);
    stats.orbitRadius = clamp((46 * (0.85 + sizeScale * 0.15) + getWeaponGrowth(run, "orbitRadius") * 5) * weaponMasterySize, 34, 82);
    stats.orbitBladeRadius = clamp(8 * sizeScale * (1 + getWeaponGrowth(run, "orbitPower") * 0.08) * weaponMasterySize, 5, 21);
    stats.orbitAngularSpeed = clamp(3.3 * speedScale * (1 + getWeaponGrowth(run, "orbitSpeed") * 0.16), 1.8, 8);
    stats.orbitDamage = clamp(stats.damage * (1 + getWeaponGrowth(run, "orbitPower") * 0.12 + (hasPiercingShot ? 0.08 : 0)), 2, 999);
    stats.orbitHitCooldown = clamp(0.45 * (stats.cooldown / 0.55), 0.16, 0.55);

    stats.lightningRange = clamp(160 + speedGrowth * 5, 140, 240);
    stats.chainCount = clamp(safeInteger(weapon.chainCount, 3) + getWeaponGrowth(run, "chainCount") + safeInteger(player.chainBonus, 0) + (hasPiercingShot ? 1 : 0), 1, 7);
    stats.chainBeamCount = clamp(1 + getWeaponGrowth(run, "chainBeamCount") + Math.floor(countGrowth / 2) + (hasSplitShot ? 1 : 0), 1, 4);
    stats.chainWidth = clamp(3 * sizeScale + getWeaponGrowth(run, "chainWidth") * 1.3, 2, 9);
    stats.chainRange = clamp(96 * (0.92 + speedScale * 0.08), 84, 160);
    stats.chainDamage = clamp(stats.damage * 0.5 * (1 + getWeaponGrowth(run, "chainPower") * 0.08 + getWeaponGrowth(run, "chainWidth") * 0.05) * safeNumber(player.chainDamageMultiplier, 1), 1, 999);

    stats.mineCount = clamp(1 + getWeaponGrowth(run, "mineCount") + safeInteger(player.mineBonus, 0) + (hasExplosionBonus ? 1 : 0) + (hasSplitShot ? 1 : 0), 1, 5);
    stats.mineRadius = clamp(safeNumber(weapon.radius, 48) * sizeScale * safeNumber(player.mineRadiusMultiplier, 1) * safeNumber(player.explosionRadiusMultiplier, 1) * (1 + getWeaponGrowth(run, "mineRadius") * 0.12 + (hasExplosionBonus ? 0.08 : 0) + (hasPiercingShot ? 0.08 : 0)) * weaponMasterySize, 24, 124);
    stats.mineArmTimer = clamp(0.45 / speedScale - getWeaponGrowth(run, "mineSpeed") * 0.04, 0.16, 0.55);
    stats.mineDamage = clamp(stats.damage * (1 + getWeaponGrowth(run, "minePower") * 0.14 + (hasExplosionBonus ? 0.08 : 0)) * safeNumber(player.explosionDamageMultiplier, 1), 4, 999);

    stats.waveCount = clamp(1 + getWeaponGrowth(run, "waveCount") + Math.floor(countGrowth / 2) + (hasSplitShot ? 1 : 0), 1, 4);
    stats.waveRadius = clamp(safeNumber(weapon.radius, 118) * sizeScale * safeNumber(player.waveRadiusMultiplier, 1) * (1 + getWeaponGrowth(run, "waveRadius") * 0.1) * weaponMasterySize, 55, 247);
    stats.waveArc = clamp(0.7 * (0.85 + sizeScale * 0.15), 0.45, 1.15);
    stats.waveLife = clamp(0.22 * (0.9 + speedScale * 0.1) * safeNumber(player.effectDurationMultiplier, 1), 0.16, 0.5);
    stats.waveDamage = clamp(stats.damage * (1 + getWeaponGrowth(run, "wavePower") * 0.12) * safeNumber(player.waveDamageMultiplier, 1), 3, 999);

    stats.scytheCount = clamp(1 + Math.floor(countGrowth / 2) + (hasSplitShot ? 1 : 0), 1, 4);
    stats.scytheRange = clamp((safeNumber(weapon.range, 76) * (0.9 + sizeScale * 0.1) + getWeaponGrowth(run, "scytheRange") * 9) * weaponMasterySize, 42, 155);
    stats.scytheArc = clamp(safeNumber(weapon.arcWidth, 1.35) + sizeGrowth * 0.08, 0.7, 2.35);
    stats.scytheDamage = clamp(stats.damage * safeNumber(player.meleeDamageMultiplier, 1) * (hasPiercingShot ? 1.08 : 1), 2, 999);
    stats.scytheHeal = clamp(safeNumber(weapon.healOnHit, 0.5) + powerGrowth * 0.15, 0, 4);

    stats.lineRange = clamp((safeNumber(weapon.range, 260) * (0.9 + speedScale * 0.1) + speedGrowth * 8) * weaponMasterySize, 120, 460);
    stats.lineWidth = clamp((safeNumber(weapon.width, 14) * sizeScale + getWeaponGrowth(run, "lineWidth") * 2) * weaponMasterySize, 6, 37);
    stats.linePierce = clamp(safeInteger(weapon.pierce, 3) + getWeaponGrowth(run, "linePierce") + safeInteger(player.projectilePierceBonus, 0) + (hasPiercingShot ? 1 : 0), 1, 9);
    stats.lineCount = clamp(1 + (hasSplitShot ? 2 : 0), 1, 3);
    stats.lineDamage = clamp(stats.damage * safeNumber(player.lineDamageMultiplier, 1), 2, 999);

    stats.spreadCount = clamp(safeInteger(weapon.projectileCount, 5) + countGrowth, 1, 10);
    stats.spreadAngle = clamp(safeNumber(weapon.spreadAngle, 0.65) + getWeaponGrowth(run, "spreadAngle") * 0.1, 0.2, 1.25);
    stats.spreadDamage = clamp(stats.damage * safeNumber(player.spreadDamageMultiplier, 1), 1, 999);

    return stats;
  }

  function getSupportWeaponStats(run, supportWeapon) {
    const supportData = getSupportWeaponData(supportWeapon && supportWeapon.id);
    const player = run && run.player ? run.player : {};
    const level = clamp(safeInteger(supportWeapon && supportWeapon.level, 1), 1, getSupportWeaponLimits().maxLevel);
    const levelBonus = 1 + (level - 1) * 0.24;
    const baseDamage = Math.max(1, safeNumber(player.damage, safeNumber((Data.player || {}).damage, 10)));
    const baseProjectileSpeed = Math.max(1, safeNumber((Data.player || {}).projectileSpeed, 280));
    const baseProjectileRadius = Math.max(1, safeNumber((Data.player || {}).projectileRadius, 4));
    const speedScale = clamp(safeNumber(player.projectileSpeed, baseProjectileSpeed) / baseProjectileSpeed, 0.65, 2.4);
    const sizeScale = clamp(safeNumber(player.projectileRadius, baseProjectileRadius) / baseProjectileRadius, 0.65, 2.6);

    return {
      data: supportData,
      level: level,
      damage: clamp(baseDamage * safeNumber(supportData.damageRatio, 0.35) * levelBonus * safeNumber(player.supportDamageMultiplier, 1), 1, 999),
      cooldown: clamp(safeNumber(supportData.cooldown, 1.5) * (1 - (level - 1) * 0.08) * safeNumber(player.supportCooldownMultiplier, 1), 0.35, 6),
      projectileCount: clamp(safeInteger(supportData.projectileCount, 1) + (level >= 3 ? 1 : 0), 1, 4),
      projectileSpeed: clamp(safeNumber(player.projectileSpeed, baseProjectileSpeed) * (0.9 + speedScale * 0.08), 60, 820),
      projectileRadius: clamp(safeNumber(player.projectileRadius, baseProjectileRadius) * 0.72 * sizeScale, 2, 14),
      range: clamp(safeNumber(supportData.range, 150) * (1 + (level - 1) * 0.08), 80, 260),
      radius: clamp(safeNumber(supportData.radius, 48) * (0.9 + sizeScale * 0.1) * (1 + (level - 1) * 0.12), 20, 140)
    };
  }

  function pushEffect(run, effect) {
    const game = Data.game || {};
    const maxEffects = Math.max(1, safeNumber(game.maxEffects, 48));

    if (!run.effects) {
      run.effects = [];
    }

    while (run.effects.length >= maxEffects) {
      run.effects.shift();
    }

    run.effects.push(effect);
  }

  function getEffectColor(type) {
    if (type === "lightning") {
      return "#8fd8ff";
    }
    if (type === "explosion") {
      return "#ffb347";
    }
    if (type === "wave") {
      return "#b9a6ff";
    }
    if (type === "linePierce") {
      return "#a56eff";
    }
    if (type === "spread") {
      return "#ffe28a";
    }
    if (type === "slash") {
      return "#d8f7ff";
    }
    if (type === "player") {
      return "#ff6b80";
    }
    return "#ffe28a";
  }

  function pushDamageText(run, x, y, value, color) {
    const game = Data.game || {};
    const maxDamageTexts = Math.max(1, safeNumber(game.maxDamageTexts, 36));
    const damage = Math.max(0, Math.round(safeNumber(value, 0)));

    if (damage <= 0) {
      return;
    }

    if (!run.damageTexts) {
      run.damageTexts = [];
    }

    while (run.damageTexts.length >= maxDamageTexts) {
      run.damageTexts.shift();
    }

    run.damageTexts.push({
      x: safeNumber(x, 0),
      y: safeNumber(y, 0),
      value: damage,
      color: color || "#ffffff",
      life: 0.55,
      maxLife: 0.55,
      vy: -24
    });
  }

  function recordDamage(run, sourceId, sourceName, amount, target) {
    const damage = safeNumber(amount, 0);
    const id = typeof sourceId === "string" && sourceId ? sourceId : "unknown";
    const name = typeof sourceName === "string" && sourceName ? sourceName : "알 수 없는 공격";
    let entry;

    if (!run || !Number.isFinite(damage) || damage <= 0) {
      return null;
    }

    if (!run.damageStats || typeof run.damageStats !== "object") {
      run.damageStats = {};
    }

    entry = run.damageStats[id];
    if (!entry) {
      entry = {
        name: name,
        damage: 0,
        hits: 0,
        bossDamage: 0,
        eliteDamage: 0
      };
      run.damageStats[id] = entry;
    }

    entry.name = name;
    entry.damage = Math.max(0, safeNumber(entry.damage, 0) + damage);
    entry.hits = Math.max(0, safeInteger(entry.hits, 0) + 1);
    if (target && target.isBoss) {
      entry.bossDamage = Math.max(0, safeNumber(entry.bossDamage, 0) + damage);
    }
    if (target && target.elite) {
      entry.eliteDamage = Math.max(0, safeNumber(entry.eliteDamage, 0) + damage);
    }

    return entry;
  }

  function getDamageRanking(run, limit) {
    const stats = run && run.damageStats && typeof run.damageStats === "object" ? run.damageStats : {};
    const survivalTime = Math.max(1, safeNumber(run && run.time, 0));
    const rows = [];
    let key;

    for (key in stats) {
      if (Object.prototype.hasOwnProperty.call(stats, key)) {
        const entry = stats[key] || {};
        const damage = Math.max(0, safeNumber(entry.damage, 0));
        if (damage > 0) {
          rows.push({
            id: key,
            name: entry.name || "알 수 없는 공격",
            damage: damage,
            hits: safeInteger(entry.hits, 0),
            bossDamage: Math.max(0, safeNumber(entry.bossDamage, 0)),
            eliteDamage: Math.max(0, safeNumber(entry.eliteDamage, 0)),
            dps: damage / survivalTime
          });
        }
      }
    }

    rows.sort(function (a, b) {
      return b.damage - a.damage;
    });

    return rows.slice(0, Math.max(1, safeInteger(limit, 5)));
  }

  function pushImpactEffect(run, target, type, radius) {
    const color = getEffectColor(type);

    pushEffect(run, {
      type: type === "slash" ? "slash" : "impact",
      x: safeNumber(target && target.x, 0),
      y: safeNumber(target && target.y, 0),
      radius: Math.max(4, safeNumber(radius, safeNumber(target && target.radius, 8) + 6)),
      color: color,
      life: type === "slash" ? 0.16 : 0.18,
      maxLife: type === "slash" ? 0.16 : 0.18
    });
  }

  function countEliteEnemies(run) {
    let count = 0;

    if (!run || !run.enemies) {
      return 0;
    }

    for (let i = 0; i < run.enemies.length; i += 1) {
      if (run.enemies[i] && run.enemies[i].elite) {
        count += 1;
      }
    }

    return count;
  }

  function getBossContactDamageMultiplier(run) {
    const game = Data.game || {};
    const weapon = getWeapon(run);
    const tags = Array.isArray(weapon.tags) ? weapon.tags : [];
    const attackType = weapon.attackType || weapon.id || "";
    let isMelee = attackType === "orbit" || attackType === "scythe";

    for (let i = 0; i < tags.length; i += 1) {
      if (tags[i] === "melee" || tags[i] === "orbit" || tags[i] === "scythe") {
        isMelee = true;
      }
    }

    return isMelee ? clamp(safeNumber(game.meleeBossContactDamageMultiplier, 0.7), 0.1, 1) : 1;
  }

  function applyEliteModifier(enemy, run) {
    const game = Data.game || {};
    const zone = getZone(run);
    const modifiers = ["giant", "swift", "toxic", "splitter", "volatile", "armored", "regen", "summoner"];
    const elapsed = safeNumber(run && run.time, 0);
    const runModifiers = getChallengeModifiers(run);
    const maxElites = Math.max(0, safeNumber(game.maxEliteEnemies, 3) + (isFinalWaveActive(run) ? 1 + Math.floor(Math.max(0, getDepthPower(run) - 10) / 6) : 0));
    const baseChance = clamp(safeNumber(game.eliteChance, 0.07), 0, 0.25);
    const challengeBonus = run && run.selectedChallengeId !== "normal" ? 0.02 : 0;
    const zoneBonus = (run && run.selectedZoneId === "abyssCore" ? 0.01 : 0) + safeNumber(zone.eliteChanceBonus, 0);
    const abyssBonus = safeNumber(run && run.abyssModifiers && run.abyssModifiers.eliteChanceBonus, 0);
    const splitterBonus = safeNumber(zone.splitterChanceBonus, 0);
    const finalWaveBonus = isFinalWaveActive(run) ? safeNumber(game.finalWaveEliteChanceBonus, 0.05) * getFinalWaveDepthScale(run) : 0;
    const eventBonus = safeNumber(runModifiers.eliteChanceBonus, 0);
    const chance = clamp(baseChance + challengeBonus + zoneBonus + abyssBonus + finalWaveBonus + eventBonus, 0, 0.55);
    let modifier;

    if (!enemy || enemy.isBoss || elapsed < 60 || countEliteEnemies(run) >= maxElites || Math.random() > chance) {
      return;
    }

    if (splitterBonus > 0) {
      modifiers.push("splitter", "summoner");
    }
    if (run && run.selectedZoneId === "stormRift") {
      modifiers.push("swift", "regen");
    }
    if (run && run.selectedZoneId === "brokenSanctum") {
      modifiers.push("armored", "giant");
    }

    modifier = modifiers[Math.floor(Math.random() * modifiers.length)] || "giant";
    enemy.elite = true;
    enemy.eliteType = modifier;
    enemy.score = Math.max(1, safeNumber(enemy.score, 1) + 2);
    enemy.exp = Math.max(1, safeNumber(enemy.exp, 1) + 8);

    if (modifier === "giant") {
      enemy.maxHp *= 1.9;
      enemy.hp = enemy.maxHp;
      enemy.radius *= 1.25;
      enemy.speed *= 0.86;
      enemy.color = "#f0b35f";
    } else if (modifier === "swift") {
      enemy.maxHp *= 0.85;
      enemy.hp = enemy.maxHp;
      enemy.speed *= 1.55;
      enemy.color = "#9cf070";
    } else if (modifier === "toxic") {
      enemy.damage *= 1.45;
      enemy.color = "#73ef9b";
    } else if (modifier === "splitter") {
      enemy.maxHp *= 1.2;
      enemy.hp = enemy.maxHp;
      enemy.color = "#8fd8ff";
    } else if (modifier === "volatile") {
      enemy.maxHp *= 0.95;
      enemy.hp = enemy.maxHp;
      enemy.color = "#ff8a6b";
    } else if (modifier === "armored") {
      enemy.maxHp *= 1.55;
      enemy.hp = enemy.maxHp;
      enemy.damageTakenMultiplier = 0.82;
      enemy.speed *= 0.9;
      enemy.color = "#aeb8c5";
    } else if (modifier === "regen") {
      enemy.maxHp *= 1.25;
      enemy.hp = enemy.maxHp;
      enemy.regenRate = Math.max(0.2, enemy.maxHp * 0.014);
      enemy.color = "#63d98a";
    } else if (modifier === "summoner") {
      enemy.maxHp *= 1.1;
      enemy.hp = enemy.maxHp;
      enemy.summonTimer = 3.6;
      enemy.color = "#b98cff";
    }

    pushEffect(run, {
      type: "warningCircle",
      x: safeNumber(enemy.x, 0),
      y: safeNumber(enemy.y, 0),
      radius: safeNumber(enemy.radius, 10) + 16,
      life: 0.55,
      maxLife: 0.55
    });
  }

  function chooseEnemyType(run) {
    const elapsed = safeNumber(run.time, 0);
    const wave = getWaveConfig(run.time);
    const zone = getZone(run);
    const weights = wave.weights || {};
    const choices = [];
    let total = 0;
    let key;

    for (key in weights) {
      if (Object.prototype.hasOwnProperty.call(weights, key) && key !== "boss") {
        const timeBonus = key === "tank" ? elapsed * 0.015 : 0;
        const zoneBonus = key === "fast" ? safeNumber(zone.fastEnemyWeightBonus, 0) : 0;
        const finalWaveDepthBonus = isFinalWaveActive(run) ? Math.max(0, getDepthPower(run) - 5) : 0;
        const finalWaveBonus = isFinalWaveActive(run) ? (key === "fast" ? 18 + finalWaveDepthBonus * 0.8 : (key === "tank" ? 16 + finalWaveDepthBonus * 0.7 : 0)) : 0;
        const weight = Math.max(0, safeNumber(weights[key], 0)) + timeBonus + zoneBonus + finalWaveBonus;

        if (weight > 0) {
          choices.push({ type: key, weight: weight });
          total += weight;
        }
      }
    }

    if (!choices.length || total <= 0) {
      return "normal";
    }

    let roll = Math.random() * total;
    for (let i = 0; i < choices.length; i += 1) {
      roll -= choices[i].weight;
      if (roll <= 0) {
        return choices[i].type;
      }
    }

    return choices[0].type;
  }

  function createEnemy(type, run) {
    const game = Data.game || {};
    const zone = getZone(run);
    const modifiers = getChallengeModifiers(run);
    const abyssModifiers = run && run.abyssModifiers ? run.abyssModifiers : {};
    const base = type === "boss" ? getBossData(run) : getEnemyData(type);
    const padding = Math.max(0, safeNumber(game.spawnPadding, 40));
    const worldWidth = getWorldWidth(run);
    const worldHeight = getWorldHeight(run);
    const viewportWidth = getViewportWidth();
    const viewportHeight = getViewportHeight();
    const camera = run && run.camera ? run.camera : { x: Math.max(0, (worldWidth - viewportWidth) / 2), y: Math.max(0, (worldHeight - viewportHeight) / 2) };
    const left = clamp(safeNumber(camera.x, 0), 0, Math.max(0, worldWidth - viewportWidth));
    const top = clamp(safeNumber(camera.y, 0), 0, Math.max(0, worldHeight - viewportHeight));
    const right = Math.min(worldWidth, left + viewportWidth);
    const bottom = Math.min(worldHeight, top + viewportHeight);
    const side = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;

    if (side === 0) {
      x = left + Math.random() * Math.max(1, right - left);
      y = top - padding;
    } else if (side === 1) {
      x = right + padding;
      y = top + Math.random() * Math.max(1, bottom - top);
    } else if (side === 2) {
      x = left + Math.random() * Math.max(1, right - left);
      y = bottom + padding;
    } else {
      x = left - padding;
      y = top + Math.random() * Math.max(1, bottom - top);
    }

    x = clamp(x, 0, worldWidth);
    y = clamp(y, 0, worldHeight);

    const enemy = {
      id: Date.now() + Math.random(),
      type: type === "boss" ? "boss" : (base.id || type),
      bossId: type === "boss" ? base.id : "",
      name: base.name || "적",
      x: x,
      y: y,
      hp: Math.max(1, safeNumber(base.hp, 1) * (type === "boss" ? safeNumber(abyssModifiers.bossHpMultiplier, 1) : safeNumber(zone.enemyHpMultiplier, 1) * safeNumber(modifiers.enemyHpMultiplier, 1))),
      maxHp: Math.max(1, safeNumber(base.hp, 1) * (type === "boss" ? safeNumber(abyssModifiers.bossHpMultiplier, 1) : safeNumber(zone.enemyHpMultiplier, 1) * safeNumber(modifiers.enemyHpMultiplier, 1))),
      speed: Math.max(0, safeNumber(base.speed, 0) * (type === "boss" ? 1 : safeNumber(zone.enemySpeedMultiplier, 1) * safeNumber(modifiers.enemySpeedMultiplier, 1))),
      damage: Math.max(0, safeNumber(base.damage, 0) * (type === "boss" ? 1 : safeNumber(zone.enemyDamageMultiplier, 1) * safeNumber(modifiers.enemyDamageMultiplier, 1))),
      radius: Math.max(1, safeNumber(base.radius, 8)),
      exp: Math.max(0, safeNumber(base.exp, 0)),
      score: Math.max(0, safeNumber(base.score, 0)),
      color: base.color || "#6bb7d6",
      isBoss: type === "boss"
    };

    if (enemy.isBoss) {
      if (isBossRushRun(run)) {
        const rushIndex = safeInteger(run.bossRushIndex, 0);
        const hpScale = 0.82 + rushIndex * 0.16;
        const damageScale = 0.9 + rushIndex * 0.08;

        enemy.maxHp = Math.max(1, safeNumber(enemy.maxHp, 1) * hpScale);
        enemy.hp = enemy.maxHp;
        enemy.damage = Math.max(1, safeNumber(enemy.damage, 1) * damageScale);
        enemy.score = Math.max(0, safeNumber(enemy.score, 0) + rushIndex * 8);
      }
      enemy.baseSpeed = enemy.speed;
      enemy.chargeTimer = safeNumber((Data.bossPattern || {}).chargeCooldown, 7);
      enemy.chargePrepareTimer = 0;
      enemy.chargeActiveTimer = 0;
      enemy.chargeDirX = 0;
      enemy.chargeDirY = 0;
      enemy.summonTimer = safeNumber((Data.bossPattern || {}).summonCooldown, 8);
      enemy.auraRadius = safeNumber(base.auraRadius, safeNumber((Data.bossPattern || {}).auraRadius, 62));
      enemy.auraTickTimer = safeNumber((Data.bossPattern || {}).auraTick, 1.2);
      enemy.patterns = Array.isArray(base.patterns) ? base.patterns.slice() : [];
      enemy.phase2HpRatio = clamp(safeNumber(base.phase2HpRatio, 0.5), 0.1, 0.9);
      enemy.phaseCooldownMultiplier = 1;
      enemy.shockwaveTimer = 4.8;
      enemy.stormAuraTimer = 1.4;
      if (!isBossRushRun(run)) {
        applyFinalBossScaling(enemy, run);
        if (!enemy.finalBoss) {
          const variant = chooseBossVariant(run);
          if (variant) {
            applyBossVariant(enemy, variant);
            run.bossVariantId = variant.id || "";
            run.bossVariantName = variant.name || "";
            run.rewardMultiplier = clamp(safeNumber(run.rewardMultiplier, 1) * safeNumber(variant.rewardMultiplier, 1), 0, 5);
            run.activeBossVariantModifiers = {
              eliteChanceBonus: safeNumber(variant.eliteChanceBonus, 0)
            };
          }
        } else {
          run.finalBossEncountered = true;
          run.activeBossVariantModifiers = {};
        }
      }
    }

    return enemy;
  }

  function spawnEnemy(run, type) {
    const maxEnemies = getMaxEnemies(run);

    if (!run || run.enemies.length >= maxEnemies) {
      return null;
    }

    const enemy = createEnemy(type || chooseEnemyType(run), run);
    applyEliteModifier(enemy, run);
    run.enemies.push(enemy);
    return enemy;
  }

  function spawnEnemyNear(run, type, x, y) {
    const maxEnemies = getMaxEnemies(run);
    const width = getWorldWidth(run);
    const height = getWorldHeight(run);
    const enemy = createEnemy(type || "normal", run);

    if (!run || run.enemies.length >= maxEnemies) {
      return null;
    }

    enemy.x = clamp(safeNumber(x, width / 2), 12, width - 12);
    enemy.y = clamp(safeNumber(y, height / 2), 12, height - 12);
    run.enemies.push(enemy);
    return enemy;
  }

  function spawnBoss(run) {
    let boss;

    if (!run) {
      return;
    }

    if (isBossRushRun(run)) {
      if (run.bossRushActiveBoss || safeInteger(run.bossRushIndex, 0) >= safeInteger(run.bossRushBossCount, 4)) {
        return;
      }
      run.bossRushBossId = getBossRushBossId(run);
    } else if (run.bossSpawned) {
      return;
    }

    if (run.enemies.length >= getMaxEnemies(run)) {
      run.enemies.shift();
    }

    boss = spawnEnemy(run, "boss");

    if (boss) {
      run.bossSpawned = true;
      if (isBossRushRun(run)) {
        run.bossRushActiveBoss = true;
        run.message = "보스 러시 " + (safeInteger(run.bossRushIndex, 0) + 1) + "/" + safeInteger(run.bossRushBossCount, 4) + " 시작";
      } else {
        run.message = "보스가 나타났습니다";
      }
      run.messageTimer = 3;
    }
  }

  function movePlayer(run, delta) {
    const player = run.player;
    const input = run.input || {};
    const dir = normalize(safeNumber(input.moveX, 0), safeNumber(input.moveY, 0));
    const speed = Math.max(0, safeNumber(player.speed, 0));
    const width = getWorldWidth(run);
    const height = getWorldHeight(run);
    const radius = Math.max(1, safeNumber(player.radius, 12));

    player.x = clamp(safeNumber(player.x, width / 2) + dir.x * speed * delta, radius, width - radius);
    player.y = clamp(safeNumber(player.y, height / 2) + dir.y * speed * delta, radius, height - radius);
    updateCamera(run);
  }

  function updateSpawning(run, delta) {
    const game = Data.game || {};
    const modifiers = getChallengeModifiers(run);
    const elapsed = safeNumber(run.time, 0);
    const wave = getWaveConfig(elapsed);
    const finalWaveMultiplier = isFinalWaveActive(run) ? safeNumber(game.finalWaveSpawnMultiplier, 0.72) / getFinalWaveDepthScale(run) : 1;
    const spawnInterval = clamp(safeNumber(wave.spawnInterval, 1.1) * safeNumber(modifiers.spawnIntervalMultiplier, 1) * finalWaveMultiplier, 0.28, 1.5);

    if (isBossRushRun(run)) {
      const rushMinionInterval = clamp(safeNumber(game.bossRushMinionInterval, 1.35) * safeNumber(modifiers.spawnIntervalMultiplier, 1), 0.55, 2.2);

      run.bossRushSpawnTimer = Math.max(0, safeNumber(run.bossRushSpawnTimer, safeNumber(game.bossRushSpawnDelay, 1.2)) - delta);
      if (!run.bossRushActiveBoss && run.bossRushSpawnTimer <= 0) {
        spawnBoss(run);
        run.bossRushSpawnTimer = Math.max(0.4, safeNumber(game.bossRushSpawnDelay, 1.2));
      }

      run.spawnTimer = Math.max(0, safeNumber(run.spawnTimer, 0) - delta);
      if (run.spawnTimer <= 0 && run.enemies.length < getMaxEnemies(run)) {
        spawnEnemy(run);
        run.spawnTimer = rushMinionInterval;
      }
      return;
    }

    if (!run.finalWaveStarted && elapsed >= getFinalWaveForceTime(run) && safeNumber(run.remainingTime, 0) > 0) {
      run.finalWaveStarted = true;
      run.finalWaveTimer = 0;
      run.message = "최종 심연 폭주가 시작되었습니다";
      run.messageTimer = 3;
    }

    if (isFinalWaveActive(run)) {
      run.finalWaveTimer = Math.max(0, safeNumber(run.finalWaveTimer, 0) + delta);
    }
    run.spawnTimer = Math.max(0, safeNumber(run.spawnTimer, 0) - delta);
    if (run.spawnTimer <= 0) {
      spawnEnemy(run);
      run.spawnTimer = spawnInterval;
    }

    if (elapsed >= safeNumber(run.bossSpawnTime, safeNumber(game.bossSpawnTime, 120))) {
      spawnBoss(run);
    }
  }

  function updateEnemies(run, delta) {
    const player = run.player;

    for (let i = run.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = run.enemies[i];
      enemy.hitFlashTimer = Math.max(0, safeNumber(enemy.hitFlashTimer, 0) - delta);
      if (enemy.eliteType === "regen") {
        enemy.hp = Math.min(safeNumber(enemy.maxHp, 1), safeNumber(enemy.hp, 0) + safeNumber(enemy.regenRate, 0) * delta);
      }
      if (enemy.eliteType === "summoner") {
        enemy.summonTimer = Math.max(0, safeNumber(enemy.summonTimer, 3.6) - delta);
        if (enemy.summonTimer <= 0) {
          spawnEnemyNear(run, "normal", safeNumber(enemy.x, 0) + 14, safeNumber(enemy.y, 0) + 14);
          enemy.summonTimer = 4.2;
        }
      }

      if (enemy.isBoss && safeNumber(enemy.chargeActiveTimer, 0) > 0) {
        enemy.x += safeNumber(enemy.chargeDirX, 0) * Math.max(0, safeNumber(enemy.speed, 0)) * delta;
        enemy.y += safeNumber(enemy.chargeDirY, 0) * Math.max(0, safeNumber(enemy.speed, 0)) * delta;
        continue;
      }

      if (enemy.isBoss && safeNumber(enemy.chargePrepareTimer, 0) > 0) {
        continue;
      }

      const dir = normalize(safeNumber(player.x, 0) - safeNumber(enemy.x, 0), safeNumber(player.y, 0) - safeNumber(enemy.y, 0));
      enemy.x += dir.x * Math.max(0, safeNumber(enemy.speed, 0)) * delta;
      enemy.y += dir.y * Math.max(0, safeNumber(enemy.speed, 0)) * delta;
    }
  }

  function pushProjectile(run, x, y, dirX, dirY, angleOffset, options) {
    const player = run.player;
    const game = Data.game || {};
    const maxProjectiles = Math.max(1, safeNumber(game.maxProjectiles, 96));
    const angle = Math.atan2(dirY, dirX) + safeNumber(angleOffset, 0);
    const stats = getWeaponStats(run);
    const speed = Math.max(0, safeNumber(stats.projectileSpeed, 280));
    const config = options || {};
    const hasPierceOverride = Object.prototype.hasOwnProperty.call(config, "pierce");
    const weapon = getWeapon(run);

    if (run.projectiles.length >= maxProjectiles) {
      return false;
    }

    run.projectiles.push({
      id: Date.now() + Math.random(),
      x: safeNumber(x, 0),
      y: safeNumber(y, 0),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: Math.max(1, safeNumber(config.radius, stats.projectileRadius)),
      damage: Math.max(1, safeNumber(config.damage, stats.damage)),
      life: Math.max(0.1, safeNumber((Data.projectile || {}).lifeTime, 2.2)),
      pierce: hasPierceOverride ? Math.max(0, safeInteger(config.pierce, 0)) : (run.evolutions && run.evolutions.piercingShot ? 1 : Math.max(0, safeNumber((Data.projectile || {}).pierce, 0))),
      color: config.color || "",
      sourceId: config.sourceId || weapon.id || "abyssBullet",
      sourceName: config.sourceName || weapon.name || "기본 공격",
      hitIds: {}
    });

    return true;
  }

  function findNearestEnemy(run, origin, excluded, maxRange, margin) {
    let nearest = null;
    let nearestDistance = Infinity;
    const hasRangeLimit = Number.isFinite(Number(maxRange)) && Number(maxRange) > 0;

    for (let i = 0; i < run.enemies.length; i += 1) {
      if (run.enemies[i] === excluded) {
        continue;
      }
      if (hasRangeLimit && !isEnemyTargetable(run, run.enemies[i], origin, maxRange, margin)) {
        continue;
      }

      const dist = distanceSquared(origin, run.enemies[i]);
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearest = run.enemies[i];
      }
    }

    return nearest;
  }

  function findNearestEnemyNotIn(run, origin, excludedIds, maxRange, margin) {
    let nearest = null;
    let nearestDistance = Infinity;
    const blocked = excludedIds || {};
    const hasRangeLimit = Number.isFinite(Number(maxRange)) && Number(maxRange) > 0;

    for (let i = 0; i < run.enemies.length; i += 1) {
      const enemyId = String(run.enemies[i].id);
      if (blocked[enemyId]) {
        continue;
      }
      if (hasRangeLimit && !isEnemyTargetable(run, run.enemies[i], origin, maxRange, margin)) {
        continue;
      }

      const dist = distanceSquared(origin, run.enemies[i]);
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearest = run.enemies[i];
      }
    }

    return nearest;
  }

  function healPlayer(run, amount) {
    const player = run && run.player ? run.player : null;
    const heal = Math.max(0, safeNumber(amount, 0));

    if (!player || heal <= 0) {
      return;
    }

    player.hp = Math.min(Math.max(1, safeNumber(player.maxHp, 1)), safeNumber(player.hp, 0) + heal);
  }

  function distanceToSegmentSquared(point, ax, ay, bx, by) {
    const px = safeNumber(point && point.x, 0);
    const py = safeNumber(point && point.y, 0);
    const abx = bx - ax;
    const aby = by - ay;
    const lengthSq = abx * abx + aby * aby;
    let t = lengthSq > 0 ? ((px - ax) * abx + (py - ay) * aby) / lengthSq : 0;

    t = clamp(t, 0, 1);
    return Math.pow(px - (ax + abx * t), 2) + Math.pow(py - (ay + aby * t), 2);
  }

  function ensureWeaponOrbital(run) {
    const stats = getWeaponStats(run);
    let weaponCount = 0;

    if (!run.orbitals) {
      run.orbitals = [];
    }

    for (let i = 0; i < run.orbitals.length; i += 1) {
      if (run.orbitals[i].weaponId === "orbitBlade") {
        weaponCount += 1;
      }
    }

    while (weaponCount < stats.orbitCount) {
      run.orbitals.push({
        weaponId: "orbitBlade",
        angle: 0,
        phase: 0
      });
      weaponCount += 1;
    }

    for (let i = run.orbitals.length - 1; i >= 0 && weaponCount > stats.orbitCount; i -= 1) {
      if (run.orbitals[i].weaponId === "orbitBlade") {
        run.orbitals.splice(i, 1);
        weaponCount -= 1;
      }
    }

    weaponCount = 0;
    for (let i = 0; i < run.orbitals.length; i += 1) {
      if (run.orbitals[i].weaponId === "orbitBlade") {
        run.orbitals[i].phase = (Math.PI * 2 * weaponCount) / Math.max(1, stats.orbitCount);
        run.orbitals[i].distance = stats.orbitRadius;
        run.orbitals[i].radius = stats.orbitBladeRadius;
        run.orbitals[i].damage = stats.orbitDamage;
        run.orbitals[i].speed = stats.orbitAngularSpeed;
        run.orbitals[i].hitCooldown = stats.orbitHitCooldown;
        run.orbitals[i].sourceId = stats.weapon.id;
        run.orbitals[i].sourceName = stats.weapon.name;
        weaponCount += 1;
      }
    }
  }

  function attackWithChain(run, nearest, weapon) {
    const stats = getWeaponStats(run);
    const globalHit = {};
    const starts = [];
    const margin = getViewportMargin();

    for (let i = 0; i < run.enemies.length && starts.length < stats.chainBeamCount; i += 1) {
      const candidate = findNearestEnemyNotIn(run, run.player, globalHit, stats.lightningRange, margin);
      if (!candidate || globalHit[String(candidate.id)]) {
        break;
      }
      starts.push(candidate);
      globalHit[String(candidate.id)] = true;
    }

    for (let s = 0; s < starts.length; s += 1) {
      const hit = {};
      let previous = run.player;
      let current = starts[s];

      for (let i = 0; i < stats.chainCount && current; i += 1) {
        hit[String(current.id)] = true;
        pushEffect(run, {
          type: "lightning",
          fromX: safeNumber(previous.x, 0),
          fromY: safeNumber(previous.y, 0),
          toX: safeNumber(current.x, 0),
          toY: safeNumber(current.y, 0),
          lineWidth: stats.chainWidth,
          life: 0.18
        });
        damageEnemy(run, current, Math.max(1, stats.chainDamage * (i === 0 ? 1 : 0.65)), "lightning", weapon.id, weapon.name);

        previous = current;
        current = null;
        for (let j = 0; j < run.enemies.length; j += 1) {
          if (!hit[String(run.enemies[j].id)] && isEnemyTargetable(run, run.enemies[j], previous, stats.chainRange, margin)) {
            current = run.enemies[j];
            break;
          }
        }
      }
    }
  }

  function attackWithMine(run, weapon) {
    const player = run.player;
    const stats = getWeaponStats(run);

    for (let i = 0; i < stats.mineCount; i += 1) {
      const angle = Math.PI * 2 * (i / Math.max(1, stats.mineCount)) + safeNumber(run.time, 0);
      const offset = stats.mineCount > 1 ? 18 : 0;
      pushEffect(run, {
        type: "mine",
        x: safeNumber(player.x, 0) + Math.cos(angle) * offset,
        y: safeNumber(player.y, 0) + Math.sin(angle) * offset,
        radius: stats.mineRadius,
        damage: stats.mineDamage,
        sourceId: weapon.id,
        sourceName: weapon.name,
        armTimer: stats.mineArmTimer,
        life: 1.1,
        triggered: false
      });
    }
  }

  function attackWithWave(run, nearest, weapon) {
    const player = run.player;
    const stats = getWeaponStats(run);
    const margin = getViewportMargin();
    const dir = normalize(safeNumber(nearest.x, 0) - safeNumber(player.x, 0), safeNumber(nearest.y, 0) - safeNumber(player.y, 0));
    const baseAngle = Math.atan2(dir.y, dir.x);
    const hitIds = {};

    for (let w = 0; w < stats.waveCount; w += 1) {
      const offset = stats.waveCount === 1 ? 0 : (w - (stats.waveCount - 1) / 2) * 0.42;
      const waveDir = {
        x: Math.cos(baseAngle + offset),
        y: Math.sin(baseAngle + offset)
      };

      pushEffect(run, {
        type: "wave",
        x: safeNumber(player.x, 0),
        y: safeNumber(player.y, 0),
        dirX: waveDir.x,
        dirY: waveDir.y,
        radius: stats.waveRadius,
        arc: stats.waveArc,
        lineWidth: Math.max(4, stats.chainWidth || 4),
        life: stats.waveLife
      });

      for (let i = run.enemies.length - 1; i >= 0; i -= 1) {
        const enemy = run.enemies[i];
        const enemyId = String(enemy.id);
        const toEnemy = normalize(safeNumber(enemy.x, 0) - safeNumber(player.x, 0), safeNumber(enemy.y, 0) - safeNumber(player.y, 0));
        const dot = waveDir.x * toEnemy.x + waveDir.y * toEnemy.y;
        if (!hitIds[enemyId] && isEnemyTargetable(run, enemy, player, stats.waveRadius, margin) && dot > 0.42) {
          hitIds[enemyId] = true;
          damageEnemy(run, enemy, Math.max(3, stats.waveDamage), "wave", weapon.id, weapon.name);
        }
      }
    }
  }

  function attackWithScythe(run, nearest, weapon) {
    const player = run.player;
    const stats = getWeaponStats(run);
    const margin = getViewportMargin();
    const dir = normalize(safeNumber(nearest.x, 0) - safeNumber(player.x, 0), safeNumber(nearest.y, 0) - safeNumber(player.y, 0));
    const baseAngle = Math.atan2(dir.y, dir.x);
    const hitIds = {};
    let hitCount = 0;

    for (let s = 0; s < stats.scytheCount; s += 1) {
      const offset = stats.scytheCount === 1 ? 0 : (s - (stats.scytheCount - 1) / 2) * 0.72;
      const angle = baseAngle + offset;
      const sweepDir = { x: Math.cos(angle), y: Math.sin(angle) };

      pushEffect(run, {
        type: "scythe",
        x: safeNumber(player.x, 0),
        y: safeNumber(player.y, 0),
        angle: angle,
        radius: stats.scytheRange,
        arc: stats.scytheArc,
        color: "#ff6b80",
        life: 0.18,
        maxLife: 0.18
      });

      for (let i = run.enemies.length - 1; i >= 0; i -= 1) {
        const enemy = run.enemies[i];
        const enemyId = String(enemy.id);
        const toEnemy = normalize(safeNumber(enemy.x, 0) - safeNumber(player.x, 0), safeNumber(enemy.y, 0) - safeNumber(player.y, 0));
        const dot = sweepDir.x * toEnemy.x + sweepDir.y * toEnemy.y;
        const range = stats.scytheRange + safeNumber(enemy.radius, 8);

        if (!hitIds[enemyId] && isEnemyTargetable(run, enemy, player, range, margin) && dot >= Math.cos(stats.scytheArc)) {
          hitIds[enemyId] = true;
          damageEnemy(run, enemy, stats.scytheDamage, "slash", weapon.id, weapon.name);
          hitCount += 1;
        }
      }
    }

    if (hitCount > 0) {
      healPlayer(run, hitCount * safeNumber(stats.scytheHeal, 0));
    }
  }

  function attackWithLinePierce(run, nearest, weapon) {
    const player = run.player;
    const stats = getWeaponStats(run);
    const margin = getViewportMargin();
    const dir = normalize(safeNumber(nearest.x, 0) - safeNumber(player.x, 0), safeNumber(nearest.y, 0) - safeNumber(player.y, 0));
    const lineCount = Math.max(1, safeInteger(stats.lineCount, 1));
    const hitIds = {};

    for (let l = 0; l < lineCount; l += 1) {
      const sideOffset = lineCount === 1 ? 0 : (l - (lineCount - 1) / 2) * Math.max(10, stats.lineWidth * 1.2);
      const fromX = safeNumber(player.x, 0) + -dir.y * sideOffset;
      const fromY = safeNumber(player.y, 0) + dir.x * sideOffset;
      const toX = fromX + dir.x * stats.lineRange;
      const toY = fromY + dir.y * stats.lineRange;
      let hitCount = 0;

      pushEffect(run, {
        type: "linePierce",
        fromX: fromX,
        fromY: fromY,
        toX: toX,
        toY: toY,
        lineWidth: stats.lineWidth,
        life: 0.2,
        maxLife: 0.2
      });

      for (let i = run.enemies.length - 1; i >= 0 && hitCount < stats.linePierce; i -= 1) {
        const enemy = run.enemies[i];
        const enemyId = String(enemy.id);
        const hitWidth = stats.lineWidth / 2 + safeNumber(enemy.radius, 8);

        if (!hitIds[enemyId] && isEnemyTargetable(run, enemy, player, stats.lineRange + safeNumber(enemy.radius, 8), margin) && distanceToSegmentSquared(enemy, fromX, fromY, toX, toY) <= hitWidth * hitWidth) {
          hitIds[enemyId] = true;
          damageEnemy(run, enemy, stats.lineDamage, "linePierce", weapon.id, weapon.name);
          hitCount += 1;
        }
      }
    }
  }

  function attackWithSpread(run, nearest, weapon) {
    const player = run.player;
    const stats = getWeaponStats(run);
    const dir = normalize(safeNumber(nearest.x, 0) - safeNumber(player.x, 0), safeNumber(nearest.y, 0) - safeNumber(player.y, 0));
    const count = clamp(stats.spreadCount + (run.evolutions && run.evolutions.splitShot ? 2 : 0), 1, 10);

    for (let i = 0; i < count; i += 1) {
      const offset = count === 1 ? 0 : (i - (count - 1) / 2) * (stats.spreadAngle / Math.max(1, count - 1));
      pushProjectile(run, player.x, player.y, dir.x, dir.y, offset, {
        damage: stats.spreadDamage,
        radius: Math.max(2, stats.projectileRadius * 0.86),
        pierce: run.evolutions && run.evolutions.piercingShot ? 1 : 0,
        color: "#ffe28a",
        sourceId: weapon.id,
        sourceName: weapon.name
      });
    }

    pushEffect(run, {
      type: "starBurst",
      x: safeNumber(player.x, 0),
      y: safeNumber(player.y, 0),
      radius: Math.max(14, stats.projectileRadius * 4),
      life: 0.16,
      maxLife: 0.16
    });
  }

  function attackNearest(run) {
    const player = run.player;
    const game = Data.game || {};
    const maxProjectiles = Math.max(1, safeNumber(game.maxProjectiles, 80));
    const weapon = getWeapon(run);
    const attackType = weapon.attackType || "projectile";
    const stats = getWeaponStats(run);
    let nearest;

    if (!run.enemies.length) {
      return;
    }

    if (attackType === "orbit") {
      ensureWeaponOrbital(run);
      return;
    }

    if (attackType === "chain") {
      nearest = findNearestEnemy(run, player, null, stats.lightningRange, getViewportMargin());
      if (!nearest) {
        return;
      }
      attackWithChain(run, nearest, weapon);
      return;
    }

    if (attackType === "mine") {
      attackWithMine(run, weapon);
      return;
    }

    if (attackType === "wave") {
      nearest = findNearestEnemy(run, player, null, stats.waveRadius, getViewportMargin());
      if (!nearest) {
        return;
      }
      attackWithWave(run, nearest, weapon);
      return;
    }

    if (attackType === "scythe") {
      nearest = findNearestEnemy(run, player, null, stats.scytheRange, getViewportMargin());
      if (!nearest) {
        return;
      }
      attackWithScythe(run, nearest, weapon);
      return;
    }

    if (attackType === "linePierce") {
      nearest = findNearestEnemy(run, player, null, stats.lineRange, getViewportMargin());
      if (!nearest) {
        return;
      }
      attackWithLinePierce(run, nearest, weapon);
      return;
    }

    nearest = findNearestEnemy(run, player, null);
    if (!nearest) {
      return;
    }

    if (attackType === "spreadProjectile") {
      attackWithSpread(run, nearest, weapon);
      return;
    }

    if (run.projectiles.length >= maxProjectiles) {
      return;
    }

    const dir = normalize(safeNumber(nearest.x, 0) - safeNumber(player.x, 0), safeNumber(nearest.y, 0) - safeNumber(player.y, 0));
    const totalProjectiles = clamp(stats.projectileCount + (run.evolutions && run.evolutions.splitShot ? 2 : 0), 1, 6);
    for (let i = 0; i < totalProjectiles; i += 1) {
      const offset = totalProjectiles === 1 ? 0 : (i - (totalProjectiles - 1) / 2) * 0.18;
      pushProjectile(run, player.x, player.y, dir.x, dir.y, offset);
    }
  }

  function fireSupportBullet(run, supportWeapon, stats) {
    const player = run.player;
    const nearest = findNearestEnemy(run, player, null, 320, getViewportMargin());

    if (!nearest) {
      return;
    }

    const dir = normalize(safeNumber(nearest.x, 0) - safeNumber(player.x, 0), safeNumber(nearest.y, 0) - safeNumber(player.y, 0));
    const count = Math.max(1, safeInteger(stats.projectileCount, 1));
    for (let i = 0; i < count; i += 1) {
      const offset = count === 1 ? 0 : (i - (count - 1) / 2) * 0.16;
      pushProjectile(run, player.x, player.y, dir.x, dir.y, offset, {
        damage: stats.damage,
        radius: stats.projectileRadius,
        color: "#c8edf7",
        sourceId: supportWeapon.id,
        sourceName: stats.data.name
      });
    }
  }

  function fireSupportBolt(run, supportWeapon, stats) {
    const player = run.player;
    const target = findNearestEnemy(run, player, null, stats.range, getViewportMargin());

    if (!target) {
      return;
    }

    pushEffect(run, {
      type: "lightning",
      fromX: safeNumber(player.x, 0),
      fromY: safeNumber(player.y, 0),
      toX: safeNumber(target.x, 0),
      toY: safeNumber(target.y, 0),
      lineWidth: 2 + stats.level,
      life: 0.14
    });
    damageEnemy(run, target, stats.damage, "lightning", supportWeapon.id, stats.data.name);
  }

  function ensureSupportOrbitals(run, supportWeapon, stats) {
    const supportId = supportWeapon.id;
    const desiredCount = stats.level >= 3 ? 2 : 1;
    let count = 0;

    if (!run.orbitals) {
      run.orbitals = [];
    }

    for (let i = 0; i < run.orbitals.length; i += 1) {
      if (run.orbitals[i].supportId === supportId) {
        count += 1;
      }
    }

    while (count < desiredCount) {
      run.orbitals.push({
        supportId: supportId,
        angle: 0,
        phase: 0
      });
      count += 1;
    }

    for (let i = run.orbitals.length - 1; i >= 0 && count > desiredCount; i -= 1) {
      if (run.orbitals[i].supportId === supportId) {
        run.orbitals.splice(i, 1);
        count -= 1;
      }
    }

    count = 0;
    for (let i = 0; i < run.orbitals.length; i += 1) {
      if (run.orbitals[i].supportId === supportId) {
        run.orbitals[i].phase = (Math.PI * 2 * count) / Math.max(1, desiredCount);
        run.orbitals[i].distance = stats.radius;
        run.orbitals[i].radius = clamp(5 + stats.level, 5, 10);
        run.orbitals[i].damage = stats.damage;
        run.orbitals[i].speed = clamp(2.6 + stats.level * 0.22, 2, 4);
        run.orbitals[i].hitCooldown = clamp(0.58 - stats.level * 0.06, 0.32, 0.6);
        run.orbitals[i].sourceId = supportId;
        run.orbitals[i].sourceName = stats.data.name;
        count += 1;
      }
    }
  }

  function fireSupportMine(run, supportWeapon, stats) {
    const player = run.player;
    const angle = safeNumber(run.time, 0) * 1.7;
    const offset = stats.level >= 2 ? 18 : 8;

    pushEffect(run, {
      type: "mine",
      x: safeNumber(player.x, 0) + Math.cos(angle) * offset,
      y: safeNumber(player.y, 0) + Math.sin(angle) * offset,
      radius: stats.radius,
      damage: stats.damage,
      sourceId: supportWeapon.id,
      sourceName: stats.data.name,
      armTimer: clamp(0.38 - stats.level * 0.04, 0.18, 0.4),
      life: 1,
      triggered: false
    });
  }

  function fireSupportWave(run, supportWeapon, stats) {
    const player = run.player;

    pushEffect(run, {
      type: "explosion",
      x: safeNumber(player.x, 0),
      y: safeNumber(player.y, 0),
      radius: stats.radius,
      life: 0.24,
      maxLife: 0.24
    });

    for (let i = run.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = run.enemies[i];
      const hitRadius = stats.radius + safeNumber(enemy.radius, 8);
      if (distanceSquared(player, enemy) <= hitRadius * hitRadius) {
        damageEnemy(run, enemy, stats.damage, "wave", supportWeapon.id, stats.data.name);
      }
    }
  }

  function updateSupportWeapons(run, delta) {
    const supportWeapons = run && Array.isArray(run.supportWeapons) ? run.supportWeapons : [];

    for (let i = 0; i < supportWeapons.length; i += 1) {
      const supportWeapon = supportWeapons[i];
      const stats = getSupportWeaponStats(run, supportWeapon);
      const type = stats.data.type || "projectile";

      supportWeapon.level = stats.level;
      if (type === "orbit") {
        ensureSupportOrbitals(run, supportWeapon, stats);
        continue;
      }

      supportWeapon.cooldown = Math.max(0, safeNumber(supportWeapon.cooldown, 0) - delta);
      if (supportWeapon.cooldown > 0) {
        continue;
      }

      supportWeapon.cooldown = stats.cooldown;
      if (type === "lightning") {
        fireSupportBolt(run, supportWeapon, stats);
      } else if (type === "mine") {
        fireSupportMine(run, supportWeapon, stats);
      } else if (type === "wave") {
        fireSupportWave(run, supportWeapon, stats);
      } else {
        fireSupportBullet(run, supportWeapon, stats);
      }
    }
  }

  function updateAttack(run, delta) {
    const cooldown = getWeaponStats(run).cooldown;

    run.attackTimer = safeNumber(run.attackTimer, 0) - delta;
    if (run.attackTimer <= 0) {
      attackNearest(run);
      run.attackTimer = cooldown;
    }
  }

  function updateProjectiles(run, delta) {
    const width = getWorldWidth(run);
    const height = getWorldHeight(run);
    const padding = 80;

    for (let i = run.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = run.projectiles[i];
      projectile.x += safeNumber(projectile.vx, 0) * delta;
      projectile.y += safeNumber(projectile.vy, 0) * delta;
      projectile.life = safeNumber(projectile.life, 0) - delta;

      if (
        projectile.life <= 0 ||
        projectile.x < -padding ||
        projectile.x > width + padding ||
        projectile.y < -padding ||
        projectile.y > height + padding
      ) {
        run.projectiles.splice(i, 1);
      }
    }
  }

  function updateEffects(run, delta) {
    const effects = run.effects || [];

    for (let i = effects.length - 1; i >= 0; i -= 1) {
      const effect = effects[i];
      effect.life = safeNumber(effect.life, 0) - delta;

      if (effect.type === "mine" && !effect.triggered) {
        effect.armTimer = Math.max(0, safeNumber(effect.armTimer, 0) - delta);
        if (effect.armTimer <= 0) {
          effect.triggered = true;
          effect.type = "explosion";
          effect.life = 0.28;
          for (let j = run.enemies.length - 1; j >= 0; j -= 1) {
            const enemy = run.enemies[j];
            const hitRadius = safeNumber(effect.radius, 48) + safeNumber(enemy.radius, 8);
            if (distanceSquared(effect, enemy) <= hitRadius * hitRadius) {
              damageEnemy(run, enemy, safeNumber(effect.damage, 12), "explosion", effect.sourceId, effect.sourceName);
            }
          }
        }
      }

      if (effect.life <= 0) {
        effects.splice(i, 1);
      }
    }
  }

  function updateDamageTexts(run, delta) {
    const texts = run.damageTexts || [];

    for (let i = texts.length - 1; i >= 0; i -= 1) {
      const text = texts[i];
      text.life = safeNumber(text.life, 0) - delta;
      text.y = safeNumber(text.y, 0) + safeNumber(text.vy, -24) * delta;
      text.vy = safeNumber(text.vy, -24) - 8 * delta;

      if (text.life <= 0) {
        texts.splice(i, 1);
      }
    }
  }

  function gainExp(run, amount) {
    const abilities = Data.abilities || [];
    const minExpToNext = Math.max(1, safeNumber((Data.limits || {}).minExpToNext, 1));

    run.exp = Math.max(0, safeNumber(run.exp, 0) + Math.max(0, safeNumber(amount, 0) * safeNumber(run.player && run.player.expMultiplier, 1)));

    while (run.exp >= run.expToNext) {
      run.exp -= run.expToNext;
      run.level = Math.max(1, Math.floor(safeNumber(run.level, 1))) + 1;
      run.expToNext = Math.max(minExpToNext, Math.floor(safeNumber(run.expToNext, 24) * 1.32 + 10 + Math.max(0, safeNumber(run.level, 1) - 5) * 3 + Math.max(0, safeNumber(run.level, 1) - 10) * 5));
      if (shouldOfferRelic(run)) {
        run.relicChoices = chooseRelics(run, 3);
        run.pendingAbilities = run.relicChoices;
        run.relicOfferCount = Math.max(0, Math.floor(safeNumber(run.relicOfferCount, 0))) + 1;
      } else {
        run.pendingAbilities = chooseAbilities(abilities, 3);
      }
      run.mode = states.levelup || "levelup";
      break;
    }
  }

  function shouldOfferRelic(run) {
    const offerCount = Math.max(0, Math.floor(safeNumber(run && run.relicOfferCount, 0)));
    const modifiers = getChallengeModifiers(run);
    const maxOffers = 2 + Math.max(0, Math.floor(safeNumber(modifiers.relicOfferBonus, 0)));
    const requiredLevel = offerCount === 0 ? 6 : 11;
    const relics = Data.relics || [];

    return !!run && offerCount < maxOffers && relics.length > 0 && safeNumber(run.level, 1) >= requiredLevel;
  }

  function chooseRelics(run, count) {
    const relics = Data.relics || [];
    const owned = {};
    const excluded = run && run.excludedAbilityIds ? run.excludedAbilityIds : {};
    const pinned = run && run.pinnedAbilityIds ? run.pinnedAbilityIds : {};
    const pool = [];
    const result = [];
    const selectedDepth = safeInteger(run && run.selectedDepth, 0);

    for (let i = 0; i < (run.relics || []).length; i += 1) {
      owned[(run.relics[i] || {}).id] = true;
    }

    for (let i = 0; i < relics.length; i += 1) {
      if (relics[i] && !owned[relics[i].id] && !excluded[relics[i].id] && selectedDepth >= safeInteger(relics[i].minDepth, 0)) {
        pool.push(relics[i]);
      }
    }

    for (let i = pool.length - 1; i >= 0 && result.length < count; i -= 1) {
      if (pool[i] && pinned[pool[i].id]) {
        const relic = pool.splice(i, 1)[0];
        result.push({
          id: relic.id,
          name: relic.name,
          description: relic.description,
          rarity: relic.rarity || "일반",
          category: "relic",
          type: "relic",
          tags: relic.tags || [],
          effect: relic.effect || {}
        });
      }
    }

    while (pool.length && result.length < count) {
      const index = Math.floor(Math.random() * pool.length);
      const relic = pool.splice(index, 1)[0];
      result.push({
        id: relic.id,
        name: relic.name,
        description: relic.description,
        rarity: relic.rarity || "일반",
        category: "relic",
        type: "relic",
        tags: relic.tags || [],
        effect: relic.effect || {}
      });
    }

    return result;
  }

  function createSupportChoice(run, supportData, isUpgrade) {
    const owned = findRunSupportWeapon(run, supportData.id);
    const nextLevel = clamp(safeInteger(owned && owned.level, 0) + 1, 1, getSupportWeaponLimits().maxLevel);
    const category = isUpgrade ? "supportUpgrade" : "support";

    return {
      id: (isUpgrade ? "supportUpgrade:" : "support:") + supportData.id,
      supportId: supportData.id,
      name: (isUpgrade ? "[보조강화] " : "[보조무기] ") + supportData.name + (isUpgrade ? " Lv." + nextLevel : ""),
      description: isUpgrade ? supportData.name + "의 피해와 효율이 증가합니다." : supportData.description,
      rarity: isUpgrade ? "uncommon" : "rare",
      category: category,
      type: category,
      tags: supportData.tags || []
    };
  }

  function chooseSupportChoices(run) {
    const supports = Array.isArray(Data.supportWeapons) ? Data.supportWeapons : [];
    const limits = getSupportWeaponLimits();
    const ownedCount = run && Array.isArray(run.supportWeapons) ? run.supportWeapons.length : 0;
    const excluded = run && run.excludedAbilityIds ? run.excludedAbilityIds : {};
    const pool = [];
    const result = [];

    for (let i = 0; i < supports.length; i += 1) {
      const supportData = supports[i];
      const owned = findRunSupportWeapon(run, supportData.id);
      if (owned) {
        if (safeInteger(owned.level, 1) < Math.min(limits.maxLevel, safeInteger(supportData.maxLevel, limits.maxLevel))) {
          const upgradeChoice = createSupportChoice(run, supportData, true);
          if (!excluded[upgradeChoice.id]) {
            pool.push(upgradeChoice);
          }
        }
      } else if (ownedCount < limits.maxSlots) {
        const supportChoice = createSupportChoice(run, supportData, false);
        if (!excluded[supportChoice.id]) {
          pool.push(supportChoice);
        }
      }
    }

    while (pool.length && result.length < 2) {
      const index = Math.floor(Math.random() * pool.length);
      result.push(pool.splice(index, 1)[0]);
    }

    return result;
  }

  function getMapRoomData(roomId) {
    return findById(Data.mapRooms, roomId, "combat");
  }

  function createMapRoomChoice(room) {
    const data = room || getMapRoomData("combat");
    return {
      id: data.id,
      name: data.name || "전투방",
      shortName: data.shortName || data.name || "전투",
      icon: data.icon || "⚔",
      rarity: data.rarity || "common",
      description: data.description || "기본 전투가 이어집니다.",
      risk: clamp(safeInteger(data.risk, 1), 0, 5),
      rewardMultiplier: clamp(safeNumber(data.rewardMultiplier, 1), 0.1, 2),
      rewardHint: data.rewardHint || "",
      immediateEffect: data.immediateEffect || "",
      healRatio: clamp(safeNumber(data.healRatio, 0), 0, 1),
      modifiers: Object.assign({}, data.modifiers || {})
    };
  }

  function chooseMapRooms(run) {
    const rooms = Array.isArray(Data.mapRooms) ? Data.mapRooms : [];
    const maxChoices = Math.max(1, safeInteger((Data.map || {}).choicesPerOffer, 3));
    const pool = [];
    const result = [];
    const seen = {};
    const player = run && run.player ? run.player : {};
    const hpRatio = safeNumber(player.hp, 1) / Math.max(1, safeNumber(player.maxHp, 1));
    const elapsed = safeNumber(run && run.time, 0);

    for (let i = 0; i < rooms.length; i += 1) {
      const room = rooms[i];
      if (!room || !room.id) {
        continue;
      }
      let weight = 10;
      if (room.id === "combat") {
        weight = 22;
      } else if (room.id === "heal") {
        weight = hpRatio < 0.45 ? 22 : 8;
      } else if (room.id === "elite") {
        weight = elapsed > safeNumber(run.runDuration, 180) * 0.33 ? 16 : 8;
      } else if (room.id === "relic") {
        weight = safeInteger(run.relicOfferCount, 0) < 3 ? 10 : 3;
      } else if (room.id === "support") {
        weight = Array.isArray(Data.supportWeapons) && Data.supportWeapons.length ? 14 : 6;
      }
      for (let j = 0; j < weight; j += 1) {
        pool.push(room);
      }
    }

    result.push(createMapRoomChoice(getMapRoomData(hpRatio < 0.35 ? "heal" : "combat")));
    seen[result[0].id] = true;

    while (pool.length && result.length < maxChoices) {
      const index = Math.floor(Math.random() * pool.length);
      const room = pool.splice(index, 1)[0];
      if (!seen[room.id]) {
        result.push(createMapRoomChoice(room));
        seen[room.id] = true;
      }
    }

    while (result.length < maxChoices) {
      const fallback = createMapRoomChoice(getMapRoomData("combat"));
      fallback.id = fallback.id + ":" + result.length;
      result.push(fallback);
    }

    return result.slice(0, maxChoices);
  }

  function startMapChoice(run) {
    if (!run || isBossRushRun(run) || run.mode !== (states.running || "running")) {
      return false;
    }

    run.mapRoomChoices = chooseMapRooms(run);
    run.mode = states.mapChoice || "mapChoice";
    if (run.input) {
      run.input.active = false;
      run.input.moveX = 0;
      run.input.moveY = 0;
      run.input.pointerId = null;
    }
    return true;
  }

  function updateMapChoiceTrigger(run) {
    const times = Array.isArray(run && run.mapChoiceTimes) ? run.mapChoiceTimes : [];
    const maxChoices = Math.max(0, safeInteger((Data.map || {}).maxChoices, 3));
    const index = clamp(safeInteger(run && run.mapChoiceIndex, 0), 0, maxChoices);
    const targetTime = times[index];

    if (!run || isBossRushRun(run) || index >= maxChoices || !Number.isFinite(Number(targetTime))) {
      return;
    }
    if (run.bossRush || run.selectedRunModeId === "bossRush" || run.finished || run.mode !== (states.running || "running")) {
      return;
    }
    if (run.mapChoicesTriggered && run.mapChoicesTriggered[String(index)]) {
      run.mapChoiceIndex = index + 1;
      return;
    }
    if (safeNumber(run.time, 0) >= safeNumber(targetTime, 0)) {
      if (!run.mapChoicesTriggered) {
        run.mapChoicesTriggered = {};
      }
      run.mapChoicesTriggered[String(index)] = true;
      run.mapChoiceIndex = index + 1;
      startMapChoice(run);
    }
  }

  function spawnMiniObjective(run, forced) {
    const game = Data.game || {};
    const count = safeInteger(run && run.objectiveSpawnCount, 0);
    const maxCount = Math.max(0, safeInteger(game.miniObjectiveCount, 2));
    const player = run && run.player ? run.player : null;
    const radius = Math.max(24, safeNumber(game.miniObjectiveRadius, 48));
    const width = getWorldWidth(run);
    const height = getWorldHeight(run);
    const angle = Math.random() * Math.PI * 2;
    const distance = forced ? 72 : 130;

    if (!run || !player || isBossRushRun(run) || (!forced && count >= maxCount)) {
      return null;
    }
    if (!Array.isArray(run.miniObjectives)) {
      run.miniObjectives = [];
    }

    const objective = {
      id: "beacon-" + Date.now() + "-" + Math.floor(Math.random() * 10000),
      type: "beacon",
      name: "심연 봉화",
      x: clamp(safeNumber(player.x, width / 2) + Math.cos(angle) * distance, radius, width - radius),
      y: clamp(safeNumber(player.y, height / 2) + Math.sin(angle) * distance, radius, height - radius),
      radius: radius,
      progress: 0,
      target: Math.max(3, safeNumber(game.miniObjectiveHoldTime, 10)),
      life: forced ? 42 : 36,
      completed: false
    };

    run.miniObjectives.push(objective);
    run.objectiveSpawnCount = count + 1;
    run.message = "심연 봉화가 열렸습니다";
    run.messageTimer = 2;
    return objective;
  }

  function updateMiniObjectives(run, delta) {
    const game = Data.game || {};
    const player = run && run.player ? run.player : null;
    const objectives = Array.isArray(run && run.miniObjectives) ? run.miniObjectives : [];

    if (!run || !player || isBossRushRun(run)) {
      return;
    }

    if (safeNumber(run.nextObjectiveTime, 0) > 0 && safeNumber(run.time, 0) >= safeNumber(run.nextObjectiveTime, 0)) {
      spawnMiniObjective(run, false);
      run.nextObjectiveTime = safeNumber(run.time, 0) + Math.max(15, safeNumber(game.miniObjectiveInterval, 95));
    }

    for (let i = objectives.length - 1; i >= 0; i -= 1) {
      const objective = objectives[i];
      const radius = Math.max(1, safeNumber(objective.radius, 48));
      const inside = distanceSquared(player, objective) <= Math.pow(radius + safeNumber(player.radius, 12), 2);

      objective.life = Math.max(0, safeNumber(objective.life, 0) - delta);
      if (inside) {
        objective.progress = Math.min(safeNumber(objective.target, 10), safeNumber(objective.progress, 0) + delta);
        player.hp = Math.min(safeNumber(player.maxHp, 1), safeNumber(player.hp, 0) + 0.7 * delta);
      }

      if (safeNumber(objective.progress, 0) >= safeNumber(objective.target, 10)) {
        run.completedObjectiveCount = safeInteger(run.completedObjectiveCount, 0) + 1;
        run.objectiveRewardMultiplier = safeNumber(run.objectiveRewardMultiplier, 1) * safeNumber(game.miniObjectiveRewardMultiplier, 1.08);
        run.pathRewardMultiplier = clamp(safeNumber(run.pathRewardMultiplier, 1) * safeNumber(game.miniObjectiveRewardMultiplier, 1.08), 0.1, safeNumber((Data.map || {}).rewardMultiplierMax, 1.6));
        gainExp(run, 24 + safeInteger(run.selectedDepth, 0) * 2);
        run.message = "봉화 완료 · 보상 증가";
        run.messageTimer = 2;
        pushEffect(run, {
          type: "objective",
          x: safeNumber(objective.x, 0),
          y: safeNumber(objective.y, 0),
          radius: radius + 24,
          life: 0.5,
          maxLife: 0.5
        });
        objectives.splice(i, 1);
      } else if (safeNumber(objective.life, 0) <= 0) {
        run.failedObjectiveCount = safeInteger(run.failedObjectiveCount, 0) + 1;
        objectives.splice(i, 1);
      }
    }
  }

  function applyRoomImmediateEffect(run, room) {
    const effect = room && room.immediateEffect;

    if (effect === "heal") {
      healPlayer(run, Math.max(0, safeNumber(run.player && run.player.maxHp, 1) * safeNumber(room.healRatio, 0.35)));
      run.mode = states.running || "running";
      return;
    }

    if (effect === "relicChoice") {
      const choices = chooseRelics(run, 3);
      if (choices.length > 0) {
        run.pendingAbilities = choices;
        run.relicChoices = choices;
        run.relicOfferCount = Math.max(0, safeInteger(run.relicOfferCount, 0)) + 1;
        run.mode = states.levelup || "levelup";
        return;
      }
    }

    if (effect === "supportChoice") {
      const supportChoices = chooseSupportChoices(run);
      if (supportChoices.length > 0) {
        run.pendingAbilities = supportChoices.slice(0, 3);
        run.relicChoices = [];
        run.mode = states.levelup || "levelup";
        return;
      }
      run.pendingAbilities = chooseAbilities(Data.abilities || [], 3);
      run.relicChoices = [];
      run.mode = states.levelup || "levelup";
      return;
    }

    if (effect === "objective") {
      spawnMiniObjective(run, true);
      run.mode = states.running || "running";
      return;
    }

    run.mode = states.running || "running";
  }

  function chooseAbilities(abilities, count) {
    const run = AS.State && AS.State.getRun ? AS.State.getRun() : null;
    const supportChoices = run ? chooseSupportChoices(run) : [];
    const limits = getSupportWeaponLimits();
    const pool = [];
    const result = [];
    const excluded = run && run.excludedAbilityIds ? run.excludedAbilityIds : {};
    const pinned = run && run.pinnedAbilityIds ? run.pinnedAbilityIds : {};

    for (let i = 0; i < abilities.length; i += 1) {
      const ability = abilities[i];
      const category = ability.category || "normal";
      const currentLevel = run && run.abilityLevels ? Math.max(0, Math.floor(safeNumber(run.abilityLevels[ability.id], 0))) : 0;
      const maxLevel = Math.max(1, Math.floor(safeNumber(ability.maxLevel, 99)));
      const requiredLevel = Math.max(1, Math.floor(safeNumber(ability.requiredLevel, 1)));

      if (ability.weaponId && (!run || ability.weaponId !== run.selectedWeaponId)) {
        continue;
      }
      if (excluded[ability.id]) {
        continue;
      }

      if (category === "evolution") {
        if (!run || safeNumber(run.level, 1) < requiredLevel || !run.evolutions || run.evolutions[ability.id]) {
          continue;
        }
      } else if (currentLevel >= maxLevel) {
        continue;
      }

      pool.push(ability);
    }

    for (let i = 0; i < abilities.length && result.length < count; i += 1) {
      if (abilities[i] && pinned[abilities[i].id] && !excluded[abilities[i].id] && pool.indexOf(abilities[i]) >= 0) {
        result.push(abilities[i]);
        pool.splice(pool.indexOf(abilities[i]), 1);
      }
    }

    if (supportChoices.length > 0 && (Math.random() < limits.offerChance || pool.length < count)) {
      result.push(supportChoices.shift());
    }

    while (pool.length && result.length < count) {
      const index = Math.floor(Math.random() * pool.length);
      result.push(pool.splice(index, 1)[0]);
    }

    while (supportChoices.length && result.length < count) {
      result.push(supportChoices.shift());
    }

    return result;
  }

  function regenerateChoices(run) {
    let choices;
    const pinned = run && run.pinnedAbilityIds ? run.pinnedAbilityIds : {};
    const pinnedChoices = [];

    if (!run) {
      return [];
    }

    if (Array.isArray(run.pendingAbilities)) {
      for (let i = 0; i < run.pendingAbilities.length; i += 1) {
        if (run.pendingAbilities[i] && pinned[run.pendingAbilities[i].id]) {
          pinnedChoices.push(run.pendingAbilities[i]);
        }
      }
    }

    if (Array.isArray(run.relicChoices) && run.relicChoices.length > 0) {
      choices = chooseRelics(run, 3);
      if (choices.length > 0) {
        choices = pinnedChoices.concat(choices.filter(function (choice) {
          return !pinned[choice.id];
        })).slice(0, 3);
        run.relicChoices = choices;
        run.pendingAbilities = choices;
        return choices;
      }
    }

    choices = chooseAbilities(Data.abilities || [], 3);
    choices = pinnedChoices.concat(choices.filter(function (choice) {
      return !pinned[choice.id];
    })).slice(0, 3);
    run.relicChoices = [];
    run.pendingAbilities = choices;
    return choices;
  }

  function ensureOrbital(run) {
    if (!run.orbitals) {
      run.orbitals = [];
    }

    if (run.orbitals.length > 0) {
      return;
    }

    run.orbitals.push({
      angle: 0,
      distance: 42,
      radius: 7,
      damage: 8,
      speed: 2.8,
      sourceId: "orbitalShield",
      sourceName: "회전 보호막"
    });
  }

  function dropGem(run, enemy) {
    const game = Data.game || {};
    const modifiers = getChallengeModifiers(run);
    const maxGems = Math.max(1, safeNumber(game.maxGems, 120));
    const gemExpMultiplier = Math.max(0.1, safeNumber(modifiers.gemExpMultiplier, 1));
    const gemDropBonus = clamp(safeNumber(modifiers.gemDropBonus, 0), 0, 0.75);
    const expValue = Math.max(0, safeNumber(enemy.exp, 0) * gemExpMultiplier);

    if (run.gems.length >= maxGems || expValue <= 0) {
      return;
    }

    run.gems.push({
      x: safeNumber(enemy.x, 0),
      y: safeNumber(enemy.y, 0),
      radius: 5,
      exp: expValue
    });

    if (run.gems.length < maxGems && gemDropBonus > 0 && Math.random() < gemDropBonus) {
      run.gems.push({
        x: safeNumber(enemy.x, 0) + (Math.random() * 14 - 7),
        y: safeNumber(enemy.y, 0) + (Math.random() * 14 - 7),
        radius: 4,
        exp: Math.max(1, expValue * 0.5)
      });
    }
  }

  function startBossRushReward(run) {
    const game = Data.game || {};
    const rewardCount = Math.max(0, safeInteger(run && run.bossRushRewardCount, 0)) + 1;
    let choices = [];

    if (!run || run.finished) {
      return;
    }

    run.bossRushRewardCount = rewardCount;
    run.bossRushSpawnTimer = Math.max(0.4, safeNumber(game.bossRushSpawnDelay, 1.2));
    run.enemies = (run.enemies || []).filter(function (target) {
      return target && target.isBoss;
    });

    if (rewardCount % 2 === 0) {
      choices = chooseRelics(run, 3);
      if (choices.length > 0) {
        run.relicOfferCount = Math.max(0, safeInteger(run.relicOfferCount, 0)) + 1;
      }
    }

    if (!choices.length) {
      choices = chooseAbilities(Data.abilities || [], 3);
    }
    if (!choices.length) {
      choices = chooseRelics(run, 3);
      if (choices.length > 0) {
        run.relicOfferCount = Math.max(0, safeInteger(run.relicOfferCount, 0)) + 1;
      }
    }

    run.pendingAbilities = choices;
    run.relicChoices = choices.length && choices[0].category === "relic" ? choices : [];
    run.message = "다음 보스 전 보상을 선택하세요";
    run.messageTimer = 3;

    if (choices.length > 0) {
      run.mode = states.levelup || "levelup";
    }
  }

  function defeatEnemy(run, enemy, index) {
    const player = run.player || {};
    run.kills = Math.max(0, Math.floor(safeNumber(run.kills, 0))) + 1;
    dropGem(run, enemy);
    healPlayer(run, safeNumber(player.lifeStealOnKill, 0) * safeNumber(player.killHealMultiplier, 1));
    healPlayer(run, safeNumber(getChallengeModifiers(run).healOnKill, 0));

    if (enemy.elite) {
      run.eliteKills = Math.max(0, Math.floor(safeNumber(run.eliteKills, 0))) + 1;
      if (enemy.eliteType === "splitter") {
        spawnEnemyNear(run, "normal", safeNumber(enemy.x, 0) - 12, safeNumber(enemy.y, 0));
        spawnEnemyNear(run, "normal", safeNumber(enemy.x, 0) + 12, safeNumber(enemy.y, 0));
      } else if (enemy.eliteType === "volatile") {
        pushEffect(run, {
          type: "explosion",
          x: safeNumber(enemy.x, 0),
          y: safeNumber(enemy.y, 0),
          radius: 46,
          life: 0.28
        });
        for (let i = run.enemies.length - 1; i >= 0; i -= 1) {
          if (run.enemies[i] !== enemy && distanceSquared(enemy, run.enemies[i]) <= 46 * 46) {
            damageEnemy(run, run.enemies[i], Math.max(6, safeNumber(run.player && run.player.damage, 12) * 0.75), "explosion");
          }
        }
      }
    }

    if (enemy.isBoss) {
      if (enemy.finalBoss || enemy.bossId === "abyssSovereign") {
        run.finalBossDefeated = true;
      }
      if (enemy.variantId) {
        run.variantBossDefeated = true;
        run.variantBossKillsInRun = Math.max(0, safeInteger(run.variantBossKillsInRun, 0)) + 1;
      }
      run.activeBossVariantModifiers = {};

      if (isBossRushRun(run)) {
        run.bossDefeated = true;
        run.bossRushActiveBoss = false;
        run.bossRushDefeated = Math.max(0, safeInteger(run.bossRushDefeated, 0)) + 1;
        run.bossRushIndex = Math.max(0, safeInteger(run.bossRushIndex, 0)) + 1;
        run.enemies.splice(index, 1);

        if (safeInteger(run.bossRushDefeated, 0) >= safeInteger(run.bossRushBossCount, 4)) {
          run.message = "보스 러시 클리어";
          run.messageTimer = 3;
          AS.State.finishRun(true);
          return;
        }

        startBossRushReward(run);
        return;
      }

      run.bossDefeated = true;
      if (!run.finalWaveStarted && !run.finished) {
        run.finalWaveStarted = true;
        run.finalWaveTimer = 0;
        run.message = "심연 폭주가 시작되었습니다";
        run.messageTimer = 3;
      }
    }

    run.enemies.splice(index, 1);
  }

  function handleProjectileHits(run) {
    for (let i = run.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = run.projectiles[i];
      let projectileRemoved = false;
      const hitIds = projectile.hitIds || {};

      for (let j = run.enemies.length - 1; j >= 0; j -= 1) {
        const enemy = run.enemies[j];
        const hitRadius = safeNumber(projectile.radius, 1) + safeNumber(enemy.radius, 1);
        const enemyId = String(enemy.id);

        if (hitIds[enemyId]) {
          continue;
        }

        if (distanceSquared(projectile, enemy) <= hitRadius * hitRadius) {
            damageEnemy(run, enemy, Math.max(1, safeNumber(projectile.damage, 1)), "projectile", projectile.sourceId, projectile.sourceName);
          hitIds[enemyId] = true;
          projectile.hitIds = hitIds;

          projectile.pierce = Math.max(0, Math.floor(safeNumber(projectile.pierce, 0))) - 1;

          if (projectile.pierce < 0) {
            run.projectiles.splice(i, 1);
            projectileRemoved = true;
            break;
          }
        }
      }

      if (projectileRemoved) {
        continue;
      }
    }
  }

  function handlePlayerHits(run, delta) {
    const player = run.player;
    run.invincibleTimer = Math.max(0, safeNumber(run.invincibleTimer, 0) - delta);
    run.bossContactTimer = Math.max(0, safeNumber(run.bossContactTimer, 0) - delta);

    for (let i = 0; i < run.enemies.length; i += 1) {
      const enemy = run.enemies[i];
      const hitRadius = safeNumber(player.radius, 1) + safeNumber(enemy.radius, 1);

      if (distanceSquared(player, enemy) <= hitRadius * hitRadius) {
        if (enemy.isBoss) {
          if (run.bossContactTimer > 0) {
            continue;
          }
          player.hp = Math.max(0, safeNumber(player.hp, 0) - Math.max(0, safeNumber(enemy.damage, 0) * safeNumber(player.damageTakenMultiplier, 1) * safeNumber(player.contactDamageMultiplier, 1) * getBossContactDamageMultiplier(run)));
          run.bossContactTimer = Math.max(0.1, safeNumber((Data.game || {}).bossContactTickInterval, 0.7));
          run.invincibleTimer = Math.max(run.invincibleTimer, 0.12);
        } else {
          if (run.invincibleTimer > 0) {
            continue;
          }
          player.hp = Math.max(0, safeNumber(player.hp, 0) - Math.max(0, safeNumber(enemy.damage, 0) * safeNumber(player.damageTakenMultiplier, 1) * safeNumber(player.contactDamageMultiplier, 1)));
          run.invincibleTimer = Math.max(0, safeNumber(player.invincibleTime, 0.6));
        }
        player.hitFlashTimer = 0.16;
        pushImpactEffect(run, player, "player", safeNumber(player.radius, 12) + 8);

        if (player.hp <= 0) {
          AS.State.finishRun(false);
        }

        return;
      }
    }
  }

  function damageEnemy(run, enemy, amount, type, sourceId, sourceName) {
    const player = run && run.player ? run.player : {};
    let damage = Math.max(1, safeNumber(amount, 1));
    const damageType = type || "projectile";
    const weapon = getWeapon(run);
    const statSourceId = sourceId || (weapon && weapon.id) || damageType;
    const statSourceName = sourceName || (weapon && weapon.name) || "기본 공격";
    const beforeHp = Math.max(0, safeNumber(enemy && enemy.hp, 0));

    if (!run || !enemy) {
      return;
    }

    damage *= safeNumber(enemy.damageTakenMultiplier, 1);
    if (enemy.elite) {
      damage *= safeNumber(player.eliteDamageMultiplier, 1);
    }
    if (enemy.isBoss) {
      damage *= safeNumber(player.bossDamageMultiplier, 1);
    }
    damage = Math.max(1, damage);

    enemy.hp = safeNumber(enemy.hp, 0) - damage;
    recordDamage(run, statSourceId, statSourceName, Math.min(beforeHp, damage), enemy);
    enemy.hitFlashTimer = Math.max(safeNumber(enemy.hitFlashTimer, 0), 0.1);
    pushImpactEffect(run, enemy, damageType, safeNumber(enemy.radius, 8) + (damageType === "explosion" ? 12 : 6));
    pushDamageText(run, safeNumber(enemy.x, 0), safeNumber(enemy.y, 0) - safeNumber(enemy.radius, 8), damage, getEffectColor(damageType));

    if (enemy.hp <= 0) {
      const index = run.enemies.indexOf(enemy);
      if (index >= 0) {
        defeatEnemy(run, enemy, index);
      }
    }
  }

  function updateOrbitals(run, delta) {
    const orbitals = run.orbitals || [];
    const player = run.player;

    for (let i = 0; i < orbitals.length; i += 1) {
      const orbital = orbitals[i];
      const angle = safeNumber(orbital.angle, 0) + safeNumber(orbital.speed, 2.8) * delta;
      const phaseAngle = angle + safeNumber(orbital.phase, 0);
      orbital.angle = angle;
      orbital.x = safeNumber(player.x, 0) + Math.cos(phaseAngle) * safeNumber(orbital.distance, 42);
      orbital.y = safeNumber(player.y, 0) + Math.sin(phaseAngle) * safeNumber(orbital.distance, 42);

      for (let j = run.enemies.length - 1; j >= 0; j -= 1) {
        const enemy = run.enemies[j];
        const hitRadius = safeNumber(orbital.radius, 7) + safeNumber(enemy.radius, 8);
        enemy.orbitalHitTimer = Math.max(0, safeNumber(enemy.orbitalHitTimer, 0) - delta);

        if (enemy.orbitalHitTimer <= 0 && distanceSquared(orbital, enemy) <= hitRadius * hitRadius) {
          enemy.orbitalHitTimer = safeNumber(orbital.hitCooldown, 0.45);
          damageEnemy(run, enemy, Math.max(2, safeNumber(orbital.damage, safeNumber(run.player.damage, 12) * 0.65) * safeNumber(player.orbitalDamageMultiplier, 1)), "slash", orbital.sourceId, orbital.sourceName);
        }
      }
    }
  }

  function updateNova(run, delta) {
    const player = run.player;
    const cooldown = Math.max(1, 5 + safeNumber(player.novaCooldownBonus, 0));
    const radius = Math.max(20, 70 + safeNumber(player.novaRadiusBonus, 0));
    let hitCount = 0;

    if (!run.evolutions || !run.evolutions.abyssNova) {
      return;
    }

    run.novaTimer = Math.max(0, safeNumber(run.novaTimer, cooldown) - delta);
    run.novaPulseTimer = Math.max(0, safeNumber(run.novaPulseTimer, 0) - delta);

    if (run.novaTimer > 0) {
      return;
    }

    run.novaTimer = cooldown;
    run.novaPulseTimer = 0.35;

    for (let i = run.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = run.enemies[i];
      const hitRadius = radius + safeNumber(enemy.radius, 8);

      if (distanceSquared(player, enemy) <= hitRadius * hitRadius) {
        damageEnemy(run, enemy, Math.max(3, safeNumber(player.damage, 12) * 0.95), "explosion", "abyssNova", "심연 폭발");
        hitCount += 1;
      }
    }

    if (hitCount > 0) {
      run.message = "심연 폭발";
      run.messageTimer = 0.8;
    }
  }

  function hasBossPattern(boss, patternId) {
    const patterns = Array.isArray(boss && boss.patterns) ? boss.patterns : [];
    return patterns.indexOf(patternId) >= 0;
  }

  function updateBossPatterns(run, delta) {
    const pattern = Data.bossPattern || {};
    const player = run.player;
    const width = getWorldWidth(run);
    const height = getWorldHeight(run);

    for (let i = run.enemies.length - 1; i >= 0; i -= 1) {
      const boss = run.enemies[i];
      let dir;
      let summonCount;

      if (!boss.isBoss) {
        continue;
      }

      if (!boss.phaseTwo && safeNumber(boss.hp, 0) <= safeNumber(boss.maxHp, 1) * safeNumber(boss.phase2HpRatio, 0.5)) {
        boss.phaseTwo = true;
        boss.baseSpeed = safeNumber(boss.baseSpeed, boss.speed) * 1.15;
        boss.speed = safeNumber(boss.speed, boss.baseSpeed) * 1.12;
        boss.color = "#ff5f9a";
        boss.phaseCooldownMultiplier = 0.78;
        boss.summonTimer = Math.min(safeNumber(boss.summonTimer, safeNumber(pattern.summonCooldown, 7)), 2.5);
        boss.chargeTimer = Math.min(safeNumber(boss.chargeTimer, safeNumber(pattern.chargeCooldown, 6.6)), 2);
        run.message = "보스 2페이즈";
        run.messageTimer = 1.2;
      }

      boss.chargeTimer = Math.max(0, safeNumber(boss.chargeTimer, safeNumber(pattern.chargeCooldown, 7)) - delta);
      boss.summonTimer = Math.max(0, safeNumber(boss.summonTimer, safeNumber(pattern.summonCooldown, 8)) - delta);
      boss.auraTickTimer = Math.max(0, safeNumber(boss.auraTickTimer, safeNumber(pattern.auraTick, 1.2)) - delta);
      boss.shockwaveTimer = Math.max(0, safeNumber(boss.shockwaveTimer, 4.8) - delta);
      boss.stormAuraTimer = Math.max(0, safeNumber(boss.stormAuraTimer, 1.4) - delta);

      if (boss.chargePrepareTimer > 0) {
        boss.chargePrepareTimer = Math.max(0, boss.chargePrepareTimer - delta);
        if (boss.chargePrepareTimer <= 0) {
          boss.chargeActiveTimer = safeNumber(pattern.chargeDuration, 0.8);
          boss.speed = safeNumber(boss.baseSpeed, boss.speed) * safeNumber(pattern.chargeSpeedMultiplier, 3.1);
        }
      } else if (boss.chargeActiveTimer > 0) {
        boss.chargeActiveTimer = Math.max(0, boss.chargeActiveTimer - delta);
        if (boss.chargeActiveTimer <= 0) {
          boss.speed = safeNumber(boss.baseSpeed, boss.speed);
          boss.chargeTimer = safeNumber(pattern.chargeCooldown, 7) * safeNumber(boss.phaseCooldownMultiplier, 1) * safeNumber(boss.chargeCooldownMultiplier, 1);
        }
      } else if (boss.chargeTimer <= 0) {
        dir = normalize(safeNumber(player.x, 0) - safeNumber(boss.x, 0), safeNumber(player.y, 0) - safeNumber(boss.y, 0));
        boss.chargeDirX = dir.x;
        boss.chargeDirY = dir.y;
        boss.chargePrepareTimer = safeNumber(pattern.chargePrepareTime, 0.6);
        pushEffect(run, {
          type: "warningLine",
          fromX: safeNumber(boss.x, 0),
          fromY: safeNumber(boss.y, 0),
          toX: safeNumber(boss.x, 0) + dir.x * 220,
          toY: safeNumber(boss.y, 0) + dir.y * 220,
          lineWidth: safeNumber(boss.radius, 32) * 1.1,
          life: safeNumber(pattern.chargePrepareTime, 0.6),
          maxLife: safeNumber(pattern.chargePrepareTime, 0.6)
        });
        run.message = "보스 돌진";
        run.messageTimer = 0.9;
      }

      if (boss.summonTimer <= 0) {
        summonCount = Math.floor(safeNumber(pattern.summonCountMin, 2) + Math.random() * (safeNumber(pattern.summonCountMax, 4) - safeNumber(pattern.summonCountMin, 2) + 1));
        for (let s = 0; s < summonCount; s += 1) {
          const angle = Math.PI * 2 * (s / Math.max(1, summonCount)) + Math.random() * 0.4;
          const summoned = spawnEnemyNear(run, "normal", safeNumber(boss.x, width / 2) + Math.cos(angle) * 48, safeNumber(boss.y, height / 2) + Math.sin(angle) * 48);
          if (summoned && hasBossPattern(boss, "splitterAura")) {
            summoned.maxHp = Math.max(1, safeNumber(summoned.maxHp, 1) * 1.15);
            summoned.hp = summoned.maxHp;
            summoned.color = "#8fd8ff";
          }
        }
        boss.summonTimer = safeNumber(pattern.summonCooldown, 8) * safeNumber(boss.phaseCooldownMultiplier, 1) * safeNumber(boss.summonIntervalMultiplier, 1);
      }

      if (hasBossPattern(boss, "shockwave") && boss.shockwaveTimer <= 0) {
        const shockRadius = boss.phaseTwo ? 124 : 96;
        pushEffect(run, {
          type: "explosion",
          x: safeNumber(boss.x, 0),
          y: safeNumber(boss.y, 0),
          radius: shockRadius,
          life: 0.32,
          maxLife: 0.32
        });
        if (distanceSquared(player, boss) <= Math.pow(shockRadius + safeNumber(player.radius, 12), 2)) {
          player.hp = Math.max(0, safeNumber(player.hp, 0) - Math.max(4, safeNumber(boss.damage, 12) * 0.35) * safeNumber(player.damageTakenMultiplier, 1));
          player.hitFlashTimer = 0.16;
          pushImpactEffect(run, player, "player", safeNumber(player.radius, 12) + 10);
          if (player.hp <= 0) {
            AS.State.finishRun(false);
            return;
          }
        }
        boss.shockwaveTimer = boss.phaseTwo ? 3.8 : 5.2;
        boss.shockwaveWarned = false;
      } else if (hasBossPattern(boss, "shockwave") && boss.shockwaveTimer <= 0.65 && !boss.shockwaveWarned) {
        boss.shockwaveWarned = true;
        pushEffect(run, {
          type: "warningCircle",
          x: safeNumber(boss.x, 0),
          y: safeNumber(boss.y, 0),
          radius: boss.phaseTwo ? 124 : 96,
          life: 0.65,
          maxLife: 0.65
        });
      }

      if (hasBossPattern(boss, "stormAura") && boss.stormAuraTimer <= 0) {
        pushEffect(run, {
          type: "warningCircle",
          x: safeNumber(player.x, 0),
          y: safeNumber(player.y, 0),
          radius: boss.phaseTwo ? 34 : 28,
          life: 0.16,
          maxLife: 0.16
        });
        pushEffect(run, {
          type: "lightning",
          fromX: safeNumber(boss.x, 0),
          fromY: safeNumber(boss.y, 0),
          toX: safeNumber(player.x, 0),
          toY: safeNumber(player.y, 0),
          lineWidth: boss.phaseTwo ? 5 : 3,
          life: 0.18,
          maxLife: 0.18
        });
        if (distanceSquared(player, boss) <= Math.pow(safeNumber(boss.auraRadius, 88) + 26, 2)) {
          player.hp = Math.max(0, safeNumber(player.hp, 0) - Math.max(2, safeNumber(boss.damage, 12) * 0.18) * safeNumber(player.damageTakenMultiplier, 1));
          player.hitFlashTimer = 0.12;
          if (player.hp <= 0) {
            AS.State.finishRun(false);
            return;
          }
        }
        boss.stormAuraTimer = boss.phaseTwo ? 0.9 : 1.3;
      }

      if (boss.auraTickTimer <= 0) {
        boss.auraTickTimer = safeNumber(pattern.auraTick, 1.2);
        if (distanceSquared(player, boss) <= Math.pow(safeNumber(boss.auraRadius, 62) + safeNumber(player.radius, 12), 2)) {
          player.hp = Math.max(0, safeNumber(player.hp, 0) - Math.max(1, safeNumber(pattern.auraDamage, 5) * (1 + safeNumber(boss.auraDamageBonus, 0)) * safeNumber(player.damageTakenMultiplier, 1)));
          player.hitFlashTimer = 0.16;
          pushImpactEffect(run, player, "player", safeNumber(player.radius, 12) + 10);
          if (player.hp <= 0) {
            AS.State.finishRun(false);
            return;
          }
        }
      }

      boss.x = clamp(safeNumber(boss.x, width / 2), safeNumber(boss.radius, 32), width - safeNumber(boss.radius, 32));
      boss.y = clamp(safeNumber(boss.y, height / 2), safeNumber(boss.radius, 32), height - safeNumber(boss.radius, 32));
    }
  }

  function collectGems(run, delta) {
    const player = run.player;
    const safeDelta = clamp(safeNumber(delta, 0.016), 0, 0.05);

    for (let i = run.gems.length - 1; i >= 0; i -= 1) {
      const gem = run.gems[i];
      const pickupRadius = safeNumber(player.pickupRadius, 32) + safeNumber(gem.radius, 5);
      const attractRadius = pickupRadius * 2.4;
      const distSq = distanceSquared(player, gem);

      if (distSq <= pickupRadius * pickupRadius) {
        gainExp(run, gem.exp);
        if (safeNumber(player.gemHealChance, 0) > 0 && Math.random() < safeNumber(player.gemHealChance, 0)) {
          player.hp = Math.min(safeNumber(player.maxHp, 1), safeNumber(player.hp, 0) + safeNumber(player.gemHealAmount, 0));
        }
        run.gems.splice(i, 1);
      } else if (distSq <= attractRadius * attractRadius) {
        const dir = normalize(safeNumber(player.x, 0) - safeNumber(gem.x, 0), safeNumber(player.y, 0) - safeNumber(gem.y, 0));
        gem.x += dir.x * 120 * safeDelta;
        gem.y += dir.y * 120 * safeDelta;
      }
    }
  }

  function trimCollections(run) {
    const game = Data.game || {};
    const maxEnemies = getMaxEnemies(run);
    const maxProjectiles = Math.max(1, safeNumber(game.maxProjectiles, 80));
    const maxGems = Math.max(1, safeNumber(game.maxGems, 120));
    const maxEffects = Math.max(1, safeNumber(game.maxEffects, 48));
    const maxDamageTexts = Math.max(1, safeNumber(game.maxDamageTexts, 36));
    const maxMines = Math.max(1, safeNumber(game.maxMines, 30));

    if (!run.enemies) {
      run.enemies = [];
    }
    if (!run.projectiles) {
      run.projectiles = [];
    }
    if (!run.gems) {
      run.gems = [];
    }
    if (!run.effects) {
      run.effects = [];
    }
    if (!run.damageTexts) {
      run.damageTexts = [];
    }

    while (run.enemies.length > maxEnemies) {
      run.enemies.shift();
    }
    while (run.projectiles.length > maxProjectiles) {
      run.projectiles.shift();
    }
    while (run.gems.length > maxGems) {
      run.gems.shift();
    }
    while ((run.effects || []).length > maxEffects) {
      run.effects.shift();
    }
    while ((run.damageTexts || []).length > maxDamageTexts) {
      run.damageTexts.shift();
    }
    if (run.mines) {
      while (run.mines.length > maxMines) {
        run.mines.shift();
      }
    }
  }

  function sanitizeActorNumbers(actor, fallbackX, fallbackY) {
    if (!actor) {
      return;
    }

    actor.x = safeNumber(actor.x, fallbackX);
    actor.y = safeNumber(actor.y, fallbackY);
    actor.radius = Math.max(0, safeNumber(actor.radius, 1));
    if (Object.prototype.hasOwnProperty.call(actor, "hp")) {
      actor.hp = Math.max(0, safeNumber(actor.hp, 0));
    }
    if (Object.prototype.hasOwnProperty.call(actor, "maxHp")) {
      actor.maxHp = Math.max(1, safeNumber(actor.maxHp, 1));
      actor.hp = clamp(safeNumber(actor.hp, actor.maxHp), 0, actor.maxHp);
    }
    if (Object.prototype.hasOwnProperty.call(actor, "damage")) {
      actor.damage = Math.max(0, safeNumber(actor.damage, 0));
    }
    if (Object.prototype.hasOwnProperty.call(actor, "speed")) {
      actor.speed = Math.max(0, safeNumber(actor.speed, 0));
    }
  }

  function sanitizeRunNumbers(run) {
    const worldWidth = getWorldWidth(run);
    const worldHeight = getWorldHeight(run);
    const player = run && run.player ? run.player : null;
    const arrays = ["enemies", "projectiles", "gems", "effects", "damageTexts"];

    if (!run) {
      return;
    }

    run.time = Math.max(0, safeNumber(run.time, 0));
    run.remainingTime = Math.max(0, safeNumber(run.remainingTime, safeNumber(run.runDuration, 0)));
    run.rewardMultiplier = clamp(safeNumber(run.rewardMultiplier, 1), 0, 5);
    run.pathRewardMultiplier = clamp(safeNumber(run.pathRewardMultiplier, 1), 0.1, safeNumber((Data.map || {}).rewardMultiplierMax, 1.6));

    if (player) {
      sanitizeActorNumbers(player, worldWidth / 2, worldHeight / 2);
      player.x = clamp(player.x, safeNumber(player.radius, 12), worldWidth - safeNumber(player.radius, 12));
      player.y = clamp(player.y, safeNumber(player.radius, 12), worldHeight - safeNumber(player.radius, 12));
      player.attackCooldown = Math.max(0.01, safeNumber(player.attackCooldown, 0.5));
      player.projectileSpeed = Math.max(0, safeNumber(player.projectileSpeed, 0));
      player.projectileRadius = Math.max(1, safeNumber(player.projectileRadius, 1));
      player.pickupRadius = Math.max(1, safeNumber(player.pickupRadius, 1));
    }

    for (let i = 0; i < arrays.length; i += 1) {
      if (!Array.isArray(run[arrays[i]])) {
        run[arrays[i]] = [];
      }
    }

    for (let e = run.enemies.length - 1; e >= 0; e -= 1) {
      sanitizeActorNumbers(run.enemies[e], worldWidth / 2, worldHeight / 2);
      if (run.enemies[e].x < -200 || run.enemies[e].x > worldWidth + 200 || run.enemies[e].y < -200 || run.enemies[e].y > worldHeight + 200) {
        run.enemies.splice(e, 1);
      }
    }

    for (let p = run.projectiles.length - 1; p >= 0; p -= 1) {
      sanitizeActorNumbers(run.projectiles[p], player ? player.x : worldWidth / 2, player ? player.y : worldHeight / 2);
      run.projectiles[p].vx = safeNumber(run.projectiles[p].vx, 0);
      run.projectiles[p].vy = safeNumber(run.projectiles[p].vy, 0);
      run.projectiles[p].life = Math.max(0, safeNumber(run.projectiles[p].life, 0));
    }

    for (let g = run.gems.length - 1; g >= 0; g -= 1) {
      sanitizeActorNumbers(run.gems[g], player ? player.x : worldWidth / 2, player ? player.y : worldHeight / 2);
      run.gems[g].exp = Math.max(0, safeNumber(run.gems[g].exp, 0));
    }

    for (let t = run.damageTexts.length - 1; t >= 0; t -= 1) {
      sanitizeActorNumbers(run.damageTexts[t], player ? player.x : worldWidth / 2, player ? player.y : worldHeight / 2);
      run.damageTexts[t].value = Math.max(0, safeNumber(run.damageTexts[t].value, 0));
      run.damageTexts[t].life = Math.max(0, safeNumber(run.damageTexts[t].life, 0));
    }
  }

  function applyAbilityValue(player, ability, run) {
    const limits = Data.limits || {};
    const stat = ability.stat;
    const value = safeNumber(ability.value, 0);

    if (ability.type === "weaponStat") {
      if (!run.weaponGrowth) {
        run.weaponGrowth = {};
      }
      run.weaponGrowth[stat] = safeNumber(run.weaponGrowth[stat], 0) + value;
      return;
    }

    if (ability.type === "heal") {
      player.hp = Math.min(safeNumber(player.maxHp, 1), safeNumber(player.hp, 0) + value);
      return;
    }

    if (stat === "maxHp") {
      player.maxHp = Math.max(1, safeNumber(player.maxHp, 1) + value);
      player.hp = Math.min(player.maxHp, safeNumber(player.hp, 0) + safeNumber(ability.hpValue, value));
      return;
    }

    player[stat] = safeNumber(player[stat], 0) + value;

    if (stat === "attackCooldown") {
      player[stat] = Math.max(0.15, Math.max(safeNumber(limits.minAttackCooldown, 0.12), player[stat]));
    } else if (stat === "speed") {
      player[stat] = Math.max(safeNumber(limits.minPlayerSpeed, 20), player[stat]);
    } else if (stat === "damage") {
      player[stat] = Math.max(safeNumber(limits.minDamage, 1), player[stat]);
    } else if (stat === "projectileRadius" || stat === "pickupRadius") {
      player[stat] = Math.max(1, player[stat]);
    }
  }

  function applySupportWeaponAbility(run, ability) {
    const limits = getSupportWeaponLimits();
    const supportData = getSupportWeaponData(ability && ability.supportId);
    let owned;

    ensureRunCollections(run);
    owned = findRunSupportWeapon(run, supportData.id);

    if (owned) {
      owned.level = Math.min(Math.min(limits.maxLevel, safeInteger(supportData.maxLevel, limits.maxLevel)), safeInteger(owned.level, 1) + 1);
      owned.cooldown = Math.min(safeNumber(owned.cooldown, 0), 0.2);
      run.message = supportData.name + " Lv." + owned.level;
    } else if (run.supportWeapons.length < limits.maxSlots) {
      run.supportWeapons.push({
        id: supportData.id,
        level: 1,
        cooldown: 0
      });
      run.message = supportData.name + " 획득";
    }

    run.messageTimer = 2;
  }

  function hasRelic(run, relicId) {
    const relics = run && run.relics ? run.relics : [];

    for (let i = 0; i < relics.length; i += 1) {
      if (relics[i] && relics[i].id === relicId) {
        return true;
      }
    }

    return false;
  }

  function hasBuildBonus(run, bonusId) {
    const bonuses = run && run.buildBonuses ? run.buildBonuses : [];

    for (let i = 0; i < bonuses.length; i += 1) {
      if (bonuses[i] && bonuses[i].id === bonusId) {
        return true;
      }
    }

    return false;
  }

  function addBuildBonus(run, bonusId, name) {
    if (!run.buildBonuses) {
      run.buildBonuses = [];
    }

    if (hasBuildBonus(run, bonusId)) {
      return false;
    }

    run.buildBonuses.push({ id: bonusId, name: name });
    run.message = name + " 발동";
    run.messageTimer = 2;
    return true;
  }

  function addTags(counts, tags, amount) {
    const list = Array.isArray(tags) ? tags : [];
    const value = Math.max(1, Math.floor(safeNumber(amount, 1)));

    for (let i = 0; i < list.length; i += 1) {
      counts[list[i]] = Math.max(0, safeNumber(counts[list[i]], 0)) + value;
    }
  }

  function collectTagCounts(run) {
    const counts = {};
    const abilityLevels = run.abilityLevels || {};
    const abilities = Data.abilities || [];
    const relics = Data.relics || [];
    const weapon = getWeapon(run);

    addTags(counts, weapon.tags, 1);

    for (let i = 0; i < abilities.length; i += 1) {
      const ability = abilities[i];
      if (safeNumber(abilityLevels[ability.id], 0) > 0 || (run.evolutions && run.evolutions[ability.id])) {
        addTags(counts, ability.tags, 1);
      }
    }

    for (let i = 0; i < (run.relics || []).length; i += 1) {
      const relic = findById(relics, run.relics[i].id, "");
      addTags(counts, relic.tags, 1);
    }

    return counts;
  }

  function hasAnyTagCount(counts, tags) {
    let total = 0;

    for (let i = 0; i < tags.length; i += 1) {
      total += safeNumber(counts[tags[i]], 0);
    }

    return total;
  }

  function applyRelicEffect(run, relic) {
    const player = run.player;
    const effect = relic.effect || {};
    const relicEffectMultiplier = Math.max(0.1, safeNumber(getChallengeModifiers(run).relicEffectMultiplier, 1));
    const hpRatio = safeNumber(player.hp, 0) / Math.max(1, safeNumber(player.maxHp, 1));
    function boostedEffectValue(key, fallback) {
      return safeNumber(effect[key], fallback) * relicEffectMultiplier;
    }

    if (!run.relics) {
      run.relics = [];
    }

    run.relics.push({ id: relic.id, name: relic.name, rarity: relic.rarity || "일반" });
    player.maxHp = Math.max(1, safeNumber(player.maxHp, 1) + boostedEffectValue("maxHp", 0));
    player.maxHp = Math.max(1, player.maxHp * safeNumber(effect.maxHpMultiplier, 1));
    player.hp = clamp(player.maxHp * clamp(hpRatio, 0, 1) + Math.max(0, boostedEffectValue("maxHp", 0)), 1, player.maxHp);
    player.speed = Math.max(0, (safeNumber(player.speed, 0) + boostedEffectValue("speed", 0)) * safeNumber(effect.speedMultiplier, 1));
    player.damage = Math.max(1, safeNumber(player.damage, 1) + boostedEffectValue("damage", 0));
    player.damage = Math.max(1, player.damage * safeNumber(effect.damageMultiplier, 1));
    player.attackCooldown = Math.max(0.15, safeNumber(player.attackCooldown, 0.5) + boostedEffectValue("attackCooldown", 0));
    player.attackCooldown = Math.max(0.12, player.attackCooldown * safeNumber(effect.attackCooldownMultiplier, 1));
    player.projectileSpeed = Math.max(0, safeNumber(player.projectileSpeed, 0) + boostedEffectValue("projectileSpeed", 0));
    player.projectileRadius = Math.max(1, safeNumber(player.projectileRadius, 1) + boostedEffectValue("projectileRadius", 0));
    player.pickupRadius = Math.max(1, safeNumber(player.pickupRadius, 1) + boostedEffectValue("pickupRadius", 0));
    player.invincibleTime = Math.max(0, safeNumber(player.invincibleTime, 0) + boostedEffectValue("invincibleTime", 0));
    player.damageTakenMultiplier = Math.max(0.1, safeNumber(player.damageTakenMultiplier, 1) * safeNumber(effect.damageTakenMultiplier, 1) * safeNumber(effect.damageReductionMultiplier, 1));
    player.contactDamageMultiplier = Math.max(0.1, safeNumber(player.contactDamageMultiplier, 1) * safeNumber(effect.contactDamageMultiplier, 1));
    player.supportDamageMultiplier = Math.max(0.1, safeNumber(player.supportDamageMultiplier, 1) * safeNumber(effect.supportDamageMultiplier, 1));
    player.supportCooldownMultiplier = Math.max(0.1, safeNumber(player.supportCooldownMultiplier, 1) * safeNumber(effect.supportCooldownMultiplier, 1));
    player.expMultiplier = Math.max(0.1, safeNumber(player.expMultiplier, 1) * safeNumber(effect.expMultiplier, 1));
    player.gemHealChance = clamp(safeNumber(player.gemHealChance, 0) + boostedEffectValue("gemHealChance", 0), 0, 1);
    player.gemHealAmount = Math.max(0, safeNumber(player.gemHealAmount, 0) + boostedEffectValue("gemHealAmount", 0));
    player.lifeStealOnKill = Math.max(0, safeNumber(player.lifeStealOnKill, 0) + boostedEffectValue("lifeStealOnKill", 0));
    player.killHealMultiplier = Math.max(0.1, safeNumber(player.killHealMultiplier, 1) * safeNumber(effect.killHealMultiplier, 1));
    player.mineBonus = Math.max(0, safeInteger(player.mineBonus, 0) + Math.floor(boostedEffectValue("mineBonus", 0)));
    player.chainBonus = Math.max(0, safeInteger(player.chainBonus, 0) + Math.floor(boostedEffectValue("chainBonus", 0)));
    player.projectilePierceBonus = Math.max(0, safeInteger(player.projectilePierceBonus, 0) + Math.floor(boostedEffectValue("projectilePierceBonus", 0)));
    player.meleeDamageMultiplier = Math.max(0.1, safeNumber(player.meleeDamageMultiplier, 1) * safeNumber(effect.meleeDamageMultiplier, 1));
    player.lineDamageMultiplier = Math.max(0.1, safeNumber(player.lineDamageMultiplier, 1) * safeNumber(effect.lineDamageMultiplier, 1));
    player.spreadDamageMultiplier = Math.max(0.1, safeNumber(player.spreadDamageMultiplier, 1) * safeNumber(effect.spreadDamageMultiplier, 1));
    player.chainDamageMultiplier = Math.max(0.1, safeNumber(player.chainDamageMultiplier, 1) * safeNumber(effect.chainDamageMultiplier, 1));
    player.explosionDamageMultiplier = Math.max(0.1, safeNumber(player.explosionDamageMultiplier, 1) * safeNumber(effect.explosionDamageMultiplier, 1));
    player.waveDamageMultiplier = Math.max(0.1, safeNumber(player.waveDamageMultiplier, 1) * safeNumber(effect.waveDamageMultiplier, 1));
    player.mineRadiusMultiplier = Math.max(0.1, safeNumber(player.mineRadiusMultiplier, 1) * safeNumber(effect.mineRadiusMultiplier, 1));
    player.explosionRadiusMultiplier = Math.max(0.1, safeNumber(player.explosionRadiusMultiplier, 1) * safeNumber(effect.explosionRadiusMultiplier, 1));
    player.waveRadiusMultiplier = Math.max(0.1, safeNumber(player.waveRadiusMultiplier, 1) * safeNumber(effect.waveRadiusMultiplier, 1));
    player.mineRadiusMultiplier = Math.max(0.1, safeNumber(player.mineRadiusMultiplier, 1) * safeNumber(effect.areaMultiplier, 1));
    player.explosionRadiusMultiplier = Math.max(0.1, safeNumber(player.explosionRadiusMultiplier, 1) * safeNumber(effect.areaMultiplier, 1));
    player.waveRadiusMultiplier = Math.max(0.1, safeNumber(player.waveRadiusMultiplier, 1) * safeNumber(effect.areaMultiplier, 1));
    player.explosionDamageMultiplier = Math.max(0.1, safeNumber(player.explosionDamageMultiplier, 1) * safeNumber(effect.explosionMultiplier, 1));
    player.waveDamageMultiplier = Math.max(0.1, safeNumber(player.waveDamageMultiplier, 1) * safeNumber(effect.waveMultiplier, 1));
    player.eliteDamageMultiplier = Math.max(0.1, safeNumber(player.eliteDamageMultiplier, 1) * safeNumber(effect.eliteDamageMultiplier, 1));
    player.bossDamageMultiplier = Math.max(0.1, safeNumber(player.bossDamageMultiplier, 1) * safeNumber(effect.bossDamageMultiplier, 1));
    player.effectDurationMultiplier = Math.max(0.1, safeNumber(player.effectDurationMultiplier, 1) * safeNumber(effect.effectDurationMultiplier, 1));
    run.rewardMultiplier = Math.max(0, safeNumber(run.rewardMultiplier, 1) * safeNumber(effect.shardRewardMultiplier, 1));
    run.message = relic.name + " 획득";
    run.messageTimer = 2;
  }

  function updateBuildBonuses(run) {
    const player = run.player || {};
    const abilityLevels = run.abilityLevels || {};
    const hasPiercing = run.evolutions && run.evolutions.piercingShot;
    const hasSplit = run.evolutions && run.evolutions.splitShot;
    const hasOrbital = run.evolutions && run.evolutions.orbitalShield;
    const hasNova = run.evolutions && run.evolutions.abyssNova;
    const hasHpSource = hasRelic(run, "bloodCore") || hasRelic(run, "brokenShield") || hasRelic(run, "voidHand") || safeNumber(abilityLevels.maxHpUp, 0) >= 2 || safeNumber(player.maxHp, 0) >= 130;
    const hasDamageSource = hasRelic(run, "sharpHeart") || hasRelic(run, "abyssPact") || safeNumber(abilityLevels.damageUp, 0) > 0 || safeNumber(player.damage, 0) >= 24;
    const tagCounts = collectTagCounts(run);

    if (hasPiercing && hasSplit && addBuildBonus(run, "bulletBuild", "탄환 빌드")) {
      player.projectileRadius = Math.max(1, safeNumber(player.projectileRadius, 1) + 1);
      player.projectileSpeed = Math.max(0, safeNumber(player.projectileSpeed, 0) + 20);
    }

    if (hasOrbital && hasHpSource && addBuildBonus(run, "meleeSurvivalBuild", "근접 생존 빌드")) {
      player.damageTakenMultiplier = Math.max(0.1, safeNumber(player.damageTakenMultiplier, 1) * 0.95);
      player.orbitalDamageMultiplier = Math.max(0.1, safeNumber(player.orbitalDamageMultiplier, 1) * 1.1);
    }

    if (hasNova && hasDamageSource && addBuildBonus(run, "explosionBuild", "폭발 빌드")) {
      player.novaRadiusBonus = safeNumber(player.novaRadiusBonus, 0) + 15;
      player.novaCooldownBonus = safeNumber(player.novaCooldownBonus, 0) - 0.5;
    }

    if (hasAnyTagCount(tagCounts, ["bullet", "projectile"]) >= 3 && addBuildBonus(run, "bulletExpert", "탄환 전문가")) {
      player.projectileSpeed = Math.max(0, safeNumber(player.projectileSpeed, 0) + 28);
      player.projectileRadius = Math.max(1, safeNumber(player.projectileRadius, 1) + 1);
    }

    if (hasAnyTagCount(tagCounts, ["explosion"]) >= 3 && addBuildBonus(run, "explosionAddict", "폭발 중독")) {
      player.novaRadiusBonus = safeNumber(player.novaRadiusBonus, 0) + 18;
      player.novaCooldownBonus = safeNumber(player.novaCooldownBonus, 0) - 0.35;
      player.damage = Math.max(1, safeNumber(player.damage, 1) + 2);
    }

    if (hasAnyTagCount(tagCounts, ["survival", "shield", "hp"]) >= 4 && addBuildBonus(run, "unyieldingSurvivor", "불굴의 생존자")) {
      player.damageTakenMultiplier = Math.max(0.1, safeNumber(player.damageTakenMultiplier, 1) * 0.9);
      player.maxHp = Math.max(1, safeNumber(player.maxHp, 1) + 18);
      player.hp = Math.min(player.maxHp, safeNumber(player.hp, 1) + 18);
    }

    if (hasAnyTagCount(tagCounts, ["lightning", "speed", "chain"]) >= 3 && addBuildBonus(run, "lightningChaser", "번개 추격자")) {
      player.speed = Math.max(0, safeNumber(player.speed, 0) + 14);
      player.attackCooldown = Math.max(0.12, safeNumber(player.attackCooldown, 0.5) - 0.04);
    }

    if (hasAnyTagCount(tagCounts, ["abyss"]) >= 3 && addBuildBonus(run, "abyssContractor", "심연 계약자")) {
      player.damage = Math.max(1, safeNumber(player.damage, 1) * 1.12);
      player.damageTakenMultiplier = Math.max(0.1, safeNumber(player.damageTakenMultiplier, 1) * 1.06);
    }

    if (hasAnyTagCount(tagCounts, ["growth", "pickup", "exp"]) >= 3 && addBuildBonus(run, "growthCollector", "성장 수집가")) {
      player.pickupRadius = Math.max(1, safeNumber(player.pickupRadius, 1) + 14);
      player.expMultiplier = Math.max(0.1, safeNumber(player.expMultiplier, 1) * 1.08);
    }

    if (hasAnyTagCount(tagCounts, ["blood"]) >= 3 && addBuildBonus(run, "bloodPact", "피의 계약")) {
      player.lifeStealOnKill = Math.max(0, safeNumber(player.lifeStealOnKill, 0) + 1);
      player.killHealMultiplier = Math.max(0.1, safeNumber(player.killHealMultiplier, 1) * 1.18);
      player.damageTakenMultiplier = Math.max(0.1, safeNumber(player.damageTakenMultiplier, 1) * 1.03);
    }

    if (hasAnyTagCount(tagCounts, ["install", "explosion"]) >= 3 && addBuildBonus(run, "installExpert", "장치 전문가")) {
      player.attackCooldown = Math.max(0.12, safeNumber(player.attackCooldown, 0.5) - 0.03);
      player.mineRadiusMultiplier = Math.max(0.1, safeNumber(player.mineRadiusMultiplier, 1) * 1.08);
      player.explosionRadiusMultiplier = Math.max(0.1, safeNumber(player.explosionRadiusMultiplier, 1) * 1.06);
    }

    if (hasAnyTagCount(tagCounts, ["pierce", "projectile"]) >= 4 && addBuildBonus(run, "piercingExecutioner", "관통 처형자")) {
      player.lineDamageMultiplier = Math.max(0.1, safeNumber(player.lineDamageMultiplier, 1) * 1.12);
      player.projectilePierceBonus = Math.max(0, safeInteger(player.projectilePierceBonus, 0) + 1);
      player.bossDamageMultiplier = Math.max(0.1, safeNumber(player.bossDamageMultiplier, 1) * 1.06);
    }
  }

  function applyEvolution(run, ability) {
    if (!run.evolutions || run.evolutions[ability.id]) {
      return;
    }

    run.evolutions[ability.id] = true;

    if (ability.id === "orbitalShield") {
      ensureOrbital(run);
    } else if (ability.id === "abyssNova") {
      run.novaTimer = 1.5;
      run.novaPulseTimer = 0;
    }

    run.message = ability.name + " 획득";
    run.messageTimer = 2;
  }

  AS.Game = {
    getWeaponStats: function (run) {
      return getWeaponStats(run || (AS.State && AS.State.getRun ? AS.State.getRun() : null));
    },

    isEnemyTargetable: function (run, enemy, origin, maxRange) {
      return isEnemyTargetable(run, enemy, origin, maxRange, getViewportMargin());
    },

    getBossContactDamageMultiplier: function (run) {
      return getBossContactDamageMultiplier(run || (AS.State && AS.State.getRun ? AS.State.getRun() : null));
    },

    recordDamage: function (run, sourceId, sourceName, amount, target) {
      return recordDamage(run || (AS.State && AS.State.getRun ? AS.State.getRun() : null), sourceId, sourceName, amount, target);
    },

    getDamageRanking: function (run, limit) {
      return getDamageRanking(run || (AS.State && AS.State.getRun ? AS.State.getRun() : null), limit || 5);
    },

    getMapRoomData: function (roomId) {
      return getMapRoomData(roomId);
    },

    getBossVariantChance: function (run) {
      return getBossVariantChance(run || (AS.State && AS.State.getRun ? AS.State.getRun() : null));
    },

    getBossVariantData: function (variantId) {
      return getBossVariantData(variantId);
    },

    chooseRelics: function (run, count) {
      return chooseRelics(run || (AS.State && AS.State.getRun ? AS.State.getRun() : null), count || 3);
    },

    applyBossVariant: function (enemy, variantId) {
      return applyBossVariant(enemy, getBossVariantData(variantId));
    },

    chooseMapRooms: function (run) {
      return chooseMapRooms(run || (AS.State && AS.State.getRun ? AS.State.getRun() : null));
    },

    applyMapRoom: function (roomId) {
      const run = AS.State.getRun();
      const choices = Array.isArray(run.mapRoomChoices) ? run.mapRoomChoices : [];
      let selected = null;

      for (let i = 0; i < choices.length; i += 1) {
        if (choices[i] && choices[i].id === roomId) {
          selected = choices[i];
          break;
        }
      }

      if (!selected) {
        selected = createMapRoomChoice(getMapRoomData(roomId));
      }

      run.currentMapRoom = {
        id: selected.id,
        name: selected.name,
        shortName: selected.shortName,
        risk: safeInteger(selected.risk, 1),
        rewardMultiplier: safeNumber(selected.rewardMultiplier, 1)
      };
      run.activeRoomModifiers = Object.assign({}, selected.modifiers || {});
      run.pathRewardMultiplier = clamp(safeNumber(run.pathRewardMultiplier, 1) * safeNumber(selected.rewardMultiplier, 1), 0.1, safeNumber((Data.map || {}).rewardMultiplierMax, 1.6));
      if (!Array.isArray(run.pathHistory)) {
        run.pathHistory = [];
      }
      if (run.pathHistory.length < Math.max(1, safeInteger((Data.map || {}).maxChoices, 3))) {
        run.pathHistory.push({
          time: Math.max(0, Math.floor(safeNumber(run.time, 0))),
          roomId: selected.id,
          roomName: selected.name,
          risk: safeInteger(selected.risk, 1),
          rewardMultiplier: safeNumber(selected.rewardMultiplier, 1)
        });
      }
      run.mapRoomChoices = [];
      run.message = selected.name + " 선택";
      run.messageTimer = 2;
      applyRoomImmediateEffect(run, selected);
      return run;
    },

    rerollAbilityChoices: function () {
      const run = AS.State.getRun();

      if (!run || run.mode !== (states.levelup || "levelup") || safeInteger(run.rerollsRemaining, 0) <= 0) {
        return run;
      }

      run.rerollsRemaining = Math.max(0, safeInteger(run.rerollsRemaining, 0) - 1);
      regenerateChoices(run);
      return run;
    },

    togglePinnedChoice: function (abilityId) {
      const run = AS.State.getRun();

      if (!run || !abilityId) {
        return run;
      }
      if (!run.pinnedAbilityIds) {
        run.pinnedAbilityIds = {};
      }
      if (run.pinnedAbilityIds[abilityId]) {
        delete run.pinnedAbilityIds[abilityId];
      } else {
        run.pinnedAbilityIds[abilityId] = true;
      }
      return run;
    },

    excludeAbilityChoice: function (abilityId) {
      const run = AS.State.getRun();

      if (!run || !abilityId || safeInteger(run.excludesRemaining, 0) <= 0) {
        return run;
      }
      if (!run.excludedAbilityIds) {
        run.excludedAbilityIds = {};
      }
      if (!run.pinnedAbilityIds) {
        run.pinnedAbilityIds = {};
      }
      run.excludedAbilityIds[abilityId] = true;
      delete run.pinnedAbilityIds[abilityId];
      run.excludesRemaining = Math.max(0, safeInteger(run.excludesRemaining, 0) - 1);
      regenerateChoices(run);
      return run;
    },

    update: function (run, delta) {
      const game = Data.game || {};
      const safeDelta = clamp(safeNumber(delta, 0), 0, 0.05);

      if (!run || run.mode !== (states.running || "running") || safeDelta <= 0) {
        return;
      }

      ensureRunCollections(run);
      sanitizeRunNumbers(run);
      run.time = Math.max(0, safeNumber(run.time, 0) + safeDelta);
      run.remainingTime = Math.max(0, safeNumber(run.runDuration, safeNumber(game.runDuration, 180)) - run.time);
      updateMapChoiceTrigger(run);
      if (run.mode !== (states.running || "running")) {
        return;
      }
      if (!run.initialBuildChecked) {
        run.initialBuildChecked = true;
        updateBuildBonuses(run);
      }

      run.player.hitFlashTimer = Math.max(0, safeNumber(run.player.hitFlashTimer, 0) - safeDelta);
      movePlayer(run, safeDelta);
      updateSpawning(run, safeDelta);
      updateEnemies(run, safeDelta);
      updateBossPatterns(run, safeDelta);
      updateMiniObjectives(run, safeDelta);
      if (run.mode !== (states.running || "running")) {
        return;
      }
      updateAttack(run, safeDelta);
      updateSupportWeapons(run, safeDelta);
      updateEffects(run, safeDelta);
      updateDamageTexts(run, safeDelta);
      updateProjectiles(run, safeDelta);
      handleProjectileHits(run);
      if (run.mode !== (states.running || "running")) {
        return;
      }
      handlePlayerHits(run, safeDelta);
      if (run.mode !== (states.running || "running")) {
        return;
      }
      collectGems(run, safeDelta);
      updateOrbitals(run, safeDelta);
      if (run.mode !== (states.running || "running")) {
        return;
      }
      updateNova(run, safeDelta);
      if (run.mode !== (states.running || "running")) {
        return;
      }
      trimCollections(run);

      run.messageTimer = Math.max(0, safeNumber(run.messageTimer, 0) - safeDelta);
      if (run.messageTimer <= 0) {
        run.message = "";
      }

      sanitizeRunNumbers(run);
      if (run.remainingTime <= 0 && run.mode === (states.running || "running")) {
        AS.State.finishRun(!isBossRushRun(run));
      }
    },

    applyAbility: function (abilityId) {
      const run = AS.State.getRun();
      const pending = run.pendingAbilities || [];
      let selected = null;

      for (let i = 0; i < pending.length; i += 1) {
        if (pending[i] && pending[i].id === abilityId) {
          selected = pending[i];
          break;
        }
      }

      if (!selected || !run.player) {
        return run;
      }

      if ((selected.category || "normal") === "relic" || selected.type === "relic") {
        applyRelicEffect(run, selected);
      } else if (selected.type === "support" || selected.type === "supportUpgrade") {
        applySupportWeaponAbility(run, selected);
      } else if ((selected.category || "normal") === "evolution" || selected.type === "evolution") {
        applyEvolution(run, selected);
      } else {
        applyAbilityValue(run.player, selected, run);
        if (!run.abilityLevels) {
          run.abilityLevels = {};
        }
        run.abilityLevels[selected.id] = Math.max(0, Math.floor(safeNumber(run.abilityLevels[selected.id], 0))) + 1;
      }

      updateBuildBonuses(run);
      run.pendingAbilities = [];
      run.relicChoices = [];
      run.mode = states.running || "running";
      return run;
    }
  };
})();
