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
    acceleration: Number(document.getElementById("acceleration").value),
    friction: Number(document.getElementById("friction").value),
    safetyFactor: Number(document.getElementById("safetyFactor").value),
    grippers: Number(document.getElementById("grippers").value),
    pressure: Number(document.getElementById("pressure").value),
    mode: document.getElementById("mode").value,
    offset: Number(document.getElementById("offset").value),
  };
}

function calculate(values) {
  const baseForce = values.mode === "internal" ? GRIPPER_DATA.internalForceN : GRIPPER_DATA.externalForceN;

  const fTotal = values.mass * (9.81 + values.acceleration);
  const fRequired = fTotal / (values.friction * GRIPPER_DATA.fingers);
  const fRequiredSafe = fRequired * values.safetyFactor;
  const fPerGripper = fRequiredSafe / values.grippers;
  const fAvailable = baseForce * (values.pressure / GRIPPER_DATA.referencePressureMPa);

  const marginPercent = ((fAvailable - fPerGripper) / fPerGripper) * 100;
  const safe = fAvailable >= fPerGripper;

  return {
    fPerGripper,
    fAvailable,
    marginPercent,
    safe,
  };
}

function updateUI() {
  const values = getInputs();

  if (values.friction <= 0 || values.grippers <= 0 || values.pressure <= 0) {
    return;
  }

  const result = calculate(values);

  requiredForceEl.textContent = `${result.fPerGripper.toFixed(2)} N`;
  availableForceEl.textContent = `${result.fAvailable.toFixed(2)} N`;
  safetyMarginEl.textContent = `${result.marginPercent.toFixed(2)}%`;

  resultTagEl.textContent = result.safe ? "SAFE" : "NOT SAFE";
  resultTagEl.classList.remove("safe", "unsafe");
  resultTagEl.classList.add(result.safe ? "safe" : "unsafe");

  chart.data.datasets[0].data = [result.fPerGripper, result.fAvailable];
  chart.update();
}

form.addEventListener("input", updateUI);
form.addEventListener("change", updateUI);

updateUI();
