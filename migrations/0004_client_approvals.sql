create table if not exists project_revisions (
  id text primary key,
  user_id text not null references "user" ("id") on delete cascade,
  title text not null,
  html text not null,
  code text not null,
  content_hash text not null,
  created_at timestamptz not null default current_timestamp
);

create index if not exists project_revisions_user_created_idx
  on project_revisions (user_id, created_at desc);

create table if not exists client_approval_links (
  id text primary key,
  user_id text not null references "user" ("id") on delete cascade,
  revision_id text not null references project_revisions ("id") on delete cascade,
  token_hash text not null unique,
  pin_hash text not null,
  pin_salt text not null,
  client_label text not null default '',
  expires_at timestamptz not null,
  revoked_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  decision_note text not null default '',
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default current_timestamp
);

create index if not exists client_approval_links_user_created_idx
  on client_approval_links (user_id, created_at desc);

create index if not exists client_approval_links_revision_idx
  on client_approval_links (revision_id);
