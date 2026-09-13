create table if not exists wordpress_connections (
  id text primary key,
  user_id text not null,
  site_url text not null,
  username text not null,
  encrypted_password text not null,
  label text not null default '',
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp,
  last_tested_at timestamptz,
  unique (user_id, site_url)
);

create index if not exists wordpress_connections_user_idx
  on wordpress_connections (user_id);
