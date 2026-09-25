/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // No file extension, so Next's static file serving wouldn't otherwise
        // set a JSON content type — iOS fetches this to verify Universal Links.
        source: '/.well-known/apple-app-site-association',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
    ];
  },
};

export default nextConfig;
