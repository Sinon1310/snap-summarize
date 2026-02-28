const API_BASE_URL = 'https://9lq8lta0nh.execute-api.ap-south-1.amazonaws.com/prod';

export const submitJob = async ({ type, input, email }) => {
  const response = await fetch(`${API_BASE_URL}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type, input, email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit job');
  }

  return response.json();
};

export const uploadFileToS3 = async (uploadUrl, file) => {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to upload file');
  }

  return true;
};

export const getJobResult = async (jobId) => {
  const response = await fetch(`${API_BASE_URL}/results/${jobId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch results');
  }

  return response.json();
};
