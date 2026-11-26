import { createFileRoute } from "@tanstack/react-router";
import { AirmailEdge } from "@/components/AirmailEdge";
import { fetchAdminMe } from "@/lib/admin-me";

export const Route = createFileRoute("/admin")({
  ssr: false,
  loader: () => fetchAdminMe(),
  head: () => ({ meta: [{ title: "Admin · Baby Khan" }] }),
  component: AdminHome,
});

function AdminHome() {
  const { email } = Route.useLoaderData();
  return (
    <>
      <AirmailEdge />
      <main className="mx-auto max-w-[1120px] px-5 pt-10 pb-12">
        <h1 className="text-[34px] leading-[1.05] font-extrabold tracking-[-0.01em] text-ink">
          Admin
        </h1>
        <p className="mt-3 text-[18px] text-ocean-muted">Signed in as {email}</p>
      </main>
    </>
  );
}
