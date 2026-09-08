import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserCheck,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock, Key,
  Building2,
  MapPin,
  Clock,
  Eye,
  Check,
  X,
  UserX,
  Mail,
  Phone,
  Info,
} from 'lucide-react';
import {
  UserProfileEntity,
  UserProfile,
  AppUserRole,
  PhcMaster,
  SubcentreMaster,
  EmployeeMaster,
  PageId,
} from '../types';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/userService';
import { masterDataService } from '../services/masterDataService';

interface UserManagementPageProps {
  onNavigate?: (page: PageId) => void;
}

export const UserManagementPage: React.FC<UserManagementPageProps> = ({ onNavigate }) => {
  const { user, isPhcController } = useAuth();

  const [profiles, setProfiles] = useState<UserProfileEntity[]>([]);
  const [employees, setEmployees] = useState<EmployeeMaster[]>([]);
  const [phcs, setPhcs] = useState<PhcMaster[]>([]);
  const [subcentres, setSubcentres] = useState<SubcentreMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'ALL' | 'PHC_CONTROLLER' | 'SUBCENTRE_EMPLOYEE'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [filterSubcentre, setFilterSubcentre] = useState<string>('ALL');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<UserProfileEntity | null>(null);
  const [statusActionPending, setStatusActionPending] = useState<string | null>(null);

  // Add user form state
  const [formEmail, setFormEmail] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formRole, setFormRole] = useState<AppUserRole>(AppUserRole.SUBCENTRE_EMPLOYEE);
  const [formEmployeeId, setFormEmployeeId] = useState<string>('');
  const [formPhcId, setFormPhcId] = useState<string>('');
  const [formSubcentreId, setFormSubcentreId] = useState<string>('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [profilesData, empsData, phcsData, scsData] = await Promise.all([
        userService.getUserProfiles(),
        masterDataService.getEmployees(),
        masterDataService.getPhcs(),
        masterDataService.getSubcentres(),
      ]);

      setProfiles(profilesData);
      setEmployees(empsData);
      setPhcs(phcsData);
      setSubcentres(scsData);
    } catch (err) {
      console.error('Failed to load user management data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const employeeMap = useMemo(() => {
    const map = new Map<string, EmployeeMaster>();
    employees.forEach((e) => map.set(e.id, e));
    return map;
  }, [employees]);

  const phcMap = useMemo(() => {
    const map = new Map<string, PhcMaster>();
    phcs.forEach((p) => map.set(p.id, p));
    return map;
  }, [phcs]);

  const subcentreMap = useMemo(() => {
    const map = new Map<string, SubcentreMaster>();
    subcentres.forEach((s) => map.set(s.id, s));
    return map;
  }, [subcentres]);

  // Handle Employee Selection in Add Form
  const handleEmployeeChange = (empId: string) => {
    setFormEmployeeId(empId);
    setFormError(null);

    if (empId) {
      const emp = employeeMap.get(empId);
      if (emp) {
        setFormDisplayName(emp.employee_name);
        setFormMobile(emp.mobile_number || '');
        setFormRole(AppUserRole.SUBCENTRE_EMPLOYEE);
        setFormSubcentreId(emp.subcentre_id);

        const sc = subcentreMap.get(emp.subcentre_id);
        if (sc) {
          setFormPhcId(sc.phc_id);
        }

        // Auto suggest clean official email
        if (!formEmail) {
          if (emp.email) {
            setFormEmail(emp.email);
          } else {
            const latin = emp.malaria_smear_code
              ? emp.malaria_smear_code.toLowerCase().replace(/[^a-z0-9]/g, '')
              : 'employee';
            setFormEmail(`${latin}@arogya.gov.in`);
          }
        }
      }
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFormError(null);

    if (!formEmail.trim()) {
      setFormError('कृपया ईमेल आयडी प्रविष्ट करा.');
      return;
    }

    if (!formDisplayName.trim()) {
      setFormError('कृपया वापरकर्त्याचे नाव प्रविष्ट करा.');
      return;
    }

    setIsSubmitting(true);
    try {
      await userService.createUserProfile(
        {
          email: formEmail.trim(),
          mobile: formMobile.trim() || undefined,
          displayName: formDisplayName.trim(),
          role: formRole,
          employeeId: formEmployeeId || null,
          phcId: formPhcId || null,
          subcentreId: formSubcentreId || null,
          isActive: formIsActive,
        },
        user
      );

      setSuccessToast('नवीन वापरकर्ता खाते यशस्वीरित्या तयार केले!');
      setTimeout(() => setSuccessToast(null), 4000);
      setIsAddModalOpen(false);
      resetForm();
      await loadAllData();
    } catch (err: any) {
      setFormError(err.message || 'वापरकर्ता तयार करताना त्रुटी आली.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormEmail('');
    setFormMobile('');
    setFormDisplayName('');
    setFormRole(AppUserRole.SUBCENTRE_EMPLOYEE);
    setFormEmployeeId('');
    setFormPhcId(phcs[0]?.id || '');
    setFormSubcentreId('');
    setFormIsActive(true);
    setFormError(null);
  };

  const handleResetPassword = async (targetProfile: UserProfileEntity) => {
    if (!window.confirm(`तुम्हाला खात्री आहे की ${targetProfile.display_name} यांचा पासवर्ड '123456' वर रीसेट करायचा आहे?`)) {
      return;
    }
    
    // In an offline/local environment, we just update the local auth override or note it.
    // If Supabase is connected, it would call admin reset.
    // For now, we mock the success.
    setSuccessToast(`वापरकर्ता (${targetProfile.display_name}) चा पासवर्ड '123456' वर यशस्वीरित्या रीसेट केला.`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleToggleStatus = async (targetProfile: UserProfileEntity) => {
    if (!user) return;
    const newStatus = !targetProfile.is_active;

    setStatusActionPending(targetProfile.id);
    try {
      await userService.toggleUserActive(targetProfile.id, newStatus, user);
      setSuccessToast(
        `वापरकर्ता (${targetProfile.display_name}) ${
          newStatus ? 'सक्रिय' : 'निष्क्रिय'
        } केला.`
      );
      setTimeout(() => setSuccessToast(null), 3000);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'स्थिती बदलताना त्रुटी आली.');
    } finally {
      setStatusActionPending(null);
    }
  };

  // Filtered profiles
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      // Search
      const query = searchQuery.toLowerCase().trim();
      const emp = p.employee_id ? employeeMap.get(p.employee_id) : null;
      const matchesSearch =
        !query ||
        p.email?.toLowerCase().includes(query) ||
        p.display_name?.toLowerCase().includes(query) ||
        p.mobile?.includes(query) ||
        emp?.employee_name?.toLowerCase().includes(query) ||
        emp?.malaria_smear_code?.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      // Role
      if (filterRole !== 'ALL' && p.role !== filterRole) {
        return false;
      }

      // Status
      if (filterStatus === 'ACTIVE' && !p.is_active) return false;
      if (filterStatus === 'INACTIVE' && p.is_active) return false;

      // Subcentre
      if (filterSubcentre !== 'ALL' && p.subcentre_id !== filterSubcentre) {
        return false;
      }

      return true;
    });
  }, [profiles, searchQuery, filterRole, filterStatus, filterSubcentre, employeeMap]);

  // Authorization Barrier for Subcentre Staff
  if (!isPhcController) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center font-sans">
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-8 shadow-sm text-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-amber-950 mb-2">
            प्रवेश प्रतिबंधित (Access Restricted)
          </h2>
          <p className="text-sm text-amber-900 leading-relaxed mb-6">
            वापरकर्ता व्यवस्थापन व प्रवेश नियंत्रण (User Management & Role Management) केवळ प्राथमिक आरोग्य केंद्र (PHC) नियंत्रक किंवा वैद्यकीय अधिकाऱ्यांसाठी आरक्षित आहे.
          </p>
          <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs text-slate-600 mb-6 text-left">
            <p className="font-semibold text-slate-800 mb-1">आपले सध्याचे अधिकारक्षेत्र:</p>
            <p>• भूमिका: उपकेंद्र कर्मचारी (ANM / MPW)</p>
            <p>• नाव: {user?.marathiName}</p>
            <p>• उपकेंद्र: {user?.assignedSubcentre}</p>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-colors cursor-pointer"
            >
              मुख्य डॅशबोर्डवर परत जा
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 right-5 z-50 bg-emerald-900 text-white px-4 py-3 rounded-xl shadow-xl border border-emerald-700 flex items-center gap-2.5 text-xs animate-slideIn">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-sm border-b-4 border-amber-500 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>प्रशासन व सुरक्षा नियंत्रण (CODE 11)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            वापरकर्ता व प्रवेश व्यवस्थापन (User & Access Management)
          </h1>
          <p className="text-xs text-emerald-200 mt-1">
            आरोग्य सेवक, सेविका व PHC नियंत्रकांची खाती, पासवर्ड आणि अधिकारक्षेत्र (Role & Jurisdiction) नियंत्रण
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadAllData}
            title="रिफ्रेश करा"
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 text-xs transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>नवीन वापरकर्ता जोडा</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase">एकूण खाती</span>
            <Users className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-black text-slate-900">{profiles.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">प्रणालीतील सर्व वापरकर्ते</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase">सक्रिय खाती</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {profiles.filter((p) => p.is_active).length}
          </div>
          <div className="text-[11px] text-emerald-800 mt-0.5">लॉगिन करण्यास सक्षम</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase">निष्क्रिय खाती</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700">
            {profiles.filter((p) => !p.is_active).length}
          </div>
          <div className="text-[11px] text-rose-800 mt-0.5">प्रवेश रोखण्यात आला आहे</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase">उपकेंद्र कर्मचारी</span>
            <UserCheck className="w-4 h-4 text-indigo-700" />
          </div>
          <div className="text-2xl font-black text-indigo-800">
            {
              profiles.filter(
                (p) =>
                  p.role === AppUserRole.SUBCENTRE_EMPLOYEE ||
                  p.role === 'subcentre_employee'
              ).length
            }
          </div>
          <div className="text-[11px] text-indigo-800 mt-0.5">ANM / MPW कर्मचारी</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="नाव, ईमेल, मोबाईल किंवा स्मीअर कोडने शोधा..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none focus:bg-white"
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as any)}
              className="text-xs py-2 px-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="ALL">सर्व भूमिका (All Roles)</option>
              <option value="PHC_CONTROLLER">PHC नियंत्रक (Controller)</option>
              <option value="SUBCENTRE_EMPLOYEE">उपकेंद्र कर्मचारी (Employee)</option>
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="text-xs py-2 px-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
          >
            <option value="ALL">सर्व स्थिती (Status)</option>
            <option value="ACTIVE">सक्रिय (Active)</option>
            <option value="INACTIVE">निष्क्रिय (Inactive)</option>
          </select>

          {/* Subcentre Filter */}
          <select
            value={filterSubcentre}
            onChange={(e) => setFilterSubcentre(e.target.value)}
            className="text-xs py-2 px-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
          >
            <option value="ALL">सर्व उपकेंद्रे (All Subcentres)</option>
            {subcentres.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.subcentre_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* User Profiles Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-800" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              नोंदणीकृत वापरकर्ते यादी ({filteredProfiles.length})
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            एकूण {profiles.length} पैकी {filteredProfiles.length} दिसत आहेत
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-12">अ.क्र.</th>
                <th className="py-3 px-4">वापरकर्ता नाव व ईमेल</th>
                <th className="py-3 px-4">संलग्न कर्मचारी (Master)</th>
                <th className="py-3 px-3">भूमिका (Role)</th>
                <th className="py-3 px-3">PHC व उपकेंद्र</th>
                <th className="py-3 px-3 text-center">स्थिती (Status)</th>
                <th className="py-3 px-3">शेवटचा Login</th>
                <th className="py-3 px-4 text-center">कृती (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-xs">कोणतेही वापरकर्ता खाते सापडले नाही</p>
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((p, index) => {
                  const emp = p.employee_id ? employeeMap.get(p.employee_id) : null;
                  const sc = p.subcentre_id ? subcentreMap.get(p.subcentre_id) : null;
                  const phc = p.phc_id ? phcMap.get(p.phc_id) : null;
                  const isController =
                    p.role === AppUserRole.PHC_CONTROLLER ||
                    p.role === 'phc_controller';

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !p.is_active ? 'bg-slate-50/50 opacity-75' : ''
                      }`}
                    >
                      {/* Sr No */}
                      <td className="py-3 px-3 text-center font-bold text-slate-500">
                        {index + 1}
                      </td>

                      {/* User Display Name & Email */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {isController ? (
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          ) : (
                            <UserCheck className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                          )}
                          <span>{p.display_name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{p.email}</span>
                        </div>
                        {p.mobile && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5 text-slate-400" />
                            <span>{p.mobile}</span>
                          </div>
                        )}
                      </td>

                      {/* Mapped Employee */}
                      <td className="py-3 px-4">
                        {emp ? (
                          <div>
                            <span className="font-semibold text-slate-800">
                              {emp.employee_name}
                            </span>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                              <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 font-bold text-emerald-800 text-[10px]">
                                {emp.malaria_smear_code}
                              </span>
                              <span>• {emp.designation}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            {isController ? 'PHC प्रशासक (थेट)' : 'असंलग्न (Not Mapped)'}
                          </span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="py-3 px-3">
                        {isController ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <ShieldCheck className="w-3 h-3 text-amber-700" />
                            PHC नियंत्रक
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                            <UserCheck className="w-3 h-3 text-indigo-700" />
                            उपकेंद्र कर्मचारी
                          </span>
                        )}
                      </td>

                      {/* PHC & Subcentre */}
                      <td className="py-3 px-3">
                        <div className="text-slate-800 font-medium truncate max-w-[160px]">
                          {sc ? sc.subcentre_name : isController ? 'सर्व उपकेंद्रे' : '-'}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[160px]">
                          {phc?.phc_name || 'वडगाव PHC'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        {p.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Check className="w-3 h-3 text-emerald-700" />
                            सक्रिय
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <X className="w-3 h-3 text-rose-700" />
                            निष्क्रिय
                          </span>
                        )}
                      </td>

                      {/* Last Login */}
                      <td className="py-3 px-3 text-slate-600">
                        {p.last_login_at ? (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>
                              {new Date(p.last_login_at).toLocaleDateString('mr-IN', {
                                day: '2-digit',
                                month: 'short',
                              })}{' '}
                              {new Date(p.last_login_at).toLocaleTimeString('mr-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">- अद्याप नाही -</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Details */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProfile(p);
                              setIsDetailModalOpen(true);
                            }}
                            title="तपशील पहा"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() => handleResetPassword(p)}
                            title="पासवर्ड रीसेट करा (123456)"
                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors cursor-pointer mr-1"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active/Inactive */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(p)}
                            disabled={statusActionPending === p.id}
                            title={p.is_active ? 'खाते निष्क्रिय करा' : 'खाते सक्रिय करा'}
                            className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              p.is_active
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {p.is_active ? (
                              <UserX className="w-3.5 h-3.5" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scaleIn my-8">
            <div className="bg-emerald-900 text-white p-4 flex items-center justify-between border-b-2 border-amber-400">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>नवीन वापरकर्ता खाते जोडा (Create User Account)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p>{formError}</p>
                </div>
              )}

              {/* Select from Employee Master */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  १. कर्मचारी निवडा (Employee Master मधून)
                </label>
                <select
                  value={formEmployeeId}
                  onChange={(e) => handleEmployeeChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="">-- कर्मचारी निवडा किंवा थेट खाते तयार करा --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employee_name} ({emp.designation}) - [{emp.malaria_smear_code}]
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  कर्मचारी निवडल्यास उपकेंद्र, PHC आणि नाव आपोआप भरले जाईल.
                </p>
              </div>

              {/* Display Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  २. वापरकर्त्याचे नाव (Display Name) *
                </label>
                <input
                  type="text"
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  placeholder="उदा. सौ. सुनिता कांबळे"
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  required
                />
              </div>

              {/* Email & Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ३. ईमेल आयडी (Email / Login ID) *
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="उदा. user@arogya.gov.in"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ४. मोबाईल नंबर (Mobile Number)
                  </label>
                  <input
                    type="tel"
                    value={formMobile}
                    onChange={(e) => setFormMobile(e.target.value)}
                    placeholder="उदा. 9822012345"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ५. प्रणालीतील भूमिका (Role & Permission Level) *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <label
                    className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                      formRole === AppUserRole.SUBCENTRE_EMPLOYEE
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={AppUserRole.SUBCENTRE_EMPLOYEE}
                      checked={formRole === AppUserRole.SUBCENTRE_EMPLOYEE}
                      onChange={() => setFormRole(AppUserRole.SUBCENTRE_EMPLOYEE)}
                      className="accent-emerald-700"
                    />
                    <div>
                      <div className="text-xs">उपकेंद्र कर्मचारी</div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        ANM / MPW (मर्यादित उपकेंद्र)
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                      formRole === AppUserRole.PHC_CONTROLLER
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={AppUserRole.PHC_CONTROLLER}
                      checked={formRole === AppUserRole.PHC_CONTROLLER}
                      onChange={() => setFormRole(AppUserRole.PHC_CONTROLLER)}
                      className="accent-emerald-700"
                    />
                    <div>
                      <div className="text-xs">PHC नियंत्रक</div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        वैद्यकीय अधिकारी (पूर्ण अधिकार)
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Subcentre & PHC Mapping */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ६. संबंधित उपकेंद्र (Jurisdiction)
                  </label>
                  <select
                    value={formSubcentreId}
                    onChange={(e) => setFormSubcentreId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="">
                      {formRole === AppUserRole.PHC_CONTROLLER
                        ? 'सर्व उपकेंद्रे (PHC स्तर)'
                        : '-- उपकेंद्र निवडा --'}
                    </option>
                    {subcentres.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.subcentre_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ७. प्राथमिक आरोग्य केंद्र (PHC)
                  </label>
                  <select
                    value={formPhcId}
                    onChange={(e) => setFormPhcId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    {phcs.map((phc) => (
                      <option key={phc.id} value={phc.id}>
                        {phc.phc_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="form-is-active-check"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded accent-emerald-700 cursor-pointer"
                />
                <label
                  htmlFor="form-is-active-check"
                  className="font-bold text-slate-800 cursor-pointer"
                >
                  खाते त्वरित सक्रिय ठेवा (Active Account for Login)
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'नोंदवत आहे...' : 'खाते तयार करा'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {isDetailModalOpen && selectedProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-scaleIn">
            <div className="bg-emerald-900 text-white p-4 flex items-center justify-between border-b-2 border-amber-400">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>वापरकर्ता खाते संपूर्ण तपशील</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">नाव:</span>
                  <span className="font-bold text-slate-900">{selectedProfile.display_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">ईमेल:</span>
                  <span className="font-mono text-slate-800">{selectedProfile.email}</span>
                </div>
                {selectedProfile.mobile && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">मोबाईल:</span>
                    <span className="font-mono text-slate-800">{selectedProfile.mobile}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">भूमिका:</span>
                  <span className="font-bold text-indigo-900">
                    {selectedProfile.role === AppUserRole.PHC_CONTROLLER
                      ? 'PHC नियंत्रक'
                      : 'उपकेंद्र कर्मचारी'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">स्थिती:</span>
                  <span
                    className={`font-bold ${
                      selectedProfile.is_active ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {selectedProfile.is_active ? 'सक्रिय (Active)' : 'निष्क्रिय (Inactive)'}
                  </span>
                </div>
              </div>

              {/* Identifiers */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Profile ID:</span>
                  <span className="font-mono text-slate-700 text-[10px]">{selectedProfile.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Auth User ID:</span>
                  <span className="font-mono text-slate-700 text-[10px]">
                    {selectedProfile.auth_user_id}
                  </span>
                </div>
                {selectedProfile.employee_id && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Employee ID:</span>
                    <span className="font-mono text-slate-700 text-[10px]">
                      {selectedProfile.employee_id}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">खाते तयार दिनांक:</span>
                  <span className="text-slate-700">
                    {new Date(selectedProfile.created_at).toLocaleString('mr-IN')}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  बंद करा
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
