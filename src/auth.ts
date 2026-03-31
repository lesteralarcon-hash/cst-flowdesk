import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

import { prisma } from "@/lib/prisma";

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
    const password = String(credentials?.password || "");
    const devPassword = process.env.DEV_PASSWORD;

    if (ADMIN_EMAILS.includes(email)) {
      if (password === "admin" || password === "cst2025" || (devPassword && password === devPassword)) {
        // SELF-HEALING: Ensure the admin exists in the DB so other APIs don't crash
        const user = await prisma.user.upsert({
          where: { email },
          update: { role: "admin", name: "Admin" },
          create: { id: email === "admin@cst.com" ? "admin-master" : `user_${Date.now()}`, name: "Admin", email, role: "admin" }
        });
        return user as any;
      }
    }
    return null;
  }
});

// SIMPLICITY V10: ZERO-BLOCK AUTH
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
  callbacks: {
    async signIn({ user, account }) {
      const email = user.email?.toLowerCase().trim();
      if (!email) return false;

      const isAdmin = ADMIN_EMAILS.includes(email);
      
      if (account?.provider === "google") {
        try {
          // 1. MASTER ADMIN BINDING: Always allow whitelisted masters
          if (isAdmin) {
            await prisma.user.upsert({
              where: { email },
              update: { role: "admin", name: user.name || "Master Admin", status: "approved" },
              create: { id: email === "admin@cst.com" ? "admin-master" : `user_${Date.now()}`, name: user.name || "Master Admin", email, role: "admin", status: "approved" }
            });
            return true;
          }

          // 2. DOMAIN SECURITY LOCKDOWN: mobileoptima.com, tarkie.com, olern.ph, cst.com
          const isFromAllowedDomain = ALLOWED_DOMAINS.some(domain => email.endsWith(`@${domain}`));
          
          if (isFromAllowedDomain) {
            // Check if user is ALREADY in the database (pre-registered by Admin)
            const dbUser = await prisma.user.findUnique({
              where: { email }
            });

            if (dbUser) {
              // If they exist but were blocked/pending, stick to their status
              return dbUser.status === "approved";
            }

            // DENY: User is from a domain but NOT pre-registered in the DB
            console.warn(`Blocking unregistered access attempt from: ${email}`);
            return false;
          }

          // 3. OTHERS: Deny all other domains
          return false;
        } catch (err) {
          console.error("Auth: signIn DB error:", err);
          // If DB is down, only allow Master Admins to enter to fix it
          return isAdmin;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user && !token.id) {
        token.id = user.id;
      }
      
      const email = token.email?.toLowerCase().trim();
      const isAdmin = email && ADMIN_EMAILS.includes(email);
      
      if (email) {
        try {
          const dbUser = await prisma.user.findUnique({ where: { email } });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            if (isAdmin && dbUser.role !== "admin") {
              token.role = "admin";
            }
          } else if (isAdmin) {
             token.role = "admin";
          }
        } catch {
          token.role = isAdmin ? "admin" : "user";
        }
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user && token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error"
  }
});
