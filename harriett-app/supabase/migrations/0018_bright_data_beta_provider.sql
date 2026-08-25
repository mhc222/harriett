-- 0018: add Bright Data as a separately labeled closed-beta evidence provider.

begin;

alter table property_research_runs
  drop constraint if exists property_research_runs_provider_check;

alter table property_research_runs
  add constraint property_research_runs_provider_check
  check (provider in ('rentcast','brightdata','mls','manual','combined'));

alter table external_record_links
  drop constraint if exists external_record_links_provider_check;

alter table external_record_links
  add constraint external_record_links_provider_check
  check (provider in (
    'microsoft','twilio','rentcast','brightdata','trestle','dotloop','meta','calcom','instanet'
  ));

commit;
