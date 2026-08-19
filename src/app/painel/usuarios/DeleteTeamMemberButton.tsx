"use client";

import { useState, useTransition } from "react";
import { deleteTeamMemberAction } from "@/lib/actions/users";

export function DeleteTeamMemberButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition(); const [error, setError] = useState<string>();
  function remove() { if (!window.confirm(`Excluir permanentemente o acesso de ${name}?`)) return; startTransition(async () => { const result = await deleteTeamMemberAction(id); setError(result.error); }); }
  return <div className="text-right"><button type="button" disabled={pending} onClick={remove} className="rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">{pending ? "Excluindo..." : "Excluir acesso"}</button>{error && <p className="mt-1 max-w-xs text-xs text-red-600">{error}</p>}</div>;
}
