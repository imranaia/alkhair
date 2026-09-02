import { requireActiveUser } from "@/lib/auth/session";
import { getUserProfile } from "@/lib/db/users";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Badge } from "@/components/ui/badge";
import { ChangePasswordForm } from "@/app/(public)/change-password/ChangePasswordForm";
import { TourReplayButton } from "@/components/tour/TourTriggerButton";
import { EditProfileForm } from "./EditProfileForm";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function formatDateTime(d: Date | null) {
  if (!d) return "Never";
  return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default async function ProfilePage() {
  const user = await requireActiveUser();
  const profile = await getUserProfile(user.userId);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-lg font-semibold">Profile</h1>

      <GlassPanel data-tour="tour-profile" className="flex items-center gap-4 p-6">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-semibold text-primary">
          {initials(profile?.fullName ?? user.fullName)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{profile?.fullName ?? user.fullName}</p>
          <p className="text-sm text-muted-foreground">@{profile?.username ?? user.username}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">{profile?.roleName ?? user.roleKey}</Badge>
            {profile?.branchName && <Badge variant="outline">{profile.branchName}</Badge>}
          </div>
        </div>
        <TourReplayButton />
      </GlassPanel>

      <GlassPanel className="p-6">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Account details</h2>
        <EditProfileForm
          username={profile?.username ?? user.username}
          fullName={profile?.fullName ?? user.fullName}
          phone={profile?.phone ?? null}
          email={profile?.email ?? null}
        />
        <p className="mt-4 text-xs text-muted-foreground">Last login: {formatDateTime(profile?.lastLoginAt ?? null)}</p>
      </GlassPanel>

      <GlassPanel className="p-6">
        <h2 className="mb-1 text-sm font-semibold text-muted-foreground">Change password</h2>
        <p className="mb-4 text-sm text-muted-foreground">Update your password any time — you don&apos;t need to wait to be prompted.</p>
        <ChangePasswordForm />
      </GlassPanel>
    </div>
  );
}
