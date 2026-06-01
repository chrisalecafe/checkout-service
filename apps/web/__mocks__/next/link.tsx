import React from 'react';
const Link = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
  <a href={href} className={className}>{children}</a>
);
export default Link;
