// Library to send signal to Q keyboards
const q = require("daskeyboard-applet");

const logger = q.logger;

class PomodoroMax extends q.DesktopApp {
  constructor() {
    super();
    // run every second
    this.pollingInterval = 1000;
    logger.info("Pomdoro ready to go!");
  }

  async applyConfig() {
    this.pomTime = parseInt(this.config.pom_time ?? "1");
    this.brkTime = parseInt(this.config.break_time ?? "1");
    this.pomColor = this.config.pom_color ?? "#00FF00";
    this.brkColor = this.config.break_color ?? "#FF9600";
    logger.info(
      "starting PomodoroApplet with pomodoro of " +
        this.pomTime +
        " minutes and a break of " +
        this.brkTime +
        " minutes"
    );
    this.type = "brk";
    this.newcycle();
  }

  newcycle() {
    this.startTime = new Date();
    if (this.pomTime != NaN) {
      if (this.type == null || this.type == "brk") {
        this.type = "pom";

        this.endTime = new Date(
          this.startTime.getTime() + parseInt(this.pomTime) * 60000
        );
        logger.info(
          "new Cycle is Pomdoro and will end on: " + this.endTime.toString()
        );
      } else {
        this.type = "brk";
        this.endTime = new Date(
          this.startTime.getTime() + parseInt(this.brkTime) * 60000
        );
        logger.info(
          "new Cycle is Break and will end on: " + this.endTime.toString()
        );
      }
    }
  }

  handleCycle() {
    var secondsLeft = Math.round(
      this.endTime.getTime() / 1000 - new Date().getTime() / 1000
    );
    if (secondsLeft <= 0 && this.startCelebration == null) {
      logger.info("Starting celebration module");
      this.startCelebration = new Date();

      return 0;
    }
    if (secondsLeft <= 0 && this.startCelebration != null) {
      if (
        new Date().getTime() / 1000 - this.startCelebration.getTime() / 1000 <=
        5
      ) {
        return 0;
      } else {
        logger.info("celebration ends");
        this.startCelebration = null;
        this.newcycle();
        return 0;
      }
    }
    return secondsLeft;
  }

  // call this function every pollingInterval
  async run() {
    if (this.pomTime != null && this.pomTime != NaN) {
      let secondsLeft = this.handleCycle();
      logger.info("currently " + secondsLeft + " seconds left");
      if (secondsLeft > 0) {
        return this.handleLightShow(secondsLeft);
      } else {
        let points = [];
        const numberOfKeys = 10;
        let activeColor = this.type == "pom" ? this.pomColor : this.brkColor;
        for (let i = 0; i < numberOfKeys; i++) {
          points.push(new q.Point(activeColor, q.Effects.BLINK));
        }

        return new q.Signal({
          points: [points],
          name: "Pomodoro",
          message: "Cycle complete!",
          isMuted: true,
        });
      }
    } else {
      return null;
    }
  }

  handleLightShow(secondsLeft) {
    const numberOfKeys = 10;
    let points = [];
    //get total amount of seconds for current cycle
    var totalSeconds =
      this.endTime.getTime() / 1000 - this.startTime.getTime() / 1000;

    var currentFactor = (totalSeconds - secondsLeft) / totalSeconds;

    var currentBlockValue = currentFactor * numberOfKeys;
    var fullBlocks = Math.floor(currentBlockValue);
    var ShadeValue = currentBlockValue - fullBlocks;

    var activeColor = this.type == "pom" ? this.pomColor : this.brkColor;
    var otherColor = this.type == "pom" ? this.brkColor : this.pomColor;

    //handle
    for (let i = 0; i < numberOfKeys; i++) {
      if (fullBlocks > i) {
        //push point with color for the given cycle
        points[i] = new q.Point(activeColor);
        continue;
      }
      if (fullBlocks == i && ShadeValue > 0) {
        //calculate shade
        let otherColor1 = otherColor.substring(1, 3);
        let otherColor2 = otherColor.substring(3, 5);
        let otherColor3 = otherColor.substring(5);

        let activeColor1 = activeColor.substring(1, 3);
        let activeColor2 = activeColor.substring(3, 5);
        let activeColor3 = activeColor.substring(5);

        //create numbers from color hex string
        let otherColor1Num = parseInt(otherColor1, 16);
        let otherColor2Num = parseInt(otherColor2, 16);
        let otherColor3Num = parseInt(otherColor3, 16);

        let activeColor1Num = parseInt(activeColor1, 16);
        let activeColor2Num = parseInt(activeColor2, 16);
        let activeColor3Num = parseInt(activeColor3, 16);

        let shadeColor1 = 0;
        if (activeColor1Num > otherColor1Num) {
          shadeColor1 =
            otherColor1Num + (activeColor1Num - otherColor1Num) * ShadeValue;
        } else {
          shadeColor1 =
            otherColor1Num - (otherColor1Num - activeColor1Num) * ShadeValue;
        }
        let shadeColor1String = parseInt(Math.floor(shadeColor1))
          .toString(16)
          .padStart(2, "0");

        let shadeColor2 = 0;
        if (activeColor2Num > otherColor2Num) {
          shadeColor2 =
            otherColor2Num + (activeColor2Num - otherColor2Num) * ShadeValue;
        } else {
          shadeColor2 =
            otherColor2Num - (otherColor2Num - activeColor2Num) * ShadeValue;
        }
        let shadeColor2String = parseInt(Math.floor(shadeColor2))
          .toString(16)
          .padStart(2, "0");

        let shadeColor3 = 0;
        if (activeColor3Num > otherColor3Num) {
          shadeColor3 =
            otherColor3Num + (activeColor3Num - otherColor3Num) * ShadeValue;
        } else {
          shadeColor3 =
            otherColor3Num - (otherColor3Num - activeColor3Num) * ShadeValue;
        }
        let shadeColor3String = parseInt(Math.floor(shadeColor3))
          .toString(16)
          .padStart(2, "0");
        let shadeColor =
          "#" + shadeColor1String + shadeColor2String + shadeColor3String;
        points[i] = new q.Point(shadeColor, q.Effects.BREATHE);
        continue;
      }

      points[i] = new q.Point(otherColor);
    }
    if (this.type == "brk") {
      points = points.reverse();
    }
    let signal = new q.Signal({
      points: [points],
      name: "Pomodoro",
      isMuted: true,
    });
    return signal;
  }
}

module.exports = {
  PomodoroMax: PomodoroMax,
};

const applet = new PomodoroMax();
