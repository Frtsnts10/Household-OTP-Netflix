import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const { username, password } = credentials || {};
        
        if (!username || !password) return null;

        try {
          const res = await fetch("http://localhost:5001/api/users/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": process.env.BACKEND_API_KEY || ""
            },
            body: JSON.stringify({ username, password })
          });

          if (res.ok) {
            const user = await res.json();
            return { 
              id: user.id, 
              name: user.name, 
              role: user.role, 
              username: user.username,
              household_only: user.household_only,
              preferences: user.preferences
            };
          }
        } catch (error) {
          console.error("Login error:", error);
        }

        return null;
      }
    })
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session?.preferences) {
        token.preferences = session.preferences;
      }
      if (user) {
        token.role = (user as any).role;
        token.id = (user as any).id;
        token.username = (user as any).username;
        token.household_only = (user as any).household_only;
        token.preferences = (user as any).preferences;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).username = token.username;
        (session.user as any).household_only = token.household_only;
        (session.user as any).preferences = token.preferences;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
