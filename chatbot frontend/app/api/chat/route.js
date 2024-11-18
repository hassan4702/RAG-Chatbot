import axios from 'axios';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req) {
  const { messages } = await req.json();

  try {
    const response = await axios({
      method: 'post',
      url: process.env.NEXT_PUBLIC_API_URL + '/ask',
      data: {
        query: messages.map(message => message.content), // Assuming messages is an array of strings
      },
      headers: {
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Imhhc3NhbjEyMyIsImVtYWlsIjoiaGFzc2FuQGdtYWlsLmNvbSIsInRpbWVzdGFtcCI6IjIwMjQtMTAtMTVUMTA6MDY6MzkuNTEwMzUzIiwiaWQiOiItSHFTanBJQnUxNU9RNGNLWVJVcCJ9.BStOQ7LIzzNUIt8UwbGE6X4r0q8saOebgQLdiZoFJrs`, // Ensure you pass the correct token
        'Content-Type': 'application/json'
      },
      responseType: 'stream'
    });

    // Handle the stream
    let result = '';
    response.data.on('data', (chunk) => {
      result += chunk.toString(); // Convert Buffer to string
    });

    response.data.on('end', () => {
      return new Response(result, {
        headers: { 'Content-Type': 'application/json' }
      });
    });

  } catch (error) {
    console.error('Error calling the backend API:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate text' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
