---
name: supabase-integration
description: Complete Supabase integration for React applications including database setup, authentication, storage, and Edge Functions. Use this skill when users mention Supabase, databases, user authentication, file storage, "Enable Cloud", or backend functionality. 使用此技能处理 Supabase 数据库、用户认证、文件存储、Edge Functions 等后端功能。
---

# Supabase Integration

## Before Starting - Integration Check

**CRITICAL**: Before initializing Supabase, always check the current integration status:

**Step 1: Check Existing Integration**

Check if Supabase is already integrated:
- Look for `src/lib/supabase.ts` file
- Check `.env` file for Supabase environment variables:
  - `VITE_SUPABASE_PROJECT_ID`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_SUPABASE_URL`

**Step 2: Handle Based on Status**

**If already integrated (supabase.ts exists with valid configuration)**:
- Inform user: "✓ Supabase is already integrated and configured."

**If not integrated (no supabase.ts)**:
- Call `supabase-enable` tool
- Check if tool result contains required environment variables:
  - `VITE_SUPABASE_PROJECT_ID`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_SUPABASE_URL`
- **If variables are present**: Proceed with full "Enable Cloud" workflow below
- **If tool reports an error**: Stop execution immediately and notify user of error


---

Complete guide for integrating Supabase into React applications with database, authentication, storage, and serverless functions.

Supabase 集成指南，包括数据库、认证、存储和 Edge Functions。

## Quick Start

### When to Use This Skill

Use this skill when working with:
- Database operations (PostgreSQL via Supabase)
- User authentication and authorization
- File upload and storage
- Serverless backend logic (Edge Functions)
- Real-time data subscriptions
- Row Level Security (RLS) policies

**关键原则**: 默认使用 Supabase 作为数据库和后端服务，除非用户明确指定其他方案。

## Initial Setup

### Prerequisites

Supabase project must be configured by the user. If no project is selected, remind user to select a project.

### "Enable Cloud" Workflow

**CRITICAL**: When user says "Enable Cloud" or requests Supabase initialization, immediately execute these steps WITHOUT asking for confirmation:

**Step 1: Install Dependencies**

```bash
pnpm add @supabase/supabase-js
```

**Step 2: Create Environment File**

Create `.env` file with project credentials:

```env
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
VITE_SUPABASE_URL=your_supabase_url
```

**Step 3: Create Supabase Client**

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
```

**Step 4: Create Migrations Directory**

```bash
mkdir -p supabase/migrations
```

**Step 5: Confirm Setup**

Inform user: "Supabase is now initialized and ready to use."

## Database Migrations

### Data Safety Rules

**CRITICAL**: Data integrity is the highest priority - users must NEVER lose data.

**Forbidden Operations**:
- ❌ Destructive operations: `DROP`, `DELETE` that could cause data loss
- ❌ Transaction control: `BEGIN`, `COMMIT`, `ROLLBACK`, `END`
- ✅ **Exception**: `DO $$ BEGIN ... END $$` blocks (PL/pgSQL) are allowed

### Migration Workflow

For EVERY database change, create a migration file in `/supabase/migrations/`:

**Required Steps**:
1. Create new `.sql` file with descriptive name (e.g., `create_users_table.sql`)
2. Write complete SQL content with comments
3. Include safety checks (`IF EXISTS`/`IF NOT EXISTS`)
4. Enable RLS and add appropriate policies

**Migration Rules**:
- ✅ Always provide COMPLETE file content (never use diffs)
- ✅ Create new migration file for each change in `/home/project/supabase/migrations`
- ❌ NEVER update existing migration files
- ✅ Use descriptive names without number prefix (e.g., `create_users.sql`)
- ✅ Always enable RLS: `ALTER TABLE users ENABLE ROW LEVEL SECURITY;`
- ✅ Add RLS policies for CRUD operations
- ✅ Use default values: `DEFAULT false/true`, `DEFAULT 0`, `DEFAULT ''`, `DEFAULT now()`
- ✅ Start with markdown summary in multi-line comment
- ✅ Use `IF EXISTS`/`IF NOT EXISTS` for safe operations

### Migration Template

```sql
/*
  # Create users table
  1. New Tables: users (id uuid, email text, created_at timestamp)
  2. Security: Enable RLS, add read policy for authenticated users
*/
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own data" 
  ON users 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id);
```

## Client Setup

### Installation

```bash
pnpm add @supabase/supabase-js
```

### Client Configuration

Create singleton client in `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

**Required Environment Variables**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Authentication

### Authentication Strategy

**Default Method**: Email/password authentication
- ✅ Always use email/password signup
- ❌ FORBIDDEN: Magic links, social providers, SSO (unless explicitly stated)
- ❌ FORBIDDEN: Custom auth systems (always use Supabase built-in auth)
- ⚙️ Email confirmation: Always disabled unless stated

### Authentication Examples

```typescript
// 注册
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword'
});

// 登录
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securepassword'
});

// 登出
const { error } = await supabase.auth.signOut();
```

## User Profiles

### Profile Table Setup

**REQUIRED**: Always create `public.profiles` table linked to `auth.users`:

```sql
CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  username text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id)
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 添加策略
CREATE POLICY "Users can view all profiles" 
  ON profiles 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can update own profile" 
  ON profiles 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);
```

### Auto-Create Profile Trigger

Create trigger to automatically insert profile on user signup:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## Storage

Use Supabase Storage when users need file upload functionality (images, documents, etc.).

### Create Storage Bucket

Create buckets in migrations:

```sql
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true);
```

### Storage RLS Policies

Always add RLS policies for `storage.objects` table with `bucket_id` filter:

```sql
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');
```

### Common Storage Operations

```typescript
// Upload file
const { data, error } = await supabase.storage
  .from('avatars')
  .upload('user-id/avatar.png', file);

// Download file
const { data, error } = await supabase.storage
  .from('avatars')
  .download('user-id/avatar.png');

// Get public URL
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl('user-id/avatar.png');

// Delete file
const { error } = await supabase.storage
  .from('avatars')
  .remove(['user-id/avatar.png']);

// List files
const { data, error } = await supabase.storage
  .from('avatars')
  .list('user-id/');
```

### File Organization

- **Private files**: Use user ID prefix: `'{userId}/filename'`
- **Public files**: Use simple naming scheme

## Edge Functions

Use Edge Functions for server-side logic, background tasks, webhooks, or API integrations.

### Creating Edge Functions

Create functions in `/supabase/functions/<function-name>/index.ts`

### Runtime Environment

- **Runtime**: Deno with TypeScript support
- **Import Supabase**: `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'`
- **Environment Variables**: `Deno.env.get('VARIABLE_NAME')`

### Edge Function Example

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const { name } = await req.json();
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    // Execute business logic
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('name', name);
    
    if (error) throw error;
    
    return new Response(
      JSON.stringify({ data }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
```

### Invoking from Client

```typescript
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { name: 'John' }
});
```

### Common Use Cases

- Webhook handlers
- Scheduled jobs
- Third-party API calls
- Complex business logic
- Payment processing
- Email sending

## Security

### Row Level Security (RLS)

**Required Security Practices**:
- ✅ Enable RLS for every new table
- ✅ Create policies based on user authentication
- ✅ One migration per logical change
- ✅ Use descriptive policy names

### RLS Policy Examples

```sql
-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Everyone can view
CREATE POLICY "Posts are viewable by everyone"
  ON posts FOR SELECT
  USING (true);

-- INSERT policy: Authenticated users can create
CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE policy: Users can update own posts
CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE policy: Users can delete own posts
CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

### Performance Optimization

- Add indexes for frequently queried columns
- Use `EXPLAIN ANALYZE` to analyze query performance
- Consider materialized views for complex queries

### Index Examples

```sql
-- Add indexes for common query patterns
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_status ON posts(status) WHERE status = 'published';
```

## Best Practices

1. **Data Integrity**: Never risk data loss
2. **Security First**: Always enable RLS and add policies
3. **Migration-Driven**: All database changes via migration files
4. **Type Safety**: Use TypeScript for database types
5. **Environment Variables**: Store sensitive info in `.env`
6. **Error Handling**: Always check `error` objects
7. **Performance**: Add indexes for common queries
8. **Documentation**: Include clear comments in migrations

## Common Patterns

### Database Relationships

Use foreign key constraints with `ON DELETE CASCADE` or `ON DELETE SET NULL`:

```sql
CREATE TABLE posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text
);
```

### Real-time Subscriptions

Use Supabase Realtime for live data updates:

```typescript
const subscription = supabase
  .channel('posts')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'posts' },
    (payload) => {
      console.log('Change received!', payload);
    }
  )
  .subscribe();

// Unsubscribe
subscription.unsubscribe();
```

### File Upload Size Limits

Configure file size limits in bucket settings or validate on client:

```typescript
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

if (file.size > MAX_FILE_SIZE) {
  throw new Error('File too large');
}
```

## Debugging

**Troubleshooting Checklist**:
1. **Check RLS**: Verify RLS policies are correctly set
2. **View Logs**: Check logs in Supabase Dashboard
3. **Test Queries**: Use SQL Editor to test queries
4. **Verify Permissions**: Confirm user has correct permissions
5. **Environment Variables**: Validate all env vars are set correctly

## Additional Resources

For more detailed guidance, refer to:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)



## Supabase Project Structure

```
project-root/
├── supabase/
│   ├── functions/
│   │   ├── <function-name-1>/
│   │   │   └── index.ts          # AI Feature 1
│   │   ├── <function-name-2>/
│   │   │   └── index.ts          # AI Feature 2
│   │   └── <function-name-3>/
│   │       └── index.ts          # AI Feature 3
│   ├── .env.local                # Functions environment variables
│   └── config.toml               # Supabase configuration
├── src/
│   ├── lib/
│   │   └── supabase.ts           # Supabase Client configuration
│   └── ...
└── .env                          # Frontend environment variables (VITE_SUPABASE_URL, etc.)
```