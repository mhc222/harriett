-- Tuscaloosa Area Vendor Seed
-- Agent: Jerrod Hastings (demo). Phase 2: per-agent vendor maps.
-- Vendors from demo transaction marked preferred = true.

insert into vendors (agent_id, office_id, type, name, contact, phone, email, notes, preferred) values

-- PHOTOGRAPHERS
('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001',
 'photographer', 'Crimson Homes Photography', null, null, null,
 'Tuscaloosa-based. Twilight photography. crimsonhomes.com', false),

('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001',
 'photographer', 'Central Alabama Photography and Video', null, null, null,
 'Residential + commercial. Drone, Matterport 3D, 360 panorama. Huntsville to Tuscaloosa. centralalabamaphotographyandvideo.com', false),

('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001',
 'photographer', 'Sabrina Harless Photography', null, null, null,
 'Tuscaloosa and Central Alabama. sabrinaharless.com', false),

-- HOME INSPECTORS
('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001',
 'inspector', 'A B Home Inspections', null, null, null,
 'Tuscaloosa County since 2000. Same-day reporting. tuscaloosahomeinspection.com', false),

('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001',
 'inspector', 'Warrior Home Inspections LLC', null, null, null,
 'Tuscaloosa to Birmingham. warriorinspection.com', false),

('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001',
 'inspector', 'Noble Home Inspection LLC', null, null, null,
 '25+ years serving Tuscaloosa community.', false),

('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001',
 'inspector', 'Southeast Home Inspection LLC', null, null, null,
 'southeasthomeinspectional.com', false),

-- TITLE COMPANIES
('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001',
 'title', 'North River Title', 'Brittany Newton', '(205) 345-5310', null,
 'Used on 604 2nd St NW Gordo deal. northrivertitle.com', true),

('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001',
 'title', 'Tuscaloosa Title Company', null, null, null,
 '100+ years serving Tuscaloosa. tuscaloosatitlecompany.com', false),

('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001',
 'title', 'Anchor Title Company', null, '(205) 343-0476', null,
 '2200 University Blvd, Tuscaloosa AL 35401. anchortitlecompany.com', false),

('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001',
 'title', 'Capitol Park Title LLC', null, null, null,
 '2824 7th St, Tuscaloosa AL 35401. capitolparktitle.com', false),

('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001',
 'title', 'South Oak Title', null, null, null,
 'Downtown Tuscaloosa. southoaktitle.com', false),

-- LENDERS
('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001',
 'lender', 'First Federal Bank', null, null, null,
 'Used on 604 2nd St NW Gordo deal. 1300 McFarland Blvd NE, Tuscaloosa. Conventional, VA, FHA, USDA, AHFA. 1stfed.com', true),

('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001',
 'lender', 'Capital Home Mortgage', null, '(205) 352-1030', null,
 'Direct lender, handles everything in-house. Purchase, renovation, construction, USDA, FHA, VA. capitalhomemortgage.com', false),

('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001',
 'lender', 'Blissful Mortgage', null, null, null,
 '20+ years. Gordo/Coker/Moundville area. Five-star rated. blissfulmortgage.com', false),

('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001',
 'lender', 'Regions Bank', null, null, null,
 'Local mortgage loan officers. regions.com', false),

-- APPRAISERS
('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001',
 'appraiser', 'Randolph Appraisals Inc', null, '(205) 391-0450', null,
 'Used on 604 2nd St NW Gordo deal. Tuscaloosa County. randolphappraisals.com', true),

('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001',
 'appraiser', 'Claybrook Appraisal LLC', null, null, null,
 'Certified residential. Tuscaloosa County + 12 surrounding counties. claybrookappraisal.com', false),

('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001',
 'appraiser', 'GVI Appraisals Inc', null, null, null,
 'Single family, rental/investment. gviappraisals.net', false),

('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001',
 'appraiser', 'Crimson Way Appraisals', null, '(205) 292-3339', null,
 'Tuscaloosa County specialist.', false),

('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001',
 'appraiser', 'Shamrock Appraisals', null, '(205) 391-0881', null,
 'shamrock-appraisals-tuscaloosa.com', false),

-- INSURANCE
('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001',
 'insurance', 'Hampton Insurance Agency', null, '(205) 366-1457', null,
 'Family-owned since 1986. Homeowners, auto, commercial. hamptoninsuranceagency.com', false),

('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001',
 'insurance', 'Pritchett-Moore Insurance', null, null, null,
 'Independent agents. Home, auto, business. Same company as brokerage — worth flagging to Wilson for referral potential.', false);
