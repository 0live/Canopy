-- =============================================================================
-- Canopy PostgreSQL Initialization
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS hstore;
DROP EXTENSION IF EXISTS postgis_tiger_geocoder CASCADE;

-- Create app_data and users_data schemas
CREATE SCHEMA IF NOT EXISTS app_data;
CREATE SCHEMA IF NOT EXISTS users_data;

-- Restrict access to root only (revoke public access)
REVOKE ALL ON SCHEMA app_data FROM PUBLIC;
REVOKE ALL ON SCHEMA users_data FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;