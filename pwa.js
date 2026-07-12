(function () {
  "use strict";

  window.AbyssSurvivor = window.AbyssSurvivor || {};
  const AS = window.AbyssSurvivor;
  let deferredPrompt = null;
  let lobbyVisible = true;
  let installButton = null;
  let installHelp = null;

  function isStandalone() {
    return window.matchMedia && window.matchMedia("(display-mode: standalone)").matches
      || window.navigator.standalone === true;
  }

  function isIOS() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent || "");
  }

  function updateVisibility() {
    if (!installButton) {
      return;
    }
    const shouldShow = lobbyVisible && !isStandalone() && (!!deferredPrompt || isIOS());
    installButton.classList.toggle("is-hidden", !shouldShow);
    if (!shouldShow && installHelp) {
      installHelp.classList.add("is-hidden");
    }
  }

  function setup() {
    installButton = document.getElementById("installButton");
    installHelp = document.getElementById("installHelp");

    if (!installButton) {
      return;
    }
    if (isIOS()) {
      installButton.textContent = "▣ 홈 화면에 설치";
    }
    installButton.addEventListener("click", function () {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function (choice) {
          if (choice && choice.outcome === "accepted") {
            deferredPrompt = null;
          }
          updateVisibility();
        }).catch(function () {
          updateVisibility();
        });
      } else if (isIOS() && installHelp) {
        installHelp.classList.toggle("is-hidden");
      }
    });
    updateVisibility();
  }

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    deferredPrompt = event;
    updateVisibility();
  });

  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    updateVisibility();
  });

  AS.PWA = {
    setLobbyVisible: function (visible) {
      lobbyVisible = !!visible;
      updateVisibility();
    },
    isStandalone: isStandalone,
    isIOS: isIOS,
    canPromptInstall: function () {
      return !!deferredPrompt;
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  } else {
    setup();
  }
})();
