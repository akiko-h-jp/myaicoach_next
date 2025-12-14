import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function getUserFromRequest(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("getUserFromRequest: No Authorization header or invalid format");
      return null;
    }

    // Bearer の後の部分を取得
    let token = authHeader.replace(/^Bearer\s+/, "").trim();
    
    // JWTトークンの形式（3つの部分がドットで区切られている）のみを抽出
    // これにより、環境変数などが混入していてもJWT形式の部分だけを取得できる
    const jwtPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/;
    const match = token.match(jwtPattern);
    if (!match) {
      console.warn("getUserFromRequest: Token does not match JWT pattern");
      return null;
    }
    token = match[0];

    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      console.error("getUserFromRequest: Supabase auth error:", error.message);
      return null;
    }
    if (!data.user) {
      console.warn("getUserFromRequest: No user data returned");
      return null;
    }

    return data.user;
  } catch (error: any) {
    console.error("getUserFromRequest: Unexpected error:", error);
    return null;
  }
}

