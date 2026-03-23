import LoginForm from "./login-form";

type LoginPageProps = {
  searchParams?: {
    next?: string;
    error?: string;
  };
};

function getSafeNextPath(value?: string) {
  if (!value || !value.startsWith("/")) return "/dashboard";
  return value;
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const nextPath = getSafeNextPath(searchParams?.next);
  const error = searchParams?.error || "";

  return <LoginForm nextPath={nextPath} initialError={error} />;
}
