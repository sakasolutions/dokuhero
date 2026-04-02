import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <AuthSplitLayout
      desktopAuthLink={{
        href: "/register",
        preface: "Noch kein Konto?",
        label: "Registrieren",
      }}
    >
      <LoginForm />
    </AuthSplitLayout>
  );
}
