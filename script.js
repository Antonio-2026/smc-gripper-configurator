const grippers = [
  {
    model: "RMHZ2",
    fingers: 2,
    allows_parallel: true,
    external_per_finger: 54.2,
    internal_per_finger: 72.2,
    reference_pressure: 0.5,
  },
  {
    model: "RMHF2",
    fingers: 2,
    allows_parallel: true,
    external_per_finger: 90,
    internal_per_finger: 90,
    reference_pressure: 0.5,
  },
  {
    model: "RMHS3",
    fingers: 3,
    allows_parallel: false,
    external_per_finger: 118,
    internal_per_finger: 130,
    reference_pressure: 0.5,
  },
];

let selectedGripper = null;
let reportPayload = null;

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
      {
        label: "Força disponível (N)",
        data: [],
        borderColor: "#0072ce",
        backgroundColor: "rgba(0, 114, 206, 0.15)",
        fill: true,
        tension: 0.2,
        pointRadius: 2,
      },
      {
        label: "Ponto de operação",
        data: [],
        borderColor: "#f59e0b",
        backgroundColor: "#f59e0b",
        showLine: false,
        pointRadius: 6,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Pressão (MPa)",
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Força (N)",
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
  if (workpieceShape === "cylindrical") {
    return grippers.filter((gripper) => gripper.fingers === 3);
  }

  return grippers.filter((gripper) => gripper.fingers === 2);
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

function getSafetyMargin(fAvailable, fRequired) {
  return ((fAvailable - fRequired) / fRequired) * 100;
}

function getSafetyMarginClass(marginPercent) {
  if (marginPercent < 0) {
    return "margin-danger";
  }

  if (marginPercent <= 20) {
    return "margin-warning";
  }

  return "margin-safe";
}

function calculateForGripper(gripper, values) {
  const perFingerForce = getPerFingerForce(gripper, values.mode);
  const weight = values.mass * 9.81;
  const baseRequiredForce = values.safetyFactor * (weight / values.friction);
  const fRequired = baseRequiredForce * (1 + values.offset / 20);

  const parallelEnabled = values.parallelMode === "enabled";
  const requestedCount = parallelEnabled ? values.gripperCount : 1;
  const effectiveGripperCount = gripper.fingers === 3 || !gripper.allows_parallel ? 1 : requestedCount;

  const baseAvailableForce = perFingerForce * gripper.fingers;
  const pressureAdjustedForce = baseAvailableForce * (values.pressure / gripper.reference_pressure);
  const fAvailable = pressureAdjustedForce * effectiveGripperCount;
  const marginPercent = getSafetyMargin(fAvailable, fRequired);

  return {
    model: gripper.model,
    fingers: gripper.fingers,
    fRequired,
    fAvailable,
    excessForce: fAvailable - fRequired,
    safe: fAvailable >= fRequired,
    marginPercent,
    effectiveGripperCount,
    baseAvailableForce,
  };
}

function buildPressureCurve(result, selectedValues) {
  const pressureSteps = [];
  const forceSteps = [];

  for (let pressure = 0.1; pressure <= 0.700001; pressure += 0.05) {
    pressureSteps.push(Number(pressure.toFixed(2)));
    forceSteps.push(result.baseAvailableForce * (pressure / selectedValues.referencePressure) * result.effectiveGripperCount);
  }

  return { pressureSteps, forceSteps };
}

function renderCards(availableGrippers, bestModel) {
  gripperCardsEl.innerHTML = "";

  availableGrippers.forEach((gripper) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "gripper-card";

    if (selectedGripper?.model === gripper.model) {
      card.classList.add("selected");
    }

    if (bestModel === gripper.model) {
      card.classList.add("recommended");
    }

    const parallelLabel = gripper.allows_parallel ? "Sim" : "Não";
    card.innerHTML = `
      <div class="card-head">
        <strong>${gripper.model}</strong>
        ${bestModel === gripper.model ? '<span class="badge">Melhor opção</span>' : ""}
      </div>
      <div class="card-body">
        <span>${gripper.fingers} dedos</span>
        <span>Paralelo: ${parallelLabel}</span>
      </div>
    `;

    card.addEventListener("click", () => {
      selectedGripper = gripper;
      updateUI();
    });

    gripperCardsEl.appendChild(card);
  });
}

function renderTable(results, bestModel) {
  const validResults = results.filter((result) => result.safe);
  comparisonTableBodyEl.innerHTML = "";

  if (!validResults.length) {
    comparisonTableBodyEl.innerHTML = '<tr><td colspan="7">Nenhuma garra aprovada para os parâmetros atuais.</td></tr>';
    return;
  }

  validResults.forEach((result) => {
    const row = document.createElement("tr");
    if (result.model === bestModel) {
      row.classList.add("best-row");
    }

    row.innerHTML = `
      <td>${result.model}</td>
      <td>${result.fingers}</td>
      <td>${result.fAvailable.toFixed(2)}</td>
      <td>${result.fRequired.toFixed(2)}</td>
      <td>${result.excessForce.toFixed(2)}</td>
      <td class="${getSafetyMarginClass(result.marginPercent)}">${result.marginPercent.toFixed(1)}%</td>
      <td>APROVADO</td>
    `;

    comparisonTableBodyEl.appendChild(row);
  });
}

function syncParallelControlsForSelection() {
  if (!selectedGripper) {
    parallelModeEl.disabled = false;
    gripperCountEl.disabled = parallelModeEl.value !== "enabled";
    return;
  }

  const mustSingleGripper = selectedGripper.fingers === 3 || !selectedGripper.allows_parallel;
  if (mustSingleGripper) {
    parallelModeEl.value = "disabled";
    parallelModeEl.disabled = true;
    gripperCountEl.value = 1;
    gripperCountEl.disabled = true;
  } else {
    parallelModeEl.disabled = false;
    gripperCountEl.disabled = parallelModeEl.value !== "enabled";
    if (Number(gripperCountEl.value) < 1) {
      gripperCountEl.value = 1;
    }
  }
}

function setNoSelectionState() {
  selectedModelEl.textContent = "—";
  requiredForceEl.textContent = "0.00 N";
  availableForceEl.textContent = "0.00 N";
  safetyMarginEl.textContent = "0.00%";
  safetyMarginEl.classList.remove("margin-danger", "margin-warning", "margin-safe");
  resultTagEl.textContent = "—";
  resultTagEl.classList.remove("safe", "unsafe");
  recommendationEl.textContent = "Selecione uma garra para iniciar";
  recommendationEl.classList.remove("is-safe");
  comparisonTableBodyEl.innerHTML = '<tr><td colspan="7">Selecione uma garra para iniciar</td></tr>';
  chart.data.labels = [];
  chart.data.datasets[0].data = [];
  chart.data.datasets[1].data = [];
  chart.update();
}

function updateReportPayload(values, selectedResult) {
  reportPayload = {
    dadosDaAplicacao: {
      massaKg: values.mass,
      coeficienteAtrito: values.friction,
      fatorSeguranca: values.safetyFactor,
      distanciaPegaMm: values.offset,
      numeroGarras: selectedResult.effectiveGripperCount,
      modoPreensao: values.mode,
      operacaoParalela: values.parallelMode,
    },
    garraSelecionada: selectedResult.model,
    forcaNecessariaN: Number(selectedResult.fRequired.toFixed(2)),
    forcaDisponivelN: Number(selectedResult.fAvailable.toFixed(2)),
    margemSegurancaPercentual: Number(selectedResult.marginPercent.toFixed(2)),
    tipoPeca: values.workpieceShape,
    pressaoTrabalhoMPa: values.pressure,
  };
}

function updateUI() {
  const values = getInputs();

  if (values.friction <= 0 || values.pressure <= 0 || values.mass < 0) {
    return;
  }

  const invalidRectangularDimensions =
    values.workpieceShape !== "cylindrical" && (values.width <= 0 || values.height <= 0);
  const invalidCylindricalDimension = values.workpieceShape === "cylindrical" && values.diameter <= 0;

  if (invalidRectangularDimensions || invalidCylindricalDimension) {
    return;
  }

  const compatibleGrippers = getCompatibleGrippers(values.workpieceShape);

  if (selectedGripper && !compatibleGrippers.some((gripper) => gripper.model === selectedGripper.model)) {
    selectedGripper = null;
    geometryCompatibilityMessageEl.textContent = "A garra selecionada não é compatível com o formato da peça";
  } else {
    geometryCompatibilityMessageEl.textContent = "";
  }

  syncParallelControlsForSelection();

  const results = compatibleGrippers.map((gripper) => calculateForGripper(gripper, values));
  const safeResults = results.filter((result) => result.safe).sort((a, b) => a.excessForce - b.excessForce);
  const bestOption = safeResults[0] || null;

  renderCards(compatibleGrippers, bestOption ? bestOption.model : null);

  if (!selectedGripper) {
    setNoSelectionState();
    return;
  }

  const selectedResult = results.find((result) => result.model === selectedGripper.model);
  if (!selectedResult) {
    setNoSelectionState();
    return;
  }

  selectedModelEl.textContent = `${selectedResult.model} (${selectedResult.effectiveGripperCount} garra${
    selectedResult.effectiveGripperCount > 1 ? "s" : ""
  })`;
  requiredForceEl.textContent = `${selectedResult.fRequired.toFixed(2)} N`;
  availableForceEl.textContent = `${selectedResult.fAvailable.toFixed(2)} N`;
  safetyMarginEl.textContent = `${selectedResult.marginPercent.toFixed(1)}%`;
  safetyMarginEl.classList.remove("margin-danger", "margin-warning", "margin-safe");
  safetyMarginEl.classList.add(getSafetyMarginClass(selectedResult.marginPercent));

  resultTagEl.textContent = selectedResult.safe ? "APROVADO" : "REPROVADO";
  resultTagEl.classList.remove("safe", "unsafe");
  resultTagEl.classList.add(selectedResult.safe ? "safe" : "unsafe");

  const curveData = buildPressureCurve(selectedResult, { referencePressure: selectedGripper.reference_pressure });
  chart.data.labels = curveData.pressureSteps;
  chart.data.datasets[0].data = curveData.forceSteps;
  chart.data.datasets[1].data = curveData.pressureSteps.map((pressureValue) =>
    Math.abs(pressureValue - values.pressure) < 0.026 ? selectedResult.fAvailable : null
  );
  chart.update();

  if (bestOption) {
    recommendationEl.textContent = `Recomendação automática: ${bestOption.model} (menor excesso de força: ${bestOption.excessForce.toFixed(
      2
    )} N)`;
    recommendationEl.classList.add("is-safe");
  } else {
    recommendationEl.textContent = "Nenhuma garra APROVADA para o conjunto atual de parâmetros.";
    recommendationEl.classList.remove("is-safe");
  }

  renderTable(results, bestOption ? bestOption.model : null);
  updateReportPayload(values, selectedResult);
}

function init() {
  syncGeometryFields();
  renderCards(getCompatibleGrippers(workpieceShapeEl.value), null);

  form.addEventListener("input", updateUI);
  form.addEventListener("change", (event) => {
    if (event.target.id === "workpieceShape") {
      syncGeometryFields();
    }

    if (event.target.id === "parallelMode") {
      gripperCountEl.disabled = parallelModeEl.value !== "enabled";
      if (parallelModeEl.value !== "enabled") {
        gripperCountEl.value = 1;
      }
    }
    updateUI();
  });

  updateUI();
}

init();
