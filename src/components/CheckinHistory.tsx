import { Calendar, CheckCircle } from 'lucide-react';
import type { CheckinRecord } from '@/types';

interface CheckinHistoryProps {
  checkins: CheckinRecord[];
}

export function CheckinHistory({ checkins }: CheckinHistoryProps) {
  const recentCheckins = checkins.slice(0, 7);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    });
  };

  const formatTime = (checkedAt: string) => {
    return new Date(checkedAt).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">签到记录</h3>
      </div>

      {recentCheckins.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>暂无签到记录</p>
        </div>
      ) : (
        <div className="space-y-2">
          {recentCheckins.map((record, index) => (
            <div
              key={record.date}
              className="flex items-center justify-between p-3 bg-card rounded-xl border border-border"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-accent" />
                <span className="text-foreground">{formatDate(record.date)}</span>
              </div>
              <span className="text-sm text-muted-foreground">{formatTime(record.checked_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
