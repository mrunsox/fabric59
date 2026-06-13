insert into public.app_config (key, value, description)
values ('process_jobs_cron_secret', encode(gen_random_bytes(32), 'hex'), 'Private secret used by the scheduled job processor cron invocations')
on conflict (key) do nothing;

do $$
declare
  v_secret text;
begin
  select value into v_secret
  from public.app_config
  where key = 'process_jobs_cron_secret';

  if v_secret is null then
    raise exception 'process_jobs_cron_secret is missing';
  end if;

  perform cron.unschedule(1);
  perform cron.unschedule(2);

  perform cron.schedule(
    'invoke-process-jobs-every-30-minutes',
    '*/30 * * * *',
    format($sql$
      select net.http_post(
        url := 'https://lxwalsgqrnstjclafaka.supabase.co/functions/v1/process-jobs',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', %L
        ),
        body := jsonb_build_object('trigger', 'cron')
      ) as request_id;
    $sql$, v_secret)
  );
end $$;