jest.useFakeTimers().setSystemTime(new Date("2025-01-01T00:00:00Z"));

jest.mock("daskeyboard-applet", () => {
  class Point {
    constructor(color, effect) {
      this.color = color;
      this.effect = effect;
    }
  }
  class Signal {
    constructor(opts) {
      this.points = opts.points;
      this.name = opts.name;
      this.message = opts.message;
      this.isMuted = opts.isMuted;
    }
  }
  const Effects = {
    BREATHE: "BREATHE",
    BLINK: "BLINK",
  };
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
  class DesktopApp {
    constructor() {
      this.config = {};
    }
  }
  return { Point, Signal, Effects, logger, DesktopApp };
});

const { PomodoroMax } = require("../index.js");
const q = require("daskeyboard-applet");

describe("PomodoroMax", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("applyConfig loads defaults and starts with Pomodoro cycle", async () => {
    const app = new PomodoroMax();
    app.config = {};
    await app.applyConfig();

    expect(app.pomTime).toBe(1);
    expect(app.brkTime).toBe(1);
    expect(app.pomColor).toBe("#00FF00");
    expect(app.brkColor).toBe("#FF9600");
    expect(app.type).toBe("pom");
    expect(app.startTime instanceof Date).toBe(true);
    expect(app.endTime instanceof Date).toBe(true);
  });

  test("newcycle switches between pom and break", async () => {
    const app = new PomodoroMax();
    app.config = { pom_time: "2", break_time: "3" };
    await app.applyConfig();

    expect(app.type).toBe("pom");
    app.newcycle();
    expect(app.type).toBe("brk");
  });

  test("handleLightShow builds correct number of keys for pom cycle", async () => {
    const app = new PomodoroMax();
    app.config = { pom_time: "1", break_time: "1" };
    await app.applyConfig();

    app.startTime = new Date(Date.now() - 5000);
    app.endTime = new Date(Date.now() + 5000);

    const signal = app.handleLightShow(5);
    expect(signal).toBeInstanceOf(q.Signal);
    expect(signal.points[0]).toHaveLength(10);
  });

  test("handleLightShow creates a shaded transitional key", async () => {
    const app = new PomodoroMax();
    app.config = { pom_time: "1", break_time: "1", pom_color: "#FFFFFF", break_color: "#000000" };
    await app.applyConfig();

    app.startTime = new Date(Date.now() - 4.5 * 1000);
    app.endTime = new Date(Date.now() + 5.5 * 1000);

    const signal = app.handleLightShow(5.5);
    const shadedKey = signal.points[0][4];

    expect(shadedKey.effect).toBe(q.Effects.BREATHE);

    const hex = shadedKey.color.toUpperCase();
    expect(["#808080", "#7F7F7F"]).toContain(hex); // allow rounding difference
  });

  test("break cycle reverses progress bar", async () => {
    const app = new PomodoroMax();
    app.config = { pom_time: "1", break_time: "1", pom_color: "#FFFFFF", break_color: "#000000" };
    await app.applyConfig();

    app.type = "brk";
    app.startTime = new Date(Date.now() - 5000);
    app.endTime = new Date(Date.now() + 5000);

    const signal = app.handleLightShow(5);
    const row = signal.points[0];

    expect(row[0].color).toBe("#FFFFFF");
    expect(row[9].color).toBe("#000000");
  });

  test("run returns blink signal when cycle ends", async () => {
    const app = new PomodoroMax();
    app.config = { pom_time: "1", break_time: "1", pom_color: "#00FF00", break_color: "#FF9600" };
    await app.applyConfig();

    app.endTime = new Date(Date.now() - 1000);

    const signal = await app.run();
    expect(signal).toBeInstanceOf(q.Signal);
    expect(signal.name).toBe("Pomodoro");
    expect(signal.message).toBe("Cycle complete!");
    signal.points[0].forEach(p => expect(p.effect).toBe(q.Effects.BLINK));
  });
});
