import Link from 'next/link';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: { icon: 20, text: 'text-base' },
    md: { icon: 26, text: 'text-xl' },
    lg: { icon: 36, text: 'text-3xl' },
  };
  const { icon, text } = sizes[size];

  return (
    <Link href="/" className="flex items-center gap-2 select-none">
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        />
        <line
          x1="3"
          y1="6"
          x2="21"
          y2="6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-primary"
        />
        <path
          d="M16 10a4 4 0 01-8 0"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        />
      </svg>
      <span className={`${text} font-bold tracking-tight`}>
        Simple<span className="text-primary"> Checkout</span>
      </span>
    </Link>
  );
}
