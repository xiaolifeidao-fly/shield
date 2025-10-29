'use client';

import Error from 'next/error';

export default function NotFound() {
  return (
    <html lang="en">
      <body>
        <Error statusCode={404} displayName="X-助手" title="X-助手: your page is not found" />
      </body>
    </html>
  );
}