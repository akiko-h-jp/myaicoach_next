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
    // AbortControllerを使用してタイムアウトを設定（30秒）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    let res: Response;
    try {
      res = await fetch(lineEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lineToken.trim()}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
    
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
    // より詳細なエラー情報をログに記録
    const errorDetails: any = {
      message: e.message,
      name: e.name,
      code: e.code,
      stack: e.stack,
    };
    
    if (e.name === "AbortError") {
      errorDetails.reason = "Request timeout (30 seconds)";
    }
    
    if (e.cause) {
      errorDetails.cause = e.cause;
    }
    
    // 環境変数の状態もログに記録（機密情報は除く）
    errorDetails.envCheck = {
      hasToken: !!lineToken,
      hasUserId: !!lineUserId,
      tokenLength: lineToken?.length || 0,
      userIdLength: lineUserId?.length || 0,
      endpoint: lineEndpoint,
    };
    
    console.error("❌ LINE notification error (full details):", JSON.stringify(errorDetails, null, 2));
    
    // より詳細なエラーメッセージを返す
    let errorMessage = `LINE notification error: ${e.message}`;
    if (e.name === "AbortError") {
      errorMessage = "LINE notification error: Request timeout. Please check network connectivity.";
    } else if (e.code === "ENOTFOUND" || e.code === "ECONNREFUSED") {
      errorMessage = `LINE notification error: Cannot connect to LINE API (${e.code}). Please check network settings.`;
    } else if (e.message?.includes("fetch failed")) {
      // fetch failed エラーの詳細を確認
      const errorInfo = e.cause ? ` (cause: ${JSON.stringify(e.cause)})` : "";
      errorMessage = `LINE notification error: Network error (${e.message}${errorInfo}). This may be due to Vercel's network restrictions or LINE API connectivity issues. Please check Vercel's environment variables for LINE_CHANNEL_ACCESS_TOKEN and LINE_USER_ID.`;
    }
    
    return { ok: false, error: errorMessage };
  }
}

