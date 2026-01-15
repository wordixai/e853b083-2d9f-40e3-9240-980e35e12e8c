import { Button } from '@/components/ui/button';
import { Heart, Check } from 'lucide-react';

interface CheckinButtonProps {
  onCheckin: () => void;
  hasCheckedInToday: boolean;
  isLoading?: boolean;
}

export function CheckinButton({ onCheckin, hasCheckedInToday, isLoading }: CheckinButtonProps) {
  if (hasCheckedInToday) {
    return (
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="w-32 h-32 rounded-full bg-gradient-success flex items-center justify-center shadow-success">
          <Check className="w-16 h-16 text-accent-foreground" />
        </div>
        <p className="text-lg font-medium text-muted-foreground">今天已签到</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <Button
        variant="checkin"
        size="xl"
        onClick={onCheckin}
        disabled={isLoading}
        className="w-40 h-40 rounded-full animate-pulse-glow"
      >
        <Heart className="w-16 h-16" />
      </Button>
      <p className="text-lg font-medium text-muted-foreground">点击签到</p>
    </div>
  );
}
