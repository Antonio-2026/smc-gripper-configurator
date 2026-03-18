const grippers = [
  { model: "RMHZ2", type: "pneumatica", fingers: 2, allows_parallel: true, external_per_finger: 54.2, internal_per_finger: 72.2, reference_pressure: 0.5, compatible_shapes: ["rectangular", "square"] },
  { model: "RMHF2", type: "pneumatica", fingers: 2, allows_parallel: true, external_per_finger: 90, internal_per_finger: 90, reference_pressure: 0.5, compatible_shapes: ["rectangular", "square"] },
  { model: "RMHS3", type: "pneumatica", fingers: 3, allows_parallel: false, external_per_finger: 118, internal_per_finger: 130, reference_pressure: 0.5, compatible_shapes: ["rectangular", "square"] },
  {
    model: "MHM-25D-X7400A",
    type: "magnetica",
    fingers: 0,
    allows_parallel: true,
    grip_force: {
      by_thickness: [
        { thickness_mm: 2, force_N: 160 },
        { thickness_mm: 6, force_N: 200 },
      ],
    },
    pressure: { min: 0.2, max: 0.6 },
    mass_kg: 0.59,
    compatible_shapes: ["flat", "cylindrical"],
  },
];

const defaultsByType = {
  pneumatica: { workpieceShape: "rectangular", parallelMode: "enabled", gripperCount: 1, friction: 0.2, mode: "external", offset: 0, pressure: 0.5 },
  magnetica: { workpieceShape: "flat", parallelMode: "enabled", gripperCount: 1, thickness: 2, material: "Aço", pressure: 0.5 },
};

let selectedType = "pneumatica";
let selectedGripper = null;
let lastChartKey = "";

const form = document.getElementById("configForm");
const technologySelectorEl = document.getElementById("technologySelector");
const gripperCardsEl = document.getElementById("gripperCards");
const selectedModelEl = document.getElementById("selectedModel");
const requiredForceEl = document.getElementById("requiredForce");
const availableForceEl = document.getElementById("availableForce");
const safetyMarginEl = document.getElementById("safetyMargin");
const resultTagEl = document.getElementById("resultTag");
const recommendationEl = document.getElementById("recommendation");
const comparisonTableBodyEl = document.getElementById("comparisonTableBody");
const parallelModeEl = document.getElementById("parallelMode");
const parallelModeFieldEl = document.getElementById("parallelModeField");
const gripperCountEl = document.getElementById("gripperCount");
const gripperCountFieldEl = document.getElementById("gripperCountField");
const pressureFieldEl = document.getElementById("pressureField");
const workpieceShapeEl = document.getElementById("workpieceShape");
const rectangularDimensionsEl = document.getElementById("rectangularDimensions");
const cylindricalDimensionsEl = document.getElementById("cylindricalDimensions");
const widthEl = document.getElementById("width");
const heightEl = document.getElementById("height");
const diameterEl = document.getElementById("diameter");
const frictionFieldEl = document.getElementById("frictionField");
const modeFieldEl = document.getElementById("modeField");
const offsetFieldEl = document.getElementById("offsetField");
const thicknessFieldEl = document.getElementById("thicknessField");
const materialFieldEl = document.getElementById("materialField");
const materialWarningEl = document.getElementById("materialWarning");
const geometryCompatibilityMessageEl = document.getElementById("geometryCompatibilityMessage");

const chart = new Chart(document.getElementById("forceChart"), {
  type: "line",
  data: {
    labels: [],
    datasets: [
      { label: "Curva da garra (N)", data: [], borderColor: "#0072ce", backgroundColor: "rgba(0,114,206,0.10)", fill: true, tension: 0.2, pointRadius: 2 },
      { label: "Ponto atual", data: [], borderColor: "#f59e0b", backgroundColor: "#f59e0b", showLine: false, pointRadius: 6 },
    ],
  },
  options: {
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { title: { display: true, text: "Pressão (MPa)" } },
      y: { beginAtZero: true, title: { display: true, text: "Força (N)" } },
    },
    plugins: { legend: { labels: { boxWidth: 12 } } },
  },
});

function isMagneticType(type = selectedType) {
  return type === "magnetica";
}

function isMagneticGripper(gripper) {
  return gripper?.type === "magnetica";
}

function getInputs() {
  return {
    type: selectedType,
    workpieceShape: workpieceShapeEl.value,
    width: Number(widthEl.value),
    height: Number(heightEl.value),
    diameter: Number(diameterEl.value),
    mass: Number(document.getElementById("mass").value),
    friction: Number(document.getElementById("friction").value),
    safetyFactor: Number(document.getElementById("safetyFactor").value),
    pressure: Number(document.getElementById("pressure").value),
    mode: document.getElementById("mode").value,
    offset: Number(document.getElementById("offset").value),
    parallelMode: parallelModeEl.value,
    gripperCount: Number(gripperCountEl.value),
    thickness: Number(document.getElementById("thickness").value),
    material: document.getElementById("material").value.trim(),
  };
}

function getAllowedShapes(type = selectedType) {
  return isMagneticType(type) ? ["flat", "cylindrical"] : ["rectangular", "square"];
}

function syncShapeOptions() {
  const allowedShapes = new Set(getAllowedShapes());

  Array.from(workpieceShapeEl.options).forEach((option) => {
    const allowed = allowedShapes.has(option.value);
    option.hidden = !allowed;
    option.disabled = !allowed;
  });

  if (!allowedShapes.has(workpieceShapeEl.value)) {
    [workpieceShapeEl.value] = allowedShapes;
  }
}

function getCompatibleGrippers(type, workpieceShape) {
  return grippers.filter((gripper) => gripper.type === type && (!gripper.compatible_shapes || gripper.compatible_shapes.includes(workpieceShape)));
}

function syncGeometryFields() {
  const shape = workpieceShapeEl.value;
  const showRectangularDimensions = shape === "rectangular" || shape === "square";
  const showDiameter = shape === "cylindrical";

  rectangularDimensionsEl.classList.toggle("is-hidden", !showRectangularDimensions);
  cylindricalDimensionsEl.classList.toggle("is-hidden", !showDiameter);
  widthEl.disabled = !showRectangularDimensions;
  heightEl.disabled = !showRectangularDimensions;
  diameterEl.disabled = !showDiameter;
}

function syncGripperSpecificFields() {
  const isMagnetic = isMagneticType();

  frictionFieldEl.classList.toggle("is-hidden", isMagnetic);
  modeFieldEl.classList.toggle("is-hidden", isMagnetic);
  offsetFieldEl.classList.toggle("is-hidden", isMagnetic);
  parallelModeFieldEl.classList.toggle("is-hidden", isMagnetic);
  thicknessFieldEl.classList.toggle("is-hidden", !isMagnetic);
  materialFieldEl.classList.toggle("is-hidden", !isMagnetic);
  materialWarningEl.classList.toggle("is-hidden", !isMagnetic);
  pressureFieldEl.classList.toggle("is-hidden", false);
  gripperCountFieldEl.classList.toggle("is-hidden", false);

  document.getElementById("friction").disabled = isMagnetic;
  document.getElementById("mode").disabled = isMagnetic;
  document.getElementById("offset").disabled = isMagnetic;
  parallelModeEl.disabled = isMagnetic;
  document.getElementById("thickness").disabled = !isMagnetic;
  document.getElementById("material").disabled = !isMagnetic;
}

function getPerFingerForce(gripper, mode) {
  return mode === "internal" ? gripper.internal_per_finger : gripper.external_per_finger;
}

function getSafetyMarginClass(marginPercent) {
  if (marginPercent < 0) return "margin-danger";
  if (marginPercent <= 20) return "margin-warning";
  return "margin-safe";
}

function interpolateForceByThickness(byThickness, thickness) {
  const sortedPoints = [...byThickness].sort((a, b) => a.thickness_mm - b.thickness_mm);
  if (thickness <= sortedPoints[0].thickness_mm) return sortedPoints[0].force_N;

  const lastPoint = sortedPoints[sortedPoints.length - 1];
  if (thickness >= lastPoint.thickness_mm) return lastPoint.force_N;

  for (let index = 0; index < sortedPoints.length - 1; index += 1) {
    const currentPoint = sortedPoints[index];
    const nextPoint = sortedPoints[index + 1];

    if (thickness >= currentPoint.thickness_mm && thickness <= nextPoint.thickness_mm) {
      return currentPoint.force_N + ((nextPoint.force_N - currentPoint.force_N) * (thickness - currentPoint.thickness_mm)) / (nextPoint.thickness_mm - currentPoint.thickness_mm);
    }
  }

  return lastPoint.force_N;
}

function calculateRequiredForce(values) {
  const weight = values.mass * 9.81;

  if (isMagneticType(values.type)) {
    return values.safetyFactor * weight;
  }

  return values.safetyFactor * (weight / values.friction) * (1 + values.offset / 20);
}

function calculateForGripper(gripper, values) {
  const requiredForce = calculateRequiredForce(values);

  if (isMagneticGripper(gripper)) {
    const baseAvailableForce = interpolateForceByThickness(gripper.grip_force.by_thickness, values.thickness);
    const availableForce = baseAvailableForce * Math.max(1, values.gripperCount);
    const marginPercent = requiredForce === 0 ? 0 : ((availableForce - requiredForce) / requiredForce) * 100;

    return {
      model: gripper.model,
      type: gripper.type,
      fingers: gripper.fingers,
      requiredForce,
      availableForce,
      excessForce: availableForce - requiredForce,
      safe: availableForce >= requiredForce,
      marginPercent,
      effectiveGripperCount: Math.max(1, values.gripperCount),
      baseAvailableForce,
      referencePressure: null,
    };
  }

  const perFingerForce = getPerFingerForce(gripper, values.mode);
  const parallelEnabled = values.parallelMode === "enabled";
  const requestedCount = parallelEnabled ? values.gripperCount : 1;
  const effectiveGripperCount = gripper.fingers === 3 || !gripper.allows_parallel ? 1 : requestedCount;
  const baseAvailableForce = perFingerForce * gripper.fingers;
  const availableForce = baseAvailableForce * (values.pressure / gripper.reference_pressure) * effectiveGripperCount;
  const marginPercent = requiredForce === 0 ? 0 : ((availableForce - requiredForce) / requiredForce) * 100;

  return {
    model: gripper.model,
    type: gripper.type,
    fingers: gripper.fingers,
    requiredForce,
    availableForce,
    excessForce: availableForce - requiredForce,
    safe: availableForce >= requiredForce,
    marginPercent,
    effectiveGripperCount,
    baseAvailableForce,
    referencePressure: gripper.reference_pressure,
  };
}

function buildPressureCurve(result, referencePressure) {
  const pressureSteps = [];
  const forceSteps = [];

  if (!referencePressure) {
    for (let pressure = 0.1; pressure <= 0.700001; pressure += 0.05) {
      const roundedPressure = Number(pressure.toFixed(2));
      pressureSteps.push(roundedPressure);
      forceSteps.push(result.baseAvailableForce * result.effectiveGripperCount);
    }

    return { pressureSteps, forceSteps };
  }

  for (let pressure = 0.1; pressure <= 0.700001; pressure += 0.05) {
    const roundedPressure = Number(pressure.toFixed(2));
    pressureSteps.push(roundedPressure);
    forceSteps.push(result.baseAvailableForce * (roundedPressure / referencePressure) * result.effectiveGripperCount);
  }

  return { pressureSteps, forceSteps };
}

function renderTechnologyCards() {
  Array.from(technologySelectorEl.querySelectorAll("[data-type]")).forEach((button) => {
    button.classList.toggle("selected", button.dataset.type === selectedType);
  });
}

function renderCards(availableGrippers, bestModel) {
  const cardsMarkup = availableGrippers
    .map((gripper) => {
      const classes = ["gripper-card"];
      if (selectedGripper?.model === gripper.model) classes.push("selected");
      if (bestModel === gripper.model) classes.push("recommended");

      return `
        <button type="button" class="${classes.join(" ")}" data-model="${gripper.model}">
          <div class="card-head">
            <h3>${gripper.model}</h3>
          </div>
          ${bestModel === gripper.model ? '<span class="badge">Melhor opção</span>' : ""}
          <div class="card-body">
            <p>${isMagneticGripper(gripper) ? "Magnética" : `${gripper.fingers} dedos`}</p>
            <p>${isMagneticGripper(gripper) ? "Garras em paralelo: Sim" : `Paralelo: ${gripper.allows_parallel ? "Sim" : "Não"}`}</p>
          </div>
        </button>`;
    })
    .join("");

  gripperCardsEl.innerHTML = cardsMarkup;
}

function renderTable(results, bestModel) {
  const approved = results.filter((result) => result.safe);

  if (!approved.length) {
    comparisonTableBodyEl.innerHTML = '<tr><td colspan="7">Nenhuma garra aprovada para os parâmetros atuais.</td></tr>';
    return;
  }

  comparisonTableBodyEl.innerHTML = approved
    .map(
      (result) => `
        <tr class="${result.model === bestModel ? "best-row" : ""}">
          <td>${result.model}</td>
          <td>${result.type === "magnetica" ? "—" : result.fingers}</td>
          <td>${result.availableForce.toFixed(2)}</td>
          <td>${result.requiredForce.toFixed(2)}</td>
          <td>${result.excessForce.toFixed(2)}</td>
          <td class="${getSafetyMarginClass(result.marginPercent)}">${result.marginPercent.toFixed(1)}%</td>
          <td>APROVADO</td>
        </tr>`,
    )
    .join("");
}

function syncParallelControlsForSelection() {
  if (isMagneticType()) {
    parallelModeEl.value = "enabled";
    parallelModeEl.disabled = true;
    gripperCountEl.disabled = false;
    return;
  }

  if (!selectedGripper) {
    parallelModeEl.disabled = false;
    gripperCountEl.disabled = parallelModeEl.value !== "enabled";
    return;
  }

  const onlySingle = selectedGripper.fingers === 3 || !selectedGripper.allows_parallel;
  if (onlySingle) {
    parallelModeEl.value = "disabled";
    parallelModeEl.disabled = true;
    gripperCountEl.value = 1;
    gripperCountEl.disabled = true;
    return;
  }

  parallelModeEl.disabled = false;
  gripperCountEl.disabled = parallelModeEl.value !== "enabled";
}

function setNoSelectionState(message = "Selecione uma garra para iniciar.") {
  selectedModelEl.textContent = "—";
  requiredForceEl.textContent = "0.00 N";
  availableForceEl.textContent = "0.00 N";
  safetyMarginEl.textContent = "0.00%";
  safetyMarginEl.className = "metric-value";
  resultTagEl.textContent = "—";
  resultTagEl.className = "validation";
  recommendationEl.textContent = message;
  recommendationEl.classList.remove("is-safe");
  comparisonTableBodyEl.innerHTML = `<tr><td colspan="7">${message}</td></tr>`;
}

function updateChart(selectedResult, pressure, referencePressure) {
  const curve = buildPressureCurve(selectedResult, referencePressure);
  const currentPointPressure = referencePressure ? pressure : 0.1;
  const currentPoint = curve.pressureSteps.map((item) => (Math.abs(item - currentPointPressure) < 0.026 ? selectedResult.availableForce : null));
  const chartKey = JSON.stringify([curve.pressureSteps, curve.forceSteps, currentPoint]);

  if (chartKey === lastChartKey) return;

  chart.data.labels = curve.pressureSteps;
  chart.data.datasets[0].data = curve.forceSteps;
  chart.data.datasets[1].data = currentPoint;
  chart.update("none");
  lastChartKey = chartKey;
}

function applyTypeDefaults(type) {
  const defaults = defaultsByType[type];
  selectedType = type;
  workpieceShapeEl.value = defaults.workpieceShape;
  parallelModeEl.value = defaults.parallelMode;
  gripperCountEl.value = defaults.gripperCount;
  document.getElementById("friction").value = defaults.friction ?? document.getElementById("friction").value;
  document.getElementById("mode").value = defaults.mode ?? document.getElementById("mode").value;
  document.getElementById("offset").value = defaults.offset ?? document.getElementById("offset").value;
  document.getElementById("thickness").value = defaults.thickness ?? document.getElementById("thickness").value;
  document.getElementById("material").value = defaults.material ?? document.getElementById("material").value;
  document.getElementById("pressure").value = defaults.pressure ?? document.getElementById("pressure").value;
  geometryCompatibilityMessageEl.textContent = "";
  selectedGripper = null;
}

function updateUI() {
  const values = getInputs();
  const isMagnetic = isMagneticType(values.type);
  const hasInvalidValues = values.pressure <= 0 || values.mass < 0 || values.thickness <= 0 || values.gripperCount <= 0 || values.safetyFactor < 1 || (!isMagnetic && values.friction <= 0);
  if (hasInvalidValues) return;

  const compatibleGrippers = getCompatibleGrippers(values.type, values.workpieceShape);
  if (selectedGripper && !compatibleGrippers.some((gripper) => gripper.model === selectedGripper.model)) {
    selectedGripper = null;
    geometryCompatibilityMessageEl.textContent = "A garra selecionada não é compatível com o formato da peça.";
  } else if (!compatibleGrippers.length) {
    geometryCompatibilityMessageEl.textContent = "Não há modelos compatíveis com esta combinação.";
  } else {
    geometryCompatibilityMessageEl.textContent = "";
  }

  const results = compatibleGrippers.map((gripper) => calculateForGripper(gripper, values));
  const approved = results.filter((result) => result.safe).sort((a, b) => a.excessForce - b.excessForce);
  const best = approved[0] || null;

  if (!selectedGripper && compatibleGrippers.length) {
    selectedGripper = compatibleGrippers.find((gripper) => gripper.model === (best?.model || compatibleGrippers[0].model)) || null;
  }

  renderTechnologyCards();
  syncShapeOptions();
  syncGeometryFields();
  syncGripperSpecificFields();
  syncParallelControlsForSelection();
  renderCards(compatibleGrippers, best?.model || null);

  if (!selectedGripper) {
    setNoSelectionState(best ? `Melhor opção disponível: ${best.model}.` : "Nenhuma garra aprovada para os parâmetros atuais.");
    renderTable(results, best?.model || null);
    return;
  }

  const selectedResult = results.find((result) => result.model === selectedGripper.model);
  if (!selectedResult) {
    setNoSelectionState();
    return;
  }

  selectedModelEl.textContent = `${selectedResult.model} (${selectedResult.effectiveGripperCount} garra${selectedResult.effectiveGripperCount > 1 ? "s" : ""})`;
  requiredForceEl.textContent = `${selectedResult.requiredForce.toFixed(2)} N`;
  availableForceEl.textContent = `${selectedResult.availableForce.toFixed(2)} N`;
  safetyMarginEl.textContent = `${selectedResult.marginPercent.toFixed(1)}%`;
  safetyMarginEl.className = `metric-value ${getSafetyMarginClass(selectedResult.marginPercent)}`;
  resultTagEl.textContent = selectedResult.safe ? "APROVADO" : "REPROVADO";
  resultTagEl.className = `validation ${selectedResult.safe ? "safe" : "not-safe"}`;

  recommendationEl.textContent = best
    ? `Melhor opção em ${isMagnetic ? "garras magnéticas" : "garras pneumáticas"}: ${best.model} com excesso mínimo de ${best.excessForce.toFixed(2)} N.`
    : "Nenhuma garra APROVADA para os parâmetros atuais.";
  recommendationEl.classList.toggle("is-safe", Boolean(best));

  updateChart(selectedResult, values.pressure, selectedResult.referencePressure);
  renderTable(results, best?.model || null);
}

function handleFormChange(event) {
  if (event.target.id === "workpieceShape") syncGeometryFields();
  if (event.target.id === "parallelMode") {
    gripperCountEl.disabled = parallelModeEl.value !== "enabled";
    if (parallelModeEl.value === "disabled") gripperCountEl.value = 1;
  }
  updateUI();
}

function handleCardSelection(event) {
  const trigger = event.target.closest("[data-model]");
  if (!trigger) return;

  selectedGripper = grippers.find((gripper) => gripper.model === trigger.dataset.model && gripper.type === selectedType) || null;
  updateUI();
}

function handleTypeSelection(event) {
  const trigger = event.target.closest("[data-type]");
  if (!trigger || trigger.dataset.type === selectedType) return;

  applyTypeDefaults(trigger.dataset.type);
  syncShapeOptions();
  syncGeometryFields();
  updateUI();
}

function init() {
  applyTypeDefaults(selectedType);
  renderTechnologyCards();
  syncShapeOptions();
  syncGeometryFields();
  syncGripperSpecificFields();
  technologySelectorEl.addEventListener("click", handleTypeSelection);
  gripperCardsEl.addEventListener("click", handleCardSelection);
  form.addEventListener("input", updateUI);
  form.addEventListener("change", handleFormChange);
  updateUI();
}

init();
