"use client"

import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  DownloadIcon,
  FileKeyIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react"
import { useId, useRef, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function BoltzRecoveryFileInput({
  fileName,
  error,
  disabled = false,
  onFileChange,
  onClear,
}: {
  fileName?: string
  error?: string
  disabled?: boolean
  onFileChange: (file: File) => void
  onClear: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  function clear() {
    if (inputRef.current) inputRef.current.value = ""
    onClear()
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="application/json,.json,image/png,image/jpeg"
        disabled={disabled}
        className="peer sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onFileChange(file)
        }}
      />
      <label
        htmlFor={inputId}
        className={cn(
          "flex min-h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary px-11 py-2 text-xs text-muted-foreground outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:cursor-not-allowed peer-disabled:opacity-50 hover:border-primary/60",
          fileName && !error && "border-solid text-foreground",
          error &&
            "border-solid border-destructive/60 bg-destructive/10 text-destructive"
        )}
      >
        <FileKeyIcon className="size-4 shrink-0" />
        <span className="truncate">
          {error ?? fileName ?? "Choose recovery key file"}
        </span>
      </label>
      {fileName || error ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={disabled}
          onClick={clear}
          className="absolute top-1/2 right-2 -translate-y-1/2"
          aria-label="Clear recovery key file"
        >
          <XIcon />
        </Button>
      ) : null}
    </div>
  )
}

type RecoveryStep = "download" | "verify" | "checking" | "complete" | "error"

export function BoltzRecoveryKeyFlow({
  onDownload,
  onVerify,
}: {
  onDownload: () => void | Promise<void>
  onVerify: (file: File) => boolean | Promise<boolean>
}) {
  const [step, setStep] = useState<RecoveryStep>("download")
  const [fileName, setFileName] = useState<string>()

  async function download() {
    await onDownload()
    setStep("verify")
  }

  async function verify(file: File) {
    setFileName(file.name)
    setStep("checking")
    try {
      setStep((await onVerify(file)) ? "complete" : "error")
    } catch {
      setStep("error")
    }
  }

  function retry() {
    setFileName(undefined)
    setStep("download")
  }

  return (
    <section
      className="rounded-xl border border-border bg-card p-4"
      aria-labelledby="boltz-recovery-title"
    >
      <h3
        id="boltz-recovery-title"
        className="text-sm font-semibold text-foreground"
      >
        {step === "complete"
          ? "Recovery key verified"
          : "Back up your recovery key"}
      </h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        This key is required to recover funds if the swap cannot finish
        automatically. Bazaar never stores it.
      </p>

      {step === "download" ? (
        <div className="mt-4 space-y-3">
          <Alert>
            <AlertTriangleIcon />
            <AlertTitle>Store it separately</AlertTitle>
            <AlertDescription>
              Anyone with this file may be able to recover the associated funds.
            </AlertDescription>
          </Alert>
          <Button className="w-full" onClick={download}>
            <DownloadIcon /> Download recovery key
          </Button>
        </div>
      ) : null}

      {step === "verify" || step === "checking" || step === "error" ? (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-semibold text-foreground">
            Verify the downloaded file before funding.
          </p>
          <BoltzRecoveryFileInput
            fileName={fileName}
            error={
              step === "error"
                ? "This file does not match the recovery key."
                : undefined
            }
            disabled={step === "checking"}
            onFileChange={verify}
            onClear={() => {
              setFileName(undefined)
              setStep("verify")
            }}
          />
          {step === "checking" ? (
            <p
              className="flex items-center gap-2 text-xs text-muted-foreground"
              role="status"
            >
              <LoaderCircleIcon className="size-4 animate-spin motion-reduce:animate-none" />{" "}
              Checking locally…
            </p>
          ) : null}
          {step === "error" ? (
            <Button variant="outline" className="w-full" onClick={retry}>
              <RotateCcwIcon /> Download a new key
            </Button>
          ) : null}
        </div>
      ) : null}

      {step === "complete" ? (
        <div
          className="mt-4 flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-3 text-xs text-foreground"
          role="status"
        >
          <CheckCircle2Icon className="size-4 text-primary" /> Verified locally.
          You can continue safely.
        </div>
      ) : null}
    </section>
  )
}
