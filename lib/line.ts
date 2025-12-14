const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const lineUserId = process.env.LINE_USER_ID;
const lineEndpoint =
  process.env.LINE_PUSH_ENDPOINT ?? "https://api.line.me/v2/bot/message/push";

export async function sendLineNotification(message: string) {
  console.log("📤 Attempting to send LINE notification...");
  
  if (!lineToken) {
    console.error("❌ LINE_CHANNEL_ACCESS_TOKEN is not set");
    return { ok: false, error: "LINE_CHANNEL_ACCESS_TOKEN is not set." };
  }
  if (!lineUserId) {
    console.error("❌ LINE_USER_ID is not set");
    return { ok: false, error: "LINE_USER_ID is not set." };
  }
  if (!message) {
    console.error("❌ Message is empty");
    return { ok: false, error: "Message is empty." };
  }

  const payload = {
    to: lineUserId.trim(),
    messages: [
      {
        type: "text",
        text: message,
      },
    ],
  };

  console.log("📤 LINE notification payload:", {
    endpoint: lineEndpoint,
    userId: lineUserId.trim().substring(0, 10) + "...",
    messageLength: message.length,
    hasToken: !!lineToken,
  });

  try {
    const res = await fetch(lineEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lineToken.trim()}`,
      },
      body: JSON.stringify(payload),
    });
    
    const responseText = await res.text();
    console.log("📥 LINE API response:", {
      status: res.status,
      statusText: res.statusText,
      body: responseText.substring(0, 200),
    });
    
    if (!res.ok) {
      console.error("❌ LINE push failed:", {
        status: res.status,
        statusText: res.statusText,
        body: responseText,
      });
      return { ok: false, error: `LINE push failed: ${res.status} ${responseText}` };
    }
    
    console.log("✅ LINE notification sent successfully");
    return { ok: true };
  } catch (e: any) {
    console.error("❌ LINE notification error:", {
      message: e.message,
      stack: e.stack,
    });
    return { ok: false, error: `LINE notification error: ${e.message}` };
  }
}

