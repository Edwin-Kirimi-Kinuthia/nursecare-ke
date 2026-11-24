ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'in_delivery';
ALTER TABLE listings ADD COLUMN min_order_qty INTEGER NOT NULL DEFAULT 1 CHECK (min_order_qty BETWEEN 1 AND 100);
ALTER TABLE vendor_orders ADD COLUMN in_delivery_at TIMESTAMPTZ(6);
CREATE TABLE vendor_order_status_events (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  vendor_order_id UUID NOT NULL,
  status "OrderStatus" NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT vendor_order_status_events_pkey PRIMARY KEY (id),
  CONSTRAINT vendor_order_status_events_vendor_order_id_fkey FOREIGN KEY (vendor_order_id) REFERENCES vendor_orders(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX vendor_order_status_events_vendor_order_id_created_at_idx ON vendor_order_status_events(vendor_order_id, created_at);
-- Preserve only known milestones for existing orders; do not invent earlier fulfilment times.
INSERT INTO vendor_order_status_events (vendor_order_id, status, created_at)
SELECT id, 'pending', created_at FROM vendor_orders;
INSERT INTO vendor_order_status_events (vendor_order_id, status, created_at)
SELECT id, 'dispatched', dispatched_at FROM vendor_orders WHERE dispatched_at IS NOT NULL;
INSERT INTO vendor_order_status_events (vendor_order_id, status, created_at)
SELECT id, 'delivered', delivered_at FROM vendor_orders WHERE delivered_at IS NOT NULL;
INSERT INTO vendor_order_status_events (vendor_order_id, status, created_at)
SELECT id, status, updated_at FROM vendor_orders
WHERE status <> 'pending'
  AND NOT (status = 'dispatched' AND dispatched_at IS NOT NULL)
  AND NOT (status = 'delivered' AND delivered_at IS NOT NULL);
