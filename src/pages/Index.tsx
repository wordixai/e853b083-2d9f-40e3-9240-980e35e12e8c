import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Heart, Shield, Loader2 } from 'lucide-react';
import { CheckinButton } from '@/components/CheckinButton';
import { CountdownTimer } from '@/components/CountdownTimer';
import { EmergencyContactForm } from '@/components/EmergencyContactForm';
import { CheckinHistory } from '@/components/CheckinHistory';
import {
  getOrCreateUser,
  checkin,
  getCheckins,
  getLastCheckin,
  addEmergencyContact,
  getEmergencyContacts,
  deleteEmergencyContact,
} from '@/lib/supabase';
import type { User, CheckinRecord, EmergencyContact } from '@/types';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [checkins, setCheckins] = useState<CheckinRecord[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [lastCheckin, setLastCheckin] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 初始化用户数据
  useEffect(() => {
    const initUser = async () => {
      try {
        const userData = await getOrCreateUser();
        setUser(userData);

        // 并行获取签到记录和联系人
        const [checkinData, contactData, lastCheckinData] = await Promise.all([
          getCheckins(userData.id),
          getEmergencyContacts(userData.id),
          getLastCheckin(userData.id),
        ]);

        setCheckins(checkinData);
        setContacts(contactData);
        setLastCheckin(lastCheckinData);
      } catch (error) {
        console.error('初始化失败:', error);
        toast.error('加载数据失败，请刷新页面重试');
      } finally {
        setLoading(false);
      }
    };

    initUser();
  }, []);

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const hasCheckedInToday = checkins.some((c) => c.date === getTodayDate());

  const handleCheckin = useCallback(async () => {
    if (!user) return;

    try {
      const newCheckin = await checkin(user.id);
      setCheckins((prev) => [newCheckin, ...prev.filter((c) => c.date !== getTodayDate())]);
      setLastCheckin(newCheckin.checked_at);

      toast.success('签到成功！', {
        description: '今天的生存确认已完成',
      });
    } catch (error) {
      console.error('签到失败:', error);
      toast.error('签到失败，请重试');
    }
  }, [user]);

  const handleAddContact = useCallback(
    async (contact: { name: string; email: string }) => {
      if (!user) return;

      try {
        const newContact = await addEmergencyContact(user.id, contact.name, contact.email);
        setContacts((prev) => [...prev, newContact]);
        toast.success('联系人已添加');
      } catch (error) {
        console.error('添加联系人失败:', error);
        toast.error('添加失败，请重试');
      }
    },
    [user]
  );

  const handleRemoveContact = useCallback(async (id: string) => {
    try {
      await deleteEmergencyContact(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
      toast.success('联系人已删除');
    } catch (error) {
      console.error('删除联系人失败:', error);
      toast.error('删除失败，请重试');
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

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
              <CheckinButton onCheckin={handleCheckin} hasCheckedInToday={hasCheckedInToday} />
            </div>
          </section>

          {/* Countdown Timer */}
          <section className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CountdownTimer lastCheckin={lastCheckin} deadlineHours={48} />
          </section>

          {/* Emergency Contacts */}
          <section
            className="bg-card rounded-3xl border border-border p-6 shadow-soft animate-fade-in"
            style={{ animationDelay: '0.2s' }}
          >
            <EmergencyContactForm
              contacts={contacts}
              onAddContact={handleAddContact}
              onRemoveContact={handleRemoveContact}
            />
          </section>

          {/* Checkin History */}
          <section
            className="bg-card rounded-3xl border border-border p-6 shadow-soft animate-fade-in"
            style={{ animationDelay: '0.3s' }}
          >
            <CheckinHistory checkins={checkins} />
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
