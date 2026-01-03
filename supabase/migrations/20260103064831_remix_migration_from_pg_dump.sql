CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

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
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'hr',
    'employee',
    'intern'
);


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(_user_id uuid) RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
        NEW.email
    );
    
    -- Assign default employee role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'employee');
    
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
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    check_in timestamp with time zone,
    check_out timestamp with time zone,
    status text DEFAULT 'present'::text,
    work_hours interval,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT attendance_status_check CHECK ((status = ANY (ARRAY['present'::text, 'absent'::text, 'late'::text, 'half-day'::text, 'leave'::text])))
);


--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    leave_type text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    days integer NOT NULL,
    reason text,
    status text DEFAULT 'pending'::text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT leave_requests_leave_type_check CHECK ((leave_type = ANY (ARRAY['vacation'::text, 'sick'::text, 'personal'::text, 'maternity'::text]))),
    CONSTRAINT leave_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    phone text,
    department text,
    "position" text,
    join_date date DEFAULT CURRENT_DATE,
    status text DEFAULT 'active'::text,
    salary numeric(12,2),
    remaining_annual_leave integer DEFAULT 20,
    remaining_sick_leave integer DEFAULT 10,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    avatar_url text,
    CONSTRAINT profiles_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'employee'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_user_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_user_id_date_key UNIQUE (user_id, date);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


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
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: attendance attendance_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);


--
-- Name: leave_requests leave_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: attendance HR can manage all attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR can manage all attendance" ON public.attendance TO authenticated USING (public.has_role(auth.uid(), 'hr'::public.app_role));


--
-- Name: leave_requests HR can manage all leave requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR can manage all leave requests" ON public.leave_requests TO authenticated USING (public.has_role(auth.uid(), 'hr'::public.app_role));


--
-- Name: profiles HR can manage all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR can manage all profiles" ON public.profiles TO authenticated USING (public.has_role(auth.uid(), 'hr'::public.app_role));


--
-- Name: user_roles HR can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR can manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'hr'::public.app_role));


--
-- Name: attendance HR can view all attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR can view all attendance" ON public.attendance FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'hr'::public.app_role));


--
-- Name: leave_requests HR can view all leave requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR can view all leave requests" ON public.leave_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'hr'::public.app_role));


--
-- Name: profiles HR can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'hr'::public.app_role));


--
-- Name: user_roles HR can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "HR can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'hr'::public.app_role));


--
-- Name: leave_requests Users can create their own leave requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own leave requests" ON public.leave_requests FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: attendance Users can insert their own attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own attendance" ON public.attendance FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: attendance Users can update their own attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own attendance" ON public.attendance FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: attendance Users can view their own attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own attendance" ON public.attendance FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: leave_requests Users can view their own leave requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own leave requests" ON public.leave_requests FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: attendance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

--
-- Name: leave_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;