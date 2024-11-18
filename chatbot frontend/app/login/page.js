import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import LoginForm from "@/components/LoginForm";
import { authOptions } from "../api/auth/[...nextauth]/route";

export default async function Login() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/");
  return <LoginForm />;
}
