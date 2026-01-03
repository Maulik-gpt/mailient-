import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio');

    console.log('Transcription API called:', {
      hasAudioFile: !!audioFile,
      audioFileSize: audioFile?.size,
      audioFileType: audioFile?.type
    });

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const apiKey = process.env.ASSEMBLY_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Assembly AI API key not configured' }, { status: 500 });
    }

    // Step 1: Upload the audio file to Assembly AI
    console.log('Uploading audio to Assembly AI:', audioFile.size, 'bytes');
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'content-type': 'application/octet-stream',
      },
      body: audioFile,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      console.error('Upload failed:', errorData);
      throw new Error(`Upload failed: ${errorData.error || 'Unknown error'}`);
    }

    const { upload_url } = await uploadResponse.json();
    console.log('Upload successful, URL:', upload_url);

    // Step 2: Request transcription
    console.log('Requesting transcription for URL:', upload_url);
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: upload_url,
        language_code: 'en_us',
      }),
    });

    if (!transcriptResponse.ok) {
      const errorData = await transcriptResponse.json();
      console.error('Transcription request failed:', errorData);
      throw new Error(`Transcription request failed: ${errorData.error || 'Unknown error'}`);
    }

    const { id: transcriptId } = await transcriptResponse.json();
    console.log('Transcription ID:', transcriptId);

    // Step 3: Poll for transcription completion
    let transcriptResult;
    let attempts = 0;
    while (attempts < 30) { // Max 30 seconds
      attempts++;
      console.log(`Polling transcription status, attempt ${attempts}`);
      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          'authorization': apiKey,
        },
      });

      if (!pollResponse.ok) {
        console.error('Poll failed:', pollResponse.status);
        throw new Error('Failed to poll transcription status');
      }

      transcriptResult = await pollResponse.json();
      console.log('Poll result:', transcriptResult.status);

      if (transcriptResult.status === 'completed') {
        console.log('Transcription completed');
        break;
      } else if (transcriptResult.status === 'failed') {
        console.error('Transcription failed:', transcriptResult.error);
        throw new Error(`Transcription failed: ${transcriptResult.error}`);
      }

      // Wait 1 second before polling again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (attempts >= 30) {
      throw new Error('Transcription timed out');
    }

    return NextResponse.json({
      transcription: transcriptResult.text,
      confidence: transcriptResult.confidence,
    });

  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio', message: error.message },
      { status: 500 }
    );
  }
}

