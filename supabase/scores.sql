-- Azito Energie — classement de Build Azito.
-- À exécuter une fois dans le projet Supabase (SQL Editor).
-- La borne n'a qu'une clé publique : elle peut lire le classement et ajouter un temps, rien d'autre.

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  day date not null default ((now() at time zone 'Africa/Abidjan')::date),
  name text not null check (char_length(name) between 1 and 14),
  time_s numeric(4, 1) not null check (time_s > 0 and time_s <= 30),
  puzzle text not null check (puzzle in ('aerienne', 'cheminees', 'cheminee'))
);

create index if not exists scores_day_time_idx on public.scores (day, time_s);

alter table public.scores enable row level security;

-- Lecture publique : le classement s'affiche sur la borne.
drop policy if exists "Lecture publique du classement" on public.scores;
create policy "Lecture publique du classement" on public.scores
  for select to anon, authenticated
  using (true);

-- Ajout seulement : un temps du jour (ou des 7 derniers jours, pour les temps mis en attente hors connexion).
drop policy if exists "Ajout d'un temps par la borne" on public.scores;
create policy "Ajout d'un temps par la borne" on public.scores
  for insert to anon, authenticated
  with check (
    day <= ((now() at time zone 'Africa/Abidjan')::date)
    and day >= ((now() at time zone 'Africa/Abidjan')::date) - 7
  );

-- Pas de modification ni de suppression avec la clé publique ; created_at n'est pas modifiable par la borne.
revoke all on public.scores from anon, authenticated;
grant select on public.scores to anon, authenticated;
grant insert (id, day, name, time_s, puzzle) on public.scores to anon, authenticated;
