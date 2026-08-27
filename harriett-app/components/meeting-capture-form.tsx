"use client";

import { Mic, Square, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type CaptureMode = "recording" | "dictated_memo" | "written_memo";

interface Option {
  id: string;
  label: string;
}

function localDateTimeValue(date = new Date()): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function MeetingCaptureForm({ deals, contacts }: { deals: Option[]; contacts: Option[] }) {
  const router = useRouter();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [mode, setMode] = useState<CaptureMode>("dictated_memo");
  const [recording, setRecording] = useState(false);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function startRecording() {
    setMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        setAudio(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }));
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      });
      recorder.start();
      setRecording(true);
    } catch {
      setMessage("Microphone access is required to record audio. You can use a written memo instead.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  function clearRecording() {
    if (recording) stopRecording();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    setAudio(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    form.set("sourceType", mode);
    const localDate = String(form.get("occurredAt") || "");
    form.set("occurredAt", new Date(localDate).toISOString());
    if (audio) form.set("audio", new File([audio], `meeting-${Date.now()}.webm`, { type: audio.type || "audio/webm" }));
    const response = await fetch("/api/meetings", { method: "POST", body: form });
    const result = await response.json().catch(() => ({})) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setMessage(result.error || "The meeting could not be saved.");
      return;
    }
    setMessage("Saved. Harriett is preparing the summary and follow-up work now.");
    setAudio(null);
    event.currentTarget.reset();
    router.refresh();
  }

  const needsAudio = mode !== "written_memo";
  return (
    <form className="capture-form" onSubmit={submit}>
      <div className="capture-mode-grid" role="radiogroup" aria-label="Capture type">
        {([
          ["dictated_memo", "Voice memo", "Talk through the showing or call after it ends."],
          ["recording", "Record meeting", "Record a live meeting after everyone agrees."],
          ["written_memo", "Written notes", "Paste or type a quick recap."],
        ] as const).map(([value, label, detail]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            className={`capture-mode ${mode === value ? "capture-mode-active" : ""}`}
            onClick={() => { clearRecording(); setMode(value); setMessage(null); }}
          >
            <strong>{label}</strong><span>{detail}</span>
          </button>
        ))}
      </div>

      <div className="form-grid two-column">
        <label><span>Title</span><input name="title" required maxLength={160} placeholder="Showing recap, client call, team meeting" /></label>
        <label><span>When it happened</span><input name="occurredAt" type="datetime-local" required defaultValue={localDateTimeValue()} /></label>
        <label><span>Transaction</span><select name="dealId" defaultValue=""><option value="">No transaction yet</option>{deals.map((deal) => <option value={deal.id} key={deal.id}>{deal.label}</option>)}</select></label>
        <label><span>Primary contact</span><select name="contactId" defaultValue=""><option value="">No contact selected</option>{contacts.map((contact) => <option value={contact.id} key={contact.id}>{contact.label}</option>)}</select></label>
      </div>

      {needsAudio ? (
        <div className="audio-capture-box">
          {!recording && !audio && <button type="button" className="primary-button" onClick={startRecording}><Mic size={17} /> Start recording</button>}
          {recording && <button type="button" className="danger-button" onClick={stopRecording}><Square size={16} /> Stop recording</button>}
          {audio && <div className="recording-ready"><span><Upload size={17} /> Recording ready</span><button type="button" className="icon-button" onClick={clearRecording} aria-label="Discard recording"><X size={16} /></button></div>}
          <p>{mode === "recording" ? "Harriett saves a structured summary, not a transcript." : "Speak naturally. Harriett will turn this into a summary and next steps."}</p>
        </div>
      ) : (
        <label><span>Notes</span><textarea name="memo" rows={8} maxLength={15000} required placeholder="What happened, what was decided, and what needs to happen next?" /></label>
      )}

      {mode === "recording" && (
        <label className="consent-check"><input type="checkbox" name="consentConfirmed" value="true" required /><span>Everyone in the meeting gave permission to record.</span></label>
      )}
      {mode !== "recording" && <input type="hidden" name="consentConfirmed" value="false" />}
      {message && <p className="form-message" role="status">{message}</p>}
      <button type="submit" className="primary-button" disabled={saving || (needsAudio && !audio)}>{saving ? "Saving..." : "Create summary"}</button>
    </form>
  );
}
