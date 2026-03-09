-- ============================================================
-- GED Project Matcher – Supabase PostgreSQL Schema
-- ENSAM Meknès – 4A GED
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. PROFILES (student groups / binômes)
-- ============================================================
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  group_name  TEXT NOT NULL,               -- e.g. "Binôme 1"
  member_1    TEXT NOT NULL,               -- full name
  member_2    TEXT NOT NULL,               -- full name
  member_3    TEXT,                         -- optional third member
  is_admin    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins can view all profiles (uses auth.users to avoid recursion)
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_user_meta_data->>'is_admin')::boolean = TRUE
    )
  );

-- Allow insert during signup
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- 2. PROJECTS
-- ============================================================
CREATE TABLE public.projects (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  professor   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read projects
CREATE POLICY "Authenticated users can read projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (TRUE);

-- ============================================================
-- 3. PREFERENCES
-- ============================================================
CREATE TABLE public.preferences (
  id          SERIAL PRIMARY KEY,
  group_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id  INTEGER NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  rank        INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 5),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each group can rank a project only once
  UNIQUE (group_id, project_id),
  -- Each group can have only one project at each rank
  UNIQUE (group_id, rank)
);

ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own preferences"
  ON public.preferences FOR SELECT
  USING (auth.uid() = group_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
  ON public.preferences FOR INSERT
  WITH CHECK (auth.uid() = group_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences"
  ON public.preferences FOR UPDATE
  USING (auth.uid() = group_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete own preferences"
  ON public.preferences FOR DELETE
  USING (auth.uid() = group_id);

-- Admins can view all preferences (needed for the algorithm)
CREATE POLICY "Admins can view all preferences"
  ON public.preferences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

-- ============================================================
-- 4. ASSIGNMENTS (results of the algorithm)
-- ============================================================
CREATE TABLE public.assignments (
  id          SERIAL PRIMARY KEY,
  group_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id  INTEGER NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  rank_given  INTEGER,  -- the rank the group originally gave (NULL if unranked)
  score       INTEGER NOT NULL DEFAULT 0,
  run_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (group_id),
  UNIQUE (project_id)
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view assignments (results are public)
CREATE POLICY "Authenticated users can view assignments"
  ON public.assignments FOR SELECT
  TO authenticated
  USING (TRUE);

-- Only admins can insert/delete assignments
CREATE POLICY "Admins can manage assignments"
  ON public.assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

-- ============================================================
-- 5. SEED DATA – 23 GED Projects
-- ============================================================
INSERT INTO public.projects (id, title, professor) VALUES
  (1,  'Réalisation d''une commande par modes glissants sur carte ESP32 pour l''équilibrage d''un système birotor.', 'Mr Taleb'),
  (2,  'Développement d''une commande à distance par protocole zigbee d''un moteur à courant continu.', 'Mr Taleb'),
  (3,  'Commande par modes glissants adaptatives et linéarisation entrée-sortie d''un quadrirotor.', 'Mr Taleb'),
  (4,  'Conception et mise en œuvre d''un jumeau numérique d''un système moteur-variateur piloté par automate Siemens S7-1200 avec acquisition et digitalisation des vibrations.', 'Mr Hafiane'),
  (5,  'Mise en œuvre d''un serveur centralisé de données et développement d''une plateforme de supervision de la consommation d''énergie et d''eau de l''ENSAM de Meknès.', 'Mr Hafiane'),
  (6,  'Conception et réalisation d''un système de digitalisation automatique des index de compteurs mécaniques d''eau par traitement d''images.', 'Mr Hafiane'),
  (7,  'Conception et implémentation d''un jumeau numérique (Digital Twin) d''un système photovoltaïque pour la supervision, la simulation et l''optimisation des performances énergétiques.', 'Mme Chanaa'),
  (8,  'Conception d''un système intelligent de gestion d''éclairage basé sur l''IoT pour l''optimisation énergétique des bâtiments.', 'Mme Chanaa'),
  (9,  'Conception et réalisation d''un prototype de chargeur intelligent pour véhicule électrique avec gestion optimisée de la charge et supervision numérique.', 'Mme Chanaa'),
  (10, 'Utilisation des stratégies de contrôle avancées, et introduction des techniques d''apprentissage automatique et des réseaux de neurones artificiels, pour la prédiction des variables environnementales.', 'Mr Mkhida'),
  (11, 'Évaluation de données issues de capteurs et d''images acquises en serre intelligente, par l''utilisation de modèles d''intelligence artificielle et d''apprentissage automatique pour la détection des maladies et la prédiction des paramètres climatiques.', 'Mr Mkhida'),
  (12, 'Prediction of robot localisation using hidden markov model, Remaining Useful Life Evaluation.', 'Mr Mkhida'),
  (13, 'Étalonnage du bras robot Pincher : Application de la méthode Monté Carlo.', 'Mr Saadi'),
  (14, 'Réalisation de la sécurité de transmission Numérique QAM Microonde.', 'Mr Saadi'),
  (15, 'Réalisation d''un modulateur IQ pour capteur IOT dans le réseau Lora.', 'Mr Saadi'),
  (16, 'Conception et réalisation d''un convertisseur Buck connecté associé à un système photovoltaïque.', 'Mr Eddahmani'),
  (17, 'Étude et réalisation d''un système IoT de maintenance prédictive pour moteur asynchrone industriel.', 'Mr Eddahmani'),
  (18, 'Conception et réalisation d''un Mini-SCADA IoT open-source (simulation).', 'Mr Aitbouh'),
  (19, 'Conception et réalisation d''une plateforme cloud de collecte IoT multi-clients (simulation).', 'Mr Aitbouh'),
  (20, 'Development of smart system using voice, gesture and eye movement recognition.', 'Mr Aitbouh'),
  (21, 'Mise en œuvre d''une communication 5.0 entre un robot, un opérateur en réalité augmentée AR et un convoyeur industriel.', 'Mr Sabor'),
  (22, 'Inspection digitale des armoires électriques via image thermique par machine learning implantée en carte Jetson.', 'Mr Sabor'),
  (23, 'Digitalisation de l''énergie avec modélisation en jumeau numérique d''un banc de variateur de vitesse.', 'Mr Sabor');

-- Reset the serial sequence to continue after 23
SELECT setval('public.projects_id_seq', 23);
