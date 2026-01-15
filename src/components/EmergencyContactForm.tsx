import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, X, Mail, User } from 'lucide-react';
import type { EmergencyContact } from '@/types';

interface EmergencyContactFormProps {
  contacts: EmergencyContact[];
  onAddContact: (contact: Omit<EmergencyContact, 'id'>) => void;
  onRemoveContact: (id: string) => void;
}

export function EmergencyContactForm({ contacts, onAddContact, onRemoveContact }: EmergencyContactFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && email.trim()) {
      onAddContact({ name: name.trim(), email: email.trim() });
      setName('');
      setEmail('');
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">紧急联系人</h3>
        {!isAdding && (
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
            <UserPlus className="w-4 h-4 mr-1" />
            添加
          </Button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="p-4 bg-secondary/50 rounded-xl space-y-4 animate-fade-in">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm text-muted-foreground">姓名</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="联系人姓名"
                className="pl-10"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-muted-foreground">邮箱</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@example.com"
                className="pl-10"
                required
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm">保存</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAdding(false)}>取消</Button>
          </div>
        </form>
      )}

      {contacts.length === 0 && !isAdding ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>还没有添加紧急联系人</p>
          <p className="text-sm">添加联系人后，如果您连续两天未签到，系统会自动通知他们</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center justify-between p-4 bg-card rounded-xl border border-border transition-smooth hover:shadow-soft"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{contact.name}</p>
                  <p className="text-sm text-muted-foreground">{contact.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemoveContact(contact.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
