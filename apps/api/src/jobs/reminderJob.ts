import { env } from '../config/env';
import { sendPushNotifications, PushMessage } from '../services/pushService';

type PushTokenRow = { user_id: string; token: string };
type DiagnosisRow = { user_id: string; summary: string; urgency: string };

async function supabaseGet(path: string): Promise<Response> {
  return fetch(`${env.supabaseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: env.supabaseServiceRoleKey,
      Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
      'Content-Type': 'application/json',
    },
  });
}

export async function runReminderJob(): Promise<void> {
  // Find users with open critical/high issues in the last 7 days
  const diagRes = await supabaseGet(
    'diagnoses?select=user_id,summary,urgency' +
    '&status=eq.open' +
    '&urgency=in.(high,critical)' +
    '&created_at=gte.' + new Date(Date.now() - 7 * 86_400_000).toISOString() +
    '&order=created_at.desc'
  );

  if (!diagRes.ok) return;
  const diagnoses: DiagnosisRow[] = await diagRes.json();
  if (diagnoses.length === 0) return;

  // Collect unique user_ids
  const userIds = [...new Set(diagnoses.map((d) => d.user_id))];

  // Fetch their push tokens
  const tokenRes = await supabaseGet(
    `push_tokens?select=user_id,token&user_id=in.(${userIds.join(',')})`
  );

  if (!tokenRes.ok) return;
  const tokens: PushTokenRow[] = await tokenRes.json();
  if (tokens.length === 0) return;

  // Build one notification per user (most severe issue)
  const tokenMap = new Map(tokens.map((t) => [t.user_id, t.token]));

  const messages: PushMessage[] = userIds
    .filter((uid) => tokenMap.has(uid))
    .map((uid) => {
      const issue = diagnoses.find((d) => d.user_id === uid);
      const isCritical = issue?.urgency === 'critical';
      return {
        to: tokenMap.get(uid)!,
        title: isCritical ? '⚠️ Critical issue unresolved' : 'Vehicle issue needs attention',
        body: issue?.summary ?? 'You have an open issue on one of your vehicles.',
        sound: 'default',
        data: { screen: 'History' },
      };
    });

  await sendPushNotifications(messages);
  console.log(`[reminderJob] Sent ${messages.length} push notification(s).`);
}
