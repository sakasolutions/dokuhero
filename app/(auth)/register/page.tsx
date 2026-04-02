import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <AuthSplitLayout>
      <RegisterForm />
    </AuthSplitLayout>
  );
}
