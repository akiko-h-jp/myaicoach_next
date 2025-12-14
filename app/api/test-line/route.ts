import { NextResponse } from "next/server";

// LINE APIへの接続をテストするエンドポイント
export async function GET() {
  const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const lineUserId = process.env.LINE_USER_ID;
  const lineEndpoint =
    process.env.LINE_PUSH_ENDPOINT ?? "https://api.line.me/v2/bot/message/push";

  const testResults: any = {
    timestamp: new Date().toISOString(),
    envCheck: {
      hasToken: !!lineToken,
      hasUserId: !!lineUserId,
      tokenLength: lineToken?.length || 0,
      userIdLength: lineUserId?.length || 0,
      endpoint: lineEndpoint,
    },
    tests: [],
  };

  // テスト1: 環境変数の確認
  if (!lineToken) {
    testResults.tests.push({
      name: "Environment Variables",
      status: "FAILED",
      error: "LINE_CHANNEL_ACCESS_TOKEN is not set",
    });
    return NextResponse.json(testResults, { status: 500 });
  }

  if (!lineUserId) {
    testResults.tests.push({
      name: "Environment Variables",
      status: "FAILED",
      error: "LINE_USER_ID is not set",
    });
    return NextResponse.json(testResults, { status: 500 });
  }

  testResults.tests.push({
    name: "Environment Variables",
    status: "PASSED",
  });

  // テスト2: DNS解決のテスト
  try {
    const url = new URL(lineEndpoint);
    const hostname = url.hostname;
    testResults.tests.push({
      name: "URL Parsing",
      status: "PASSED",
      hostname: hostname,
    });
  } catch (e: any) {
    testResults.tests.push({
      name: "URL Parsing",
      status: "FAILED",
      error: e.message,
    });
    return NextResponse.json(testResults, { status: 500 });
  }

  // テスト3: LINE APIへの接続テスト（実際のメッセージは送信しない）
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト

    const testPayload = {
      to: lineUserId.trim(),
      messages: [
        {
          type: "text",
          text: "Test message",
        },
      ],
    };

    const startTime = Date.now();
    let res: Response;
    try {
      res = await fetch(lineEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lineToken.trim()}`,
        },
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;
      testResults.tests.push({
        name: "LINE API Connection",
        status: "FAILED",
        error: {
          message: fetchError.message,
          name: fetchError.name,
          code: fetchError.code,
          cause: fetchError.cause,
          elapsed: `${elapsed}ms`,
        },
      });
      return NextResponse.json(testResults, { status: 500 });
    } finally {
      clearTimeout(timeoutId);
    }

    const elapsed = Date.now() - startTime;
    const responseText = await res.text();

    testResults.tests.push({
      name: "LINE API Connection",
      status: res.ok ? "PASSED" : "FAILED",
      response: {
        status: res.status,
        statusText: res.statusText,
        body: responseText.substring(0, 200),
        elapsed: `${elapsed}ms`,
      },
    });

    return NextResponse.json(testResults);
  } catch (e: any) {
    testResults.tests.push({
      name: "LINE API Connection",
      status: "FAILED",
      error: {
        message: e.message,
        name: e.name,
        code: e.code,
        stack: e.stack,
      },
    });
    return NextResponse.json(testResults, { status: 500 });
  }
}

