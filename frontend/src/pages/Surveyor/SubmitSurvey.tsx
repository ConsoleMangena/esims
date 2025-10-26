import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useEffect, useState } from "react";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import { listProjects, type Project } from "../../lib/projects";
import { createSurvey } from "../../lib/surveys";

export default function SubmitSurvey() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ipfsCid, setIpfsCid] = useState("");
  const [checksum, setChecksum] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>("");
  const [detectedMime, setDetectedMime] = useState<string>("");
  const [detectedExt, setDetectedExt] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await listProjects();
        setProjects(data);
      } catch (e: any) {
        setError("Failed to load projects");
      }
    })();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (!project || !title || !ipfsCid || !checksum) {
      setError("Please fill all required fields");
      return;
    }
    if (file && !category) {
      setError("Please select a category for the attached file");
      return;
    }
    setLoading(true);
    try {
      await createSurvey({
        project: Number(project),
        title,
        description: description || undefined,
        ipfs_cid: ipfsCid,
        checksum_sha256: checksum,
        file: file || undefined,
        file_category: category || undefined,
      });
      setDone(true);
      setTitle("");
      setDescription("");
      setIpfsCid("");
      setChecksum("");
      setProject("");
      setFile(null);
      setCategory("");
      setDetectedMime("");
      setDetectedExt("");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  const CATEGORY_OPTIONS = [
    { value: "drawing_arch", label: "Drawing - Architectural" },
    { value: "drawing_struct", label: "Drawing - Structural" },
    { value: "drawing_mep", label: "Drawing - MEP" },
    { value: "shop_drawing", label: "Shop Drawing" },
    { value: "as_built", label: "As-Built" },
    { value: "specification", label: "Specification" },
    { value: "method_statement", label: "Method Statement" },
    { value: "itp", label: "Inspection & Test Plan (ITP)" },
    { value: "qa_qc_record", label: "QA/QC Record" },
    { value: "geotech_report", label: "Geotechnical Report" },
    { value: "survey_report", label: "Survey Report" },
    { value: "fieldbook", label: "Field Book" },
    { value: "daily_report", label: "Daily Report" },
    { value: "progress_report", label: "Progress Report" },
    { value: "testing_report", label: "Testing/Commissioning Report" },
    { value: "schedule_program", label: "Schedule/Program" },
    { value: "boq_bom", label: "BOQ/Bill of Materials" },
    { value: "rfi", label: "RFI/Correspondence" },
    { value: "submittal", label: "Submittal" },
    { value: "permit_approval", label: "Permit/Approval" },
    { value: "contract", label: "Contract/Agreement" },
    { value: "change_order", label: "Change Order/Variation" },
    { value: "site_instruction", label: "Site Instruction" },
    { value: "inspection_request", label: "Inspection Request" },
    { value: "ncr", label: "Non-Conformance Report (NCR)" },
    { value: "material_certificate", label: "Material Certificate" },
    { value: "safety_hse", label: "Safety/HSE Document" },
    { value: "photo", label: "Photo/Documentation" },
    { value: "gis", label: "GIS/Geospatial" },
    { value: "design_calc", label: "Design Calculation" },
    { value: "payment_certificate", label: "Payment Certificate" },
    { value: "transmittal", label: "Transmittal" },
    { value: "minutes", label: "Minutes of Meeting" },
    { value: "other", label: "Other" },
  ];

  function guessCategoryByExt(ext: string): string {
    const e = ext.toLowerCase();
    if (["dwg", "dxf", "dgn", "rvt", "ifc"].includes(e)) return "drawing_struct";
    if (["jpg", "jpeg", "png", "tif", "tiff", "bmp", "gif", "svg", "webp"].includes(e)) return "photo";
    if (["xls", "xlsx", "csv", "ods"].includes(e)) return "boq_bom";
    if (["shp", "dbf", "prj", "shx", "geojson", "kml", "kmz"].includes(e)) return "gis";
    if (["doc", "docx", "odt", "rtf", "md"].includes(e)) return "survey_report";
    if (["txt"].includes(e)) return "fieldbook"; // heuristic only
    if (["pdf"].includes(e)) return "survey_report";
    return "other";
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) {
      const mime = f.type || "";
      const ext = (f.name.split(".").pop() || "").toLowerCase();
      setDetectedMime(mime);
      setDetectedExt(ext);
      const guessed = guessCategoryByExt(ext);
      setCategory(guessed);
    } else {
      setDetectedMime("");
      setDetectedExt("");
      setCategory("");
    }
  }

  return (
    <>
      <PageMeta
        title="ESIMS - Submit Survey Data"
        description="Upload processed survey files and metadata."
      />
      <PageBreadcrumb pageTitle="Submit Survey Data" />
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03]">
        <form onSubmit={onSubmit} className="space-y-6 max-w-2xl">
          <div>
            <Label>Project <span className="text-error-500">*</span></Label>
            <Select
              options={projects.map((p) => ({ value: String(p.id), label: p.name }))}
              placeholder="Select a project"
              onChange={setProject}
              value={project}
            />
          </div>
          <div>
            <Label>Title <span className="text-error-500">*</span></Label>
            <Input placeholder="Survey title" value={title} onChange={(e)=>setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Input placeholder="Optional description" value={description} onChange={(e)=>setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Attach File</Label>
            <input
              type="file"
              onChange={onFileChange}
              className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200 dark:text-gray-300 dark:file:bg-white/5 dark:file:text-white/90"
              accept="*/*"
            />
            {(detectedMime || detectedExt) && (
              <p className="mt-1.5 text-xs text-gray-500">Detected: {detectedMime || "unknown"} {detectedExt && `(.${detectedExt})`}</p>
            )}
          </div>
          <div className="sm:max-w-xs">
            <Label>File Category {file ? <span className="text-error-500">*</span> : null}</Label>
            <Select
              options={CATEGORY_OPTIONS}
              placeholder="Select category"
              onChange={setCategory}
              value={category}
            />
          </div>
          <div>
            <Label>IPFS CID <span className="text-error-500">*</span></Label>
            <Input placeholder="bafy..." value={ipfsCid} onChange={(e)=>setIpfsCid(e.target.value)} />
          </div>
          <div>
            <Label>Checksum (SHA-256) <span className="text-error-500">*</span></Label>
            <Input placeholder="64-hex sha256" value={checksum} onChange={(e)=>setChecksum(e.target.value)} />
          </div>
          {error && <p className="text-sm text-error-500">{error}</p>}
          {done && <p className="text-sm text-success-500">Submission created.</p>}
          <div>
            <button disabled={loading} type="submit" className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm hover:bg-brand-600 disabled:opacity-50">
              {loading ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
