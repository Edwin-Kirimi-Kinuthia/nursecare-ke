-- ambulance_requests uses prefixed column names (pickup_latitude/pickup_longitude/
-- pickup_geog, to leave room for a future destination_geog), so it needs its own
-- trigger function rather than reusing set_geog_from_latlng().
CREATE OR REPLACE FUNCTION set_pickup_geog_from_latlng() RETURNS trigger AS $$
BEGIN
  IF NEW.pickup_latitude IS NOT NULL AND NEW.pickup_longitude IS NOT NULL THEN
    NEW.pickup_geog := ST_SetSRID(ST_MakePoint(NEW.pickup_longitude, NEW.pickup_latitude), 4326)::geography;
  ELSE
    NEW.pickup_geog := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ambulance_requests_geog_sync
BEFORE INSERT OR UPDATE OF pickup_latitude, pickup_longitude ON "ambulance_requests"
FOR EACH ROW EXECUTE FUNCTION set_pickup_geog_from_latlng();
