import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md text-center text-sm text-slate-600">
          Laden…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
