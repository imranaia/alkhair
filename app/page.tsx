import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getSiteContent } from "@/lib/db/siteContent";
import { LandingPageView } from "./LandingPageView";

export default async function LandingPage() {
  const user = await getCurrentUser();
  // Everyone gets redirected to their own area on login — except a super
  // admin, who can still land here to see (and edit) the public page real
  // visitors see, rather than never being able to view it at all.
  if (user && user.roleKey !== "super_admin") {
    redirect(user.roleKey === "client" ? "/portal" : "/dashboard");
  }

  const content = await getSiteContent();

  return <LandingPageView initialContent={content} isSuperAdmin={user?.roleKey === "super_admin"} />;
}
