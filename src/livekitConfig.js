// src/livekitConfig.js

export const LIVEKIT_WS_HOST = process.env.REACT_APP_LIVEKIT_WS_HOST;

/**
 * getToken: Fetches a JWT from your token server.
 * Adds console.logs so you can see exactly what URL is being called,
 * and what text the server returns if it’s not valid JSON.
 */
export async function getToken(room, user, prompt) {
  // Build the full URL
  const url =
    `${process.env.REACT_APP_API_URL}` +
    `?room=${encodeURIComponent(room)}` +
    `&user=${encodeURIComponent(user)}` +
    `&prompt=${encodeURIComponent(prompt)}`;

  console.log('🔎 [getToken] Fetching token from URL:', url);

  const response = await fetch(url);
  console.log(`🔎 [getToken] Response status: ${response.status}`);

  // If the server did NOT send JSON, dump the raw text
  const contentType = response.headers.get('content-type') || '';
  console.log(`🔎 [getToken] Content-Type: ${contentType}`);

  if (!contentType.includes('application/json')) {
    // Print out the raw response body (likely HTML) for debugging
    const text = await response.text();
    console.error('❌ [getToken] Server returned non-JSON:\n', text);
    throw new Error('Token server did not return JSON');
  }

  // Now parse JSON
  const data = await response.json();
  console.log('✅ [getToken] Received token JSON:', data);
  return data.token;
}
