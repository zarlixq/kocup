-- 4 koç hesabı için auth.users + profiles seed (login YOK — sadece landing/panel display)
-- raw_user_meta_data.role = 'coach' set edilince handle_new_user trigger profiles satırını oluşturur.

do $$
declare
  v_ferda  uuid := gen_random_uuid();
  v_suheyla uuid := gen_random_uuid();
  v_serap  uuid := gen_random_uuid();
  v_ferah  uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_user_meta_data, raw_app_meta_data,
    is_super_admin, is_sso_user, is_anonymous
  )
  values
    ('00000000-0000-0000-0000-000000000000', v_ferda,
      'authenticated', 'authenticated', 'ferda.tuna@kocup.local',
      null, now(), now(), now(),
      jsonb_build_object('role', 'coach', 'full_name', 'Ferda Tuna', 'phone', null),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      false, false, false),
    ('00000000-0000-0000-0000-000000000000', v_suheyla,
      'authenticated', 'authenticated', 'suheyla.dalhancer@kocup.local',
      null, now(), now(), now(),
      jsonb_build_object('role', 'coach', 'full_name', 'Süheyla Dalhançer', 'phone', null),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      false, false, false),
    ('00000000-0000-0000-0000-000000000000', v_serap,
      'authenticated', 'authenticated', 'serap.firis@kocup.local',
      null, now(), now(), now(),
      jsonb_build_object('role', 'coach', 'full_name', 'Serap Fırış', 'phone', null),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      false, false, false),
    ('00000000-0000-0000-0000-000000000000', v_ferah,
      'authenticated', 'authenticated', 'ferah.tahtabasi@kocup.local',
      null, now(), now(), now(),
      jsonb_build_object('role', 'coach', 'full_name', 'Ferah Tahtabaşı', 'phone', null),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      false, false, false);

  -- Profil satırları trigger ile oluştu — bio + sertifika doldur
  update public.profiles set
    bio = 'YKS koçluğunda öğrencilerine bireysel program ve düzenli takip sağlar. Sınav stresi yönetimi ve motivasyon odaklı çalışır.',
    certificate_info = 'MYK Onaylı Eğitim Koçluğu Sertifikası',
    years_experience = 4,
    specialties = array['TYT', 'AYT', 'Motivasyon']
  where id = v_ferda;

  update public.profiles set
    bio = 'Sayısal alanda derinleşmiş, öğrenciye özel müfredat ve haftalık değerlendirme ile birebir takip yapan deneyimli bir koç.',
    certificate_info = 'MYK Onaylı Eğitim Koçluğu Sertifikası',
    years_experience = 5,
    specialties = array['YKS Sayısal', 'Matematik', 'Fen']
  where id = v_suheyla;

  update public.profiles set
    bio = 'Sözel alan ve sınav kaygısı yönetiminde uzmanlaşmış, öğrencinin psikolojik dayanıklılığını öne çıkaran bir koç.',
    certificate_info = 'MYK Onaylı Eğitim Koçluğu Sertifikası',
    years_experience = 3,
    specialties = array['YKS Sözel', 'Sınav Kaygısı', 'Edebiyat']
  where id = v_serap;

  update public.profiles set
    bio = 'LGS ve YKS hazırlığında program tasarımı ve düzenli takip ile öğrenciyi hedefine odaklı tutar.',
    certificate_info = 'MYK Onaylı Eğitim Koçluğu Sertifikası',
    years_experience = 4,
    specialties = array['LGS', 'YKS', 'Zaman Yönetimi']
  where id = v_ferah;
end $$;
