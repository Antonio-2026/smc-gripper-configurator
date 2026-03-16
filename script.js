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

let selectedRobot = robots[0];
let selectedGripper = grippers[0];

const robotCards = document.getElementById("robotCards");
const gripperCards = document.getElementById("gripperCards");

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
}

function updateSummary() {
  const payloadLimitKg = Math.min(selectedRobot.payloadKg, selectedGripper.maxWorkpieceKg);
  const margin = ((selectedGripper.maxWorkpieceKg / selectedRobot.payloadKg) * 100).toFixed(0);

  document.getElementById("summaryRobot").textContent = `${selectedRobot.name} (${selectedRobot.icon})`;
  document.getElementById("summaryGripper").textContent = selectedGripper.name;
  document.getElementById("summaryPayload").textContent = `${payloadLimitKg.toFixed(1)} kg usable`;
  document.getElementById("summaryForce").textContent = `${selectedGripper.nominalForceN} N`;

  const marginElement = document.getElementById("summaryMargin");
  marginElement.textContent = `${margin}% of robot payload`;
  marginElement.classList.toggle("warning", payloadLimitKg < selectedRobot.payloadKg * 0.35);
}

function drawEnvelopeGraph() {
  const svg = document.getElementById("envelopeGraph");
  const width = 760;
  const height = 380;
  const margin = { top: 30, right: 24, bottom: 48, left: 64 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  const xMax = Math.max(12, selectedRobot.payloadKg + 1);
  const yMax = Math.max(180, selectedGripper.nominalForceN + 30);

  const xScale = (value) => margin.left + (value / xMax) * plotWidth;
  const yScale = (value) => margin.top + plotHeight - (value / yMax) * plotHeight;

  const payloadLimit = Math.min(selectedRobot.payloadKg, selectedGripper.maxWorkpieceKg);
  const forceLimit = selectedGripper.nominalForceN;

  const gridLines = [];
  for (let i = 0; i <= 6; i++) {
    const yVal = (yMax / 6) * i;
    const y = yScale(yVal);
    gridLines.push(`<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" class="grid" />`);
    gridLines.push(`<text x="${margin.left - 10}" y="${y + 4}" class="axis-label" text-anchor="end">${Math.round(yVal)}</text>`);
  }

  for (let i = 0; i <= 6; i++) {
    const xVal = (xMax / 6) * i;
    const x = xScale(xVal);
    gridLines.push(`<line x1="${x}" y1="${margin.top}" x2="${x}" y2="${height - margin.bottom}" class="grid" />`);
    gridLines.push(`<text x="${x}" y="${height - margin.bottom + 20}" class="axis-label" text-anchor="middle">${xVal.toFixed(1)}</text>`);
  }

  const envelopePath = [
    `${xScale(0)},${yScale(0)}`,
    `${xScale(payloadLimit)},${yScale(0)}`,
    `${xScale(payloadLimit)},${yScale(forceLimit)}`,
    `${xScale(0)},${yScale(forceLimit)}`,
  ].join(" ");

  const requirementCurve = [
    [0, 8],
    [payloadLimit * 0.25, forceLimit * 0.32],
    [payloadLimit * 0.5, forceLimit * 0.58],
    [payloadLimit * 0.75, forceLimit * 0.84],
    [payloadLimit, forceLimit * 0.98],
  ]
    .map(([x, y]) => `${xScale(x)},${yScale(y)}`)
    .join(" ");

  svg.innerHTML = `
    <style>
      .grid { stroke: #223047; stroke-width: 1; }
      .axis { stroke: #d8dfec; stroke-width: 1.6; }
      .axis-label { fill: #9dacbf; font-size: 12px; font-family: Inter, sans-serif; }
      .axis-title { fill: #dce4f3; font-size: 12px; font-weight: 600; font-family: Inter, sans-serif; }
      .envelope { fill: rgba(46, 196, 182, 0.22); stroke: #2ec4b6; stroke-width: 2; }
      .limit-line { stroke: #ffd166; stroke-width: 2; stroke-dasharray: 5 4; }
      .curve { fill: none; stroke: #f9a03f; stroke-width: 2.6; }
      .legend-text { fill: #dce4f3; font-size: 12px; font-family: Inter, sans-serif; }
    </style>

    ${gridLines.join("")}

    <line class="axis" x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" />
    <line class="axis" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" />

    <polygon class="envelope" points="${envelopePath}" />
    <polyline class="curve" points="${requirementCurve}" />

    <line class="limit-line" x1="${xScale(payloadLimit)}" y1="${margin.top}" x2="${xScale(payloadLimit)}" y2="${height - margin.bottom}" />
    <line class="limit-line" x1="${margin.left}" y1="${yScale(forceLimit)}" x2="${width - margin.right}" y2="${yScale(forceLimit)}" />

    <text class="axis-title" x="${width / 2}" y="${height - 10}" text-anchor="middle">Mass [kg]</text>
    <text class="axis-title" x="16" y="${height / 2}" transform="rotate(-90,16,${height / 2})" text-anchor="middle">Grip force [N]</text>

    <rect x="${width - 250}" y="${margin.top + 8}" width="220" height="62" fill="#111926" stroke="#2b3a52" rx="8" />
    <rect x="${width - 236}" y="${margin.top + 20}" width="18" height="10" fill="rgba(46, 196, 182, 0.22)" stroke="#2ec4b6" />
    <text class="legend-text" x="${width - 210}" y="${margin.top + 29}">Safe envelope</text>
    <line class="curve" x1="${width - 236}" y1="${margin.top + 48}" x2="${width - 218}" y2="${margin.top + 48}" />
    <text class="legend-text" x="${width - 210}" y="${margin.top + 52}">Estimated demand curve</text>
  `;
}

function refreshUI() {
  renderCards();
  updateSummary();
  drawEnvelopeGraph();
}

bindEvents();
refreshUI();
