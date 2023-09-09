-- Supabase project setup --
-- enable vector extension --
create extension vector;

-- create tables --
-- documents table to hold the document details --
create table public.documents (
    checksum character varying not null,
    content text null,
    created_time timestamp without time zone null default (now() at time zone 'utc' :: text),
    document_name character varying not null,
    title character varying not null,
    created_by uuid null default auth.uid (),
    uploaded_object_id uuid null,
    constraint documents_pkey primary key (checksum),
    constraint documents_created_by_fkey foreign key (created_by) references auth.users (id) on delete cascade,
    constraint documents_uploaded_object_id_fkey foreign key (uploaded_object_id) references storage.objects (id) on delete cascade
) tablespace pg_default;

-- chat_records table to hold the chat messages --
create table public.chat_records (
    message text null,
    actor character varying not null,
    checksum character varying null,
    created_at timestamp with time zone not null default now(),
    id uuid not null default gen_random_uuid (),
    created_by uuid null default auth.uid (),
    constraint chat_records_pkey primary key (id),
    constraint chat_records_checksum_fkey foreign key (checksum) references documents (checksum) on delete cascade,
    constraint chat_records_created_by_fkey foreign key (created_by) references auth.users (id)
) tablespace pg_default;

-- document_chunks table to hold chunks of document content and embeddings --
create table public.document_chunks (
    id bigint generated by default as identity,
    document_checksum character varying null,
    chunk_number bigint null,
    chunk_content text not null,
    chunk_embedding public.vector(1536) null,
    created_by uuid not null default auth.uid (),
    created_at timestamp with time zone not null default now(),
    constraint document_chunks_pkey primary key (id),
    constraint document_chunks_created_by_fkey foreign key (created_by) references auth.users (id) on delete cascade,
    constraint document_chunks_document_checksum_fkey foreign key (document_checksum) references documents (checksum) on delete cascade
) tablespace pg_default;

-- Create a function to search for documents
create function match_documents (
    query_embedding vector(1536),
    match_count int default null,
    filter_checksum varchar DEFAULT ''
) returns table (
    document_checksum varchar,
    chunk_content text,
    similarity float
) language plpgsql
as $$
#variable_conflict use_column
begin return query
select
    document_checksum,
    chunk_content,
    1 - (
        document_chunks.chunk_embedding <= > query_embedding
    ) as similarity
from
    document_chunks
where
    document_checksum = filter_checksum
order by
    document_chunks.chunk_embedding <= > query_embedding
limit
    match_count;
end;
$$;

-- Create function to perform semantic search on embedded data
create function search_documents (
  query_embedding vector(1536),
  match_count int DEFAULT null
) returns table (
  document_checksum varchar,
  document_name varchar,
  created_time timestamp,
  chunk_content text,
  similarity float
)
language plpgsql
as $$
#variable_conflict use_column
begin
  return query
  select
    document_chunks.document_checksum,
    documents.document_name,
    documents.created_time,
    document_chunks.chunk_content,
    1 - (document_chunks.chunk_embedding <=> query_embedding) as similarity
  from document_chunks
  join documents on documents.checksum = document_chunks.document_checksum
  order by document_chunks.chunk_embedding <=> query_embedding
  limit match_count;
end;
$$;
---
-- creating the storage bucket to store the uploaded documents --
insert into
    storage.buckets (id, name, file_size_limit, allowed_mime_types)
values
    (
        'documents',
        'documents',
        52428800,
        ARRAY ['application/pdf']
    );

-- security policies for tables --
-- The application does not perform any update or delete operations on the tables --
-- so those are not included in the policies --
CREATE POLICY "Enable read access for authenticated users only" ON "public"."documents" AS PERMISSIVE FOR
SELECT
    TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."documents" AS PERMISSIVE FOR
INSERT
    TO authenticated WITH CHECK (true);

CREATE POLICY "Enable delete for users based on user_id" ON "public"."documents" AS PERMISSIVE FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Enable update for users based on email" ON "public"."documents" AS PERMISSIVE FOR
UPDATE
    TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Enable read access for authenticated users only" ON "public"."chat_records" AS PERMISSIVE FOR
SELECT
    TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Enable delete for users based on user_id" ON "public"."chat_records"
AS PERMISSIVE FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."chat_records" AS PERMISSIVE FOR
INSERT
    TO authenticated WITH CHECK (true);

CREATE POLICY "Enable read access for authenticated users only" ON "public"."document_chunks" AS PERMISSIVE FOR
SELECT
    TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."document_chunks" AS PERMISSIVE FOR
INSERT
    TO authenticated WITH CHECK (true);

-- security policies for storage --
CREATE POLICY "Enable all for authenticated users only" ON "storage"."buckets" AS PERMISSIVE FOR ALL TO authenticated USING (true);

CREATE POLICY "Enable all for authenticated users only" ON "storage"."objects" AS PERMISSIVE FOR ALL TO authenticated USING (true);

-- Creating vector index for the embedding field
-- CREATE INDEX ON public.document_chunks USING ivfflat (chunk_embedding vector_cosine_ops) WITH (lists = 10);