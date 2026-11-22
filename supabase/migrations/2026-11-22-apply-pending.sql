-- 一次性迁移：确认门槛降低后，把已经满足新门槛、但还在待确认的提案立即生效。
-- （cast_vote 只在有人投票时才检查门槛，所以门槛变化后需要手动检查一次。）
-- 先运行最新的 schema.sql，再运行本文件。可以重复运行。
do $$
declare
  p public.proposals;
  v_confirm int;
  v_reject int;
begin
  for p in select * from public.proposals where status = 'pending' and expires_at > now() order by id loop
    select count(*) filter (where stance = 'confirm'), count(*) filter (where stance = 'reject')
      into v_confirm, v_reject
    from public.votes where proposal_id = p.id;
    if v_confirm >= public.proposal_threshold(p.kind) and v_confirm > v_reject then
      perform set_config('app.actor', 'proposal:' || p.id, true);
      perform public.apply_proposal(p);
      update public.proposals set status = 'applied', resolved_at = now() where id = p.id;
      raise notice 'applied proposal %', p.id;
    end if;
  end loop;
end $$;
