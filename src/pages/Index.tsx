import { useCallback } from 'react';
import { toast } from 'sonner';
import { Heart, Shield } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { CheckinButton } from '@/components/CheckinButton';
import { CountdownTimer } from '@/components/CountdownTimer';
import { EmergencyContactForm } from '@/components/EmergencyContactForm';
import { CheckinHistory } from '@/components/CheckinHistory';
import type { UserData, EmergencyContact } from '@/types';

const initialUserData: UserData = {
  contacts: [],
  checkins: [],
  lastCheckin: null,
};

const Index = () => {
  const [userData, setUserData] = useLocalStorage<UserData>('silema-user-data', initialUserData);

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const hasCheckedInToday = userData.lastCheckin?.startsWith(getTodayDate()) ?? false;

  const handleCheckin = useCallback(() => {
    const now = new Date();
    const today = getTodayDate();

    setUserData((prev) => ({
      ...prev,
      lastCheckin: now.toISOString(),
      checkins: [
        ...prev.checkins.filter((c) => c.date !== today),
        { date: today, timestamp: now.getTime() },
      ],
    }));

    toast.success('签到成功！', {
      description: '今天的生存确认已完成',
    });
  }, [setUserData]);

  const handleAddContact = useCallback(
    (contact: Omit<EmergencyContact, 'id'>) => {
      const newContact: EmergencyContact = {
        ...contact,
        id: Date.now().toString(),
      };
      setUserData((prev) => ({
        ...prev,
        contacts: [...prev.contacts, newContact],
      }));
      toast.success('联系人已添加');
    },
    [setUserData]
  );

  const handleRemoveContact = useCallback(
    (id: string) => {
      setUserData((prev) => ({
        ...prev,
        contacts: prev.contacts.filter((c) => c.id !== id),
      }));
      toast.success('联系人已删除');
    },
    [setUserData]
  );

  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Header */}
      <header className="pt-8 pb-4 px-4">
        <div className="max-w-md mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">死了么</h1>
          </div>
          <p className="text-muted-foreground">每日签到，让关心你的人安心</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pb-8">
        <div className="max-w-md mx-auto space-y-6">
          {/* Checkin Card */}
          <section className="bg-card rounded-3xl border border-border p-8 shadow-soft">
            <div className="flex flex-col items-center">
              <CheckinButton
                onCheckin={handleCheckin}
                hasCheckedInToday={hasCheckedInToday}
              />
            </div>
          </section>

          {/* Countdown Timer */}
          <section className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CountdownTimer lastCheckin={userData.lastCheckin} deadlineHours={48} />
          </section>

          {/* Emergency Contacts */}
          <section className="bg-card rounded-3xl border border-border p-6 shadow-soft animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <EmergencyContactForm
              contacts={userData.contacts}
              onAddContact={handleAddContact}
              onRemoveContact={handleRemoveContact}
            />
          </section>

          {/* Checkin History */}
          <section className="bg-card rounded-3xl border border-border p-6 shadow-soft animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <CheckinHistory checkins={userData.checkins} />
          </section>

          {/* Info Footer */}
          <footer className="text-center py-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>如果连续 48 小时未签到，紧急联系人将收到通知</span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default Index;
