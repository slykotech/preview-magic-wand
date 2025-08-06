-- Enable PostGIS extension for geography and geometry types
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable PostGIS topology extension (optional but recommended)
CREATE EXTENSION IF NOT EXISTS postgis_topology;