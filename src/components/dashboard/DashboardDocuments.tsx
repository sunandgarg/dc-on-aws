import { useRef } from "react";
import { useUserDocuments, useUploadDocument, useDeleteDocument, type UserDocument } from "@/hooks/useDashboardData";
import { Upload, Trash2, FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const DOC_TYPES = [
  { key: "class_10", label: "10th Certificate" },
  { key: "class_12", label: "12th Certificate" },
  { key: "aadhaar", label: "Aadhaar Card" },
  { key: "pan", label: "PAN Card" },
];

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export function DashboardDocuments() {
  const { data: documents, isLoading } = useUserDocuments();
  const uploadDoc = useUploadDocument();
  const deleteDoc = useDeleteDocument();
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const getDocForType = (type: string): UserDocument | undefined =>
    documents?.find(d => d.doc_type === type);

  const handleUpload = async (docType: string, file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, and PDF files are allowed");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("File must be less than 2MB");
      return;
    }
    // Delete existing doc of same type first
    const existing = getDocForType(docType);
    if (existing) await deleteDoc.mutateAsync(existing);
    await uploadDoc.mutateAsync({ file, docType });
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground">Securely access your documents anywhere, anytime.</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Upload your documents below. Max 2MB per file. Supported: JPG, PNG, PDF.
            </p>
          </div>
        </div>

        <h4 className="font-semibold text-foreground mb-4">Documents</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {DOC_TYPES.map(dt => {
            const doc = getDocForType(dt.key);
            return (
              <div key={dt.key} className="rounded-xl border border-border bg-muted/30 p-4 flex flex-col items-center gap-3">
                {doc ? (
                  <>
                    <div className="w-full h-24 bg-primary/5 rounded-lg flex items-center justify-center">
                      <FileText className="w-10 h-10 text-primary/50" />
                    </div>
                    <p className="text-sm font-medium text-foreground text-center truncate w-full">{doc.file_name}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        onClick={() => window.open(doc.file_url, "_blank")}
                      >
                        <Eye className="w-3 h-3 mr-1" /> View
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-lg"
                        onClick={() => deleteDoc.mutate(doc)}
                        disabled={deleteDoc.isPending}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => fileRefs.current[dt.key]?.click()}
                      className="w-full h-24 bg-primary/5 hover:bg-primary/10 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer border-2 border-dashed border-primary/20"
                      disabled={uploadDoc.isPending}
                    >
                      <Upload className="w-6 h-6 text-primary/50" />
                      <span className="text-xs text-primary">Upload</span>
                    </button>
                    <input
                      ref={el => { fileRefs.current[dt.key] = el; }}
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(dt.key, file);
                        e.target.value = "";
                      }}
                    />
                  </>
                )}
                <p className="text-sm font-semibold text-foreground">{dt.label}</p>
                <p className="text-xs text-muted-foreground text-center">Max 2MB • JPG, PNG, PDF</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
