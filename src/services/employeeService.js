import { supabase } from "./supabaseClient";
import { recalculateLeaveBalances } from "./leaveService";

export const EMPLOYEE_DOCUMENT_TYPES = [
  { type: "pan_card", label: "PAN Card", required: true },
  { type: "aadhaar_card", label: "Aadhaar Card", required: true },
  { type: "cancelled_cheque", label: "Cancelled Cheque", required: true },
  { type: "uan_pf_document", label: "UAN / PF Document", required: false },
];

const REQUIRED_EMPLOYEE_DOCUMENT_TYPES = EMPLOYEE_DOCUMENT_TYPES.filter(
  (documentType) => documentType.required,
).map((documentType) => documentType.type);

const MAX_ONBOARDING_DOCUMENT_SIZE = 5 * 1024 * 1024;
const ALLOWED_ONBOARDING_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

export async function getEmployees() {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      full_name,
      verifinity_email,
      designation,
      employment_status,
      role,
      onboarding_status,
      onboarding_submitted_at,
      onboarding_reviewed_at,
      onboarding_review_comments,
      is_active
    `,
    )
    .order("full_name");

  if (error) throw error;

  return data || [];
}

export async function getDepartments() {
  const { data, error } = await supabase
    .from("departments")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;

  return data || [];
}

export async function getManagerOptions() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, verifinity_email, designation")
    .eq("is_active", true)
    .order("full_name");

  if (error) throw error;

  return data || [];
}

export async function createEmployeeProfile(payload) {
  const { data, error } = await supabase.rpc("create_employee_profile", {
    p_employee_code: payload.employeeCode || null,
    p_full_name: payload.fullName,
    p_verifinity_email: payload.email,
    p_department_id: payload.departmentId || null,
    p_designation: payload.designation || null,
    p_manager_id: payload.managerId || null,
    p_date_of_joining: payload.dateOfJoining || null,
    p_employment_status: payload.employmentStatus,
    p_role: payload.role,
  });

  if (error) throw error;

  const createdProfile = Array.isArray(data) ? data[0] : data;
  const employeeId =
    typeof createdProfile === "string" ? createdProfile : createdProfile?.id;

  if (employeeId) {
    try {
      await recalculateLeaveBalances(employeeId);
    } catch (balanceError) {
      console.warn(
        "Employee was created, but leave balance recalculation failed:",
        balanceError.message,
      );
    }
  }

  return data;
}

export async function getEmployeeById(employeeId) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      `
      id,
      employee_code,
      full_name,
      verifinity_email,
      phone,
      department_id,
      manager_id,
      designation,
      date_of_joining,
      employment_status,
      role,
      onboarding_status,
      onboarding_submitted_at,
      onboarding_reviewed_at,
      onboarding_reviewed_by,
      onboarding_review_comments,
      is_active
    `,
    )
    .eq("id", employeeId)
    .maybeSingle();

  if (profileError) throw profileError;

  if (!profile) {
    throw new Error("Employee profile not found.");
  }

  let department = null;
  let manager = null;

  if (profile.department_id) {
    const { data, error } = await supabase
      .from("departments")
      .select("id, name")
      .eq("id", profile.department_id)
      .maybeSingle();

    if (error) throw error;
    department = data;
  }

  if (profile.manager_id) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, verifinity_email, designation")
      .eq("id", profile.manager_id)
      .maybeSingle();

    if (error) throw error;
    manager = data;
  }

  const { data: payrollDetails, error: payrollError } = await supabase
    .from("employee_payroll_details")
    .select(
      `
      bank_account_number,
      bank_ifsc,
      bank_name,
      pan_number,
      aadhaar_number,
      uan_number,
      pf_number,
      date_of_birth,
      gender,
      earlier_epf_member,
      earlier_eps_member,
      previous_epf_account_number,
      father_spouse_name,
      marital_status,
      pf_declaration_agreed,
      personal_email,
      emergency_contact_name,
      emergency_contact_phone,
      address
    `,
    )
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (payrollError) throw payrollError;

  return {
    ...profile,
    departments: department,
    manager,
    payroll_details: payrollDetails,
  };
}

export async function getMyProfileBundle(userId) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      `
      id,
      employee_code,
      full_name,
      verifinity_email,
      phone,
      department_id,
      manager_id,
      designation,
      date_of_joining,
      employment_status,
      role,
      onboarding_status,
      onboarding_submitted_at,
      onboarding_reviewed_at,
      onboarding_review_comments,
      is_active
    `,
    )
    .eq("id", userId)
    .maybeSingle();

  if (profileError) throw profileError;

  if (!profile) {
    throw new Error("Employee profile not found.");
  }

  let department = null;
  let manager = null;

  if (profile.department_id) {
    const { data, error } = await supabase
      .from("departments")
      .select("id, name")
      .eq("id", profile.department_id)
      .maybeSingle();

    if (error) throw error;
    department = data;
  }

  if (profile.manager_id) {
    const { data, error } = await supabase.rpc("get_basic_profile_by_id", {
      p_profile_id: profile.manager_id,
    });

    if (error) throw error;
    manager = Array.isArray(data) ? data[0] || null : data;
  }

  const { data: payroll, error: payrollError } = await supabase
    .from("employee_payroll_details")
    .select(
      `
      bank_account_number,
      bank_ifsc,
      bank_name,
      pan_number,
      aadhaar_number,
      uan_number,
      pf_number,
      date_of_birth,
      gender,
      earlier_epf_member,
      earlier_eps_member,
      previous_epf_account_number,
      father_spouse_name,
      marital_status,
      pf_declaration_agreed,
      personal_email,
      emergency_contact_name,
      emergency_contact_phone,
      address
    `,
    )
    .eq("employee_id", userId)
    .maybeSingle();

  if (payrollError) throw payrollError;

  return {
    profile: {
      ...profile,
      departments: department,
      manager,
    },
    payroll,
  };
}

export async function submitMyProfile(_userId, payload) {
  const { data, error } = await supabase.rpc("submit_employee_onboarding", {
    p_phone: payload.phone,
    p_personal_email: payload.personalEmail,
    p_bank_account_number: payload.bankAccountNumber,
    p_bank_ifsc: payload.bankIfsc,
    p_bank_name: payload.bankName,
    p_pan_number: payload.panNumber,
    p_aadhaar_number: payload.aadhaarNumber,
    p_uan_number: payload.uanNumber || null,
    p_pf_number: payload.pfNumber || null,
    p_date_of_birth: payload.dateOfBirth || null,
    p_gender: payload.gender || null,
    p_earlier_epf_member: payload.earlierEpfMember || null,
    p_earlier_eps_member: payload.earlierEpsMember || null,
    p_previous_epf_account_number:
      payload.previousEpfAccountNumber || null,
    p_father_spouse_name: payload.fatherSpouseName || null,
    p_marital_status: payload.maritalStatus || null,
    p_pf_declaration_agreed: Boolean(payload.pfDeclarationAgreed),
    p_emergency_contact_name: payload.emergencyContactName,
    p_emergency_contact_phone: payload.emergencyContactPhone,
    p_address: payload.address,
  });

  if (error) throw error;

  return data;
}

export async function getMyDocuments(userId) {
  const { data, error } = await supabase
    .from("employee_documents")
    .select(
      "id, document_type, file_name, file_path, uploaded_at, notes, is_current",
    )
    .eq("employee_id", userId)
    .eq("is_current", true)
    .order("uploaded_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function uploadMyDocument(userId, documentType, file) {
  if (!EMPLOYEE_DOCUMENT_TYPES.some((item) => item.type === documentType)) {
    throw new Error("Unsupported document type.");
  }

  if (!ALLOWED_ONBOARDING_DOCUMENT_TYPES.has(file.type)) {
    throw new Error("Upload a PDF, JPG, or PNG file.");
  }

  if (file.size > MAX_ONBOARDING_DOCUMENT_SIZE) {
    throw new Error("Document size must be 5 MB or less.");
  }

  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${userId}/${documentType}/${Date.now()}-${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from("employee-documents")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data, error: registrationError } = await supabase.rpc(
    "register_employee_onboarding_document",
    {
      p_document_type: documentType,
      p_file_name: file.name,
      p_file_path: filePath,
      p_storage_bucket: "employee-documents",
    },
  );

  if (registrationError) {
    await supabase.storage.from("employee-documents").remove([filePath]);
    throw registrationError;
  }

  return data;
}

export async function getEmployeeDocuments(employeeId) {
  const { data, error } = await supabase
    .from("employee_documents")
    .select(
      `
      id,
      employee_id,
      document_type,
      file_name,
      file_path,
      storage_bucket,
      uploaded_at,
      notes,
      is_current
    `,
    )
    .eq("employee_id", employeeId)
    .eq("is_current", true)
    .order("uploaded_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export function hasRequiredEmployeeDocuments(documents = []) {
  const uploaded = new Set(documents.map((doc) => doc.document_type));

  return {
    complete: REQUIRED_EMPLOYEE_DOCUMENT_TYPES.every((type) =>
      uploaded.has(type),
    ),
    missing: REQUIRED_EMPLOYEE_DOCUMENT_TYPES.filter(
      (type) => !uploaded.has(type),
    ),
  };
}

export async function createEmployeeDocumentSignedUrl(filePath) {
  const { data, error } = await supabase.storage
    .from("employee-documents")
    .createSignedUrl(filePath, 60 * 10);

  if (error) throw error;

  return data?.signedUrl;
}

export async function approveEmployeeOnboarding(employeeId, comments = "") {
  const { data, error } = await supabase.rpc("review_employee_onboarding", {
    p_employee_id: employeeId,
    p_action: "approve",
    p_comments: comments,
  });

  if (error) throw error;

  return data;
}

export async function requestEmployeeOnboardingChanges(employeeId, comments) {
  const { data, error } = await supabase.rpc("review_employee_onboarding", {
    p_employee_id: employeeId,
    p_action: "request_changes",
    p_comments: comments,
  });

  if (error) throw error;

  return data;
}

export async function getEmployeeOnboardingHistory(employeeId) {
  const { data, error } = await supabase
    .from("onboarding_review_history")
    .select(
      `
      id,
      action,
      previous_status,
      new_status,
      comments,
      created_at,
      acted_by,
      actor:profiles!onboarding_review_history_acted_by_fkey(full_name)
    `,
    )
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function updateEmployeeEmploymentInfo(employeeId, payload) {
  const { data, error } = await supabase.rpc(
    "update_employee_employment_info",
    {
      p_employee_id: employeeId,
      p_employee_code: payload.employeeCode || null,
      p_department_id: payload.departmentId || null,
      p_designation: payload.designation || null,
      p_manager_id: payload.managerId || null,
      p_date_of_joining: payload.dateOfJoining || null,
      p_employment_status: payload.employmentStatus || "active",
      p_role: payload.role || "employee",
      p_is_active: Boolean(payload.isActive),
    },
  );

  if (error) throw error;

  try {
    await recalculateLeaveBalances(employeeId);
  } catch (balanceError) {
    console.warn(
      "Employment information was saved, but leave balance recalculation failed:",
      balanceError.message,
    );
  }

  return data;
}

export async function getAdminDashboardStats() {
  const [
    totalEmployeesResult,
    activeEmployeesResult,
    pendingOnboardingResult,
    documentRowsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact" })
      .eq("is_active", true),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("onboarding_status", "submitted"),
    supabase
      .from("employee_documents")
      .select("employee_id, document_type")
      .eq("is_current", true),
  ]);

  if (totalEmployeesResult.error) throw totalEmployeesResult.error;
  if (activeEmployeesResult.error) throw activeEmployeesResult.error;
  if (pendingOnboardingResult.error) throw pendingOnboardingResult.error;
  if (documentRowsResult.error) throw documentRowsResult.error;

  const requiredDocumentTypes = REQUIRED_EMPLOYEE_DOCUMENT_TYPES;

  const documentsByEmployee = new Map();

  for (const document of documentRowsResult.data || []) {
    if (!documentsByEmployee.has(document.employee_id)) {
      documentsByEmployee.set(document.employee_id, new Set());
    }

    documentsByEmployee.get(document.employee_id).add(document.document_type);
  }

  let employeesWithMissingDocuments = 0;

  for (const employee of activeEmployeesResult.data || []) {
    const documentTypes =
      documentsByEmployee.get(employee.id) || new Set();
    const hasAllRequired = requiredDocumentTypes.every((type) =>
      documentTypes.has(type),
    );

    if (!hasAllRequired) {
      employeesWithMissingDocuments += 1;
    }
  }

  return {
    totalEmployees: totalEmployeesResult.count || 0,
    activeEmployees: activeEmployeesResult.count || 0,
    pendingOnboarding: pendingOnboardingResult.count || 0,
    employeesWithMissingDocuments,
  };
}

export async function getEmployeeDashboardStats(userId) {
  const [profileResult, payrollResult, documentsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "phone, onboarding_status, date_of_joining, designation, manager_id",
      )
      .eq("id", userId)
      .maybeSingle(),

    supabase
      .from("employee_payroll_details")
      .select("pan_number, aadhaar_number, personal_email")
      .eq("employee_id", userId)
      .maybeSingle(),

    supabase
      .from("employee_documents")
      .select("document_type")
      .eq("employee_id", userId)
      .eq("is_current", true),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (payrollResult.error) throw payrollResult.error;
  if (documentsResult.error) throw documentsResult.error;

  const profile = profileResult.data || {};
  const payroll = payrollResult.data || {};

  const requiredDocumentTypes = REQUIRED_EMPLOYEE_DOCUMENT_TYPES;

  const uploadedTypes = new Set(
    (documentsResult.data || []).map((document) => document.document_type),
  );

  const uploadedRequiredCount = requiredDocumentTypes.filter((type) =>
    uploadedTypes.has(type),
  ).length;

  let profileCompletion = 0;

  if (profile.phone) profileCompletion += 20;
  if (payroll.personal_email) profileCompletion += 20;
  if (payroll.pan_number) profileCompletion += 20;
  if (payroll.aadhaar_number) profileCompletion += 20;
  if (
    profile.onboarding_status === "submitted" ||
    profile.onboarding_status === "changes_requested" ||
    profile.onboarding_status === "approved"
  ) {
    profileCompletion += 20;
  }

  return {
    profileCompletion,
    uploadedRequiredCount,
    requiredDocumentCount: requiredDocumentTypes.length,
    onboardingStatus: profile.onboarding_status || "invited",
    dateOfJoining: profile.date_of_joining,
    designation: profile.designation,
    managerId: profile.manager_id,
  };
}

export async function getAllDepartments() {
  const { data, error } = await supabase
    .from("departments")
    .select("id, name, is_active, created_at")
    .order("name");

  if (error) throw error;

  return data || [];
}

export async function createDepartment(name) {
  const cleanedName = name.trim();

  const { data, error } = await supabase
    .from("departments")
    .insert({
      name: cleanedName,
      is_active: true,
    })
    .select("id, name, is_active, created_at");

  if (error) throw error;

  return (
    data?.[0] || {
      id: crypto.randomUUID(),
      name: cleanedName,
      is_active: true,
      created_at: new Date().toISOString(),
    }
  );
}

export async function updateDepartment(departmentId, payload) {
  const cleanedName = payload.name.trim();

  const { error } = await supabase
    .from("departments")
    .update({
      name: cleanedName,
      is_active: payload.isActive,
    })
    .eq("id", departmentId);

  if (error) throw error;

  return {
    id: departmentId,
    name: cleanedName,
    is_active: payload.isActive,
  };
}

export async function deactivateDepartment(departmentId) {
  const { error } = await supabase
    .from("departments")
    .update({ is_active: false })
    .eq("id", departmentId);

  if (error) throw error;

  return {
    id: departmentId,
    is_active: false,
  };
}

export async function reactivateDepartment(departmentId) {
  const { error } = await supabase
    .from("departments")
    .update({ is_active: true })
    .eq("id", departmentId);

  if (error) throw error;

  return {
    id: departmentId,
    is_active: true,
  };
}
