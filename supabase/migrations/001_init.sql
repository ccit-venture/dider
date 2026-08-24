-- Jalankan di Supabase SQL Editor atau `supabase db push`
-- Skema ini versi Supabase (uuid). Untuk mode sqlite, skema otomatis dibuat di src/db.ts.

create table if not exists projects (
  id uuid primary key,
  nama text not null,
  ukuran jsonb not null,        -- { lebar, tinggi } px @96dpi
  halaman jsonb not null,       -- array of halaman { id, blok: [...] }
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists sessions (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);
