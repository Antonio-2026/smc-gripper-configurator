const grippers = [
  { model: "RMHZ2", fingers: 2, allows_parallel: true, external_per_finger: 54.2, internal_per_finger: 72.2, reference_pressure: 0.5 },
  { model: "RMHF2", fingers: 2, allows_parallel: true, external_per_finger: 90, internal_per_finger: 90, reference_pressure: 0.5 },
  { model: "RMHS3", fingers: 3, allows_parallel: false, external_per_finger: 118, internal_per_finger: 130, reference_pressure: 0.5 },
];

let selectedGripper = null;
let lastChartKey = "";

const form = document.getElementById("configForm");
const gripperCardsEl = document.getElementById("gripperCards");
const selectedModelEl = document.getElementById("selectedModel");
const requiredForceEl = document.getElementById("requiredForce");
const availableForceEl = document.getElementById("availableForce");
const safetyMarginEl = document.getElementById("safetyMargin");
const resultTagEl = document.getElementById("resultTag");
const recommendationEl = document.getElementById("recommendation");
const comparisonTableBodyEl = document.getElementById("comparisonTableBody");
const parallelModeEl = document.getElementById("parallelMode");
const gripperCountEl = document.getElementById("gripperCount");
const workpieceShapeEl = document.getElementById("workpieceShape");
const rectangularDimensionsEl = document.getElementById("rectangularDimensions");
const cylindricalDimensionsEl = document.getElementById("cylindricalDimensions");
const widthEl = document.getElementById("width");
const heightEl = document.getElementById("height");
const diameterEl = document.getElementById("diameter");
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
    plugins: {
      legend: {
        labels: {
          boxWidth: 12,
        },
      },
    },
  },
});

function getInputs() {
  return {
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
  };
}

function getCompatibleGrippers(workpieceShape) {
  return workpieceShape === "cylindrical"
    ? grippers.filter((gripper) => gripper.fingers === 3)
    : grippers.filter((gripper) => gripper.fingers === 2);
}

function syncGeometryFields() {
  const isCylindrical = workpieceShapeEl.value === "cylindrical";
  rectangularDimensionsEl.classList.toggle("is-hidden", isCylindrical);
  cylindricalDimensionsEl.classList.toggle("is-hidden", !isCylindrical);
  widthEl.disabled = isCylindrical;
  heightEl.disabled = isCylindrical;
  diameterEl.disabled = !isCylindrical;
}

function getPerFingerForce(gripper, mode) {
  return mode === "internal" ? gripper.internal_per_finger : gripper.external_per_finger;
}

function getSafetyMarginClass(marginPercent) {
  if (marginPercent < 0) return "margin-danger";
  if (marginPercent <= 20) return "margin-warning";
  return "margin-safe";
}

function calculateForGripper(gripper, values) {
  const perFingerForce = getPerFingerForce(gripper, values.mode);
  const weight = values.mass * 9.81;
  const requiredForce = values.safetyFactor * (weight / values.friction) * (1 + values.offset / 20);
  const parallelEnabled = values.parallelMode === "enabled";
  const requestedCount = parallelEnabled ? values.gripperCount : 1;
  const effectiveGripperCount = gripper.fingers === 3 || !gripper.allows_parallel ? 1 : requestedCount;
  const baseAvailableForce = perFingerForce * gripper.fingers;
  const availableForce = baseAvailableForce * (values.pressure / gripper.reference_pressure) * effectiveGripperCount;
  const marginPercent = ((availableForce - requiredForce) / requiredForce) * 100;

  return {
    model: gripper.model,
    fingers: gripper.fingers,
    requiredForce,
    availableForce,
    excessForce: availableForce - requiredForce,
    safe: availableForce >= requiredForce,
    marginPercent,
    effectiveGripperCount,
    baseAvailableForce,
  };
}

function buildPressureCurve(result, referencePressure) {
  const pressureSteps = [];
  const forceSteps = [];

  for (let pressure = 0.1; pressure <= 0.700001; pressure += 0.05) {
    const roundedPressure = Number(pressure.toFixed(2));
    pressureSteps.push(roundedPressure);
    forceSteps.push(result.baseAvailableForce * (roundedPressure / referencePressure) * result.effectiveGripperCount);
  }

  return { pressureSteps, forceSteps };
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
            <strong>${gripper.model}</strong>
            ${bestModel === gripper.model ? '<span class="badge">Melhor opção</span>' : ""}
          </div>
          <div class="card-body">
            <span>${gripper.fingers} dedos</span>
            <span>Paralelo: ${gripper.allows_parallel ? "Sim" : "Não"}</span>
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
          <td>${result.fingers}</td>
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
  const currentPoint = curve.pressureSteps.map((item) => (Math.abs(item - pressure) < 0.026 ? selectedResult.availableForce : null));
  const chartKey = JSON.stringify([curve.pressureSteps, curve.forceSteps, currentPoint]);

  if (chartKey === lastChartKey) {
    return;
  }

  chart.data.labels = curve.pressureSteps;
  chart.data.datasets[0].data = curve.forceSteps;
  chart.data.datasets[1].data = currentPoint;
  chart.update("none");
  lastChartKey = chartKey;
}

function updateUI() {
  const values = getInputs();
  if (values.friction <= 0 || values.pressure <= 0 || values.mass < 0) return;

  const compatibleGrippers = getCompatibleGrippers(values.workpieceShape);
  if (selectedGripper && !compatibleGrippers.some((gripper) => gripper.model === selectedGripper.model)) {
    selectedGripper = null;
    geometryCompatibilityMessageEl.textContent = "A garra selecionada não é compatível com o formato da peça.";
  } else {
    geometryCompatibilityMessageEl.textContent = "";
  }

  const results = compatibleGrippers.map((gripper) => calculateForGripper(gripper, values));
  const approved = results.filter((result) => result.safe).sort((a, b) => a.excessForce - b.excessForce);
  const best = approved[0] || null;

  if (!selectedGripper && best) {
    selectedGripper = compatibleGrippers.find((gripper) => gripper.model === best.model) || null;
  }

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
    ? `Melhor opção: ${best.model} com excesso mínimo de ${best.excessForce.toFixed(2)} N.`
    : "Nenhuma garra APROVADA para os parâmetros atuais.";
  recommendationEl.classList.toggle("is-safe", Boolean(best));

  updateChart(selectedResult, values.pressure, selectedGripper.reference_pressure);
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

  selectedGripper = grippers.find((gripper) => gripper.model === trigger.dataset.model) || null;
  updateUI();
}

function init() {
  syncGeometryFields();
  gripperCardsEl.addEventListener("click", handleCardSelection);
  form.addEventListener("input", updateUI);
  form.addEventListener("change", handleFormChange);
  updateUI();
}

init();
