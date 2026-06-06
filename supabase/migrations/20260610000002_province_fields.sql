-- Gap 4: Province / territory fields
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'CA';
ALTER TABLE risks ADD COLUMN IF NOT EXISTS applicable_provinces TEXT[] DEFAULT '{}';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS applicable_provinces TEXT[] DEFAULT '{}';
ALTER TABLE training_courses ADD COLUMN IF NOT EXISTS applicable_provinces TEXT[] DEFAULT '{}';
