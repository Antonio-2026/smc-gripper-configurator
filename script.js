const grippers = [
  { model: "RMHZ2", type: "pneumatica", fingers: 2, allows_parallel: true, external_per_finger: 54.2, internal_per_finger: 72.2, reference_pressure: 0.5, compatible_shapes: ["rectangular", "square"] },
  { model: "RMHF2", type: "pneumatica", fingers: 2, allows_parallel: true, external_per_finger: 90, internal_per_finger: 90, reference_pressure: 0.5, compatible_shapes: ["rectangular", "square"] },
  { model: "RMHS3", type: "pneumatica", fingers: 3, allows_parallel: false, external_per_finger: 118, internal_per_finger: 130, reference_pressure: 0.5, compatible_shapes: ["rectangular", "square", "cylindrical"] },
  {
    model: "MHM-X7400A",
    type: "magnetica",
    fingers: 0,
    allows_parallel: true,
    maxForce: 200,
    compatible_shapes: ["flat", "cylindrical"],
  },
  { model: "LEHR32 Standard", type: "eletrica", mounting: "standard", fingers: 0, allows_parallel: true, compatible_shapes: ["rectangular", "square", "cylindrical"] },
  { model: "LEHR32 Longitudinal", type: "eletrica", mounting: "longitudinal", fingers: 0, allows_parallel: true, compatible_shapes: ["rectangular", "square", "cylindrical"] },
  { model: "ZGS 200x120", type: "vacuo", size: "200x120", ejectors: [1, 2], compatible_shapes: ["flat", "rectangular"] },
  { model: "ZGS 300x180", type: "vacuo", size: "300x180", ejectors: [1, 2, 3], compatible_shapes: ["flat", "rectangular"] },
  { model: "ZGS 400x240", type: "vacuo", size: "400x240", ejectors: [2, 4, 6], compatible_shapes: ["flat", "rectangular"] },
  { model: "ZXPE5", type: "vacuo_eletrico", cups: [1, 2, 4], maxWorkLoad: 5, maxVacuum: -74, flowRate: 4.5, compatible_shapes: ["flat", "rectangular"] },
];

const ZGS_DATA = {
  "400x240": {
    2: { full: 536, half: 188 },
    4: { full: 536, half: 188 },
    6: { full: 536, half: 201 },
  },
  "300x180": {
    1: { full: 220, half: null },
    2: { full: 220, half: 87 },
    3: { full: 220, half: 89 },
  },
  "200x120": {
    1: { full: 110, half: 47 },
    2: { full: 110, half: 52 },
  },
};

const TIPOS_GARRA = {
  ELETRICA: "eletrica",
  PNEUMATICA: "pneumatica",
  MAGNETICA: "magnetica",
  VACUO: "vacuo",
  VACUO_ELETRICO: "vacuo_eletrico",
};


const defaultsByType = {
  pneumatica: { workpieceShape: "rectangular", parallelMode: "enabled", gripperCount: 1, friction: 0.2, mode: "external", offset: 0, pressure: 0.5 },
  magnetica: { workpieceShape: "flat", parallelMode: "enabled", gripperCount: 1, magnetCount: 1, thickness: 6, material: "steel", pressure: 0.5 },
  eletrica: { workpieceShape: "rectangular", gripperCount: 1, friction: 0.2, offset: 10, mountingType: "standard", configuredForce: 100 },
  vacuo: { workpieceShape: "flat", gripperCount: 1, pressure: 0.5, suctionArea: 1.0, ejectors: 2, movement: "horizontal" },
  vacuo_eletrico: { workpieceShape: "flat", gripperCount: 1, pressure: 0.5, cups: 2, cupDiameter: 20, movement: "horizontal" },
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
const magnetCountFieldEl = document.getElementById("magnetCountField");
const magnetCountEl = document.getElementById("magnetCount");
const pressureFieldEl = document.getElementById("pressureField");
const vacuumPressureFieldEl = document.getElementById("vacuumPressureField");
const vacuumNoteEl = document.getElementById("vacuumNote");
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
const magnetNoteEl = document.getElementById("magnetNote");
const mountingTypeFieldEl = document.getElementById("mountingTypeField");
const mountingTypeEl = document.getElementById("mountingType");
const configuredForceFieldEl = document.getElementById("configuredForceField");
const configuredForceEl = document.getElementById("configuredForce");
const cupsFieldEl = document.getElementById("cupsField");
const cupsEl = document.getElementById("cups");
const cupDiameterFieldEl = document.getElementById("cupDiameterField");
const cupDiameterEl = document.getElementById("cupDiameter");
const electricTechnicalNoteEl = document.getElementById("electricTechnicalNote");
const smcWarningEl = document.getElementById("smcWarning");
const geometryCompatibilityMessageEl = document.getElementById("geometryCompatibilityMessage");
const chartTitleEl = document.getElementById("chartTitle");
const technologySelectorEl = document.getElementById("technologySelector");
const vacuumAreaFieldEl = document.getElementById("vacuumAreaField");
const ejectorFieldEl = document.getElementById("ejectorField");
const ejectorsEl = document.getElementById("ejectors");
const suctionAreaEl = document.getElementById("suctionArea");
const movementFieldEl = document.getElementById("movementField");
const movementEl = document.getElementById("movement");
const safetyFactorFieldEl = document.getElementById("safetyFactor").closest("label");
const zgsSafetyNoteEl = document.getElementById("zgsSafetyNote");
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
  return type === TIPOS_GARRA.MAGNETICA;
}

function isElectricType(type = selectedType) {
  return type === TIPOS_GARRA.ELETRICA;
}

function isVacuumType(type = selectedType) {
  return type === TIPOS_GARRA.VACUO;
}

function isVacuumElectricType(type = selectedType) {
  return type === TIPOS_GARRA.VACUO_ELETRICO;
}

function isElectricVacuumType(type = selectedType) {
  return isVacuumElectricType(type);
}

function isMagneticGripper(gripper) {
  return gripper?.type === TIPOS_GARRA.MAGNETICA;
}

function isElectricGripper(gripper) {
  return gripper?.type === TIPOS_GARRA.ELETRICA;
}

function isVacuumGripper(gripper) {
  return gripper?.type === TIPOS_GARRA.VACUO;
}

function isElectricVacuumGripper(gripper) {
  return gripper?.type === TIPOS_GARRA.VACUO_ELETRICO;
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
    magnetCount: Number(magnetCountEl.value),
    thickness: Number(document.getElementById("thickness").value),
    material: document.getElementById("material").value,
    mountingType: mountingTypeEl.value,
    configuredForce: Number(configuredForceEl.value),
    ejectors: Number(ejectorsEl.value),
    suctionArea: Number(suctionAreaEl.value),
    movement: movementEl?.value || "horizontal",
    cups: Number(cupsEl?.value || 2),
    cupDiameter: Number(cupDiameterEl?.value || 20),
  };
}

function getAllowedShapes(type = selectedType) {
  if (type === TIPOS_GARRA.VACUO || type === TIPOS_GARRA.VACUO_ELETRICO) {
    return ["flat", "rectangular"];
  }
  if (isMagneticType(type)) return ["flat", "cylindrical"];
  return ["cylindrical", "rectangular", "flat"];
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

function syncComparisonHeader(type) {
  if (type === TIPOS_GARRA.VACUO || type === TIPOS_GARRA.VACUO_ELETRICO) {
    comparisonHeaderRowEl.innerHTML = "<th>Modelo</th><th>Força (N)</th><th>Necessária (N)</th><th>Margem</th><th>Status</th>";
    return;
  }
  comparisonHeaderRowEl.innerHTML = "<th>Modelo</th><th>Dedos</th><th>Força disponível (N)</th><th>Força necessária (N)</th><th>Excesso (N)</th><th>Margem</th><th>Validação</th>";
}

function syncGripperSpecificFields() {
  const isMagnetic = selectedType === TIPOS_GARRA.MAGNETICA;
  const isElectric = isElectricType();
  const isVacuum = isVacuumType();
  const isVacuumElectric = isVacuumElectricType();

  movementFieldEl.classList.toggle("is-hidden", !isVacuum);
  vacuumAreaFieldEl.classList.toggle("is-hidden", !isVacuum);
  ejectorFieldEl.classList.toggle("is-hidden", !isVacuum);
  cupsFieldEl.classList.toggle("is-hidden", !isVacuumElectric);
  cupDiameterFieldEl.classList.toggle("is-hidden", !isVacuumElectric);

  if (isVacuumElectric) {
    movementFieldEl.classList.add("is-hidden");
    vacuumAreaFieldEl.classList.add("is-hidden");
    ejectorFieldEl.classList.add("is-hidden");
  }

  frictionFieldEl.classList.toggle("is-hidden", isMagnetic || isVacuum || isVacuumElectric);
  modeFieldEl.classList.toggle("is-hidden", isMagnetic || isElectric || isVacuum || isVacuumElectric);
  offsetFieldEl.classList.toggle("is-hidden", isMagnetic || isVacuum || isVacuumElectric);
  parallelModeFieldEl.classList.toggle("is-hidden", isMagnetic || isElectric || isVacuum || isVacuumElectric);
  thicknessFieldEl.classList.toggle("is-hidden", !isMagnetic);
  magnetCountFieldEl.classList.toggle("is-hidden", !isMagnetic);
  materialFieldEl.classList.toggle("is-hidden", !isMagnetic);
  magnetNoteEl.classList.toggle("is-hidden", !isMagnetic);
  materialWarningEl.classList.toggle("is-hidden", !isMagnetic);
  pressureFieldEl.classList.toggle("is-hidden", isMagnetic || isElectric || isVacuumElectric);
  vacuumPressureFieldEl.classList.toggle("is-hidden", !isVacuumElectric);
  vacuumNoteEl.classList.toggle("is-hidden", !isVacuumElectric);
  gripperCountFieldEl.classList.toggle("is-hidden", isMagnetic || isVacuum || isVacuumElectric);
  mountingTypeFieldEl.classList.toggle("is-hidden", !isElectric);
  configuredForceFieldEl.classList.toggle("is-hidden", !isElectric);
  electricTechnicalNoteEl.classList.toggle("is-hidden", !isElectric);
  safetyFactorFieldEl.classList.toggle("is-hidden", false);
  workpieceShapeEl.closest("label").classList.toggle("is-hidden", isVacuum || isVacuumElectric);
  rectangularDimensionsEl.classList.toggle("is-hidden", (isVacuum || isVacuumElectric) || !(workpieceShapeEl.value === "rectangular" || workpieceShapeEl.value === "square"));
  cylindricalDimensionsEl.classList.toggle("is-hidden", (isVacuum || isVacuumElectric) || workpieceShapeEl.value !== "cylindrical");

  document.getElementById("friction").disabled = isMagnetic || isVacuum || isVacuumElectric;
  document.getElementById("mode").disabled = isMagnetic || isElectric || isVacuum || isVacuumElectric;
  document.getElementById("offset").disabled = isMagnetic || isVacuum || isVacuumElectric;
  parallelModeEl.disabled = isMagnetic || isElectric || isVacuum || isVacuumElectric;
  document.getElementById("thickness").disabled = !isMagnetic;
  magnetCountEl.disabled = !isMagnetic;
  document.getElementById("material").disabled = !isMagnetic;
  document.getElementById("pressure").disabled = isMagnetic || isElectric;
  gripperCountEl.disabled = isMagnetic || isVacuum || isVacuumElectric;
  mountingTypeEl.disabled = !isElectric;
  configuredForceEl.disabled = !isElectric;
  movementEl.disabled = !isVacuum;
  ejectorsEl.disabled = !isVacuum;
  suctionAreaEl.disabled = !isVacuum;
  cupsEl.disabled = !isVacuumElectric;
  cupDiameterEl.disabled = !isVacuumElectric;
  document.getElementById("safetyFactor").disabled = false;
  zgsSafetyNoteEl.classList.toggle("is-hidden", !isVacuum);

  if (isVacuum) {
    const values = getInputs();
    const recommendedSF = values.movement === "vertical" ? 8 : 4;
    zgsSafetyNoteEl.style.color = values.safetyFactor !== recommendedSF ? "#c28a00" : "#16a34a";
  } else {
    zgsSafetyNoteEl.style.color = "";
  }
}

function getBestGripper(results) {
  if (!results.length) return null;

  const safeOptions = results.filter((result) => result.safe);
  if (safeOptions.length > 0) {
    return safeOptions.sort((a, b) => a.marginPercent - b.marginPercent)[0];
  }

  return results.sort((a, b) => b.marginPercent - a.marginPercent)[0];
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

function ajustarMovimento(forca, movement) {
  if (movement === "vertical") return forca / 2;
  return forca;
}

function ajustarFatorSeguranca(forcaCatalogo, movement, SF_usuario) {
  const SF_catalogo = movement === "vertical" ? 8 : 4;
  return forcaCatalogo * (SF_catalogo / SF_usuario);
}

function getDefaultPressure(size) {
  if (size === "400x240") return 0.6;
  return 0.45;
}

function calculateRequiredForce(values) {
  const weight = values.mass * 9.81;

  if (isVacuumType(values.type) || isElectricVacuumType(values.type)) {
    return weight * values.safetyFactor;
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
  if (gripper.type === TIPOS_GARRA.MAGNETICA) {
    const t = values.thickness;
    const count = Math.max(1, values.magnetCount);

    let baseForce;
    if (t <= 2) {
      baseForce = 160;
    } else if (t >= 6) {
      baseForce = 200;
    } else {
      baseForce = 160 + ((t - 2) / (6 - 2)) * (200 - 160);
    }

    let materialFactor = 1;
    if (values.material === "low") materialFactor = 0.6;

    const availableForce = baseForce * materialFactor * count;
    const requiredForce = values.mass * 9.81 * values.safetyFactor;
    const marginPercent = requiredForce === 0 ? 0 : ((availableForce - requiredForce) / requiredForce) * 100;

    return {
      model: `${gripper.model} (${count}x)`,
      type: TIPOS_GARRA.MAGNETICA,
      requiredForce,
      availableForce,
      excessForce: availableForce - requiredForce,
      safe: availableForce >= requiredForce,
      marginPercent,
      effectiveGripperCount: count,
      baseAvailableForce: baseForce * materialFactor,
      configuredForce: null,
      referencePressure: null,
      forceReductionFactor: null,
    };
  }

  if (gripper.type === TIPOS_GARRA.VACUO_ELETRICO) {
    const area = Math.PI * Math.pow((values.cupDiameter / 1000) / 2, 2);
    const vacuum = 74000;
    const availableForce = area * vacuum * values.cups;
    const requiredForce = values.mass * 9.81 * values.safetyFactor;
    const marginPercent = ((availableForce - requiredForce) / requiredForce) * 100;

    return {
      model: `${gripper.model} (${values.cups} ventosas)`,
      type: TIPOS_GARRA.VACUO_ELETRICO,
      requiredForce,
      availableForce,
      excessForce: availableForce - requiredForce,
      safe: availableForce >= requiredForce,
      marginPercent,
      effectiveGripperCount: values.cups,
      baseAvailableForce: availableForce,
      configuredForce: null,
      referencePressure: null,
      forceReductionFactor: null,
    };
  }

  if (isVacuumGripper(gripper)) {
    const data = ZGS_DATA[gripper.size]?.[values.ejectors];

    if (!data) {
      return {
        model: gripper.model,
        requiredForce: 0,
        availableForce: 0,
        safe: false,
        marginPercent: -100,
      };
    }

    let baseForce;

    if (values.suctionArea >= 0.99) {
      baseForce = data.full;
    } else if (values.suctionArea <= 0.5) {
      baseForce = data.half;
    } else {
      baseForce = data.half == null
        ? data.full
        : data.full + (data.half - data.full) * (1 - values.suctionArea);
    }

    let availableForce = ajustarMovimento(baseForce, values.movement);
    availableForce = ajustarFatorSeguranca(
      availableForce,
      values.movement,
      values.safetyFactor
    );
    const requiredForce = values.mass * 9.81;

    const marginPercent = ((availableForce - requiredForce) / requiredForce) * 100;

    return {
      model: gripper.model,
      type: "vacuo",
      fingers: 0,
      requiredForce,
      availableForce,
      excessForce: availableForce - requiredForce,
      safe: availableForce >= requiredForce,
      marginPercent,
      effectiveGripperCount: 1,
      baseAvailableForce: availableForce,
      configuredForce: null,
      referencePressure: null,
      forceReductionFactor: null,
    };
  }

  const requiredForce = calculateRequiredForce(values);

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

  if (result.type === TIPOS_GARRA.VACUO || result.type === TIPOS_GARRA.VACUO_ELETRICO) {
    for (let pressure = 0.3; pressure <= 0.700001; pressure += 0.05) {
      const roundedPressure = Number(pressure.toFixed(2));
      pressureSteps.push(roundedPressure);
      forceSteps.push(result.baseAvailableForce);
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
  Array.from(technologySelectorEl.querySelectorAll(".technology-card")).forEach((card) => {
    card.classList.toggle("selected", card.dataset.type === selectedType);
  });
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
      if (isVacuumGripper(gripper)) detailLabel = `${gripper.size} • ejetores: ${gripper.ejectors.join(", ")}`;
      if (isElectricVacuumGripper(gripper)) detailLabel = `${gripper.maxWorkLoad} kg máx • ${gripper.maxVacuum} kPa • ${gripper.flowRate} L/min`;

      return `
        <button type="button" class="${classes.join(" ")}" data-model="${gripper.model}" ${isCompatible ? "" : 'disabled aria-disabled="true"'}>
          <div class="card-head">
            <h3>${gripper.model}</h3>
          </div>
          ${bestModel === gripper.model ? '<span class="badge">Melhor opção</span>' : ""}
          <div class="card-body">
            <p>${detailLabel}</p>
            <p>${isVacuumGripper(gripper) ? "Sistema a vácuo ZGS" : isElectricVacuumGripper(gripper) ? "Sistema a vácuo elétrico ZXPE5" : isMagneticGripper(gripper) || isElectricGripper(gripper) ? "Garras em paralelo: Sim" : `Paralelo: ${gripper.allows_parallel ? "Sim" : "Não"}`}</p>
          </div>
        </button>`;
    })
    .join("");

  gripperCardsEl.innerHTML = cardsMarkup;
}

function renderTable(results, bestModel) {
  if (selectedType === TIPOS_GARRA.VACUO || selectedType === TIPOS_GARRA.VACUO_ELETRICO) {
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
  if (isMagneticType() || isElectricType() || isVacuumType() || isElectricVacuumType()) {
    parallelModeEl.value = "enabled";
    parallelModeEl.disabled = true;
    gripperCountEl.disabled = isVacuumType() || isElectricVacuumType();
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
  const colspan = selectedType === TIPOS_GARRA.VACUO || selectedType === TIPOS_GARRA.VACUO_ELETRICO ? 5 : 7;
  comparisonTableBodyEl.innerHTML = `<tr><td colspan="${colspan}">${message}</td></tr>`;
}

function updateChart(calculation, values) {
  if (selectedGripper?.type === TIPOS_GARRA.MAGNETICA) {
    chartTitleEl.textContent = "Curva Força x Espessura";
    chart.options.scales.x.title.text = "Espessura (mm)";
    chart.options.scales.y.title.text = "Força (N)";

    const thicknesses = [1, 2, 3, 4, 5, 6];
    const forces = thicknesses.map((t) => {
      if (t <= 2) return 160;
      if (t >= 6) return 200;
      return 160 + ((t - 2) / 4) * 40;
    });
    const datasets = [
      { label: "Força por garra (N)", data: forces, borderColor: "#0072ce", backgroundColor: "rgba(0,114,206,0.10)", fill: true, tension: 0.2, pointRadius: 2 },
    ];
    const chartKey = JSON.stringify([thicknesses, datasets]);
    if (chartKey === lastChartKey) return;

    chart.data.labels = thicknesses;
    chart.data.datasets = datasets;
    chart.update("none");
    lastChartKey = chartKey;
    return;
  }

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

  if (selectedGripper?.type === "vacuo_eletrico") {
    chartTitleEl.textContent = "Força disponível (constante)";
    chart.options.scales.x.title.text = "Pressão (MPa)";
    chart.options.scales.y.title.text = "Força (N)";
    const labels = [0.3, 0.35, 0.4, 0.45, 0.5, 0.6, 0.7];
    const baseForce = calculation.availableForce;
    const datasets = [
      { label: "ZXPE5 (N)", data: [baseForce, baseForce, baseForce, baseForce, baseForce, baseForce, baseForce], borderColor: "#0072ce", backgroundColor: "rgba(0,114,206,0.25)", fill: true, tension: 0, pointRadius: 2 },
    ];
    const chartKey = JSON.stringify([labels, datasets]);
    if (chartKey === lastChartKey) return;
    chart.data.labels = labels;
    chart.data.datasets = datasets;
    chart.update("none");
    lastChartKey = chartKey;
    return;
  }

  chartTitleEl.textContent = "Curva Força x Pressão";
  chart.options.scales.x.title.text = "Pressão (MPa)";
  chart.options.scales.y.title.text = "Força (N)";

  if (selectedGripper?.type === "vacuo") {
    const baseForce = calculation.availableForce;
    const currentPressure = values.pressure || calculation.referencePressure || 0.5;
    const pressures = [0.3, 0.35, 0.4, 0.45, 0.5, 0.6, 0.7];
    const forces = pressures.map((pressureStep) => baseForce * (pressureStep / currentPressure));
    const currentPoint = pressures.map((pressureStep) => (Math.abs(pressureStep - currentPressure) < 0.026 ? baseForce : null));
    const datasets = [
      { label: "Curva da garra (N)", data: forces, borderColor: "#0072ce", backgroundColor: "rgba(0,114,206,0.10)", fill: true, tension: 0.2, pointRadius: 2 },
      { label: "Ponto atual", data: currentPoint, borderColor: "#f59e0b", backgroundColor: "#f59e0b", showLine: false, pointRadius: 6 },
    ];
    const chartKey = JSON.stringify([pressures, datasets]);
    if (chartKey === lastChartKey) return;

    chart.data.labels = pressures;
    chart.data.datasets = datasets;
    chart.update("none");
    lastChartKey = chartKey;
    return;
  }

  const curve = buildPressureCurve(calculation, calculation.referencePressure);
  const currentPointPressure = isVacuumType(values.type) ? values.pressure : calculation.referencePressure ? values.pressure : 0.1;
  const currentPoint = curve.pressureSteps.map((item) => (Math.abs(item - currentPointPressure) < 0.026 ? calculation.availableForce : null));
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
  magnetCountEl.value = defaults.magnetCount ?? magnetCountEl.value;
  document.getElementById("friction").value = defaults.friction ?? document.getElementById("friction").value;
  document.getElementById("mode").value = defaults.mode ?? document.getElementById("mode").value;
  document.getElementById("offset").value = defaults.offset ?? document.getElementById("offset").value;
  document.getElementById("thickness").value = defaults.thickness ?? document.getElementById("thickness").value;
  document.getElementById("material").value = defaults.material ?? document.getElementById("material").value;
  document.getElementById("pressure").value = defaults.pressure ?? document.getElementById("pressure").value;
  mountingTypeEl.value = defaults.mountingType ?? mountingTypeEl.value;
  configuredForceEl.value = defaults.configuredForce ?? configuredForceEl.value;
  suctionAreaEl.value = defaults.suctionArea ?? suctionAreaEl.value;
  cupsEl.value = String(defaults.cups ?? cupsEl.value);
  cupDiameterEl.value = String(defaults.cupDiameter ?? cupDiameterEl.value);
  document.getElementById("mass").value = defaults.mass ?? document.getElementById("mass").value;
  ejectorsEl.value = String(defaults.ejectors ?? ejectorsEl.value);
  movementEl.value = defaults.movement ?? movementEl.value;
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
  const isVacuumElectric = isVacuumElectricType(values.type);
  const isVacuumLike = isVacuum || isVacuumElectric;
  const hasInvalidValues = values.mass < 0
    || values.thickness <= 0
    || values.gripperCount <= 0
    || values.magnetCount <= 0
    || values.safetyFactor < 1
    || (!isMagnetic && !isVacuumLike && values.friction <= 0)
    || (isElectric && (values.configuredForce < 60 || values.configuredForce > 140))
    || (isVacuum && (values.pressure < 0.3 || values.pressure > 0.7 || values.suctionArea < 0.1 || values.suctionArea > 1 || values.ejectors < 1))
    || (isVacuumElectric && values.mass <= 0)
    || (isVacuumElectric && (!Number.isFinite(values.cups) || values.cups < 1 || values.cupDiameter <= 0));
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
  if (isVacuum && selectedGripper && !selectedGripper.ejectors.includes(values.ejectors)) {
    selectedGripper = null;
  }
  if (isVacuumElectric && selectedGripper && !selectedGripper.cups.includes(values.cups)) {
    selectedGripper = null;
  }
  geometryCompatibilityMessageEl.textContent = compatibilityMessage;

  const hasValidCombination =
    !selectedGripper ||
    compatibleGrippers.some((gripper) => gripper.model === selectedGripper.model);

  if (!hasValidCombination) {
    // 🔥 NÃO travar o sistema
    selectedGripper = null;

    // apenas mensagem visual (sem bloquear cálculo)
    geometryCompatibilityMessageEl.textContent =
      "Combinação inválida. Ajuste automático aplicado.";
  }

  const results = compatibleGrippers.map((gripper) => calculateForGripper(gripper, values));
  const best = getBestGripper(results);
  const electricBest = isElectric ? getElectricBestRecommendation(electricRecommendationPool, values) : null;

  if (
    (!selectedGripper || selectedGripper.type === TIPOS_GARRA.VACUO_ELETRICO)
    && compatibleGrippers.length
    && !skipAutoSelection
  ) {
    selectedGripper = isVacuum
      ? compatibleGrippers.find((gripper) => gripper.ejectors.includes(values.ejectors)) || compatibleGrippers.find((gripper) => gripper.model === (best?.model || compatibleGrippers[0].model)) || null
      : isVacuumElectric
        ? compatibleGrippers.find((gripper) => gripper.cups.includes(values.cups)) || compatibleGrippers[0] || null
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

  let calculation = calculateForGripper(selectedGripper, values);
  if (!calculation || calculation.availableForce === 0) {
    const fallback = results.sort((a, b) => b.availableForce - a.availableForce)[0];
    if (fallback) {
      calculation = fallback;
      selectedGripper = {
        model: fallback.model,
        type: fallback.type,
      };
    }
  }

  if (!calculation) {
    setNoSelectionState("Ajuste os parâmetros ou selecione uma garra compatível.");
    renderTable(results, best?.model || null);
    return;
  }

  const mountingLabel = values.mountingType === "longitudinal" ? "Longitudinal" : "Standard";
  selectedModelEl.textContent = isElectric
    ? `LEHR32 (${mountingLabel})`
    : isVacuum
      ? `${calculation.model} (${values.ejectors} ejetor${values.ejectors > 1 ? "es" : ""})`
      : isVacuumElectric
        ? calculation.model
        : isMagnetic
          ? calculation.model
          : `${calculation.model} (${calculation.effectiveGripperCount} garra${calculation.effectiveGripperCount > 1 ? "s" : ""})`;
  configuredForceResultEl.textContent = isElectric ? `${values.configuredForce.toFixed(0)} N` : isVacuum ? `${calculation.availableForce.toFixed(2)} N` : "N/A";
  requiredForceEl.textContent = `${calculation.requiredForce.toFixed(2)} N`;
  availableForceEl.textContent = `${calculation.availableForce.toFixed(2)} N`;
  safetyMarginEl.textContent = `${calculation.marginPercent.toFixed(1)}%`;
  safetyMarginEl.className = `metric-value ${getSafetyMarginClass(calculation.marginPercent)}`;
  resultTagEl.textContent = calculation.safe ? "APROVADO" : "NÃO APROVADO";
  resultTagEl.className = `validation ${calculation.safe ? "safe" : "not-safe"}`;

  if (isElectric) {
    recommendationEl.textContent = electricBest
      ? `Recomendação automática: ${electricBest.model} com ${electricBest.configuredForce} N (menor força configurada que atende, excesso de ${electricBest.excessForce.toFixed(2)} N).`
      : "Nenhuma combinação elétrica (60/100/140 N) foi aprovada para os parâmetros atuais.";
  } else if (isVacuum) {
    recommendationEl.textContent = best
      ? best.safe
        ? `Melhor opção ZGS: ${best.model} (dimensionamento otimizado).`
        : `Nenhuma opção ZGS atende totalmente — sugerindo a mais próxima: ${best.model}.`
      : "Nenhuma configuração ZGS aprovada para os parâmetros atuais.";
  } else if (isVacuumElectric) {
    recommendationEl.textContent = best
      ? best.safe
        ? `Melhor opção ZXPE5: ${best.model} (dimensionamento otimizado).`
        : `Nenhuma opção ZXPE5 atende totalmente — sugerindo a mais próxima: ${best.model}.`
      : "Nenhuma configuração ZXPE5 aprovada para os parâmetros atuais.";
  } else {
    recommendationEl.textContent = best
      ? `Melhor opção em ${isMagnetic ? "garras magnéticas" : "garras pneumáticas"}: ${best.model} com excesso mínimo de ${best.excessForce.toFixed(2)} N.`
      : "Nenhuma garra APROVADA para os parâmetros atuais.";
  }
  recommendationEl.classList.toggle("is-safe", Boolean(best || electricBest));

  const pieceWeight = values.mass * 9.81;
  if (isVacuum && values.suctionArea < 0.5) {
    smcWarningEl.textContent = "Área de sucção reduzida — risco de vazamento.";
    smcWarningEl.classList.remove("is-hidden");
  } else if (isVacuum && values.pressure < 0.4) {
    smcWarningEl.textContent = "Pressão baixa — desempenho comprometido.";
    smcWarningEl.classList.remove("is-hidden");
  } else if (isVacuum && calculation.marginPercent < 0) {
    smcWarningEl.textContent = "Garra NÃO recomendada.";
    smcWarningEl.classList.remove("is-hidden");
  } else if (isElectric && calculation.availableForce < pieceWeight * 5) {
    smcWarningEl.textContent = "SMC recomenda entre 5x e 10x o peso da peça";
    smcWarningEl.classList.remove("is-hidden");
  } else if (isVacuumElectric && values.mass > 5) {
    smcWarningEl.textContent = "ZXPE5 excede carga máxima recomendada (5 kg)";
    smcWarningEl.classList.remove("is-hidden");
  } else {
    smcWarningEl.classList.add("is-hidden");
  }

  if (calculation) {
    updateChart(calculation, values);
  }
  renderTable(results, best?.model || null);
}

function handleFormChange(event) {
  let skipAutoSelection = false;

  if (event.target.id === "ejectors") {
    selectedGripper = null;
  }
  if (event.target.id === "cups") {
    selectedGripper = null;
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
  if (isVacuumType() && selectedGripper && !selectedGripper.ejectors.includes(Number(ejectorsEl.value))) {
    ejectorsEl.value = String(selectedGripper.ejectors[0]);
  }
  if (isElectricVacuumType() && selectedGripper && !selectedGripper.cups.includes(Number(cupsEl.value))) {
    cupsEl.value = String(selectedGripper.cups[0]);
  }
  if (selectedGripper?.type === "vacuo") {
    document.getElementById("pressure").value = getDefaultPressure(selectedGripper.size);
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

function handleTechnologyCardSelection(event) {
  const trigger = event.target.closest("[data-type]");
  if (!trigger) return;
  tipoGarraSelectEl.value = trigger.dataset.type;
  handleTypeSelection({ target: { value: trigger.dataset.type } });
}

function init() {
  applyTypeDefaults(selectedType);
  renderTechnologyCards();
  syncComparisonHeader(selectedType);
  syncShapeOptions();
  syncGeometryFields();
  syncGripperSpecificFields();
  tipoGarraSelectEl.addEventListener("change", handleTypeSelection);
  technologySelectorEl.addEventListener("click", handleTechnologyCardSelection);
  gripperCardsEl.addEventListener("click", handleCardSelection);
  form.addEventListener("input", updateUI);
  form.addEventListener("change", handleFormChange);
  updateUI();
}

init();
