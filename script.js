let grippers = [];
let selectedModel = null;

const form = document.getElementById("configForm");
const gripperCardsEl = document.getElementById("gripperCards");
const selectedModelEl = document.getElementById("selectedModel");
const requiredForceEl = document.getElementById("requiredForce");
const availableForceEl = document.getElementById("availableForce");
const resultTagEl = document.getElementById("resultTag");
const recommendationEl = document.getElementById("recommendation");
const comparisonTableBodyEl = document.getElementById("comparisonTableBody");
const parallelModeEl = document.getElementById("parallelMode");
const gripperCountEl = document.getElementById("gripperCount");

const chart = new Chart(document.getElementById("forceChart"), {
  type: "bar",
  data: {
    labels: ["Required", "Available"],
    datasets: [
      {
        label: "Force (N)",
        data: [0, 0],
        backgroundColor: ["#f39c12", "#0f62fe"],
        borderRadius: 8,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Force (N)",
        },
      },
    },
  },
});

function getInputs() {
  return {
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

function getPerFingerForce(gripper, mode) {
  return mode === "internal"
    ? gripper.gripping_force_internal_per_finger
    : gripper.gripping_force_external_per_finger;
}

function calculateForGripper(gripper, values) {
  const perFingerForce = getPerFingerForce(gripper, values.mode);
  const weight = values.mass * 9.81;
  const fRequired = values.safetyFactor * (weight / values.friction);

  const parallelEnabled = values.parallelMode === "enabled";
  const requestedCount = parallelEnabled ? values.gripperCount : 1;
  const effectiveGripperCount = gripper.fingers === 3 || !gripper.allows_parallel ? 1 : requestedCount;

  const baseAvailableForce = perFingerForce * gripper.fingers;
  const pressureAdjustedForce = baseAvailableForce * (values.pressure / gripper.reference_pressure);
  const fAvailable = pressureAdjustedForce * effectiveGripperCount;

  return {
    model: gripper.model,
    fingers: gripper.fingers,
    fRequired,
    fAvailable,
    excessForce: fAvailable - fRequired,
    safe: fAvailable >= fRequired,
    effectiveGripperCount,
  };
}

function renderCards(bestModel) {
  gripperCardsEl.innerHTML = "";

  grippers.forEach((gripper) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "gripper-card";

    if (selectedModel === gripper.model) {
      card.classList.add("selected");
    }

    if (bestModel === gripper.model) {
      card.classList.add("recommended");
    }

    const parallelLabel = gripper.allows_parallel ? "Yes" : "No";
    card.innerHTML = `
      <div class="card-head">
        <strong>${gripper.model}</strong>
        ${bestModel === gripper.model ? '<span class="badge">Best</span>' : ""}
      </div>
      <div class="card-body">
        <span>${gripper.fingers} fingers</span>
        <span>Parallel: ${parallelLabel}</span>
      </div>
    `;

    card.addEventListener("click", () => {
      selectedModel = gripper.model;
      updateUI();
    });

    gripperCardsEl.appendChild(card);
  });
}

function renderTable(results, bestModel) {
  const validResults = results.filter((result) => result.safe);
  comparisonTableBodyEl.innerHTML = "";

  if (!validResults.length) {
    comparisonTableBodyEl.innerHTML = '<tr><td colspan="6">No valid grippers for current inputs.</td></tr>';
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
      <td>SAFE</td>
    `;

    comparisonTableBodyEl.appendChild(row);
  });
}

function syncParallelControlsForSelection() {
  const current = grippers.find((item) => item.model === selectedModel);
  if (!current) {
    return;
  }

  const mustSingleGripper = current.fingers === 3 || !current.allows_parallel;
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

function updateUI() {
  const values = getInputs();

  if (values.friction <= 0 || values.pressure <= 0) {
    return;
  }

  const results = grippers.map((gripper) => calculateForGripper(gripper, values));
  const safeResults = results.filter((result) => result.safe).sort((a, b) => a.excessForce - b.excessForce);
  const bestOption = safeResults[0] || null;

  if (!selectedModel && grippers.length) {
    selectedModel = grippers[0].model;
  }

  if (bestOption && !grippers.some((item) => item.model === selectedModel)) {
    selectedModel = bestOption.model;
  }

  syncParallelControlsForSelection();

  const selectedResult = results.find((result) => result.model === selectedModel) || results[0];
  if (!selectedResult) {
    return;
  }

  selectedModelEl.textContent = `${selectedResult.model} (${selectedResult.effectiveGripperCount} gripper${
    selectedResult.effectiveGripperCount > 1 ? "s" : ""
  })`;
  requiredForceEl.textContent = `${selectedResult.fRequired.toFixed(2)} N`;
  availableForceEl.textContent = `${selectedResult.fAvailable.toFixed(2)} N`;

  resultTagEl.textContent = selectedResult.safe ? "SAFE" : "NOT SAFE";
  resultTagEl.classList.remove("safe", "unsafe");
  resultTagEl.classList.add(selectedResult.safe ? "safe" : "unsafe");

  chart.data.datasets[0].data = [selectedResult.fRequired, selectedResult.fAvailable];
  chart.update();

  if (bestOption) {
    recommendationEl.textContent = `Recommended gripper: ${bestOption.model} (lowest excess force: ${bestOption.excessForce.toFixed(
      2
    )} N)`;
    recommendationEl.classList.add("is-safe");
  } else {
    recommendationEl.textContent = "No SAFE grippers for the current input set.";
    recommendationEl.classList.remove("is-safe");
  }

  renderCards(bestOption ? bestOption.model : null);
  renderTable(results, bestOption ? bestOption.model : null);
}

async function init() {
  const response = await fetch("grippers.json");
  grippers = await response.json();
  selectedModel = grippers[0]?.model || null;

  form.addEventListener("input", updateUI);
  form.addEventListener("change", (event) => {
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
