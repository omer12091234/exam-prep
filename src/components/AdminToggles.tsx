"use client";

import { useOptimistic, useState, useTransition } from "react";
import { adminSetEnrollment, adminSetRole } from "@/app/actions/account";

export function EnrollmentToggle({
  userId,
  courseId,
  enrolled,
  label,
}: {
  userId: string;
  courseId: string;
  enrolled: boolean;
  label: string;
}) {
  const [value, setValue] = useOptimistic(enrolled);
  const [, startTransition] = useTransition();
  const [error, setError] = useState(false);
  return (
    <input
      type="checkbox"
      className={`size-4 ${error ? "outline outline-2 outline-red-600" : ""}`}
      aria-label={label}
      title={error ? "השמירה נכשלה" : undefined}
      checked={value}
      onChange={(e) => {
        const on = e.target.checked;
        setError(false);
        startTransition(async () => {
          setValue(on);
          try {
            await adminSetEnrollment(userId, courseId, on);
          } catch {
            setError(true);
          }
        });
      }}
    />
  );
}

export function RoleSelect({
  userId,
  role,
  disabled,
}: {
  userId: string;
  role: "ADMIN" | "USER";
  disabled: boolean;
}) {
  const [value, setValue] = useOptimistic(role);
  const [, startTransition] = useTransition();
  const [error, setError] = useState(false);
  return (
    <select
      value={value}
      disabled={disabled}
      aria-label="תפקיד"
      title={
        disabled
          ? "אי אפשר לשנות את התפקיד של עצמך"
          : error
            ? "השמירה נכשלה"
            : undefined
      }
      className={`rounded-lg border px-2 py-1 dark:bg-neutral-900 ${error ? "border-red-600" : "border-neutral-300 dark:border-neutral-700"}`}
      onChange={(e) => {
        const next = e.target.value as "ADMIN" | "USER";
        setError(false);
        startTransition(async () => {
          setValue(next);
          try {
            await adminSetRole(userId, next);
          } catch {
            setError(true);
          }
        });
      }}
    >
      <option value="USER">משתמש</option>
      <option value="ADMIN">מנהל</option>
    </select>
  );
}
