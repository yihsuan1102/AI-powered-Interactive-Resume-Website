import React from 'react';

export default function Footer() {
  return (
    <footer className="mt-16 mb-8 text-center text-gray-500 text-sm">
      © {new Date().getFullYear()} Your Name. All rights reserved.
    </footer>
  );
}
