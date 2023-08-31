'use client';

import { useCallback, useContext, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';

import { supabaseClient } from '@/app/supabaseClient';
import { CloudUpload, UploadFileRounded } from '@mui/icons-material';
import { Box, Grid, Stack, Typography } from '@mui/material';

import { ChatContext } from '../../context/Context';
import FeatureCards from './FeatureCards';
import Loader from './Loader';
import UploadInput from './UploadInput';
import { generateChecksum } from './checksum';
import { extractDocumentContent } from './contentExtractor';

export default function Hero() {
  const { setActiveChatId, setCurrentDocument } = useContext(ChatContext);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Uploading document...');

  const openSocket = useCallback(
    async (id) => {
      const channel = supabaseClient.channel(`upload:${id}`);

      channel
        .on('broadcast', { event: 'upload:complete' }, ({ payload }) => {
          setLoading(false);

          const { id, title, fileName } = payload;
          setActiveChatId(id);
          setCurrentDocument({
            title,
            id,
            fileName
          });
        })
        .on('broadcast', { event: 'upload:progress' }, ({ payload }) => {
          setStatus(payload.message);
        })
        .on('broadcast', { event: 'upload:error' }, ({ payload }) => {
          console.error(payload);
          setLoading(false);
          toast.error(payload.error, {
            position: 'bottom-left',
            autoClose: 3000,
            toastId: 'upload_error'
          });
        })
        .subscribe();
    },
    [setActiveChatId, setCurrentDocument]
  );

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (acceptedFiles.length === 0) {
        toast.error('Please upload a pdf file', {
          position: 'bottom-left',
          autoClose: 3000,
          toastId: 'upload_error'
        });
        return;
      }

      setLoading(true);

      const file = acceptedFiles[0];
      const checksum = await generateChecksum(file);

      supabaseClient.storage
        .from(process.env.NEXT_PUBLIC_SUPABASE_BUCKET)
        .upload(`${checksum}.pdf`, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/pdf'
        });

      setStatus('Extracting document content...');
      const { response, error } = await extractDocumentContent(file).then(
        async ({ content }) => {
          const response = await fetch('/api/process-document', {
            method: 'POST',
            body: JSON.stringify({ checksum, fileName: file.name, content })
          });

          if (!response.ok) {
            return { error: 'Error processing document' };
          }

          return { response };
        }
      );

      if (error) {
        setLoading(false);
        toast.error('Error uploading document', {
          position: 'bottom-left',
          autoClose: 3000,
          toastId: 'upload_error'
        });
        return;
      }

      if (response.status === 201) {
        openSocket(checksum);
        return;
      } else if (response.status === 200) {
        const { id, title, fileName } = await response.json();
        setActiveChatId(checksum);
        setCurrentDocument({
          title,
          id,
          fileName
        });
        setLoading(false);
        return;
      }
    },
    [openSocket, setActiveChatId, setCurrentDocument]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf']
    }
  });

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        textAlign: 'center',
        overflow: 'hidden',
        opacity: isDragActive ? 0.5 : 1,
        transition: 'opacity 0.3s ease-in-out'
      }}
      {...getRootProps()}
    >
      <UploadInput getInputProps={getInputProps} />
      {loading ? (
        <Loader status={status} />
      ) : (
        <>
          <Stack
            direction="row"
            flexWrap="wrap"
            justifyContent="center"
            padding="20px"
          >
            <FeatureCards />
          </Stack>
          <Stack
            display={{
              xl: 'block',
              lg: 'block',
              xs: 'none'
            }}
          >
            <Grid
              sx={{
                color: '#a4a8c2'
              }}
            >
              <UploadFileRounded
                sx={{
                  fontSize: '30px'
                }}
              />
              <Typography
                sx={{
                  fontSize: {
                    xl: '14px',
                    xs: '12px'
                  },
                  margin: '10px 0px'
                }}
              >
                Drag and drop to upload the document
              </Typography>
            </Grid>
          </Stack>
          <Stack
            sx={{
              bottom: 0,
              position: 'fixed',
              transition: 'opacity 0.3s ease-in-out'
            }}
          >
            {isDragActive && (
              <CloudUpload
                sx={{
                  color: 'rgb(63,81,181)',
                  fontSize: '350px',
                  margin: '20px 0px'
                }}
              />
            )}
          </Stack>
        </>
      )}
    </Box>
  );
}
