"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordFieldProps {
  autoComplete: "current-password" | "new-password";
  id: string;
  minLength?: number;
  onChange: (value: string) => void;
  value: string;
}

export function PasswordField({ autoComplete, id, minLength, onChange, value }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="password-field">
      <input
        id={id}
        type={visible ? "text" : "password"}
        required
        minLength={minLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </span>
  );
}
