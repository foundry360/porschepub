-- =============================================================================
-- Baseline structural content (safe for production)
--
-- This migration contains NO demonstration stories, contributors, images or
-- testimonials. It only provides:
--   * the initial editorial categories requested for launch (editable later),
--   * the About page and two legal pages as editable drafts of real copy.
--
-- The legal pages are flagged legal_reviewed = false, which makes the site show
-- a visible "pending review" notice until a human editor/lawyer signs them off.
-- This text is a starting point and is NOT legal advice.
-- =============================================================================

insert into public.categories (slug, name, description, sort_order) values
  ('ownership', 'Ownership',
   'Living with a Porsche: daily drivers, long-term relationships and the everyday moments that make a car part of a life.', 10),
  ('collecting', 'Collecting',
   'The people who build, protect and pass on significant Porsches, and why they do it.', 20),
  ('motorsport', 'Motorsport',
   'Racing and competition from the inside, at every level from club events to the world stage.', 30),
  ('design-engineering', 'Design & Engineering',
   'The ideas, constraints and craftsmanship behind how these cars are drawn and built.', 40),
  ('restoration', 'Restoration',
   'Patient, hands-on work to bring cars back, told by the people holding the tools.', 50),
  ('road-stories', 'Road Stories',
   'Journeys, drives and the places a Porsche has taken its people.', 60),
  ('personal-journeys', 'Personal Journeys',
   'Stories where the car is the thread and the person is the subject.', 70)
on conflict (slug) do nothing;

insert into public.pages (slug, kind, title, summary, body, legal_reviewed, is_published) values
(
  'about', 'about', 'About',
  'An independent publication of first-person stories about the people behind Porsche.',
  $about$[
    {"type":"paragraph","text":"This publication tells first-person stories about the people who make Porsche what it is: owners and enthusiasts, collectors and historians, racers, designers, engineers, mechanics and restorers."},
    {"type":"heading","level":2,"text":"What we publish"},
    {"type":"paragraph","text":"We are interested in people before specifications. A good story here is told in the writer's own voice, grounded in a particular car, place or moment, and honest about what it meant. We publish written stories and photography, and we intend to grow into interviews, audio and video."},
    {"type":"heading","level":2,"text":"What we are not"},
    {"type":"paragraph","text":"We are not a review site, a news service, a forum, a marketplace or a repair manual. There are excellent places for all of those. We leave them to do what they do well."},
    {"type":"heading","level":2,"text":"How stories are made"},
    {"type":"paragraph","text":"Every story is reviewed by an editor before it is published. Nothing is published automatically. Contributors keep their own voice; editors help with structure, clarity and accuracy, and agree changes with the writer."},
    {"type":"heading","level":2,"text":"Independence"},
    {"type":"paragraph","text":"This is an independent publication. It is not affiliated with, authorised by or endorsed by Porsche AG or any of its subsidiaries. Porsche and related model names are trademarks of their respective owners and are used here only to describe the subject of the stories we publish."},
    {"type":"heading","level":2,"text":"Share your story"},
    {"type":"paragraph","text":"If you have a story about a Porsche and the people around it, we would like to hear it. Use the Tell Your Story page to send us a pitch."}
  ]$about$::jsonb,
  false, true
),
(
  'privacy', 'legal', 'Privacy Policy',
  'How we handle personal information, including story submissions.',
  $privacy$[
    {"type":"paragraph","text":"This page explains what personal information this site handles and why. It is a working draft that has not yet been reviewed by a lawyer."},
    {"type":"heading","level":2,"text":"Information you give us"},
    {"type":"paragraph","text":"When you use the Tell Your Story form we collect your name, email address, the details of your story pitch, an optional portfolio or social profile link and any additional information you choose to add. We also record that you accepted the submission terms and when."},
    {"type":"heading","level":2,"text":"How we use it"},
    {"type":"paragraph","text":"We use this information only to review your pitch, to reply to you, and to manage the editorial process if your story is commissioned. We do not sell it and we do not use it for advertising."},
    {"type":"heading","level":2,"text":"Who can see it"},
    {"type":"paragraph","text":"Submissions are visible only to the publication's editorial staff. Email notifications about new submissions are sent through a transactional email provider."},
    {"type":"heading","level":2,"text":"Abuse prevention"},
    {"type":"paragraph","text":"To protect the form from spam we use a hidden honeypot field and rate limiting. Rate limiting uses a salted, one-way hash of your network address, not the address itself."},
    {"type":"heading","level":2,"text":"Analytics"},
    {"type":"paragraph","text":"If analytics is enabled on this site it is configured to avoid collecting personal information, and it does not run until the site's configured consent requirements are met."},
    {"type":"heading","level":2,"text":"Your choices"},
    {"type":"paragraph","text":"You can ask to see, correct or delete the information we hold about you by writing to the editorial contact address shown in the site footer. Declined submissions are anonymised after a retention period set by the publisher."}
  ]$privacy$::jsonb,
  false, true
),
(
  'submission-terms', 'legal', 'Submission Terms',
  'The terms that apply when you send us a story pitch.',
  $terms$[
    {"type":"paragraph","text":"These terms apply when you send a pitch through the Tell Your Story form. They are a working draft that has not yet been reviewed by a lawyer."},
    {"type":"heading","level":2,"text":"A pitch is not a commitment"},
    {"type":"paragraph","text":"Sending a pitch does not mean it will be accepted or published. We may decline a pitch for any reason and are not always able to explain why. Nothing is published without editorial review and your agreement."},
    {"type":"heading","level":2,"text":"Your work stays yours"},
    {"type":"paragraph","text":"You keep ownership of your pitch and any material you send. If we decide to commission or publish a story we will agree the terms with you in writing before publication."},
    {"type":"heading","level":2,"text":"What you confirm"},
    {"type":"paragraph","text":"By submitting you confirm that the pitch is your own work, that the information you provide is accurate, and that you will not send material that infringes anyone else's rights or contains other people's personal information without their permission."},
    {"type":"heading","level":2,"text":"Photography"},
    {"type":"paragraph","text":"Do not send photographs with your pitch unless we ask. If we commission a story we will discuss photography, credits and licensing with you."},
    {"type":"heading","level":2,"text":"Independence"},
    {"type":"paragraph","text":"This publication is independent and is not affiliated with Porsche AG. Submitting a story does not create any relationship with Porsche AG."}
  ]$terms$::jsonb,
  false, true
)
on conflict (slug) do nothing;
