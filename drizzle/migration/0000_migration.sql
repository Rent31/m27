CREATE TABLE public.missions (
  id text PRIMARY KEY,
  name text NOT NULL,
  environment text NOT NULL,
  difficulty text NOT NULL DEFAULT 'standard',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.mission_tasks (
  id text PRIMARY KEY,
  mission_id text NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  task_type text NOT NULL,
  priority int NOT NULL,
  target text NOT NULL,
  xp int NOT NULL DEFAULT 0,
  required_resources jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mission_tasks_mission_idx ON public.mission_tasks(mission_id, priority);

CREATE TABLE public.mission_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id text NOT NULL REFERENCES public.missions(id),
  player_token text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','failed','abandoned')),
  score int NOT NULL DEFAULT 0,
  difficulty text NOT NULL DEFAULT 'standard',
  final_outcome text,
  summary jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mission_runs_player_idx ON public.mission_runs(player_token, started_at DESC);

CREATE TABLE public.mission_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.mission_runs(id) ON DELETE CASCADE,
  client_key text NOT NULL,
  event_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical','resolved')),
  resource_impact jsonb NOT NULL DEFAULT '{}'::jsonb,
  player_decision text,
  mission_minute numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, client_key)
);
CREATE INDEX mission_events_run_idx ON public.mission_events(run_id, mission_minute);

CREATE TABLE public.resource_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.mission_runs(id) ON DELETE CASCADE,
  life_support numeric NOT NULL,
  power numeric NOT NULL,
  radiation_safety numeric NOT NULL,
  food numeric NOT NULL,
  water numeric NOT NULL,
  crew_stability numeric NOT NULL,
  mission_minute numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX resource_snapshots_run_idx ON public.resource_snapshots(run_id, mission_minute);

CREATE TABLE public.task_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.mission_runs(id) ON DELETE CASCADE,
  task_id text NOT NULL REFERENCES public.mission_tasks(id),
  status text NOT NULL DEFAULT 'completed',
  player_action text,
  mission_minute numeric NOT NULL DEFAULT 0,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, task_id)
);

GRANT SELECT ON public.missions, public.mission_tasks TO anon, authenticated;
GRANT ALL ON public.missions, public.mission_tasks, public.mission_runs, public.mission_events, public.resource_snapshots, public.task_completions TO service_role;

ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mission catalog is public" ON public.missions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Task catalog is public" ON public.mission_tasks FOR SELECT TO anon, authenticated USING (true);
-- Run data: no client policies; accessed only through server functions that verify the player token.

INSERT INTO public.missions (id, name, environment, difficulty, status) VALUES
('lunar-27','Mission27 Lunar Outpost','moon','standard','active'),
('earth-training','Earth Training Center','earth','training','active');

INSERT INTO public.mission_tasks (id, mission_id, title, description, task_type, priority, target, xp) VALUES
('talk-ari','lunar-27','Talk to Commander Ari','Receive the mission briefing from the commander.','crew',1,'ari',20),
('check-power','lunar-27','Check the Power Station','Inspect solar generation and battery state.','systems',2,'power',25),
('inspect-gh','lunar-27','Inspect the Greenhouse','Check crop health, water and lighting.','systems',3,'greenhouse',25),
('check-hab','lunar-27','Check habitat pressure','Read the habitat pressure panel.','systems',4,'habitat',20),
('prep-eva','lunar-27','Run EVA suit checks at the Airlock','Complete the suit checklist before leaving the base.','systems',5,'airlock',40),
('sample1','lunar-27','Collect a basalt sample (east)','Collect a mare basalt sample from the eastern outcrop.','exploration',6,'rock1',40),
('drive','lunar-27','Take the rover for a drive','Board and operate the pressurized rover.','mobility',7,'rover',30),
('photo','lunar-27','Photograph Earth from Earthrise Ridge','Photograph Earth from the ridge.','exploration',8,'earthview',40),
('lab','lunar-27','Analyze samples in the Science Lab','Process collected samples for science return.','systems',9,'lab',50),
('comms','lunar-27','Repair the comms antenna','Reconnect the antenna feed harness.','systems',10,'comms',40),
('sample2','lunar-27','Collect a highland sample (west)','Collect an anorthosite highland sample.','exploration',11,'rock2',40),
('crater','lunar-27','Scan the crater rim','Map impact ejecta along the crater rim.','exploration',12,'crater',50),
('help-nova','lunar-27','Help Nova with life support','Assist the life support specialist.','crew',13,'nova',25),
('sample3','lunar-27','Collect a breccia sample (south)','Collect a regolith breccia sample.','exploration',14,'rock3',40),
('storage','lunar-27','Organize supply storage','Inventory and organize supplies.','systems',15,'storage',20),
('cmd','lunar-27','Report status from Command','Transmit a status report to Earth.','crew',16,'cmd',25);