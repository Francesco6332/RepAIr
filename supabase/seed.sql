insert into repair_costs (intervention, region, avg_cost_min, avg_cost_max)
values
('brake pads replacement', 'US', 120, 380),
('battery replacement', 'US', 150, 420),
('oil change', 'US', 55, 140)
on conflict do nothing;

insert into dtc_codes (code, description, common_causes, severity, avg_cost_min, avg_cost_max)
values
('P0300', 'Random/multiple cylinder misfire detected', array['Spark plugs', 'Ignition coils', 'Fuel pressure'], 'medium', 120, 700),
('P0420', 'Catalyst system efficiency below threshold', array['Catalytic converter', 'O2 sensor', 'Exhaust leaks'], 'medium', 180, 1800)
on conflict do nothing;

insert into authorized_workshops (brand, workshop_name, address, country, region, source)
values
('Ford', 'Ford Authorized Service', '1200 Service Ave', 'US', 'CA', 'manual-seed'),
('BMW', 'BMW Service Center Downtown', '33 Premium Dr', 'US', 'CA', 'manual-seed');
