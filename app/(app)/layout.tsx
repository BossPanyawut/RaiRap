import { redirect } from "next/navigation";
import { signOut } from "../(auth)/actions";
import { Nav } from "@/components/nav";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts เด้งไปแล้วในเคสปกติ อันนี้กันพลาดถ้า matcher หลุด — และทำให้
  // user ที่ส่งลง children ไม่มีทางเป็น null
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  return (
    <>
      <Nav displayName={profile?.display_name ?? null} signOut={signOut} />
      {children}
    </>
  );
}
