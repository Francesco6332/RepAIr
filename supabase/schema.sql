-- RepAIro Core Schema
create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  region text,
  plan text default 'free' check (plan in ('free','pro','pro_plus')),
  diagnoses_this_month int default 0,
  diagnoses_reset_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  make text not null,
  model text not null,
  year int not null,
  engine text,
  fuel_type text check (fuel_type in ('petrol','diesel','electric','hybrid','lpg','cng')),
  plate_number text,
  vin text,
  current_mileage int default 0,
  is_primary boolean default false,
  created_at timestamptz default now()
);

create table if not exists diagnoses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  vehicle_id uuid references vehicles(id) on delete cascade not null,
  type text check (type in ('text','photo','audio')) not null,
  summary text,
  component text,
  confidence real,
  urgency text check (urgency in ('low','medium','high')),
  cost_min decimal(10,2),
  cost_max decimal(10,2),
  status text default 'open' check (status in ('open','resolved','dismissed')),
  resolved_cost decimal(10,2),
  resolved_notes text,
  created_at timestamptz default now()
);

create table if not exists diagnosis_messages (
  id uuid primary key default gen_random_uuid(),
  diagnosis_id uuid references diagnoses(id) on delete cascade not null,
  role text check (role in ('user','assistant')) not null,
  content text not null,
  input_type text default 'text' check (input_type in ('text','photo_description','audio_transcription')),
  created_at timestamptz default now()
);

create table if not exists maintenance_log (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  type text check (type in ('service','repair','inspection','other')),
  description text not null,
  mileage_at int,
  cost decimal(10,2),
  workshop_name text,
  date date not null,
  notes text,
  from_diagnosis_id uuid references diagnoses(id),
  created_at timestamptz default now()
);

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  type text check (type in ('revision','insurance','tax','service','custom')),
  title text not null,
  due_date date not null,
  due_mileage int,
  notified boolean default false,
  completed boolean default false,
  created_at timestamptz default now()
);

create table if not exists known_issues (
  id uuid primary key default gen_random_uuid(),
  make text not null,
  model text not null,
  year_from int,
  year_to int,
  component text not null,
  description text not null,
  severity text check (severity in ('low','medium','high','critical')),
  frequency text,
  avg_cost_min decimal(10,2),
  avg_cost_max decimal(10,2)
);

create table if not exists dtc_codes (
  code text primary key,
  description text not null,
  common_causes text[],
  severity text,
  avg_cost_min decimal(10,2),
  avg_cost_max decimal(10,2)
);

create table if not exists repair_costs (
  id uuid primary key default gen_random_uuid(),
  intervention text not null,
  region text not null,
  avg_cost_min decimal(10,2),
  avg_cost_max decimal(10,2),
  last_updated timestamptz default now()
);

create table if not exists authorized_workshops (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  workshop_name text not null,
  address text,
  country text,
  region text,
  lat double precision,
  lng double precision,
  source text,
  created_at timestamptz default now()
);

alter table vehicles enable row level security;
alter table diagnoses enable row level security;
alter table diagnosis_messages enable row level security;
alter table maintenance_log enable row level security;
alter table reminders enable row level security;
alter table known_issues enable row level security;
alter table dtc_codes enable row level security;
alter table repair_costs enable row level security;
alter table authorized_workshops enable row level security;

create policy "Own vehicles" on vehicles for all using (user_id = auth.uid());
create policy "Own diagnoses" on diagnoses for all using (user_id = auth.uid());
create policy "Own maintenance" on maintenance_log for all using (user_id = auth.uid());
create policy "Own reminders" on reminders for all using (user_id = auth.uid());
create policy "Public known issues" on known_issues for select using (true);
create policy "Public dtc" on dtc_codes for select using (true);
create policy "Public repair costs" on repair_costs for select using (true);
create policy "Public workshops" on authorized_workshops for select using (true);

create policy "Own messages" on diagnosis_messages
for all using (
  diagnosis_id in (select id from diagnoses where user_id = auth.uid())
);
