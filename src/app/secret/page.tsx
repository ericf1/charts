// app/secret/page.tsx
import { auth } from "../auth"; // NextAuth v5 server helper
import { redirect } from "next/navigation";
import LinkAdder from "./LinkAdder";

export default async function SecretPage() {
  const session = await auth();

  // No login → redirect
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  // Restrict by email (or id from DB)
  if (session.user.email !== process.env.ALLOWED_EMAIL) {
    redirect("/"); // or show 403 page
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Import Album</h1>
      <p className="text-sm text-gray-600">
        Paste an Apple Music or Deezer album URL to import tracks into the
        database.
      </p>

      <LinkAdder />
    </main>
  );
}
