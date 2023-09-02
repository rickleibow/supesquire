import SqlString from 'sqlstring';

import { supabase } from '../supabase';

export const fetchDocument = async ({ checksum }) => {
  const { data, error, count } = await supabase()
    .from(process.env.NEXT_PUBLIC_SUPABASE_DOCUMENTS_TABLE)
    .select('checksum, document_name, title', {
      count: 'exact'
    })
    .eq('checksum', checksum);

  if (error) {
    console.error(error);
    return { error };
  }

  if (count === 0) {
    return {
      data: null,
      error: null
    };
  }

  const { checksum: id, document_name: fileName, title } = data[0];
  return {
    data: {
      id,
      fileName,
      title
    },
    error: null
  };
};

export const saveDocument = async ({ checksum, fileName, chunks }) => {
  const { data: object, error: objectError } = await supabase()
    .schema('storage')
    .from('objects')
    .select('id')
    .eq('name', `${checksum}.pdf`);

  if (objectError || object?.length === 0) {
    return {
      error: objectError || "Couldn't find object in storage"
    };
  }

  const { error } = await supabase()
    .from(process.env.NEXT_PUBLIC_SUPABASE_DOCUMENTS_TABLE)
    .insert({
      checksum: checksum,
      document_name: fileName,
      title: fileName,
      uploaded_object_id: object[0].id
    });

  if (error) {
    console.error(error);
    return { error };
  }

  const { error: saveChunksError } = await saveDocumentChunks(checksum, chunks);
  if (saveChunksError) {
    await supabase()
      .from(process.env.NEXT_PUBLIC_SUPABASE_DOCUMENTS_TABLE)
      .delete({ count: 1 })
      .eq('checksum', checksum);

    return {
      error: saveChunksError
    };
  }

  return {
    data: {
      id: checksum,
      fileName
    },
    error: null
  };
};

const saveDocumentChunks = async (checksum, chunks) => {
  const { content, embeddings } = chunks;

  let data = [];
  for (let i = 0; i < content.length; i++) {
    data.push({
      document_checksum: checksum,
      chunk_number: i + 1,
      chunk_content: SqlString.escape(content[i]),
      chunk_embedding: embeddings[i]
    });
  }

  const { error } = await supabase()
    .from(process.env.NEXT_PUBLIC_SUPABASE_DOCUMENT_CHUNKS_TABLE)
    .insert(data);

  if (error) {
    console.error(error);
    return { error };
  }

  return { error: null };
};
