(function () {
  window.AbyssSurvivor = window.AbyssSurvivor || {};
  const AS = window.AbyssSurvivor;
  const Data = AS.Data || {};
  const states = Data.states || {};
  let elements = {};
  let bound = false;
  let pointerStart = null;
  let lastAbilitySignature = "";
  let lastSetupSignature = "";

  function findElement() {
    for (let i = 0; i < arguments.length; i += 1) {
      const element = document.getElementById(arguments[i]);
      if (element) {
        return element;
      }
    }
    return null;
  }

  function safeNumber(value, fallback) {
    const numberValue = Number(value);
    const safeFallback = Number.isFinite(Number(fallback)) ? Number(fallback) : 0;
    return Number.isFinite(numberValue) ? numberValue : safeFallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function formatTime(value) {
    const total = Math.max(0, Math.ceil(safeNumber(value, 0)));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
  }

  function setText(element, value) {
    if (element) {
      element.textContent = value;
    }
  }

  function setPanelVisible(panel, visible) {
    if (!panel) {
      return;
    }

    panel.classList.toggle("is-hidden", !visible);
  }

  function setSetupVisible(visible) {
    const displayValue = visible ? "" : "none";

    if (elements.classPanel) {
      elements.classPanel.style.display = displayValue;
    }
    if (elements.zonePanel) {
      elements.zonePanel.style.display = displayValue;
    }
    if (elements.challengePanel) {
      elements.challengePanel.style.display = displayValue;
    }
    if (elements.upgradePanel) {
      elements.upgradePanel.style.display = displayValue;
    }
  }

  function getRun() {
    return AS.State && AS.State.getRun ? AS.State.getRun() : null;
  }

  function getSave() {
    return AS.State && AS.State.getSave ? AS.State.getSave() : {};
  }

  function safeInteger(value, fallback) {
    return Math.max(0, Math.floor(safeNumber(value, fallback)));
  }

  function iconFor(id, category) {
    const icons = {
      wanderer: "◆",
      guardian: "⬟",
      chaser: "➤",
      riftGate: "◇",
      swampEdge: "≈",
      abyssCore: "✦",
      normal: "○",
      hungryAbyss: "☄",
      glassSurvivor: "△",
      fastErosion: "»",
      vitality: "♥",
      power: "⚔",
      growth: "◆",
      damageUp: "⚔",
      attackSpeedUp: "↯",
      projectileSpeedUp: "➜",
      projectileSizeUp: "●",
      maxHpUp: "♥",
      heal: "+",
      moveSpeedUp: "➤",
      pickupRangeUp: "◇",
      piercingShot: "➳",
      splitShot: "⋯",
      orbitalShield: "◌",
      abyssNova: "✦",
      bloodCore: "♥",
      sharpHeart: "⚔",
      hunterEye: "◎",
      gluttonShard: "◆",
      blackWing: "➤",
      brokenShield: "⬟",
      voidHand: "◇",
      abyssPact: "✦"
    };

    if (icons[id]) {
      return icons[id];
    }

    if (category === "relic") {
      return "◆";
    }
    if (category === "evolution") {
      return "✦";
    }

    return "•";
  }

  function createIcon(text, className) {
    const icon = document.createElement("span");
    icon.className = className || "choice-icon";
    icon.textContent = text || "•";
    return icon;
  }

  function shortenDescription(text) {
    const value = typeof text === "string" ? text : "";
    return value.length > 28 ? value.slice(0, 27) + "…" : value;
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

  function ensurePanel(id, className) {
    let panel = document.getElementById(id);

    if (!panel && elements.startPanel) {
      panel = document.createElement("div");
      panel.id = id;
      panel.className = className;
      elements.startPanel.insertBefore(panel, elements.startButton || null);
    }

    return panel;
  }

  function ensureResultMeta(panel, id) {
    let meta = document.getElementById(id);

    if (!meta && panel) {
      meta = document.createElement("p");
      meta.id = id;
      meta.className = "result-meta";
      panel.insertBefore(meta, panel.querySelector("button"));
    }

    return meta;
  }

  function renderSelectionPanel(panel, title, items, selectedId, onSelect) {
    if (!panel) {
      return;
    }

    panel.innerHTML = "";
    const heading = document.createElement("strong");
    const list = document.createElement("div");
    heading.className = "panel-title";
    heading.textContent = title;
    list.className = "choice-list";
    panel.appendChild(heading);
    panel.appendChild(list);

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const button = document.createElement("button");
      const icon = createIcon(iconFor(item.id));
      const body = document.createElement("span");
      const name = document.createElement("strong");
      const description = document.createElement("span");
      const multiplier = safeNumber(item.rewardMultiplier, 0);

      button.className = item.id === selectedId ? "choice-button is-selected" : "choice-button";
      button.type = "button";
      body.className = "choice-body";
      name.textContent = item.name + (item.difficulty ? " · " + item.difficulty : "") + (multiplier > 0 ? " · x" + multiplier.toFixed(2) : "");
      description.textContent = shortenDescription(item.description);
      body.appendChild(name);
      body.appendChild(description);
      button.appendChild(icon);
      button.appendChild(body);
      button.addEventListener("click", function () {
        onSelect(item.id);
        AS.UI.renderStartOptions();
      });
      list.appendChild(button);
    }
  }

  function renderUpgradePanel() {
    const save = getSave();
    const panel = elements.upgradePanel;
    const upgrades = save.upgrades || {};
    const items = Data.permanentUpgrades || [];

    if (!panel) {
      return;
    }

    panel.innerHTML = "";
    const heading = document.createElement("strong");
    const shardText = document.createElement("span");
    const list = document.createElement("div");
    heading.className = "panel-title";
    heading.textContent = "◆ 성장";
    shardText.className = "shard-count";
    shardText.id = "shardCount";
    shardText.textContent = "◆ 보유 " + safeInteger(save.shards, 0);
    list.className = "choice-list";
    panel.appendChild(heading);
    panel.appendChild(shardText);
    panel.appendChild(list);

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const level = safeInteger(upgrades[item.id], 0);
      const cost = AS.State && AS.State.getUpgradeCost ? AS.State.getUpgradeCost(item.id) : 10 + level * 8;
      const button = document.createElement("button");
      const icon = createIcon(iconFor(item.id));
      const body = document.createElement("span");
      const name = document.createElement("strong");
      const description = document.createElement("span");

      button.className = "choice-button";
      button.type = "button";
      button.disabled = level >= item.maxLevel || safeInteger(save.shards, 0) < cost;
      body.className = "choice-body";
      name.textContent = item.name + " Lv." + level;
      description.textContent = "◆ " + cost + " · 최대 " + item.maxLevel;
      body.appendChild(name);
      body.appendChild(description);
      button.appendChild(icon);
      button.appendChild(body);
      button.addEventListener("click", function () {
        if (AS.State && AS.State.buyUpgrade) {
          AS.State.buyUpgrade(item.id);
          AS.UI.renderStartOptions();
        }
      });
      list.appendChild(button);
    }
  }

  function updateMoveFromKeys(run) {
    const input = run.input;
    const keys = input.keys || {};
    let x = 0;
    let y = 0;

    if (keys.KeyA || keys.ArrowLeft) {
      x -= 1;
    }
    if (keys.KeyD || keys.ArrowRight) {
      x += 1;
    }
    if (keys.KeyW || keys.ArrowUp) {
      y -= 1;
    }
    if (keys.KeyS || keys.ArrowDown) {
      y += 1;
    }

    if (x !== 0 || y !== 0) {
      const length = Math.sqrt(x * x + y * y);
      input.moveX = x / length;
      input.moveY = y / length;
      return true;
    }

    return false;
  }

  function setPointerMove(event) {
    const run = getRun();
    const rect = elements.canvas ? elements.canvas.getBoundingClientRect() : null;
    let dx;
    let dy;
    let length;

    if (!run || !run.input || !pointerStart || !rect) {
      return;
    }

    dx = event.clientX - pointerStart.x;
    dy = event.clientY - pointerStart.y;
    length = Math.sqrt(dx * dx + dy * dy);

    if (!Number.isFinite(length) || length < 8) {
      run.input.moveX = 0;
      run.input.moveY = 0;
      return;
    }

    run.input.moveX = clamp(dx / length, -1, 1);
    run.input.moveY = clamp(dy / length, -1, 1);
  }

  function clearPointerMove(run) {
    if (!run || !run.input) {
      return;
    }

    run.input.active = false;
    run.input.pointerId = null;
    pointerStart = null;

    if (!updateMoveFromKeys(run)) {
      run.input.moveX = 0;
      run.input.moveY = 0;
    }
  }

  function clearAllInput() {
    const run = getRun();

    if (!run || !run.input) {
      return;
    }

    run.input.active = false;
    run.input.moveX = 0;
    run.input.moveY = 0;
    run.input.pointerId = null;
    run.input.keys = {};
    pointerStart = null;
  }

  function startGame() {
    if (!AS.State || !AS.State.startRun) {
      return;
    }

    AS.State.startRun();
    AS.UI.hideOverlay();
  }

  function restartGame() {
    startGame();
  }

  function togglePause() {
    const run = getRun();

    if (!run || !AS.State || !AS.State.setMode) {
      return;
    }

    if (run.mode === (states.running || "running")) {
      AS.State.setMode(states.paused || "paused");
    } else if (run.mode === (states.paused || "paused")) {
      AS.State.setMode(states.running || "running");
    }
  }

  function bindButton(element, handler) {
    if (element) {
      element.addEventListener("click", handler);
    }
  }

  function bindInput() {
    const canvas = elements.canvas;

    if (!canvas) {
      return;
    }

    canvas.addEventListener("pointerdown", function (event) {
      const run = getRun();

      if (!run || !run.input) {
        return;
      }

      event.preventDefault();
      run.input.active = true;
      run.input.pointerId = event.pointerId;
      pointerStart = { x: event.clientX, y: event.clientY };
      if (canvas.setPointerCapture) {
        canvas.setPointerCapture(event.pointerId);
      }
      setPointerMove(event);
    });

    canvas.addEventListener("pointermove", function (event) {
      const run = getRun();

      if (!run || !run.input || run.input.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      setPointerMove(event);
    });

    canvas.addEventListener("pointerup", function (event) {
      const run = getRun();

      if (!run || !run.input || run.input.pointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      clearPointerMove(run);
    });

    canvas.addEventListener("lostpointercapture", function () {
      clearPointerMove(getRun());
    });

    canvas.addEventListener("contextmenu", function (event) {
      event.preventDefault();
    });

    canvas.addEventListener("pointercancel", function (event) {
      const run = getRun();

      if (!run || !run.input || run.input.pointerId !== event.pointerId) {
        return;
      }

      clearPointerMove(run);
    });

    window.addEventListener("keydown", function (event) {
      const run = getRun();

      if (!run || !run.input) {
        return;
      }

      if (event.code === "KeyW" || event.code === "KeyA" || event.code === "KeyS" || event.code === "KeyD" || event.code.indexOf("Arrow") === 0) {
        run.input.keys[event.code] = true;
        updateMoveFromKeys(run);
        event.preventDefault();
      }
    });

    window.addEventListener("keyup", function (event) {
      const run = getRun();

      if (!run || !run.input) {
        return;
      }

      if (event.code === "KeyW" || event.code === "KeyA" || event.code === "KeyS" || event.code === "KeyD" || event.code.indexOf("Arrow") === 0) {
        run.input.keys[event.code] = false;
        if (!updateMoveFromKeys(run) && !run.input.active) {
          run.input.moveX = 0;
          run.input.moveY = 0;
        }
        event.preventDefault();
      }
    });

    window.addEventListener("blur", clearAllInput);

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        clearAllInput();
      }
    });
  }

  AS.UI = {
    init: function () {
      elements = {
        health: findElement("hudHealth", "healthText"),
        level: findElement("hudLevel", "levelText"),
        expFill: findElement("hudExpFill", "expFill"),
        expText: findElement("hudExpText", "expText"),
        time: findElement("hudTime", "timeText"),
        kills: findElement("hudKills", "killText"),
        canvas: findElement("gameCanvas"),
        pauseButton: findElement("pauseButton"),
        restartButton: findElement("restartButton"),
        overlay: findElement("overlay"),
        startPanel: findElement("startPanel"),
        levelUpPanel: findElement("abilityPanel", "levelUpPanel"),
        gameOverPanel: findElement("gameOverPanel"),
        clearPanel: findElement("clearPanel"),
        abilityList: findElement("abilityList"),
        startButton: findElement("startButton"),
        retryButton: findElement("retryButton"),
        clearRetryButton: findElement("clearRetryButton"),
        gameOverTime: findElement("gameOverTimeText"),
        gameOverKills: findElement("gameOverKillText"),
        clearTime: findElement("clearTimeText"),
        clearKills: findElement("clearKillText"),
        clearLevel: findElement("clearLevelText")
      };

      elements.classPanel = ensurePanel("classPanel", "setup-panel");
      elements.zonePanel = ensurePanel("zonePanel", "setup-panel");
      elements.challengePanel = ensurePanel("challengePanel", "setup-panel");
      elements.upgradePanel = ensurePanel("upgradePanel", "setup-panel");
      elements.gameOverMeta = ensureResultMeta(elements.gameOverPanel, "gameOverMeta");
      elements.clearMeta = ensureResultMeta(elements.clearPanel, "clearMeta");

      this.bindEvents();
      this.renderStartOptions();
      this.updateHud(getRun());
      this.showOverlay();
      return elements;
    },

    updateHud: function (run) {
      const player = run && run.player ? run.player : {};
      const hp = Math.ceil(clamp(safeNumber(player.hp, 0), 0, safeNumber(player.maxHp, 100)));
      const maxHp = Math.ceil(Math.max(1, safeNumber(player.maxHp, 100)));
      const exp = Math.floor(Math.max(0, safeNumber(run && run.exp, 0)));
      const expToNext = Math.max(1, Math.floor(safeNumber(run && run.expToNext, 20)));
      const expRatio = clamp((exp / expToNext) * 100, 0, 100);

      setText(elements.health, "♥ " + hp + "/" + maxHp);
      setText(elements.level, "Lv " + String(Math.max(1, Math.floor(safeNumber(run && run.level, 1)))));
      setText(elements.expText, "◆ " + exp + "/" + expToNext);
      setText(elements.time, formatTime(run ? run.remainingTime : safeNumber((Data.game || {}).runDuration, 180)));
      setText(elements.kills, "☠ " + String(Math.max(0, Math.floor(safeNumber(run && run.kills, 0)))));

      if (elements.expFill) {
        elements.expFill.style.width = expRatio + "%";
      }

      if (elements.pauseButton) {
        elements.pauseButton.textContent = run && run.mode === (states.paused || "paused") ? "▶" : "Ⅱ";
        elements.pauseButton.setAttribute("aria-label", run && run.mode === (states.paused || "paused") ? "계속하기" : "일시정지");
      }
    },

    showOverlay: function () {
      const run = getRun();
      const mode = run ? run.mode : (states.title || "title");
      const visible = mode !== (states.running || "running");

      if (elements.overlay) {
        elements.overlay.classList.toggle("is-visible", visible);
      }

      setPanelVisible(elements.startPanel, mode === (states.title || "title") || mode === (states.paused || "paused"));
      setPanelVisible(elements.levelUpPanel, mode === (states.levelup || "levelup"));
      setPanelVisible(elements.gameOverPanel, mode === (states.gameover || "gameover"));
      setPanelVisible(elements.clearPanel, mode === (states.clear || "clear"));

      if (mode === (states.paused || "paused") && elements.startPanel) {
        setSetupVisible(false);
        const title = elements.startPanel.querySelector("h1");
        const message = elements.startPanel.querySelector("p");
        if (title) {
          title.textContent = "일시정지";
        }
        if (message) {
          message.textContent = "전투가 멈췄습니다.";
        }
        if (elements.startButton) {
          elements.startButton.textContent = "▶ 계속";
        }
      } else if (elements.startPanel) {
        setSetupVisible(mode === (states.title || "title"));
        const title = elements.startPanel.querySelector("h1");
        const message = elements.startPanel.querySelector("p");
        if (title) {
          title.textContent = "Abyss Survivor";
        }
        if (message) {
          message.textContent = "3분 생존 · 보스 처치";
        }
        if (elements.startButton) {
          elements.startButton.textContent = "▶ 시작";
        }
        this.renderStartOptions();
      }

      if (mode === (states.levelup || "levelup")) {
        this.showLevelUp(run.pendingAbilities || []);
      } else {
        lastAbilitySignature = "";
      }

      if (mode === (states.gameover || "gameover")) {
        setText(elements.gameOverTime, formatTime(run.time));
        setText(elements.gameOverKills, String(Math.floor(safeNumber(run.kills, 0))));
        this.updateResultMeta(elements.gameOverMeta, run);
      }

      if (mode === (states.clear || "clear")) {
        setText(elements.clearTime, formatTime(run.time));
        setText(elements.clearKills, String(Math.floor(safeNumber(run.kills, 0))));
        setText(elements.clearLevel, String(Math.floor(safeNumber(run.level, 1))));
        this.updateResultMeta(elements.clearMeta, run);
      }
    },

    hideOverlay: function () {
      if (elements.overlay) {
        elements.overlay.classList.remove("is-visible");
      }
    },

    showLevelUp: function (abilities) {
      const signature = abilities.map(function (ability) {
        return ability.id;
      }).join("|");

      if (!elements.abilityList) {
        return;
      }

      if (signature === lastAbilitySignature) {
        return;
      }

      lastAbilitySignature = signature;
      elements.abilityList.innerHTML = "";

      for (let i = 0; i < abilities.length; i += 1) {
        const ability = abilities[i];
        const button = document.createElement("button");
        const icon = createIcon(iconFor(ability.id, ability.category), "ability-icon");
        const body = document.createElement("span");
        const tag = document.createElement("em");
        const name = document.createElement("strong");
        const description = document.createElement("span");
        const category = ability.category || "normal";

        button.className = category === "evolution" ? "ability-button is-evolution" : (category === "relic" ? "ability-button is-relic" : "ability-button");
        button.type = "button";
        button.dataset.abilityId = ability.id;
        body.className = "ability-body";
        tag.className = "ability-tag";
        tag.textContent = category === "evolution" ? "진화" : (category === "relic" ? "유물 · " + (ability.rarity || "일반") : "강화");
        name.textContent = ability.name;
        description.textContent = shortenDescription(ability.description);
        body.appendChild(tag);
        body.appendChild(name);
        body.appendChild(description);
        button.appendChild(icon);
        button.appendChild(body);
        button.addEventListener("click", function () {
          if (AS.Game && AS.Game.applyAbility) {
            AS.Game.applyAbility(ability.id);
          }
        });
        elements.abilityList.appendChild(button);
      }
    },

    renderStartOptions: function () {
      const save = getSave();
      const signature = [
        save.selectedClassId,
        save.selectedZoneId,
        save.selectedChallengeId,
        safeInteger(save.shards, 0),
        safeInteger(save.upgrades && save.upgrades.vitality, 0),
        safeInteger(save.upgrades && save.upgrades.power, 0),
        safeInteger(save.upgrades && save.upgrades.growth, 0)
      ].join("|");

      if (signature === lastSetupSignature) {
        return;
      }

      lastSetupSignature = signature;

      renderSelectionPanel(elements.classPanel, "⬟ 클래스", Data.classes || [], save.selectedClassId || "wanderer", function (id) {
        if (AS.State && AS.State.setSelectedClass) {
          AS.State.setSelectedClass(id);
        }
      });

      renderSelectionPanel(elements.zonePanel, "◇ 구역", Data.zones || [], save.selectedZoneId || "riftGate", function (id) {
        if (AS.State && AS.State.setSelectedZone) {
          AS.State.setSelectedZone(id);
        }
      });

      renderSelectionPanel(elements.challengePanel, "○ 도전", Data.challenges || [], save.selectedChallengeId || "normal", function (id) {
        if (AS.State && AS.State.setSelectedChallenge) {
          AS.State.setSelectedChallenge(id);
        }
      });

      renderUpgradePanel();
    },

    updateResultMeta: function (target, run) {
      const save = getSave();
      const classItem = findById(Data.classes, run.selectedClassId || save.selectedClassId, "wanderer");
      const zoneItem = findById(Data.zones, run.selectedZoneId || save.selectedZoneId, "riftGate");
      const challengeItem = findById(Data.challenges, run.selectedChallengeId || save.selectedChallengeId, "normal");
      const relics = (run.relics || []).map(function (relic) {
        return relic.name;
      }).join(", ") || "없음";
      const bonuses = (run.buildBonuses || []).map(function (bonus) {
        return bonus.name;
      }).join(", ") || "없음";
      const resultText = run.mode === (states.clear || "clear") ? "런 클리어" : "게임 오버";

      setText(target, [
        resultText + " · ⏱ " + formatTime(run.time) + " · ☠ " + safeInteger(run.kills, 0) + " · Lv " + safeInteger(run.level, 1),
        "⬟ " + classItem.name + " / ◇ " + zoneItem.name + " / ○ " + challengeItem.name + " x" + safeNumber(run.rewardMultiplier, 1).toFixed(2),
        "◆ +" + safeInteger(run.shardReward, 0) + " · 보유 " + safeInteger(save.shards, 0),
        "유물: " + relics,
        "빌드: " + bonuses
      ].join("\n"));
    },

    bindEvents: function () {
      if (bound) {
        return;
      }

      bound = true;
      bindButton(elements.startButton, function () {
        const run = getRun();
        if (run && run.mode === (states.paused || "paused") && AS.State && AS.State.setMode) {
          AS.State.setMode(states.running || "running");
          return;
        }
        startGame();
      });
      bindButton(elements.pauseButton, togglePause);
      bindButton(elements.restartButton, restartGame);
      bindButton(elements.retryButton, restartGame);
      bindButton(elements.clearRetryButton, restartGame);
      bindInput();
    }
  };
})();
