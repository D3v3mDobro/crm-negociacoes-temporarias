const params = new URLSearchParams(location.search);
const negotiationId = params.get("negociacao") || "";

function showFinalStatus(status) {
  const actionArea = document.getElementById("action-area");
  const finalStatus = document.getElementById("final-status");
  actionArea.hidden = true;
  finalStatus.hidden = false;

  if (status === "aceita") {
    finalStatus.className = "final-status accepted";
    finalStatus.textContent = "Oferta aceita! Envie esta confirmação ao vendedor.";
  } else {
    finalStatus.className = "final-status declined";
    finalStatus.textContent = "Oferta recusada.";
  }

}

function expireOffer() {
  document.getElementById("offer-content").hidden = true;
  document.getElementById("expired").hidden = false;
}

let expiresAt = Date.now() + (30 * 60 * 1000);

function updateTimer() {
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) {
    expireOffer();
    return;
  }

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  document.getElementById("timer").textContent =
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

async function supabaseRpc(name, body) {
  const response = await fetch(`${window.SUPABASE_CONFIG.url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: window.SUPABASE_CONFIG.publishableKey,
      Authorization: `Bearer ${window.SUPABASE_CONFIG.publishableKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error("Não foi possível consultar a negociação.");
  return response.json();
}

async function loadNegotiation() {
  if (!negotiationId) {
    expireOffer();
    return;
  }

  try {
    const rows = await supabaseRpc("get_negotiation", { p_public_token: negotiationId });
    const negotiation = Array.isArray(rows) ? rows[0] : rows;
    if (!negotiation) {
      expireOffer();
      return;
    }

    document.getElementById("offer-title").textContent = negotiation.title;
    document.getElementById("customer-name").textContent = negotiation.customer_name;
    document.getElementById("offer-description").textContent =
      negotiation.description || "Consulte os detalhes desta proposta com o vendedor.";
    document.getElementById("offer-value").textContent =
      Number(negotiation.value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    if (negotiation.validity) {
      const [year, month, day] = negotiation.validity.split("-");
      document.getElementById("offer-validity").textContent = `${day}/${month}/${year}`;
    }

    expiresAt = new Date(negotiation.expires_at).getTime();
    updateTimer();
    setInterval(updateTimer, 1000);

    if (negotiation.status === "aceita" || negotiation.status === "recusada") {
      showFinalStatus(negotiation.status);
      return;
    }

    const acceptButton = document.getElementById("accept-offer");
    const declineButton = document.getElementById("decline-offer");

    acceptButton.addEventListener("click", () => respond("aceita"), { once: true });
    declineButton.addEventListener("click", () => respond("recusada"), { once: true });
  } catch (error) {
    expireOffer();
  }
}

async function respond(status) {
  const acceptButton = document.getElementById("accept-offer");
  const declineButton = document.getElementById("decline-offer");
  acceptButton.disabled = true;
  declineButton.disabled = true;
  acceptButton.textContent = status === "aceita" ? "Aceitando..." : "Aceitar oferta";
  declineButton.textContent = status === "recusada" ? "Recusando..." : "Não tenho interesse";

  try {
    const rows = await supabaseRpc("respond_negotiation", {
      p_public_token: negotiationId,
      p_status: status
    });
    if (!rows?.length) {
      expireOffer();
      return;
    }
    showFinalStatus(status);
    openSellerNotification(status, negotiationId);
  } catch (error) {
    document.getElementById("action-area").hidden = false;
    acceptButton.disabled = false;
    declineButton.disabled = false;
    acceptButton.textContent = "Aceitar oferta";
    declineButton.textContent = "Não tenho interesse";
  }
}

function openSellerNotification(status, negotiationId) {
  const phone = (window.SUPABASE_CONFIG.sellerPhone || "").replace(/\D/g, "");
  if (!phone) return;

  const negotiationTitle = document.getElementById("offer-title").textContent;
  const customerName = document.getElementById("customer-name").textContent;
  const result = status === "aceita" ? "ACEITO ✅" : "RECUSADO ❌";
  const message =
    `Negociação ${result}\n` +
    `Cliente: ${customerName}\n` +
    `Oferta: ${negotiationTitle}\n` +
    `Código: ${negotiationId}`;
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  const notificationLink = document.getElementById("seller-notification");
  notificationLink.href = url;
  notificationLink.hidden = false;
  notificationLink.textContent = "Abrindo o WhatsApp do vendedor...";
  window.location.href = url;
}

loadNegotiation();
