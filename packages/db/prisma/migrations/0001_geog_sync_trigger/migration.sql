-- Generic trigger function shared by every geo-enabled table (org_branches now;
-- ambulance_requests / lab_orders reuse it in later migrations). Every such table
-- must name its columns exactly "latitude" / "longitude" / "geog" for this to work.
-- Application code (Prisma) only ever reads/writes the plain Float columns; this
-- keeps the PostGIS geography column in sync automatically.
CREATE OR REPLACE FUNCTION set_geog_from_latlng() RETURNS trigger AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geog := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  ELSE
    NEW.geog := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER org_branches_geog_sync
BEFORE INSERT OR UPDATE OF latitude, longitude ON "org_branches"
FOR EACH ROW EXECUTE FUNCTION set_geog_from_latlng();
