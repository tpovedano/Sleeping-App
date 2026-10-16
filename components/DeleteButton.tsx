"use client";

import { Trash2 } from "lucide-react";
import { deleteSession } from "@/app/actions/sessions";

export function DeleteButton({ id }: { id: string }) {
  return (
    <form
      action={deleteSession}
      onSubmit={(e) => {
        if (!confirm("¿Eliminar este registro?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="grid size-9 cursor-pointer place-items-center rounded-xl text-muted transition hover:bg-rose-500/15 hover:text-rose-200"
        aria-label="Eliminar registro"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </form>
  );
}
