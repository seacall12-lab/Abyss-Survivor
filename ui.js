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
  let lastHudSignature = "";
  let lastOverlaySignature = "";
  let activeLobbyModal = "";
  let buildPanelOpen = false;
  const pointerDeadZone = 10;
  const pointerMaxDistance = 88;

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

  function formatNumber(value) {
    return String(Math.max(0, Math.round(safeNumber(value, 0)))).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function formatDamageRanking(run) {
    const rows = AS.Game && AS.Game.getDamageRanking ? AS.Game.getDamageRanking(run, 5) : [];

    if (!rows.length) {
      return "⚔ 공격별 피해: 기록 없음";
    }

    return "⚔ 공격별 피해: " + rows.map(function (row, index) {
      return (index + 1) + ". " + row.name + " " + formatNumber(row.damage) + " / " + safeInteger(row.hits, 0) + "타 / DPS " + formatNumber(row.dps);
    }).join(" · ");
  }

  function formatPathHistory(run) {
    const history = Array.isArray(run && run.pathHistory) ? run.pathHistory : [];

    if (!history.length) {
      return "⬢ 선택 경로: 없음";
    }

    return "⬢ 선택 경로: " + history.slice(0, 3).map(function (entry) {
      return formatTime(entry.time) + " " + (entry.roomName || "전투방");
    }).join(" → ");
  }

  function formatEndgameRecord(run, save) {
    const endgame = save && save.endgame ? save.endgame : {};
    const highestDepth = safeInteger(endgame.highestEndgameDepth, 0);
    const finalKills = safeInteger(endgame.finalBossKills, 0);
    const variantKills = safeInteger(endgame.variantBossKills, 0);
    const firstReward = safeInteger(run && run.firstClearReward, 0);
    const firstDepth = safeInteger(run && run.firstClearRewardDepth, 0);
    const parts = [
      "♛ 엔드게임: 최고 심연 " + highestDepth,
      "♛ 최종 보스 " + (run && run.finalBossDefeated ? "처치" : "미처치") + " / 누적 " + finalKills,
      "☠ 변종 보스 " + (run && run.variantBossDefeated ? (run.bossVariantName || "처치") : "미처치") + " / 누적 " + variantKills
    ];

    if (firstReward > 0) {
      parts.push("◈ 심연 " + firstDepth + " 첫 클리어 +" + firstReward);
    }

    return parts.join(" · ");
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

    if (elements.lobbySummaryPanel) {
      elements.lobbySummaryPanel.style.display = displayValue;
    }
    if (!visible) {
      closeLobbyModal();
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

  function normalizeRarity(value, category) {
    const raw = typeof value === "string" ? value : "";

    if (category === "evolution") {
      return "evolution";
    }
    if (category === "relic") {
      return "relic";
    }
    if (raw === "legendary" || raw === "전설") {
      return "legendary";
    }
    if (raw === "epic" || raw === "영웅") {
      return "epic";
    }
    if (raw === "rare" || raw === "희귀") {
      return "rare";
    }
    if (raw === "uncommon" || raw === "고급") {
      return "uncommon";
    }
    if (raw === "common" || raw === "일반") {
      return "common";
    }

    return "";
  }

  function rarityForItem(item, fallbackCategory) {
    const value = item || {};
    const category = value.category || fallbackCategory || "";
    const normalized = normalizeRarity(value.rarity, category);
    const rewardMultiplier = safeNumber(value.rewardMultiplier, 0);
    const difficulty = safeNumber(value.difficulty, 0);

    if (normalized) {
      return normalized;
    }
    if (value.id === "lightningChain" || value.id === "voidMine") {
      return "rare";
    }
    if (value.id === "orbitBlade" || value.id === "wideWave") {
      return "uncommon";
    }
    if (category === "weapon") {
      return "common";
    }
    if (value.weaponId) {
      return "rare";
    }
    if (difficulty >= 3 || rewardMultiplier >= 1.3) {
      return "rare";
    }
    if (difficulty >= 2 || rewardMultiplier > 1) {
      return "uncommon";
    }

    return "common";
  }

  function rarityMeta(rarity) {
    const rarityMap = Data.rarityColors || {};
    return rarityMap[rarity] || rarityMap.common || {
      label: "일반",
      color: "#9aa4b2",
      bg: "rgba(154, 164, 178, 0.12)"
    };
  }

  function applyRarityStyle(element, item, fallbackCategory) {
    const rarity = typeof item === "string" ? item : rarityForItem(item, fallbackCategory);
    const meta = rarityMeta(rarity);

    if (!element) {
      return rarity;
    }

    element.classList.add("rarity-card", "rarity-" + rarity);
    element.dataset.rarity = rarity;
    element.style.setProperty("--rarity-color", meta.color || "#9aa4b2");
    element.style.setProperty("--rarity-bg", meta.bg || "rgba(154, 164, 178, 0.12)");
    element.style.setProperty("--rarity-glow", meta.bg || "rgba(154, 164, 178, 0.12)");
    return rarity;
  }

  function createRarityBadge(item, fallbackCategory) {
    const rarity = rarityForItem(item, fallbackCategory);
    const meta = rarityMeta(rarity);
    const badge = document.createElement("em");

    badge.className = "rarity-badge";
    badge.textContent = meta.label || "일반";
    applyRarityStyle(badge, rarity);
    return badge;
  }

  function iconFor(id, category) {
    const icons = {
      wanderer: "◆",
      guardian: "⬟",
      chaser: "➤",
      riftGate: "◇",
      swampEdge: "≈",
      abyssCore: "✦",
      abyssBullet: "●",
      orbitBlade: "◌",
      lightningChain: "ϟ",
      voidMine: "✦",
      wideWave: "≋",
      normal: "○",
      survival: "⏱",
      bossRush: "♛",
      combat: "⚔",
      elite: "◆",
      relic: "◆",
      heal: "✚",
      support: "✦",
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
      abyssBulletCount: "✦",
      abyssBulletFocus: "●",
      bladeCountUp: "✦",
      bladeSizeUp: "◆",
      bladeSpinUp: "↻",
      chainForkUp: "ϟ",
      chainLinkUp: "⌁",
      chainWidthUp: "▰",
      mineCountUp: "◇",
      mineRadiusUp: "◉",
      minePowerUp: "✹",
      waveCountUp: "≋",
      waveRadiusUp: "◌",
      wavePowerUp: "◎",
      bloodSeeker: "♥",
      engineer: "⚙",
      abyssApostle: "◆",
      bloodScythe: "☽",
      riftSpear: "↗",
      starDust: "✦",
      brokenSanctum: "▣",
      deadCorridor: "☠",
      stormRift: "ϟ",
      bloodHook: "♥",
      riftLens: "◈",
      stormCore: "ϟ",
      mineRig: "▦",
      voidEcho: "〰",
      gluttonHeart: "❤",
      brokenClock: "◷",
      smallSun: "☀",
      hunterMark: "◎",
      abyssNecklace: "◆",
      glassShard: "◇",
      survivorFlag: "⚑",
      scytheReachUp: "☽",
      scythePowerUp: "♥",
      scytheSweepUp: "↺",
      spearWidthUp: "↗",
      spearPierceUp: "⇥",
      spearPowerUp: "◆",
      starCountUp: "✦",
      starPowerUp: "✶",
      starSpreadUp: "✹",
      supportBullet: "•",
      miniBolt: "ϟ",
      orbitShard: "◌",
      miniMine: "◇",
      echoWave: "≋",
      bloodCore: "♥",
      sharpHeart: "⚔",
      hunterEye: "◎",
      gluttonShard: "◆",
      blackWing: "➤",
      brokenShield: "⬟",
      voidHand: "◇",
      abyssPact: "✦",
      abyssCrown: "♛",
      riftHeart: "◆",
      lastMark: "☠",
      stormSeal: "↯",
      abyssBarrier: "▣",
      voidAmplifier: "✹",
      watcher: "☠",
      swampGuardian: "☠",
      coreDevourer: "☠",
      sanctumBreaker: "▣",
      deadLord: "☠",
      stormDevourer: "↯",
      abyssSovereign: "♛",
      bloodVariant: "☠",
      voidVariant: "✹",
      stormVariant: "↯"
    };

    if (icons[id]) {
      return icons[id];
    }

    if (category === "relic") {
      return "◆";
    }
    if (category === "boss" || category === "bossVariant") {
      return "☠";
    }
    if (category === "finalBoss" || category === "endgame") {
      return "♛";
    }
    if (category === "zone") {
      return "▣";
    }
    if (category === "event") {
      return "◈";
    }
    if (category === "mapRoom") {
      return "⬢";
    }
    if (category === "support" || category === "supportUpgrade") {
      return "✦";
    }
    if (category === "evolution") {
      return "✦";
    }
    if (category === "heal" || category === "hp") {
      return "✚";
    }
    if (category === "attack" || category === "damage") {
      return "⚔";
    }
    if (category === "speed" || category === "cooldown") {
      return "↯";
    }
    if (category === "projectile") {
      return "➤";
    }
    if (category === "area") {
      return "◎";
    }

    return "◆";
  }

  function safeIcon(value, id, category) {
    const icon = typeof value === "string" ? value.trim() : "";

    if (icon && icon.length <= 4) {
      return icon;
    }

    return iconFor(id, category);
  }

  function createIcon(text, className, fallbackId, category) {
    const icon = document.createElement("span");
    icon.className = className || "choice-icon";
    icon.textContent = safeIcon(text, fallbackId, category);
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

  function ensurePanelButton(panel, id, text, className) {
    let button = document.getElementById(id);

    if (!button && panel) {
      button = document.createElement("button");
      button.id = id;
      button.type = "button";
      button.className = className || "secondary-button";
      button.textContent = text;
      panel.appendChild(button);
    }

    return button;
  }

  function ensureGamePanel(id, className) {
    let panel = document.getElementById(id);
    const gameArea = elements.canvas ? elements.canvas.parentElement : null;

    if (!panel && gameArea) {
      panel = document.createElement("div");
      panel.id = id;
      panel.className = className;
      gameArea.appendChild(panel);
    }

    return panel;
  }

  function ensureControlButton(id, text) {
    let button = document.getElementById(id);
    const controlBar = elements.pauseButton ? elements.pauseButton.parentElement : null;

    if (!button && controlBar) {
      button = document.createElement("button");
      button.id = id;
      button.type = "button";
      button.className = "control-button";
      button.textContent = text;
      controlBar.appendChild(button);
    }

    return button;
  }

  function ensureLobbyModal() {
    let modal = document.getElementById("lobbyModal");
    let title;
    let body;
    let closeButton;

    if (!modal && elements.startPanel) {
      modal = document.createElement("div");
      modal.id = "lobbyModal";
      modal.className = "lobby-modal is-hidden";

      title = document.createElement("strong");
      title.id = "lobbyModalTitle";
      title.className = "panel-title";

      body = document.createElement("div");
      body.id = "lobbyModalBody";
      body.className = "lobby-modal-body";

      closeButton = document.createElement("button");
      closeButton.id = "lobbyModalClose";
      closeButton.type = "button";
      closeButton.className = "secondary-button";
      closeButton.textContent = "닫기";

      modal.appendChild(title);
      modal.appendChild(body);
      modal.appendChild(closeButton);
      elements.startPanel.insertBefore(modal, elements.startButton || null);
    }

    elements.lobbyModal = modal;
    elements.lobbyModalTitle = findElement("lobbyModalTitle");
    elements.lobbyModalBody = findElement("lobbyModalBody");
    elements.lobbyModalClose = findElement("lobbyModalClose");

    if (elements.lobbyModalClose) {
      elements.lobbyModalClose.onclick = closeLobbyModal;
    }

    return modal;
  }

  function setElementVisible(element, visible) {
    if (element) {
      element.style.display = visible ? "" : "none";
    }
  }

  function renderSelectionPanel(panel, title, items, selectedId, onSelect, category) {
    if (!panel) {
      return;
    }

    panel.innerHTML = "";
    const heading = document.createElement("strong");
    const list = document.createElement("div");
    heading.className = "panel-title";
    heading.textContent = title;
    list.className = "choice-list";
    if (title) {
      panel.appendChild(heading);
    }
    panel.appendChild(list);

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const button = document.createElement("button");
      const icon = createIcon(item.icon, "choice-icon", item.id, category);
      const body = document.createElement("span");
      const name = document.createElement("strong");
      const badge = createRarityBadge(item, category);
      const description = document.createElement("span");
      const multiplier = safeNumber(item.rewardMultiplier, 0);
      const unlockCategory = category === "class" ? "classes" : (category === "weapon" ? "weapons" : (category === "zone" ? "zones" : category));
      const isLocked = unlockCategory && AS.State && AS.State.isUnlocked && (unlockCategory === "classes" || unlockCategory === "weapons" || unlockCategory === "zones") ? !AS.State.isUnlocked(unlockCategory, item.id) : false;

      button.className = item.id === selectedId ? "choice-button is-selected" : "choice-button";
      if (isLocked) {
        button.className += " is-locked";
      }
      button.type = "button";
      button.disabled = isLocked;
      applyRarityStyle(button, item, category);
      applyRarityStyle(icon, item, category);
      body.className = "choice-body";
      name.textContent = item.name + (item.difficulty ? " · " + item.difficulty : "") + (multiplier > 0 ? " · x" + multiplier.toFixed(2) : "");
      description.textContent = isLocked && AS.State && AS.State.getUnlockMessage ? "잠김: " + AS.State.getUnlockMessage(unlockCategory, item.id) : shortenDescription(item.description);
      body.appendChild(name);
      body.appendChild(badge);
      body.appendChild(description);
      button.appendChild(icon);
      button.appendChild(body);
      button.addEventListener("click", function () {
        if (isLocked) {
          return;
        }
        onSelect(item.id);
        AS.UI.renderStartOptions();
      });
      list.appendChild(button);
    }
  }

  function closeLobbyModal() {
    activeLobbyModal = "";
    if (elements.lobbyModal) {
      elements.lobbyModal.classList.add("is-hidden");
    }
    if (elements.lobbyModalBody) {
      elements.lobbyModalBody.innerHTML = "";
    }
  }

  function selectedSummary(items, selectedId, fallbackId) {
    const item = findById(items, selectedId, fallbackId);
    const name = item.name || "선택 없음";
    const description = shortenDescription(item.description || "");
    return {
      item: item,
      name: name,
      description: description
    };
  }

  function appendLobbySummaryButton(panel, iconText, label, summary, modalType) {
    const button = document.createElement("button");
    const icon = createIcon(iconText, "menu-icon", modalType, modalType);
    const body = document.createElement("span");
    const title = document.createElement("strong");
    const description = document.createElement("span");
    const arrow = document.createElement("span");

    button.type = "button";
    button.className = "lobby-choice-button";
    body.className = "lobby-choice-body";
    title.textContent = label + " · " + summary.name;
    description.textContent = summary.description || "선택 창 열기";
    arrow.className = "lobby-choice-arrow";
    arrow.textContent = "›";
    body.appendChild(title);
    body.appendChild(description);
    button.appendChild(icon);
    button.appendChild(body);
    button.appendChild(arrow);
    button.addEventListener("click", function () {
      openLobbyModal(modalType);
    });
    panel.appendChild(button);
  }

  function getMasterySummary(save) {
    const classEntry = AS.State && AS.State.getMasteryEntry ? AS.State.getMasteryEntry("classes", save.selectedClassId) : { level: 1 };
    const weaponEntry = AS.State && AS.State.getMasteryEntry ? AS.State.getMasteryEntry("weapons", save.selectedWeaponId) : { level: 1 };
    const zoneEntry = AS.State && AS.State.getMasteryEntry ? AS.State.getMasteryEntry("zones", save.selectedZoneId) : { level: 1 };

    return {
      name: "클래스 Lv." + safeInteger(classEntry.level, 1) + " · 무기 Lv." + safeInteger(weaponEntry.level, 1) + " · 구역 Lv." + safeInteger(zoneEntry.level, 1),
      description: "현재 선택 항목의 숙련도 효과를 확인합니다."
    };
  }

  function getUnlockSummary() {
    const rows = AS.State && AS.State.getUnlockRows ? AS.State.getUnlockRows() : [];
    let locked = 0;
    let unlocked = 0;

    for (let i = 0; i < rows.length; i += 1) {
      if (rows[i].unlocked) {
        unlocked += 1;
      } else {
        locked += 1;
      }
    }

    return {
      name: unlocked + "개 해금 · " + locked + "개 잠김",
      description: "잠긴 콘텐츠와 해금 조건을 확인합니다."
    };
  }

  function collectBuildTags(run) {
    const tags = {};
    const weapon = findById(Data.weapons || [], run && run.selectedWeaponId, "abyssBullet");
    const supports = Array.isArray(run && run.supportWeapons) ? run.supportWeapons : [];
    const relics = Array.isArray(run && run.relics) ? run.relics : [];
    const abilities = run && run.abilityLevels ? run.abilityLevels : {};
    let key;

    function addTags(item) {
      const list = Array.isArray(item && item.tags) ? item.tags : [];
      for (let i = 0; i < list.length; i += 1) {
        tags[list[i]] = true;
      }
    }

    addTags(weapon);
    for (let i = 0; i < supports.length; i += 1) {
      addTags(findById(Data.supportWeapons || [], supports[i].id, ""));
    }
    for (let i = 0; i < relics.length; i += 1) {
      addTags(findById(Data.relics || [], relics[i].id, ""));
    }
    for (key in abilities) {
      if (Object.prototype.hasOwnProperty.call(abilities, key) && abilities[key] > 0) {
        addTags(findById(Data.abilities || [], key, ""));
      }
    }

    return tags;
  }

  function getAbilityInsight(ability, run) {
    const tags = Array.isArray(ability && ability.tags) ? ability.tags : [];
    const buildTags = collectBuildTags(run);
    const matches = [];
    const details = [];
    const currentLevel = safeInteger(run && run.abilityLevels && run.abilityLevels[ability.id], 0);
    const maxLevel = safeInteger(ability && ability.maxLevel, 0);

    for (let i = 0; i < tags.length; i += 1) {
      if (buildTags[tags[i]]) {
        matches.push(tags[i]);
      }
    }
    if (ability && ability.weaponId) {
      details.push("전용 강화");
    }
    if (ability && ability.requiredLevel) {
      details.push("필요 Lv." + safeInteger(ability.requiredLevel, 1));
    }
    if (maxLevel > 0 && maxLevel < 99 && (ability.category || "") !== "evolution") {
      details.push("현재 " + currentLevel + "/" + maxLevel);
    }
    if (matches.length > 0) {
      details.push("시너지 " + matches.slice(0, 3).join(", "));
    }
    if ((ability && ability.category) === "evolution") {
      details.push("진화 선택지");
    }

    return details.join(" · ");
  }

  function getMissionHudText(run) {
    const missions = AS.State && AS.State.getRunMissions ? AS.State.getRunMissions(run) : [];
    const objectives = Array.isArray(run && run.miniObjectives) ? run.miniObjectives : [];
    let completed = 0;
    let objectiveText = "";

    for (let i = 0; i < missions.length; i += 1) {
      if (missions[i].completed) {
        completed += 1;
      }
    }
    if (objectives.length > 0) {
      const objective = objectives[0];
      objectiveText = " · 봉화 " + Math.floor((safeNumber(objective.progress, 0) / Math.max(1, safeNumber(objective.target, 10))) * 100) + "%";
    }

    return "임무 " + completed + "/" + missions.length + objectiveText;
  }

  function renderBuildPanel() {
    const panel = elements.buildPanel;
    const run = getRun();
    const weapon = findById(Data.weapons || [], run && run.selectedWeaponId, "abyssBullet");
    const stats = AS.Game && AS.Game.getWeaponStats ? AS.Game.getWeaponStats(run) : {};
    const supports = Array.isArray(run && run.supportWeapons) ? run.supportWeapons : [];
    const relics = Array.isArray(run && run.relics) ? run.relics : [];
    const ranking = AS.Game && AS.Game.getDamageRanking ? AS.Game.getDamageRanking(run, 4) : [];

    if (!panel || !run) {
      return;
    }

    panel.classList.toggle("is-hidden", !buildPanelOpen || run.mode !== (states.running || "running"));
    if (!buildPanelOpen || run.mode !== (states.running || "running")) {
      return;
    }

    panel.innerHTML = "";
    const title = document.createElement("strong");
    const close = document.createElement("button");
    const body = document.createElement("div");
    title.className = "build-title";
    title.textContent = "빌드 현황";
    close.type = "button";
    close.className = "build-close";
    close.textContent = "×";
    close.addEventListener("click", function () {
      buildPanelOpen = false;
      lastHudSignature = "";
      if (elements.buildButton) {
        elements.buildButton.textContent = "빌드";
      }
      renderBuildPanel();
    });
    body.className = "build-list";
    body.textContent = [
      "무기: " + (weapon.name || "기본") + " · 피해 " + formatNumber(stats.damage || 0) + " · 쿨 " + safeNumber(stats.cooldown, 0).toFixed(2),
      "보조: " + (supports.map(function (item) { return item.name + " Lv." + safeInteger(item.level, 1); }).join(", ") || "없음"),
      "유물: " + (relics.map(function (item) { return item.name; }).join(", ") || "없음"),
      "진화: " + (Object.keys(run.evolutions || {}).filter(function (key) { return run.evolutions[key]; }).join(", ") || "없음"),
      "피해: " + (ranking.map(function (row) { return row.name + " " + formatNumber(row.damage); }).join(" / ") || "기록 없음"),
      "목표: 완료 " + safeInteger(run.completedObjectiveCount, 0) + " · 실패 " + safeInteger(run.failedObjectiveCount, 0)
    ].join("\n");
    panel.appendChild(title);
    panel.appendChild(close);
    panel.appendChild(body);
  }

  function renderLobbySummary(save) {
    const panel = elements.lobbySummaryPanel;
    const upgrades = save.upgrades || {};
    const missions = save.missions || {};
    const history = missions.runHistory || {};

    if (!panel) {
      return;
    }

    panel.innerHTML = "";
    appendLobbySummaryButton(panel, "◆", "심연", { name: safeInteger(save.abyss && save.abyss.selectedDepth, 0) + "단계", description: "최고 해금 " + safeInteger(save.abyss && save.abyss.maxUnlockedDepth, 0) + "단계" }, "abyss");
    appendLobbySummaryButton(panel, "⬟", "클래스", selectedSummary(Data.classes || [], save.selectedClassId, "wanderer"), "class");
    appendLobbySummaryButton(panel, "●", "무기", selectedSummary(Data.weapons || [], save.selectedWeaponId, "abyssBullet"), "weapon");
    appendLobbySummaryButton(panel, "◇", "구역", selectedSummary(Data.zones || [], save.selectedZoneId, "riftGate"), "zone");
    appendLobbySummaryButton(panel, "♛", "모드", selectedSummary(Data.runModes || [], save.selectedRunModeId, "survival"), "runMode");
    appendLobbySummaryButton(panel, "○", "도전", selectedSummary(Data.challenges || [], save.selectedChallengeId, "normal"), "challenge");
    appendLobbySummaryButton(panel, "◇", "이벤트", selectedSummary(Data.events || [], save.selectedEventId, "normal"), "event");
    appendLobbySummaryButton(panel, "★", "추천", { name: "조합 프리셋", description: "초보 안정, 빠른 성장, 고위험 보상 조합을 적용합니다." }, "preset");
    appendLobbySummaryButton(panel, "⬢", "숙련도", getMasterySummary(save), "mastery");
    appendLobbySummaryButton(panel, "◆", "성장", { name: "보유 " + safeInteger(save.shards, 0), description: "체력 " + safeInteger(upgrades.vitality, 0) + " · 공격 " + safeInteger(upgrades.power, 0) + " · 수집 " + safeInteger(upgrades.growth, 0) }, "upgrade");
    appendLobbySummaryButton(panel, "▣", "해금", getUnlockSummary(), "unlock");
    appendLobbySummaryButton(panel, "✓", "임무", { name: "이번 런 3개", description: "누적 완료 " + safeInteger(history.totalCompleted, 0) + " · 보상 " + safeInteger(history.totalReward, 0) }, "mission");
    appendLobbySummaryButton(panel, "⚙", "설정", { name: save.settings && save.settings.assistMode === "assist" ? "편의 모드" : (save.settings && save.settings.assistMode === "challenge" ? "도전 모드" : "표준 모드"), description: "난이도 보정과 표시 옵션을 조정합니다." }, "settings");
  }

  function openLobbyModal(type) {
    activeLobbyModal = type || "";
    renderLobbyModal();
  }

  function renderAbyssPanel(panel) {
    const save = getSave();
    const abyss = save.abyss || {};
    const selectedDepth = safeInteger(abyss.selectedDepth, 0);
    const maxUnlockedDepth = safeInteger(abyss.maxUnlockedDepth, 0);
    const maxDepth = safeInteger((Data.abyss || {}).maxDepth, 20);
    const list = document.createElement("div");

    list.className = "choice-list";
    panel.appendChild(list);

    for (let depth = 0; depth <= maxDepth; depth += 1) {
      const modifiers = AS.State && AS.State.getAbyssModifiers ? AS.State.getAbyssModifiers(depth) : { rewardMultiplier: 1 };
      const button = document.createElement("button");
      const icon = createIcon(depth === 0 ? "0" : "◆", "choice-icon", "abyssDepth", "endgame");
      const body = document.createElement("span");
      const name = document.createElement("strong");
      const description = document.createElement("span");
      const locked = depth > maxUnlockedDepth;

      button.type = "button";
      button.className = depth === selectedDepth ? "choice-button is-selected" : "choice-button";
      if (locked) {
        button.className += " is-locked";
      }
      button.disabled = locked;
      body.className = "choice-body";
      name.textContent = depth + "단계" + (depth === 0 ? " · 기본" : " · 보상 x" + safeNumber(modifiers.rewardMultiplier, 1).toFixed(2));
      description.textContent = locked ? "잠김: " + (depth - 1) + "단계 클리어 필요" : "적 강화와 심연 조각 보상이 함께 증가합니다.";
      body.appendChild(name);
      body.appendChild(description);
      button.appendChild(icon);
      button.appendChild(body);
      button.addEventListener("click", function () {
        if (AS.State && AS.State.setSelectedDepth) {
          AS.State.setSelectedDepth(depth);
          AS.UI.renderStartOptions();
          closeLobbyModal();
        }
      });
      list.appendChild(button);
    }
  }

  function appendMasteryRow(panel, label, item, entry) {
    const required = AS.State && AS.State.getMasteryRequiredExp ? AS.State.getMasteryRequiredExp(entry.level) : 40;
    const row = document.createElement("div");
    const body = document.createElement("span");
    const title = document.createElement("strong");
    const description = document.createElement("span");

    row.className = "choice-button";
    body.className = "choice-body";
    title.textContent = label + ": " + (item.name || "선택 없음") + " Lv." + safeInteger(entry.level, 1);
    description.textContent = safeInteger(entry.level, 1) >= 10 ? "최대 숙련도" : "경험치 " + safeInteger(entry.exp, 0) + "/" + required;
    body.appendChild(title);
    body.appendChild(description);
    row.appendChild(createIcon(item.icon, "choice-icon", item.id, "mapRoom"));
    row.appendChild(body);
    panel.appendChild(row);
  }

  function renderMasteryPanel(panel) {
    const save = getSave();
    const list = document.createElement("div");
    const classItem = findById(Data.classes, save.selectedClassId, "wanderer");
    const weaponItem = findById(Data.weapons, save.selectedWeaponId, "abyssBullet");
    const zoneItem = findById(Data.zones, save.selectedZoneId, "riftGate");

    list.className = "choice-list";
    panel.appendChild(list);
    appendMasteryRow(list, "클래스", classItem, AS.State.getMasteryEntry("classes", classItem.id));
    appendMasteryRow(list, "무기", weaponItem, AS.State.getMasteryEntry("weapons", weaponItem.id));
    appendMasteryRow(list, "구역", zoneItem, AS.State.getMasteryEntry("zones", zoneItem.id));
  }

  function renderUnlockPanel(panel) {
    const rows = AS.State && AS.State.getUnlockRows ? AS.State.getUnlockRows() : [];
    const list = document.createElement("div");

    list.className = "choice-list";
    panel.appendChild(list);

    for (let i = 0; i < rows.length; i += 1) {
      const row = document.createElement("div");
      const body = document.createElement("span");
      const title = document.createElement("strong");
      const description = document.createElement("span");

      row.className = rows[i].unlocked ? "choice-button is-selected" : "choice-button is-locked";
      body.className = "choice-body";
      title.textContent = (rows[i].unlocked ? "해금 · " : "잠김 · ") + rows[i].label + " · " + rows[i].name;
      description.textContent = rows[i].unlocked ? "사용 가능" : rows[i].condition;
      body.appendChild(title);
      body.appendChild(description);
      row.appendChild(createIcon(rows[i].unlocked ? "✓" : "◇", "choice-icon", rows[i].id, "reward"));
      row.appendChild(body);
      list.appendChild(row);
    }
  }

  function renderPresetPanel(panel) {
    const presets = Array.isArray(Data.presets) ? Data.presets : [];
    const list = document.createElement("div");

    list.className = "choice-list";
    panel.appendChild(list);

    for (let i = 0; i < presets.length; i += 1) {
      const preset = presets[i];
      const button = document.createElement("button");
      const body = document.createElement("span");
      const name = document.createElement("strong");
      const description = document.createElement("span");

      button.type = "button";
      button.className = "choice-button";
      body.className = "choice-body";
      name.textContent = preset.name;
      description.textContent = preset.description;
      body.appendChild(name);
      body.appendChild(description);
      button.appendChild(createIcon(preset.icon, "choice-icon", preset.id, "reward"));
      button.appendChild(body);
      button.addEventListener("click", function () {
        if (AS.State && AS.State.applyPreset) {
          AS.State.applyPreset(preset.id);
          closeLobbyModal();
          AS.UI.renderStartOptions();
        }
      });
      list.appendChild(button);
    }
  }

  function renderSettingsPanel(panel) {
    const save = getSave();
    const settings = save.settings || {};
    const modes = [
      { id: "normal", name: "표준", description: "기본 난이도와 보상" },
      { id: "assist", name: "편의", description: "적 약화, 보상 -10%" },
      { id: "challenge", name: "도전", description: "적 강화, 보상 +8%" }
    ];
    const list = document.createElement("div");

    list.className = "choice-list";
    panel.appendChild(list);

    for (let i = 0; i < modes.length; i += 1) {
      const mode = modes[i];
      const button = document.createElement("button");
      const body = document.createElement("span");
      const name = document.createElement("strong");
      const description = document.createElement("span");

      button.type = "button";
      button.className = mode.id === (settings.assistMode || "normal") ? "choice-button is-selected" : "choice-button";
      body.className = "choice-body";
      name.textContent = mode.name + " 모드";
      description.textContent = mode.description;
      body.appendChild(name);
      body.appendChild(description);
      button.appendChild(createIcon(mode.id === "assist" ? "✚" : (mode.id === "challenge" ? "◆" : "○"), "choice-icon", mode.id, "challenge"));
      button.appendChild(body);
      button.addEventListener("click", function () {
        if (AS.State && AS.State.setSetting) {
          AS.State.setSetting("assistMode", mode.id);
          AS.UI.renderStartOptions();
        }
      });
      list.appendChild(button);
    }

    [
      { key: "soundEnabled", icon: "♪", name: "효과음", description: "공격, 피격, 보스와 결과 효과음" },
      { key: "vibrationEnabled", icon: "≋", name: "진동", description: "모바일 피격과 중요 이벤트 진동" },
      { key: "screenShakeEnabled", icon: "↯", name: "화면 흔들림", description: "강한 충돌과 보스 연출의 흔들림" },
      { key: "reducedEffects", icon: "◌", name: "효과 줄이기", description: "화면 흔들림 등 강한 연출 최소화", inverted: true },
      { key: "showDamageNumbers", icon: "123", name: "피해 숫자", description: "적에게 준 피해량을 화면에 표시" }
    ].forEach(function (option) {
      const button = document.createElement("button");
      const body = document.createElement("span");
      const name = document.createElement("strong");
      const description = document.createElement("span");
      const rawValue = settings[option.key];
      const enabled = option.inverted ? !!rawValue : rawValue !== false;

      button.type = "button";
      button.className = "choice-button" + (enabled ? " is-selected" : "");
      button.setAttribute("aria-pressed", enabled ? "true" : "false");
      body.className = "choice-body";
      name.textContent = option.name + " · " + (enabled ? "켜짐" : "꺼짐");
      description.textContent = option.description;
      body.appendChild(name);
      body.appendChild(description);
      button.appendChild(createIcon(option.icon, "choice-icon", option.key, "settings"));
      button.appendChild(body);
      button.addEventListener("click", function () {
        if (AS.State && AS.State.setSetting) {
          AS.State.setSetting(option.key, option.inverted ? !rawValue : rawValue === false);
          renderLobbyModal();
        }
      });
      list.appendChild(button);
    });
  }

  function renderLobbyModal() {
    const save = getSave();
    const body = elements.lobbyModalBody;
    let title = "";

    if (!elements.lobbyModal || !body || !activeLobbyModal) {
      return;
    }

    elements.lobbyModal.classList.remove("is-hidden");
    body.innerHTML = "";

    if (activeLobbyModal === "abyss") {
      title = "심연 단계 선택";
      renderAbyssPanel(body);
    } else if (activeLobbyModal === "class") {
      title = "클래스 선택";
      renderSelectionPanel(body, "", Data.classes || [], save.selectedClassId || "wanderer", function (id) {
        if (AS.State && AS.State.setSelectedClass) {
          AS.State.setSelectedClass(id);
        }
        closeLobbyModal();
      }, "class");
    } else if (activeLobbyModal === "weapon") {
      title = "시작 무기 선택";
      renderSelectionPanel(body, "", Data.weapons || [], save.selectedWeaponId || "abyssBullet", function (id) {
        if (AS.State && AS.State.setSelectedWeapon) {
          AS.State.setSelectedWeapon(id);
        }
        closeLobbyModal();
      }, "weapon");
    } else if (activeLobbyModal === "zone") {
      title = "구역 선택";
      renderSelectionPanel(body, "", Data.zones || [], save.selectedZoneId || "riftGate", function (id) {
        if (AS.State && AS.State.setSelectedZone) {
          AS.State.setSelectedZone(id);
        }
        closeLobbyModal();
      }, "zone");
    } else if (activeLobbyModal === "challenge") {
      title = "도전 선택";
      renderSelectionPanel(body, "", Data.challenges || [], save.selectedChallengeId || "normal", function (id) {
        if (AS.State && AS.State.setSelectedChallenge) {
          AS.State.setSelectedChallenge(id);
        }
        closeLobbyModal();
      });
    } else if (activeLobbyModal === "runMode") {
      title = "런 모드 선택";
      renderSelectionPanel(body, "", Data.runModes || [], save.selectedRunModeId || "survival", function (id) {
        if (AS.State && AS.State.setSelectedRunMode) {
          AS.State.setSelectedRunMode(id);
        }
        closeLobbyModal();
      }, "runMode");
    } else if (activeLobbyModal === "event") {
      title = "이벤트 런 선택";
      renderSelectionPanel(body, "", Data.events || [], save.selectedEventId || "normal", function (id) {
        if (AS.State && AS.State.setSelectedEvent) {
          AS.State.setSelectedEvent(id);
        }
        closeLobbyModal();
      }, "event");
    } else if (activeLobbyModal === "preset") {
      title = "추천 조합";
      renderPresetPanel(body);
    } else if (activeLobbyModal === "mastery") {
      title = "숙련도";
      renderMasteryPanel(body);
    } else if (activeLobbyModal === "upgrade") {
      title = "영구 성장";
      renderUpgradePanel(body);
    } else if (activeLobbyModal === "unlock") {
      title = "해금 진행";
      renderUnlockPanel(body);
    } else if (activeLobbyModal === "mission") {
      title = "임무";
      renderMissionPanel(body);
    } else if (activeLobbyModal === "settings") {
      title = "설정";
      renderSettingsPanel(body);
    }

    setText(elements.lobbyModalTitle, title);
  }

  function renderUpgradePanel(targetPanel) {
    const save = getSave();
    const panel = targetPanel || elements.upgradePanel;
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
      const locked = item.advanced && AS.State && AS.State.isFeatureUnlocked ? !AS.State.isFeatureUnlocked(item.unlockFeature || "advancedUpgrades") : false;
      const button = document.createElement("button");
      const icon = createIcon(item.icon, "choice-icon", item.id, "upgrade");
      const body = document.createElement("span");
      const name = document.createElement("strong");
      const badge = createRarityBadge(item, "upgrade");
      const description = document.createElement("span");

      button.className = "choice-button";
      button.type = "button";
      applyRarityStyle(button, item, "upgrade");
      applyRarityStyle(icon, item, "upgrade");
      if (locked) {
        button.className += " is-locked";
      }
      button.disabled = locked || level >= item.maxLevel || safeInteger(save.shards, 0) < cost;
      body.className = "choice-body";
      name.textContent = (item.advanced ? "고급 · " : "") + item.name + " Lv." + level;
      description.textContent = locked && AS.State && AS.State.getUnlockMessage ? "잠김: " + AS.State.getUnlockMessage("features", item.unlockFeature || "advancedUpgrades") : "◆ " + cost + " · 최대 " + item.maxLevel;
      body.appendChild(name);
      body.appendChild(badge);
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

  function renderMissionPanel(targetPanel) {
    const save = getSave();
    const run = getRun();
    const panel = targetPanel || elements.missionPanel;
    const missions = AS.State && AS.State.getRunMissions ? AS.State.getRunMissions(run) : (run.runMissions || []);
    const history = save.missions && save.missions.runHistory ? save.missions.runHistory : {};
    let completedCount = 0;

    if (!panel) {
      return;
    }

    for (let i = 0; i < missions.length; i += 1) {
      if (missions[i].completed) {
        completedCount += 1;
      }
    }

    panel.innerHTML = "";
    const heading = document.createElement("strong");
    const summary = document.createElement("span");
    const list = document.createElement("div");
    heading.className = "panel-title";
    heading.textContent = "임무";
    summary.className = "shard-count";
    summary.textContent = "완료 " + completedCount + "/" + missions.length;
    list.className = "choice-list";
    panel.appendChild(heading);
    panel.appendChild(summary);
    panel.appendChild(list);
    heading.textContent = "이번 런 임무";
    summary.textContent = completedCount + "/" + missions.length + " · 누적 " + safeInteger(history.totalCompleted, 0);

    if (!missions.length) {
      const empty = document.createElement("div");
      empty.className = "choice-button";
      empty.textContent = "런 시작 시 임무 3개가 생성됩니다.";
      list.appendChild(empty);
      return;
    }

    for (let i = 0; i < missions.length; i += 1) {
      const mission = missions[i];
      const row = document.createElement("div");
      const icon = createIcon(mission.completed ? "✓" : "◇", "choice-icon", mission.id, "reward");
      const body = document.createElement("span");
      const name = document.createElement("strong");
      const description = document.createElement("span");
      row.className = mission.completed ? "choice-button is-selected" : "choice-button";
      applyRarityStyle(row, mission, "mission");
      applyRarityStyle(icon, mission, "mission");
      body.className = "choice-body";
      name.textContent = mission.name + " +" + safeInteger(mission.reward, 0);
      description.textContent = mission.completed ? "완료" : ("진행 " + safeInteger(mission.progress, 0) + "/" + safeInteger(mission.target, 1));
      body.appendChild(name);
      body.appendChild(description);
      row.appendChild(icon);
      row.appendChild(body);
      list.appendChild(row);
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

    if (!Number.isFinite(length) || length < pointerDeadZone) {
      run.input.moveX = 0;
      run.input.moveY = 0;
      return;
    }

    const normalized = clamp((length - pointerDeadZone) / Math.max(1, pointerMaxDistance - pointerDeadZone), 0, 1);
    const power = clamp(0.28 + normalized * 0.72, 0, 1);
    run.input.moveX = clamp((dx / length) * power, -1, 1);
    run.input.moveY = clamp((dy / length) * power, -1, 1);
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

    lastOverlaySignature = "";
    lastHudSignature = "";
    buildPanelOpen = false;
    if (AS.Feedback && AS.Feedback.unlock) {
      AS.Feedback.unlock();
    }
    const run = AS.State.startRun();
    if (AS.Feedback && AS.Feedback.emit) {
      AS.Feedback.emit("start", run);
    }
    AS.UI.hideOverlay();
  }

  function restartGame() {
    startGame();
  }

  function returnToLobby() {
    clearAllInput();
    if (AS.State && AS.State.resetRun) {
      AS.State.resetRun();
    }
    lastOverlaySignature = "";
    lastHudSignature = "";
    buildPanelOpen = false;
    if (AS.UI && AS.UI.renderStartOptions) {
      AS.UI.renderStartOptions();
    }
    if (AS.UI && AS.UI.showOverlay) {
      AS.UI.showOverlay();
    }
    if (AS.UI && AS.UI.updateHud) {
      AS.UI.updateHud(getRun());
    }
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

    canvas.addEventListener("pointerleave", function (event) {
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
        mapChoicePanel: findElement("mapChoicePanel"),
        gameOverPanel: findElement("gameOverPanel"),
        clearPanel: findElement("clearPanel"),
        abilityList: findElement("abilityList"),
        startButton: findElement("startButton"),
        retryButton: findElement("retryButton"),
        gameOverLobbyButton: findElement("gameOverLobbyButton"),
        clearRetryButton: findElement("clearRetryButton"),
        clearLobbyButton: findElement("clearLobbyButton"),
        gameOverTime: findElement("gameOverTimeText"),
        gameOverKills: findElement("gameOverKillText"),
        clearTime: findElement("clearTimeText"),
        clearKills: findElement("clearKillText"),
        clearLevel: findElement("clearLevelText")
      };

      elements.classPanel = ensurePanel("classPanel", "setup-panel");
      elements.weaponPanel = ensurePanel("weaponPanel", "setup-panel");
      elements.zonePanel = ensurePanel("zonePanel", "setup-panel");
      elements.challengePanel = ensurePanel("challengePanel", "setup-panel");
      elements.upgradePanel = ensurePanel("upgradePanel", "setup-panel");
      elements.missionPanel = ensurePanel("missionPanel", "setup-panel");
      if (!elements.mapChoicePanel && elements.overlay) {
        elements.mapChoicePanel = document.createElement("div");
        elements.mapChoicePanel.id = "mapChoicePanel";
        elements.mapChoicePanel.className = "overlay-panel is-hidden";
        elements.overlay.appendChild(elements.mapChoicePanel);
      }
      if (elements.mapChoicePanel && !document.getElementById("mapChoiceList")) {
        const title = document.createElement("h2");
        const description = document.createElement("p");
        const list = document.createElement("div");
        title.textContent = "다음 심연 경로 선택";
        description.textContent = "다음 구간의 위험도와 보상을 선택하세요.";
        list.id = "mapChoiceList";
        list.className = "ability-list";
        elements.mapChoicePanel.appendChild(title);
        elements.mapChoicePanel.appendChild(description);
        elements.mapChoicePanel.appendChild(list);
      }
      elements.mapChoiceList = findElement("mapChoiceList");
      elements.lobbySummaryPanel = ensurePanel("lobbySummaryPanel", "lobby-summary");
      elements.missionHud = ensureGamePanel("missionHud", "mission-hud");
      elements.buildPanel = ensureGamePanel("buildPanel", "build-panel is-hidden");
      elements.buildButton = ensureControlButton("buildButton", "빌드");
      ensureLobbyModal();
      elements.pauseRestartButton = ensurePanelButton(elements.startPanel, "pauseRestartButton", "재시작", "secondary-button");
      elements.pauseLobbyButton = ensurePanelButton(elements.startPanel, "pauseLobbyButton", "로비로", "secondary-button");
      elements.gameOverLobbyButton = elements.gameOverLobbyButton || ensurePanelButton(elements.gameOverPanel, "gameOverLobbyButton", "로비로", "secondary-button");
      elements.clearLobbyButton = elements.clearLobbyButton || ensurePanelButton(elements.clearPanel, "clearLobbyButton", "로비로", "secondary-button");
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
      const timeValue = formatTime(run ? run.remainingTime : safeNumber((Data.game || {}).runDuration, 300));
      const killValue = Math.max(0, Math.floor(safeNumber(run && run.kills, 0)));
      const modeValue = run && run.mode ? run.mode : "";
      const missionText = run && run.mode === (states.running || "running") ? getMissionHudText(run) : "";
      const hudSignature = [hp, maxHp, exp, expToNext, timeValue, killValue, modeValue, missionText, buildPanelOpen].join("|");

      if (hudSignature === lastHudSignature) {
        return;
      }

      lastHudSignature = hudSignature;

      setText(elements.health, "♥ " + hp + "/" + maxHp);
      setText(elements.level, "Lv " + String(Math.max(1, Math.floor(safeNumber(run && run.level, 1)))));
      setText(elements.expText, "◆ " + exp + "/" + expToNext);
      setText(elements.time, timeValue);
      setText(elements.kills, "☠ " + String(killValue));

      if (elements.expFill) {
        elements.expFill.style.width = expRatio + "%";
      }

      if (elements.pauseButton) {
        elements.pauseButton.textContent = run && run.mode === (states.paused || "paused") ? "▶" : "Ⅱ";
        elements.pauseButton.setAttribute("aria-label", run && run.mode === (states.paused || "paused") ? "계속하기" : "일시정지");
      }

      if (elements.restartButton) {
        const isRunning = run && run.mode === (states.running || "running");
        elements.restartButton.style.display = isRunning ? "none" : "";
        if (elements.restartButton.parentElement) {
          elements.restartButton.parentElement.classList.toggle("is-single", false);
        }
      }

      if (elements.buildButton) {
        const isRunning = run && run.mode === (states.running || "running");
        elements.buildButton.style.display = isRunning ? "" : "none";
        elements.buildButton.textContent = buildPanelOpen ? "닫기" : "빌드";
      }

      if (elements.missionHud) {
        elements.missionHud.textContent = missionText;
        elements.missionHud.classList.toggle("is-hidden", !missionText);
      }

      renderBuildPanel();
    },

    showOverlay: function () {
      const run = getRun();
      const mode = run ? run.mode : (states.title || "title");
      const visible = mode !== (states.running || "running");

      if (elements.overlay) {
        elements.overlay.classList.toggle("is-visible", visible);
      }

      const overlaySignature = [
        mode,
        run && run.pendingAbilities ? run.pendingAbilities.map(function (item) { return item.id; }).join(",") : "",
        run && run.mapRoomChoices ? run.mapRoomChoices.map(function (item) { return item.id; }).join(",") : "",
        run ? Math.floor(safeNumber(run.time, 0)) : 0,
        run ? safeInteger(run.kills, 0) : 0,
        run ? safeInteger(run.level, 1) : 1,
        run ? safeInteger(run.shardReward, 0) : 0,
        run ? safeInteger(run.missionShardReward, 0) : 0,
        run && run.completedMissionIds ? run.completedMissionIds.join(",") : ""
      ].join("|");

      if (overlaySignature === lastOverlaySignature) {
        return;
      }

      lastOverlaySignature = overlaySignature;

      if (mode !== (states.running || "running")) {
        clearAllInput();
      }

      setPanelVisible(elements.startPanel, mode === (states.title || "title") || mode === (states.paused || "paused"));
      if (AS.PWA && AS.PWA.setLobbyVisible) {
        AS.PWA.setLobbyVisible(mode === (states.title || "title"));
      }
      setPanelVisible(elements.levelUpPanel, mode === (states.levelup || "levelup"));
      setPanelVisible(elements.mapChoicePanel, mode === (states.mapChoice || "mapChoice"));
      setPanelVisible(elements.gameOverPanel, mode === (states.gameover || "gameover"));
      setPanelVisible(elements.clearPanel, mode === (states.clear || "clear"));

      if (mode === (states.running || "running")) {
        return;
      }

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
        setElementVisible(elements.pauseRestartButton, true);
        setElementVisible(elements.pauseLobbyButton, true);
      } else if (elements.startPanel) {
        setSetupVisible(mode === (states.title || "title"));
        const title = elements.startPanel.querySelector("h1");
        const message = elements.startPanel.querySelector("p");
        if (title) {
          title.textContent = "Abyss Survivor";
        }
        if (message) {
          message.textContent = "5분 생존 · 보스 처치 후 최종 심연 폭주";
        }
        if (elements.startButton) {
          elements.startButton.textContent = "▶ 시작";
        }
        setElementVisible(elements.pauseRestartButton, false);
        setElementVisible(elements.pauseLobbyButton, false);
        this.renderStartOptions();
      }

      if (mode === (states.levelup || "levelup")) {
        this.showLevelUp(run.pendingAbilities || []);
      } else if (mode === (states.mapChoice || "mapChoice")) {
        this.showMapChoice(run.mapRoomChoices || []);
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
      lastOverlaySignature = "";
    },

    openLobbyModal: function (type) {
      openLobbyModal(type);
    },

    closeLobbyModal: function () {
      closeLobbyModal();
    },

    getPointerTuning: function () {
      return {
        deadZone: pointerDeadZone,
        maxDistance: pointerMaxDistance,
        minPower: 0.28
      };
    },

    showLevelUp: function (abilities) {
      const run = getRun();
      const signature = abilities.map(function (ability) {
        return ability.id;
      }).join("|") + "|" + safeInteger(run && run.rerollsRemaining, 0) + "|" + safeInteger(run && run.excludesRemaining, 0) + "|" + JSON.stringify(run && run.pinnedAbilityIds ? run.pinnedAbilityIds : {});

      if (!elements.abilityList) {
        return;
      }

      if (signature === lastAbilitySignature) {
        return;
      }

      lastAbilitySignature = signature;
      elements.abilityList.innerHTML = "";

      const controls = document.createElement("div");
      const reroll = document.createElement("button");
      const controlText = document.createElement("span");
      controls.className = "choice-tools choice-tools-top";
      reroll.type = "button";
      reroll.className = "mini-tool-button";
      reroll.textContent = "리롤 " + safeInteger(run && run.rerollsRemaining, 0);
      reroll.disabled = !run || safeInteger(run.rerollsRemaining, 0) <= 0;
      controlText.className = "choice-help";
      controlText.textContent = "고정은 리롤 때 유지, 제외는 이번 런 선택지에서 제거";
      reroll.addEventListener("click", function () {
        if (AS.Game && AS.Game.rerollAbilityChoices) {
          AS.Game.rerollAbilityChoices();
          lastAbilitySignature = "";
          lastOverlaySignature = "";
          AS.UI.showOverlay();
        }
      });
      controls.appendChild(reroll);
      controls.appendChild(controlText);
      elements.abilityList.appendChild(controls);

      for (let i = 0; i < abilities.length; i += 1) {
        const ability = abilities[i];
        const card = document.createElement("div");
        const button = document.createElement("button");
        const icon = createIcon(ability.icon, "ability-icon", ability.supportId || ability.id, ability.category);
        const body = document.createElement("span");
        const tag = document.createElement("em");
        const name = document.createElement("strong");
        const description = document.createElement("span");
        const insight = document.createElement("span");
        const tools = document.createElement("div");
        const pin = document.createElement("button");
        const exclude = document.createElement("button");
        const category = ability.category || "normal";
        const rarity = rarityForItem(ability, category);
        const meta = rarityMeta(rarity);
        const currentLevel = safeInteger(run && run.abilityLevels && run.abilityLevels[ability.id], 0);
        const categoryLabel = category === "evolution" ? "진화" : (category === "relic" ? "유물" : (category === "support" ? "보조무기" : (category === "supportUpgrade" ? "보조강화" : (currentLevel > 0 ? "강화" : "신규"))));

        card.className = "ability-card";
        button.className = category === "evolution" ? "ability-button is-evolution" : (category === "relic" ? "ability-button is-relic" : "ability-button");
        button.type = "button";
        button.dataset.abilityId = ability.id;
        button.classList.add(currentLevel > 0 ? "is-upgrade" : "is-new");
        applyRarityStyle(button, ability, category);
        applyRarityStyle(icon, ability, category);
        body.className = "ability-body";
        tag.className = "ability-tag";
        applyRarityStyle(tag, rarity);
        tag.textContent = categoryLabel + " · " + (meta.label || "일반");
        name.textContent = ability.name;
        description.textContent = shortenDescription(ability.description);
        insight.className = "ability-insight";
        insight.textContent = getAbilityInsight(ability, run);
        body.appendChild(tag);
        body.appendChild(name);
        body.appendChild(description);
        if (insight.textContent) {
          body.appendChild(insight);
        }
        button.appendChild(icon);
        button.appendChild(body);
        button.addEventListener("click", function () {
          if (AS.Game && AS.Game.applyAbility) {
            AS.Game.applyAbility(ability.id);
          }
        });
        tools.className = "choice-tools";
        pin.type = "button";
        pin.className = run && run.pinnedAbilityIds && run.pinnedAbilityIds[ability.id] ? "mini-tool-button is-active" : "mini-tool-button";
        pin.textContent = "고정";
        pin.addEventListener("click", function () {
          if (AS.Game && AS.Game.togglePinnedChoice) {
            AS.Game.togglePinnedChoice(ability.id);
            lastAbilitySignature = "";
            lastOverlaySignature = "";
            AS.UI.showOverlay();
          }
        });
        exclude.type = "button";
        exclude.className = "mini-tool-button";
        exclude.textContent = "제외 " + safeInteger(run && run.excludesRemaining, 0);
        exclude.disabled = !run || safeInteger(run.excludesRemaining, 0) <= 0;
        exclude.addEventListener("click", function () {
          if (AS.Game && AS.Game.excludeAbilityChoice) {
            AS.Game.excludeAbilityChoice(ability.id);
            lastAbilitySignature = "";
            lastOverlaySignature = "";
            AS.UI.showOverlay();
          }
        });
        tools.appendChild(pin);
        tools.appendChild(exclude);
        card.appendChild(button);
        card.appendChild(tools);
        elements.abilityList.appendChild(card);
      }
    },

    showMapChoice: function (rooms) {
      const list = elements.mapChoiceList || findElement("mapChoiceList");
      const signature = rooms.map(function (room) {
        return room.id;
      }).join("|");

      if (!list || signature === lastAbilitySignature) {
        return;
      }

      lastAbilitySignature = signature;
      list.innerHTML = "";

      for (let i = 0; i < rooms.length; i += 1) {
        const room = rooms[i];
        const button = document.createElement("button");
        const icon = createIcon(room.icon, "ability-icon", room.id, "mapRoom");
        const body = document.createElement("span");
        const tag = document.createElement("em");
        const name = document.createElement("strong");
        const description = document.createElement("span");

        button.className = "ability-button";
        button.type = "button";
        button.dataset.roomId = room.id;
        applyRarityStyle(button, room, "mapRoom");
        applyRarityStyle(icon, room, "mapRoom");
        body.className = "ability-body";
        tag.className = "ability-tag";
        applyRarityStyle(tag, room, "mapRoom");
        tag.textContent = "위험도 " + safeInteger(room.risk, 0) + " · 보상 x" + safeNumber(room.rewardMultiplier, 1).toFixed(2);
        name.textContent = room.name || "전투방";
        description.textContent = shortenDescription(room.description || "다음 구간을 선택합니다.");
        body.appendChild(tag);
        body.appendChild(name);
        body.appendChild(description);
        button.appendChild(icon);
        button.appendChild(body);
        button.addEventListener("click", function () {
          if (AS.Game && AS.Game.applyMapRoom) {
            AS.Game.applyMapRoom(room.id);
          }
        });
        list.appendChild(button);
      }
    },

    renderStartOptions: function () {
      const save = getSave();
      const signature = [
        save.selectedClassId,
        save.selectedWeaponId,
        save.selectedZoneId,
        save.selectedChallengeId,
        save.selectedRunModeId,
        save.selectedEventId,
        safeInteger(save.abyss && save.abyss.selectedDepth, 0),
        safeInteger(save.abyss && save.abyss.maxUnlockedDepth, 0),
        safeInteger(save.shards, 0),
        safeInteger(save.upgrades && save.upgrades.vitality, 0),
        safeInteger(save.upgrades && save.upgrades.power, 0),
        safeInteger(save.upgrades && save.upgrades.growth, 0),
        safeInteger(save.upgrades && save.upgrades.masteryTraining, 0),
        safeInteger(save.upgrades && save.upgrades.combatSense, 0),
        safeInteger(save.upgrades && save.upgrades.abyssAdaptation, 0),
        safeInteger(save.upgrades && save.upgrades.choiceControl, 0),
        save.settings && save.settings.assistMode,
        JSON.stringify(save.mastery || {}),
        JSON.stringify(save.unlocks || {}),
        JSON.stringify(save.missions || {})
      ].join("|");

      if (signature === lastSetupSignature) {
        return;
      }

      lastSetupSignature = signature;

      renderLobbySummary(save);
      setElementVisible(elements.classPanel, false);
      setElementVisible(elements.weaponPanel, false);
      setElementVisible(elements.zonePanel, false);
      setElementVisible(elements.challengePanel, false);
      setElementVisible(elements.upgradePanel, false);
      setElementVisible(elements.missionPanel, false);
      renderLobbyModal();
    },

    updateResultMeta: function (target, run) {
      const save = getSave();
      const classItem = findById(Data.classes, run.selectedClassId || save.selectedClassId, "wanderer");
      const zoneItem = findById(Data.zones, run.selectedZoneId || save.selectedZoneId, "riftGate");
      const challengeItem = findById(Data.challenges, run.selectedChallengeId || save.selectedChallengeId, "normal");
      const runModeItem = findById(Data.runModes, run.selectedRunModeId || save.selectedRunModeId, "survival");
      const eventItem = findById(Data.events, run.selectedEventId || save.selectedEventId, "normal");
      const weaponItem = findById(Data.weapons, run.selectedWeaponId || save.selectedWeaponId, "abyssBullet");
      const classIcon = safeIcon(classItem.icon, classItem.id, "class");
      const weaponIcon = safeIcon(weaponItem.icon, weaponItem.id, "weapon");
      const zoneIcon = safeIcon(zoneItem.icon, zoneItem.id, "zone");
      const modeIcon = safeIcon(runModeItem.icon, runModeItem.id, "runMode");
      const challengeIcon = safeIcon(challengeItem.icon, challengeItem.id, "challenge");
      const eventIcon = safeIcon(eventItem.icon, eventItem.id, "event");
      const runMissions = run.runMissions || [];
      const missionText = runMissions.map(function (mission) {
        return (mission.completed ? "완료 " : "미완료 ") + mission.name + (mission.completed ? " +" + safeInteger(mission.reward, 0) : "");
      }).join(" / ") || "없음";
      const relics = (run.relics || []).map(function (relic) {
        return relic.name;
      }).join(", ") || "없음";
      const bonuses = (run.buildBonuses || []).map(function (bonus) {
        return bonus.name;
      }).join(", ") || "없음";
      const unlocks = (run.newlyUnlocked || []).map(function (item) {
        return item.name;
      }).join(", ") || "없음";
      const resultText = run.mode === (states.clear || "clear") ? "런 클리어" : "게임 오버";

      setText(target, [
        resultText + " · ⏱ " + formatTime(run.time) + " · ☠ " + safeInteger(run.kills, 0) + " · Lv " + safeInteger(run.level, 1),
        classIcon + " " + classItem.name + " / " + weaponIcon + " " + weaponItem.name + " / " + zoneIcon + " " + zoneItem.name + " / " + modeIcon + " " + (runModeItem.name || "생존") + " / " + challengeIcon + " " + challengeItem.name + " / " + eventIcon + " " + (eventItem.name || "일반") + " / ✹ 심연 " + safeInteger(run.selectedDepth, 0) + " x" + safeNumber(run.rewardMultiplier, 1).toFixed(2),
        "◈ +" + safeInteger(run.shardReward, 0) + " · 임무 +" + safeInteger(run.missionShardReward, 0) + " · 보유 " + safeInteger(save.shards, 0),
        (run.selectedRunModeId === "bossRush" ? "♛ 보스 러시: " + safeInteger(run.bossRushDefeated, 0) + "/" + safeInteger(run.bossRushBossCount, 0) : "⏱ 5분 생존: " + (run.mode === (states.clear || "clear") ? "성공" : "실패")) + " · ☠ 보스 처치: " + (run.bossDefeated ? "성공" : "미달성"),
        "◈ 임무: " + missionText,
        "◆ 숙련도 +" + safeInteger(run.masteryExpGained, 0) + (run.depthUnlocked ? " · ✹ 다음 심연 단계 해금" : ""),
        "◈ 신규 해금: " + unlocks,
        formatEndgameRecord(run, save),
        formatPathHistory(run),
        "◎ 봉화 목표: 완료 " + safeInteger(run.completedObjectiveCount, 0) + " / 실패 " + safeInteger(run.failedObjectiveCount, 0) + " · 목표 보상 x" + safeNumber(run.objectiveRewardMultiplier, 1).toFixed(2),
        formatDamageRanking(run),
        "◆ 엘리트 처치: " + safeInteger(run.eliteKills, 0),
        "◆ 유물: " + relics,
        "✦ 빌드: " + bonuses
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
      bindButton(elements.pauseRestartButton, restartGame);
      bindButton(elements.buildButton, function () {
        buildPanelOpen = !buildPanelOpen;
        lastHudSignature = "";
        elements.buildButton.textContent = buildPanelOpen ? "닫기" : "빌드";
        renderBuildPanel();
      });
      bindButton(elements.pauseLobbyButton, returnToLobby);
      bindButton(elements.retryButton, restartGame);
      bindButton(elements.gameOverLobbyButton, returnToLobby);
      bindButton(elements.clearRetryButton, restartGame);
      bindButton(elements.clearLobbyButton, returnToLobby);
      bindInput();
    }
  };
})();
