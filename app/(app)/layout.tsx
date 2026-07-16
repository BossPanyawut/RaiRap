import { redirect } from "next/navigation";
import { signOut } from "../(auth)/actions";
import { Nav } from "@/components/nav";
import { getAlerts } from "@/lib/alerts";
import { getSettings } from "@/lib/profile";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();

  // proxy.ts เด้งไปแล้วในเคสปกติ อันนี้กันพลาดถ้า matcher หลุด
  if (!settings) redirect("/login");

  const alerts = await getAlerts();

  return (
    <>
      <Nav
        displayName={settings.displayName}
        signOut={signOut}
        alerts={alerts}
        currency={settings.currency}
      />
      {children}
    </>
  );
}
