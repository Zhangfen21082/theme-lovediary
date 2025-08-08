import "./styles/tailwind.css";
import "./styles/main.css";
import Alpine from "alpinejs";

window.Alpine = Alpine;

export function count(x: number, y: number) {
  return x + y;
}

document.addEventListener("alpine:init", () => {
  Alpine.data("hero", () => ({
    type: "carousel" as "carousel" | "video",
    videoUrl: "",
    currentIndex: 0,
    slideCount: 0,
    // slide 模式专用：渲染轨道位置索引（包含克隆项）
    positionIndex: 0,
    transitionEnabled: true,
    isSnapping: false,
    intervalMs: 5000,
    transition: "fade" as "fade" | "slide",
    transitionMs: 600,
    showArrows: true,
    showIndicators: true,
    intervalId: undefined as number | undefined,
    init() {
      const root = this.$root as HTMLElement;
      const typeAttr = root.getAttribute("data-hero-type") || "carousel";
      const videoAttr = root.getAttribute("data-hero-video-url") || "";
      this.type = typeAttr === "video" ? "video" : "carousel";
      this.videoUrl = videoAttr;
      if (this.type === "carousel") {
        // 读取自定义配置
        const parseBool = (v: string | null, d: boolean) => {
          if (v == null) return d;
          return v === "true" || v === "1";
        };
        const parseNum = (v: string | null, d: number) => {
          const n = Number(v);
          return Number.isFinite(n) ? n : d;
        };
        const t = (root.getAttribute("data-carousel-transition") || "fade").toLowerCase();
        this.transition = t === "slide" ? "slide" : "fade";
        this.intervalMs = parseNum(root.getAttribute("data-carousel-interval"), 5000);
        this.transitionMs = parseNum(root.getAttribute("data-carousel-transition-ms"), 600);
        this.showArrows = parseBool(root.getAttribute("data-carousel-arrows"), true);
        this.showIndicators = parseBool(root.getAttribute("data-carousel-indicators"), true);

        this.slideCount = root.querySelectorAll("img[data-slide-index]").length;
        if (this.slideCount > 1) {
          this.intervalId = window.setInterval(() => this.next(), this.intervalMs);
        }
        // 初始化 slide 模式 positionIndex
        this.positionIndex = 0;
        // 绑定 slide 过渡结束后的首尾衔接
        if (this.transition === "slide") {
          const track = root.querySelector('[x-ref="track"]') as HTMLElement | null;
          if (track) {
            track.addEventListener("transitionend", (ev: TransitionEvent) => {
              if (ev.propertyName !== "transform") return;
              if (!this.transitionEnabled) return;
              // 当移动到了克隆的第一张（positionIndex === slideCount）时，瞬间跳回真实第一张
              if (this.positionIndex === this.slideCount) {
                this.isSnapping = true;
                this.transitionEnabled = false;
                // 等待一帧再重置位置，避免出现反向动画
                window.requestAnimationFrame(() => {
                  this.positionIndex = 0;
                  this.currentIndex = 0;
                  window.requestAnimationFrame(() => {
                    this.transitionEnabled = true;
                    this.isSnapping = false;
                  });
                });
              }
            });
          }
        }
      }
    },
    next() {
      if (this.slideCount <= 0) return;
      if (this.transition === "slide") {
        // 走到最后一张后，先动画到克隆的第一张，然后瞬间无动画跳回真实第一张
        if (this.currentIndex === this.slideCount - 1) {
          if (this.isSnapping) return;
          this.transitionEnabled = true;
          this.positionIndex = this.currentIndex + 1; // 移动到克隆项
        } else {
          this.currentIndex += 1;
          this.positionIndex = this.currentIndex;
        }
      } else {
        this.currentIndex = (this.currentIndex + 1) % this.slideCount;
      }
    },
    prev() {
      if (this.slideCount <= 0) return;
      if (this.transition === "slide") {
        if (this.currentIndex === 0) {
          // 从第一张向左时，瞬间跳到克隆项，再动画回最后一张
          this.transitionEnabled = false;
          this.positionIndex = this.slideCount; // 克隆项位置
          this.currentIndex = this.slideCount - 1;
          window.requestAnimationFrame(() => {
            this.transitionEnabled = true;
            this.positionIndex = this.currentIndex;
          });
        } else {
          this.currentIndex -= 1;
          this.positionIndex = this.currentIndex;
        }
      } else {
        this.currentIndex = (this.currentIndex - 1 + this.slideCount) % this.slideCount;
      }
    },
    go(index: number) {
      if (this.slideCount <= 0) return;
      if (index < 0) index = 0;
      if (index >= this.slideCount) index = this.slideCount - 1;
      this.currentIndex = index;
      if (this.transition === "slide") {
        this.transitionEnabled = true;
        this.positionIndex = this.currentIndex;
      }
    },
    destroy() {
      if (this.intervalId) window.clearInterval(this.intervalId);
    },
    scrollToNext() {
      const next = document.querySelector('[data-home-sections]') as HTMLElement | null;
      if (!next) return;
      next.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }));

  Alpine.data("counter", () => ({
    startAt: "",
    time: { days: 0, hours: 0, minutes: 0, seconds: 0 },
    timerId: undefined as number | undefined,
    init() {
      const root = this.$root as HTMLElement;
      const date = (root.getAttribute("data-rel-date") || "").trim();
      const hour = Number(root.getAttribute("data-rel-hour") || "0");
      const minute = Number(root.getAttribute("data-rel-minute") || "0");
      const second = Number(root.getAttribute("data-rel-second") || "0");
      if (!date) return;
      // 组装为本地时间字符串，避免时区困扰
      this.startAt = `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
      this.tick();
      this.timerId = window.setInterval(() => this.tick(), 1000);
    },
    tick() {
      const start = new Date(this.startAt).getTime();
      if (Number.isNaN(start)) return;
      let diffSeconds = Math.max(0, Math.floor((Date.now() - start) / 1000));
      const days = Math.floor(diffSeconds / 86400);
      diffSeconds -= days * 86400;
      const hours = Math.floor(diffSeconds / 3600);
      diffSeconds -= hours * 3600;
      const minutes = Math.floor(diffSeconds / 60);
      diffSeconds -= minutes * 60;
      const seconds = diffSeconds;
      this.time = { days, hours, minutes, seconds };
    },
    destroy() {
      if (this.timerId) window.clearInterval(this.timerId);
    },
  }));
});

Alpine.start();
