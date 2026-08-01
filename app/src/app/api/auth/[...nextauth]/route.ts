import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        twoFactorToken: { label: "2FA Token", type: "text" }
      },
      async authorize(credentials) {
        const { username, password, twoFactorToken } = credentials || {};
        
        if (!username || !password) return null;

        try {
          const { adminDb } = await import('@/lib/firebaseAdmin');
          const bcrypt = await import('bcryptjs');

          const usersRef = adminDb.collection('householdotp_users');
          const snapshot = await usersRef.where('username', '==', username).get();

          if (snapshot.empty) {
            throw new Error("Username atau password salah");
          }

          let userDoc: any = undefined;
          snapshot.forEach((doc: any) => { userDoc = { id: doc.id, ...doc.data() }; });

          if (!userDoc) {
            throw new Error("Username atau password salah");
          }

          const isValid = await bcrypt.compare(password, userDoc.password);
          if (!isValid) {
            throw new Error("Username atau password salah");
          }

          // 2FA Check
          if (userDoc.two_factor_enabled && userDoc.two_factor_secret) {
            if (!twoFactorToken) {
              throw new Error("2FA_REQUIRED");
            }
            const speakeasy = await import('speakeasy');
            const is2faValid = speakeasy.totp.verify({
                secret: userDoc.two_factor_secret,
                encoding: 'base32',
                token: twoFactorToken,
                window: 1
            });
            if (!is2faValid) {
               throw new Error("Kode 2FA tidak valid");
            }
          }

          return { 
            id: userDoc.id, 
            name: userDoc.name, 
            role: userDoc.role, 
            username: userDoc.username,
            household_only: userDoc.household_only,
            preferences: userDoc.preferences,
            two_factor_enabled: userDoc.two_factor_enabled
          };
        } catch (error: any) {
          console.error("Login error:", error);
          throw new Error(error.message);
        }
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
    async signIn({ user, account, profile }) {
      return true; // For credentials provider
    },
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update" && session?.preferences) {
        token.preferences = session.preferences;
      }
      if (trigger === "update" && session?.two_factor_enabled !== undefined) {
        token.two_factor_enabled = session.two_factor_enabled;
      }
      if (user) {
        token.role = (user as any).role;
        token.id = (user as any).id;
        token.username = (user as any).username;
        token.household_only = (user as any).household_only;
        token.preferences = (user as any).preferences;
        token.two_factor_enabled = (user as any).two_factor_enabled;
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
        (session.user as any).two_factor_enabled = token.two_factor_enabled;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
