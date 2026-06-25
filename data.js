(function () {
  window.AbyssSurvivor = window.AbyssSurvivor || {};
  const AS = window.AbyssSurvivor;

  AS.Data = {
    storageKey: "abyssSurvivorSave",

    game: {
      width: 360,
      height: 560,
      runDuration: 180,
      bossSpawnTime: 120,
      maxEnemies: 80,
      maxProjectiles: 96,
      maxGems: 120,
      spawnPadding: 40
    },

    states: {
      title: "title",
      running: "running",
      paused: "paused",
      levelup: "levelup",
      gameover: "gameover",
      clear: "clear"
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

    bossPattern: {
      chargeCooldown: 7,
      chargePrepareTime: 0.6,
      chargeDuration: 0.8,
      chargeSpeedMultiplier: 3.1,
      summonCooldown: 8,
      summonCountMin: 2,
      summonCountMax: 4,
      auraRadius: 62,
      auraDamage: 5,
      auraTick: 1.2
    },

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
      }
    ],

    bosses: {
      watcher: {
        id: "watcher",
        name: "심연의 감시자",
        hp: 1000,
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
        hp: 1180,
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
        hp: 1080,
        speed: 36,
        damage: 18,
        radius: 30,
        exp: 0,
        score: 42,
        color: "#c65cff",
        auraRadius: 75
      }
    },

    waves: [
      { start: 0, end: 30, spawnInterval: 1.12, weights: { normal: 80, fast: 20, tank: 0 } },
      { start: 30, end: 60, spawnInterval: 0.94, weights: { normal: 55, fast: 35, tank: 10 } },
      { start: 60, end: 90, spawnInterval: 0.78, weights: { normal: 45, fast: 25, tank: 30 } },
      { start: 90, end: 120, spawnInterval: 0.66, weights: { normal: 40, fast: 35, tank: 25 } },
      { start: 120, end: 180, spawnInterval: 0.86, weights: { normal: 45, fast: 35, tank: 20 } }
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
          spawnIntervalMultiplier: 0.85,
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
        rarity: "전설",
        description: "공격력이 크게 증가하지만 받는 피해도 증가합니다.",
        effect: {
          damage: 12,
          damageTakenMultiplier: 1.1
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
        category: "normal",
        maxLevel: 4
      },
      {
        id: "piercingShot",
        name: "관통 파편",
        description: "투사체가 적을 1회 추가로 관통합니다.",
        type: "evolution",
        category: "evolution",
        requiredLevel: 4,
        once: true
      },
      {
        id: "splitShot",
        name: "분열 파편",
        description: "공격할 때 좌우 보조 투사체를 함께 발사합니다.",
        type: "evolution",
        category: "evolution",
        requiredLevel: 4,
        once: true
      },
      {
        id: "orbitalShield",
        name: "회전 보호막",
        description: "플레이어 주변을 도는 구체가 적에게 피해를 줍니다.",
        type: "evolution",
        category: "evolution",
        requiredLevel: 4,
        once: true
      },
      {
        id: "abyssNova",
        name: "심연 폭발",
        description: "일정 시간마다 주변 적에게 원형 피해를 줍니다.",
        type: "evolution",
        category: "evolution",
        requiredLevel: 4,
        once: true
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
