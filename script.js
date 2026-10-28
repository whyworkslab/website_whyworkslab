(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Header and mobile navigation
  const header = $("[data-header]");
  const nav = $("[data-nav]");
  const menuButton = $("[data-menu-button]");

  const updateHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 18);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  const closeMenu = () => {
    nav?.classList.remove("is-open");
    menuButton?.setAttribute("aria-expanded", "false");
    menuButton?.setAttribute("aria-label", "Open menu");
    document.body.classList.remove("menu-open");
  };

  menuButton?.addEventListener("click", () => {
    const shouldOpen = menuButton.getAttribute("aria-expanded") !== "true";
    nav?.classList.toggle("is-open", shouldOpen);
    menuButton.setAttribute("aria-expanded", String(shouldOpen));
    menuButton.setAttribute("aria-label", shouldOpen ? "Close menu" : "Open menu");
    document.body.classList.toggle("menu-open", shouldOpen);
  });

  $$("a", nav).forEach((link) => link.addEventListener("click", closeMenu));
  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) closeMenu();
  });

  // Hero discovery lab
  const lab = $("[data-lab]");
  if (lab) {
    const arena = $("[data-arena]", lab);
    const obstacle = $("[data-obstacle]", lab);
    const robot = $("[data-robot]", lab);
    const runButton = $("[data-run-test]", lab);
    const moveButton = $("[data-move-obstacle]", lab);
    const result = $("[data-lab-prompt]", lab);
    const resultTitle = $("[data-lab-result-title]", lab);
    const resultCopy = $("[data-lab-result-copy]", lab);
    const setupLabel = $("[data-setup-label]", lab);
    const predictionButtons = $$('[data-prediction]', lab);
    const steps = $$('[data-step]', lab);
    let obstacleMoved = false;
    let selectedPrediction = null;
    let running = false;
    let timers = [];

    const later = (callback, delay) => {
      const timer = window.setTimeout(callback, delay);
      timers.push(timer);
    };

    const clearTimers = () => {
      timers.forEach(window.clearTimeout);
      timers = [];
    };

    const snapRobotToStart = () => {
      robot.classList.add("is-resetting");
      robot.classList.remove("is-sensing", "is-running", "is-avoiding", "is-goal");
      void robot.offsetWidth;
      robot.classList.remove("is-resetting");
    };

    const updateArenaLabel = (message) => arena?.setAttribute("aria-label", message);

    const setResult = (state, title, copy) => {
      result.classList.remove("is-testing", "is-match", "is-surprise");
      if (state) result.classList.add(`is-${state}`);
      resultTitle.textContent = title;
      resultCopy.textContent = copy;
    };

    const resetRobot = ({ clearPrediction = false } = {}) => {
      clearTimers();
      snapRobotToStart();

      if (clearPrediction) selectedPrediction = null;

      steps.forEach((step) => step.classList.remove("is-active"));
      predictionButtons.forEach((button) => {
        const isSelected = button.dataset.prediction === selectedPrediction;
        button.setAttribute("aria-pressed", String(isSelected));
        button.disabled = false;
      });

      if (selectedPrediction) steps[0]?.classList.add("is-active");

      running = false;
      lab.setAttribute("aria-busy", "false");
      runButton.disabled = !selectedPrediction;
      moveButton.disabled = false;
      $("span", runButton).textContent = "Test my prediction";

      if (selectedPrediction) {
        const predictionText = selectedPrediction === "straight" ? "goes straight" : "takes a detour";
        setResult("", "Prediction recorded", `You predict the robot ${predictionText}. Now test it.`);
      } else {
        setResult("", "Choose a prediction", "Then test it against what the robot actually does.");
      }

      updateArenaLabel(
        obstacleMoved
          ? "The obstacle is off the route. The robot is waiting at the start."
          : "The obstacle is on the route. The robot is waiting at the start."
      );
    };

    moveButton.addEventListener("click", () => {
      if (running) return;
      obstacleMoved = !obstacleMoved;
      obstacle.classList.toggle("is-moved", obstacleMoved);
      moveButton.setAttribute("aria-pressed", String(obstacleMoved));
      moveButton.textContent = obstacleMoved ? "Put it back on the route" : "Move it off the route";
      setupLabel.textContent = obstacleMoved ? "Obstacle off the route" : "Obstacle on the route";
      resetRobot({ clearPrediction: true });
    });

    predictionButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (running) return;
        selectedPrediction = button.dataset.prediction;
        resetRobot();
      });
    });

    const finishRun = (observedRoute) => {
      const matched = selectedPrediction === observedRoute;
      const observedText = observedRoute === "straight"
        ? "The obstacle was off the route, so the robot kept going straight."
        : "The obstacle was on the route, so the sensor triggered and the robot took a detour.";

      running = false;
      timers = [];
      lab.setAttribute("aria-busy", "false");
      runButton.disabled = false;
      moveButton.disabled = false;
      predictionButtons.forEach((button) => { button.disabled = false; });
      steps[2]?.classList.add("is-active");
      $("span", runButton).textContent = "Test again";

      setResult(
        matched ? "match" : "surprise",
        matched ? "Your prediction matched the evidence" : "The evidence surprised you—that is useful",
        `Observed: ${observedText} Only the obstacle position changed; the sensing rule stayed the same.`
      );

      updateArenaLabel(
        observedRoute === "straight"
          ? "Test complete. The robot travelled straight to the goal because the obstacle was off the route."
          : "Test complete. The robot detected the obstacle, took a detour and reached the goal."
      );
    };

    runButton.addEventListener("click", () => {
      if (running || !selectedPrediction) return;

      clearTimers();
      snapRobotToStart();
      running = true;
      lab.setAttribute("aria-busy", "true");
      runButton.disabled = true;
      moveButton.disabled = true;
      predictionButtons.forEach((button) => { button.disabled = true; });
      $("span", runButton).textContent = "Testing…";
      steps[0]?.classList.add("is-active");
      steps[1]?.classList.add("is-active");
      steps[2]?.classList.remove("is-active");
      setResult("testing", "Testing your prediction", "Watch the route, then compare it with what you expected.");
      updateArenaLabel("The test is running. The robot is sensing the route ahead.");

      const observedRoute = obstacleMoved ? "straight" : "detour";

      if (reduceMotion) {
        robot.classList.add("is-goal");
        finishRun(observedRoute);
        return;
      }

      later(() => {
        robot.classList.add("is-sensing");
      }, 150);

      later(() => {
        robot.classList.add("is-running");
      }, 650);

      if (observedRoute === "straight") {
        later(() => {
          robot.classList.remove("is-running");
          robot.classList.add("is-goal");
        }, 1550);
        later(() => finishRun(observedRoute), 2500);
      } else {
        later(() => {
          robot.classList.remove("is-running");
          robot.classList.add("is-avoiding");
        }, 1550);
        later(() => {
          robot.classList.remove("is-avoiding");
          robot.classList.add("is-goal");
        }, 2450);
        later(() => finishRun(observedRoute), 3400);
      }
    });

    resetRobot({ clearPrediction: true });
  }

  // Entry-level finder
  const finder = $("[data-finder]");
  const finderData = {
    foundation: {
      level: "Entry 1",
      title: "Begin with Foundation Robotics",
      copy: "The same 36-session Foundation course is adapted to the learner's age and readiness through tactile, experimental or measured engineering work.",
      path: "foundation",
    },
    advanced: {
      level: "Review",
      title: "Request an Advanced readiness review",
      copy: "Eligible learners enter one continuous Advanced programme. WhyWorksLab then guides progression through Applied, Competition and Humanoid Engineering.",
      path: "advanced",
    },
  };

  let activatePathway = () => {};

  if (finder) {
    const options = $$('[data-level]', finder);
    const result = $("[data-finder-result]", finder);
    const resultLevel = $("[data-result-level]", result);
    const resultTitle = $("[data-result-title]", result);
    const resultCopy = $("[data-result-copy]", result);
    const resultLink = $("[data-result-link]", result);

    options.forEach((option) => {
      option.addEventListener("click", () => {
        options.forEach((item) => item.setAttribute("aria-checked", String(item === option)));
        const recommendation = finderData[option.dataset.level];
        resultLevel.textContent = recommendation.level;
        resultTitle.textContent = recommendation.title;
        resultCopy.textContent = recommendation.copy;
        resultLink.dataset.openPath = recommendation.path;
        result.hidden = false;
      });
    });

    resultLink.addEventListener("click", () => {
      window.setTimeout(() => activatePathway(resultLink.dataset.openPath), reduceMotion ? 0 : 250);
    });
  }

  // Course pathway tabs
  const pathTabs = $("[data-pathway-tabs]");
  const pathPanels = $$("[data-panel]");
  if (pathTabs) {
    const tabs = $$('[data-path]', pathTabs);
    activatePathway = (path) => {
      tabs.forEach((tab) => {
        const active = tab.dataset.path === path;
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      pathPanels.forEach((panel) => {
        const active = panel.dataset.panel === path;
        panel.hidden = !active;
        panel.classList.toggle("is-active", active);
      });
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => activatePathway(tab.dataset.path));
      tab.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        const direction = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1;
        const next = (index + direction + tabs.length) % tabs.length;
        activatePathway(tabs[next].dataset.path);
        tabs[next].focus();
      });
    });
    activatePathway("foundation");
  }

  // Teaching-method interactive log
  const methodSteps = $("[data-method-steps]");
  const methodDemo = $("[data-method-demo]");
  const methodData = {
    experience: {
      label: "Experience",
      title: "A sensor says the box is “near.”",
      copy: "What does near mean—and will the reading stay the same?",
      badge: "Question first",
      result: "How could we check?",
      measure: "?",
    },
    predict: {
      label: "Predict",
      title: "Choose a distance before measuring.",
      copy: "Each learner records a guess so different ideas remain visible.",
      badge: "My prediction",
      result: "20 cm",
      measure: "20?",
    },
    test: {
      label: "Test",
      title: "Compare the ruler and sensor.",
      copy: "Measure at 10, 20 and 30 cm, repeating each target three times.",
      badge: "Controlled trial",
      result: "3 readings × 3 distances",
      measure: "cm",
    },
    name: {
      label: "Name",
      title: "Now the word “calibration” has meaning.",
      copy: "The technical term connects to a difference the learner has already observed.",
      badge: "Concept unlocked",
      result: "Reference vs reading",
      measure: "±",
    },
    build: {
      label: "Build",
      title: "Give the robot a stop threshold.",
      copy: "Turn the measured idea into a rule the robot can apply.",
      badge: "Applied rule",
      result: "IF distance < 20 → STOP",
      measure: "20",
    },
    explain: {
      label: "Explain",
      title: "Show the evidence—and one limitation.",
      copy: "A visible result, failed reading and useful revision complete the cycle.",
      badge: "Exit evidence",
      result: "Claim matches data",
      measure: "✓",
    },
  };

  if (methodSteps && methodDemo) {
    const stepItems = $$('[data-method]', methodSteps);
    const label = $("[data-demo-label]", methodDemo);
    const title = $("[data-demo-title]", methodDemo);
    const copy = $("[data-demo-copy]", methodDemo);
    const badge = $("[data-demo-result] span", methodDemo);
    const result = $("[data-demo-result] strong", methodDemo);
    const measure = $(".measure-line span", methodDemo);
    const card = $(".demo-card", methodDemo);

    const updateMethod = (key) => {
      const data = methodData[key];
      stepItems.forEach((item) => item.classList.toggle("is-active", item.dataset.method === key));
      label.textContent = data.label;
      title.textContent = data.title;
      copy.textContent = data.copy;
      badge.textContent = data.badge;
      result.textContent = data.result;
      measure.textContent = data.measure;
      card.animate?.(
        [{ opacity: 0.65, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0)" }],
        { duration: reduceMotion ? 1 : 260, easing: "ease-out" }
      );
    };

    stepItems.forEach((item) => {
      item.tabIndex = 0;
      item.setAttribute("role", "button");
      item.addEventListener("click", () => updateMethod(item.dataset.method));
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          updateMethod(item.dataset.method);
        }
      });
    });
  }

  // Curriculum data and filter
  const modules = [
    { n: 1, level: "foundation", name: "Discovering what robots are", sessions: "01–03" },
    { n: 2, level: "foundation", name: "Movement and mechanical intuition", sessions: "04–06" },
    { n: 3, level: "foundation", name: "Electricity, switches and motors", sessions: "07–09" },
    { n: 4, level: "foundation", name: "Sensors and measurement", sessions: "10–12" },
    { n: 5, level: "foundation", name: "Thinking in rules and sequences", sessions: "13–15" },
    { n: 6, level: "foundation", name: "Physical-to-digital coding", sessions: "16–18" },
    { n: 7, level: "foundation", name: "Building a reliable robot body", sessions: "19–21" },
    { n: 8, level: "foundation", name: "Feedback, navigation and debugging", sessions: "22–24" },
    { n: 9, level: "foundation", name: "Robots solving human problems", sessions: "25–27" },
    { n: 10, level: "foundation", name: "Sensing limitations, data and responsibility", sessions: "28–30" },
    { n: 11, level: "foundation", name: "Engineering design and integration", sessions: "31–33" },
    { n: 12, level: "foundation", name: "Testing, communication and showcase", sessions: "34–36" },
    { n: 13, level: "applied", name: "Engineering Lab and Instruments", sessions: "37–42" },
    { n: 14, level: "applied", name: "Embedded Programming and Reliability", sessions: "43–48" },
    { n: 15, level: "applied", name: "Mobile Robotics and Feedback Control", sessions: "49–54" },
    { n: 16, level: "applied", name: "Mechanical Design, CAD and Integration", sessions: "55–60" },
    { n: 17, level: "competition", name: "Line-Following Competition Engineering", sessions: "61–66" },
    { n: 18, level: "competition", name: "Maze Solving and Search Algorithms", sessions: "67–72" },
    { n: 19, level: "competition", name: "Autonomy and Arena Strategy", sessions: "73–78" },
    { n: 20, level: "competition", name: "Competition Team and Tournament Readiness", sessions: "79–84" },
    { n: 21, level: "humanoid", name: "Humanoid Anatomy, Degrees of Freedom and Structure", sessions: "85–90" },
    { n: 22, level: "humanoid", name: "Actuation, Power and Joint Safety", sessions: "91–96" },
    { n: 23, level: "humanoid", name: "Kinematics and Motion Planning", sessions: "97–102" },
    { n: 24, level: "humanoid", name: "Sensing, Static Balance and Recovery", sessions: "103–108" },
    { n: 25, level: "humanoid", name: "Walking Gaits and Biped Trials", sessions: "109–114" },
    { n: 26, level: "humanoid", name: "Humanoid Perception, Integration and Showcase", sessions: "115–120" },
  ];

  const levelLabels = {
    foundation: "Level 1 · Foundation",
    applied: "Level 2 · Applied",
    competition: "Level 3 · Competition",
    humanoid: "Level 4 · Humanoid",
  };

  const moduleList = $("[data-module-list]");
  const curriculumFilter = $("[data-curriculum-filter]");
  if (moduleList && curriculumFilter) {
    const fragment = document.createDocumentFragment();
    modules.forEach((module) => {
      const item = document.createElement("article");
      item.className = "module-item";
      item.dataset.level = module.level;
      item.innerHTML = `
        <span class="module-number">M${String(module.n).padStart(2, "0")}</span>
        <div class="module-main"><span>${levelLabels[module.level]}</span><h3>${module.name}</h3></div>
        <span class="module-sessions">Sessions ${module.sessions}</span>`;
      fragment.appendChild(item);
    });
    moduleList.appendChild(fragment);

    const filterButtons = $$('[data-filter]', curriculumFilter);
    const applyCurriculumFilter = (filter) => {
      filterButtons.forEach((item) => {
        const active = item.dataset.filter === filter;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-selected", String(active));
      });
      $$(".module-item", moduleList).forEach((item) => {
        item.hidden = filter !== "all" && item.dataset.level !== filter;
      });
    };
    filterButtons.forEach((button) => {
      button.addEventListener("click", () => applyCurriculumFilter(button.dataset.filter));
    });
    applyCurriculumFilter("foundation");
  }

  // FAQ accordion
  const faqList = $("[data-faq-list]");
  if (faqList) {
    $$(".faq-item", faqList).forEach((item) => {
      const button = $("button", item);
      const answer = $(".faq-answer", item);
      button.addEventListener("click", () => {
        const willOpen = !item.classList.contains("is-open");
        $$(".faq-item", faqList).forEach((other) => {
          other.classList.remove("is-open");
          $("button", other).setAttribute("aria-expanded", "false");
          $(".faq-answer", other).hidden = true;
        });
        if (willOpen) {
          item.classList.add("is-open");
          button.setAttribute("aria-expanded", "true");
          answer.hidden = false;
        }
      });
    });
  }

  // Local enquiry builder with an explicit WhatsApp hand-off
  const enquiryForm = $("[data-enquiry-form]");
  if (enquiryForm) {
    const output = $("[data-enquiry-output]", enquiryForm);
    const outputText = $("[data-enquiry-text]", enquiryForm);
    const copyButton = $("[data-copy-enquiry]", enquiryForm);
    const copyStatus = $("[data-copy-status]", enquiryForm);
    const sendWhatsApp = $("[data-send-whatsapp]", enquiryForm);
    const whatsAppNumber = "91997769844";
    let preparedText = "";

    const entrySuggestion = (stage, interest) => {
      if (stage.includes("3–4")) return "Foundation Robotics with the tactile, prewired pathway";
      if (stage.includes("5–6")) return "Foundation Robotics with models, sensors and block coding";
      if (stage.includes("7–9")) return interest.includes("Humanoid") || interest.includes("Competition")
        ? "a Foundation readiness check, followed by the suitable advanced level"
        : "Foundation Robotics at the measured engineering depth";
      return "an advanced readiness review before selecting Applied, Competition or Humanoid Engineering";
    };

    enquiryForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(enquiryForm);
      const role = formData.get("role");
      const stage = formData.get("stage");
      const interest = formData.get("interest");
      const mode = formData.get("mode");
      const suggestion = entrySuggestion(stage, interest);
      preparedText = `Hello WhyWorksLab, I am enquiring as a ${String(role).toLowerCase()} for a learner/team at the ${stage} stage. We are most interested in ${String(interest).toLowerCase()} and prefer ${String(mode).toLowerCase()}. Based on the published pathway, we would like to discuss ${suggestion}. Please share the available batch, fees, schedule, hardware or kit requirements, the practical readiness check, and what the first hands-on learning experience will involve.`;
      outputText.textContent = preparedText;
      sendWhatsApp.href = `https://wa.me/${whatsAppNumber}?text=${encodeURIComponent(preparedText)}`;
      output.hidden = false;
      copyStatus.textContent = "";
      output.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
    });

    copyButton.addEventListener("click", async () => {
      if (!preparedText) return;
      try {
        await navigator.clipboard.writeText(preparedText);
        copyStatus.textContent = "Copied. You can paste it into WhatsApp or another message.";
      } catch {
        const textArea = document.createElement("textarea");
        textArea.value = preparedText;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
        copyStatus.textContent = "Copied. You can paste it into WhatsApp or another message.";
      }
    });
  }

  const year = $("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();
