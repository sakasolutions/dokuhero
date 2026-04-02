import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <AuthSplitLayout>
      <LoginForm />
    </AuthSplitLayout>
  );
}
