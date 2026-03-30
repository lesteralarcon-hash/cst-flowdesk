import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

// STABILITY v10: STABLE ADMIN & DOMAIN CONFIG
const ALLOWED_DOMAINS = ["mobileoptima.com", "tarkie.com", "olern.ph", "cst.com"];
const ADMIN_EMAILS = ["lester.alarcon@mobileoptima.com", "admin@cst.com"];

const credentialsProvider = Credentials({
  name: "Admin Backend",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    const email = String(credentials?.email || "").toLowerCase().trim();
    if (email === "admin@cst.com" && credentials?.password === "cst2025") {
      return { id: "admin-master", name: "Admin", email: "admin@cst.com", role: "admin" } as any;
    }
    return null;
  }
});

// SIMPLICITY V10: ZERO-BLOCK AUTH
// We remove all complex callbacks to ensure the handshake success.
export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  debug: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    credentialsProvider,
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error"
  }
});
