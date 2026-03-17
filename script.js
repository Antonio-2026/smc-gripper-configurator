const grippers = [
  { model: "RMHZ2", fingers: 2, allows_parallel: true, external_per_finger: 54.2, internal_per_finger: 72.2, reference_pressure: 0.5 },
  { model: "RMHF2", fingers: 2, allows_parallel: true, external_per_finger: 90, internal_per_finger: 90, reference_pressure: 0.5 },
  { model: "RMHS3", fingers: 3, allows_parallel: false, external_per_finger: 118, internal_per_finger: 130, reference_pressure: 0.5 },
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
const generatePdfBtnEl = document.getElementById("generatePdfBtn");

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
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { title: { display: true, text: "Pressão (MPa)" } },
      y: { beginAtZero: true, title: { display: true, text: "Força (N)" } },
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
  if (workpieceShape === "cylindrical") return grippers.filter((g) => g.fingers === 3);
  return grippers.filter((g) => g.fingers === 2);
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
  let fRequired = values.safetyFactor * (weight / values.friction);
  fRequired = fRequired * (1 + values.offset / 20);

  const parallelEnabled = values.parallelMode === "enabled";
  const requestedCount = parallelEnabled ? values.gripperCount : 1;
  const effectiveGripperCount = gripper.fingers === 3 || !gripper.allows_parallel ? 1 : requestedCount;

  let fAvailable = perFingerForce * gripper.fingers;
  fAvailable = fAvailable * (values.pressure / 0.5);
  fAvailable = fAvailable * effectiveGripperCount;

  const marginPercent = ((fAvailable - fRequired) / fRequired) * 100;

  return {
    model: gripper.model,
    fingers: gripper.fingers,
    mode: values.mode,
    perFingerForce,
    fRequired,
    fAvailable,
    excessForce: fAvailable - fRequired,
    safe: fAvailable >= fRequired,
    marginPercent,
    effectiveGripperCount,
    baseAvailableForce: perFingerForce * gripper.fingers,
  };
}

function buildPressureCurve(result) {
  const pressureSteps = [];
  const forceSteps = [];
  for (let pressure = 0.1; pressure <= 0.700001; pressure += 0.05) {
    pressureSteps.push(Number(pressure.toFixed(2)));
    forceSteps.push(result.baseAvailableForce * (pressure / 0.5) * result.effectiveGripperCount);
  }
  return { pressureSteps, forceSteps };
}

function renderCards(availableGrippers, bestModel) {
  gripperCardsEl.innerHTML = "";
  availableGrippers.forEach((gripper) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "gripper-card";
    if (selectedGripper?.model === gripper.model) card.classList.add("selected");
    if (bestModel === gripper.model) card.classList.add("recommended");
    card.innerHTML = `
      <div class="card-head"><strong>${gripper.model}</strong>${bestModel === gripper.model ? '<span class="badge">Melhor opção</span>' : ""}</div>
      <div class="card-body"><span>${gripper.fingers} dedos</span><span>Paralelo: ${gripper.allows_parallel ? "Sim" : "Não"}</span></div>
    `;
    card.addEventListener("click", () => {
      selectedGripper = gripper;
      updateUI();
    });
    gripperCardsEl.appendChild(card);
  });
}

function renderTable(results, bestModel) {
  const approved = results.filter((r) => r.safe);
  comparisonTableBodyEl.innerHTML = "";
  if (!approved.length) {
    comparisonTableBodyEl.innerHTML = '<tr><td colspan="7">Nenhuma garra aprovada para os parâmetros atuais.</td></tr>';
    return;
  }
  approved.forEach((result) => {
    const row = document.createElement("tr");
    if (result.model === bestModel) row.classList.add("best-row");
    row.innerHTML = `
      <td>${result.model}</td>
      <td>${result.fingers}</td>
      <td>${result.fAvailable.toFixed(2)}</td>
      <td>${result.fRequired.toFixed(2)}</td>
      <td>${result.excessForce.toFixed(2)}</td>
      <td class="${getSafetyMarginClass(result.marginPercent)}">${result.marginPercent.toFixed(1)}%</td>
      <td>APROVADO</td>`;
    comparisonTableBodyEl.appendChild(row);
  });
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
  } else {
    parallelModeEl.disabled = false;
    gripperCountEl.disabled = parallelModeEl.value !== "enabled";
  }
}

function setNoSelectionState() {
  selectedModelEl.textContent = "—";
  requiredForceEl.textContent = "0.00 N";
  availableForceEl.textContent = "0.00 N";
  safetyMarginEl.textContent = "0.00%";
  safetyMarginEl.className = "metric-value";
  resultTagEl.textContent = "—";
  resultTagEl.className = "result-tag";
  recommendationEl.textContent = "Selecione uma garra para iniciar.";
  recommendationEl.classList.remove("is-safe");
  comparisonTableBodyEl.innerHTML = '<tr><td colspan="7">Selecione uma garra para iniciar.</td></tr>';
}

function updateReportPayload(values, selectedResult) {
  reportPayload = {
    tipoPeca: values.workpieceShape === "cylindrical" ? "Cilíndrica" : values.workpieceShape === "square" ? "Quadrada" : "Retangular",
    dimensoes: values.workpieceShape === "cylindrical" ? `Diâmetro: ${values.diameter} mm` : `Largura: ${values.width} mm, Altura: ${values.height} mm`,
    massa: `${values.mass} kg`,
    atrito: values.friction,
    seguranca: values.safetyFactor,
    pressao: `${values.pressure} MPa`,
    distancia: `${values.offset} mm`,
    modelo: selectedResult.model,
    dedos: selectedResult.fingers,
    modo: values.mode === "internal" ? "Interna" : "Externa",
    forcaDedo: `${selectedResult.perFingerForce.toFixed(2)} N`,
    forcaTotal: `${selectedResult.fAvailable.toFixed(2)} N`,
    forcaNecessaria: `${selectedResult.fRequired.toFixed(2)} N`,
    margem: `${selectedResult.marginPercent.toFixed(1)}%`,
    validacao: selectedResult.safe ? "APROVADO" : "REPROVADO",
  };
}

async function generatePdfReport() {
  if (!reportPayload) return;
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const logo = document.querySelector(".smc-logo");

  pdf.setFontSize(15);
  pdf.text("Relatório de Validação de Garra para Cobots", 14, 16);

  if (logo) {
    const logoCanvas = await html2canvas(logo, { backgroundColor: null, scale: 2 });
    const logoData = logoCanvas.toDataURL("image/png");
    pdf.addImage(logoData, "PNG", pageWidth - 46, 8, 32, 9);
  }

  let y = 30;
  pdf.setFontSize(12);
  pdf.text("1. DADOS DA APLICAÇÃO", 14, y);
  y += 7;
  pdf.setFontSize(10);
  [
    `Tipo de peça: ${reportPayload.tipoPeca}`,
    `Dimensões: ${reportPayload.dimensoes}`,
    `Massa: ${reportPayload.massa}`,
    `Coeficiente de atrito: ${reportPayload.atrito}`,
    `Fator de segurança: ${reportPayload.seguranca}`,
    `Pressão: ${reportPayload.pressao}`,
    `Distância de pega (L): ${reportPayload.distancia}`,
  ].forEach((line) => {
    pdf.text(line, 14, y);
    y += 5;
  });

  y += 3;
  pdf.setFontSize(12);
  pdf.text("2. GARRA", 14, y);
  y += 7;
  pdf.setFontSize(10);
  [
    `Modelo: ${reportPayload.modelo}`,
    `Nº de dedos: ${reportPayload.dedos}`,
    `Tipo de pega: ${reportPayload.modo}`,
    `Força por dedo: ${reportPayload.forcaDedo}`,
    `Força total: ${reportPayload.forcaTotal}`,
  ].forEach((line) => {
    pdf.text(line, 14, y);
    y += 5;
  });

  y += 3;
  pdf.setFontSize(12);
  pdf.text("3. RESULTADOS", 14, y);
  y += 7;
  pdf.setFontSize(10);
  [
    `Força necessária: ${reportPayload.forcaNecessaria}`,
    `Força disponível: ${reportPayload.forcaTotal}`,
    `Margem: ${reportPayload.margem}`,
    `Validação: ${reportPayload.validacao}`,
  ].forEach((line) => {
    pdf.text(line, 14, y);
    y += 5;
  });

  y += 3;
  pdf.setFontSize(12);
  pdf.text("4. GRÁFICO", 14, y);
  y += 4;
  const chartCanvas = document.getElementById("forceChart");
  const graphData = chartCanvas.toDataURL("image/png", 1.0);
  pdf.addImage(graphData, "PNG", 14, y, 182, 62);

  pdf.setFontSize(9);
  pdf.text("Os resultados são indicativos e devem ser validados conforme aplicação real.", 14, 288);
  pdf.save("relatorio-validacao-garra.pdf");
}

function updateUI() {
  const values = getInputs();
  if (values.friction <= 0 || values.pressure <= 0 || values.mass < 0) return;

  const compatibleGrippers = getCompatibleGrippers(values.workpieceShape);
  if (selectedGripper && !compatibleGrippers.some((g) => g.model === selectedGripper.model)) {
    selectedGripper = null;
    geometryCompatibilityMessageEl.textContent = "A garra selecionada não é compatível com o formato da peça.";
  } else {
    geometryCompatibilityMessageEl.textContent = "";
  }

  syncParallelControlsForSelection();

  const results = compatibleGrippers.map((g) => calculateForGripper(g, values));
  const approved = results.filter((r) => r.safe).sort((a, b) => a.excessForce - b.excessForce);
  const best = approved[0] || null;

  renderCards(compatibleGrippers, best?.model || null);

  if (!selectedGripper) {
    setNoSelectionState();
    return;
  }

  const selectedResult = results.find((r) => r.model === selectedGripper.model);
  if (!selectedResult) {
    setNoSelectionState();
    return;
  }

  selectedModelEl.textContent = `${selectedResult.model} (${selectedResult.effectiveGripperCount} garra${selectedResult.effectiveGripperCount > 1 ? "s" : ""})`;
  requiredForceEl.textContent = `${selectedResult.fRequired.toFixed(2)} N`;
  availableForceEl.textContent = `${selectedResult.fAvailable.toFixed(2)} N`;
  safetyMarginEl.textContent = `${selectedResult.marginPercent.toFixed(1)}%`;
  safetyMarginEl.className = `metric-value ${getSafetyMarginClass(selectedResult.marginPercent)}`;
  resultTagEl.textContent = selectedResult.safe ? "APROVADO" : "REPROVADO";
  resultTagEl.className = `result-tag ${selectedResult.safe ? "safe" : "unsafe"}`;

  const curve = buildPressureCurve(selectedResult);
  chart.data.labels = curve.pressureSteps;
  chart.data.datasets[0].data = curve.forceSteps;
  chart.data.datasets[1].data = curve.pressureSteps.map((p) => (Math.abs(p - values.pressure) < 0.026 ? selectedResult.fAvailable : null));
  chart.update();

  recommendationEl.textContent = best
    ? `Melhor opção: ${best.model} (menor excesso de força: ${best.excessForce.toFixed(2)} N)`
    : "Nenhuma garra APROVADA para os parâmetros atuais.";
  recommendationEl.classList.toggle("is-safe", Boolean(best));

  renderTable(results, best?.model || null);
  updateReportPayload(values, selectedResult);
}

function init() {
  syncGeometryFields();
  renderCards(getCompatibleGrippers(workpieceShapeEl.value), null);

  form.addEventListener("input", updateUI);
  form.addEventListener("change", (event) => {
    if (event.target.id === "workpieceShape") syncGeometryFields();
    if (event.target.id === "parallelMode") {
      gripperCountEl.disabled = parallelModeEl.value !== "enabled";
      if (parallelModeEl.value === "disabled") gripperCountEl.value = 1;
    }
    updateUI();
  });

  generatePdfBtnEl.addEventListener("click", generatePdfReport);
  updateUI();
}

init();
