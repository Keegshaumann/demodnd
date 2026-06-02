"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  createSubmissionAction,
  type SubmissionResult,
} from "@/lib/seller/submissions";
import {
  CATEGORIES,
  CONDITIONS,
  AUTH_METHODS,
} from "@/lib/marketplace/constants";
import type { AuthMethod } from "@/lib/supabase/database.types";
import {
  ArrowRightIcon,
  CameraIcon,
  CheckIcon,
  CheckCircleIcon,
  CloseIcon,
} from "@/components/ui/icons";

const BUCKET = "item-photos";
const MAX_PHOTOS = 20;
const MIN_PHOTOS = 4;
const MAX_BYTES = 10 * 1024 * 1024;

interface Photo {
  id: string;
  path: string;
  url: string;
  name: string;
  uploading: boolean;
  error?: boolean;
}

const STEPS = ["Details", "Photos", "Authentication", "Review"];

export function SubmissionWizard({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = useRef(createClient()).current;
  const draftId = useRef(crypto.randomUUID()).current;

  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);

  // Step 1 — details
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [model, setModel] = useState("");
  const [condition, setCondition] = useState<string>(CONDITIONS[0]);
  const [priceRands, setPriceRands] = useState("");
  const [year, setYear] = useState("");
  const [description, setDescription] = useState("");

  // Step 2 — photos
  const [photos, setPhotos] = useState<Photo[]>([]);

  // Step 3 — method
  const [method, setMethod] = useState<AuthMethod | "">("");

  // Step 4 — submit
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    setStepError(null);
    const remaining = MAX_PHOTOS - photos.length;
    const chosen = Array.from(files).slice(0, remaining);

    for (const file of chosen) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > MAX_BYTES) {
        setStepError(`"${file.name}" exceeds the 10MB limit.`);
        continue;
      }
      const id = crypto.randomUUID();
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const path = `${userId}/${draftId}/${id}-${safeName}`;

      setPhotos((p) => [
        ...p,
        { id, path, url: "", name: file.name, uploading: true },
      ]);

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false });

      if (error) {
        setPhotos((p) =>
          p.map((ph) =>
            ph.id === id ? { ...ph, uploading: false, error: true } : ph,
          ),
        );
        continue;
      }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      setPhotos((p) =>
        p.map((ph) =>
          ph.id === id
            ? { ...ph, uploading: false, url: data.publicUrl }
            : ph,
        ),
      );
    }
  }

  async function removePhoto(photo: Photo) {
    setPhotos((p) => p.filter((ph) => ph.id !== photo.id));
    await supabase.storage.from(BUCKET).remove([photo.path]);
  }

  function validateStep(): boolean {
    setStepError(null);
    if (step === 1) {
      if (!brand.trim() || !category || !title.trim() || !condition) {
        setStepError("Please complete all required fields.");
        return false;
      }
      const price = Number(priceRands);
      if (!price || price <= 0) {
        setStepError("Enter a valid asking price.");
        return false;
      }
    }
    if (step === 2) {
      const ready = photos.filter((p) => !p.uploading && !p.error);
      if (photos.some((p) => p.uploading)) {
        setStepError("Please wait for photos to finish uploading.");
        return false;
      }
      if (ready.length < MIN_PHOTOS) {
        setStepError(`Upload at least ${MIN_PHOTOS} photos.`);
        return false;
      }
    }
    if (step === 3 && !method) {
      setStepError("Select an authentication method.");
      return false;
    }
    return true;
  }

  function next() {
    if (validateStep()) setStep((s) => Math.min(4, s + 1));
  }
  function back() {
    setStepError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  async function submit() {
    if (!consent) {
      setStepError("Please confirm you are the rightful owner.");
      return;
    }
    if (!method) return;
    setSubmitting(true);
    setStepError(null);
    const res = await createSubmissionAction({
      brand: brand.trim(),
      category,
      title: title.trim(),
      model: model.trim(),
      description: description.trim(),
      condition,
      priceCents: Math.round(Number(priceRands) * 100),
      year: year ? Number(year) : null,
      method,
      photoPaths: photos.filter((p) => !p.error && p.url).map((p) => p.path),
    });
    setSubmitting(false);
    setResult(res);
  }

  if (result?.ok) {
    return (
      <div className="surface-card mx-auto max-w-[640px] p-12 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-gold/20 text-gold">
          <CheckCircleIcon width={30} height={30} />
        </div>
        <h3 className="mb-3 font-serif text-[28px]">Submission received.</h3>
        <p className="mx-auto mb-6 max-w-[440px] text-[15px] text-ink-muted">
          Your piece has been submitted as <strong>pending review</strong>. Our
          authentication team has been notified and will respond within 3 working
          days.
        </p>
        <div className="mb-7 inline-block rounded-[3px] border border-border-soft bg-bg px-5 py-3 text-sm">
          Reference:{" "}
          <strong className="font-mono">
            DND-{result.id.slice(0, 8).toUpperCase()}
          </strong>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={() => router.push("/seller")}
            className="btn btn-primary"
          >
            View my submissions <ArrowRightIcon width={16} height={16} />
          </button>
          <button
            onClick={() => router.push("/browse")}
            className="btn btn-outline"
          >
            Browse the collection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-card">
      {/* Stepper */}
      <div className="mb-9 flex items-center">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border text-[12px] font-medium ${
                    active
                      ? "border-gold bg-gold text-white"
                      : done
                        ? "border-gold text-gold"
                        : "border-border text-ink-dim"
                  }`}
                >
                  {done ? <CheckIcon width={15} height={15} /> : n}
                </div>
                <span
                  className={`text-[10px] uppercase tracking-[0.16em] ${active ? "text-ink" : "text-ink-dim"}`}
                >
                  {label}
                </span>
              </div>
              {n < STEPS.length && (
                <div
                  className={`mx-2 h-px flex-1 ${done ? "bg-gold" : "bg-border"}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1 — details */}
      {step === 1 && (
        <div className="animate-fadeIn">
          <h3 className="form-section-title">About the piece</h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Maison / Brand" required>
              <input
                className="field-input"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Hermès"
              />
            </Field>
            <Field label="Category" required>
              <select
                className="field-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Choose category</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Item name / title" required>
              <input
                className="field-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Birkin 30"
              />
            </Field>
            <Field label="Model / reference">
              <input
                className="field-input"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. Togo, palladium hardware"
              />
            </Field>
            <Field label="Condition" required>
              <select
                className="field-input"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Year of purchase">
              <input
                type="number"
                className="field-input"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 2022"
                min={1900}
                max={new Date().getFullYear()}
              />
            </Field>
            <Field label="Asking price (R)" required full>
              <input
                type="number"
                className="field-input"
                value={priceRands}
                onChange={(e) => setPriceRands(e.target.value)}
                placeholder="e.g. 285000"
                min={0}
              />
            </Field>
            <Field label="Description" full>
              <textarea
                className="field-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provenance, original receipts, box and dust bag, anything notable…"
              />
            </Field>
          </div>
        </div>
      )}

      {/* Step 2 — photos */}
      {step === 2 && (
        <div className="animate-fadeIn">
          <h3 className="form-section-title">Photographs</h3>
          <p className="mb-5 text-sm text-ink-muted">
            Upload {MIN_PHOTOS}–{MAX_PHOTOS} clear, high-resolution photos —
            front, back, base, hardware, serial/date code, and any flaws.
          </p>
          <label className="relative block cursor-pointer rounded-[3px] border border-dashed border-border bg-bg p-10 text-center transition-colors hover:border-gold">
            <CameraIcon
              width={30}
              height={30}
              className="mx-auto mb-3.5 text-gold"
            />
            <span className="text-sm text-ink-muted">
              Drop or browse images ({photos.length}/{MAX_PHOTOS})
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>

          {photos.length > 0 && (
            <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {photos.map((p) => (
                <div
                  key={p.id}
                  className="group relative aspect-square overflow-hidden rounded-[3px] border border-border-soft bg-deep"
                >
                  {p.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.url}
                      alt={p.name}
                      className="h-full w-full object-cover"
                    />
                  )}
                  {p.uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-bg/80 text-[11px] uppercase tracking-wide text-ink-dim">
                      Uploading…
                    </div>
                  )}
                  {p.error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-bg/90 text-[11px] text-[#e85d5d]">
                      Failed
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(p)}
                    aria-label="Remove photo"
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gold/90 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <CloseIcon width={13} height={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3 — auth method */}
      {step === 3 && (
        <div className="animate-fadeIn">
          <h3 className="form-section-title">Authentication method</h3>
          <p className="mb-5 text-sm text-ink-muted">
            Every piece is authenticated by D&amp;D before it goes live. Choose
            how you&apos;d like yours verified.
          </p>
          <div className="space-y-3">
            {AUTH_METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMethod(m.value)}
                className={`flex w-full items-start gap-4 rounded-[3px] border p-5 text-left transition-all ${
                  method === m.value
                    ? "border-gold bg-bg"
                    : "border-border hover:border-gold/40"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${
                    method === m.value
                      ? "border-gold bg-gold text-white"
                      : "border-border"
                  }`}
                >
                  {method === m.value && <CheckIcon width={12} height={12} />}
                </span>
                <span>
                  <span className="block font-serif text-lg">{m.label}</span>
                  <span className="mt-1 block text-[13.5px] text-ink-muted">
                    {m.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 4 — review */}
      {step === 4 && (
        <div className="animate-fadeIn">
          <h3 className="form-section-title">Review &amp; submit</h3>
          <dl className="divide-y divide-border-soft border-y border-border-soft text-sm">
            <Row label="Brand" value={brand} />
            <Row
              label="Category"
              value={CATEGORIES.find((c) => c.value === category)?.label ?? "—"}
            />
            <Row label="Item" value={title} />
            {model && <Row label="Model" value={model} />}
            <Row label="Condition" value={condition} />
            <Row
              label="Asking price"
              value={`R ${Number(priceRands).toLocaleString("en-ZA")}`}
            />
            {year && <Row label="Year" value={year} />}
            <Row label="Photos" value={`${photos.filter((p) => p.url).length} uploaded`} />
            <Row
              label="Authentication"
              value={AUTH_METHODS.find((m) => m.value === method)?.label ?? "—"}
            />
          </dl>

          <label className="mt-5 flex items-start gap-3 py-2 text-[13px] text-ink-muted">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-4 w-4 flex-shrink-0"
            />
            <span>
              I confirm I am the rightful owner of this piece and accept the{" "}
              <a href="/terms" target="_blank" className="text-gold underline">
                Seller Terms
              </a>{" "}
              and authentication protocol.
            </span>
          </label>
        </div>
      )}

      {stepError && (
        <p className="mt-5 text-[13px] text-[#e85d5d]">{stepError}</p>
      )}
      {result && !result.ok && (
        <p className="mt-5 text-[13px] text-[#e85d5d]">{result.error}</p>
      )}

      {/* Nav */}
      <div className="mt-8 flex items-center justify-between gap-4">
        {step > 1 ? (
          <button type="button" onClick={back} className="btn btn-outline">
            Back
          </button>
        ) : (
          <span />
        )}
        {step < 4 ? (
          <button type="button" onClick={next} className="btn btn-primary">
            Continue <ArrowRightIcon width={16} height={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="btn btn-primary"
          >
            {submitting ? "Submitting…" : "Submit for review"}
            {!submitting && <ArrowRightIcon width={16} height={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <label className="field-label">
        {label}
        {required && <span className="text-gold"> *</span>}
      </label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-3">
      <dt className="text-ink-dim">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
