import { User } from 'lucide-react';
import { Button } from './Button';

interface UserMenuProps {
  username?: string;
}

export function UserMenu({ username = 'User' }: UserMenuProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      icon={<User className="h-4 w-4" />}
      aria-label="User menu"
    >
      {username}
    </Button>
  );
}
