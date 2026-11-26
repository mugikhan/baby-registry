import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AirmailEdge } from "@/components/AirmailEdge";
import { fetchAdminMe } from "@/lib/admin-me";

export const Route = createFileRoute("/admin")({
  ssr: false,
  loader: () => fetchAdminMe(),
  head: () => ({ meta: [{ title: "Admin · Baby Khan" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const { email } = Route.useLoaderData();
  return (
    <>
      <AirmailEdge />
      <main className="mx-auto max-w-[1120px] px-5 pt-8 pb-12">
        <p className="text-[16px] text-ocean-muted">Signed in as {email}</p>
        <Outlet />
      </main>
    </>
  );
}
