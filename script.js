const grippers = [
  { model: "RMHZ2", type: "pneumatica", fingers: 2, allows_parallel: true, external_per_finger: 54.2, internal_per_finger: 72.2, reference_pressure: 0.5 },
  { model: "RMHF2", type: "pneumatica", fingers: 2, allows_parallel: true, external_per_finger: 90, internal_per_finger: 90, reference_pressure: 0.5 },
  { model: "RMHS3", type: "pneumatica", fingers: 3, allows_parallel: false, external_per_finger: 118, internal_per_finger: 130, reference_pressure: 0.5 },
  {
    model: "MHM-25D-X7400A",
    type: "magnetica",
    fingers: 0,
    allows_parallel: false,
    grip_force: {
      by_thickness: [
        { thickness_mm: 2, force_N: 160 },
        { thickness_mm: 6, force_N: 200 },
      ],
    },
    pressure: { min: 0.2, max: 0.6 },
    mass_kg: 0.59,
    compatible_shapes: ["rectangular", "square"],
  },
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
const frictionFieldEl = document.getElementById("frictionField");
const modeFieldEl = document.getElementById("modeField");
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
    thickness: Number(document.getElementById("thickness").value),
    material: document.getElementById("material").value.trim(),
  };
}

function isMagneticGripper(gripper) {
  return gripper?.type === "magnetica";
}

function getCompatibleGrippers(workpieceShape) {
  return grippers.filter((gripper) => {
    if (isMagneticGripper(gripper)) {
      return !gripper.compatible_shapes || gripper.compatible_shapes.includes(workpieceShape);
    }

    return workpieceShape === "cylindrical" ? gripper.fingers === 3 : gripper.fingers === 2;
  });
}

function syncGeometryFields() {
  const isCylindrical = workpieceShapeEl.value === "cylindrical";
  rectangularDimensionsEl.classList.toggle("is-hidden", isCylindrical);
  cylindricalDimensionsEl.classList.toggle("is-hidden", !isCylindrical);
  widthEl.disabled = isCylindrical;
  heightEl.disabled = isCylindrical;
  diameterEl.disabled = !isCylindrical;
}

function syncGripperSpecificFields() {
  const isMagnetic = isMagneticGripper(selectedGripper);

  frictionFieldEl.classList.toggle("is-hidden", isMagnetic);
  modeFieldEl.classList.toggle("is-hidden", isMagnetic);
  thicknessFieldEl.classList.toggle("is-hidden", !isMagnetic);
  materialFieldEl.classList.toggle("is-hidden", !isMagnetic);
  materialWarningEl.classList.toggle("is-hidden", !isMagnetic);

  document.getElementById("friction").disabled = isMagnetic;
  document.getElementById("mode").disabled = isMagnetic;
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
  return values.safetyFactor * (weight / values.friction) * (1 + values.offset / 20);
}

function calculateForGripper(gripper, values) {
  const requiredForce = calculateRequiredForce(values);

  if (isMagneticGripper(gripper)) {
    const baseAvailableForce = interpolateForceByThickness(gripper.grip_force.by_thickness, values.thickness);
    const availableForce = baseAvailableForce;
    const marginPercent = ((availableForce - requiredForce) / requiredForce) * 100;

    return {
      model: gripper.model,
      type: gripper.type,
      fingers: gripper.fingers,
      requiredForce,
      availableForce,
      excessForce: availableForce - requiredForce,
      safe: availableForce >= requiredForce,
      marginPercent,
      effectiveGripperCount: 1,
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
  const marginPercent = ((availableForce - requiredForce) / requiredForce) * 100;

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
      forceSteps.push(result.baseAvailableForce);
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
            <p>Paralelo: ${gripper.allows_parallel ? "Sim" : "Não"}</p>
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
  if (!selectedGripper) {
    parallelModeEl.disabled = false;
    gripperCountEl.disabled = parallelModeEl.value !== "enabled";
    return;
  }

  const onlySingle = isMagneticGripper(selectedGripper) || selectedGripper.fingers === 3 || !selectedGripper.allows_parallel;
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
  if (values.friction <= 0 || values.pressure <= 0 || values.mass < 0 || values.thickness <= 0) return;

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
    ? `Melhor opção: ${best.model} com excesso mínimo de ${best.excessForce.toFixed(2)} N.`
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

  selectedGripper = grippers.find((gripper) => gripper.model === trigger.dataset.model) || null;
  syncGripperSpecificFields();
  updateUI();
}

function init() {
  syncGeometryFields();
  syncGripperSpecificFields();
  gripperCardsEl.addEventListener("click", handleCardSelection);
  form.addEventListener("input", updateUI);
  form.addEventListener("change", handleFormChange);
  updateUI();
}

init();
