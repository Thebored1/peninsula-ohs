SELECT json_build_object(
  'project', 'peninsula',
  'exported_at', now()::text,
  'table_count', COUNT(DISTINCT t.table_name),
  'tables', json_agg(
    json_build_object(
      'name', t.table_name,
      'columns', t.columns,
      'primary_keys', t.primary_keys,
      'foreign_keys', t.foreign_keys,
      'indexes', t.indexes
    )
    ORDER BY t.table_name
  )
)
FROM (
  SELECT
    c.table_name,

    -- Columns
    json_agg(
      json_build_object(
        'name',       c.column_name,
        'type',       CASE
                        WHEN c.data_type = 'USER-DEFINED' THEN c.udt_name
                        WHEN c.data_type = 'ARRAY'        THEN c.udt_name || '[]'
                        ELSE c.data_type
                      END,
        'nullable',   c.is_nullable = 'YES',
        'default',    c.column_default,
        'generated',  c.is_generated = 'ALWAYS'
      )
      ORDER BY c.ordinal_position
    ) AS columns,

    -- Primary keys
    (SELECT json_agg(kcu.column_name ORDER BY kcu.ordinal_position)
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema AND kcu.table_name = tc.table_name
     WHERE tc.table_schema = 'public' AND tc.table_name = c.table_name AND tc.constraint_type = 'PRIMARY KEY'
    ) AS primary_keys,

    -- Foreign keys
    (SELECT COALESCE(json_agg(
       json_build_object(
         'column',            kcu.column_name,
         'references_table',  ccu.table_name,
         'references_column', ccu.column_name,
         'on_delete',         rc.delete_rule
       ) ORDER BY kcu.column_name
     ), '[]'::json)
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema AND kcu.table_name = tc.table_name
     JOIN information_schema.referential_constraints rc
       ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.table_schema
     JOIN information_schema.constraint_column_usage ccu
       ON ccu.constraint_name = rc.unique_constraint_name AND ccu.table_schema = tc.table_schema
     WHERE tc.table_schema = 'public' AND tc.table_name = c.table_name AND tc.constraint_type = 'FOREIGN KEY'
    ) AS foreign_keys,

    -- Indexes
    (SELECT COALESCE(json_agg(
       json_build_object(
         'name',    i.relname,
         'unique',  ix.indisunique,
         'columns', (
           SELECT json_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum))
           FROM pg_attribute a
           WHERE a.attrelid = t2.oid AND a.attnum = ANY(ix.indkey) AND a.attnum > 0
         )
       ) ORDER BY i.relname
     ), '[]'::json)
     FROM pg_class t2
     JOIN pg_index ix ON t2.oid = ix.indrelid
     JOIN pg_class i  ON i.oid = ix.indexrelid
     WHERE t2.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
       AND t2.relname = c.table_name
       AND NOT ix.indisprimary
    ) AS indexes

  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
  GROUP BY c.table_name
) t;
