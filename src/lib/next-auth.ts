import { validateHash } from "@/lib/hash";
import { findUser } from "@/queries/user.query"; // prisma query user
import { Role } from "@prisma/client";
import {
  getServerSession as nextAuthGetServerSession,
  type AuthOptions,
  type DefaultSession,
} from "next-auth";
import type { DefaultJWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";

// -----------------
// 🔹 Type Augmentation
// -----------------
declare module "next-auth" {
  interface Session {
    user?: {
      id: string;
      role: Role;
      nama: string;
      email: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: Role;
    nama: string;
    email: string;
  }
}

// -----------------
// 🔹 NextAuth Options
// -----------------
export const authOptions: AuthOptions = {
  theme: {
    colorScheme: "light",
    brandColor: "#E04E4E",
    logo: "/",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 hari
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "user@example.com" },
        password: { label: "Password", type: "password", placeholder: "********" },
      },
      async authorize(credentials) {
          if (!credentials?.email || !credentials.password) return null;

          const user = await findUser({ email: credentials.email });
          if (!user) return null;

          const isValidPassword = validateHash(credentials.password, user.password);
          if (!isValidPassword) return null;

          return {
            id: user.id,
            role: user.role,
            nama: user.nama,
            email: user.email,
          };
      },
    }),
  ],
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      return url.startsWith("/") ? `${baseUrl}${url}` : url;
    },
    async signIn() {
      return true;
    },
    async jwt({ token, user }) {
      // inject data saat login pertama kali
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.nama = (user as any).nama;
        token.email = user.email!;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.nama = token.nama as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// helper buat server
export const getServerSession = () => nextAuthGetServerSession(authOptions);
