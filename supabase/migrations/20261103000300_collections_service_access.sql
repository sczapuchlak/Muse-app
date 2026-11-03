-- Keep administrative export, support and deletion verification available to the service role.
do $$declare t text;begin foreach t in array array['collection_media_items','collection_tv_episodes','collection_activity','collection_series','collection_series_members','collection_curated','collection_curated_members'] loop
 execute format('grant select,insert,update,delete on public.%I to service_role',t);
end loop;end $$;
