import { redirect } from "next/navigation";

export default function AdminOverview() {
  // Redirecting Overview directly to Analytics for a richer default landing
  redirect("/admin/analytics");
}
