-- ผู้ใช้ที่สมัครผ่าน OAuth (Google / Facebook) ไม่ได้กรอกชื่อในฟอร์มของเรา
-- provider ส่งชื่อมาใน metadata คนละ key: Google/Facebook ใช้ full_name และ name
-- ฟอร์มสมัครของแอปใช้ display_name — ไล่ตามลำดับ ให้ค่าที่ผู้ใช้ตั้งเองชนะเสมอ
create or replace function handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    )
  );

  perform public.seed_default_categories(new.id);
  return new;
end;
$$;
