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

  function chooseEnemyType(run) {
    const elapsed = safeNumber(run.time, 0);
    const wave = getWaveConfig(run.time);
    const weights = wave.weights || {};
    const choices = [];
    let total = 0;
    let key;

    for (key in weights) {
      if (Object.prototype.hasOwnProperty.call(weights, key) && key !== "boss") {
        const timeBonus = key === "tank" ? elapsed * 0.015 : 0;
        const weight = Math.max(0, safeNumber(weights[key], 0)) + timeBonus;

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
    const base = type === "boss" ? getBossData(run) : getEnemyData(type);
    const padding = Math.max(0, safeNumber(game.spawnPadding, 40));
    const width = Math.max(1, safeNumber(game.width, 360));
    const height = Math.max(1, safeNumber(game.height, 560));
    const side = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;

    if (side === 0) {
      x = Math.random() * width;
      y = -padding;
    } else if (side === 1) {
      x = width + padding;
      y = Math.random() * height;
    } else if (side === 2) {
      x = Math.random() * width;
      y = height + padding;
    } else {
      x = -padding;
      y = Math.random() * height;
    }

    const enemy = {
      id: Date.now() + Math.random(),
      type: type === "boss" ? "boss" : (base.id || type),
      bossId: type === "boss" ? base.id : "",
      name: base.name || "적",
      x: x,
      y: y,
      hp: Math.max(1, safeNumber(base.hp, 1) * (type === "boss" ? 1 : safeNumber(zone.enemyHpMultiplier, 1) * safeNumber(modifiers.enemyHpMultiplier, 1))),
      maxHp: Math.max(1, safeNumber(base.hp, 1) * (type === "boss" ? 1 : safeNumber(zone.enemyHpMultiplier, 1) * safeNumber(modifiers.enemyHpMultiplier, 1))),
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
    }

    return enemy;
  }

  function spawnEnemy(run, type) {
    const game = Data.game || {};
    const maxEnemies = Math.max(1, safeNumber(game.maxEnemies, 80));

    if (!run || run.enemies.length >= maxEnemies) {
      return null;
    }

    const enemy = createEnemy(type || chooseEnemyType(run), run);
    run.enemies.push(enemy);
    return enemy;
  }

  function spawnEnemyNear(run, type, x, y) {
    const game = Data.game || {};
    const maxEnemies = Math.max(1, safeNumber(game.maxEnemies, 80));
    const width = Math.max(1, safeNumber(game.width, 360));
    const height = Math.max(1, safeNumber(game.height, 560));
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

    if (run.enemies.length >= Math.max(1, safeNumber((Data.game || {}).maxEnemies, 80))) {
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
    const game = Data.game || {};
    const player = run.player;
    const input = run.input || {};
    const dir = normalize(safeNumber(input.moveX, 0), safeNumber(input.moveY, 0));
    const speed = Math.max(0, safeNumber(player.speed, 0));
    const width = Math.max(1, safeNumber(game.width, 360));
    const height = Math.max(1, safeNumber(game.height, 560));
    const radius = Math.max(1, safeNumber(player.radius, 12));

    player.x = clamp(safeNumber(player.x, width / 2) + dir.x * speed * delta, radius, width - radius);
    player.y = clamp(safeNumber(player.y, height / 2) + dir.y * speed * delta, radius, height - radius);
  }

  function updateSpawning(run, delta) {
    const game = Data.game || {};
    const modifiers = getChallengeModifiers(run);
    const elapsed = safeNumber(run.time, 0);
    const wave = getWaveConfig(elapsed);
    const spawnInterval = clamp(safeNumber(wave.spawnInterval, 1.1) * safeNumber(modifiers.spawnIntervalMultiplier, 1), 0.32, 1.5);

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

  function pushProjectile(run, x, y, dirX, dirY, angleOffset) {
    const player = run.player;
    const game = Data.game || {};
    const maxProjectiles = Math.max(1, safeNumber(game.maxProjectiles, 96));
    const angle = Math.atan2(dirY, dirX) + safeNumber(angleOffset, 0);
    const speed = Math.max(0, safeNumber(player.projectileSpeed, 280));

    if (run.projectiles.length >= maxProjectiles) {
      return false;
    }

    run.projectiles.push({
      id: Date.now() + Math.random(),
      x: safeNumber(x, 0),
      y: safeNumber(y, 0),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: Math.max(1, safeNumber(player.projectileRadius, 4)),
      damage: Math.max(1, safeNumber(player.damage, 12)),
      life: Math.max(0.1, safeNumber((Data.projectile || {}).lifeTime, 2.2)),
      pierce: run.evolutions && run.evolutions.piercingShot ? 1 : Math.max(0, safeNumber((Data.projectile || {}).pierce, 0)),
      hitIds: {}
    });

    return true;
  }

  function attackNearest(run) {
    const player = run.player;
    const game = Data.game || {};
    const maxProjectiles = Math.max(1, safeNumber(game.maxProjectiles, 80));
    let nearest = null;
    let nearestDistance = Infinity;

    if (!run.enemies.length || run.projectiles.length >= maxProjectiles) {
      return;
    }

    for (let i = 0; i < run.enemies.length; i += 1) {
      const dist = distanceSquared(player, run.enemies[i]);
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearest = run.enemies[i];
      }
    }

    if (!nearest) {
      return;
    }

    const dir = normalize(safeNumber(nearest.x, 0) - safeNumber(player.x, 0), safeNumber(nearest.y, 0) - safeNumber(player.y, 0));
    pushProjectile(run, player.x, player.y, dir.x, dir.y, 0);

    if (run.evolutions && run.evolutions.splitShot) {
      pushProjectile(run, player.x, player.y, dir.x, dir.y, -0.28);
      pushProjectile(run, player.x, player.y, dir.x, dir.y, 0.28);
    }
  }

  function updateAttack(run, delta) {
    const minCooldown = Math.max(0.01, safeNumber((Data.limits || {}).minAttackCooldown, 0.12));
    const cooldown = Math.max(minCooldown, safeNumber(run.player.attackCooldown, 0.55));

    run.attackTimer = safeNumber(run.attackTimer, 0) - delta;
    if (run.attackTimer <= 0) {
      attackNearest(run);
      run.attackTimer = cooldown;
    }
  }

  function updateProjectiles(run, delta) {
    const game = Data.game || {};
    const width = Math.max(1, safeNumber(game.width, 360));
    const height = Math.max(1, safeNumber(game.height, 560));
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

  function gainExp(run, amount) {
    const abilities = Data.abilities || [];
    const minExpToNext = Math.max(1, safeNumber((Data.limits || {}).minExpToNext, 1));

    run.exp = Math.max(0, safeNumber(run.exp, 0) + Math.max(0, safeNumber(amount, 0) * safeNumber(run.player && run.player.expMultiplier, 1)));

    while (run.exp >= run.expToNext) {
      run.exp -= run.expToNext;
      run.level = Math.max(1, Math.floor(safeNumber(run.level, 1))) + 1;
      run.expToNext = Math.max(minExpToNext, Math.floor(safeNumber(run.expToNext, 20) * 1.25 + 8));
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
    const requiredLevel = offerCount === 0 ? 6 : 11;
    const relics = Data.relics || [];

    return !!run && offerCount < 2 && relics.length > 0 && safeNumber(run.level, 1) >= requiredLevel;
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
    const maxGems = Math.max(1, safeNumber(game.maxGems, 120));

    if (run.gems.length >= maxGems || safeNumber(enemy.exp, 0) <= 0) {
      return;
    }

    run.gems.push({
      x: safeNumber(enemy.x, 0),
      y: safeNumber(enemy.y, 0),
      radius: 5,
      exp: Math.max(0, safeNumber(enemy.exp, 0))
    });
  }

  function defeatEnemy(run, enemy, index) {
    run.kills = Math.max(0, Math.floor(safeNumber(run.kills, 0))) + 1;
    dropGem(run, enemy);

    if (enemy.isBoss) {
      run.bossDefeated = true;
      AS.State.finishRun(true);
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
          enemy.hp = safeNumber(enemy.hp, 0) - Math.max(1, safeNumber(projectile.damage, 1));
          hitIds[enemyId] = true;
          projectile.hitIds = hitIds;

          if (enemy.hp <= 0) {
            defeatEnemy(run, enemy, j);
          }

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

    if (run.invincibleTimer > 0) {
      return;
    }

    for (let i = 0; i < run.enemies.length; i += 1) {
      const enemy = run.enemies[i];
      const hitRadius = safeNumber(player.radius, 1) + safeNumber(enemy.radius, 1);

      if (distanceSquared(player, enemy) <= hitRadius * hitRadius) {
        player.hp = Math.max(0, safeNumber(player.hp, 0) - Math.max(0, safeNumber(enemy.damage, 0) * safeNumber(player.damageTakenMultiplier, 1)));
        run.invincibleTimer = Math.max(0, safeNumber(player.invincibleTime, 0.6));

        if (player.hp <= 0) {
          AS.State.finishRun(false);
        }

        return;
      }
    }
  }

  function damageEnemy(run, enemy, amount) {
    enemy.hp = safeNumber(enemy.hp, 0) - Math.max(1, safeNumber(amount, 1));
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
      orbital.angle = safeNumber(orbital.angle, 0) + safeNumber(orbital.speed, 2.8) * delta;
      orbital.x = safeNumber(player.x, 0) + Math.cos(orbital.angle) * safeNumber(orbital.distance, 42);
      orbital.y = safeNumber(player.y, 0) + Math.sin(orbital.angle) * safeNumber(orbital.distance, 42);

      for (let j = run.enemies.length - 1; j >= 0; j -= 1) {
        const enemy = run.enemies[j];
        const hitRadius = safeNumber(orbital.radius, 7) + safeNumber(enemy.radius, 8);
        enemy.orbitalHitTimer = Math.max(0, safeNumber(enemy.orbitalHitTimer, 0) - delta);

        if (enemy.orbitalHitTimer <= 0 && distanceSquared(orbital, enemy) <= hitRadius * hitRadius) {
          enemy.orbitalHitTimer = 0.45;
          damageEnemy(run, enemy, Math.max(2, safeNumber(run.player.damage, 12) * 0.65 * safeNumber(player.orbitalDamageMultiplier, 1)));
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
        damageEnemy(run, enemy, Math.max(4, safeNumber(player.damage, 12) * 1.5));
        hitCount += 1;
      }
    }

    if (hitCount > 0) {
      run.message = "심연 폭발";
      run.messageTimer = 0.8;
    }
  }

  function updateBossPatterns(run, delta) {
    const pattern = Data.bossPattern || {};
    const player = run.player;
    const game = Data.game || {};
    const width = Math.max(1, safeNumber(game.width, 360));
    const height = Math.max(1, safeNumber(game.height, 560));

    for (let i = run.enemies.length - 1; i >= 0; i -= 1) {
      const boss = run.enemies[i];
      let dir;
      let summonCount;

      if (!boss.isBoss) {
        continue;
      }

      boss.chargeTimer = Math.max(0, safeNumber(boss.chargeTimer, safeNumber(pattern.chargeCooldown, 7)) - delta);
      boss.summonTimer = Math.max(0, safeNumber(boss.summonTimer, safeNumber(pattern.summonCooldown, 8)) - delta);
      boss.auraTickTimer = Math.max(0, safeNumber(boss.auraTickTimer, safeNumber(pattern.auraTick, 1.2)) - delta);

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
          boss.chargeTimer = safeNumber(pattern.chargeCooldown, 7);
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
          spawnEnemyNear(run, "normal", safeNumber(boss.x, width / 2) + Math.cos(angle) * 48, safeNumber(boss.y, height / 2) + Math.sin(angle) * 48);
        }
        boss.summonTimer = safeNumber(pattern.summonCooldown, 8);
      }

      if (boss.auraTickTimer <= 0) {
        boss.auraTickTimer = safeNumber(pattern.auraTick, 1.2);
        if (distanceSquared(player, boss) <= Math.pow(safeNumber(boss.auraRadius, 62) + safeNumber(player.radius, 12), 2)) {
          player.hp = Math.max(0, safeNumber(player.hp, 0) - Math.max(1, safeNumber(pattern.auraDamage, 5) * safeNumber(player.damageTakenMultiplier, 1)));
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
    const maxEnemies = Math.max(1, safeNumber(game.maxEnemies, 80));
    const maxProjectiles = Math.max(1, safeNumber(game.maxProjectiles, 80));
    const maxGems = Math.max(1, safeNumber(game.maxGems, 120));

    while (run.enemies.length > maxEnemies) {
      run.enemies.shift();
    }
    while (run.projectiles.length > maxProjectiles) {
      run.projectiles.shift();
    }
    while (run.gems.length > maxGems) {
      run.gems.shift();
    }
  }

  function applyAbilityValue(player, ability) {
    const limits = Data.limits || {};
    const stat = ability.stat;
    const value = safeNumber(ability.value, 0);

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

  function applyRelicEffect(run, relic) {
    const player = run.player;
    const effect = relic.effect || {};
    const hpRatio = safeNumber(player.hp, 0) / Math.max(1, safeNumber(player.maxHp, 1));

    if (!run.relics) {
      run.relics = [];
    }

    run.relics.push({ id: relic.id, name: relic.name, rarity: relic.rarity || "일반" });
    player.maxHp = Math.max(1, safeNumber(player.maxHp, 1) + safeNumber(effect.maxHp, 0));
    player.maxHp = Math.max(1, player.maxHp * safeNumber(effect.maxHpMultiplier, 1));
    player.hp = clamp(player.maxHp * clamp(hpRatio, 0, 1) + Math.max(0, safeNumber(effect.maxHp, 0)), 1, player.maxHp);
    player.speed = Math.max(0, (safeNumber(player.speed, 0) + safeNumber(effect.speed, 0)) * safeNumber(effect.speedMultiplier, 1));
    player.damage = Math.max(1, safeNumber(player.damage, 1) + safeNumber(effect.damage, 0));
    player.attackCooldown = Math.max(0.15, safeNumber(player.attackCooldown, 0.5) + safeNumber(effect.attackCooldown, 0));
    player.projectileSpeed = Math.max(0, safeNumber(player.projectileSpeed, 0) + safeNumber(effect.projectileSpeed, 0));
    player.projectileRadius = Math.max(1, safeNumber(player.projectileRadius, 1) + safeNumber(effect.projectileRadius, 0));
    player.pickupRadius = Math.max(1, safeNumber(player.pickupRadius, 1) + safeNumber(effect.pickupRadius, 0));
    player.invincibleTime = Math.max(0, safeNumber(player.invincibleTime, 0) + safeNumber(effect.invincibleTime, 0));
    player.damageTakenMultiplier = Math.max(0.1, safeNumber(player.damageTakenMultiplier, 1) * safeNumber(effect.damageTakenMultiplier, 1));
    player.expMultiplier = Math.max(0.1, safeNumber(player.expMultiplier, 1) * safeNumber(effect.expMultiplier, 1));
    player.gemHealChance = clamp(safeNumber(player.gemHealChance, 0) + safeNumber(effect.gemHealChance, 0), 0, 1);
    player.gemHealAmount = Math.max(0, safeNumber(player.gemHealAmount, 0) + safeNumber(effect.gemHealAmount, 0));
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
    update: function (run, delta) {
      const game = Data.game || {};
      const safeDelta = clamp(safeNumber(delta, 0), 0, 0.05);

      if (!run || run.mode !== (states.running || "running") || safeDelta <= 0) {
        return;
      }

      run.time = Math.max(0, safeNumber(run.time, 0) + safeDelta);
      run.remainingTime = Math.max(0, safeNumber(run.runDuration, safeNumber(game.runDuration, 180)) - run.time);

      movePlayer(run, safeDelta);
      updateSpawning(run, safeDelta);
      updateEnemies(run, safeDelta);
      updateBossPatterns(run, safeDelta);
      if (run.mode !== (states.running || "running")) {
        return;
      }
      updateAttack(run, safeDelta);
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
        applyAbilityValue(run.player, selected);
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
