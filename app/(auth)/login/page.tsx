import { AuthCard, AuthPageShell } from "@/components/auth/AuthPageShell";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <AuthPageShell>
      <AuthCard>
        <LoginForm />
      </AuthCard>
    </AuthPageShell>
  );
}
