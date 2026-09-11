export class SMEOperationalTemplateLibrary {
  list(): Array<{ id: string; name: string; industry: string }> {
    return [
      { id: 'template-dental', name: 'Dental Clinic Launch Pack', industry: 'dental_clinic' },
      { id: 'template-legal', name: 'Legal Practice Intake Pack', industry: 'law_firm' },
      { id: 'template-retail', name: 'Retail Follow-Up Pack', industry: 'retail' },
    ];
  }
}
