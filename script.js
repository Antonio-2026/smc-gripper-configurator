const robots = [
  {
    id: "ur5e",
    name: "Universal Robots UR5e",
    icon: "🤖",
    payloadKg: 5,
    reachMm: 850,
    repeatabilityMm: 0.03,
    wristSpeedDegS: 180,
  },
  {
    id: "tm12",
    name: "Techman TM12",
    icon: "🦾",
    payloadKg: 12,
    reachMm: 1300,
    repeatabilityMm: 0.1,
    wristSpeedDegS: 220,
  },
  {
    id: "fanuc-crx10",
    name: "FANUC CRX-10iA",
    icon: "⚙️",
    payloadKg: 10,
    reachMm: 1249,
    repeatabilityMm: 0.04,
    wristSpeedDegS: 210,
  },
];

const grippers = [
  {
    id: "mhm-40d2",
    name: "SMC MHM-40D2",
    strokeMm: 8,
    massG: 145,
    nominalForceN: 76,
    maxWorkpieceKg: 1.6,
  },
  {
    id: "mhs4-32d",
    name: "SMC MHS4-32D",
    strokeMm: 20,
    massG: 350,
    nominalForceN: 132,
    maxWorkpieceKg: 3.4,
  },
  {
    id: "mhz2-25d",
    name: "SMC MHZ2-25D",
    strokeMm: 14,
    massG: 235,
    nominalForceN: 102,
    maxWorkpieceKg: 2.4,
  },
];

const inputs = {
  workpieceMass: document.getElementById("workpieceMass"),
  acceleration: document.getElementById("acceleration"),
  friction: document.getElementById("friction"),
  fingerLength: document.getElementById("fingerLength"),
  orientation: document.getElementById("orientation"),
  safetyFactor: document.getElementById("safetyFactor"),
};

const outputs = {
  massOut: document.getElementById("massOut"),
  accelOut: document.getElementById("accelOut"),
  frictionOut: document.getElementById("frictionOut"),
  fingerOut: document.getElementById("fingerOut"),
};

const robotCards = document.getElementById("robotCards");
const gripperCards = document.getElementById("gripperCards");
const recommendationList = document.getElementById("recommendationList");

let selectedRobot = robots[0];
let selectedGripper = grippers[0];

function getEngineeringState() {
  return {
    massKg: Number(inputs.workpieceMass.value),
    accelerationG: Number(inputs.acceleration.value),
    friction: Number(inputs.friction.value),
    fingerLengthMm: Number(inputs.fingerLength.value),
    orientation: inputs.orientation.value,
    safetyFactor: Number(inputs.safetyFactor.value),
  };
}

function calculateDemand(gripper, state) {
  const gravity = 9.81;
  const orientationMultiplier = {
    horizontal: 1,
    vertical: 1.2,
    inverted: 1.35,
  }[state.orientation];

  const dynamicLoad = state.massKg * gravity * state.accelerationG * orientationMultiplier;
  const frictionSupport = Math.max(0.1, state.friction);
  const fingerMomentPenalty = 1 + state.fingerLengthMm / 160;

  return (dynamicLoad / frictionSupport) * state.safetyFactor * fingerMomentPenalty;
}

function scoreCombination(robot, gripper, state) {
  const demandForce = calculateDemand(gripper, state);
  const usablePayload = Math.min(robot.payloadKg, gripper.maxWorkpieceKg);
  const payloadScore = usablePayload / Math.max(0.1, state.massKg);
  const forceScore = gripper.nominalForceN / Math.max(1, demandForce);
  const speedScore = robot.wristSpeedDegS / 200;
  const precisionScore = 1 / (robot.repeatabilityMm * 20);

  return {
    demandForce,
    usablePayload,
    score: payloadScore * 0.35 + forceScore * 0.4 + speedScore * 0.1 + precisionScore * 0.15,
    isFeasible: forceScore >= 1 && usablePayload >= state.massKg,
  };
}

function renderCards() {
  robotCards.innerHTML = robots
    .map(
      (robot) => `
        <article class="selectable-card ${robot.id === selectedRobot.id ? "selected" : ""}" data-robot-id="${robot.id}">
          <div class="card-heading">
            <div class="card-title">${robot.name}</div>
            <span class="robot-icon" aria-hidden="true">${robot.icon}</span>
          </div>
          <ul class="meta-list">
            <li><strong>Payload:</strong> ${robot.payloadKg.toFixed(1)} kg</li>
            <li><strong>Reach:</strong> ${robot.reachMm} mm</li>
            <li><strong>Repeatability:</strong> ±${robot.repeatabilityMm} mm</li>
          </ul>
        </article>
      `
    )
    .join("");

  gripperCards.innerHTML = grippers
    .map(
      (gripper) => `
        <article class="selectable-card ${gripper.id === selectedGripper.id ? "selected" : ""}" data-gripper-id="${gripper.id}">
          <div class="card-heading">
            <div class="card-title">${gripper.name}</div>
          </div>
          <ul class="meta-list">
            <li><strong>Nominal force:</strong> ${gripper.nominalForceN} N</li>
            <li><strong>Stroke:</strong> ${gripper.strokeMm} mm</li>
            <li><strong>Body mass:</strong> ${gripper.massG} g</li>
            <li><strong>Max workpiece:</strong> ${gripper.maxWorkpieceKg.toFixed(1)} kg</li>
          </ul>
        </article>
      `
    )
    .join("");
}

function updateInputOutputs() {
  outputs.massOut.value = `${Number(inputs.workpieceMass.value).toFixed(1)} kg`;
  outputs.accelOut.value = `${Number(inputs.acceleration.value).toFixed(1)} g`;
  outputs.frictionOut.value = Number(inputs.friction.value).toFixed(2);
  outputs.fingerOut.value = `${Number(inputs.fingerLength.value)} mm`;
}

function updateSummary() {
  const state = getEngineeringState();
  const analysis = scoreCombination(selectedRobot, selectedGripper, state);
  const marginPercent = ((selectedGripper.nominalForceN / analysis.demandForce) * 100).toFixed(0);

  document.getElementById("summaryRobot").textContent = `${selectedRobot.name} (${selectedRobot.icon})`;
  document.getElementById("summaryGripper").textContent = selectedGripper.name;
  document.getElementById("summaryDemand").textContent = `${analysis.demandForce.toFixed(1)} N required`;
  document.getElementById("summaryPayload").textContent = `${analysis.usablePayload.toFixed(1)} kg usable`;

  const marginElement = document.getElementById("summaryMargin");
  marginElement.textContent = `${marginPercent}% force coverage`;
  marginElement.classList.toggle("warning", Number(marginPercent) < 100);
}

function updateRecommendationEngine() {
  const state = getEngineeringState();

  const combos = robots.flatMap((robot) =>
    grippers.map((gripper) => {
      const evaluation = scoreCombination(robot, gripper, state);
      return {
        robot,
        gripper,
        ...evaluation,
      };
    })
  );

  combos.sort((a, b) => b.score - a.score);

  recommendationList.innerHTML = combos
    .slice(0, 3)
    .map((combo, index) => {
      const status = combo.isFeasible ? "Recommended" : "Borderline";
      return `<li class="${combo.isFeasible ? "ok" : "risk"}">
        <strong>#${index + 1} ${combo.robot.name}</strong><br/>
        ${combo.gripper.name}<br/>
        score ${combo.score.toFixed(2)} · ${status}
      </li>`;
    })
    .join("");
}

function drawEnvelopeGraph() {
  const svg = document.getElementById("envelopeGraph");
  const state = getEngineeringState();
  const width = 760;
  const height = 380;
  const margin = { top: 30, right: 24, bottom: 48, left: 64 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const demandForce = calculateDemand(selectedGripper, state);
  const payloadLimit = Math.min(selectedRobot.payloadKg, selectedGripper.maxWorkpieceKg);

  const xMax = Math.max(12, selectedRobot.payloadKg + 2, state.massKg + 1);
  const yMax = Math.max(200, selectedGripper.nominalForceN + 80, demandForce + 40);

  const xScale = (value) => margin.left + (value / xMax) * plotWidth;
  const yScale = (value) => margin.top + plotHeight - (value / yMax) * plotHeight;

  const gridLines = [];
  for (let i = 0; i <= 6; i += 1) {
    const yVal = (yMax / 6) * i;
    const y = yScale(yVal);
    gridLines.push(`<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" class="grid" />`);
    gridLines.push(`<text x="${margin.left - 10}" y="${y + 4}" class="axis-label" text-anchor="end">${Math.round(yVal)}</text>`);
  }

  for (let i = 0; i <= 6; i += 1) {
    const xVal = (xMax / 6) * i;
    const x = xScale(xVal);
    gridLines.push(`<line x1="${x}" y1="${margin.top}" x2="${x}" y2="${height - margin.bottom}" class="grid" />`);
    gridLines.push(`<text x="${x}" y="${height - margin.bottom + 20}" class="axis-label" text-anchor="middle">${xVal.toFixed(1)}</text>`);
  }

  const envelopePath = [
    `${xScale(0)},${yScale(0)}`,
    `${xScale(payloadLimit)},${yScale(0)}`,
    `${xScale(payloadLimit)},${yScale(selectedGripper.nominalForceN)}`,
    `${xScale(0)},${yScale(selectedGripper.nominalForceN)}`,
  ].join(" ");

  const demandCurve = [0.2, 0.4, 0.6, 0.8, 1].map((ratio) => {
    const mass = state.massKg * ratio;
    const scaledState = { ...state, massKg: mass };
    const force = calculateDemand(selectedGripper, scaledState);
    return `${xScale(mass)},${yScale(force)}`;
  });

  svg.innerHTML = `
    <style>
      .grid { stroke: #223047; stroke-width: 1; }
      .axis { stroke: #d8dfec; stroke-width: 1.6; }
      .axis-label { fill: #9dacbf; font-size: 12px; font-family: Inter, sans-serif; }
      .axis-title { fill: #dce4f3; font-size: 12px; font-weight: 600; font-family: Inter, sans-serif; }
      .envelope { fill: rgba(46, 196, 182, 0.22); stroke: #2ec4b6; stroke-width: 2; }
      .limit-line { stroke: #ffd166; stroke-width: 2; stroke-dasharray: 5 4; }
      .curve { fill: none; stroke: #f9a03f; stroke-width: 2.6; stroke-dasharray: 4 3; }
      .point { fill: #ff7b7b; }
      .legend-text { fill: #dce4f3; font-size: 12px; font-family: Inter, sans-serif; }
    </style>

    ${gridLines.join("")}

    <line class="axis" x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" />
    <line class="axis" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" />

    <polygon class="envelope" points="${envelopePath}" />
    <polyline class="curve" points="${demandCurve.join(" ")}" />

    <line class="limit-line" x1="${xScale(state.massKg)}" y1="${margin.top}" x2="${xScale(state.massKg)}" y2="${height - margin.bottom}" />
    <line class="limit-line" x1="${margin.left}" y1="${yScale(demandForce)}" x2="${width - margin.right}" y2="${yScale(demandForce)}" />
    <circle class="point" cx="${xScale(state.massKg)}" cy="${yScale(demandForce)}" r="5" />

    <text class="axis-title" x="${width / 2}" y="${height - 10}" text-anchor="middle">Mass [kg]</text>
    <text class="axis-title" x="16" y="${height / 2}" transform="rotate(-90,16,${height / 2})" text-anchor="middle">Grip force [N]</text>

    <rect x="${width - 255}" y="${margin.top + 8}" width="225" height="66" fill="#111926" stroke="#2b3a52" rx="8" />
    <rect x="${width - 242}" y="${margin.top + 20}" width="18" height="10" fill="rgba(46, 196, 182, 0.22)" stroke="#2ec4b6" />
    <text class="legend-text" x="${width - 215}" y="${margin.top + 29}">Available envelope</text>
    <line class="curve" x1="${width - 242}" y1="${margin.top + 48}" x2="${width - 224}" y2="${margin.top + 48}" />
    <text class="legend-text" x="${width - 215}" y="${margin.top + 52}">Required force trajectory</text>
  `;
}

function updateScene() {
  const state = getEngineeringState();
  const elbow = document.getElementById("robotElbow");
  const wrist = document.getElementById("robotWrist");
  const jawLeft = document.getElementById("jawLeft");
  const jawRight = document.getElementById("jawRight");
  const payloadCube = document.getElementById("payloadCube");

  const orientationDeg = {
    horizontal: 0,
    vertical: -20,
    inverted: -35,
  }[state.orientation];

  elbow.style.transform = `translate3d(165px, 95px, 0) rotate(${selectedRobot.wristSpeedDegS / 25}deg)`;
  wrist.style.transform = `translate3d(225px, 90px, 0) rotate(${orientationDeg}deg)`;

  const jawGap = Math.min(18, Math.max(6, selectedGripper.strokeMm / 1.2));
  jawLeft.style.transform = `translate3d(${278 - jawGap}px, 118px, 6px)`;
  jawRight.style.transform = `translate3d(${298 + jawGap}px, 118px, 6px)`;

  payloadCube.style.opacity = state.massKg <= selectedGripper.maxWorkpieceKg ? 1 : 0.3;

  document.getElementById("sceneCaption").textContent = `${selectedRobot.name.split(" ").slice(-1)[0]} + ${selectedGripper.name.split(" ")[1]} @ ${state.orientation}`;
}

function bindEvents() {
  robotCards.addEventListener("click", (event) => {
    const card = event.target.closest("[data-robot-id]");
    if (!card) return;

    selectedRobot = robots.find((robot) => robot.id === card.dataset.robotId);
    refreshUI();
  });

  gripperCards.addEventListener("click", (event) => {
    const card = event.target.closest("[data-gripper-id]");
    if (!card) return;

    selectedGripper = grippers.find((gripper) => gripper.id === card.dataset.gripperId);
    refreshUI();
  });

  Object.values(inputs).forEach((input) => {
    input.addEventListener("input", refreshUI);
    input.addEventListener("change", refreshUI);
  });
}

function refreshUI() {
  renderCards();
  updateInputOutputs();
  updateSummary();
  updateRecommendationEngine();
  drawEnvelopeGraph();
  updateScene();
}

bindEvents();
refreshUI();
