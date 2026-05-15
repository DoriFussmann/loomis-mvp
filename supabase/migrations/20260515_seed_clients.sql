-- Seed 50 clients for Claims Validation testing.
--
-- DESIGNATED MATCH CLIENTS:
--
-- [MATCH-A] member_id = 'MBR-2847163' / insurer = 'Blue Cross Blue Shield'
--   → Matches via Step 1 (Member ID + insurer name). Update these two values to
--     match whatever Field 60 (UB-04) or Field 1a (CMS-1500) + payer name your
--     real test form contains.
--
-- [MATCH-B] last_name = 'Harrington' / dob = '1971-09-14'
--   → Matches via Step 2 (last name + DoB fallback). This client intentionally
--     has a different member_id so the Step 1 lookup fails first. Update last_name
--     and dob to match the patient fields on your second test form.

insert into public.clients
  (first_name, last_name, dob, member_id, insurer_name)
values
  -- [MATCH-A] Step-1 match client (Member ID + insurer)
  ('James',     'Whitfield',   '1968-04-22', 'MBR-2847163',  'Blue Cross Blue Shield'),

  -- [MATCH-B] Step-2 match client (last name + DoB fallback; member_id differs intentionally)
  ('Patricia',  'Harrington',  '1971-09-14', 'MBR-9910034',  'Aetna Health'),

  -- Remaining 48 dummy clients (no collision with MATCH-A or MATCH-B)
  ('Michael',   'Torres',      '1975-11-03', 'MBR-1001001',  'UnitedHealthcare'),
  ('Sandra',    'Kim',         '1982-06-17', 'MBR-1001002',  'Cigna'),
  ('Robert',    'Nguyen',      '1990-01-29', 'MBR-1001003',  'Humana'),
  ('Lisa',      'Patel',       '1965-08-11', 'MBR-1001004',  'Blue Cross Blue Shield'),
  ('David',     'Martinez',    '1978-03-25', 'MBR-1001005',  'Aetna Health'),
  ('Karen',     'Johnson',     '1955-12-09', 'MBR-1001006',  'Medicare Advantage'),
  ('Thomas',    'Williams',    '1988-07-14', 'MBR-1001007',  'UnitedHealthcare'),
  ('Maria',     'Garcia',      '1993-05-30', 'MBR-1001008',  'Cigna'),
  ('Charles',   'Lee',         '1970-10-18', 'MBR-1001009',  'Humana'),
  ('Nancy',     'Brown',       '1963-02-07', 'MBR-1001010',  'Molina Healthcare'),
  ('Steven',    'Davis',       '1986-09-22', 'MBR-1001011',  'Blue Shield of California'),
  ('Betty',     'Miller',      '1958-04-15', 'MBR-1001012',  'Kaiser Permanente'),
  ('Paul',      'Wilson',      '1995-11-28', 'MBR-1001013',  'UnitedHealthcare'),
  ('Dorothy',   'Anderson',    '1949-06-03', 'MBR-1001014',  'Medicare Advantage'),
  ('Mark',      'Thomas',      '1972-01-19', 'MBR-1001015',  'Aetna Health'),
  ('Helen',     'Jackson',     '1980-08-06', 'MBR-1001016',  'Cigna'),
  ('Kenneth',   'White',       '1967-03-31', 'MBR-1001017',  'Blue Cross Blue Shield'),
  ('Susan',     'Harris',      '1991-10-24', 'MBR-1001018',  'Humana'),
  ('George',    'Martin',      '1960-05-12', 'MBR-1001019',  'Molina Healthcare'),
  ('Angela',    'Thompson',    '1984-07-09', 'MBR-1001020',  'Blue Shield of California'),
  ('Joshua',    'Moore',       '1997-12-01', 'MBR-1001021',  'UnitedHealthcare'),
  ('Ruth',      'Taylor',      '1953-02-18', 'MBR-1001022',  'Medicare Advantage'),
  ('Brian',     'Allen',       '1976-09-07', 'MBR-1001023',  'Cigna'),
  ('Laura',     'Young',       '1989-04-26', 'MBR-1001024',  'Aetna Health'),
  ('Kevin',     'Hernandez',   '1962-11-15', 'MBR-1001025',  'Humana'),
  ('Sarah',     'King',        '1994-06-20', 'MBR-1001026',  'Blue Cross Blue Shield'),
  ('Edward',    'Wright',      '1971-03-08', 'MBR-1001027',  'Kaiser Permanente'),
  ('Amy',       'Lopez',       '1983-08-27', 'MBR-1001028',  'UnitedHealthcare'),
  ('Ronald',    'Hill',        '1956-01-14', 'MBR-1001029',  'Medicare Advantage'),
  ('Kimberly',  'Scott',       '1998-07-03', 'MBR-1001030',  'Cigna'),
  ('Anthony',   'Green',       '1969-04-19', 'MBR-1001031',  'Molina Healthcare'),
  ('Donna',     'Adams',       '1977-10-08', 'MBR-1001032',  'Blue Shield of California'),
  ('Jason',     'Baker',       '1992-02-25', 'MBR-1001033',  'Aetna Health'),
  ('Michelle',  'Gonzalez',    '1961-09-11', 'MBR-1001034',  'UnitedHealthcare'),
  ('Gary',      'Nelson',      '1985-06-04', 'MBR-1001035',  'Humana'),
  ('Melissa',   'Carter',      '1973-01-30', 'MBR-1001036',  'Blue Cross Blue Shield'),
  ('Timothy',   'Mitchell',    '1990-08-16', 'MBR-1001037',  'Cigna'),
  ('Stephanie', 'Perez',       '1966-03-22', 'MBR-1001038',  'Kaiser Permanente'),
  ('Jose',      'Roberts',     '1979-11-07', 'MBR-1001039',  'UnitedHealthcare'),
  ('Sharon',    'Turner',      '1954-06-29', 'MBR-1001040',  'Medicare Advantage'),
  ('Christopher','Phillips',   '1987-02-14', 'MBR-1001041',  'Aetna Health'),
  ('Deborah',   'Campbell',    '1996-09-05', 'MBR-1001042',  'Cigna'),
  ('Eric',      'Parker',      '1964-04-21', 'MBR-1001043',  'Molina Healthcare'),
  ('Rachel',    'Evans',       '1981-12-10', 'MBR-1001044',  'Blue Shield of California'),
  ('Jeffrey',   'Edwards',     '1993-07-17', 'MBR-1001045',  'UnitedHealthcare'),
  ('Amanda',    'Collins',     '1957-02-28', 'MBR-1001046',  'Medicare Advantage'),
  ('Ryan',      'Stewart',     '1970-10-03', 'MBR-1001047',  'Humana'),
  ('Carolyn',   'Sanchez',     '1988-05-19', 'MBR-1001048',  'Blue Cross Blue Shield')
on conflict (member_id) do nothing;
