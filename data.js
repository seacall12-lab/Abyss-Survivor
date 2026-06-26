(function () {
  window.AbyssSurvivor = window.AbyssSurvivor || {};
  const AS = window.AbyssSurvivor;

  AS.Data = {
    storageKey: "abyssSurvivorSave",

    game: {
      width: 360,
      height: 560,
      worldWidth: 1080,
      worldHeight: 1680,
      runDuration: 180,
      bossSpawnTime: 120,
      maxEnemies: 104,
      maxProjectiles: 112,
      maxGems: 120,
      maxEffects: 64,
      maxDamageTexts: 40,
      maxMines: 30,
      eliteChance: 0.08,
      maxEliteEnemies: 3,
      spawnPadding: 40,
      targetViewportMargin: 64
    },

    states: {
      title: "title",
      running: "running",
      paused: "paused",
      levelup: "levelup",
      gameover: "gameover",
      clear: "clear"
    },

    abyss: {
      maxDepth: 20,
      enemyHpPerDepth: 0.08,
      enemySpeedPerDepth: 0.025,
      enemyDamagePerDepth: 0.05,
      bossHpPerDepth: 0.1,
      eliteChancePerDepth: 0.006,
      rewardPerDepth: 0.08,
      maxEnemyHpMultiplier: 3,
      maxEnemySpeedMultiplier: 1.6,
      maxEnemyDamageMultiplier: 2.5,
      maxBossHpMultiplier: 3.5,
      maxEliteChanceBonus: 0.15,
      maxRewardMultiplier: 2.8
    },

    mastery: {
      maxLevel: 10,
      baseRequiredExp: 40,
      requiredExpPerLevel: 30
    },

    player: {
      x: 180,
      y: 280,
      radius: 12,
      maxHp: 100,
      hp: 100,
      speed: 158,
      damage: 14,
      attackCooldown: 0.5,
      projectileSpeed: 280,
      projectileRadius: 4,
      pickupRadius: 44,
      invincibleTime: 1
    },

    projectile: {
      lifeTime: 2.2,
      color: "#d8f7ff",
      pierce: 0
    },

    rarityColors: {
      common: { label: "일반", color: "#9aa4b2", bg: "rgba(154, 164, 178, 0.12)" },
      uncommon: { label: "고급", color: "#43c06b", bg: "rgba(67, 192, 107, 0.13)" },
      rare: { label: "희귀", color: "#4f8cff", bg: "rgba(79, 140, 255, 0.14)" },
      epic: { label: "영웅", color: "#a56eff", bg: "rgba(165, 110, 255, 0.15)" },
      legendary: { label: "전설", color: "#ffb347", bg: "rgba(255, 179, 71, 0.16)" },
      evolution: { label: "진화", color: "#ff5d5d", bg: "rgba(255, 93, 93, 0.15)" },
      relic: { label: "유물", color: "#33d1c6", bg: "rgba(51, 209, 198, 0.14)" }
    },

    bossPattern: {
      chargeCooldown: 6.6,
      chargePrepareTime: 0.6,
      chargeDuration: 0.8,
      chargeSpeedMultiplier: 3.1,
      summonCooldown: 7,
      summonCountMin: 2,
      summonCountMax: 4,
      auraRadius: 62,
      auraDamage: 5,
      auraTick: 1.1
    },

    weapons: [
      {
        id: "abyssBullet",
        name: "심연 탄환",
        shortName: "탄환",
        icon: "●",
        description: "가장 가까운 적에게 직선 탄환을 발사합니다.",
        tags: ["bullet", "projectile", "abyss"],
        attackType: "projectile",
        cooldownMultiplier: 1,
        damageMultiplier: 1,
        projectileCount: 1
      },
      {
        id: "orbitBlade",
        name: "회전 칼날",
        shortName: "칼날",
        icon: "◌",
        description: "플레이어 주변을 도는 칼날로 근접 적을 베어냅니다.",
        tags: ["melee", "orbit", "shield"],
        attackType: "orbit",
        cooldownMultiplier: 1.08,
        damageMultiplier: 0.78,
        projectileCount: 0
      },
      {
        id: "lightningChain",
        name: "번개 사슬",
        shortName: "번개",
        icon: "ϟ",
        description: "가까운 적에게 즉시 피해를 주고 주변 적에게 전이됩니다.",
        tags: ["lightning", "chain", "speed"],
        attackType: "chain",
        cooldownMultiplier: 1.15,
        damageMultiplier: 0.9,
        chainCount: 3
      },
      {
        id: "voidMine",
        name: "공허 지뢰",
        shortName: "지뢰",
        icon: "✦",
        description: "주변에 지뢰를 설치해 잠시 뒤 범위 피해를 줍니다.",
        tags: ["explosion", "area", "abyss"],
        attackType: "mine",
        cooldownMultiplier: 1.25,
        damageMultiplier: 1.45,
        radius: 48
      },
      {
        id: "wideWave",
        name: "영혼 파동",
        shortName: "파동",
        icon: "≋",
        description: "가까운 적 방향으로 넓은 파동을 방출합니다.",
        tags: ["area", "wave", "projectile"],
        attackType: "wave",
        cooldownMultiplier: 1.08,
        damageMultiplier: 0.88,
        radius: 118
      },
      {
        id: "bloodScythe",
        name: "피의 낫",
        shortName: "낫",
        icon: "☽",
        description: "가까운 적을 베고 적중 시 소량 회복합니다.",
        tags: ["melee", "blood", "survival"],
        rarity: "rare",
        attackType: "scythe",
        cooldownMultiplier: 1.28,
        damageMultiplier: 1.15,
        range: 76,
        arcWidth: 1.35,
        healOnHit: 0.5
      },
      {
        id: "riftSpear",
        name: "균열 창",
        shortName: "창",
        icon: "↗",
        description: "긴 직선 공격으로 적을 관통합니다.",
        tags: ["projectile", "pierce", "abyss"],
        rarity: "rare",
        attackType: "linePierce",
        cooldownMultiplier: 1.35,
        damageMultiplier: 1.25,
        range: 260,
        width: 14,
        pierce: 3
      },
      {
        id: "starDust",
        name: "별가루탄",
        shortName: "별탄",
        icon: "✦",
        description: "작은 탄환 여러 개를 부채꼴로 흩뿌립니다.",
        tags: ["bullet", "spread", "area"],
        rarity: "rare",
        attackType: "spreadProjectile",
        cooldownMultiplier: 1.08,
        damageMultiplier: 0.65,
        projectileCount: 5,
        spreadAngle: 0.65
      }
    ],

    classes: [
      {
        id: "wanderer",
        name: "방랑자",
        description: "균형 잡힌 기본 생존자입니다.",
        maxHpMultiplier: 1,
        speedMultiplier: 1,
        damageMultiplier: 1,
        attackCooldownMultiplier: 1,
        damageTakenMultiplier: 1,
        pickupRadiusBonus: 0
      },
      {
        id: "guardian",
        name: "수호자",
        description: "높은 체력으로 버티는 생존자입니다.",
        maxHpMultiplier: 1.3,
        speedMultiplier: 0.88,
        damageMultiplier: 0.95,
        attackCooldownMultiplier: 1.05,
        damageTakenMultiplier: 0.9,
        pickupRadiusBonus: 0
      },
      {
        id: "chaser",
        name: "추격자",
        description: "빠른 이동과 공격으로 적을 제압합니다.",
        maxHpMultiplier: 0.85,
        speedMultiplier: 1.18,
        damageMultiplier: 1.05,
        attackCooldownMultiplier: 0.9,
        damageTakenMultiplier: 1,
        pickupRadiusBonus: 8
      },
      {
        id: "bloodSeeker",
        name: "흡혈자",
        shortName: "흡혈",
        icon: "♥",
        description: "처치와 근접 전투를 통해 체력을 회복합니다.",
        tags: ["blood", "survival", "melee"],
        rarity: "rare",
        maxHpMultiplier: 0.85,
        speedMultiplier: 1.02,
        damageMultiplier: 1,
        attackCooldownMultiplier: 1,
        damageTakenMultiplier: 1,
        pickupRadiusBonus: 0,
        lifeStealOnKill: 2
      },
      {
        id: "engineer",
        name: "기술자",
        shortName: "기술",
        icon: "⚙",
        description: "지뢰와 번개 계열 무기를 효율적으로 사용합니다.",
        tags: ["install", "lightning", "effect"],
        rarity: "rare",
        maxHpMultiplier: 0.95,
        speedMultiplier: 0.98,
        damageMultiplier: 0.95,
        attackCooldownMultiplier: 0.95,
        damageTakenMultiplier: 1,
        pickupRadiusBonus: 5,
        mineBonus: 1,
        effectDurationMultiplier: 1.15,
        chainBonus: 1
      },
      {
        id: "abyssApostle",
        name: "심연 사도",
        shortName: "사도",
        icon: "◆",
        description: "강한 공격력을 얻지만 받는 피해가 증가합니다.",
        tags: ["abyss", "damage", "risk"],
        rarity: "epic",
        maxHpMultiplier: 0.9,
        speedMultiplier: 1,
        damageMultiplier: 1.18,
        attackCooldownMultiplier: 0.98,
        damageTakenMultiplier: 1.12,
        pickupRadiusBonus: 0,
        abyssPowerBonus: 1
      }
    ],

    permanentUpgrades: [
      {
        id: "vitality",
        name: "생명 강화",
        description: "시작 최대 체력이 증가합니다.",
        maxLevel: 10,
        effectPerLevel: 5
      },
      {
        id: "power",
        name: "공격 강화",
        description: "시작 공격력이 증가합니다.",
        maxLevel: 10,
        effectPerLevel: 1
      },
      {
        id: "growth",
        name: "성장 강화",
        description: "경험치 획득 범위가 증가합니다.",
        maxLevel: 10,
        effectPerLevel: 3
      },
      {
        id: "masteryTraining",
        name: "숙련 훈련",
        description: "숙련도 경험치 획득량이 증가합니다.",
        maxLevel: 10,
        effectPerLevel: 3,
        advanced: true,
        unlockFeature: "advancedUpgrades"
      },
      {
        id: "combatSense",
        name: "전투 감각",
        description: "엘리트와 보스에게 주는 피해가 증가합니다.",
        maxLevel: 10,
        effectPerLevel: 2,
        advanced: true,
        unlockFeature: "advancedUpgrades"
      },
      {
        id: "abyssAdaptation",
        name: "심연 적응",
        description: "심연 단계에서 증가하는 피해 부담을 줄입니다.",
        maxLevel: 10,
        effectPerLevel: 1.5,
        advanced: true,
        unlockFeature: "advancedUpgrades"
      }
    ],

    zones: [
      {
        id: "riftGate",
        name: "균열 입구",
        description: "가장 기본적인 심연의 입구입니다.",
        difficulty: 1,
        enemyHpMultiplier: 1,
        enemySpeedMultiplier: 1,
        enemyDamageMultiplier: 1,
        bossId: "watcher"
      },
      {
        id: "swampEdge",
        name: "침묵 늪지",
        description: "무거운 적이 많이 등장하는 늪지 구역입니다.",
        difficulty: 2,
        enemyHpMultiplier: 1.25,
        enemySpeedMultiplier: 0.95,
        enemyDamageMultiplier: 1.1,
        bossId: "swampGuardian"
      },
      {
        id: "abyssCore",
        name: "심연 핵",
        description: "빠르고 위험한 적이 몰려드는 심연 중심부입니다.",
        difficulty: 3,
        enemyHpMultiplier: 1.45,
        enemySpeedMultiplier: 1.12,
        enemyDamageMultiplier: 1.2,
        bossId: "coreDevourer"
      },
      {
        id: "brokenSanctum",
        name: "부서진 성소",
        shortName: "성소",
        icon: "▣",
        description: "엘리트와 보스 압박이 강한 상위 구역입니다.",
        difficulty: 4,
        rarity: "epic",
        enemyHpMultiplier: 1.28,
        enemySpeedMultiplier: 1.02,
        enemyDamageMultiplier: 1.15,
        eliteChanceBonus: 0.04,
        rewardMultiplier: 1.1,
        bossId: "sanctumBreaker",
        backgroundTone: "sanctum"
      },
      {
        id: "deadCorridor",
        name: "망자의 회랑",
        shortName: "회랑",
        icon: "☠",
        description: "쓰러진 적이 다시 몰려드는 물량형 구역입니다.",
        difficulty: 4,
        rarity: "epic",
        enemyHpMultiplier: 1.18,
        enemySpeedMultiplier: 1,
        enemyDamageMultiplier: 1.12,
        splitterChanceBonus: 0.08,
        rewardMultiplier: 1.1,
        bossId: "deadLord",
        backgroundTone: "dead"
      },
      {
        id: "stormRift",
        name: "폭풍 균열",
        shortName: "폭풍",
        icon: "ϟ",
        description: "빠른 적과 번개 변수가 많은 위험 구역입니다.",
        difficulty: 5,
        rarity: "epic",
        enemyHpMultiplier: 1.15,
        enemySpeedMultiplier: 1.18,
        enemyDamageMultiplier: 1.14,
        fastEnemyWeightBonus: 15,
        rewardMultiplier: 1.15,
        bossId: "stormDevourer",
        backgroundTone: "storm"
      }
    ],

    bosses: {
      watcher: {
        id: "watcher",
        name: "심연의 감시자",
        hp: 1130,
        speed: 28,
        damage: 12,
        radius: 32,
        exp: 0,
        score: 30,
        color: "#d85c7a",
        auraRadius: 62
      },
      swampGuardian: {
        id: "swampGuardian",
        name: "늪의 파수꾼",
        hp: 1340,
        speed: 22,
        damage: 16,
        radius: 36,
        exp: 0,
        score: 36,
        color: "#b18a50",
        auraRadius: 92
      },
      coreDevourer: {
        id: "coreDevourer",
        name: "핵의 포식자",
        hp: 1220,
        speed: 36,
        damage: 18,
        radius: 30,
        exp: 0,
        score: 42,
        color: "#c65cff",
        auraRadius: 75
      },
      sanctumBreaker: {
        id: "sanctumBreaker",
        name: "성소 파괴자",
        icon: "▣",
        hp: 1480,
        speed: 28,
        damage: 22,
        radius: 38,
        exp: 0,
        score: 52,
        rarity: "epic",
        color: "#d0aa68",
        auraRadius: 76,
        patterns: ["charge", "shockwave"],
        phase2HpRatio: 0.5
      },
      deadLord: {
        id: "deadLord",
        name: "망자의 군주",
        icon: "☠",
        hp: 1380,
        speed: 24,
        damage: 20,
        radius: 36,
        exp: 0,
        score: 52,
        rarity: "epic",
        color: "#63c991",
        auraRadius: 84,
        patterns: ["summon", "splitterAura"],
        phase2HpRatio: 0.5
      },
      stormDevourer: {
        id: "stormDevourer",
        name: "폭풍 포식자",
        icon: "ϟ",
        hp: 1280,
        speed: 38,
        damage: 21,
        radius: 34,
        exp: 0,
        score: 56,
        rarity: "epic",
        color: "#8fd8ff",
        auraRadius: 88,
        patterns: ["charge", "stormAura"],
        phase2HpRatio: 0.5
      }
    },

    waves: [
      { start: 0, end: 30, spawnInterval: 0.98, weights: { normal: 80, fast: 20, tank: 0 } },
      { start: 30, end: 60, spawnInterval: 0.77, weights: { normal: 50, fast: 38, tank: 12 } },
      { start: 60, end: 90, spawnInterval: 0.58, weights: { normal: 36, fast: 30, tank: 34 } },
      { start: 90, end: 120, spawnInterval: 0.48, weights: { normal: 30, fast: 40, tank: 30 } },
      { start: 120, end: 180, spawnInterval: 0.62, weights: { normal: 38, fast: 36, tank: 26 } }
    ],

    challenges: [
      {
        id: "normal",
        name: "일반",
        description: "기본 규칙으로 생존합니다.",
        rewardMultiplier: 1,
        modifiers: {}
      },
      {
        id: "hungryAbyss",
        name: "굶주린 심연",
        description: "적이 더 자주 나오지만 보상이 증가합니다.",
        rewardMultiplier: 1.25,
        modifiers: {
          spawnIntervalMultiplier: 0.8,
          enemyHpMultiplier: 1.05
        }
      },
      {
        id: "glassSurvivor",
        name: "유리 생존자",
        description: "체력이 낮고 공격력이 높습니다.",
        rewardMultiplier: 1.35,
        modifiers: {
          playerMaxHpMultiplier: 0.75,
          playerDamageMultiplier: 1.25
        }
      },
      {
        id: "fastErosion",
        name: "빠른 침식",
        description: "런 시간이 짧고 전개가 빨라집니다.",
        rewardMultiplier: 1.2,
        modifiers: {
          runDuration: 150,
          bossSpawnTime: 95,
          spawnIntervalMultiplier: 0.9
        }
      }
    ],

    enemies: {
      normal: {
        id: "normal",
        name: "심연의 잔해",
        hp: 24,
        speed: 42,
        damage: 4,
        radius: 10,
        exp: 8,
        score: 1,
        color: "#6bb7d6",
        spawnWeight: 70
      },
      fast: {
        id: "fast",
        name: "빠른 그림자",
        hp: 16,
        speed: 70,
        damage: 3,
        radius: 8,
        exp: 7,
        score: 1,
        color: "#9be37a",
        spawnWeight: 20
      },
      tank: {
        id: "tank",
        name: "무거운 껍질",
        hp: 58,
        speed: 30,
        damage: 6,
        radius: 14,
        exp: 18,
        score: 3,
        color: "#d6a45c",
        spawnWeight: 10
      },
      boss: {
        id: "boss",
        name: "심연의 감시자",
        hp: 1000,
        speed: 28,
        damage: 12,
        radius: 32,
        exp: 0,
        score: 30,
        color: "#d85c7a",
        spawnWeight: 0
      }
    },

    relics: [
      {
        id: "bloodCore",
        name: "피의 핵",
        tags: ["survival", "hp", "abyss"],
        rarity: "희귀",
        description: "최대 체력이 증가하지만 이동 속도가 감소합니다.",
        effect: {
          maxHp: 35,
          speedMultiplier: 0.95
        }
      },
      {
        id: "sharpHeart",
        name: "날카로운 심장",
        tags: ["melee", "speed", "survival"],
        rarity: "희귀",
        description: "공격력이 증가하지만 최대 체력이 감소합니다.",
        effect: {
          damage: 8,
          maxHp: -10
        }
      },
      {
        id: "hunterEye",
        name: "사냥꾼의 눈",
        tags: ["projectile", "speed", "pickup"],
        rarity: "일반",
        description: "투사체 속도와 경험치 획득 범위가 증가합니다.",
        effect: {
          projectileSpeed: 50,
          pickupRadius: 10
        }
      },
      {
        id: "gluttonShard",
        name: "탐식의 파편",
        tags: ["growth", "exp", "abyss"],
        rarity: "희귀",
        description: "경험치 획득량이 증가하지만 받는 피해가 증가합니다.",
        effect: {
          expMultiplier: 1.15,
          damageTakenMultiplier: 1.05
        }
      },
      {
        id: "blackWing",
        name: "검은 날개",
        tags: ["speed", "survival", "abyss"],
        rarity: "희귀",
        description: "이동 속도와 피격 무적 시간이 증가합니다.",
        effect: {
          speed: 18,
          invincibleTime: 0.15
        }
      },
      {
        id: "brokenShield",
        name: "부서진 방패",
        tags: ["shield", "survival", "hp"],
        rarity: "일반",
        description: "받는 피해가 감소하지만 공격 속도가 조금 느려집니다.",
        effect: {
          damageTakenMultiplier: 0.9,
          attackCooldown: 0.04
        }
      },
      {
        id: "voidHand",
        name: "공허의 손",
        tags: ["pickup", "growth", "abyss"],
        rarity: "희귀",
        description: "경험치 획득 범위가 증가하고 보석 획득 시 회복할 수 있습니다.",
        effect: {
          pickupRadius: 25,
          gemHealChance: 0.18,
          gemHealAmount: 1
        }
      },
      {
        id: "abyssPact",
        name: "심연의 계약",
        tags: ["abyss", "damage", "survival"],
        rarity: "전설",
        description: "공격력이 크게 증가하지만 받는 피해도 증가합니다.",
        effect: {
          damage: 12,
          damageTakenMultiplier: 1.1
        }
      },
      {
        id: "bloodHook",
        name: "붉은 갈고리",
        tags: ["blood", "melee"],
        rarity: "rare",
        description: "근접 피해가 증가하고 처치 시 체력을 조금 더 회복합니다.",
        effect: {
          meleeDamageMultiplier: 1.12,
          lifeStealOnKill: 1
        }
      },
      {
        id: "riftLens",
        name: "균열 렌즈",
        tags: ["pierce", "projectile", "abyss"],
        rarity: "rare",
        description: "직선 관통 공격과 투사체 속도가 강화됩니다.",
        effect: {
          projectilePierceBonus: 1,
          projectileSpeed: 25,
          lineDamageMultiplier: 1.1
        }
      },
      {
        id: "stormCore",
        name: "폭풍 코어",
        tags: ["lightning", "chain"],
        rarity: "epic",
        description: "번개 연쇄 수와 번개 피해가 증가합니다.",
        effect: {
          chainBonus: 1,
          chainDamageMultiplier: 1.12
        }
      },
      {
        id: "mineRig",
        name: "매설 장치",
        tags: ["install", "explosion"],
        rarity: "rare",
        description: "지뢰 설치 수와 폭발 범위가 증가합니다.",
        effect: {
          mineBonus: 1,
          mineRadiusMultiplier: 1.1
        }
      },
      {
        id: "voidEcho",
        name: "공허 메아리",
        tags: ["wave", "area", "abyss"],
        rarity: "rare",
        description: "파동 범위와 지속 이펙트가 강화됩니다.",
        effect: {
          waveRadiusMultiplier: 1.12,
          waveDamageMultiplier: 1.1,
          effectDurationMultiplier: 1.05
        }
      },
      {
        id: "gluttonHeart",
        name: "포식의 심장",
        tags: ["growth", "survival"],
        rarity: "epic",
        description: "보석 획득 범위가 증가하고 보석 획득 시 체력을 회복할 수 있습니다.",
        effect: {
          pickupRadius: 12,
          gemHealChance: 0.1,
          gemHealAmount: 2
        }
      },
      {
        id: "brokenClock",
        name: "부서진 시계",
        tags: ["speed", "cooldown"],
        rarity: "rare",
        description: "공격 속도가 증가하지만 이동 속도가 조금 감소합니다.",
        effect: {
          attackCooldown: -0.07,
          speedMultiplier: 0.94
        }
      },
      {
        id: "smallSun",
        name: "작은 태양",
        tags: ["explosion", "area"],
        rarity: "epic",
        description: "폭발 범위와 폭발 피해가 증가합니다.",
        effect: {
          explosionRadiusMultiplier: 1.12,
          explosionDamageMultiplier: 1.14
        }
      },
      {
        id: "hunterMark",
        name: "사냥꾼의 표식",
        tags: ["elite", "damage"],
        rarity: "rare",
        description: "엘리트와 보스에게 주는 피해가 증가합니다.",
        effect: {
          eliteDamageMultiplier: 1.16,
          bossDamageMultiplier: 1.1
        }
      },
      {
        id: "abyssNecklace",
        name: "심연의 목걸이",
        tags: ["abyss", "damage", "risk"],
        rarity: "legendary",
        description: "공격력이 크게 증가하지만 받는 피해도 증가합니다.",
        effect: {
          damage: 16,
          damageTakenMultiplier: 1.12
        }
      },
      {
        id: "glassShard",
        name: "유리 파편",
        tags: ["damage", "risk", "critical"],
        rarity: "epic",
        description: "피해량이 증가하지만 최대 체력이 감소합니다.",
        effect: {
          damage: 12,
          maxHp: -18
        }
      },
      {
        id: "survivorFlag",
        name: "생존자의 깃발",
        tags: ["survival", "growth"],
        rarity: "legendary",
        description: "체력, 획득 범위, 보상이 조금씩 증가합니다.",
        effect: {
          maxHp: 22,
          pickupRadius: 16,
          shardRewardMultiplier: 1.1
        }
      }
    ],

    abilities: [
      {
        id: "damageUp",
        name: "공격력 증가",
        description: "공격력이 증가합니다.",
        type: "stat",
        stat: "damage",
        value: 4,
        tags: ["damage", "bullet"],
        category: "normal",
        maxLevel: 5
      },
      {
        id: "attackSpeedUp",
        name: "공격 속도 증가",
        description: "공격 대기 시간이 감소합니다.",
        type: "stat",
        stat: "attackCooldown",
        value: -0.06,
        tags: ["speed", "chain"],
        category: "normal",
        maxLevel: 5
      },
      {
        id: "projectileSpeedUp",
        name: "투사체 속도 증가",
        description: "투사체가 더 빠르게 이동합니다.",
        type: "stat",
        stat: "projectileSpeed",
        value: 35,
        tags: ["projectile", "speed"],
        category: "normal",
        maxLevel: 4
      },
      {
        id: "projectileSizeUp",
        name: "투사체 크기 증가",
        description: "투사체가 더 커집니다.",
        type: "stat",
        stat: "projectileRadius",
        value: 1,
        tags: ["projectile", "area"],
        category: "normal",
        maxLevel: 4
      },
      {
        id: "maxHpUp",
        name: "최대 체력 증가",
        description: "최대 체력과 현재 체력이 증가합니다.",
        type: "stat",
        stat: "maxHp",
        value: 20,
        hpValue: 20,
        tags: ["survival", "hp"],
        category: "normal",
        maxLevel: 4
      },
      {
        id: "heal",
        name: "체력 회복",
        description: "체력을 회복합니다.",
        type: "heal",
        stat: "hp",
        value: 30,
        tags: ["survival", "hp"],
        category: "normal",
        maxLevel: 99
      },
      {
        id: "moveSpeedUp",
        name: "이동 속도 증가",
        description: "이동 속도가 증가합니다.",
        type: "stat",
        stat: "speed",
        value: 12,
        tags: ["speed", "lightning"],
        category: "normal",
        maxLevel: 4
      },
      {
        id: "pickupRangeUp",
        name: "경험치 획득 범위 증가",
        description: "경험치 보석 획득 범위가 증가합니다.",
        type: "stat",
        stat: "pickupRadius",
        value: 10,
        tags: ["pickup", "growth", "exp"],
        category: "normal",
        maxLevel: 4
      },
      {
        id: "piercingShot",
        name: "관통 파편",
        description: "투사체가 적을 1회 추가로 관통합니다.",
        type: "evolution",
        tags: ["bullet", "projectile"],
        category: "evolution",
        requiredLevel: 4,
        once: true
      },
      {
        id: "splitShot",
        name: "분열 파편",
        description: "공격할 때 좌우 보조 투사체를 함께 발사합니다.",
        type: "evolution",
        tags: ["bullet", "projectile"],
        category: "evolution",
        requiredLevel: 4,
        once: true
      },
      {
        id: "orbitalShield",
        name: "회전 보호막",
        description: "플레이어 주변을 도는 구체가 적에게 피해를 줍니다.",
        type: "evolution",
        tags: ["melee", "orbit", "shield"],
        category: "evolution",
        requiredLevel: 4,
        once: true
      },
      {
        id: "abyssNova",
        name: "심연 폭발",
        description: "일정 시간마다 주변 적에게 원형 피해를 줍니다.",
        type: "evolution",
        tags: ["explosion", "area", "abyss"],
        category: "evolution",
        requiredLevel: 4,
        once: true
      },
      {
        id: "abyssBulletCount",
        name: "탄환 증식",
        description: "심연 탄환 수가 증가합니다.",
        type: "weaponStat",
        stat: "weaponCount",
        value: 1,
        tags: ["bullet", "projectile"],
        category: "normal",
        weaponId: "abyssBullet",
        maxLevel: 3
      },
      {
        id: "abyssBulletFocus",
        name: "응축 탄환",
        description: "심연 탄환 피해가 증가합니다.",
        type: "weaponStat",
        stat: "weaponPower",
        value: 1,
        tags: ["damage", "bullet"],
        category: "normal",
        weaponId: "abyssBullet",
        maxLevel: 3
      },
      {
        id: "bladeCountUp",
        name: "칼날 증식",
        description: "회전 칼날 수가 증가합니다.",
        type: "weaponStat",
        stat: "orbitCount",
        value: 1,
        tags: ["melee", "orbit"],
        category: "normal",
        weaponId: "orbitBlade",
        maxLevel: 4
      },
      {
        id: "bladeSizeUp",
        name: "거대 칼날",
        description: "회전 칼날 크기와 피해가 증가합니다.",
        type: "weaponStat",
        stat: "orbitPower",
        value: 1,
        tags: ["melee", "damage"],
        category: "normal",
        weaponId: "orbitBlade",
        maxLevel: 4
      },
      {
        id: "bladeSpinUp",
        name: "가속 회전",
        description: "회전 칼날 속도가 증가합니다.",
        type: "weaponStat",
        stat: "orbitSpeed",
        value: 1,
        tags: ["melee", "speed"],
        category: "normal",
        weaponId: "orbitBlade",
        maxLevel: 3
      },
      {
        id: "chainForkUp",
        name: "분기 번개",
        description: "동시에 뻗는 번개 줄기 수가 증가합니다.",
        type: "weaponStat",
        stat: "chainBeamCount",
        value: 1,
        tags: ["lightning", "chain"],
        category: "normal",
        weaponId: "lightningChain",
        maxLevel: 2
      },
      {
        id: "chainLinkUp",
        name: "연쇄 증폭",
        description: "번개 연쇄 횟수가 증가합니다.",
        type: "weaponStat",
        stat: "chainCount",
        value: 1,
        tags: ["lightning", "chain"],
        category: "normal",
        weaponId: "lightningChain",
        maxLevel: 2
      },
      {
        id: "chainWidthUp",
        name: "굵은 번개",
        description: "번개 두께와 피해가 증가합니다.",
        type: "weaponStat",
        stat: "chainWidth",
        value: 1,
        tags: ["lightning", "damage"],
        category: "normal",
        weaponId: "lightningChain",
        maxLevel: 3
      },
      {
        id: "mineCountUp",
        name: "연속 매설",
        description: "한 번에 설치하는 공허 지뢰 수가 증가합니다.",
        type: "weaponStat",
        stat: "mineCount",
        value: 1,
        tags: ["explosion", "area"],
        category: "normal",
        weaponId: "voidMine",
        maxLevel: 2
      },
      {
        id: "mineRadiusUp",
        name: "확장 폭발",
        description: "공허 지뢰 폭발 범위가 증가합니다.",
        type: "weaponStat",
        stat: "mineRadius",
        value: 1,
        tags: ["explosion", "area"],
        category: "normal",
        weaponId: "voidMine",
        maxLevel: 3
      },
      {
        id: "minePowerUp",
        name: "불안정한 공허",
        description: "공허 지뢰 피해가 증가합니다.",
        type: "weaponStat",
        stat: "minePower",
        value: 1,
        tags: ["explosion", "damage"],
        category: "normal",
        weaponId: "voidMine",
        maxLevel: 3
      },
      {
        id: "waveCountUp",
        name: "이중 파동",
        description: "영혼 파동이 추가 방향으로 방출됩니다.",
        type: "weaponStat",
        stat: "waveCount",
        value: 1,
        tags: ["area", "wave"],
        category: "normal",
        weaponId: "wideWave",
        maxLevel: 2
      },
      {
        id: "waveRadiusUp",
        name: "넓은 파동",
        description: "영혼 파동 범위가 증가합니다.",
        type: "weaponStat",
        stat: "waveRadius",
        value: 1,
        tags: ["area", "wave"],
        category: "normal",
        weaponId: "wideWave",
        maxLevel: 3
      },
      {
        id: "wavePowerUp",
        name: "깊은 울림",
        description: "영혼 파동 피해가 증가합니다.",
        type: "weaponStat",
        stat: "wavePower",
        value: 1,
        tags: ["area", "damage"],
        category: "normal",
        weaponId: "wideWave",
        maxLevel: 3
      },
      {
        id: "scytheReachUp",
        name: "긴 낫날",
        description: "피의 낫 범위가 증가합니다.",
        type: "weaponStat",
        stat: "scytheRange",
        value: 1,
        tags: ["melee", "blood"],
        category: "normal",
        weaponId: "bloodScythe",
        maxLevel: 3
      },
      {
        id: "scythePowerUp",
        name: "피의 예리함",
        description: "피의 낫 피해와 회복 효율이 증가합니다.",
        type: "weaponStat",
        stat: "weaponPower",
        value: 1,
        tags: ["melee", "damage", "blood"],
        category: "normal",
        weaponId: "bloodScythe",
        maxLevel: 3
      },
      {
        id: "scytheSweepUp",
        name: "연속 베기",
        description: "피의 낫이 추가 방향을 베어냅니다.",
        type: "weaponStat",
        stat: "weaponCount",
        value: 1,
        tags: ["melee", "area"],
        category: "normal",
        weaponId: "bloodScythe",
        maxLevel: 2
      },
      {
        id: "spearWidthUp",
        name: "넓은 균열",
        description: "균열 창의 폭이 증가합니다.",
        type: "weaponStat",
        stat: "lineWidth",
        value: 1,
        tags: ["pierce", "projectile"],
        category: "normal",
        weaponId: "riftSpear",
        maxLevel: 3
      },
      {
        id: "spearPierceUp",
        name: "깊은 관통",
        description: "균열 창의 관통 수가 증가합니다.",
        type: "weaponStat",
        stat: "linePierce",
        value: 1,
        tags: ["pierce", "abyss"],
        category: "normal",
        weaponId: "riftSpear",
        maxLevel: 2
      },
      {
        id: "spearPowerUp",
        name: "균열 집중",
        description: "균열 창 피해가 증가합니다.",
        type: "weaponStat",
        stat: "weaponPower",
        value: 1,
        tags: ["pierce", "damage"],
        category: "normal",
        weaponId: "riftSpear",
        maxLevel: 3
      },
      {
        id: "starCountUp",
        name: "별가루 증식",
        description: "별가루탄 탄환 수가 증가합니다.",
        type: "weaponStat",
        stat: "weaponCount",
        value: 1,
        tags: ["bullet", "spread"],
        category: "normal",
        weaponId: "starDust",
        maxLevel: 3
      },
      {
        id: "starPowerUp",
        name: "반짝이는 파편",
        description: "별가루탄 피해가 증가합니다.",
        type: "weaponStat",
        stat: "weaponPower",
        value: 1,
        tags: ["bullet", "damage"],
        category: "normal",
        weaponId: "starDust",
        maxLevel: 3
      },
      {
        id: "starSpreadUp",
        name: "넓은 성운",
        description: "별가루탄 산탄 각도가 넓어집니다.",
        type: "weaponStat",
        stat: "spreadAngle",
        value: 1,
        tags: ["spread", "area"],
        category: "normal",
        weaponId: "starDust",
        maxLevel: 2
      }
    ],

    missions: [
      {
        id: "runKills100",
        name: "한 런에 100마리 처치",
        target: 100,
        reward: 15
      },
      {
        id: "bossKill",
        name: "보스 1회 처치",
        target: 1,
        reward: 20
      },
      {
        id: "twoEvolutions",
        name: "진화 능력 2개 획득",
        target: 2,
        reward: 15
      },
      {
        id: "twoRelics",
        name: "유물 2개 획득",
        target: 2,
        reward: 15
      },
      {
        id: "earn30Shards",
        name: "심연 조각 30개 획득",
        target: 30,
        reward: 15
      },
      {
        id: "challenge120",
        name: "도전 모드 2분 생존",
        target: 120,
        reward: 20
      },
      {
        id: "eliteKills3",
        name: "엘리트 3마리 처치",
        target: 3,
        reward: 20
      }
    ],

    texts: {
      title: "Abyss Survivor",
      start: "심연 생존 시작",
      pause: "일시정지",
      resume: "계속하기",
      restart: "재시작",
      levelUp: "능력을 선택하세요",
      gameOver: "게임 오버",
      clear: "클리어",
      hp: "체력",
      level: "레벨",
      time: "남은 시간",
      kills: "처치",
      exp: "경험치"
    },

    limits: {
      minAttackCooldown: 0.12,
      minPlayerSpeed: 20,
      minDamage: 1,
      minExpToNext: 1
    },

    random: {
      abilityChoices: 3,
      spawnWeightTotal: 100
    }
  };
})();
