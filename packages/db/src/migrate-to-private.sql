-- Migrate existing shared projects → my_projects (for each contributor)
INSERT INTO my_projects (user_id, name, stage, region, notes, is_shared, created_at, updated_at)
SELECT contributor_id, name, stage, region, notes, true, created_at, updated_at
FROM projects
WHERE NOT EXISTS (
  SELECT 1 FROM my_projects mp WHERE mp.user_id = projects.contributor_id AND mp.name = projects.name
);

-- Migrate existing shared relationships → my_contacts (for each owner)
INSERT INTO my_contacts (user_id, name, tags, closeness, notes, is_shared, created_at, updated_at)
SELECT owner_id, alias, domain_tags, closeness, notes, true, created_at, updated_at
FROM relationships
WHERE NOT EXISTS (
  SELECT 1 FROM my_contacts mc WHERE mc.user_id = relationships.owner_id AND mc.name = relationships.alias
);
