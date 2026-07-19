CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: alert_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.alert_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'student',
    'parent'
);


--
-- Name: curriculum_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.curriculum_type AS ENUM (
    'US',
    'Indian',
    'IB',
    'Other'
);


--
-- Name: session_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.session_status AS ENUM (
    'scheduled',
    'completed',
    'cancelled'
);


--
-- Name: session_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.session_type AS ENUM (
    'tutoring',
    'counseling',
    'live_class'
);


--
-- Name: subject_name; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subject_name AS ENUM (
    'Math',
    'Science',
    'English',
    'Social Studies',
    'Hindi',
    'Sanskrit',
    'Computer Science',
    'Other'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  );
  
  -- Assign default student role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    priority public.alert_priority DEFAULT 'medium'::public.alert_priority NOT NULL,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    student_profile_id uuid NOT NULL,
    assessment_data jsonb NOT NULL,
    completed_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cultural_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cultural_modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    module_type text NOT NULL,
    title text NOT NULL,
    description text,
    progress_percentage integer DEFAULT 0 NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gap_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gap_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    assessment_id uuid NOT NULL,
    subject public.subject_name NOT NULL,
    mastery_percentage integer DEFAULT 0 NOT NULL,
    gaps_identified text[],
    recommendations text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: learning_pathways; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.learning_pathways (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    subject public.subject_name NOT NULL,
    status text DEFAULT 'not_started'::text NOT NULL,
    due_date timestamp with time zone,
    resources jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: progress_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.progress_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    overall_mastery integer DEFAULT 0 NOT NULL,
    topics_completed integer DEFAULT 0 NOT NULL,
    active_weeks integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_type public.session_type NOT NULL,
    title text NOT NULL,
    description text,
    scheduled_at timestamp with time zone NOT NULL,
    duration_minutes integer DEFAULT 60 NOT NULL,
    status public.session_status DEFAULT 'scheduled'::public.session_status NOT NULL,
    meeting_link text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: student_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    student_name text NOT NULL,
    age integer NOT NULL,
    current_grade text NOT NULL,
    current_country text NOT NULL,
    previous_curriculum public.curriculum_type NOT NULL,
    target_curriculum public.curriculum_type NOT NULL,
    transition_timeline text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: alerts alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_pkey PRIMARY KEY (id);


--
-- Name: assessments assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_pkey PRIMARY KEY (id);


--
-- Name: cultural_modules cultural_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cultural_modules
    ADD CONSTRAINT cultural_modules_pkey PRIMARY KEY (id);


--
-- Name: gap_reports gap_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gap_reports
    ADD CONSTRAINT gap_reports_pkey PRIMARY KEY (id);


--
-- Name: learning_pathways learning_pathways_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_pathways
    ADD CONSTRAINT learning_pathways_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: progress_stats progress_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progress_stats
    ADD CONSTRAINT progress_stats_pkey PRIMARY KEY (id);


--
-- Name: progress_stats progress_stats_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progress_stats
    ADD CONSTRAINT progress_stats_user_id_key UNIQUE (user_id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: student_profiles student_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_pkey PRIMARY KEY (id);


--
-- Name: student_profiles student_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_user_id_key UNIQUE (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: cultural_modules update_cultural_modules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cultural_modules_updated_at BEFORE UPDATE ON public.cultural_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: gap_reports update_gap_reports_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_gap_reports_updated_at BEFORE UPDATE ON public.gap_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: learning_pathways update_learning_pathways_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_learning_pathways_updated_at BEFORE UPDATE ON public.learning_pathways FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: progress_stats update_progress_stats_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_progress_stats_updated_at BEFORE UPDATE ON public.progress_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sessions update_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: student_profiles update_student_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: alerts alerts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alerts
    ADD CONSTRAINT alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: assessments assessments_student_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_student_profile_id_fkey FOREIGN KEY (student_profile_id) REFERENCES public.student_profiles(id) ON DELETE CASCADE;


--
-- Name: assessments assessments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: cultural_modules cultural_modules_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cultural_modules
    ADD CONSTRAINT cultural_modules_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: gap_reports gap_reports_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gap_reports
    ADD CONSTRAINT gap_reports_assessment_id_fkey FOREIGN KEY (assessment_id) REFERENCES public.assessments(id) ON DELETE CASCADE;


--
-- Name: gap_reports gap_reports_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gap_reports
    ADD CONSTRAINT gap_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: learning_pathways learning_pathways_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_pathways
    ADD CONSTRAINT learning_pathways_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: progress_stats progress_stats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.progress_stats
    ADD CONSTRAINT progress_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: student_profiles student_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles Only admins can assign roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can assign roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Only admins can modify roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can modify roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Only admins can remove roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can remove roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: alerts System can insert alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert alerts" ON public.alerts FOR INSERT WITH CHECK (true);


--
-- Name: alerts Users can delete own alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own alerts" ON public.alerts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: assessments Users can delete own assessments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own assessments" ON public.assessments FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: cultural_modules Users can delete own cultural modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own cultural modules" ON public.cultural_modules FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: gap_reports Users can delete own gap reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own gap reports" ON public.gap_reports FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: learning_pathways Users can delete own pathways; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own pathways" ON public.learning_pathways FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: progress_stats Users can delete own progress stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own progress stats" ON public.progress_stats FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: sessions Users can delete own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own sessions" ON public.sessions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: student_profiles Users can delete own student profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own student profiles" ON public.student_profiles FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: assessments Users can insert own assessments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own assessments" ON public.assessments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: cultural_modules Users can insert own cultural modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own cultural modules" ON public.cultural_modules FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: gap_reports Users can insert own gap reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own gap reports" ON public.gap_reports FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: learning_pathways Users can insert own pathways; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own pathways" ON public.learning_pathways FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: progress_stats Users can insert own progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own progress" ON public.progress_stats FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: sessions Users can insert own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own sessions" ON public.sessions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: student_profiles Users can insert own student profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own student profile" ON public.student_profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: alerts Users can update own alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own alerts" ON public.alerts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: cultural_modules Users can update own cultural modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own cultural modules" ON public.cultural_modules FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: learning_pathways Users can update own pathways; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own pathways" ON public.learning_pathways FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: progress_stats Users can update own progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own progress" ON public.progress_stats FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: sessions Users can update own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own sessions" ON public.sessions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: student_profiles Users can update own student profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own student profile" ON public.student_profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: alerts Users can view own alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own alerts" ON public.alerts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: assessments Users can view own assessments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own assessments" ON public.assessments FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: cultural_modules Users can view own cultural modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own cultural modules" ON public.cultural_modules FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: gap_reports Users can view own gap reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own gap reports" ON public.gap_reports FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: learning_pathways Users can view own pathways; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own pathways" ON public.learning_pathways FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: progress_stats Users can view own progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own progress" ON public.progress_stats FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: sessions Users can view own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own sessions" ON public.sessions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: student_profiles Users can view own student profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own student profile" ON public.student_profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: assessments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

--
-- Name: cultural_modules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cultural_modules ENABLE ROW LEVEL SECURITY;

--
-- Name: gap_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gap_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: learning_pathways; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.learning_pathways ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: progress_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.progress_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: student_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


