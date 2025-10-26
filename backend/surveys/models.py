from django.db import models


class Survey(models.Model):
    STATUS_CHOICES = [
        ("submitted", "submitted"),
        ("approved", "approved"),
        ("rejected", "rejected"),
    ]

    FILE_CATEGORY_CHOICES = [
        ("drawing_arch", "Drawing - Architectural"),
        ("drawing_struct", "Drawing - Structural"),
        ("drawing_mep", "Drawing - MEP"),
        ("shop_drawing", "Shop Drawing"),
        ("as_built", "As-Built"),
        ("specification", "Specification"),
        ("method_statement", "Method Statement"),
        ("itp", "Inspection & Test Plan (ITP)"),
        ("qa_qc_record", "QA/QC Record"),
        ("geotech_report", "Geotechnical Report"),
        ("survey_report", "Survey Report"),
        ("fieldbook", "Field Book"),
        ("daily_report", "Daily Report"),
        ("progress_report", "Progress Report"),
        ("testing_report", "Testing/Commissioning Report"),
        ("schedule_program", "Schedule/Program"),
        ("boq_bom", "BOQ/Bill of Materials"),
        ("rfi", "RFI/Correspondence"),
        ("submittal", "Submittal"),
        ("permit_approval", "Permit/Approval"),
        ("contract", "Contract/Agreement"),
        ("change_order", "Change Order/Variation"),
        ("site_instruction", "Site Instruction"),
        ("inspection_request", "Inspection Request"),
        ("ncr", "Non-Conformance Report (NCR)"),
        ("material_certificate", "Material Certificate"),
        ("safety_hse", "Safety/HSE Document"),
        ("photo", "Photo/Documentation"),
        ("gis", "GIS/Geospatial"),
        ("design_calc", "Design Calculation"),
        ("payment_certificate", "Payment Certificate"),
        ("transmittal", "Transmittal"),
        ("minutes", "Minutes of Meeting"),
        ("other", "Other"),
    ]

    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="surveys")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    ipfs_cid = models.CharField(max_length=255)
    checksum_sha256 = models.CharField(max_length=64)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="submitted")
    submitted_by = models.ForeignKey("auth.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="submitted_surveys")
    # Optional file upload and metadata
    file = models.FileField(upload_to="survey_uploads/%Y/%m/%d/", blank=True, null=True)
    recovered_file = models.FileField(upload_to="survey_recovered/%Y/%m/%d/", blank=True, null=True)
    file_category = models.CharField(max_length=32, choices=FILE_CATEGORY_CHOICES, blank=True, null=True)
    file_mime_type = models.CharField(max_length=100, blank=True, null=True)
    file_ext = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Encryption metadata for on-chain encrypted storage (envelope or KDF)
    enc_scheme = models.CharField(max_length=32, default="envelope-aeskw-v1")
    key_version = models.PositiveIntegerField(default=1)
    wrapped_dek_b64 = models.TextField(blank=True, null=True)
    kdf_salt_b64 = models.TextField(blank=True, null=True)
    enc_chunk_size = models.IntegerField(blank=True, null=True)

    def __str__(self) -> str:
        return self.title
