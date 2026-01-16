-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- Create enum for loan status
CREATE TYPE public.loan_status AS ENUM ('pending', 'approved', 'rejected', 'active', 'returned', 'overdue');

-- Create enum for resource status
CREATE TYPE public.resource_status AS ENUM ('available', 'borrowed', 'maintenance');

-- Create enum for wellness hour source type
CREATE TYPE public.wellness_source_type AS ENUM ('loan', 'event');

-- User roles table (separate from profiles as per security requirements)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Profiles table for user information
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    student_code TEXT,
    major TEXT,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Resource categories
CREATE TABLE public.resource_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    base_wellness_hours NUMERIC(5,2) NOT NULL DEFAULT 1.0,
    hourly_factor NUMERIC(5,3) NOT NULL DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Resources table
CREATE TABLE public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.resource_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    status resource_status NOT NULL DEFAULT 'available',
    image_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Loans table
CREATE TABLE public.loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE NOT NULL,
    status loan_status NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id),
    delivered_at TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    returned_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Event categories
CREATE TABLE public.event_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Events table
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.event_categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    max_participants INTEGER,
    wellness_hours NUMERIC(5,2) NOT NULL DEFAULT 1.0,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Event enrollments
CREATE TABLE public.event_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    attended BOOLEAN NOT NULL DEFAULT false,
    attendance_registered_at TIMESTAMP WITH TIME ZONE,
    attendance_registered_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id, event_id)
);

-- Wellness hours log
CREATE TABLE public.wellness_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    hours NUMERIC(5,2) NOT NULL,
    source_type wellness_source_type NOT NULL,
    source_id UUID NOT NULL,
    description TEXT,
    awarded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    awarded_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellness_hours ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Convenience function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_resources_updated_at
    BEFORE UPDATE ON public.resources
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loans_updated_at
    BEFORE UPDATE ON public.loans
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create profile and assign student role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
    ON public.user_roles FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Admins can manage roles"
    ON public.user_roles FOR ALL
    USING (public.is_admin());

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles"
    ON public.profiles FOR ALL
    USING (public.is_admin());

-- RLS Policies for resource_categories
CREATE POLICY "Anyone authenticated can view categories"
    ON public.resource_categories FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can manage categories"
    ON public.resource_categories FOR ALL
    USING (public.is_admin());

-- RLS Policies for resources
CREATE POLICY "Anyone authenticated can view resources"
    ON public.resources FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can manage resources"
    ON public.resources FOR ALL
    USING (public.is_admin());

-- RLS Policies for loans
CREATE POLICY "Users can view their own loans"
    ON public.loans FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all loans"
    ON public.loans FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Authenticated users can create loan requests"
    ON public.loans FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all loans"
    ON public.loans FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "Admins can delete loans"
    ON public.loans FOR DELETE
    USING (public.is_admin());

-- RLS Policies for event_categories
CREATE POLICY "Anyone authenticated can view event categories"
    ON public.event_categories FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can manage event categories"
    ON public.event_categories FOR ALL
    USING (public.is_admin());

-- RLS Policies for events
CREATE POLICY "Anyone authenticated can view events"
    ON public.events FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only admins can manage events"
    ON public.events FOR ALL
    USING (public.is_admin());

-- RLS Policies for event_enrollments
CREATE POLICY "Users can view their own enrollments"
    ON public.event_enrollments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all enrollments"
    ON public.event_enrollments FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Authenticated users can enroll in events"
    ON public.event_enrollments FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage enrollments"
    ON public.event_enrollments FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "Users can delete their own enrollments"
    ON public.event_enrollments FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete enrollments"
    ON public.event_enrollments FOR DELETE
    USING (public.is_admin());

-- RLS Policies for wellness_hours
CREATE POLICY "Users can view their own wellness hours"
    ON public.wellness_hours FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all wellness hours"
    ON public.wellness_hours FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Only admins can manage wellness hours"
    ON public.wellness_hours FOR ALL
    USING (public.is_admin());

-- Insert default categories
INSERT INTO public.resource_categories (name, description, icon, base_wellness_hours, hourly_factor) VALUES
    ('Juegos de Mesa', 'Dominó, cartas, ajedrez y otros juegos de mesa', 'Dices', 0.5, 0.25),
    ('Implementos Deportivos', 'Balones, raquetas y otros implementos deportivos', 'Trophy', 1.0, 0.5),
    ('Instrumentos Musicales', 'Guitarras, tambores y otros instrumentos', 'Music', 1.5, 0.5);

INSERT INTO public.event_categories (name, description, icon) VALUES
    ('Deportivo', 'Eventos deportivos y torneos', 'Trophy'),
    ('Cultural', 'Eventos culturales y artísticos', 'Palette'),
    ('Académico', 'Talleres y eventos académicos', 'GraduationCap'),
    ('Bienestar', 'Actividades de bienestar y salud', 'Heart');