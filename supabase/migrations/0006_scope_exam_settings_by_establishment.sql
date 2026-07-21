-- Les réglages d'épreuves deviennent propres à chaque établissement (au lieu
-- d'être globaux), pour que chaque formateur/directeur ne gère que les
-- épreuves de son propre établissement.
alter table public.exam_settings drop constraint if exists exam_settings_pkey;
alter table public.exam_settings add column if not exists etablissement text not null default 'GLOBAL';
alter table public.exam_settings add primary key (exam_id, etablissement);
