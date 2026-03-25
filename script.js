const grippers = [
  { model: "RMHZ2", type: "pneumatica", fingers: 2, allows_parallel: true, external_per_finger: 54.2, internal_per_finger: 72.2, reference_pressure: 0.5, compatible_shapes: ["rectangular", "square"] },
  { model: "RMHF2", type: "pneumatica", fingers: 2, allows_parallel: true, external_per_finger: 90, internal_per_finger: 90, reference_pressure: 0.5, compatible_shapes: ["rectangular", "square"] },
  { model: "RMHS3", type: "pneumatica", fingers: 3, allows_parallel: false, external_per_finger: 118, internal_per_finger: 130, reference_pressure: 0.5, compatible_shapes: ["rectangular", "square", "cylindrical"] },
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
  { model: "LEHR32 Standard", type: "eletrica", mounting: "standard", fingers: 0, allows_parallel: true, compatible_shapes: ["rectangular", "square", "cylindrical"] },
  { model: "LEHR32 Longitudinal", type: "eletrica", mounting: "longitudinal", fingers: 0, allows_parallel: true, compatible_shapes: ["rectangular", "square", "cylindrical"] },
];

const ZGS_DATA = {
  "200x120": { saving: { 1: { full: 440, half: 190 }, 2: { full: 440, half: 210 } } },
  "300x180": { saving: { 1: { full: 880 }, 2: { half: 350 }, 3: { half: 357 } } },
  "400x240": { saving: { 2: { full: 2144 }, 4: { half: 752 }, 6: { half: 808 } } },
};

const ZGS_EJECTOR_OPTIONS = {
  "200x120": [1, 2],
  "300x180": [1, 2, 3],
  "400x240": [2, 4, 6],
};

const TIPOS_GARRA = {
  ELETRICA: "eletrica",
  PNEUMATICA: "pneumatica",
  VACUO: "vacuo",
};

Object.entries(ZGS_DATA).forEach(([foamSize, types]) => {
  Object.entries(types).forEach(([plateType, ejectors]) => {
    Object.keys(ejectors).forEach((ejectorCount) => {
      grippers.push({
        model: `ZGS ${foamSize} - ${ejectorCount} ejetor(es)`,
        type: "vacuo",
        fingers: 0,
        allows_parallel: true,
        foamSize,
        plateType,
        ejectors: Number(ejectorCount),
        compatible_shapes: ["flat", "rectangular", "square"],
      });
    });
  });
});

const defaultsByType = {
  pneumatica: { workpieceShape: "rectangular", parallelMode: "enabled", gripperCount: 1, friction: 0.2, mode: "external", offset: 0, pressure: 0.5 },
  magnetica: { workpieceShape: "flat", parallelMode: "enabled", gripperCount: 1, thickness: 2, material: "Aço", pressure: 0.5 },
  eletrica: { workpieceShape: "rectangular", gripperCount: 1, friction: 0.2, offset: 10, mountingType: "standard", configuredForce: 100 },
  vacuo: { workpieceShape: "flat", pressure: 0.5, foamSize: "300x180", plateType: "saving", ejectors: 2, areaPct: 1, movement: "horizontal", mass: 1.2 },
};

const ELECTRIC_FORCE_CURVES = [60, 100, 140];

let selectedType = TIPOS_GARRA.VACUO;
let selectedGripper = null;
let lastChartKey = "";

const form = document.getElementById("configForm");
const tipoGarraSelectEl = document.getElementById("tipoGarraSelect");
const gripperCardsEl = document.getElementById("gripperCards");
const selectedModelEl = document.getElementById("selectedModel");
const requiredForceEl = document.getElementById("requiredForce");
const availableForceEl = document.getElementById("availableForce");
const configuredForceResultEl = document.getElementById("configuredForceResult");
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
const mountingTypeFieldEl = document.getElementById("mountingTypeField");
const mountingTypeEl = document.getElementById("mountingType");
const configuredForceFieldEl = document.getElementById("configuredForceField");
const configuredForceEl = document.getElementById("configuredForce");
const electricTechnicalNoteEl = document.getElementById("electricTechnicalNote");
const smcWarningEl = document.getElementById("smcWarning");
const geometryCompatibilityMessageEl = document.getElementById("geometryCompatibilityMessage");
const chartTitleEl = document.getElementById("chartTitle");
const foamSizeFieldEl = document.getElementById("foamSizeField");
const plateTypeFieldEl = document.getElementById("plateTypeField");
const ejectorsFieldEl = document.getElementById("ejectorsField");
const areaPctFieldEl = document.getElementById("areaPctField");
const movementFieldEl = document.getElementById("movementField");
const foamSizeEl = document.getElementById("foamSize");
const plateTypeEl = document.getElementById("plateType");
const ejectorsEl = document.getElementById("ejectors");
const areaPctEl = document.getElementById("areaPct");
const areaPctNumberEl = document.getElementById("areaPctNumber");
const movementEl = document.getElementById("movement");
const safetyFactorFieldEl = document.getElementById("safetyFactor").closest("label");
const comparisonHeaderRowEl = document.getElementById("comparisonHeaderRow");

const chart = new Chart(document.getElementById("forceChart"), {
  type: "line",
  data: { labels: [], datasets: [] },
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

function isElectricType(type = selectedType) {
  return type === TIPOS_GARRA.ELETRICA;
}

function isVacuumType(type = selectedType) {
  return type === TIPOS_GARRA.VACUO;
}

function isMagneticGripper(gripper) {
  return gripper?.type === "magnetica";
}

function isElectricGripper(gripper) {
  return gripper?.type === TIPOS_GARRA.ELETRICA;
}

function isVacuumGripper(gripper) {
  return gripper?.type === TIPOS_GARRA.VACUO;
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
    mountingType: mountingTypeEl.value,
    configuredForce: Number(configuredForceEl.value),
    foamSize: foamSizeEl.value,
    plateType: plateTypeEl.value,
    ejectors: Number(ejectorsEl.value),
    areaPct: Number(areaPctEl.value),
    movement: movementEl.value,
  };
}

function getAllowedShapes(type = selectedType) {
  if (isVacuumType(type)) return ["flat", "rectangular", "square"];
  if (isMagneticType(type)) return ["flat", "cylindrical"];
  return ["rectangular", "square", "cylindrical"];
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

function getShapeRestriction(type, workpieceShape) {
  if (type !== TIPOS_GARRA.PNEUMATICA) return null;

  if (workpieceShape === "cylindrical") {
    return {
      message: "Cilíndricas requerem garra de 3 dedos",
      matches: (gripper) => gripper.fingers === 3,
    };
  }

  if (workpieceShape === "rectangular" || workpieceShape === "square") {
    return {
      message: "Peças planas utilizam garras paralelas (2 dedos)",
      matches: (gripper) => gripper.fingers === 2,
    };
  }

  return null;
}

function getTypeGrippers(type) {
  return grippers.filter((gripper) => gripper.type === type);
}

function isGripperCompatibleWithShape(gripper, type, workpieceShape) {
  const shapeCompatible = !gripper.compatible_shapes || gripper.compatible_shapes.includes(workpieceShape);
  const restriction = getShapeRestriction(type, workpieceShape);
  return shapeCompatible && (!restriction || restriction.matches(gripper));
}

function getCompatibleGrippers(type, workpieceShape, mountingType) {
  return getTypeGrippers(type).filter((gripper) => {
    if (type === TIPOS_GARRA.VACUO) {
      return gripper.foamSize === foamSizeEl.value && gripper.plateType === plateTypeEl.value;
    }
    const shapeCompatibility = isGripperCompatibleWithShape(gripper, type, workpieceShape);
    if (!shapeCompatibility) return false;
    if (type !== TIPOS_GARRA.ELETRICA) return true;
    return gripper.mounting === mountingType;
  });
}

function syncGeometryFields() {
  if (isVacuumType()) return;
  const shape = workpieceShapeEl.value;
  const showRectangularDimensions = shape === "rectangular" || shape === "square";
  const showDiameter = shape === "cylindrical";

  rectangularDimensionsEl.classList.toggle("is-hidden", !showRectangularDimensions);
  cylindricalDimensionsEl.classList.toggle("is-hidden", !showDiameter);
  widthEl.disabled = !showRectangularDimensions;
  heightEl.disabled = !showRectangularDimensions;
  diameterEl.disabled = !showDiameter;
}

function syncVacuumEjectorOptions() {
  const foamSize = foamSizeEl.value;
  const options = ZGS_EJECTOR_OPTIONS[foamSize] || [];
  const currentValue = Number(ejectorsEl.value);
  ejectorsEl.innerHTML = options.map((item) => `<option value="${item}">${item}</option>`).join("");
  if (!options.includes(currentValue)) {
    [ejectorsEl.value] = options;
  } else {
    ejectorsEl.value = String(currentValue);
  }
}

function syncComparisonHeader(type) {
  if (type === TIPOS_GARRA.VACUO) {
    comparisonHeaderRowEl.innerHTML = "<th>Modelo</th><th>Força (N)</th><th>Necessária (N)</th><th>Margem</th><th>Status</th>";
    return;
  }
  comparisonHeaderRowEl.innerHTML = "<th>Modelo</th><th>Dedos</th><th>Força disponível (N)</th><th>Força necessária (N)</th><th>Excesso (N)</th><th>Margem</th><th>Validação</th>";
}

function syncGripperSpecificFields() {
  const isMagnetic = isMagneticType();
  const isElectric = isElectricType();
  const isVacuum = isVacuumType();

  frictionFieldEl.classList.toggle("is-hidden", isMagnetic || isVacuum);
  modeFieldEl.classList.toggle("is-hidden", isMagnetic || isElectric || isVacuum);
  offsetFieldEl.classList.toggle("is-hidden", isMagnetic || isVacuum);
  parallelModeFieldEl.classList.toggle("is-hidden", isMagnetic || isElectric || isVacuum);
  thicknessFieldEl.classList.toggle("is-hidden", !isMagnetic);
  materialFieldEl.classList.toggle("is-hidden", !isMagnetic);
  materialWarningEl.classList.toggle("is-hidden", !isMagnetic);
  pressureFieldEl.classList.toggle("is-hidden", isElectric);
  gripperCountFieldEl.classList.toggle("is-hidden", isVacuum);
  mountingTypeFieldEl.classList.toggle("is-hidden", !isElectric);
  configuredForceFieldEl.classList.toggle("is-hidden", !isElectric);
  electricTechnicalNoteEl.classList.toggle("is-hidden", !isElectric);
  foamSizeFieldEl.classList.toggle("is-hidden", !isVacuum);
  plateTypeFieldEl.classList.toggle("is-hidden", !isVacuum);
  ejectorsFieldEl.classList.toggle("is-hidden", !isVacuum);
  areaPctFieldEl.classList.toggle("is-hidden", !isVacuum);
  movementFieldEl.classList.toggle("is-hidden", !isVacuum);
  safetyFactorFieldEl.classList.toggle("is-hidden", isVacuum);
  workpieceShapeEl.closest("label").classList.toggle("is-hidden", isVacuum);
  rectangularDimensionsEl.classList.toggle("is-hidden", isVacuum || !(workpieceShapeEl.value === "rectangular" || workpieceShapeEl.value === "square"));
  cylindricalDimensionsEl.classList.toggle("is-hidden", isVacuum || workpieceShapeEl.value !== "cylindrical");

  document.getElementById("friction").disabled = isMagnetic || isVacuum;
  document.getElementById("mode").disabled = isMagnetic || isElectric || isVacuum;
  document.getElementById("offset").disabled = isMagnetic || isVacuum;
  parallelModeEl.disabled = isMagnetic || isElectric || isVacuum;
  document.getElementById("thickness").disabled = !isMagnetic;
  document.getElementById("material").disabled = !isMagnetic;
  document.getElementById("pressure").disabled = isElectric;
  gripperCountEl.disabled = isVacuum;
  mountingTypeEl.disabled = !isElectric;
  configuredForceEl.disabled = !isElectric;
  foamSizeEl.disabled = !isVacuum;
  plateTypeEl.disabled = !isVacuum;
  ejectorsEl.disabled = !isVacuum;
  areaPctEl.disabled = !isVacuum;
  areaPctNumberEl.disabled = !isVacuum;
  movementEl.disabled = !isVacuum;
  document.getElementById("safetyFactor").disabled = isVacuum;
}

function getPerFingerForce(gripper, mode) {
  return mode === "internal" ? gripper.internal_per_finger : gripper.external_per_finger;
}

function getSafetyMarginClass(marginPercent) {
  if (marginPercent < 10) return "margin-danger";
  if (marginPercent <= 30) return "margin-warning";
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

function getReductionFactor(offsetMm) {
  if (offsetMm <= 10) return 1.0;
  if (offsetMm <= 20) return 0.9;
  if (offsetMm <= 50) return 0.6;
  if (offsetMm <= 100) return 0.4;
  return 0.35;
}

function interpolar(areaPct, full, half) {
  const x1 = 1.0;
  const y1 = full;
  const x2 = 0.5;
  const y2 = half;
  return y1 + ((y2 - y1) * (areaPct - x1)) / (x2 - x1);
}

function fatorPressao(pressure) {
  if (pressure >= 0.6) return 1;
  if (pressure >= 0.5) return 0.9;
  if (pressure >= 0.4) return 0.8;
  return 0.7;
}

function sugerirEjetores(areaPct) {
  if (areaPct < 0.4) return 6;
  if (areaPct < 0.7) return 4;
  return 2;
}

function calcularZGS(values) {
  const data = ZGS_DATA[values.foamSize]?.[values.plateType]?.[values.ejectors];
  if (!data) return { erro: "Combinação não disponível no catálogo" };

  let baseForce;
  if (values.areaPct >= 0.99 && data.full) baseForce = data.full;
  else if (values.areaPct <= 0.5 && data.half) baseForce = data.half;
  else if (data.full && data.half) baseForce = interpolar(values.areaPct, data.full, data.half);
  else baseForce = data.full || data.half;

  const correctedForce = baseForce * fatorPressao(values.pressure);
  const safetyFactor = values.movement === "vertical" ? 8 : 4;
  const requiredForce = values.mass * 9.81 * safetyFactor;
  const marginPercent = requiredForce === 0 ? 0 : ((correctedForce - requiredForce) / requiredForce) * 100;

  return { correctedForce, requiredForce, marginPercent, safe: marginPercent > 0, baseForce };
}

function calculateRequiredForce(values) {
  const weight = values.mass * 9.81;

  if (isVacuumType(values.type)) {
    return weight * (values.movement === "vertical" ? 8 : 4);
  }

  if (isElectricType(values.type)) {
    return ((values.mass * 9.81) / (2 * values.friction)) * values.safetyFactor;
  }

  if (isMagneticType(values.type)) {
    return values.safetyFactor * weight;
  }

  return values.safetyFactor * (weight / values.friction) * (1 + values.offset / 20);
}

function calculateForGripper(gripper, values) {
  if (isVacuumGripper(gripper)) {
    const zgsResult = calcularZGS({ ...values, ejectors: gripper.ejectors, foamSize: gripper.foamSize, plateType: gripper.plateType });
    if (zgsResult.erro) {
      return {
        model: gripper.model,
        type: gripper.type,
        fingers: 0,
        requiredForce: 0,
        availableForce: 0,
        excessForce: 0,
        safe: false,
        marginPercent: -100,
        effectiveGripperCount: 1,
        baseAvailableForce: 0,
        configuredForce: null,
        referencePressure: 0.6,
        forceReductionFactor: null,
      };
    }
    return {
      model: `ZGS ${gripper.foamSize} (${gripper.ejectors} ejetor${gripper.ejectors > 1 ? "es" : ""})`,
      type: gripper.type,
      fingers: 0,
      requiredForce: zgsResult.requiredForce,
      availableForce: zgsResult.correctedForce,
      excessForce: zgsResult.correctedForce - zgsResult.requiredForce,
      safe: zgsResult.safe,
      marginPercent: zgsResult.marginPercent,
      effectiveGripperCount: 1,
      baseAvailableForce: zgsResult.baseForce,
      configuredForce: null,
      referencePressure: 0.6,
      forceReductionFactor: null,
      ejectors: gripper.ejectors,
      foamSize: gripper.foamSize,
    };
  }

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
      configuredForce: null,
      referencePressure: null,
      forceReductionFactor: null,
    };
  }

  if (isElectricGripper(gripper)) {
    const reductionFactor = getReductionFactor(values.offset);
    const effectiveForce = values.configuredForce * reductionFactor;
    const availableForce = effectiveForce * Math.max(1, values.gripperCount);
    const marginPercent = requiredForce === 0 ? 0 : ((availableForce - requiredForce) / requiredForce) * 100;

    return {
      model: gripper.model,
      type: gripper.type,
      fingers: 0,
      requiredForce,
      availableForce,
      excessForce: availableForce - requiredForce,
      safe: availableForce >= requiredForce,
      marginPercent,
      effectiveGripperCount: Math.max(1, values.gripperCount),
      baseAvailableForce: effectiveForce,
      configuredForce: values.configuredForce,
      referencePressure: null,
      forceReductionFactor: reductionFactor,
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
    configuredForce: null,
    referencePressure: gripper.reference_pressure,
    forceReductionFactor: null,
  };
}

function buildPressureCurve(result, referencePressure) {
  const pressureSteps = [];
  const forceSteps = [];

  if (result.type === TIPOS_GARRA.VACUO) {
    for (let pressure = 0.3; pressure <= 0.700001; pressure += 0.05) {
      const roundedPressure = Number(pressure.toFixed(2));
      pressureSteps.push(roundedPressure);
      forceSteps.push(result.baseAvailableForce * fatorPressao(roundedPressure));
    }
    return { pressureSteps, forceSteps };
  }

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

function buildElectricCurves(values) {
  const distances = [];
  for (let distance = 0; distance <= 120; distance += 5) distances.push(distance);

  const datasets = ELECTRIC_FORCE_CURVES.map((configuredForce, index) => {
    const colors = ["#0072ce", "#16a34a", "#dc2626"];
    return {
      label: `${configuredForce} N`,
      data: distances.map((distance) => Number((configuredForce * getReductionFactor(distance)).toFixed(2))),
      borderColor: colors[index],
      backgroundColor: "transparent",
      fill: false,
      tension: 0.2,
      pointRadius: 1,
    };
  });

  datasets.push({
    label: "Ponto atual",
    data: distances.map((distance) => (distance === Math.round(values.offset / 5) * 5 ? Number((values.configuredForce * getReductionFactor(values.offset)).toFixed(2)) : null)),
    borderColor: "#f59e0b",
    backgroundColor: "#f59e0b",
    showLine: false,
    pointRadius: 6,
  });

  return { distances, datasets };
}

function renderTechnologyCards() {
  tipoGarraSelectEl.value = selectedType;
}

function renderCards(allTypeGrippers, compatibleGrippers, bestModel) {
  const compatibleModelSet = new Set(compatibleGrippers.map((gripper) => gripper.model));
  const cardsMarkup = allTypeGrippers
    .map((gripper) => {
      const isCompatible = compatibleModelSet.has(gripper.model);
      const classes = ["gripper-card"];
      if (selectedGripper?.model === gripper.model) classes.push("selected");
      if (bestModel === gripper.model) classes.push("recommended");
      if (!isCompatible) classes.push("disabled");

      let detailLabel = `${gripper.fingers} dedos`;
      if (isMagneticGripper(gripper)) detailLabel = "Magnética";
      if (isElectricGripper(gripper)) detailLabel = gripper.mounting === "standard" ? "Montagem Standard" : "Montagem Longitudinal";
      if (isVacuumGripper(gripper)) detailLabel = `${gripper.foamSize} • ${gripper.ejectors} ejetor(es)`;

      return `
        <button type="button" class="${classes.join(" ")}" data-model="${gripper.model}" ${isCompatible ? "" : 'disabled aria-disabled="true"'}>
          <div class="card-head">
            <h3>${gripper.model}</h3>
          </div>
          ${bestModel === gripper.model ? '<span class="badge">Melhor opção</span>' : ""}
          <div class="card-body">
            <p>${detailLabel}</p>
            <p>${isVacuumGripper(gripper) ? "Sistema a vácuo ZGS" : isMagneticGripper(gripper) || isElectricGripper(gripper) ? "Garras em paralelo: Sim" : `Paralelo: ${gripper.allows_parallel ? "Sim" : "Não"}`}</p>
          </div>
        </button>`;
    })
    .join("");

  gripperCardsEl.innerHTML = cardsMarkup;
}

function renderTable(results, bestModel) {
  if (selectedType === TIPOS_GARRA.VACUO) {
    comparisonTableBodyEl.innerHTML = results
      .map(
        (result) => `<tr class="${result.model === bestModel ? "best-row" : ""}">
          <td>${result.model}</td>
          <td>${result.availableForce.toFixed(2)}</td>
          <td>${result.requiredForce.toFixed(2)}</td>
          <td class="${getSafetyMarginClass(result.marginPercent)}">${result.marginPercent.toFixed(1)}%</td>
          <td>${result.safe ? "APROVADO" : "REPROVADO"}</td>
        </tr>`,
      )
      .join("");
    return;
  }

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
          <td>${result.type === TIPOS_GARRA.PNEUMATICA ? result.fingers : "—"}</td>
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
  if (isMagneticType() || isElectricType() || isVacuumType()) {
    parallelModeEl.value = "enabled";
    parallelModeEl.disabled = true;
    gripperCountEl.disabled = isVacuumType();
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
  configuredForceResultEl.textContent = "—";
  safetyMarginEl.textContent = "0.00%";
  safetyMarginEl.className = "metric-value";
  resultTagEl.textContent = "—";
  resultTagEl.className = "validation";
  recommendationEl.textContent = message;
  recommendationEl.classList.remove("is-safe");
  smcWarningEl.classList.add("is-hidden");
  const colspan = selectedType === TIPOS_GARRA.VACUO ? 5 : 7;
  comparisonTableBodyEl.innerHTML = `<tr><td colspan="${colspan}">${message}</td></tr>`;
}

function updateChart(selectedResult, values) {
  if (isElectricType(values.type)) {
    chartTitleEl.textContent = "Curva Força x Distância";
    chart.options.scales.x.title.text = "Distância L (mm)";
    chart.options.scales.y.title.text = "Força efetiva (N)";

    const electricCurves = buildElectricCurves(values);
    const chartKey = JSON.stringify([electricCurves.distances, electricCurves.datasets]);
    if (chartKey === lastChartKey) return;

    chart.data.labels = electricCurves.distances;
    chart.data.datasets = electricCurves.datasets;
    chart.update("none");
    lastChartKey = chartKey;
    return;
  }

  chartTitleEl.textContent = "Curva Força x Pressão";
  chart.options.scales.x.title.text = "Pressão (MPa)";
  chart.options.scales.y.title.text = "Força (N)";

  const curve = buildPressureCurve(selectedResult, selectedResult.referencePressure);
  const currentPointPressure = selectedResult.referencePressure ? values.pressure : 0.1;
  const currentPoint = curve.pressureSteps.map((item) => (Math.abs(item - currentPointPressure) < 0.026 ? selectedResult.availableForce : null));
  const datasets = [
    { label: "Curva da garra (N)", data: curve.forceSteps, borderColor: "#0072ce", backgroundColor: "rgba(0,114,206,0.10)", fill: true, tension: 0.2, pointRadius: 2 },
    { label: "Ponto atual", data: currentPoint, borderColor: "#f59e0b", backgroundColor: "#f59e0b", showLine: false, pointRadius: 6 },
  ];
  const chartKey = JSON.stringify([curve.pressureSteps, datasets]);
  if (chartKey === lastChartKey) return;

  chart.data.labels = curve.pressureSteps;
  chart.data.datasets = datasets;
  chart.update("none");
  lastChartKey = chartKey;
}

function applyTypeDefaults(type) {
  const defaults = defaultsByType[type];
  selectedType = type;
  workpieceShapeEl.value = defaults.workpieceShape;
  parallelModeEl.value = defaults.parallelMode ?? parallelModeEl.value;
  gripperCountEl.value = defaults.gripperCount;
  document.getElementById("friction").value = defaults.friction ?? document.getElementById("friction").value;
  document.getElementById("mode").value = defaults.mode ?? document.getElementById("mode").value;
  document.getElementById("offset").value = defaults.offset ?? document.getElementById("offset").value;
  document.getElementById("thickness").value = defaults.thickness ?? document.getElementById("thickness").value;
  document.getElementById("material").value = defaults.material ?? document.getElementById("material").value;
  document.getElementById("pressure").value = defaults.pressure ?? document.getElementById("pressure").value;
  mountingTypeEl.value = defaults.mountingType ?? mountingTypeEl.value;
  configuredForceEl.value = defaults.configuredForce ?? configuredForceEl.value;
  foamSizeEl.value = defaults.foamSize ?? foamSizeEl.value;
  plateTypeEl.value = defaults.plateType ?? plateTypeEl.value;
  areaPctEl.value = defaults.areaPct ?? areaPctEl.value;
  areaPctNumberEl.value = defaults.areaPct ?? areaPctNumberEl.value;
  movementEl.value = defaults.movement ?? movementEl.value;
  document.getElementById("mass").value = defaults.mass ?? document.getElementById("mass").value;
  syncVacuumEjectorOptions();
  ejectorsEl.value = String(defaults.ejectors ?? ejectorsEl.value);
  if (type === TIPOS_GARRA.VACUO) document.getElementById("pressure").setAttribute("min", "0.3");
  else document.getElementById("pressure").setAttribute("min", "0.1");
  geometryCompatibilityMessageEl.textContent = "";
  selectedGripper = null;
}

function getElectricBestRecommendation(compatibleGrippers, values) {
  const evaluated = [];

  compatibleGrippers.forEach((gripper) => {
    ELECTRIC_FORCE_CURVES.forEach((configuredForce) => {
      const trialValues = { ...values, configuredForce };
      const trialResult = calculateForGripper(gripper, trialValues);
      evaluated.push({ ...trialResult, configuredForce });
    });
  });

  const approved = evaluated.filter((item) => item.safe);
  if (!approved.length) return null;

  approved.sort((a, b) => {
    if (a.configuredForce !== b.configuredForce) return a.configuredForce - b.configuredForce;
    return a.excessForce - b.excessForce;
  });

  return approved[0];
}

function updateUI(options = {}) {
  const { skipAutoSelection = false } = options;
  const values = getInputs();
  const isMagnetic = isMagneticType(values.type);
  const isElectric = isElectricType(values.type);
  const isVacuum = isVacuumType(values.type);
  const hasInvalidValues = values.mass < 0
    || values.thickness <= 0
    || values.gripperCount <= 0
    || values.safetyFactor < 1
    || (!isMagnetic && !isVacuum && values.friction <= 0)
    || (isElectric && (values.configuredForce < 60 || values.configuredForce > 140))
    || (isVacuum && (values.pressure < 0.3 || values.pressure > 0.7 || values.areaPct < 0.1 || values.areaPct > 1));
  if (hasInvalidValues) return;

  const allTypeGrippers = getTypeGrippers(values.type);
  const compatibleGrippers = getCompatibleGrippers(values.type, values.workpieceShape, values.mountingType);
  const electricRecommendationPool = isElectric ? getTypeGrippers(values.type).filter((gripper) => isGripperCompatibleWithShape(gripper, values.type, values.workpieceShape)) : compatibleGrippers;
  const shapeRestriction = getShapeRestriction(values.type, values.workpieceShape);

  let compatibilityMessage = shapeRestriction?.message || "";
  if (selectedGripper && !compatibleGrippers.some((gripper) => gripper.model === selectedGripper.model)) {
    selectedGripper = null;
    compatibilityMessage = `${shapeRestriction?.message ? `${shapeRestriction.message}. ` : ""}A garra selecionada foi removida por incompatibilidade geométrica/montagem.`;
  } else if (!compatibleGrippers.length) {
    compatibilityMessage = shapeRestriction?.message || "Não há modelos compatíveis com esta combinação.";
  }
  if (isVacuum && selectedGripper && selectedGripper.ejectors !== values.ejectors) {
    selectedGripper = null;
  }
  geometryCompatibilityMessageEl.textContent = compatibilityMessage;

  const hasValidCombination = !selectedGripper || compatibleGrippers.some((gripper) => gripper.model === selectedGripper.model);
  if (!hasValidCombination) {
    setNoSelectionState("Combinação inválida. Ajuste os parâmetros ou selecione uma garra compatível.");
    renderCards(allTypeGrippers, compatibleGrippers, null);
    return;
  }

  const results = compatibleGrippers.map((gripper) => calculateForGripper(gripper, values));
  const approved = results.filter((result) => result.safe).sort((a, b) => a.excessForce - b.excessForce);
  const best = approved[0] || null;
  const electricBest = isElectric ? getElectricBestRecommendation(electricRecommendationPool, values) : null;

  if (!selectedGripper && compatibleGrippers.length && !skipAutoSelection) {
    selectedGripper = isVacuum
      ? compatibleGrippers.find((gripper) => gripper.ejectors === values.ejectors) || compatibleGrippers.find((gripper) => gripper.model === (best?.model || compatibleGrippers[0].model)) || null
      : compatibleGrippers.find((gripper) => gripper.model === (best?.model || compatibleGrippers[0].model)) || null;
  }

  renderTechnologyCards();
  syncComparisonHeader(values.type);
  syncShapeOptions();
  syncGeometryFields();
  syncGripperSpecificFields();
  syncParallelControlsForSelection();
  renderCards(allTypeGrippers, compatibleGrippers, best?.model || null);

  if (!selectedGripper) {
    setNoSelectionState(
      compatibilityMessage || (best ? `Melhor opção disponível: ${best.model}.` : "Nenhuma garra aprovada para os parâmetros atuais."),
    );
    renderTable(results, best?.model || null);
    return;
  }

  const selectedResult = results.find((result) => result.model === selectedGripper.model);
  if (!selectedResult) {
    setNoSelectionState("Combinação inválida. Ajuste os parâmetros ou selecione uma garra compatível.");
    renderTable(results, best?.model || null);
    return;
  }

  const mountingLabel = values.mountingType === "longitudinal" ? "Longitudinal" : "Standard";
  selectedModelEl.textContent = isElectric
    ? `LEHR32 (${mountingLabel})`
    : isVacuum
      ? `ZGS ${values.foamSize} (${values.ejectors} ejetor${values.ejectors > 1 ? "es" : ""})`
      : `${selectedResult.model} (${selectedResult.effectiveGripperCount} garra${selectedResult.effectiveGripperCount > 1 ? "s" : ""})`;
  configuredForceResultEl.textContent = isElectric ? `${values.configuredForce.toFixed(0)} N` : isVacuum ? `${selectedResult.availableForce.toFixed(2)} N` : "N/A";
  requiredForceEl.textContent = `${selectedResult.requiredForce.toFixed(2)} N`;
  availableForceEl.textContent = `${selectedResult.availableForce.toFixed(2)} N`;
  safetyMarginEl.textContent = `${selectedResult.marginPercent.toFixed(1)}%`;
  safetyMarginEl.className = `metric-value ${getSafetyMarginClass(selectedResult.marginPercent)}`;
  resultTagEl.textContent = selectedResult.safe ? "APROVADO" : "NÃO APROVADO";
  resultTagEl.className = `validation ${selectedResult.safe ? "safe" : "not-safe"}`;

  if (isElectric) {
    recommendationEl.textContent = electricBest
      ? `Recomendação automática: ${electricBest.model} com ${electricBest.configuredForce} N (menor força configurada que atende, excesso de ${electricBest.excessForce.toFixed(2)} N).`
      : "Nenhuma combinação elétrica (60/100/140 N) foi aprovada para os parâmetros atuais.";
  } else if (isVacuum) {
    const suggested = sugerirEjetores(values.areaPct);
    recommendationEl.textContent = best
      ? `Melhor opção ZGS: ${best.model}. Sugestão automática: ${suggested} ejetor(es) para área atual.`
      : "Nenhuma configuração ZGS aprovada para os parâmetros atuais.";
  } else {
    recommendationEl.textContent = best
      ? `Melhor opção em ${isMagnetic ? "garras magnéticas" : "garras pneumáticas"}: ${best.model} com excesso mínimo de ${best.excessForce.toFixed(2)} N.`
      : "Nenhuma garra APROVADA para os parâmetros atuais.";
  }
  recommendationEl.classList.toggle("is-safe", Boolean(best || electricBest));

  const pieceWeight = values.mass * 9.81;
  if (isVacuum && values.areaPct < 0.5) {
    smcWarningEl.textContent = "Área de sucção reduzida — risco de vazamento.";
    smcWarningEl.classList.remove("is-hidden");
  } else if (isVacuum && values.pressure < 0.4) {
    smcWarningEl.textContent = "Pressão baixa — desempenho comprometido.";
    smcWarningEl.classList.remove("is-hidden");
  } else if (isVacuum && selectedResult.marginPercent < 0) {
    smcWarningEl.textContent = "Garra NÃO recomendada.";
    smcWarningEl.classList.remove("is-hidden");
  } else if (isElectric && selectedResult.availableForce < pieceWeight * 5) {
    smcWarningEl.textContent = "SMC recomenda entre 5x e 10x o peso da peça";
    smcWarningEl.classList.remove("is-hidden");
  } else {
    smcWarningEl.classList.add("is-hidden");
  }

  updateChart(selectedResult, values);
  renderTable(results, best?.model || null);
}

function handleFormChange(event) {
  let skipAutoSelection = false;

  if (event.target.id === "foamSize") {
    syncVacuumEjectorOptions();
    selectedGripper = null;
  }
  if (event.target.id === "ejectors" || event.target.id === "plateType") {
    selectedGripper = null;
  }

  if (event.target.id === "areaPct") {
    areaPctNumberEl.value = areaPctEl.value;
  }

  if (event.target.id === "areaPctNumber") {
    const boundedValue = Math.max(0.1, Math.min(1, Number(areaPctNumberEl.value || 1)));
    areaPctNumberEl.value = boundedValue.toFixed(2);
    areaPctEl.value = boundedValue;
  }

  if (event.target.id === "workpieceShape" || event.target.id === "mountingType") {
    syncGeometryFields();

    if (selectedType === TIPOS_GARRA.ELETRICA && event.target.id === "mountingType") {
      selectedGripper = grippers.find((gripper) => gripper.type === TIPOS_GARRA.ELETRICA && gripper.mounting === mountingTypeEl.value) || null;
    }

    if (selectedGripper && !getCompatibleGrippers(selectedType, workpieceShapeEl.value, mountingTypeEl.value).some((gripper) => gripper.model === selectedGripper.model)) {
      selectedGripper = null;
      skipAutoSelection = true;
    }
  }

  if (event.target.id === "parallelMode") {
    gripperCountEl.disabled = parallelModeEl.value !== "enabled";
    if (parallelModeEl.value === "disabled") gripperCountEl.value = 1;
  }

  updateUI({ skipAutoSelection });
}

function handleCardSelection(event) {
  const trigger = event.target.closest("[data-model]");
  if (!trigger || trigger.disabled) return;

  selectedGripper = grippers.find((gripper) => gripper.model === trigger.dataset.model && gripper.type === selectedType) || null;
  if (isElectricType() && selectedGripper) {
    mountingTypeEl.value = selectedGripper.mounting;
  }
  if (isVacuumType() && selectedGripper) {
    foamSizeEl.value = selectedGripper.foamSize;
    plateTypeEl.value = selectedGripper.plateType;
    syncVacuumEjectorOptions();
    ejectorsEl.value = String(selectedGripper.ejectors);
  }
  updateUI();
}

function handleTypeSelection(event) {
  const nextType = event.target.value;
  if (!nextType || nextType === selectedType) return;

  applyTypeDefaults(nextType);
  syncShapeOptions();
  syncGeometryFields();
  updateUI();
}

function init() {
  applyTypeDefaults(selectedType);
  renderTechnologyCards();
  syncComparisonHeader(selectedType);
  syncShapeOptions();
  syncGeometryFields();
  syncGripperSpecificFields();
  syncVacuumEjectorOptions();
  tipoGarraSelectEl.addEventListener("change", handleTypeSelection);
  gripperCardsEl.addEventListener("click", handleCardSelection);
  form.addEventListener("input", updateUI);
  form.addEventListener("change", handleFormChange);
  areaPctEl.addEventListener("input", () => { areaPctNumberEl.value = areaPctEl.value; });
  areaPctNumberEl.addEventListener("input", () => {
    const boundedValue = Math.max(0.1, Math.min(1, Number(areaPctNumberEl.value || 1)));
    areaPctEl.value = boundedValue;
  });
  updateUI();
}

init();
