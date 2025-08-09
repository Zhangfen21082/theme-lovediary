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
    // effects & interactions
    kenburnsEnabled: false,
    kenburnsVars: "",
    parallaxEnabled: false,
    parallaxStrength: 0.15,
    init() {
      const root = this.$root as HTMLElement;
      const parseBool = (v: string | null, d: boolean) => {
        if (v == null) return d;
        return v === "true" || v === "1";
      };
      const parseNum = (v: string | null, d: number) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : d;
      };
      const typeAttr = root.getAttribute("data-hero-type") || "carousel";
      const videoAttr = root.getAttribute("data-hero-video-url") || "";
      this.type = typeAttr === "video" ? "video" : "carousel";
      this.videoUrl = videoAttr;
      if (this.type === "carousel") {
        // 读取自定义配置
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
      // Ken Burns
      this.kenburnsEnabled = parseBool(root.getAttribute("data-kenburns"), false);
      if (this.kenburnsEnabled) {
        const from = Number(root.getAttribute("data-kenburns-scale-from") || "1.05");
        const to = Number(root.getAttribute("data-kenburns-scale-to") || "1.15");
        const dur = Number(root.getAttribute("data-kenburns-duration-ms") || "20000");
        this.kenburnsVars = `--kb-from:${from};--kb-to:${to};animation-duration:${dur}ms;`;
      }
      // Parallax
      this.parallaxEnabled = parseBool(root.getAttribute("data-parallax"), false);
      this.parallaxStrength = Number(root.getAttribute("data-parallax-strength") || "0.15");
      if (this.parallaxEnabled) {
        window.addEventListener("scroll", this.onParallaxScroll);
      }
      // Swipe up
      if (parseBool(root.getAttribute("data-swipe-up"), true)) {
        this.bindSwipeUp();
      }
    },
    onParallaxScroll: function (this: any) {
      const hero = this.$root as HTMLElement;
      const rect = hero.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (rect.bottom < 0 || rect.top > vh) return;
      const center = rect.top + rect.height / 2 - vh / 2;
      const offset = -center / vh; // -0.5 ~ 0.5
      const translate = offset * (this.parallaxStrength * 100);
      const layers = hero.querySelectorAll("video, img[ data-slide-index ], [x-ref='track'] img");
      layers.forEach((el: Element) => {
        (el as HTMLElement).style.transform = `translate3d(0, ${translate}px, 0)`;
      });
    },
    bindSwipeUp() {
      let startY = 0;
      let active = false;
      const threshold = 40;
      const hero = this.$root as HTMLElement;
      hero.addEventListener("touchstart", (e: TouchEvent) => {
        if (e.touches.length !== 1) return;
        startY = e.touches[0].clientY;
        active = true;
      });
      hero.addEventListener("touchmove", (e: TouchEvent) => {
        if (!active) return;
        const dy = e.touches[0].clientY - startY;
        if (dy < -threshold) {
          active = false;
          this.scrollToNext();
        }
      });
      hero.addEventListener("touchend", () => {
        active = false;
      });
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
    last: null as null | { days: number; hours: number; minutes: number; seconds: number },
    timerId: undefined as number | undefined,
    rollEnabled: true,
    rollMs: 300,
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
      // digit roll options
      const pageRoot = document.querySelector("section[ x-data=\"hero()\"]") as HTMLElement | null;
      if (pageRoot) {
        const parseBool = (v: string | null, d: boolean) => (v == null ? d : v === "true" || v === "1");
        const parseNum = (v: string | null, d: number) => {
          const n = Number(v);
          return Number.isFinite(n) ? n : d;
        };
        this.rollEnabled = parseBool(pageRoot.getAttribute("data-digit-roll"), true);
        this.rollMs = parseNum(pageRoot.getAttribute("data-digit-roll-ms"), 300);
      }
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
      const next = { days, hours, minutes, seconds };
      // 首次渲染：直接写入，不做动画
      if (this.last === null) {
        this.setDigit("days", next.days);
        this.setDigit("hours", next.hours % 24);
        this.setDigit("minutes", next.minutes % 60);
        this.setDigit("seconds", next.seconds % 60);
        this.last = next;
        this.time = next;
        return;
      }
      // 仅在数值变化时滚动
      if (this.rollEnabled) {
        if (next.days !== this.last.days) this.applyDigitRoll("days", next.days);
        if (next.hours !== this.last.hours) this.applyDigitRoll("hours", next.hours % 24);
        if (next.minutes !== this.last.minutes) this.applyDigitRoll("minutes", next.minutes % 60);
        if (next.seconds !== this.last.seconds) this.applyDigitRoll("seconds", next.seconds % 60);
      } else {
        // 无动效时，直接写入文本
        if (next.days !== this.last.days) this.setDigit("days", next.days);
        if (next.hours !== this.last.hours) this.setDigit("hours", next.hours % 24);
        if (next.minutes !== this.last.minutes) this.setDigit("minutes", next.minutes % 60);
        if (next.seconds !== this.last.seconds) this.setDigit("seconds", next.seconds % 60);
      }
      this.last = next;
      this.time = next;
    },
    applyDigitRoll(unit: "days" | "hours" | "minutes" | "seconds", value: number) {
      const wrap = (this.$root as HTMLElement).querySelector(`.digit-roll[data-unit="${unit}"]`) as HTMLElement | null;
      if (!wrap) return;
      const track = wrap.querySelector<HTMLElement>(`.digit-roll-track`);
      if (!track) return;
      const items = track.querySelectorAll<HTMLElement>(`.digit-roll-item`);
      if (items.length < 2) return;
      // 上一项为当前展示，下一项为目标数字
      items[1].textContent = String(this.formatUnit(unit, value));
      // 应用过渡
      track.style.transitionDuration = `${this.rollMs}ms`;
      track.style.transform = `translateY(-100%)`;
      // 过渡结束后复位，并把目标项移到第一位，同时第二项预置为“下一次”的占位值
      window.setTimeout(() => {
        track.style.transitionDuration = `0ms`;
        track.style.transform = `translateY(0)`;
        // 交换内容：第一项更新为目标，第二项重置为下一次的占位值（与第一项相同）
        items[0].textContent = String(this.formatUnit(unit, value));
        const nextVal = this.nextForUnit(unit, value);
        items[1].textContent = String(this.formatUnit(unit, nextVal));
      }, this.rollMs);
    },
    setDigit(unit: "days" | "hours" | "minutes" | "seconds", value: number) {
      const wrap = (this.$root as HTMLElement).querySelector(`.digit-roll[data-unit="${unit}"]`) as HTMLElement | null;
      if (!wrap) return;
      const track = wrap.querySelector<HTMLElement>(`.digit-roll-track`);
      if (!track) return;
      const items = track.querySelectorAll<HTMLElement>(`.digit-roll-item`);
      if (items.length < 2) return;
      track.style.transitionDuration = `0ms`;
      track.style.transform = `translateY(0)`;
      items[0].textContent = String(this.formatUnit(unit, value));
      const nextVal = this.nextForUnit(unit, value);
      items[1].textContent = String(this.formatUnit(unit, nextVal));
      // 强制一次 reflow，确保初次绘制后滚动不受高度抖动影响
      void track.offsetHeight;
    },
    nextForUnit(unit: "days" | "hours" | "minutes" | "seconds", value: number) {
      const max = unit === "hours" ? 24 : unit === "minutes" || unit === "seconds" ? 60 : null;
      if (max == null) return value + 1;
      const v = (value + 1) % max;
      return v;
    },
    formatUnit(unit: "days" | "hours" | "minutes" | "seconds", value: number) {
      if (unit === "hours" || unit === "minutes" || unit === "seconds") {
        return value.toString().padStart(2, "0");
      }
      return value.toString();
    },
    destroy() {
      if (this.timerId) window.clearInterval(this.timerId);
    },
  }));
});

Alpine.start();
