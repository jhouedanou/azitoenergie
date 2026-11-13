-- Azito Energie — inscriptions des visiteurs du stand (formulaire affiché avant les jeux).
-- À exécuter une fois dans le projet Supabase (SQL Editor).
-- Le site n'a qu'une clé publique : il peut ajouter une inscription, rien d'autre.
-- Il ne peut ni lire, ni modifier, ni supprimer : les adresses e-mail ne sont pas consultables depuis le site.
-- Pour consulter ou exporter : Table Editor > inscriptions (compte du projet).

create table if not exists public.inscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nom text not null check (char_length(nom) between 2 and 40),
  prenom text not null check (char_length(prenom) between 2 and 40),
  email text not null check (char_length(email) between 5 and 120 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'),
  profil text not null check (profil in ('Étudiant', 'Professionnel', 'Institutionnel', 'Autre'))
);

create index if not exists inscriptions_created_at_idx on public.inscriptions (created_at);

alter table public.inscriptions enable row level security;

-- Ajout seulement. La date vient du poste (inscriptions mises en attente hors connexion) : 7 jours en arrière au plus.
drop policy if exists "Ajout d'une inscription par le site" on public.inscriptions;
create policy "Ajout d'une inscription par le site" on public.inscriptions
  for insert to anon, authenticated
  with check (
    created_at <= now() + interval '10 minutes'
    and created_at >= now() - interval '7 days'
  );

-- Aucune politique de lecture, de modification ni de suppression pour la clé publique.
revoke all on public.inscriptions from anon, authenticated;
grant insert (id, created_at, nom, prenom, email, profil) on public.inscriptions to anon, authenticated;
