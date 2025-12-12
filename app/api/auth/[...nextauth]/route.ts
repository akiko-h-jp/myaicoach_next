import NextAuth, { type NextAuthOptions } from "next-auth";
import { SupabaseAdapter } from "@auth/supabase-adapter";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase environment variables");
}

export const authOptions: NextAuthOptions = {
  adapter: SupabaseAdapter({
    url: supabaseUrl,
    secret: supabaseServiceRoleKey,
  }),
  // セッションはDBに保存
  session: { strategy: "database" },
  // Supabase Authでメール+パスワードを扱うため、Providerは空にしておく
  providers: [],
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

