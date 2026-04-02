import { AuthCard, AuthPageShell } from "@/components/auth/AuthPageShell";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <AuthPageShell>
      <AuthCard>
        <RegisterForm />
      </AuthCard>
    </AuthPageShell>
  );
}
