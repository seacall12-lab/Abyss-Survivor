(function () {
  window.AbyssSurvivor = window.AbyssSurvivor || {};
  const AS = window.AbyssSurvivor;
  const Data = AS.Data || {};
  let canvas = null;
  let ctx = null;

  function safeNumber(value, fallback) {
    const numberValue = Number(value);
    const safeFallback = Number.isFinite(Number(fallback)) ? Number(fallback) : 0;
    return Number.isFinite(numberValue) ? numberValue : safeFallback;
  }

  function drawCircle(x, y, radius, color) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawBackground() {
    const game = Data.game || {};
    const width = safeNumber(game.width, 360);
    const height = safeNumber(game.height, 560);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#071019";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(126, 204, 222, 0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(73, 224, 184, 0.05)";
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 150, 0, Math.PI * 2);
    ctx.fill();
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
      drawCircle(projectile.x, projectile.y, safeNumber(projectile.radius, 4), safeNumber(projectile.pierce, 0) > 0 ? "#ffe28a" : (projectileData.color || "#d8f7ff"));
    }
  }

  function drawOrbitals(run) {
    const orbitals = run.orbitals || [];

    for (let i = 0; i < orbitals.length; i += 1) {
      const orbital = orbitals[i];
      drawCircle(orbital.x, orbital.y, safeNumber(orbital.radius, 7), "#b7f7ff");
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

      drawCircle(enemy.x, enemy.y, radius, enemy.color || "#6bb7d6");

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

        ctx.strokeStyle = safeNumber(enemy.chargeActiveTimer, 0) > 0 || safeNumber(enemy.chargePrepareTimer, 0) > 0 ? "#ffffff" : "#ffe28a";
        ctx.lineWidth = safeNumber(enemy.chargeActiveTimer, 0) > 0 ? 5 : 3;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, radius + (safeNumber(enemy.chargePrepareTimer, 0) > 0 ? 9 : 5), 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#ffe28a";
        ctx.fillRect(enemy.x - 7, enemy.y - radius - 16, 14, 3);
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

    drawCircle(player.x, player.y, radius + 6, "rgba(73, 224, 184, 0.16)");
    drawCircle(player.x, player.y, radius + 2, "rgba(213, 239, 115, 0.18)");
    drawCircle(player.x, player.y, radius, isInvincible ? "#ffffff" : "#49e0b8");

    ctx.strokeStyle = "#071019";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, Math.max(3, radius * 0.35), 0, Math.PI * 2);
    ctx.stroke();
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

      if (canvas && Data.game) {
        canvas.width = safeNumber(Data.game.width, 360);
        canvas.height = safeNumber(Data.game.height, 560);
      }

      return !!ctx;
    },

    draw: function (run) {
      if (!ctx || !run) {
        return;
      }

      drawBackground();
      drawGems(run);
      drawProjectiles(run);
      drawEnemies(run);
      drawOrbitals(run);
      drawPlayer(run);
      drawNova(run);
      drawMessage(run);
    }
  };
})();
