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
  categoryProcess,
  processVerb,
} from "@/lib/marketplace/constants";
import type { AuthMethod } from "@/lib/supabase/database.types";
import {
  estimatePriceAction,
  type EstimateActionResult,
} from "@/lib/valuation/actions";
import { formatZar } from "@/lib/money";
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
  const [retailRands, setRetailRands] = useState("");
  const [year, setYear] = useState("");
  const [description, setDescription] = useState("");

  // Price estimate ("AI + own comps") — a guidance range, never binding.
  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<EstimateActionResult | null>(null);

  async function handleEstimate() {
    setEstimating(true);
    setEstimate(null);
    const res = await estimatePriceAction({
      brand: brand.trim(),
      category,
      model: model.trim() || undefined,
      condition,
      year: year ? Number(year) : null,
    });
    setEstimate(res);
    setEstimating(false);
  }

  const canEstimate = Boolean(brand.trim() && category && condition);

  // Step 2 — photos
  const [photos, setPhotos] = useState<Photo[]>([]);

  // Step 3 — method
  const [method, setMethod] = useState<AuthMethod | "">("");

  // Step 4 — submit
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  // Process-aware trust copy: jewellery is *evaluated* (appraisal), everything
  // else is *authenticated*. Derived from the single source of truth so the
  // method step, review row and success state all stay consistent.
  const isDouble = category ? categoryProcess(category) === "double" : false;

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    setStepError(null);
    const remaining = MAX_PHOTOS - photos.length;
    const chosen = Array.from(files).slice(0, remaining);

    for (const file of chosen) {
      if (!file.type.startsWith("image/")) {
        // SELL-5: tell the user instead of silently dropping the file (e.g. an
        // iPhone HEIC reporting a non-image MIME) — otherwise they hit the
        // 4-photo minimum with no idea why a photo "vanished".
        setStepError(`"${file.name}" isn't an image and was skipped.`);
        continue;
      }
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
    setResult(null); // SELL-4: clear a stale server-error banner when navigating
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
      setStepError(
        isDouble
          ? "Select an authentication method."
          : "Select a verification method.",
      );
      return false;
    }
    return true;
  }

  function next() {
    if (validateStep()) setStep((s) => Math.min(4, s + 1));
  }
  function back() {
    setStepError(null);
    setResult(null); // SELL-4: clear a stale server-error banner when navigating
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
      retailPriceCents: retailRands.trim()
        ? Math.round(Number(retailRands) * 100)
        : undefined,
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
          Your piece has been submitted as <strong>pending review</strong>. Our{" "}
          {isDouble ? "authentication" : "verification"} team has been notified
          and will respond within 3 working days.
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
              {category && (
                // Process-aware hint: watches/jewellery double-authed in-house,
                // the rest verified online via Entrupy.
                <p className="mt-2 text-[12px] text-ink-dim">
                  {isDouble
                    ? `Watches and jewellery are ${processVerb(category)} in-house by D&D specialists.`
                    : `This piece will be verified online through Entrupy, our authentication partner, before it goes live.`}
                </p>
              )}
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
              {/* Price estimate — AI grounded by comparable D&D pieces. A guide
                  to help sellers price, never a binding offer. */}
              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={handleEstimate}
                  disabled={!canEstimate || estimating}
                  className="btn btn-outline btn-sm"
                >
                  {estimating ? "Estimating…" : "Estimate a fair price"}
                </button>
                {!canEstimate && (
                  <p className="mt-1.5 text-[11.5px] text-ink-dim">
                    Add the brand, category and condition to get an estimate.
                  </p>
                )}
                {estimate && !estimate.ok && (
                  <p className="mt-2 text-[12.5px] text-ink-muted">
                    {estimate.error}
                  </p>
                )}
                {estimate && estimate.ok && (
                  <div className="mt-2.5 rounded-[3px] border border-border-soft bg-surface px-4 py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-dim">
                        Estimated range
                      </span>
                      <span className="font-serif text-[18px] text-ink">
                        {formatZar(estimate.valuation.lowCents)} –{" "}
                        {formatZar(estimate.valuation.highCents)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
                      {estimate.valuation.rationale}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setPriceRands(
                            String(
                              Math.round(
                                (estimate.valuation.lowCents +
                                  estimate.valuation.highCents) /
                                  2 /
                                  100,
                              ),
                            ),
                          )
                        }
                        className="link-underline text-[12px] uppercase tracking-[0.14em] text-ink-muted hover:text-gold"
                      >
                        Use the midpoint
                      </button>
                      <span aria-hidden className="text-border">
                        ·
                      </span>
                      <span className="text-[11px] text-ink-dim">
                        Estimate only — you set the asking price.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Field>
            <Field label="Original retail (R)" full>
              <input
                type="number"
                className="field-input"
                value={retailRands}
                onChange={(e) => setRetailRands(e.target.value)}
                placeholder="e.g. 420000"
                min={0}
              />
              <p className="mt-1.5 text-[12px] text-ink-dim">
                What it cost new — shown as a discount on your listing. Optional.
              </p>
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
              onChange={(e) => {
                // SELL-6: handleFiles copies the FileList synchronously, so
                // reset the input afterwards — otherwise re-selecting the
                // same file (after a remove or failed upload) fires no
                // change event and silently does nothing.
                handleFiles(e.target.files);
                e.target.value = "";
              }}
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

      {/* Step 3 — auth method (process-aware: jewellery is evaluated/appraised,
          everything else is authenticated — copy follows categoryProcess). */}
      {step === 3 && (
        <div className="animate-fadeIn">
          <h3 className="form-section-title">
            {isDouble ? "Authentication method" : "Verification method"}
          </h3>
          <p className="mb-5 text-sm text-ink-muted">
            {isDouble
              ? "Watches and jewellery are double-authenticated in-house by D&D specialists. Choose how you’d like to get yours to us."
              : "This piece is verified online through Entrupy, our authentication partner. Choose how you’d like to get it to us."}
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
              label={isDouble ? "Authentication" : "Verification"}
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
              and {isDouble ? "authentication" : "verification"} protocol.
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
