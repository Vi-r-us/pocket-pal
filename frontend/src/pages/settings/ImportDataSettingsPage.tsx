import { useMemo, useRef, useState, type ChangeEvent } from "react"
import { CheckCircle2, FileUp, ListChecks, MapPinned, Upload } from "lucide-react"
import { Panel } from "@/components/layout/Panel"
import { SettingsSectionShell } from "@/components/settings/SettingsSectionShell"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { getInlineErrorMessage } from "@/lib/errors/normalize"
import type {
  ApiSuccess,
  ImportCommitRequest,
  ImportCommitResponse,
  ImportParseResponse,
  ImportType,
} from "@/types/import"

type StepKey = "source" | "upload" | "mapping" | "review"

const STEP_ORDER: StepKey[] = ["source", "upload", "mapping", "review"]

const IMPORT_TYPE_OPTIONS: Array<{ value: ImportType; label: string; description: string }> = [
  {
    value: "transactions",
    label: "Transactions",
    description: "Import transaction history with account and category mapping.",
  },
  {
    value: "accounts",
    label: "Accounts",
    description: "Create accounts with type, currency, and opening balances.",
  },
  {
    value: "budgets",
    label: "Budgets",
    description: "Import monthly category budgets using YYYYMM format.", 
  },
  {
    value: "categories",
    label: "Categories",
    description: "Create category records with type and icon mapping.",
  },
]

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "")

export const ImportDataSettingsPage = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [step, setStep] = useState<StepKey>("source")
  const [importType, setImportType] = useState<ImportType | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<ImportParseResponse | null>(null)
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({})
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [parseError, setParseError] = useState("")
  const [commitError, setCommitError] = useState("")
  const [commitResult, setCommitResult] = useState<ImportCommitResponse | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const stepIndex = STEP_ORDER.indexOf(step)
  const requiredFields = useMemo(() => parseResult?.requiredFields ?? [], [parseResult])
  const optionalFields = useMemo(() => parseResult?.optionalFields ?? [], [parseResult])
  const allFields = useMemo(() => [...requiredFields, ...optionalFields], [requiredFields, optionalFields])

  const hasAllRequiredMappings = useMemo(
    () => requiredFields.every((field) => fieldMapping[field.key]),
    [requiredFields, fieldMapping],
  )

  const mappedPreviewRows = useMemo(() => {
    if (!parseResult) return []
    return parseResult.sampleRows.slice(0, 10).map((row) => {
      const mappedRow: Record<string, string> = {}
      allFields.forEach((field) => {
        const sourceColumn = fieldMapping[field.key]
        mappedRow[field.key] = sourceColumn ? row[sourceColumn] ?? "" : ""
      })
      return mappedRow
    })
  }, [parseResult, allFields, fieldMapping])

  const getAutoMappings = (result: ImportParseResponse) => {
    const automaticMapping: Record<string, string> = {}
    const sourceByNormalized = new Map(
      result.sourceColumns.map((column) => [normalizeKey(column), column]),
    )

    ;[...result.requiredFields, ...result.optionalFields].forEach((field) => {
      const matched = sourceByNormalized.get(normalizeKey(field.key))
      if (matched) {
        automaticMapping[field.key] = matched
      }
    })

    return automaticMapping
  }

  const handleSelectType = (value: ImportType) => {
    setImportType(value)
    setSelectedFile(null)
    setParseResult(null)
    setFieldMapping({})
    setParseError("")
    setCommitError("")
    setCommitResult(null)
  }

  const handlePickFile = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)
    setParseResult(null)
    setFieldMapping({})
    setParseError("")
    setCommitError("")
    setCommitResult(null)
  }

  const handleParseFile = async () => {
    if (!importType || !selectedFile) return
    setIsParsing(true)
    setParseError("")
    setCommitResult(null)

    const formData = new FormData()
    formData.append("importType", importType)
    formData.append("file", selectedFile)

    try {
      const response = await api.post<ApiSuccess<ImportParseResponse>>("/import/parse", formData)
      const result = response.data
      setParseResult(result)
      setFieldMapping(getAutoMappings(result))
      setStep("mapping")
    } catch (error) {
      setParseError(getInlineErrorMessage(error, "Could not parse file. Please check format and try again."))
    } finally {
      setIsParsing(false)
    }
  }

  const handleCommitImport = async () => {
    if (!parseResult || !importType) return
    if (!hasAllRequiredMappings) {
      setCommitError("Please map all required fields before importing.")
      return
    }

    setIsImporting(true)
    setCommitError("")

    const payload: ImportCommitRequest = {
      sessionToken: parseResult.sessionToken,
      importType,
      fieldMapping: Object.fromEntries(
        Object.entries(fieldMapping).filter(([, sourceColumn]) => Boolean(sourceColumn)),
      ),
      options: { skipDuplicates },
    }

    try {
      const response = await api.post<ApiSuccess<ImportCommitResponse>>("/import/commit", payload)
      setCommitResult(response.data)
    } catch (error) {
      setCommitError(getInlineErrorMessage(error, "Import failed. Please fix errors and retry."))
    } finally {
      setIsImporting(false)
    }
  }

  const goToNextStep = () => {
    if (step === "source" && importType) {
      setStep("upload")
      return
    }
    if (step === "upload" && parseResult) {
      setStep("mapping")
      return
    }
    if (step === "mapping" && hasAllRequiredMappings) {
      setStep("review")
    }
  }

  const goToPreviousStep = () => {
    const previous = STEP_ORDER[stepIndex - 1]
    if (previous) {
      setStep(previous)
    }
  }

  return (
    <SettingsSectionShell
      title="Import Data"
      description="Import accounts, transactions, categories, or budgets from Excel, CSV, or JSON files."
      main={
        <div className="space-y-6">
          <Panel
            title="Import progress"
            description="Complete each step to validate your file and send data to backend services."
          >
            <ol className="grid grid-cols-1 gap-2 md:grid-cols-4">
              {STEP_ORDER.map((key, index) => {
                const active = key === step
                const done = index < stepIndex
                return (
                  <li
                    key={key}
                    className={[
                      "rounded-lg border px-3 py-2 text-xs md:text-sm",
                      active ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground",
                      done ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "",
                    ].join(" ")}
                  >
                    <span className="font-medium capitalize">{index + 1}. {key}</span>
                  </li>
                )
              })}
            </ol>
          </Panel>

          {step === "source" ? (
            <Panel title="Step 1 · Select source type" description="Choose which entity you want to import.">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {IMPORT_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelectType(option.value)}
                    className={[
                      "rounded-lg border p-4 text-left transition-colors",
                      importType === option.value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-muted/60",
                    ].join(" ")}
                  >
                    <p className="font-medium text-sm">{option.label}</p>
                    <p className="mt-1 text-muted-foreground text-xs">{option.description}</p>
                  </button>
                ))}
              </div>
            </Panel>
          ) : null}

          {step === "upload" ? (
            <Panel title="Step 2 · Upload file" description="Supported formats: .xlsx, .csv, .json">
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.json"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                  <p className="text-sm">{selectedFile ? selectedFile.name : "No file selected"}</p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    {selectedFile ? `${Math.max(1, Math.round(selectedFile.size / 1024))} KB` : "Choose your import file"}
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <Button type="button" variant="outline" onClick={handlePickFile}>
                      <FileUp className="size-4" aria-hidden />
                      Choose file
                    </Button>
                    <Button type="button" onClick={() => void handleParseFile()} disabled={!selectedFile || isParsing}>
                      <Upload className="size-4" aria-hidden />
                      {isParsing ? "Parsing..." : "Parse file"}
                    </Button>
                  </div>
                </div>

                {parseError ? <p className="text-destructive text-sm">{parseError}</p> : null}
              </div>
            </Panel>
          ) : null}

          {step === "mapping" ? (
            <Panel title="Step 3 · Map fields" description="Map each PocketPal field to a source column from your file.">
              {parseResult ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {allFields.map((field) => (
                      <label key={field.key} className="space-y-1.5">
                        <span className="block text-sm">
                          {field.label}
                          {requiredFields.some((requiredField) => requiredField.key === field.key) ? (
                            <span className="ml-1 text-destructive">*</span>
                          ) : null}
                        </span>
                        <select
                          value={fieldMapping[field.key] ?? ""}
                          onChange={(event) =>
                            setFieldMapping((prev) => ({ ...prev, [field.key]: event.target.value }))
                          }
                          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="">Not mapped</option>
                          {parseResult.sourceColumns.map((column) => (
                            <option key={column} value={column}>
                              {column}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                  {!hasAllRequiredMappings ? (
                    <p className="text-amber-600 text-sm">Map all required fields to continue.</p>
                  ) : null}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Upload and parse a file before mapping fields.</p>
              )}
            </Panel>
          ) : null}

          {step === "review" ? (
            <Panel title="Step 4 · Review & import" description="Review mapped sample rows and submit import to backend.">
              {parseResult ? (
                <div className="space-y-4">
                  <div className="rounded-lg border">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            {allFields.map((field) => (
                              <th key={field.key} className="px-3 py-2 text-left font-medium">
                                {field.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {mappedPreviewRows.map((row, index) => (
                            <tr key={index} className="border-t">
                              {allFields.map((field) => (
                                <td key={field.key} className="px-3 py-2 text-muted-foreground">
                                  {row[field.key] || "-"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={skipDuplicates}
                      onChange={(event) => setSkipDuplicates(event.target.checked)}
                    />
                    Skip duplicates when supported
                  </label>

                  <Button type="button" onClick={() => void handleCommitImport()} disabled={isImporting}>
                    {isImporting ? "Importing..." : "Review & Import"}
                  </Button>

                  {commitError ? <p className="text-destructive text-sm">{commitError}</p> : null}
                  {commitResult ? (
                    <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
                      <p className="font-medium">Import complete</p>
                      <p className="mt-1 text-muted-foreground">
                        Imported: {commitResult.importedRows}, Skipped: {commitResult.skippedRows}, Failed:{" "}
                        {commitResult.failedRows}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No parsed file found. Return to upload step.</p>
              )}
            </Panel>
          ) : null}

          <div className="flex flex-wrap justify-between gap-2">
            <Button type="button" variant="outline" onClick={goToPreviousStep} disabled={stepIndex === 0}>
              Back
            </Button>
            <Button
              type="button"
              onClick={goToNextStep}
              disabled={
                (step === "source" && !importType) ||
                (step === "upload" && !parseResult) ||
                (step === "mapping" && !hasAllRequiredMappings) ||
                step === "review"
              }
            >
              Continue
            </Button>
          </div>
        </div>
      }
      aside={
        <div className="space-y-4">
          <Panel title="Checklist" description="Before you import">
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2 text-muted-foreground">
                <ListChecks className="mt-0.5 size-4" aria-hidden />
                Keep headers in row 1 and avoid merged cells.
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <MapPinned className="mt-0.5 size-4" aria-hidden />
                Map all required fields in Step 3.
              </li>
              <li className="flex items-start gap-2 text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-4" aria-hidden />
                Review sample rows before committing import.
              </li>
            </ul>
          </Panel>
          {parseResult ? (
            <Panel title="Parsed file summary" description="Current upload preview">
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Rows detected</dt>
                  <dd className="font-medium">{parseResult.totalRows}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Columns detected</dt>
                  <dd className="font-medium">{parseResult.sourceColumns.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Import type</dt>
                  <dd className="font-medium capitalize">{parseResult.importType}</dd>
                </div>
              </dl>
            </Panel>
          ) : null}
        </div>
      }
    />
  )
}
