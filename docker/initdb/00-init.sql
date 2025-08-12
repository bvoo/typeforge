-- Create additional databases for local development
-- The default database (typeforge) is created by POSTGRES_DB
-- This script adds the Prisma shadow database used during migrations
CREATE DATABASE typeforge_shadow;
