import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import axios from "axios";
import jwt from "jsonwebtoken"; // Correctly import jsonwebtoken

export const authOptions = {
  providers: [
    
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email", required: true },
        password: { label: "Password", type: "password", required: true },
      },

      async authorize(credentials) {
        try {
          const response = await axios.post(
            process.env.NEXT_PUBLIC_API_URL + "/login",
            {
              email: credentials.email,
              password: credentials.password,
            },
            {
              headers: { "Content-Type": "application/json" },
            }
          );
          const jwtToken = response.data.token;
          if (jwtToken) {
            const user = jwt.verify(jwtToken, process.env.JWT_SECRET);
            return user;
          } else {
            return null;
          }
        } catch (error) {
          console.error("Error: ", error);
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // If this is the first time the token is being created (after login)
      if (user) {
        token.id = user.id; // Assuming user.id exists
        token.role = user.role;
        token.username = user.username; // Assuming user.role exists
      }
      return token;
    },
    async session({ session, token }) {
      // Add properties to the session.user object
      session.user.id = token.id; // Include user id in session
      session.user.role = token.role;
      session.user.username = token.username; // Assuming token.username exists
      // Include user role in session
      return session;
    },
  },

  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    signOut: "/",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
