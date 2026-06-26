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
    return modifiers;
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
    return bosses[zone.bossId] || bosses.watcher || getEnemyData("boss");
  }

  function getWeapon(run) {
    return findById(Data.weapons, run && run.selectedWeaponId, "abyssBullet");
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

  function getMaxEnemies(run) {
    const game = Data.game || {};
    const modifiers = getChallengeModifiers(run);
    const baseMax = Math.max(1, safeNumber(game.maxEnemies, 80));
    const bonus = isFinalWaveActive(run) ? Math.max(0, safeNumber(game.finalWaveMaxEnemiesBonus, 0)) : 0;
    const eventBonus = Math.max(0, safeNumber(modifiers.maxEnemiesBonus, 0));

    return clamp(baseMax + bonus + eventBonus, 1, 140);
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
    const damageBonus = 1 + powerGrowth * 0.18;
    const cooldownBonus = 1 - speedGrowth * 0.08;
    const sizeBonus = 1 + sizeGrowth * 0.08;
    const weaponTags = Array.isArray(weapon.tags) ? weapon.tags : [];
    const hasProjectileTag = weaponTags.indexOf("projectile") >= 0;
    const hasAbyssTag = weaponTags.indexOf("abyss") >= 0;
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

    stats.orbitCount = clamp(1 + getWeaponGrowth(run, "orbitCount") + Math.floor(countGrowth / 2), 1, 5);
    stats.orbitRadius = clamp((46 * (0.85 + sizeScale * 0.15) + getWeaponGrowth(run, "orbitRadius") * 5) * weaponMasterySize, 34, 82);
    stats.orbitBladeRadius = clamp(8 * sizeScale * (1 + getWeaponGrowth(run, "orbitPower") * 0.08) * weaponMasterySize, 5, 21);
    stats.orbitAngularSpeed = clamp(3.3 * speedScale * (1 + getWeaponGrowth(run, "orbitSpeed") * 0.16), 1.8, 8);
    stats.orbitDamage = clamp(stats.damage * (1 + getWeaponGrowth(run, "orbitPower") * 0.12), 2, 999);
    stats.orbitHitCooldown = clamp(0.45 * (stats.cooldown / 0.55), 0.16, 0.55);

    stats.lightningRange = clamp(160 + speedGrowth * 5, 140, 240);
    stats.chainCount = clamp(safeInteger(weapon.chainCount, 3) + getWeaponGrowth(run, "chainCount") + safeInteger(player.chainBonus, 0), 1, 6);
    stats.chainBeamCount = clamp(1 + getWeaponGrowth(run, "chainBeamCount") + Math.floor(countGrowth / 2), 1, 3);
    stats.chainWidth = clamp(3 * sizeScale + getWeaponGrowth(run, "chainWidth") * 1.3, 2, 9);
    stats.chainRange = clamp(96 * (0.92 + speedScale * 0.08), 84, 160);
    stats.chainDamage = clamp(stats.damage * 0.5 * (1 + getWeaponGrowth(run, "chainPower") * 0.08 + getWeaponGrowth(run, "chainWidth") * 0.05) * safeNumber(player.chainDamageMultiplier, 1), 1, 999);

    stats.mineCount = clamp(1 + getWeaponGrowth(run, "mineCount") + safeInteger(player.mineBonus, 0) + (hasExplosionBonus ? 1 : 0), 1, 4);
    stats.mineRadius = clamp(safeNumber(weapon.radius, 48) * sizeScale * safeNumber(player.mineRadiusMultiplier, 1) * safeNumber(player.explosionRadiusMultiplier, 1) * (1 + getWeaponGrowth(run, "mineRadius") * 0.12 + (hasExplosionBonus ? 0.08 : 0)) * weaponMasterySize, 24, 116);
    stats.mineArmTimer = clamp(0.45 / speedScale - getWeaponGrowth(run, "mineSpeed") * 0.04, 0.16, 0.55);
    stats.mineDamage = clamp(stats.damage * (1 + getWeaponGrowth(run, "minePower") * 0.14 + (hasExplosionBonus ? 0.08 : 0)) * safeNumber(player.explosionDamageMultiplier, 1), 4, 999);

    stats.waveCount = clamp(1 + getWeaponGrowth(run, "waveCount") + Math.floor(countGrowth / 2), 1, 3);
    stats.waveRadius = clamp(safeNumber(weapon.radius, 118) * sizeScale * safeNumber(player.waveRadiusMultiplier, 1) * (1 + getWeaponGrowth(run, "waveRadius") * 0.1) * weaponMasterySize, 55, 247);
    stats.waveArc = clamp(0.7 * (0.85 + sizeScale * 0.15), 0.45, 1.15);
    stats.waveLife = clamp(0.22 * (0.9 + speedScale * 0.1) * safeNumber(player.effectDurationMultiplier, 1), 0.16, 0.5);
    stats.waveDamage = clamp(stats.damage * (1 + getWeaponGrowth(run, "wavePower") * 0.12) * safeNumber(player.waveDamageMultiplier, 1), 3, 999);

    stats.scytheCount = clamp(1 + Math.floor(countGrowth / 2), 1, 3);
    stats.scytheRange = clamp((safeNumber(weapon.range, 76) * (0.9 + sizeScale * 0.1) + getWeaponGrowth(run, "scytheRange") * 9) * weaponMasterySize, 42, 155);
    stats.scytheArc = clamp(safeNumber(weapon.arcWidth, 1.35) + sizeGrowth * 0.08, 0.7, 2.35);
    stats.scytheDamage = clamp(stats.damage * safeNumber(player.meleeDamageMultiplier, 1), 2, 999);
    stats.scytheHeal = clamp(safeNumber(weapon.healOnHit, 0.5) + powerGrowth * 0.15, 0, 4);

    stats.lineRange = clamp((safeNumber(weapon.range, 260) * (0.9 + speedScale * 0.1) + speedGrowth * 8) * weaponMasterySize, 120, 460);
    stats.lineWidth = clamp((safeNumber(weapon.width, 14) * sizeScale + getWeaponGrowth(run, "lineWidth") * 2) * weaponMasterySize, 6, 37);
    stats.linePierce = clamp(safeInteger(weapon.pierce, 3) + getWeaponGrowth(run, "linePierce") + safeInteger(player.projectilePierceBonus, 0), 1, 8);
    stats.lineDamage = clamp(stats.damage * safeNumber(player.lineDamageMultiplier, 1), 2, 999);

    stats.spreadCount = clamp(safeInteger(weapon.projectileCount, 5) + countGrowth, 1, 10);
    stats.spreadAngle = clamp(safeNumber(weapon.spreadAngle, 0.65) + getWeaponGrowth(run, "spreadAngle") * 0.1, 0.2, 1.25);
    stats.spreadDamage = clamp(stats.damage * safeNumber(player.spreadDamageMultiplier, 1), 1, 999);

    return stats;
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
    const maxElites = Math.max(0, safeNumber(game.maxEliteEnemies, 3) + (isFinalWaveActive(run) ? 1 : 0));
    const baseChance = clamp(safeNumber(game.eliteChance, 0.07), 0, 0.25);
    const challengeBonus = run && run.selectedChallengeId !== "normal" ? 0.02 : 0;
    const zoneBonus = (run && run.selectedZoneId === "abyssCore" ? 0.01 : 0) + safeNumber(zone.eliteChanceBonus, 0);
    const abyssBonus = safeNumber(run && run.abyssModifiers && run.abyssModifiers.eliteChanceBonus, 0);
    const splitterBonus = safeNumber(zone.splitterChanceBonus, 0);
    const finalWaveBonus = isFinalWaveActive(run) ? safeNumber(game.finalWaveEliteChanceBonus, 0.05) : 0;
    const eventBonus = safeNumber(runModifiers.eliteChanceBonus, 0);
    const chance = clamp(baseChance + challengeBonus + zoneBonus + abyssBonus + finalWaveBonus + eventBonus, 0, 0.45);
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
        const finalWaveBonus = isFinalWaveActive(run) ? (key === "fast" ? 18 : (key === "tank" ? 16 : 0)) : 0;
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
      enemy.shockwaveTimer = 4.8;
      enemy.stormAuraTimer = 1.4;
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

    if (!run || run.bossSpawned) {
      return;
    }

    if (run.enemies.length >= getMaxEnemies(run)) {
      run.enemies.shift();
    }

    boss = spawnEnemy(run, "boss");

    if (boss) {
      run.bossSpawned = true;
      run.message = "보스가 나타났습니다";
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
    const finalWaveMultiplier = isFinalWaveActive(run) ? safeNumber(game.finalWaveSpawnMultiplier, 0.75) : 1;
    const spawnInterval = clamp(safeNumber(wave.spawnInterval, 1.1) * safeNumber(modifiers.spawnIntervalMultiplier, 1) * finalWaveMultiplier, 0.28, 1.5);

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
        damageEnemy(run, current, Math.max(1, stats.chainDamage * (i === 0 ? 1 : 0.65)), "lightning");

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
          damageEnemy(run, enemy, Math.max(3, stats.waveDamage), "wave");
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
          damageEnemy(run, enemy, stats.scytheDamage, "slash");
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
    const fromX = safeNumber(player.x, 0);
    const fromY = safeNumber(player.y, 0);
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
      const hitWidth = stats.lineWidth / 2 + safeNumber(enemy.radius, 8);

      if (isEnemyTargetable(run, enemy, player, stats.lineRange + safeNumber(enemy.radius, 8), margin) && distanceToSegmentSquared(enemy, fromX, fromY, toX, toY) <= hitWidth * hitWidth) {
        damageEnemy(run, enemy, stats.lineDamage, "linePierce");
        hitCount += 1;
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
        color: "#ffe28a"
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
              damageEnemy(run, enemy, safeNumber(effect.damage, 12), "explosion");
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
      run.expToNext = Math.max(minExpToNext, Math.floor(safeNumber(run.expToNext, 24) * 1.32 + 10 + Math.max(0, safeNumber(run.level, 1) - 5) * 2));
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
    const pool = [];
    const result = [];

    for (let i = 0; i < (run.relics || []).length; i += 1) {
      owned[(run.relics[i] || {}).id] = true;
    }

    for (let i = 0; i < relics.length; i += 1) {
      if (relics[i] && !owned[relics[i].id]) {
        pool.push(relics[i]);
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
        effect: relic.effect || {}
      });
    }

    return result;
  }

  function chooseAbilities(abilities, count) {
    const run = AS.State && AS.State.getRun ? AS.State.getRun() : null;
    const pool = [];
    const result = [];

    for (let i = 0; i < abilities.length; i += 1) {
      const ability = abilities[i];
      const category = ability.category || "normal";
      const currentLevel = run && run.abilityLevels ? Math.max(0, Math.floor(safeNumber(run.abilityLevels[ability.id], 0))) : 0;
      const maxLevel = Math.max(1, Math.floor(safeNumber(ability.maxLevel, 99)));
      const requiredLevel = Math.max(1, Math.floor(safeNumber(ability.requiredLevel, 1)));

      if (ability.weaponId && (!run || ability.weaponId !== run.selectedWeaponId)) {
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

    while (pool.length && result.length < count) {
      const index = Math.floor(Math.random() * pool.length);
      result.push(pool.splice(index, 1)[0]);
    }

    return result;
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
      speed: 2.8
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
          damageEnemy(run, enemy, Math.max(1, safeNumber(projectile.damage, 1)), "projectile");
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
          player.hp = Math.max(0, safeNumber(player.hp, 0) - Math.max(0, safeNumber(enemy.damage, 0) * safeNumber(player.damageTakenMultiplier, 1) * getBossContactDamageMultiplier(run)));
          run.bossContactTimer = Math.max(0.1, safeNumber((Data.game || {}).bossContactTickInterval, 0.7));
          run.invincibleTimer = Math.max(run.invincibleTimer, 0.12);
        } else {
          if (run.invincibleTimer > 0) {
            continue;
          }
          player.hp = Math.max(0, safeNumber(player.hp, 0) - Math.max(0, safeNumber(enemy.damage, 0) * safeNumber(player.damageTakenMultiplier, 1)));
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

  function damageEnemy(run, enemy, amount, type) {
    const player = run && run.player ? run.player : {};
    let damage = Math.max(1, safeNumber(amount, 1));
    const damageType = type || "projectile";

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
          damageEnemy(run, enemy, Math.max(2, safeNumber(orbital.damage, safeNumber(run.player.damage, 12) * 0.65) * safeNumber(player.orbitalDamageMultiplier, 1)), "slash");
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
        damageEnemy(run, enemy, Math.max(4, safeNumber(player.damage, 12) * 1.5), "explosion");
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
          boss.chargeTimer = safeNumber(pattern.chargeCooldown, 7) * safeNumber(boss.phaseCooldownMultiplier, 1);
        }
      } else if (boss.chargeTimer <= 0) {
        dir = normalize(safeNumber(player.x, 0) - safeNumber(boss.x, 0), safeNumber(player.y, 0) - safeNumber(boss.y, 0));
        boss.chargeDirX = dir.x;
        boss.chargeDirY = dir.y;
        boss.chargePrepareTimer = safeNumber(pattern.chargePrepareTime, 0.6);
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
        boss.summonTimer = safeNumber(pattern.summonCooldown, 8) * safeNumber(boss.phaseCooldownMultiplier, 1);
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
      }

      if (hasBossPattern(boss, "stormAura") && boss.stormAuraTimer <= 0) {
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
          player.hp = Math.max(0, safeNumber(player.hp, 0) - Math.max(1, safeNumber(pattern.auraDamage, 5) * safeNumber(player.damageTakenMultiplier, 1)));
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
    player.attackCooldown = Math.max(0.15, safeNumber(player.attackCooldown, 0.5) + boostedEffectValue("attackCooldown", 0));
    player.projectileSpeed = Math.max(0, safeNumber(player.projectileSpeed, 0) + boostedEffectValue("projectileSpeed", 0));
    player.projectileRadius = Math.max(1, safeNumber(player.projectileRadius, 1) + boostedEffectValue("projectileRadius", 0));
    player.pickupRadius = Math.max(1, safeNumber(player.pickupRadius, 1) + boostedEffectValue("pickupRadius", 0));
    player.invincibleTime = Math.max(0, safeNumber(player.invincibleTime, 0) + boostedEffectValue("invincibleTime", 0));
    player.damageTakenMultiplier = Math.max(0.1, safeNumber(player.damageTakenMultiplier, 1) * safeNumber(effect.damageTakenMultiplier, 1));
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

    update: function (run, delta) {
      const game = Data.game || {};
      const safeDelta = clamp(safeNumber(delta, 0), 0, 0.05);

      if (!run || run.mode !== (states.running || "running") || safeDelta <= 0) {
        return;
      }

      run.time = Math.max(0, safeNumber(run.time, 0) + safeDelta);
      run.remainingTime = Math.max(0, safeNumber(run.runDuration, safeNumber(game.runDuration, 180)) - run.time);
      if (!run.initialBuildChecked) {
        run.initialBuildChecked = true;
        updateBuildBonuses(run);
      }

      run.player.hitFlashTimer = Math.max(0, safeNumber(run.player.hitFlashTimer, 0) - safeDelta);
      movePlayer(run, safeDelta);
      updateSpawning(run, safeDelta);
      updateEnemies(run, safeDelta);
      updateBossPatterns(run, safeDelta);
      if (run.mode !== (states.running || "running")) {
        return;
      }
      updateAttack(run, safeDelta);
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

      if (run.remainingTime <= 0 && run.mode === (states.running || "running")) {
        AS.State.finishRun(true);
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
