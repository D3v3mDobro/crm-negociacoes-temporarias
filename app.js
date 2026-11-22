const params = new URLSearchParams(location.search);
const negotiationId = params.get("negociacao") || "";
const createdAt = Number(params.get("criado") || Date.now());
const durationMs = 30 * 60 * 1000;

const title = params.get("oferta") || "Sua oferta";
const customer = params.get("cliente") || "Cliente";
const value = Number(params.get("valor") || 0);
const validity = params.get("validade");
const description = params.get("descricao");
const statusKey = `offer-status-${negotiationId}`;

document.getElementById("offer-title").textContent = title;
document.getElementById("customer-name").textContent = customer;
document.getElementById("offer-description").textContent = description || "Consulte os detalhes desta proposta com o vendedor.";
document.getElementById("offer-value").textContent = value.toLocaleString("pt-BR", {
  style: "currency",
  currency: "BRL"
});

if (validity) {
  const [year, month, day] = validity.split("-");
  document.getElementById("offer-validity").textContent =
    `${day}/${month}/${year}`;
}

function showFinalStatus(status) {
  const actionArea = document.getElementById("action-area");
  const finalStatus = document.getElementById("final-status");
  actionArea.hidden = true;
  finalStatus.hidden = false;

  if (status === "aceita") {
    finalStatus.className = "final-status accepted";
    finalStatus.textContent = "Oferta aceita! O vendedor foi informado.";
  } else {
    finalStatus.className = "final-status declined";
    finalStatus.textContent = "Oferta recusada.";
  }

  params.set("status", status);
  history.replaceState(null, "", `${location.pathname}?${params.toString()}`);
  localStorage.setItem(statusKey, status);
}

function expireOffer() {
  document.getElementById("offer-content").hidden = true;
  document.getElementById("expired").hidden = false;
}

function updateTimer() {
  const remaining = durationMs - (Date.now() - createdAt);
  if (remaining <= 0) {
    expireOffer();
    return;
  }

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  document.getElementById("timer").textContent =
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const savedStatus = params.get("status") || (negotiationId ? localStorage.getItem(statusKey) : "");
if (savedStatus === "aceita" || savedStatus === "recusada") {
  showFinalStatus(savedStatus);
}

document.getElementById("accept-offer").addEventListener("click", () => {
  showFinalStatus("aceita");
});

document.getElementById("decline-offer").addEventListener("click", () => {
  showFinalStatus("recusada");
});

updateTimer();
setInterval(updateTimer, 1000);
