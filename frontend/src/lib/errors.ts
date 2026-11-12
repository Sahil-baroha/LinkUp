import type { UseFormSetError, FieldValues, Path } from "react-hook-form";

export interface ServerValidationError {
  field?: string;
  message: string;
}

/**
 * Maps backend validation errors to React Hook Form fields.
 * Strips leading "body." from field names.
 * Calls RHF setError for matched fields and returns unmatched error messages for toast.
 */
export function mapServerErrors<T extends FieldValues = FieldValues>(
  errors: ServerValidationError[] | undefined | null,
  setError: UseFormSetError<T>,
  knownFields?: string[]
): string[] {
  if (!errors || !Array.isArray(errors) || errors.length === 0) {
    return [];
  }

  const unmatched: string[] = [];

  for (const err of errors) {
    if (!err.message) continue;

    if (!err.field) {
      unmatched.push(err.message);
      continue;
    }

    // Strip leading "body."
    const cleanField = err.field.replace(/^body\./, "");

    // If knownFields provided, verify field or its root property is present
    if (knownFields && knownFields.length > 0) {
      const rootField = cleanField.split(".")[0];
      if (!knownFields.includes(rootField) && !knownFields.includes(cleanField)) {
        unmatched.push(err.message);
        continue;
      }
    }

    try {
      setError(cleanField as Path<T>, {
        type: "server",
        message: err.message,
      });
    } catch {
      unmatched.push(err.message);
    }
  }

  return unmatched;
}
