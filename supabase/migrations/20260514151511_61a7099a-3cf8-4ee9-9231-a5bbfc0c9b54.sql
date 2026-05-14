-- Stop auto-creating a default workspace when an organization is inserted.
-- The first user of a fresh tenant must explicitly create their first workspace
-- via the onboarding flow.
DROP TRIGGER IF EXISTS organizations_default_workspace ON public.organizations;
