import { supabase } from "./supabaseClient";

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

  return {
    ...profile,
    departments: department,
    manager,
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
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, designation, verifinity_email")
      .eq("id", profile.manager_id)
      .maybeSingle();

    if (error) throw error;
    manager = data;
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

export async function submitMyProfile(userId, payload) {
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      phone: payload.phone || null,
      onboarding_status: "submitted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileError) throw profileError;

  const { error: payrollError } = await supabase
    .from("employee_payroll_details")
    .upsert(
      {
        employee_id: userId,
        bank_account_number: payload.bankAccountNumber || null,
        bank_ifsc: payload.bankIfsc || null,
        bank_name: payload.bankName || null,
        pan_number: payload.panNumber || null,
        aadhaar_number: payload.aadhaarNumber || null,
        uan_number: payload.uanNumber || null,
        pf_number: payload.pfNumber || null,
        date_of_birth: payload.dateOfBirth || null,
        gender: payload.gender || null,
        earlier_epf_member: payload.earlierEpfMember || null,
        earlier_eps_member: payload.earlierEpsMember || null,
        previous_epf_account_number: payload.previousEpfAccountNumber || null,
        father_spouse_name: payload.fatherSpouseName || null,
        marital_status: payload.maritalStatus || null,
        pf_declaration_agreed: Boolean(payload.pfDeclarationAgreed),
        personal_email: payload.personalEmail || null,
        emergency_contact_name: payload.emergencyContactName || null,
        emergency_contact_phone: payload.emergencyContactPhone || null,
        address: payload.address || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "employee_id" },
    );

  if (payrollError) throw payrollError;
}

export async function getMyDocuments(userId) {
  const { data, error } = await supabase
    .from("employee_documents")
    .select("id, document_type, file_name, file_path, uploaded_at, notes")
    .eq("employee_id", userId)
    .order("uploaded_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function uploadMyDocument(userId, documentType, file) {
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${userId}/${documentType}/${Date.now()}-${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from("employee-documents")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data, error: insertError } = await supabase
    .from("employee_documents")
    .insert({
      employee_id: userId,
      document_type: documentType,
      file_name: file.name,
      file_path: filePath,
      storage_bucket: "employee-documents",
      uploaded_by: userId,
    })
    .select()
    .single();

  if (insertError) throw insertError;

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
      notes
    `,
    )
    .eq("employee_id", employeeId)
    .order("uploaded_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

export async function createEmployeeDocumentSignedUrl(filePath) {
  const { data, error } = await supabase.storage
    .from("employee-documents")
    .createSignedUrl(filePath, 60 * 10);

  if (error) throw error;

  return data?.signedUrl;
}

export async function updateEmployeeOnboardingStatus(employeeId, status) {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      onboarding_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", employeeId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function approveEmployeeOnboarding(employeeId) {
  return updateEmployeeOnboardingStatus(employeeId, "approved");
}

export async function rejectEmployeeOnboarding(employeeId) {
  return updateEmployeeOnboardingStatus(employeeId, "rejected");
}

export async function updateEmployeeEmploymentInfo(employeeId, payload) {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      employee_code: payload.employeeCode || null,
      department_id: payload.departmentId || null,
      designation: payload.designation || null,
      manager_id: payload.managerId || null,
      date_of_joining: payload.dateOfJoining || null,
      employment_status: payload.employmentStatus || "active",
      role: payload.role || "employee",
      is_active: Boolean(payload.isActive),
      updated_at: new Date().toISOString(),
    })
    .eq("id", employeeId)
    .select()
    .single();

  if (error) throw error;

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
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .in("onboarding_status", ["pending", "invited", "submitted"]),
    supabase.from("employee_documents").select("employee_id, document_type"),
  ]);

  if (totalEmployeesResult.error) throw totalEmployeesResult.error;
  if (activeEmployeesResult.error) throw activeEmployeesResult.error;
  if (pendingOnboardingResult.error) throw pendingOnboardingResult.error;
  if (documentRowsResult.error) throw documentRowsResult.error;

  const requiredDocumentTypes = [
    "pan_card",
    "aadhaar_card",
    "cancelled_cheque",
  ];
  const documentsByEmployee = new Map();

  for (const document of documentRowsResult.data || []) {
    if (!documentsByEmployee.has(document.employee_id)) {
      documentsByEmployee.set(document.employee_id, new Set());
    }

    documentsByEmployee.get(document.employee_id).add(document.document_type);
  }

  let employeesWithMissingDocuments = 0;

  for (const documentTypes of documentsByEmployee.values()) {
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
      .eq("employee_id", userId),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (payrollResult.error) throw payrollResult.error;
  if (documentsResult.error) throw documentsResult.error;

  const profile = profileResult.data || {};
  const payroll = payrollResult.data || {};

  const requiredDocumentTypes = [
    "pan_card",
    "aadhaar_card",
    "cancelled_cheque",
  ];

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
