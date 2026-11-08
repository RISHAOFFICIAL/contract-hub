import { redirect } from "next/navigation";

/** /signin is an alias for /login. A redirect target is carried through. */
export default function SigninPage({
  searchParams,
}: {
  searchParams?: { redirect?: string };
}) {
  const target = searchParams?.redirect;
  redirect(
    target ? `/login?redirect=${encodeURIComponent(target)}` : "/login"
  );
}
