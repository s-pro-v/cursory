/**
 * Cursory — dołącz na dowolnej stronie:
 *   <link rel="stylesheet" href="cursory.css">
 *   <script src="cursory.js" defer></script>
 * (ścieżki dostosuj do miejsca, gdzie leżą pliki obok folderu cursors/).
 *
 * Opcjonalnie przed skryptem:
 *   window.CursoryConfig = {
 *     base: "https://twoja-domena.pl/assets/cursory/",  // opcjonalnie zamiast folderu skryptu
 *     idle: "cursors/inny.png",
 *     pointer: "...",
 *     pointerHover: "...",
 *     text: "...",
 *     followerSize: "40px"
 *   };
 *
 * Albo atrybuty na <body>: data-cursory-idle, data-cursory-pointer,
 * data-cursory-pointer-hover, data-cursory-text, data-cursory-follower-size
 * (stare: data-cursor-default, data-cursor-pointer, …).
 */
(function () {
    var PLACEHOLDER =
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

    function cssUrl(absUrl) {
        if (!absUrl) return "";
        return "url(" + JSON.stringify(absUrl) + ")";
    }

    function getPackBase() {
        var cfg = window.CursoryConfig;
        if (cfg && cfg.base) {
            var b = String(cfg.base);
            return b.slice(-1) === "/" ? b : b + "/";
        }
        var sc = document.currentScript;
        if (!sc || !sc.src) {
            var all = document.querySelectorAll("script[src]");
            for (var i = all.length - 1; i >= 0; i--) {
                if (/cursory\.js(\?|$)/i.test(all[i].src)) {
                    sc = all[i];
                    break;
                }
            }
        }
        if (sc && sc.src) {
            return sc.src.replace(/[/\\][^/\\]*$/, "/");
        }
        return window.location.href.replace(/[^/]+$/, "");
    }

    function resolveAsset(path, packBase) {
        if (!path || typeof path !== "string") return null;
        if (/^https?:\/\//i.test(path)) return path;
        if (path.charAt(0) === "/") {
            try {
                return new URL(path, window.location.origin).href;
            } catch (e) {
                return path;
            }
        }
        try {
            return new URL(path, packBase).href;
        } catch (e2) {
            return packBase + path.replace(/^\//, "");
        }
    }

    function mergeConfig() {
        var cfg = {};
        var w = window.CursoryConfig;
        if (w && typeof w === "object") {
            for (var k in w) {
                if (k !== "base" && Object.prototype.hasOwnProperty.call(w, k)) {
                    cfg[k] = w[k];
                }
            }
        }
        var root = document.body || document.documentElement;
        function d(name, legacy) {
            var v = root.getAttribute("data-cursory-" + name);
            if (v == null && legacy) v = root.getAttribute("data-cursor-" + legacy);
            if (v != null && v !== "") cfg[name] = v;
        }
        d("idle", "default");
        d("pointer", "pointer");
        d("pointer-hover", "pointerHover");
        d("text", "text");
        d("follower-size", null);
        if (cfg["pointer-hover"] != null) {
            cfg.pointerHover = cfg["pointer-hover"];
            delete cfg["pointer-hover"];
        }
        if (cfg["follower-size"] != null) {
            cfg.followerSize = cfg["follower-size"];
            delete cfg["follower-size"];
        }
        return cfg;
    }

    function applyResolvedToCss(resolved) {
        var el = document.documentElement;
        el.style.setProperty("--cursor-idle", cssUrl(resolved.idle));
        el.style.setProperty("--cursor-gif-pointer", cssUrl(resolved.pointer));
        el.style.setProperty("--cursor-gif-pointer-hover", cssUrl(resolved.pointerHover));
        el.style.setProperty("--cursor-gif-text", cssUrl(resolved.text));
    }

    function resolveAll(cfg, packBase) {
        var dIdle = "cursory/[PRIS] Unavailable v4.png";
        var dPtr = "cursory/[PRIS] Link - Classic v4.gif";
        var dPtrH = "cursory/[PRIS] Link - Sheen v4.gif";
        var dTxt = "cursory/[PRIS] Loop - Text - Needle v4.gif";
        return {
            idle: resolveAsset(cfg.idle || dIdle, packBase),
            pointer: resolveAsset(cfg.pointer || dPtr, packBase),
            pointerHover: resolveAsset(cfg.pointerHover || dPtrH, packBase),
            text: resolveAsset(cfg.text || dTxt, packBase),
        };
    }

    function ensureFollower() {
        var layer = document.getElementById("cursory-follower");
        if (layer) return layer;
        layer = document.createElement("div");
        layer.id = "cursory-follower";
        layer.className = "cursory-follower";
        layer.setAttribute("hidden", "");
        layer.setAttribute("aria-hidden", "true");
        var img = document.createElement("img");
        img.id = "cursory-follower-img";
        img.alt = "";
        img.decoding = "async";
        img.src = PLACEHOLDER;
        layer.appendChild(img);
        document.body.appendChild(layer);
        return layer;
    }

    var state = { handlers: null, body: null };

    function destroy() {
        if (!state.handlers) return;
        document.removeEventListener("mousemove", state.handlers.onMove, { passive: true });
        document.removeEventListener("mouseover", state.handlers.onOver, true);
        if (state.body) {
            state.body.classList.remove("cursor-gif-follower", "cursory-enabled");
        }
        state.handlers = null;
        state.body = null;
    }

    function init() {
        destroy();
        var cfg = mergeConfig();
        var packBase = getPackBase();
        var resolved = resolveAll(cfg, packBase);
        applyResolvedToCss(resolved);
        if (cfg.followerSize) {
            document.documentElement.style.setProperty(
                "--cursor-follower-size",
                cfg.followerSize
            );
        }

        var def = resolved.idle;
        var ptr = resolved.pointer;
        var ptrHover = resolved.pointerHover;
        var txt = resolved.text;

        var body = document.body;
        if (!body) return;
        body.classList.add("cursory-enabled");

        var layer = ensureFollower();
        var img = document.getElementById("cursory-follower-img");
        if (!layer || !img) return;

        var finePointer =
            typeof window.matchMedia === "function" &&
            window.matchMedia("(pointer: fine)").matches;
        if (!finePointer) return;

        function isTextField(el) {
            if (!el || !el.tagName) return false;
            var tag = el.tagName;
            if (tag === "TEXTAREA" || tag === "SELECT") return true;
            if (tag !== "INPUT") return false;
            var t = (el.type || "text").toLowerCase();
            return (
                t === "text" ||
                t === "search" ||
                t === "email" ||
                t === "password" ||
                t === "url" ||
                t === "tel" ||
                t === "number" ||
                t === ""
            );
        }

        function interactiveHost(el) {
            if (!el || !el.closest) return null;
            return el.closest("a, button, [role='button'], summary");
        }

        function isUnavailable(el) {
            if (!el) return false;
            var n = el;
            while (n) {
                if (n.disabled === true) return true;
                if (n.getAttribute && n.getAttribute("aria-disabled") === "true") return true;
                n = n.parentElement;
            }
            try {
                var cs = window.getComputedStyle(el);
                if (cs.cursor === "not-allowed" || cs.cursor === "no-drop") return true;
            } catch (e) { }
            return false;
        }

        function cursorUrlFor(el) {
            if (isUnavailable(el)) return def;
            if (isTextField(el)) return txt;
            var host = interactiveHost(el);
            if (host && !isUnavailable(host)) {
                try {
                    if (host.matches(":hover")) return ptrHover;
                } catch (e2) { }
                return ptr;
            }
            return def;
        }

        var current = "";
        var pending = { x: 0, y: 0 };
        var raf = 0;

        function setSrc(url) {
            if (current === url) return;
            current = url;
            img.onerror = function () {
                img.onerror = null;
                current = "";
                if (url === ptrHover) setSrc(ptr);
                else if (url !== def) setSrc(def);
            };
            img.src = url;
        }

        function applyInteractive(target) {
            setSrc(cursorUrlFor(target));
        }

        function tick() {
            raf = 0;
            layer.style.transform =
                "translate3d(" + pending.x + "px," + pending.y + "px,0)";
        }

        function onMove(e) {
            pending.x = e.clientX;
            pending.y = e.clientY;
            if (!raf) raf = requestAnimationFrame(tick);
            var el = document.elementFromPoint(e.clientX, e.clientY);
            applyInteractive(el || e.target);
        }

        function onOver(e) {
            applyInteractive(e.target);
        }

        var probe = new Image();
        probe.onload = function () {
            img.src = def;
            layer.hidden = false;
            body.classList.add("cursor-gif-follower");
            document.addEventListener("mousemove", onMove, { passive: true });
            document.addEventListener("mouseover", onOver, true);
            pending.x = window.innerWidth / 2;
            pending.y = window.innerHeight / 2;
            tick();
            state.handlers = { onMove: onMove, onOver: onOver };
            state.body = body;
        };
        probe.onerror = function () {
            layer.hidden = true;
        };
        probe.src = def;
    }

    window.Cursory = {
        init: init,
        destroy: destroy,
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
