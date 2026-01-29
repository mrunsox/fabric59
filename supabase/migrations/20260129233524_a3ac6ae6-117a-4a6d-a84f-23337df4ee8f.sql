-- Create enum for CRM types
CREATE TYPE public.crm_type AS ENUM ('clio', 'workiz', 'salesforce', 'generic_rest', 'other');

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'ops_team', 'viewer');

-- Create tenants table
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    crm_type public.crm_type NOT NULL DEFAULT 'other',
    crm_api_url TEXT,
    crm_api_key TEXT, -- Will be encrypted in edge functions
    custom_mappings JSONB DEFAULT '{}',
    webhook_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unified_schema table for field mappings
CREATE TABLE public.unified_schema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    entity TEXT NOT NULL CHECK (entity IN ('contact', 'matter', 'job', 'intake')),
    fields JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, entity)
);

-- Create api_logs table
CREATE TABLE public.api_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL DEFAULT 'GET',
    request_payload JSONB,
    response JSONB,
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'pending')),
    response_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table for RBAC
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create api_keys table for tenant API access
CREATE TABLE public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_schema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
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

-- Create function to check if user is admin or ops_team
CREATE OR REPLACE FUNCTION public.is_ops_member(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'ops_team')
  )
$$;

-- RLS Policies for tenants
CREATE POLICY "Ops team can view all tenants"
ON public.tenants FOR SELECT
TO authenticated
USING (public.is_ops_member(auth.uid()));

CREATE POLICY "Admins can manage tenants"
ON public.tenants FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for unified_schema
CREATE POLICY "Ops team can view all schemas"
ON public.unified_schema FOR SELECT
TO authenticated
USING (public.is_ops_member(auth.uid()));

CREATE POLICY "Admins can manage schemas"
ON public.unified_schema FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for api_logs
CREATE POLICY "Ops team can view all logs"
ON public.api_logs FOR SELECT
TO authenticated
USING (public.is_ops_member(auth.uid()));

CREATE POLICY "System can insert logs"
ON public.api_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for api_keys
CREATE POLICY "Ops team can view api keys"
ON public.api_keys FOR SELECT
TO authenticated
USING (public.is_ops_member(auth.uid()));

CREATE POLICY "Admins can manage api keys"
ON public.api_keys FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_unified_schema_updated_at
    BEFORE UPDATE ON public.unified_schema
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_api_logs_tenant_id ON public.api_logs(tenant_id);
CREATE INDEX idx_api_logs_created_at ON public.api_logs(created_at DESC);
CREATE INDEX idx_api_logs_status ON public.api_logs(status);
CREATE INDEX idx_unified_schema_tenant_id ON public.unified_schema(tenant_id);
CREATE INDEX idx_api_keys_tenant_id ON public.api_keys(tenant_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- Insert sample tenants for testing
INSERT INTO public.tenants (id, name, crm_type, crm_api_url, status) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Law Firm Alpha', 'clio', 'https://app.clio.com/api/v4', 'active'),
    ('22222222-2222-2222-2222-222222222222', 'Law Firm Beta', 'clio', 'https://app.clio.com/api/v4', 'active'),
    ('33333333-3333-3333-3333-333333333333', 'Toronto Plumbing Co', 'workiz', 'https://api.workiz.com/api/v1', 'active'),
    ('44444444-4444-4444-4444-444444444444', 'HVAC Solutions', 'workiz', 'https://api.workiz.com/api/v1', 'pending');