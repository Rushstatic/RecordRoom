import {
  PhcMaster,
  SubcentreMaster,
  VillageMaster,
  EmployeeMaster,
  MalariaBloodSample,
  ValidationIssue,
  ValidationSeverity,
  CategoryValidationSummary,
  PhcQualitySummary,
  PageId,
} from '../types';

export interface ValidationDataset {
  phcs: PhcMaster[];
  subcentres: SubcentreMaster[];
  villages: VillageMaster[];
  employees: EmployeeMaster[];
  samples: MalariaBloodSample[];
}

export interface ValidationResult {
  issues: ValidationIssue[];
  categorySummaries: CategoryValidationSummary[];
  phcSummaries: PhcQualitySummary[];
  totalCheckedRecords: number;
  recordsNeedingAttentionCount: number;
  validRecordsCount: number;
  qualityScore: number;
  qualityRating: {
    text: string;
    color: string;
    bgColor: string;
    borderColor: string;
  };
}

export const validationService = {
  /**
   * Run full validation suite against master data and malaria blood samples
   */
  validateAll(dataset: ValidationDataset): ValidationResult {
    const { phcs, subcentres, villages, employees, samples } = dataset;
    const issues: ValidationIssue[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    // Maps for fast O(1) lookup
    const phcMap = new Map<string, PhcMaster>();
    phcs.forEach((p) => phcMap.set(p.id, p));

    const subcentreMap = new Map<string, SubcentreMaster>();
    subcentres.forEach((s) => subcentreMap.set(s.id, s));

    const villageMap = new Map<string, VillageMaster>();
    villages.forEach((v) => villageMap.set(v.id, v));

    const employeeMap = new Map<string, EmployeeMaster>();
    employees.forEach((e) => employeeMap.set(e.id, e));

    // Unique records set that have at least one issue
    const recordsWithIssues = new Set<string>();

    const addIssue = (issue: ValidationIssue) => {
      issues.push(issue);
      recordsWithIssues.add(issue.recordId);
    };

    // =========================================================================
    // 1. PHC MASTER VALIDATION
    // =========================================================================
    const phcNameSeen = new Map<string, string[]>(); // trimmed-lower -> list of phc ids
    phcs.forEach((p) => {
      const trimmed = (p.phc_name || '').trim().toLowerCase();
      if (trimmed) {
        const list = phcNameSeen.get(trimmed) || [];
        list.push(p.id);
        phcNameSeen.set(trimmed, list);
      }
    });

    phcs.forEach((p) => {
      const pName = (p.phc_name || '').trim();
      const pDate = p.created_at ? p.created_at.split('T')[0] : todayStr;

      // 1.1 Empty PHC Name
      if (!pName) {
        addIssue({
          id: `phc-empty-name-${p.id}`,
          module: 'PHC',
          categoryMarathi: 'प्रा.आ. केंद्र मास्टर',
          recordId: p.id,
          recordIdentifier: `PHC ID: ${p.id.slice(0, 8)}`,
          issueText: 'प्राथमिक आरोग्य केंद्राचे नाव रिक्त आहे (PHC Name is empty).',
          severity: 'त्रुटी',
          severityEn: 'error',
          date: pDate,
          targetPage: 'phc-master',
          tableName: 'phc_master',
          fieldName: 'phc_name',
          fieldLabelMarathi: 'PHC नाव',
          currentValue: '',
          suggestedFix: 'योग्य व अधिकृत प्राथमिक आरोग्य केंद्राचे नाव भरा.',
          canCorrect: true,
          correctionType: 'text',
          phcId: p.id,
          phcName: 'रिक्त PHC',
        });
      }

      // 1.2 Duplicate PHC Name
      const sameNameList = phcNameSeen.get(pName.toLowerCase()) || [];
      if (sameNameList.length > 1) {
        addIssue({
          id: `phc-duplicate-name-${p.id}`,
          module: 'PHC',
          categoryMarathi: 'प्रा.आ. केंद्र मास्टर',
          recordId: p.id,
          recordIdentifier: pName,
          issueText: `डुप्लिकेट PHC नाव: '${pName}' या नावाचे एकापेक्षा जास्त प्राथमिक आरोग्य केंद्र अस्तित्वात आहेत.`,
          severity: 'त्रुटी',
          severityEn: 'error',
          date: pDate,
          targetPage: 'phc-master',
          tableName: 'phc_master',
          fieldName: 'phc_name',
          fieldLabelMarathi: 'PHC नाव',
          currentValue: pName,
          suggestedFix: 'नावात विशिष्टता ठेवा (उदा. तालुका किंवा गाव जोडून).',
          canCorrect: true,
          correctionType: 'text',
          phcId: p.id,
          phcName: pName,
        });
      }

      // 1.3 Subcentres relation check
      const associatedSubcentres = subcentres.filter((s) => s.phc_id === p.id);
      if (associatedSubcentres.length === 0) {
        addIssue({
          id: `phc-no-subcentres-${p.id}`,
          module: 'PHC',
          categoryMarathi: 'प्रा.आ. केंद्र मास्टर',
          recordId: p.id,
          recordIdentifier: pName || 'PHC',
          issueText: 'या प्राथमिक आरोग्य केंद्राच्या अंतर्गत एकही उपकेंद्र जोडलेले नाही.',
          severity: 'सूचना',
          severityEn: 'warning',
          date: pDate,
          targetPage: 'subcentre-master',
          tableName: 'phc_master',
          phcId: p.id,
          phcName: pName,
        });
      }
    });

    // =========================================================================
    // 2. SUBCENTRE MASTER VALIDATION & ORPHAN CHECK
    // =========================================================================
    const subcentreNameSeen = new Map<string, string[]>(); // phcId + '_' + subName -> list of ids
    subcentres.forEach((s) => {
      const key = `${s.phc_id || 'no_phc'}_${(s.subcentre_name || '').trim().toLowerCase()}`;
      const list = subcentreNameSeen.get(key) || [];
      list.push(s.id);
      subcentreNameSeen.set(key, list);
    });

    subcentres.forEach((s) => {
      const sName = (s.subcentre_name || '').trim();
      const sDate = s.created_at ? s.created_at.split('T')[0] : todayStr;
      const parentPhc = s.phc_id ? phcMap.get(s.phc_id) : undefined;

      // 2.1 Empty Name
      if (!sName) {
        addIssue({
          id: `sub-empty-name-${s.id}`,
          module: 'Subcentre',
          categoryMarathi: 'उपकेंद्र मास्टर',
          recordId: s.id,
          recordIdentifier: `Subcentre ID: ${s.id.slice(0, 8)}`,
          issueText: 'उपकेंद्राचे नाव रिक्त आहे (Subcentre name is empty).',
          severity: 'त्रुटी',
          severityEn: 'error',
          date: sDate,
          targetPage: 'subcentre-master',
          tableName: 'subcentre_master',
          fieldName: 'subcentre_name',
          fieldLabelMarathi: 'उपकेंद्र नाव',
          currentValue: '',
          suggestedFix: 'उपकेंद्राचे अधिकृत नाव प्रविष्ट करा.',
          canCorrect: true,
          correctionType: 'text',
          subcentreId: s.id,
          phcId: s.phc_id,
          phcName: parentPhc?.phc_name,
        });
      }

      // 2.2 Missing PHC Reference (Orphan)
      if (!s.phc_id) {
        addIssue({
          id: `sub-missing-phc-${s.id}`,
          module: 'Orphan Records',
          categoryMarathi: 'Orphan Records (अनाथ नोंद)',
          recordId: s.id,
          recordIdentifier: sName || `Subcentre ${s.id.slice(0, 8)}`,
          issueText: 'उपकेंद्राला PHC संदर्भ (phc_id) जोडलेला नाही (Subcentre without PHC).',
          severity: 'त्रुटी',
          severityEn: 'error',
          date: sDate,
          targetPage: 'subcentre-master',
          tableName: 'subcentre_master',
          fieldName: 'phc_id',
          fieldLabelMarathi: 'प्रा.आ. केंद्र निवडा',
          suggestedFix: 'उपकेंद्राला योग्य प्राथमिक आरोग्य केंद्राशी जोडा.',
          canCorrect: phcs.length > 0,
          correctionType: 'select',
          allowedOptions: phcs.map((p) => ({ label: p.phc_name, value: p.id })),
          subcentreId: s.id,
          subcentreName: sName,
        });
      } else if (!parentPhc) {
        // Invalid PHC Reference (Parent does not exist)
        addIssue({
          id: `sub-invalid-phc-${s.id}`,
          module: 'Orphan Records',
          categoryMarathi: 'Orphan Records (अनाथ नोंद)',
          recordId: s.id,
          recordIdentifier: sName || `Subcentre ${s.id.slice(0, 8)}`,
          issueText: `अस्तित्वात नसलेल्या PHC कडे संदर्भ (Invalid PHC ID: ${s.phc_id.slice(0, 8)}...).`,
          severity: 'त्रुटी',
          severityEn: 'error',
          date: sDate,
          targetPage: 'subcentre-master',
          tableName: 'subcentre_master',
          fieldName: 'phc_id',
          fieldLabelMarathi: 'प्रा.आ. केंद्र निवडा',
          suggestedFix: 'उपकेंद्राचा PHC संदर्भ दुरुस्त करा.',
          canCorrect: phcs.length > 0,
          correctionType: 'select',
          allowedOptions: phcs.map((p) => ({ label: p.phc_name, value: p.id })),
          subcentreId: s.id,
          subcentreName: sName,
        });
      }

      // 2.3 Duplicate Subcentre in same PHC
      const dupKey = `${s.phc_id || 'no_phc'}_${sName.toLowerCase()}`;
      const sameSubList = subcentreNameSeen.get(dupKey) || [];
      if (sameSubList.length > 1 && sName) {
        addIssue({
          id: `sub-duplicate-name-${s.id}`,
          module: 'Subcentre',
          categoryMarathi: 'उपकेंद्र मास्टर',
          recordId: s.id,
          recordIdentifier: sName,
          issueText: `एकाच PHC अंतर्गत '${sName}' हे उपकेंद्र डुप्लिकेट नोंदवले आहे.`,
          severity: 'त्रुटी',
          severityEn: 'error',
          date: sDate,
          targetPage: 'subcentre-master',
          tableName: 'subcentre_master',
          fieldName: 'subcentre_name',
          fieldLabelMarathi: 'उपकेंद्र नाव',
          currentValue: sName,
          suggestedFix: 'उपकेंद्र नावाची पुनरावृत्ती टाळा.',
          canCorrect: true,
          correctionType: 'text',
          subcentreId: s.id,
          subcentreName: sName,
          phcId: s.phc_id,
          phcName: parentPhc?.phc_name,
        });
      }

      // 2.4 Village connection check
      const subVillages = villages.filter((v) => v.subcentre_id === s.id);
      if (subVillages.length === 0) {
        addIssue({
          id: `sub-no-villages-${s.id}`,
          module: 'Subcentre',
          categoryMarathi: 'उपकेंद्र मास्टर',
          recordId: s.id,
          recordIdentifier: sName || 'उपकेंद्र',
          issueText: 'या उपकेंद्राच्या अंतर्गत कोणतेही गाव नोंदवलेले नाही.',
          severity: 'सूचना',
          severityEn: 'warning',
          date: sDate,
          targetPage: 'village-master',
          tableName: 'subcentre_master',
          subcentreId: s.id,
          subcentreName: sName,
          phcId: s.phc_id,
          phcName: parentPhc?.phc_name,
        });
      }
    });

    // =========================================================================
    // 3. VILLAGE MASTER VALIDATION & ORPHAN CHECK
    // =========================================================================
    const villageNameSeen = new Map<string, string[]>(); // subId + '_' + vilName
    villages.forEach((v) => {
      const key = `${v.subcentre_id || 'no_sub'}_${(v.village_name || '').trim().toLowerCase()}`;
      const list = villageNameSeen.get(key) || [];
      list.push(v.id);
      villageNameSeen.set(key, list);
    });

    villages.forEach((v) => {
      const vName = (v.village_name || '').trim();
      const vDate = v.created_at ? v.created_at.split('T')[0] : todayStr;
      const parentSub = v.subcentre_id ? subcentreMap.get(v.subcentre_id) : undefined;
      const parentPhc = parentSub?.phc_id ? phcMap.get(parentSub.phc_id) : undefined;

      // 3.1 Empty Village Name
      if (!vName) {
        addIssue({
          id: `vil-empty-name-${v.id}`,
          module: 'Village',
          categoryMarathi: 'गाव मास्टर',
          recordId: v.id,
          recordIdentifier: `Village ID: ${v.id.slice(0, 8)}`,
          issueText: 'गावाचे नाव रिक्त आहे (Village name is empty).',
          severity: 'त्रुटी',
          severityEn: 'error',
          date: vDate,
          targetPage: 'village-master',
          tableName: 'village_master',
          fieldName: 'village_name',
          fieldLabelMarathi: 'गावाचे नाव',
          currentValue: '',
          suggestedFix: 'गावाचे अधिकृत नाव नोंदवा.',
          canCorrect: true,
          correctionType: 'text',
          villageId: v.id,
          subcentreId: v.subcentre_id,
          subcentreName: parentSub?.subcentre_name,
          phcId: parentSub?.phc_id,
          phcName: parentPhc?.phc_name,
        });
      }

      // 3.2 Missing Subcentre Reference (Orphan Village)
      if (!v.subcentre_id) {
        addIssue({
          id: `vil-missing-sub-${v.id}`,
          module: 'Orphan Records',
          categoryMarathi: 'Orphan Records (अनाथ नोंद)',
          recordId: v.id,
          recordIdentifier: vName || `Village ${v.id.slice(0, 8)}`,
          issueText: 'गावाला उपकेंद्र संदर्भ जोडलेला नाही (Village without Subcentre).',
          severity: 'त्रुटी',
          severityEn: 'error',
          date: vDate,
          targetPage: 'village-master',
          tableName: 'village_master',
          fieldName: 'subcentre_id',
          fieldLabelMarathi: 'उपकेंद्र निवडा',
          suggestedFix: 'गावाला संबंधित उपकेंद्राशी जोडा.',
          canCorrect: subcentres.length > 0,
          correctionType: 'select',
          allowedOptions: subcentres.map((s) => ({ label: s.subcentre_name, value: s.id })),
          villageId: v.id,
          villageName: vName,
        });
      } else if (!parentSub) {
        // Invalid Subcentre Reference
        addIssue({
          id: `vil-invalid-sub-${v.id}`,
          module: 'Orphan Records',
          categoryMarathi: 'Orphan Records (अनाथ नोंद)',
          recordId: v.id,
          recordIdentifier: vName || `Village ${v.id.slice(0, 8)}`,
          issueText: `अस्तित्वात नसलेल्या उपकेंद्राकडे संदर्भ (Invalid Subcentre ID: ${v.subcentre_id.slice(0, 8)}...).`,
          severity: 'त्रुटी',
          severityEn: 'error',
          date: vDate,
          targetPage: 'village-master',
          tableName: 'village_master',
          fieldName: 'subcentre_id',
          fieldLabelMarathi: 'उपकेंद्र निवडा',
          suggestedFix: 'गावाचा उपकेंद्र संदर्भ दुरुस्त करा.',
          canCorrect: subcentres.length > 0,
          correctionType: 'select',
          allowedOptions: subcentres.map((s) => ({ label: s.subcentre_name, value: s.id })),
          villageId: v.id,
          villageName: vName,
        });
      }

      // 3.3 Duplicate Village under same Subcentre
      const dupKey = `${v.subcentre_id || 'no_sub'}_${vName.toLowerCase()}`;
      const sameVilList = villageNameSeen.get(dupKey) || [];
      if (sameVilList.length > 1 && vName) {
        addIssue({
          id: `vil-duplicate-name-${v.id}`,
          module: 'Village',
          categoryMarathi: 'गाव मास्टर',
          recordId: v.id,
          recordIdentifier: vName,
          issueText: `एकाच उपकेंद्रात '${vName}' हे गाव डुप्लिकेट नोंदवले आहे.`,
          severity: 'त्रुटी',
          severityEn: 'error',
          date: vDate,
          targetPage: 'village-master',
          tableName: 'village_master',
          fieldName: 'village_name',
          fieldLabelMarathi: 'गावाचे नाव',
          currentValue: vName,
          suggestedFix: 'गावाचे नाव तपासून दुरुस्त करा.',
          canCorrect: true,
          correctionType: 'text',
          villageId: v.id,
          villageName: vName,
          subcentreId: v.subcentre_id,
          subcentreName: parentSub?.subcentre_name,
          phcId: parentSub?.phc_id,
          phcName: parentPhc?.phc_name,
        });
      }

      // 3.4 Population Checks
      const pop = Number(v.population);
      if (isNaN(pop) || pop < 0) {
        addIssue({
          id: `vil-pop-negative-${v.id}`,
          module: 'Village',
          categoryMarathi: 'गाव मास्टर',
          recordId: v.id,
          recordIdentifier: vName,
          issueText: `लोकसंख्या ऋण (Negative: ${v.population}) असू शकत नाही.`,
          severity: 'त्रुटी',
          severityEn: 'error',
          date: vDate,
          targetPage: 'village-master',
          tableName: 'village_master',
          fieldName: 'population',
          fieldLabelMarathi: 'गावाची लोकसंख्या',
          currentValue: v.population,
          suggestedFix: 'योग्य लोकसंख्या प्रविष्ट करा (>= 0).',
          canCorrect: true,
          correctionType: 'number',
          villageId: v.id,
          villageName: vName,
          subcentreId: v.subcentre_id,
          subcentreName: parentSub?.subcentre_name,
          phcId: parentSub?.phc_id,
          phcName: parentPhc?.phc_name,
        });
      } else if (pop === 0 || v.population === null || v.population === undefined) {
        // Warning only per instructions!
        addIssue({
          id: `vil-pop-zero-${v.id}`,
          module: 'Village',
          categoryMarathi: 'गाव मास्टर',
          recordId: v.id,
          recordIdentifier: vName,
          issueText: 'गावाची लोकसंख्या ० किंवा रिक्त नोंदवली आहे (Population is 0 or unrecorded).',
          severity: 'सूचना',
          severityEn: 'warning',
          date: vDate,
          targetPage: 'village-master',
          tableName: 'village_master',
          fieldName: 'population',
          fieldLabelMarathi: 'गावाची लोकसंख्या',
          currentValue: v.population || 0,
          suggestedFix: 'अधिकृत लोकसंख्या प्रविष्ट करा.',
          canCorrect: true,
          correctionType: 'number',
          villageId: v.id,
          villageName: vName,
          subcentreId: v.subcentre_id,
          subcentreName: parentSub?.subcentre_name,
          phcId: parentSub?.phc_id,
          phcName: parentPhc?.phc_name,
        });
      }

      // 3.5 Total Houses Checks
      const houses = Number(v.total_houses);
      if (isNaN(houses) || houses < 0) {
        addIssue({
          id: `vil-houses-negative-${v.id}`,
          module: 'Village',
          categoryMarathi: 'गाव मास्टर',
          recordId: v.id,
          recordIdentifier: vName,
          issueText: `एकूण घरे संख्या ऋण (Negative: ${v.total_houses}) असू शकत नाही.`,
          severity: 'त्रुटी',
          severityEn: 'error',
          date: vDate,
          targetPage: 'village-master',
          tableName: 'village_master',
          fieldName: 'total_houses',
          fieldLabelMarathi: 'एकूण घरे',
          currentValue: v.total_houses,
          suggestedFix: 'घरांची संख्या >= 0 नोंदवा.',
          canCorrect: true,
          correctionType: 'number',
          villageId: v.id,
          villageName: vName,
          subcentreId: v.subcentre_id,
          subcentreName: parentSub?.subcentre_name,
          phcId: parentSub?.phc_id,
          phcName: parentPhc?.phc_name,
        });
      } else if (houses === 0 || v.total_houses === null || v.total_houses === undefined) {
        // Warning only per instructions!
        addIssue({
          id: `vil-houses-zero-${v.id}`,
          module: 'Village',
          categoryMarathi: 'गाव मास्टर',
          recordId: v.id,
          recordIdentifier: vName,
          issueText: 'गावातील एकूण घरे ० किंवा रिक्त नोंदवली आहेत (Houses count is 0 or unrecorded).',
          severity: 'सूचना',
          severityEn: 'warning',
          date: vDate,
          targetPage: 'village-master',
          tableName: 'village_master',
          fieldName: 'total_houses',
          fieldLabelMarathi: 'एकूण घरे',
          currentValue: v.total_houses || 0,
          suggestedFix: 'गावातील एकूण घरे भरा.',
          canCorrect: true,
          correctionType: 'number',
          villageId: v.id,
          villageName: vName,
          subcentreId: v.subcentre_id,
          subcentreName: parentSub?.subcentre_name,
          phcId: parentSub?.phc_id,
          phcName: parentPhc?.phc_name,
        });
      }
    });

    // =========================================================================
    // 4. EMPLOYEE MASTER VALIDATION & SMEAR CODE CHECK
    // =========================================================================
    const smearCodeSeen = new Map<string, string[]>(); // code -> employee ids
    employees.forEach((e) => {
      const code = (e.malaria_smear_code || '').trim().toUpperCase();
      if (code) {
        const list = smearCodeSeen.get(code) || [];
        list.push(e.id);
        smearCodeSeen.set(code, list);
      }
    });

    employees.forEach((e) => {
      const eName = (e.employee_name || '').trim();
      const eDate = e.created_at ? e.created_at.split('T')[0] : todayStr;
      const parentSub = e.subcentre_id ? subcentreMap.get(e.subcentre_id) : undefined;
      const parentPhc = parentSub?.phc_id ? phcMap.get(parentSub.phc_id) : undefined;
      const smearCode = (e.malaria_smear_code || '').trim();

      // 4.1 Empty Name
      if (!eName) {
        addIssue({
          id: `emp-empty-name-${e.id}`,
          module: 'Employee',
          categoryMarathi: 'कर्मचारी मास्टर',
          recordId: e.id,
          recordIdentifier: `Employee ID: ${e.id.slice(0, 8)}`,
          issueText: 'कर्मचाऱ्याचे नाव रिक्त आहे (Employee name is empty).',
          severity: 'त्रुटी',
          severityEn: 'error',
          date: eDate,
          targetPage: 'employee-master',
          tableName: 'employee_master',
          fieldName: 'employee_name',
          fieldLabelMarathi: 'कर्मचारी नाव',
          currentValue: '',
          suggestedFix: 'कर्मचाऱ्याचे नाव प्रविष्ट करा.',
          canCorrect: true,
          correctionType: 'text',
          employeeId: e.id,
          subcentreId: e.subcentre_id,
          subcentreName: parentSub?.subcentre_name,
          phcId: parentSub?.phc_id,
          phcName: parentPhc?.phc_name,
        });
      }

      // 4.2 Missing Designation
      if (!e.designation || !e.designation.trim()) {
        addIssue({
          id: `emp-missing-desig-${e.id}`,
          module: 'Employee',
          categoryMarathi: 'कर्मचारी मास्टर',
          recordId: e.id,
          recordIdentifier: eName || 'कर्मचारी',
          issueText: 'कर्मचाऱ्याचे पदनाम रिक्त आहे (Designation is missing).',
          severity: 'सूचना',
          severityEn: 'warning',
          date: eDate,
          targetPage: 'employee-master',
          tableName: 'employee_master',
          fieldName: 'designation',
          fieldLabelMarathi: 'पदनाम (Designation)',
          currentValue: e.designation || '',
          suggestedFix: 'उदा. आरोग्य सेवक (पुरुष), आरोग्य सेविका (स्त्री), MPW इ. नोंदवा.',
          canCorrect: true,
          correctionType: 'text',
          employeeId: e.id,
          employeeName: eName,
          subcentreId: e.subcentre_id,
          subcentreName: parentSub?.subcentre_name,
          phcId: parentSub?.phc_id,
          phcName: parentPhc?.phc_name,
        });
      }

      // 4.3 Missing Mobile Number
      if (!e.mobile_number || !e.mobile_number.trim() || e.mobile_number.trim().length < 10) {
        addIssue({
          id: `emp-missing-mobile-${e.id}`,
          module: 'Employee',
          categoryMarathi: 'कर्मचारी मास्टर',
          recordId: e.id,
          recordIdentifier: eName || 'कर्मचारी',
          issueText: 'कर्मचाऱ्याचा १० अंकी मोबाईल क्रमांक रिक्त किंवा अपूर्ण आहे.',
          severity: 'सूचना',
          severityEn: 'warning',
          date: eDate,
          targetPage: 'employee-master',
          tableName: 'employee_master',
          fieldName: 'mobile_number',
          fieldLabelMarathi: 'मोबाईल क्रमांक',
          currentValue: e.mobile_number || '',
          suggestedFix: '१० अंकी मोबाईल क्रमांक प्रविष्ट करा.',
          canCorrect: true,
          correctionType: 'text',
          employeeId: e.id,
          employeeName: eName,
          subcentreId: e.subcentre_id,
          subcentreName: parentSub?.subcentre_name,
          phcId: parentSub?.phc_id,
          phcName: parentPhc?.phc_name,
        });
      }

      // 4.4 Missing Subcentre Reference (Orphan Employee)
      if (!e.subcentre_id) {
        addIssue({
          id: `emp-missing-sub-${e.id}`,
          module: 'Orphan Records',
          categoryMarathi: 'Orphan Records (अनाथ नोंद)',
          recordId: e.id,
          recordIdentifier: eName || `Employee ${e.id.slice(0, 8)}`,
          issueText: 'कर्मचाऱ्याला उपकेंद्र जोडलेले नाही (Employee without Subcentre).',
          severity: 'त्रुटी',
          severityEn: 'error',
          date: eDate,
          targetPage: 'employee-master',
          tableName: 'employee_master',
          fieldName: 'subcentre_id',
          fieldLabelMarathi: 'उपकेंद्र निवडा',
          suggestedFix: 'कर्मचाऱ्याची योग्य उपकेंद्रात नेमणूक करा.',
          canCorrect: subcentres.length > 0,
          correctionType: 'select',
          allowedOptions: subcentres.map((s) => ({ label: s.subcentre_name, value: s.id })),
          employeeId: e.id,
          employeeName: eName,
        });
      } else if (!parentSub) {
        addIssue({
          id: `emp-invalid-sub-${e.id}`,
          module: 'Orphan Records',
          categoryMarathi: 'Orphan Records (अनाथ नोंद)',
          recordId: e.id,
          recordIdentifier: eName || `Employee ${e.id.slice(0, 8)}`,
          issueText: `अस्तित्वात नसलेल्या उपकेंद्राशी नेमणूक (Invalid Subcentre ID: ${e.subcentre_id.slice(0, 8)}...).`,
          severity: 'त्रुटी',
          severityEn: 'error',
          date: eDate,
          targetPage: 'employee-master',
          tableName: 'employee_master',
          fieldName: 'subcentre_id',
          fieldLabelMarathi: 'उपकेंद्र निवडा',
          suggestedFix: 'कर्मचाऱ्याचे उपकेंद्र दुरुस्त करा.',
          canCorrect: subcentres.length > 0,
          correctionType: 'select',
          allowedOptions: subcentres.map((s) => ({ label: s.subcentre_name, value: s.id })),
          employeeId: e.id,
          employeeName: eName,
        });
      }

      // 4.5 Smear Code Missing (Critical validation)
      if (!smearCode) {
        addIssue({
          id: `emp-missing-smear-${e.id}`,
          module: 'Smear Code',
          categoryMarathi: 'स्मीअर कोड',
          recordId: e.id,
          recordIdentifier: eName || 'कर्मचारी',
          issueText: 'मलेरिया स्मीअर कोड (Smear Code) रिक्त आहे - नमुने नोंदणीसाठी हा अनिवार्य आहे.',
          severity: 'त्रुटी',
          severityEn: 'error',
          date: eDate,
          targetPage: 'employee-master',
          tableName: 'employee_master',
          fieldName: 'malaria_smear_code',
          fieldLabelMarathi: 'मलेरिया स्मीअर कोड',
          currentValue: '',
          suggestedFix: 'युनिक स्मीअर कोड नियुक्त करा (उदा. JTG-ANM-1).',
          canCorrect: true,
          correctionType: 'text',
          employeeId: e.id,
          employeeName: eName,
          subcentreId: e.subcentre_id,
          subcentreName: parentSub?.subcentre_name,
          phcId: parentSub?.phc_id,
          phcName: parentPhc?.phc_name,
        });
      } else {
        // 4.6 Duplicate Smear Code Check
        const sameCodeList = smearCodeSeen.get(smearCode.toUpperCase()) || [];
        if (sameCodeList.length > 1) {
          addIssue({
            id: `emp-duplicate-smear-${e.id}`,
            module: 'Smear Code',
            categoryMarathi: 'स्मीअर कोड',
            recordId: e.id,
            recordIdentifier: `${eName} (${smearCode})`,
            issueText: `डुप्लिकेट स्मीअर कोड: '${smearCode}' हा कोड एकापेक्षा जास्त कर्मचाऱ्यांना नियुक्त केला आहे.`,
            severity: 'त्रुटी',
            severityEn: 'error',
            date: eDate,
            targetPage: 'employee-master',
            tableName: 'employee_master',
            fieldName: 'malaria_smear_code',
            fieldLabelMarathi: 'मलेरिया स्मीअर कोड',
            currentValue: smearCode,
            suggestedFix: 'प्रत्येक कर्मचाऱ्याला युनिक स्मीअर कोड द्या.',
            canCorrect: true,
            correctionType: 'text',
            employeeId: e.id,
            employeeName: eName,
            smearCode: smearCode,
            subcentreId: e.subcentre_id,
            subcentreName: parentSub?.subcentre_name,
            phcId: parentSub?.phc_id,
            phcName: parentPhc?.phc_name,
          });
        }
      }

      // 4.7 Inactive Employee with active sample entries
      if (!e.is_active) {
        const empSamples = samples.filter((s) => s.employee_id === e.id);
        if (empSamples.length > 0) {
          addIssue({
            id: `emp-inactive-has-samples-${e.id}`,
            module: 'Employee',
            categoryMarathi: 'कर्मचारी मास्टर',
            recordId: e.id,
            recordIdentifier: `${eName} (निष्क्रिय)`,
            issueText: `कर्मचारी निष्क्रिय (Inactive) म्हणून चिन्हांकित आहे, तरीही या कर्मचाऱ्याच्या नावे ${empSamples.length} रक्त नमुने नोंद आहेत.`,
            severity: 'सूचना',
            severityEn: 'warning',
            date: eDate,
            targetPage: 'employee-master',
            tableName: 'employee_master',
            employeeId: e.id,
            employeeName: eName,
            subcentreId: e.subcentre_id,
            subcentreName: parentSub?.subcentre_name,
            phcId: parentSub?.phc_id,
            phcName: parentPhc?.phc_name,
          });
        }
      }
    });

    // =========================================================================
    // 5. MALARIA BLOOD SAMPLE VALIDATION
    // =========================================================================
    samples.forEach((s) => {
      const sampDate = s.sample_collection_date || (s.created_at ? s.created_at.split('T')[0] : todayStr);
      const parentEmp = s.employee_id ? employeeMap.get(s.employee_id) : undefined;
      const parentVil = s.village_id ? villageMap.get(s.village_id) : undefined;
      const parentSub = parentVil?.subcentre_id ? subcentreMap.get(parentVil.subcentre_id) : undefined;
      const parentPhc = parentSub?.phc_id ? phcMap.get(parentSub.phc_id) : undefined;

      const recordDesc = `${s.patient_name || 'अनामिक रुग्ण'} (नमुना #${s.sample_number || '?'})`;

      // 5.1 Missing Employee Reference (Orphan Sample)
      if (!s.employee_id) {
        addIssue({
          id: `samp-missing-emp-${s.id}`,
          module: 'Orphan Records',
          categoryMarathi: 'Orphan Records (अनाथ नोंद)',
          recordId: s.id,
          recordIdentifier: recordDesc,
          issueText: 'रक्त नमुन्याला कर्मचारी जोडलेला नाही (Sample without Employee).',
          severity: 'त्रुटी',
          severityEn: 'error',
          date: sampDate,
          targetPage: 'malaria-register',
          tableName: 'malaria_blood_samples',
          sampleNumber: s.sample_number,
          patientName: s.patient_name,
          villageId: s.village_id,
          villageName: parentVil?.village_name,
        });
      } else if (!parentEmp) {
        addIssue({
          id: `samp-invalid-emp-${s.id}`,
          module: 'Orphan Records',
          categoryMarathi: 'Orphan Records (अनाथ नोंद)',
          recordId: s.id,
          recordIdentifier: recordDesc,
          issueText: `अस्तित्वात नसलेल्या कर्मचाऱ्याशी नमुना जोडलेला आहे (Invalid Employee ID: ${s.employee_id.slice(0, 8)}...).`,
          severity: 'त्रुटी',
          severityEn: 'error',
          date: sampDate,
          targetPage: 'malaria-register',
          tableName: 'malaria_blood_samples',
          sampleNumber: s.sample_number,
          patientName: s.patient_name,
          villageId: s.village_id,
          villageName: parentVil?.village_name,
        });
      }

      // 5.2 Missing Village Reference (Orphan Sample)
      if (!s.village_id) {
        addIssue({
          id: `samp-missing-vil-${s.id}`,
          module: 'Orphan Records',
          categoryMarathi: 'Orphan Records (अनाथ नोंद)',
          recordId: s.id,
          recordIdentifier: recordDesc,
          issueText: 'रक्त नमुन्याला गाव जोडलेले नाही (Sample without Village).',
          severity: 'त्रुटी',
          severityEn: 'error',
          date: sampDate,
          targetPage: 'malaria-register',
          tableName: 'malaria_blood_samples',
          sampleNumber: s.sample_number,
          patientName: s.patient_name,
          employeeId: s.employee_id,
          employeeName: parentEmp?.employee_name,
        });
      } else if (!parentVil) {
        addIssue({
          id: `samp-invalid-vil-${s.id}`,
          module: 'Orphan Records',
          categoryMarathi: 'Orphan Records (अनाथ नोंद)',
          recordId: s.id,
          recordIdentifier: recordDesc,
          issueText: `अस्तित्वात नसलेल्या गावाशी नमुना जोडलेला आहे (Invalid Village ID: ${s.village_id.slice(0, 8)}...).`,
          severity: 'त्रुटी',
          severityEn: 'error',
          date: sampDate,
          targetPage: 'malaria-register',
          tableName: 'malaria_blood_samples',
          sampleNumber: s.sample_number,
          patientName: s.patient_name,
          employeeId: s.employee_id,
          employeeName: parentEmp?.employee_name,
        });
      }

      // 5.3 Missing Patient Name
      if (!s.patient_name || !s.patient_name.trim()) {
        addIssue({
          id: `samp-empty-patient-${s.id}`,
          module: 'Blood Samples',
          categoryMarathi: 'रक्त नमुने नोंदवही',
          recordId: s.id,
          recordIdentifier: `नमुना #${s.sample_number || s.id.slice(0, 6)}`,
          issueText: 'ताप रुग्णाचे नाव रिक्त आहे (Patient name is missing).',
          severity: 'त्रुटी',
          severityEn: 'error',
          date: sampDate,
          targetPage: 'malaria-register',
          tableName: 'malaria_blood_samples',
          fieldName: 'patient_name',
          fieldLabelMarathi: 'रुग्णाचे नाव',
          currentValue: '',
          suggestedFix: 'ताप रुग्णाचे पूर्ण नाव प्रविष्ट करा.',
          canCorrect: true,
          correctionType: 'text',
          sampleNumber: s.sample_number,
          employeeId: s.employee_id,
          employeeName: parentEmp?.employee_name,
          villageId: s.village_id,
          villageName: parentVil?.village_name,
        });
      }

      // 5.4 Missing House Number
      if (!s.house_number || !s.house_number.trim()) {
        addIssue({
          id: `samp-empty-house-${s.id}`,
          module: 'Blood Samples',
          categoryMarathi: 'रक्त नमुने नोंदवही',
          recordId: s.id,
          recordIdentifier: recordDesc,
          issueText: 'घर क्रमांक रिक्त आहे (House number missing).',
          severity: 'त्रुटी',
          severityEn: 'error',
          date: sampDate,
          targetPage: 'malaria-register',
          tableName: 'malaria_blood_samples',
          fieldName: 'house_number',
          fieldLabelMarathi: 'घर क्रमांक',
          currentValue: '',
          suggestedFix: 'घराचा क्रमांक नोंदवा (उदा. १२/अ, किंवा ४५).',
          canCorrect: true,
          correctionType: 'text',
          sampleNumber: s.sample_number,
          patientName: s.patient_name,
          employeeId: s.employee_id,
          employeeName: parentEmp?.employee_name,
          villageId: s.village_id,
          villageName: parentVil?.village_name,
        });
      }

      // 5.5 Age Validation (1–120)
      const ageNum = Number(s.age);
      if (s.age === null || s.age === undefined || isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
        addIssue({
          id: `samp-invalid-age-${s.id}`,
          module: 'Blood Samples',
          categoryMarathi: 'रक्त नमुने नोंदवही',
          recordId: s.id,
          recordIdentifier: recordDesc,
          issueText: `वय अवैध किंवा १ ते १२० च्या बाहेर आहे (Age: ${s.age}).`,
          severity: 'त्रुटी',
          severityEn: 'error',
          date: sampDate,
          targetPage: 'malaria-register',
          tableName: 'malaria_blood_samples',
          fieldName: 'age',
          fieldLabelMarathi: 'वय (वर्षे)',
          currentValue: s.age,
          suggestedFix: 'वय १ ते १२० दरम्यान प्रविष्ट करा.',
          canCorrect: true,
          correctionType: 'number',
          sampleNumber: s.sample_number,
          patientName: s.patient_name,
          employeeId: s.employee_id,
          employeeName: parentEmp?.employee_name,
          villageId: s.village_id,
          villageName: parentVil?.village_name,
        });
      }

      // 5.6 Gender Validation
      if (!s.gender || !['पुरुष', 'स्त्री', 'इतर'].includes(s.gender)) {
        addIssue({
          id: `samp-invalid-gender-${s.id}`,
          module: 'Blood Samples',
          categoryMarathi: 'रक्त नमुने नोंदवही',
          recordId: s.id,
          recordIdentifier: recordDesc,
          issueText: `लिंग निवडलेले नाही किंवा अवैध आहे (Gender: ${s.gender}).`,
          severity: 'त्रुटी',
          severityEn: 'error',
          date: sampDate,
          targetPage: 'malaria-register',
          tableName: 'malaria_blood_samples',
          fieldName: 'gender',
          fieldLabelMarathi: 'लिंग',
          currentValue: s.gender,
          suggestedFix: 'पुरुष, स्त्री अथवा इतर यापैकी योग्य पर्याय निवडा.',
          canCorrect: true,
          correctionType: 'select',
          allowedOptions: [
            { label: 'पुरुष', value: 'पुरुष' },
            { label: 'स्त्री', value: 'स्त्री' },
            { label: 'इतर', value: 'इतर' },
          ],
          sampleNumber: s.sample_number,
          patientName: s.patient_name,
          employeeId: s.employee_id,
          employeeName: parentEmp?.employee_name,
          villageId: s.village_id,
          villageName: parentVil?.village_name,
        });
      }

      // 5.7 Collection Date & Future Date Check
      if (!s.sample_collection_date) {
        addIssue({
          id: `samp-missing-date-${s.id}`,
          module: 'Blood Samples',
          categoryMarathi: 'रक्त नमुने नोंदवही',
          recordId: s.id,
          recordIdentifier: recordDesc,
          issueText: 'नमुना संकलन दिनांक रिक्त आहे (Collection Date missing).',
          severity: 'त्रुटी',
          severityEn: 'error',
          date: sampDate,
          targetPage: 'malaria-register',
          tableName: 'malaria_blood_samples',
          fieldName: 'sample_collection_date',
          fieldLabelMarathi: 'संकलन दिनांक',
          currentValue: '',
          suggestedFix: 'योग्य संकलन दिनांक निवडा.',
          canCorrect: true,
          correctionType: 'text',
          sampleNumber: s.sample_number,
          patientName: s.patient_name,
          employeeId: s.employee_id,
          employeeName: parentEmp?.employee_name,
          villageId: s.village_id,
          villageName: parentVil?.village_name,
        });
      } else if (s.sample_collection_date > todayStr) {
        addIssue({
          id: `samp-future-date-${s.id}`,
          module: 'Blood Samples',
          categoryMarathi: 'रक्त नमुने नोंदवही',
          recordId: s.id,
          recordIdentifier: recordDesc,
          issueText: `नमुना संकलन दिनांक भविष्यातील आहे (${s.sample_collection_date} > आजचा दिनांक ${todayStr}).`,
          severity: 'त्रुटी',
          severityEn: 'error',
          date: sampDate,
          targetPage: 'malaria-register',
          tableName: 'malaria_blood_samples',
          fieldName: 'sample_collection_date',
          fieldLabelMarathi: 'संकलन दिनांक',
          currentValue: s.sample_collection_date,
          suggestedFix: 'संकलन दिनांक आजचा किंवा मागील असावा.',
          canCorrect: true,
          correctionType: 'text',
          sampleNumber: s.sample_number,
          patientName: s.patient_name,
          employeeId: s.employee_id,
          employeeName: parentEmp?.employee_name,
          villageId: s.village_id,
          villageName: parentVil?.village_name,
        });
      }

      // 5.8 Sample Number & Year Missing
      if (s.sample_number === null || s.sample_number === undefined || s.sample_number <= 0) {
        addIssue({
          id: `samp-missing-num-${s.id}`,
          module: 'Sample Number',
          categoryMarathi: 'नमुना क्रमांक',
          recordId: s.id,
          recordIdentifier: recordDesc,
          issueText: 'नमुना क्रमांक रिक्त किंवा अवैध आहे (Sample Number <= 0).',
          severity: 'त्रुटी',
          severityEn: 'error',
          date: sampDate,
          targetPage: 'malaria-register',
          tableName: 'malaria_blood_samples',
          patientName: s.patient_name,
          employeeId: s.employee_id,
          employeeName: parentEmp?.employee_name,
        });
      }

      if (!s.sample_year) {
        addIssue({
          id: `samp-missing-year-${s.id}`,
          module: 'Sample Number',
          categoryMarathi: 'नमुना क्रमांक',
          recordId: s.id,
          recordIdentifier: recordDesc,
          issueText: 'नमुन्याचे वर्ष (sample_year) रिक्त आहे.',
          severity: 'त्रुटी',
          severityEn: 'error',
          date: sampDate,
          targetPage: 'malaria-register',
          tableName: 'malaria_blood_samples',
          sampleNumber: s.sample_number,
          patientName: s.patient_name,
          employeeId: s.employee_id,
          employeeName: parentEmp?.employee_name,
        });
      }

      // 5.9 Missing Smear Code on Sample
      if (!s.malaria_smear_code || !s.malaria_smear_code.trim()) {
        addIssue({
          id: `samp-missing-smear-${s.id}`,
          module: 'Smear Code',
          categoryMarathi: 'स्मीअर कोड',
          recordId: s.id,
          recordIdentifier: recordDesc,
          issueText: 'नमुन्यावर मलेरिया स्मीअर कोड नोंदवलेला नाही.',
          severity: 'त्रुटी',
          severityEn: 'error',
          date: sampDate,
          targetPage: 'malaria-register',
          tableName: 'malaria_blood_samples',
          sampleNumber: s.sample_number,
          patientName: s.patient_name,
          employeeId: s.employee_id,
          employeeName: parentEmp?.employee_name,
        });
      }

      // 5.10 Sent Date Validation (before collection date or future date)
      if (s.sent_date) {
        if (s.sample_collection_date && s.sent_date < s.sample_collection_date) {
          addIssue({
            id: `samp-sent-before-collection-${s.id}`,
            module: 'Blood Samples',
            categoryMarathi: 'रक्त नमुने नोंदवही',
            recordId: s.id,
            recordIdentifier: recordDesc,
            issueText: `लॅबमध्ये पाठविण्याचा दिनांक (${s.sent_date}) नमुना संकलन दिनांकापेक्षा (${s.sample_collection_date}) आधीचा आहे.`,
            severity: 'त्रुटी',
            severityEn: 'error',
            date: sampDate,
            targetPage: 'send-samples',
            tableName: 'malaria_blood_samples',
            sampleNumber: s.sample_number,
            patientName: s.patient_name,
            employeeId: s.employee_id,
            employeeName: parentEmp?.employee_name,
          });
        } else if (s.sent_date > todayStr) {
          addIssue({
            id: `samp-sent-future-${s.id}`,
            module: 'Blood Samples',
            categoryMarathi: 'रक्त नमुने नोंदवही',
            recordId: s.id,
            recordIdentifier: recordDesc,
            issueText: `लॅबमध्ये पाठविण्याचा दिनांक भविष्यातील आहे (${s.sent_date} > ${todayStr}).`,
            severity: 'सूचना',
            severityEn: 'warning',
            date: sampDate,
            targetPage: 'send-samples',
            tableName: 'malaria_blood_samples',
            sampleNumber: s.sample_number,
            patientName: s.patient_name,
            employeeId: s.employee_id,
            employeeName: parentEmp?.employee_name,
          });
        }
      }

      // 5.11 Smear Code Consistency with Employee
      if (parentEmp && s.malaria_smear_code && parentEmp.malaria_smear_code) {
        const sCode = s.malaria_smear_code.trim().toUpperCase();
        const eCode = parentEmp.malaria_smear_code.trim().toUpperCase();
        if (sCode !== eCode) {
          addIssue({
            id: `smear-mismatch-${s.id}`,
            module: 'Smear Code',
            categoryMarathi: 'स्मीअर कोड विसंगती',
            recordId: s.id,
            recordIdentifier: recordDesc,
            issueText: `स्मीअर कोड विसंगती: नमुन्यातील कोड '${s.malaria_smear_code}' व कर्मचारी मास्टरमधील कोड '${parentEmp.malaria_smear_code}' जुळत नाही.`,
            severity: 'सूचना',
            severityEn: 'warning',
            date: sampDate,
            targetPage: 'malaria-register',
            tableName: 'malaria_blood_samples',
            sampleNumber: s.sample_number,
            patientName: s.patient_name,
            smearCode: s.malaria_smear_code,
            employeeId: s.employee_id,
            employeeName: parentEmp.employee_name,
          });
        }
      }

      // 5.12 Employee–Village Assignment Relation Mismatch
      if (parentEmp && parentVil) {
        const empSubId = parentEmp.subcentre_id;
        const vilSubId = parentVil.subcentre_id;

        if (empSubId && vilSubId && empSubId !== vilSubId) {
          const empSubName = subcentreMap.get(empSubId)?.subcentre_name || 'अज्ञात उपकेंद्र';
          const vilSubName = subcentreMap.get(vilSubId)?.subcentre_name || 'अज्ञात उपकेंद्र';

          addIssue({
            id: `relation-mismatch-${s.id}`,
            module: 'Relations',
            categoryMarathi: 'कर्मचारी-गाव संबंध',
            recordId: s.id,
            recordIdentifier: recordDesc,
            issueText: `Employee–Village Assignment Mismatch: कर्मचारी '${parentEmp.employee_name}' हा '${empSubName}' ला नेमलेला आहे, परंतु नमुना '${parentVil.village_name}' (उपकेंद्र: '${vilSubName}') मधील आहे.`,
            severity: 'त्रुटी',
            severityEn: 'error',
            date: sampDate,
            targetPage: 'malaria-register',
            tableName: 'malaria_blood_samples',
            sampleNumber: s.sample_number,
            patientName: s.patient_name,
            employeeId: s.employee_id,
            employeeName: parentEmp.employee_name,
            villageId: s.village_id,
            villageName: parentVil.village_name,
            subcentreId: vilSubId,
            subcentreName: vilSubName,
          });
        }
      }
    });

    // =========================================================================
    // 6. SAMPLE NUMBER SEQUENCE VALIDATION & DUPLICATE CHECK
    // =========================================================================
    // Group samples by Employee + Year
    const empYearSampleMap = new Map<string, MalariaBloodSample[]>();
    samples.forEach((s) => {
      if (s.employee_id && s.sample_year) {
        const key = `${s.employee_id}_${s.sample_year}`;
        const list = empYearSampleMap.get(key) || [];
        list.push(s);
        empYearSampleMap.set(key, list);
      }
    });

    empYearSampleMap.forEach((sList, key) => {
      const [empId, yearStr] = key.split('_');
      const emp = employeeMap.get(empId);
      const empName = emp?.employee_name || 'कर्मचारी';
      const year = parseInt(yearStr, 10);

      // Check duplicates
      const numCountMap = new Map<number, MalariaBloodSample[]>();
      sList.forEach((s) => {
        const num = Number(s.sample_number);
        if (num > 0) {
          const arr = numCountMap.get(num) || [];
          arr.push(s);
          numCountMap.set(num, arr);
        }
      });

      // Report duplicate sample numbers
      numCountMap.forEach((duplicates, num) => {
        if (duplicates.length > 1) {
          duplicates.forEach((s) => {
            const sampDate = s.sample_collection_date || todayStr;
            addIssue({
              id: `dup-samp-num-${s.id}`,
              module: 'Sample Number',
              categoryMarathi: 'नमुना क्रमांक',
              recordId: s.id,
              recordIdentifier: `${s.patient_name} (नमुना #${num})`,
              issueText: `गंभीर त्रुटी: कर्मचारी '${empName}' साठी वर्ष ${year} मध्ये नमुना क्रमांक #${num} ची ${duplicates.length} वेळा डुप्लिकेट नोंद आढळली!`,
              severity: 'त्रुटी',
              severityEn: 'error',
              date: sampDate,
              targetPage: 'malaria-register',
              tableName: 'malaria_blood_samples',
              sampleNumber: num,
              patientName: s.patient_name,
              employeeId: s.employee_id,
              employeeName: empName,
              smearCode: s.malaria_smear_code,
            });
          });
        }
      });

      // Check Sequence Gaps:
      const uniqueNums = Array.from(numCountMap.keys()).sort((a, b) => a - b);
      if (uniqueNums.length > 0) {
        const minNum = 1; // standard starting point
        const maxNum = uniqueNums[uniqueNums.length - 1];

        const numSet = new Set(uniqueNums);
        const missingNumbers: number[] = [];

        for (let i = minNum; i <= maxNum; i++) {
          if (!numSet.has(i)) {
            missingNumbers.push(i);
          }
        }

        if (missingNumbers.length > 0) {
          // If there are sequence gaps, report as a warning
          const sampleWithLatestDate = sList[sList.length - 1];
          const displayMissing = missingNumbers.slice(0, 5).join(', ') + (missingNumbers.length > 5 ? ` व इतर ${missingNumbers.length - 5}` : '');

          addIssue({
            id: `gap-sequence-${key}`,
            module: 'Sample Number',
            categoryMarathi: 'नमुना क्रमांक क्रम',
            recordId: sampleWithLatestDate.id,
            recordIdentifier: `${empName} (वर्ष ${year})`,
            issueText: `Sample Number Sequence Gap: कर्मचारी '${empName}' साठी वर्ष ${year} मध्ये नमुना क्रमांक क्रमाने नाहीत. गहाळ/वगळलेले नमुना क्र.: [${displayMissing}].`,
            severity: 'सूचना',
            severityEn: 'warning',
            date: sampleWithLatestDate.sample_collection_date || todayStr,
            targetPage: 'malaria-register',
            tableName: 'malaria_blood_samples',
            employeeId: empId,
            employeeName: empName,
            smearCode: emp?.malaria_smear_code,
          });
        }
      }
    });

    // =========================================================================
    // 7. CATEGORY-WISE SUMMARY
    // =========================================================================
    const categories: { key: import('../types').ValidationModule; labelMarathi: string }[] = [
      { key: 'PHC', labelMarathi: 'प्राथमिक आरोग्य केंद्र (PHC)' },
      { key: 'Subcentre', labelMarathi: 'उपकेंद्र (Subcentre)' },
      { key: 'Village', labelMarathi: 'गाव मास्टर (Village)' },
      { key: 'Employee', labelMarathi: 'कर्मचारी मास्टर (Employee)' },
      { key: 'Blood Samples', labelMarathi: 'रक्त नमुने (Blood Samples)' },
      { key: 'Sample Number', labelMarathi: 'नमुना क्रमांक व क्रम (Sample Number)' },
      { key: 'Smear Code', labelMarathi: 'स्मीअर कोड सुसंगतता (Smear Code)' },
      { key: 'Relations', labelMarathi: 'कर्मचारी-गाव संबंध (Relations)' },
      { key: 'Orphan Records', labelMarathi: 'अनाथ नोंदी (Orphan Records)' },
    ];

    const categorySummaries: CategoryValidationSummary[] = categories.map((cat) => {
      const catIssues = issues.filter((i) => i.module === cat.key);
      const errors = catIssues.filter((i) => i.severityEn === 'error').length;
      const warnings = catIssues.filter((i) => i.severityEn === 'warning').length;
      const info = catIssues.filter((i) => i.severityEn === 'info').length;

      return {
        category: cat.key,
        labelMarathi: cat.labelMarathi,
        errors,
        warnings,
        info,
        totalIssues: catIssues.length,
      };
    });

    // =========================================================================
    // 8. DATA QUALITY SCORE CALCULATION
    // =========================================================================
    const totalCheckedRecords = phcs.length + subcentres.length + villages.length + employees.length + samples.length;
    const recordsNeedingAttentionCount = recordsWithIssues.size;
    const validRecordsCount = Math.max(0, totalCheckedRecords - recordsNeedingAttentionCount);

    const qualityScore =
      totalCheckedRecords > 0 ? Math.round((validRecordsCount / totalCheckedRecords) * 100) : 100;

    let qualityRating = {
      text: 'उत्कृष्ट (Excellent)',
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-300',
    };

    if (qualityScore < 60) {
      qualityRating = {
        text: 'तातडीने तपासणी आवश्यक (Immediate Attention)',
        color: 'text-rose-700',
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-300',
      };
    } else if (qualityScore < 80) {
      qualityRating = {
        text: 'सुधारणा आवश्यक (Needs Improvement)',
        color: 'text-amber-800',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-300',
      };
    } else if (qualityScore < 95) {
      qualityRating = {
        text: 'चांगले (Good)',
        color: 'text-teal-700',
        bgColor: 'bg-teal-50',
        borderColor: 'border-teal-300',
      };
    }

    // =========================================================================
    // 9. PHC-WISE QUALITY SUMMARY
    // =========================================================================
    const phcSummaries: PhcQualitySummary[] = phcs.map((p) => {
      const pSubcentres = subcentres.filter((s) => s.phc_id === p.id);
      const pSubIds = new Set(pSubcentres.map((s) => s.id));
      const pVillages = villages.filter((v) => pSubIds.has(v.subcentre_id));
      const pEmployees = employees.filter((e) => pSubIds.has(e.subcentre_id));
      const pVilIds = new Set(pVillages.map((v) => v.id));
      const pSamples = samples.filter((s) => pVilIds.has(s.village_id) || pSubIds.has(s.subcentre_id || ''));

      const phcTotalRecords = 1 + pSubcentres.length + pVillages.length + pEmployees.length + pSamples.length;

      // Find issues related to this PHC
      const pIssues = issues.filter((i) => {
        if (i.phcId === p.id) return true;
        if (i.subcentreId && pSubIds.has(i.subcentreId)) return true;
        if (i.villageId && pVilIds.has(i.villageId)) return true;
        if (i.employeeId && pEmployees.some((e) => e.id === i.employeeId)) return true;
        return false;
      });

      const pErrors = pIssues.filter((i) => i.severityEn === 'error').length;
      const pWarnings = pIssues.filter((i) => i.severityEn === 'warning').length;

      const pRecordsWithIssues = new Set(pIssues.map((i) => i.recordId)).size;
      const pValidRecords = Math.max(0, phcTotalRecords - pRecordsWithIssues);
      const pScore = phcTotalRecords > 0 ? Math.round((pValidRecords / phcTotalRecords) * 100) : 100;

      let statusText = 'उत्कृष्ट';
      if (pScore < 60) statusText = 'तातडीने तपासणी';
      else if (pScore < 80) statusText = 'सुधारणा आवश्यक';
      else if (pScore < 95) statusText = 'चांगले';

      return {
        phcId: p.id,
        phcName: p.phc_name,
        totalRecords: phcTotalRecords,
        errorCount: pErrors,
        warningCount: pWarnings,
        validRecords: pValidRecords,
        qualityScore: pScore,
        statusText,
      };
    });

    return {
      issues,
      categorySummaries,
      phcSummaries,
      totalCheckedRecords,
      recordsNeedingAttentionCount,
      validRecordsCount,
      qualityScore,
      qualityRating,
    };
  },
};
