import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

export const userRouter = Router();

userRouter.delete('/', async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // Delete user data from all tables (order matters for FK constraints)
    await supabaseAdmin.from('reminders').delete().eq('user_id', userId);
    await supabaseAdmin.from('maintenance_log').delete().eq('user_id', userId);
    await supabaseAdmin.from('diagnoses').delete().eq('user_id', userId);
    await supabaseAdmin.from('vehicles').delete().eq('user_id', userId);
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // Delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('[user.route] deleteUser failed:', deleteError.message);
      return res.status(500).json({ error: 'Failed to delete user account' });
    }

    return res.json({ deleted: true });
  } catch (err) {
    console.error('[user.route] unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
