import { useEffect } from "react";

type ScriptProps = {
  src: string;
  strategy?: "beforeInteractive" | "afterInteractive" | "lazyOnload";
  onLoad?: () => void;
  onError?: () => void;
};

export default function Script({
  src,
  strategy = "afterInteractive",
  onLoad,
  onError,
}: ScriptProps) {
  useEffect(() => {
    let cancelled = false;

    const mount = () => {
      if (cancelled) return;
      let el = document.querySelector<HTMLScriptElement>(
        `script[src="${src}"]`
      );
      if (!el) {
        el = document.createElement("script");
        el.src = src;
        el.async = true;
        el.addEventListener("load", () => onLoad?.());
        el.addEventListener("error", () => onError?.());
        document.body.appendChild(el);
      } else if (el.dataset.loaded === "true") {
        onLoad?.();
      } else {
        el.addEventListener("load", () => onLoad?.());
        el.addEventListener("error", () => onError?.());
      }
    };

    const markLoaded = () => {
      const el = document.querySelector<HTMLScriptElement>(
        `script[src="${src}"]`
      );
      if (el) el.dataset.loaded = "true";
    };

    const onLoadEvent = () => {
      markLoaded();
    };

    if (strategy === "lazyOnload") {
      if (document.readyState === "complete") {
        mount();
      } else {
        window.addEventListener("load", mount, { once: true });
      }
    } else {
      mount();
    }

    window.addEventListener("load", onLoadEvent, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", mount);
      window.removeEventListener("load", onLoadEvent);
    };
  }, [src, strategy, onLoad, onError]);

  return null;
}
