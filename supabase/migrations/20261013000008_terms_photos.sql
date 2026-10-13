-- =============================================================================
-- Legal copy for photos attached to "Tell Your Story" submissions
--
-- Replaces specific paragraphs only while they still hold their original
-- baseline wording, so copy already edited in the CMS is never overwritten.
-- =============================================================================

create function pg_temp.replace_block(p_slug text, p_old jsonb, p_new jsonb)
returns void
language sql
as $$
  update public.pages p
     set body = (
           select jsonb_agg(replacement order by block_index, part_index)
             from jsonb_array_elements(p.body) with ordinality as blocks(block, block_index)
             cross join lateral jsonb_array_elements(
               case when blocks.block = p_old then p_new else jsonb_build_array(blocks.block) end
             ) with ordinality as parts(replacement, part_index)
         ),
         updated_at = now()
   where p.slug = p_slug
     and p.body @> jsonb_build_array(p_old);
$$;

select pg_temp.replace_block(
  'submission-terms',
  '{"type":"paragraph","text":"Do not send photographs with your pitch unless we ask. If we commission a story we will discuss photography, credits and licensing with you."}',
  $new$[
    {"type":"paragraph","text":"You can attach up to four photos to your pitch. Only send photos you took yourself or have permission to share, and do not send photos of other people without their permission."},
    {"type":"paragraph","text":"Photos sent with a pitch are used only to review it. They are stored privately, seen only by our editorial staff, and never published without your agreement. Location and camera details are removed from each photo when it is uploaded, and large photos are resized."},
    {"type":"paragraph","text":"If we commission a story we will agree photography, credits and licensing with you in writing before anything is published."}
  ]$new$
);

select pg_temp.replace_block(
  'privacy',
  '{"type":"paragraph","text":"When you use the Tell Your Story form we collect your name, email address, the details of your story pitch, an optional portfolio or social profile link and any additional information you choose to add. We also record that you accepted the submission terms and when."}',
  $new$[
    {"type":"paragraph","text":"When you use the Tell Your Story form we collect your name, email address, the details of your story pitch, an optional portfolio or social profile link, any additional information you choose to add and any photos you choose to attach. We also record that you accepted the submission terms and when."}
  ]$new$
);

select pg_temp.replace_block(
  'privacy',
  '{"type":"paragraph","text":"Submissions are visible only to the publication''s editorial staff. Email notifications about new submissions are sent through a transactional email provider."}',
  $new$[
    {"type":"paragraph","text":"Submissions, including any photos, are visible only to the publication's editorial staff. Photos are kept in private storage and shown to editors through links that expire. Location and camera details are removed from each photo when it is uploaded. Email notifications about new submissions are sent through a transactional email provider and do not include your photos."}
  ]$new$
);
