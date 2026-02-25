import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

type DiagnosisIdRow = { id: string };

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export async function runDiagnosisRetentionJob(): Promise<void> {
  const retentionDays = Number.isFinite(env.diagnosesRetentionDays)
    ? Math.max(1, Math.floor(env.diagnosesRetentionDays))
    : 30;
  const cutoffIso = new Date(Date.now() - retentionDays * 86_400_000).toISOString();

  const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: staleRows, error: staleError } = await supabaseAdmin
    .from('diagnoses')
    .select('id')
    .lt('created_at', cutoffIso);

  if (staleError) {
    throw new Error(`Failed to fetch stale diagnoses: ${staleError.message}`);
  }

  const staleIds = (staleRows as DiagnosisIdRow[] | null)?.map((r) => r.id) ?? [];
  if (staleIds.length === 0) {
    console.log(`[diagnosisRetentionJob] No diagnoses older than ${retentionDays} days.`);
    return;
  }

  let deletedCount = 0;
  const batches = chunk(staleIds, 500);

  for (const ids of batches) {
    // Keep maintenance records but detach links to soon-to-be deleted diagnoses.
    const { error: unlinkError } = await supabaseAdmin
      .from('maintenance_log')
      .update({ from_diagnosis_id: null })
      .in('from_diagnosis_id', ids);

    if (unlinkError) {
      throw new Error(`Failed to unlink maintenance entries: ${unlinkError.message}`);
    }

    const { data: deletedRows, error: deleteError } = await supabaseAdmin
      .from('diagnoses')
      .delete()
      .in('id', ids)
      .select('id');

    if (deleteError) {
      throw new Error(`Failed to delete stale diagnoses: ${deleteError.message}`);
    }

    deletedCount += (deletedRows as DiagnosisIdRow[] | null)?.length ?? 0;
  }

  console.log(
    `[diagnosisRetentionJob] Deleted ${deletedCount} diagnosis record(s) older than ${retentionDays} days.`
  );
}
