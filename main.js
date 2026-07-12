(function () {
  window.AbyssSurvivor = window.AbyssSurvivor || {};
  const AS = window.AbyssSurvivor;

  function reportMissing(name) {
    if (window.console && typeof window.console.error === "function") {
      window.console.error("필수 모듈이 없습니다: " + name);
    }
  }

  function hasModules() {
    const required = ["Data", "State", "Feedback", "Game", "Render", "UI", "PWA"];

    for (let i = 0; i < required.length; i += 1) {
      if (!AS[required[i]]) {
        reportMissing(required[i]);
        return false;
      }
    }

    return true;
  }

  AS.Main = {
    loopId: null,
    lastTime: 0,
    initialized: false,

    init: function () {
      const canvas = document.getElementById("gameCanvas");

      if (this.initialized) {
        return;
      }

      if (!hasModules()) {
        return;
      }

      if (!canvas) {
        reportMissing("gameCanvas");
        return;
      }

      this.initialized = true;
      AS.Render.init(canvas);
      AS.State.getRun();
      AS.UI.init();
      this.startLoop();
    },

    startLoop: function () {
      const self = this;

      if (this.loopId !== null) {
        return;
      }

      this.lastTime = 0;

      function frame(timestamp) {
        const run = AS.State.getRun();
        let delta = 0;

        if (self.lastTime > 0) {
          delta = Math.min((timestamp - self.lastTime) / 1000, 0.05);
        }

        self.lastTime = timestamp;

        if (run && AS.Data && AS.Data.states && run.mode === AS.Data.states.running) {
          AS.Game.update(run, delta);
        }

        AS.Render.draw(AS.State.getRun());
        AS.UI.updateHud(AS.State.getRun());
        AS.UI.showOverlay();
        self.loopId = window.requestAnimationFrame(frame);
      }

      this.loopId = window.requestAnimationFrame(frame);
    },

    stopLoop: function () {
      if (this.loopId !== null) {
        window.cancelAnimationFrame(this.loopId);
        this.loopId = null;
      }
    }
  };

  window.addEventListener("DOMContentLoaded", function () {
    AS.Main.init();
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./service-worker.js").catch(function (error) {
        if (window.console && typeof window.console.warn === "function") {
          window.console.warn("Service worker registration failed:", error);
        }
      });
    });
  }
})();
