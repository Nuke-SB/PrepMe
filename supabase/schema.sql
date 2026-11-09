-- PrepMe database schema (Supabase / Postgres). Matches the live "PrepMe" project.
-- The app only reads these tables, using the public (anon) key. Writes are done by the loader scripts with admin access.

create table if not exists subcategories (
  skill_id      text primary key,              -- e.g. G2-AD-08
  grade         smallint not null default 1,
  topic         text not null,                 -- K5 topic name, e.g. "Addition"
  subtopic      text not null,                 -- K5 sub-section name, e.g. "Whole tens & hundreds"
  skill_pattern text not null,
  standard      text,                          -- Common Core code, e.g. 2.NBT.7
  grade_fit     text,                          -- where Common Core places the skill
  sort_order    smallint                       -- order shown in a test
);

create table if not exists questions (
  q_id               text primary key,         -- e.g. G2-AD-08-03
  skill_id           text not null,
  grade              smallint not null default 1,
  topic              text not null,
  subtopic           text not null,
  skill_pattern      text not null,
  standard           text,
  grade_fit          text,
  is_stretch         boolean not null default false,   -- skill is taught in a later grade
  difficulty         smallint not null check (difficulty between 1 and 3),
  format             text not null,
  visual_type        text not null default 'none',     -- which picture to draw (clock, coins, pie, ...)
  params             jsonb,                            -- data used to draw the picture
  answer_type        text,                             -- choice_text, choice_picture, number, multi_number, time
  question           text not null,
  options            jsonb,
  correct_answer     text not null,                    -- multi_number answers are joined with "|"
  wrong_answer_notes text,                             -- what a wrong answer usually means
  status             text not null default 'draft' check (status in ('draft','approved','fix','rejected')),
  meta               jsonb,                            -- reserved
  created_at         timestamptz not null default now()
);

alter table subcategories enable row level security;
alter table questions enable row level security;
create policy "Public can read subcategories" on subcategories for select using (true);
create policy "Public can read questions" on questions for select using (true);
