(function () {
  window.AbyssSurvivor = window.AbyssSurvivor || {};
  const AS = window.AbyssSurvivor;
  const Data = AS.Data || {};
  let canvas = null;
  let ctx = null;
  let canvasPixelRatio = 1;

  function safeNumber(value, fallback) {
    const numberValue = Number(value);
    const safeFallback = Number.isFinite(Number(fallback)) ? Number(fallback) : 0;
    return Number.isFinite(numberValue) ? numberValue : safeFallback;
  }

  function getCanvasPixelRatio() {
    const game = Data.game || {};
    const devicePixelRatio = safeNumber(window.devicePixelRatio, 1);
    const maxPixelRatio = Math.max(1, safeNumber(game.maxCanvasPixelRatio, 2));

    return Math.max(1, Math.min(devicePixelRatio, maxPixelRatio));
  }

  function resizeCanvasBuffer(force) {
    const game = Data.game || {};
    const logicalWidth = Math.max(1, safeNumber(game.width, 360));
    const logicalHeight = Math.max(1, safeNumber(game.height, 560));
    const nextPixelRatio = getCanvasPixelRatio();
    const bufferWidth = Math.max(1, Math.round(logicalWidth * nextPixelRatio));
    const bufferHeight = Math.max(1, Math.round(logicalHeight * nextPixelRatio));

    if (!canvas || !ctx) {
      return false;
    }

    if (force || canvas.width !== bufferWidth || canvas.height !== bufferHeight || canvasPixelRatio !== nextPixelRatio) {
      canvas.width = bufferWidth;
      canvas.height = bufferHeight;
      canvasPixelRatio = nextPixelRatio;
      ctx.setTransform(canvasPixelRatio, 0, 0, canvasPixelRatio, 0, 0);
      return true;
    }

    return false;
  }

  function drawCircle(x, y, radius, color) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function colorWithAlpha(color, alpha) {
    const safeAlpha = Math.max(0, Math.min(1, safeNumber(alpha, 1)));

    if (typeof color === "string" && color.indexOf("#") === 0 && color.length === 7) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return "rgba(" + r + ", " + g + ", " + b + ", " + safeAlpha + ")";
    }
    if (typeof color === "string" && color.indexOf("rgb(") === 0) {
      return color.replace("rgb(", "rgba(").replace(")", ", " + safeAlpha + ")");
    }
    return color || "rgba(255, 255, 255, " + safeAlpha + ")";
  }

  function getZonePalette(run) {
    const zoneId = run && run.selectedZoneId ? run.selectedZoneId : "riftGate";

    if (zoneId === "swampEdge") {
      return { base: "#08140f", grid: "rgba(131, 224, 138, 0.09)", glow: "rgba(184, 221, 90, 0.08)", accent: "rgba(73, 224, 184, 0.08)" };
    }
    if (zoneId === "abyssCore") {
      return { base: "#100912", grid: "rgba(199, 111, 255, 0.09)", glow: "rgba(255, 93, 93, 0.08)", accent: "rgba(143, 216, 255, 0.06)" };
    }
    if (zoneId === "brokenSanctum") {
      return { base: "#11100b", grid: "rgba(255, 203, 116, 0.09)", glow: "rgba(208, 170, 104, 0.1)", accent: "rgba(255, 93, 93, 0.06)" };
    }
    if (zoneId === "deadCorridor") {
      return { base: "#07130f", grid: "rgba(99, 201, 145, 0.09)", glow: "rgba(80, 255, 170, 0.08)", accent: "rgba(150, 120, 110, 0.07)" };
    }
    if (zoneId === "stormRift") {
      return { base: "#090d18", grid: "rgba(143, 216, 255, 0.1)", glow: "rgba(165, 110, 255, 0.09)", accent: "rgba(255, 226, 138, 0.06)" };
    }
    if (zoneId === "abyssThrone") {
      return { base: "#0d0815", grid: "rgba(190, 120, 255, 0.1)", glow: "rgba(159, 108, 255, 0.1)", accent: "rgba(255, 216, 120, 0.06)" };
    }

    return { base: "#071019", grid: "rgba(126, 204, 222, 0.08)", glow: "rgba(73, 224, 184, 0.07)", accent: "rgba(213, 239, 115, 0.05)" };
  }

  function getCamera(run) {
    const game = Data.game || {};
    const width = safeNumber(game.width, 360);
    const height = safeNumber(game.height, 560);
    const camera = run && run.camera ? run.camera : {};

    return {
      x: safeNumber(camera.x, 0),
      y: safeNumber(camera.y, 0),
      width: safeNumber(camera.width, width),
      height: safeNumber(camera.height, height)
    };
  }

  function drawPolygon(x, y, radius, sides, rotation, fillColor, strokeColor, lineWidth) {
    const count = Math.max(3, Math.floor(safeNumber(sides, 3)));

    ctx.beginPath();
    for (let i = 0; i < count; i += 1) {
      const angle = safeNumber(rotation, 0) + Math.PI * 2 * i / count;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = Math.max(1, safeNumber(lineWidth, 1));
      ctx.stroke();
    }
  }

  function getScreenShake(run) {
    const timer = Math.max(0, safeNumber(run && run.screenShakeTimer, 0));
    const duration = Math.max(0.001, safeNumber(run && run.screenShakeDuration, timer));
    const power = Math.max(0, safeNumber(run && run.screenShakePower, 0)) * Math.min(1, timer / duration);

    if (power <= 0) {
      return { x: 0, y: 0 };
    }
    return {
      x: (Math.random() * 2 - 1) * power,
      y: (Math.random() * 2 - 1) * power
    };
  }

  function drawBackground(run) {
    const game = Data.game || {};
    const width = safeNumber(game.width, 360);
    const height = safeNumber(game.height, 560);
    const camera = getCamera(run);
    const world = run && run.world ? run.world : {};
    const worldCenterX = safeNumber(world.width, width) / 2 - camera.x;
    const worldCenterY = safeNumber(world.height, height) / 2 - camera.y;
    const palette = getZonePalette(run);
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    const gridSize = 24;
    let startX;
    let startY;

    ctx.clearRect(0, 0, width, height);
    gradient.addColorStop(0, palette.base);
    gradient.addColorStop(0.55, "#09131d");
    gradient.addColorStop(1, "#05080d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = palette.glow;
    ctx.beginPath();
    ctx.arc(worldCenterX, worldCenterY, 150, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.arc(80 - (camera.x * 0.08) % width, 110 - (camera.y * 0.08) % height, 92, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    startX = -(((camera.x % gridSize) + gridSize) % gridSize);
    for (let x = startX; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    startY = -(((camera.y % gridSize) + gridSize) % gridSize);
    for (let y = startY; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(worldCenterX, worldCenterY, 210, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawGems(run) {
    for (let i = 0; i < run.gems.length; i += 1) {
      const gem = run.gems[i];
      const exp = safeNumber(gem.exp, 0);
      drawCircle(gem.x, gem.y, safeNumber(gem.radius, 5), exp >= 18 ? "#d5ef73" : (exp >= 8 ? "#77f0c2" : "#8fd8ff"));
    }
  }

  function drawProjectiles(run) {
    const projectileData = Data.projectile || {};

    for (let i = 0; i < run.projectiles.length; i += 1) {
      const projectile = run.projectiles[i];
      const radius = safeNumber(projectile.radius, 4);
      const color = projectile.color || (safeNumber(projectile.pierce, 0) > 0 ? "#ffe28a" : (projectileData.color || "#d8f7ff"));
      const vx = safeNumber(projectile.vx, 0);
      const vy = safeNumber(projectile.vy, 0);

      ctx.strokeStyle = "rgba(216, 247, 255, 0.22)";
      ctx.lineWidth = Math.max(1, radius * 0.65);
      ctx.beginPath();
      ctx.moveTo(projectile.x, projectile.y);
      ctx.lineTo(projectile.x - vx * 0.035, projectile.y - vy * 0.035);
      ctx.stroke();
      drawCircle(projectile.x, projectile.y, radius, color);
    }
  }

  function drawEffects(run) {
    const effects = run.effects || [];

    for (let i = 0; i < effects.length; i += 1) {
      const effect = effects[i];
      const life = Math.max(0, safeNumber(effect.life, 0));
      const maxLife = Math.max(0.01, safeNumber(effect.maxLife, 0.28));
      const alpha = Math.max(0, Math.min(1, life / maxLife));

      if (effect.type === "lightning") {
        ctx.strokeStyle = "rgba(82, 173, 255, " + Math.min(0.42, 0.18 + alpha * 0.24) + ")";
        ctx.lineWidth = Math.max(5, safeNumber(effect.lineWidth, 3) + 4);
        ctx.beginPath();
        ctx.moveTo(safeNumber(effect.fromX, 0), safeNumber(effect.fromY, 0));
        ctx.lineTo(safeNumber(effect.toX, 0), safeNumber(effect.toY, 0));
        ctx.stroke();
        ctx.strokeStyle = "rgba(225, 249, 255, " + Math.min(1, 0.35 + alpha * 0.6) + ")";
        ctx.lineWidth = Math.max(2, safeNumber(effect.lineWidth, 3));
        ctx.beginPath();
        ctx.moveTo(safeNumber(effect.fromX, 0), safeNumber(effect.fromY, 0));
        ctx.lineTo(safeNumber(effect.toX, 0), safeNumber(effect.toY, 0));
        ctx.stroke();
      } else if (effect.type === "mine") {
        ctx.strokeStyle = "rgba(213, 239, 115, " + (0.22 + alpha * 0.34) + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, Math.max(8, safeNumber(effect.radius, 48) * 0.35), 0, Math.PI * 2);
        ctx.stroke();
      } else if (effect.type === "explosion") {
        ctx.fillStyle = "rgba(255, 116, 85, " + (0.08 + alpha * 0.16) + ")";
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, Math.max(10, safeNumber(effect.radius, 46) * (1.08 - alpha * 0.18)), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 190, 95, " + Math.min(0.85, 0.25 + alpha * 0.55) + ")";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, Math.max(10, safeNumber(effect.radius, 46) * (1.1 - alpha * 0.22)), 0, Math.PI * 2);
        ctx.stroke();
      } else if (effect.type === "wave") {
        const dirX = safeNumber(effect.dirX, 1);
        const dirY = safeNumber(effect.dirY, 0);
        const angle = Math.atan2(dirY, dirX);
        const arc = Math.max(0.3, safeNumber(effect.arc, 0.7));
        ctx.strokeStyle = "rgba(185, 166, 255, " + (0.2 + alpha * 0.48) + ")";
        ctx.lineWidth = Math.max(3, safeNumber(effect.lineWidth, 4));
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, safeNumber(effect.radius, 118), angle - arc, angle + arc);
        ctx.stroke();
      } else if (effect.type === "impact") {
        ctx.strokeStyle = colorWithAlpha(effect.color || "#ffe28a", 0.2 + alpha * 0.5);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, Math.max(4, safeNumber(effect.radius, 10) * (1.2 - alpha * 0.35)), 0, Math.PI * 2);
        ctx.stroke();
      } else if (effect.type === "slash") {
        const radius = Math.max(8, safeNumber(effect.radius, 12) * (1.15 - alpha * 0.15));
        ctx.strokeStyle = "rgba(216, 247, 255, " + (0.25 + alpha * 0.5) + ")";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, radius, -0.6, Math.PI * 0.95);
        ctx.stroke();
      } else if (effect.type === "scythe") {
        const angle = safeNumber(effect.angle, 0);
        const arc = Math.max(0.3, safeNumber(effect.arc, 1.1));
        ctx.strokeStyle = "rgba(255, 107, 128, " + (0.25 + alpha * 0.5) + ")";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, safeNumber(effect.radius, 76), angle - arc, angle + arc);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255, 235, 240, " + (0.15 + alpha * 0.38) + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, Math.max(6, safeNumber(effect.radius, 76) * 0.82), angle - arc * 0.72, angle + arc * 0.72);
        ctx.stroke();
      } else if (effect.type === "linePierce") {
        ctx.strokeStyle = "rgba(165, 110, 255, " + (0.18 + alpha * 0.32) + ")";
        ctx.lineWidth = Math.max(8, safeNumber(effect.lineWidth, 14) + 6);
        ctx.beginPath();
        ctx.moveTo(safeNumber(effect.fromX, 0), safeNumber(effect.fromY, 0));
        ctx.lineTo(safeNumber(effect.toX, 0), safeNumber(effect.toY, 0));
        ctx.stroke();
        ctx.strokeStyle = "rgba(235, 225, 255, " + (0.28 + alpha * 0.52) + ")";
        ctx.lineWidth = Math.max(2, safeNumber(effect.lineWidth, 14) * 0.45);
        ctx.beginPath();
        ctx.moveTo(safeNumber(effect.fromX, 0), safeNumber(effect.fromY, 0));
        ctx.lineTo(safeNumber(effect.toX, 0), safeNumber(effect.toY, 0));
        ctx.stroke();
      } else if (effect.type === "starBurst") {
        const radius = Math.max(8, safeNumber(effect.radius, 18) * (0.9 + alpha * 0.25));
        ctx.strokeStyle = "rgba(255, 226, 138, " + (0.25 + alpha * 0.46) + ")";
        ctx.lineWidth = 2;
        for (let s = 0; s < 6; s += 1) {
          const angle = (Math.PI * 2 * s) / 6;
          ctx.beginPath();
          ctx.moveTo(effect.x, effect.y);
          ctx.lineTo(effect.x + Math.cos(angle) * radius, effect.y + Math.sin(angle) * radius);
          ctx.stroke();
        }
      } else if (effect.type === "warningLine") {
        ctx.strokeStyle = "rgba(255, 75, 92, " + (0.2 + alpha * 0.42) + ")";
        ctx.lineWidth = Math.max(12, safeNumber(effect.lineWidth, 28));
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(safeNumber(effect.fromX, 0), safeNumber(effect.fromY, 0));
        ctx.lineTo(safeNumber(effect.toX, 0), safeNumber(effect.toY, 0));
        ctx.stroke();
        ctx.lineCap = "butt";
      } else if (effect.type === "warningCircle") {
        ctx.fillStyle = "rgba(255, 55, 75, " + (0.025 + alpha * 0.055) + ")";
        ctx.beginPath();
        ctx.arc(safeNumber(effect.x, 0), safeNumber(effect.y, 0), Math.max(8, safeNumber(effect.radius, 48)), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 75, 92, " + (0.35 + alpha * 0.58) + ")";
        ctx.lineWidth = 4;
        ctx.setLineDash([7, 5]);
        ctx.beginPath();
        ctx.arc(safeNumber(effect.x, 0), safeNumber(effect.y, 0), Math.max(8, safeNumber(effect.radius, 48)), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (effect.type === "objective") {
        ctx.strokeStyle = "rgba(213, 239, 115, " + (0.25 + alpha * 0.5) + ")";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(safeNumber(effect.x, 0), safeNumber(effect.y, 0), Math.max(8, safeNumber(effect.radius, 48) * (1.05 - alpha * 0.2)), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function drawMiniObjectives(run) {
    const objectives = Array.isArray(run && run.miniObjectives) ? run.miniObjectives : [];

    for (let i = 0; i < objectives.length; i += 1) {
      const objective = objectives[i];
      const radius = Math.max(8, safeNumber(objective.radius, 48));
      const target = Math.max(1, safeNumber(objective.target, 10));
      const progress = Math.max(0, Math.min(1, safeNumber(objective.progress, 0) / target));

      ctx.fillStyle = "rgba(213, 239, 115, 0.08)";
      ctx.beginPath();
      ctx.arc(safeNumber(objective.x, 0), safeNumber(objective.y, 0), radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(213, 239, 115, 0.56)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(safeNumber(objective.x, 0), safeNumber(objective.y, 0), radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = "#d5ef73";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(safeNumber(objective.x, 0), safeNumber(objective.y, 0), radius + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      ctx.stroke();
      ctx.fillStyle = "#d5ef73";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("◎", safeNumber(objective.x, 0), safeNumber(objective.y, 0));
    }
  }

  function drawOrbitals(run) {
    const orbitals = run.orbitals || [];

    for (let i = 0; i < orbitals.length; i += 1) {
      const orbital = orbitals[i];
      const radius = safeNumber(orbital.radius, 7);
      const angle = safeNumber(orbital.angle, 0) + safeNumber(orbital.phase, 0);

      if (orbital.weaponId === "orbitBlade") {
        ctx.save();
        ctx.translate(safeNumber(orbital.x, 0), safeNumber(orbital.y, 0));
        ctx.rotate(angle);
        ctx.fillStyle = "#b7f7ff";
        ctx.beginPath();
        ctx.moveTo(radius * 1.55, 0);
        ctx.lineTo(-radius * 0.75, radius * 0.65);
        ctx.lineTo(-radius * 0.35, 0);
        ctx.lineTo(-radius * 0.75, -radius * 0.65);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        drawCircle(orbital.x, orbital.y, radius, "#b7f7ff");
      }
    }
  }

  function drawNova(run) {
    const player = run.player || {};
    const timer = safeNumber(run.novaPulseTimer, 0);
    const progress = Math.max(0, Math.min(1, timer / 0.35));

    if (timer <= 0) {
      return;
    }

    ctx.strokeStyle = "rgba(213, 239, 115, " + (0.25 + progress * 0.45) + ")";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, Math.max(20, 70 + safeNumber(player.novaRadiusBonus, 0)) * (1.1 - progress * 0.35), 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawEnemies(run) {
    for (let i = 0; i < run.enemies.length; i += 1) {
      const enemy = run.enemies[i];
      const radius = safeNumber(enemy.radius, 8);
      const hpRatio = Math.max(0, Math.min(1, safeNumber(enemy.hp, 0) / Math.max(1, safeNumber(enemy.maxHp, 1))));
      const flash = safeNumber(enemy.hitFlashTimer, 0) > 0;

      const color = flash ? "#ffffff" : (enemy.color || "#6bb7d6");
      const outline = enemy.isBoss ? "#ffe28a" : (enemy.elite ? "#f4f8ff" : "rgba(4, 10, 16, 0.82)");

      drawCircle(enemy.x, enemy.y, radius + 4, flash ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.3)");
      if (enemy.isBoss) {
        drawPolygon(enemy.x, enemy.y, radius, 6, Math.PI / 6, color, outline, 2.5);
        drawPolygon(enemy.x, enemy.y, radius * 0.46, 6, 0, enemy.phaseTwo ? "#ff6b9f" : "#301524", "rgba(255,255,255,0.65)", 1.5);
      } else if (enemy.type === "fast") {
        drawPolygon(enemy.x, enemy.y, radius, 4, Math.PI / 4, color, outline, 1.5);
      } else if (enemy.type === "tank") {
        drawPolygon(enemy.x, enemy.y, radius, 4, 0, color, outline, 2);
        drawPolygon(enemy.x, enemy.y, radius * 0.45, 4, Math.PI / 4, "rgba(4,10,16,0.45)", null, 0);
      } else {
        drawCircle(enemy.x, enemy.y, radius, color);
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (enemy.elite) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, radius + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (enemy.isBoss) {
        if (safeNumber(enemy.auraRadius, 0) > 0) {
          ctx.strokeStyle = enemy.color || "rgba(216, 92, 122, 0.24)";
          ctx.globalAlpha = 0.24;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, safeNumber(enemy.auraRadius, 62), 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        ctx.strokeStyle = enemy.phaseTwo ? "#ff9abd" : (safeNumber(enemy.chargeActiveTimer, 0) > 0 || safeNumber(enemy.chargePrepareTimer, 0) > 0 ? "#ffffff" : "#ffe28a");
        ctx.lineWidth = safeNumber(enemy.chargeActiveTimer, 0) > 0 ? 5 : 3;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, radius + (safeNumber(enemy.chargePrepareTimer, 0) > 0 ? 9 : 5), 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = enemy.phaseTwo ? "#ff6b9f" : "#ffe28a";
        ctx.fillRect(enemy.x - 9, enemy.y - radius - 17, 18, 3);
      }

      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fillRect(enemy.x - radius, enemy.y - radius - 8, radius * 2, 3);
      ctx.fillStyle = "#ff6b80";
      ctx.fillRect(enemy.x - radius, enemy.y - radius - 8, radius * 2 * hpRatio, 3);
    }
  }

  function drawPlayer(run) {
    const player = run.player;
    const radius = safeNumber(player.radius, 12);
    const isInvincible = safeNumber(run.invincibleTimer, 0) > 0;
    const isHit = safeNumber(player.hitFlashTimer, 0) > 0;

    drawCircle(player.x, player.y, radius + 8, isHit ? "rgba(255, 107, 128, 0.3)" : "rgba(73, 224, 184, 0.2)");
    drawCircle(player.x, player.y, radius + 3, "rgba(213, 239, 115, 0.28)");
    drawCircle(player.x, player.y, radius, isHit || isInvincible ? "#ffffff" : "#49e0b8");
    drawPolygon(player.x, player.y, radius * 0.5, 4, Math.PI / 4, "#eaffff", "#071019", 1);

    ctx.strokeStyle = "rgba(213, 239, 115, 0.85)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      const angle = Math.PI * 0.5 * i;
      ctx.beginPath();
      ctx.moveTo(player.x + Math.cos(angle) * (radius + 4), player.y + Math.sin(angle) * (radius + 4));
      ctx.lineTo(player.x + Math.cos(angle) * (radius + 8), player.y + Math.sin(angle) * (radius + 8));
      ctx.stroke();
    }

    ctx.strokeStyle = "#071019";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, Math.max(3, radius * 0.35), 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawDamageTexts(run) {
    const texts = run.damageTexts || [];

    if (!texts.length) {
      return;
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 12px sans-serif";

    for (let i = 0; i < texts.length; i += 1) {
      const text = texts[i];
      const life = Math.max(0, safeNumber(text.life, 0));
      const maxLife = Math.max(0.01, safeNumber(text.maxLife, 0.55));
      const alpha = Math.max(0, Math.min(1, life / maxLife));
      const x = safeNumber(text.x, 0);
      const y = safeNumber(text.y, 0);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      ctx.fillText(String(Math.max(0, Math.round(safeNumber(text.value, 0)))), x + 1, y + 1);
      ctx.fillStyle = text.color || "#ffffff";
      ctx.fillText(String(Math.max(0, Math.round(safeNumber(text.value, 0)))), x, y);
      ctx.globalAlpha = 1;
    }
  }

  function drawMessage(run) {
    if (!run.message) {
      return;
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(run.message, safeNumber((Data.game || {}).width, 360) / 2, 34);
  }

  AS.Render = {
    init: function (targetCanvas) {
      canvas = targetCanvas;
      ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;

      resizeCanvasBuffer(true);

      return !!ctx;
    },

    getPixelRatio: function () {
      return canvasPixelRatio;
    },

    draw: function (run) {
      const camera = getCamera(run);
      const shake = getScreenShake(run);

      if (!ctx || !run) {
        return;
      }

      resizeCanvasBuffer(false);
      drawBackground(run);
      ctx.save();
      ctx.translate(-camera.x + shake.x, -camera.y + shake.y);
      drawGems(run);
      drawMiniObjectives(run);
      drawEffects(run);
      drawProjectiles(run);
      drawEnemies(run);
      drawOrbitals(run);
      drawPlayer(run);
      drawNova(run);
      drawDamageTexts(run);
      ctx.restore();
      drawMessage(run);
    }
  };
})();
