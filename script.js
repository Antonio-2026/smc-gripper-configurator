const GRIPPER_DATA = {
  model: "RMHZ2",
  type: "Pneumatic parallel gripper",
  fingers: 2,
  externalForceN: 54.2,
  internalForceN: 72.2,
  referencePressureMPa: 0.5,
};

const form = document.getElementById("configForm");
const requiredForceEl = document.getElementById("requiredForce");
const availableForceEl = document.getElementById("availableForce");
const safetyMarginEl = document.getElementById("safetyMargin");
const resultTagEl = document.getElementById("resultTag");

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
  };
}

function calculate(values) {
  const grippingForcePerFinger = values.mode === "internal" ? GRIPPER_DATA.internalForceN : GRIPPER_DATA.externalForceN;

  const weight = values.mass * 9.81;
  const fRequired = values.safetyFactor * (weight / values.friction);
  const fAvailable = grippingForcePerFinger * GRIPPER_DATA.fingers * (values.pressure / GRIPPER_DATA.referencePressureMPa);

  const marginPercent = ((fAvailable - fRequired) / fRequired) * 100;
  const safe = fAvailable >= fRequired;

  return {
    fRequired,
    fAvailable,
    marginPercent,
    safe,
  };
}

function updateUI() {
  const values = getInputs();

  if (values.friction <= 0 || values.pressure <= 0) {
    return;
  }

  const result = calculate(values);

  requiredForceEl.textContent = `${result.fRequired.toFixed(2)} N`;
  availableForceEl.textContent = `${result.fAvailable.toFixed(2)} N`;
  safetyMarginEl.textContent = `${result.marginPercent.toFixed(2)}%`;

  resultTagEl.textContent = result.safe ? "SAFE" : "NOT SAFE";
  resultTagEl.classList.remove("safe", "unsafe");
  resultTagEl.classList.add(result.safe ? "safe" : "unsafe");

  chart.data.datasets[0].data = [result.fRequired, result.fAvailable];
  chart.update();
}

form.addEventListener("input", updateUI);
form.addEventListener("change", updateUI);

updateUI();
