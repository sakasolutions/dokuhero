import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <AuthSplitLayout
      desktopAuthLink={{
        href: "/login",
        preface: "Bereits ein Konto?",
        label: "Anmelden",
      }}
    >
      <RegisterForm />
    </AuthSplitLayout>
  );
}
