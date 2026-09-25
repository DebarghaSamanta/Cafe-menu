const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

async function parseResponse(response) {
  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(
      data?.detail || "Something went wrong with the server."
    );

    error.status = response.status;
    throw error;
  }

  return data;
}

export async function getTableContext(tableToken) {
  console.log("getTableContext received:", tableToken);

  const response = await fetch(
    `${API_BASE_URL}/api/table/context`,
    {
      method: "GET",
      headers: {
        "X-Table-Token": String(tableToken),
      },
    }
  );

  return parseResponse(response);
}

export async function getMenu(tableToken) {
  const response = await fetch(
    `${API_BASE_URL}/api/menu`,
    {
      method: "GET",
      headers: {
        "X-Table-Token": tableToken,
      },
    }
  );

  return parseResponse(response);
}
export async function sendChatMessage(tableToken, sessionId, message) {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Table-Token": String(tableToken),
    },
    body: JSON.stringify({ session_id: sessionId, message }),
  });

  return parseResponse(response);
}

export async function createOrder(tableToken, items) {
  const response = await fetch(`${API_BASE_URL}/api/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Table-Token": String(tableToken),
    },
    body: JSON.stringify({ items }),
  });

  return parseResponse(response);
}
