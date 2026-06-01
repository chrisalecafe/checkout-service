'use client';
import { Button } from '@heroui/react';
import { Logo } from './Logo';

interface NavbarProps {
  onSignOut: () => void;
  isDisabled?: boolean;
}

export function Navbar({ onSignOut, isDisabled }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-default-200 bg-background/80 backdrop-blur-md">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Logo size="sm" />
        <Button
          variant="light"
          size="sm"
          color="default"
          isDisabled={isDisabled}
          onPress={onSignOut}
        >
          Sign out
        </Button>
      </div>
    </header>
  );
}
