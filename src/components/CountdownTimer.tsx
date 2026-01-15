import { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface CountdownTimerProps {
  lastCheckin: string | null;
  deadlineHours?: number;
}

export function CountdownTimer({ lastCheckin, deadlineHours = 48 }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; isUrgent: boolean; isExpired: boolean } | null>(null);

  useEffect(() => {
    if (!lastCheckin) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const lastCheckinTime = new Date(lastCheckin).getTime();
      const deadline = lastCheckinTime + deadlineHours * 60 * 60 * 1000;
      const now = Date.now();
      const diff = deadline - now;

      if (diff <= 0) {
        return { hours: 0, minutes: 0, seconds: 0, isUrgent: true, isExpired: true };
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      const isUrgent = hours < 12;

      return { hours, minutes, seconds, isUrgent, isExpired: false };
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [lastCheckin, deadlineHours]);

  if (!timeLeft) {
    return (
      <div className="text-center p-6 bg-card rounded-2xl border border-border">
        <p className="text-muted-foreground">还没有签到记录</p>
      </div>
    );
  }

  const formatTime = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className={`text-center p-6 rounded-2xl border transition-smooth ${
      timeLeft.isExpired
        ? 'bg-destructive/10 border-destructive/30'
        : timeLeft.isUrgent
          ? 'bg-warning/10 border-warning/30'
          : 'bg-card border-border'
    }`}>
      <div className="flex items-center justify-center gap-2 mb-3">
        {timeLeft.isUrgent ? (
          <AlertTriangle className="w-5 h-5 text-destructive" />
        ) : (
          <Clock className="w-5 h-5 text-muted-foreground" />
        )}
        <span className="text-sm text-muted-foreground">
          {timeLeft.isExpired ? '已超时！紧急联系人将收到通知' : '距离下次必须签到还有'}
        </span>
      </div>

      <div className="flex items-center justify-center gap-2 text-4xl font-bold font-mono">
        <span className={timeLeft.isUrgent ? 'text-destructive' : 'text-foreground'}>
          {formatTime(timeLeft.hours)}
        </span>
        <span className="text-muted-foreground">:</span>
        <span className={timeLeft.isUrgent ? 'text-destructive' : 'text-foreground'}>
          {formatTime(timeLeft.minutes)}
        </span>
        <span className="text-muted-foreground">:</span>
        <span className={timeLeft.isUrgent ? 'text-destructive' : 'text-foreground'}>
          {formatTime(timeLeft.seconds)}
        </span>
      </div>
    </div>
  );
}
