-- spec 2.6 แนบรูปใบเสร็จ

alter table transactions
add column receipt_path text;

-- bucket ส่วนตัว ห้าม public — ใบเสร็จมีชื่อร้าน ยอดเงิน บางทีมีเลขบัตร
-- bucket public เปิดให้ใครก็เดา URL แล้วโหลดไฟล์ได้โดยไม่ต้องล็อกอิน
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- ทุกไฟล์ต้องอยู่ใต้โฟลเดอร์ชื่อ uid ของเจ้าของ: receipts/<uid>/<uuid>.jpg
-- policy เทียบ storage.foldername(name)[1] กับ auth.uid() → คนอื่นอ่านไม่ได้
-- และอัปโหลดเข้าโฟลเดอร์คนอื่นก็ไม่ได้
--
-- ถ้าไม่มีเงื่อนไขโฟลเดอร์นี้ ผู้ใช้ที่ล็อกอินคนไหนก็อ่านใบเสร็จของทุกคนได้
-- เพราะ RLS ของ storage.objects ไม่รู้จักความเป็นเจ้าของด้วยตัวเอง
create policy "receipts: อ่านของตัวเอง" on storage.objects
for select to authenticated
using (
  bucket_id = 'receipts'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "receipts: อัปโหลดเข้าโฟลเดอร์ตัวเอง" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'receipts'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "receipts: ลบของตัวเอง" on storage.objects
for delete to authenticated
using (
  bucket_id = 'receipts'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);
