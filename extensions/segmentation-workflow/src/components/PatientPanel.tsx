import { usePatientInfo } from '@ohif/extension-default';
import React from 'react';
import { Button, Label } from '@ohif/ui-next';

function PatientPanel({ servicesManager }) {
  const { patientInfo } = usePatientInfo(servicesManager);

  return (
    <div
      className="text-primary-light flex flex-col space-y-1"
      style={{ paddingTop: '1em', paddingBottom: '1em' }}
    >
      <Label>Patient Name</Label>
      <p className="text-sm">
        {patientInfo.PatientName}
        <Button
          size={'sm'}
          style={{ marginLeft: '1em' }}
          onClick={() => navigator.clipboard.writeText(patientInfo.PatientName)}
        >
          Copy
        </Button>
      </p>
      <Label>Patient ID</Label>
      <p className="text-sm">
        {patientInfo.PatientID}
        <Button
          size={'sm'}
          style={{ marginLeft: '1em' }}
          onClick={() => navigator.clipboard.writeText(patientInfo.PatientID)}
        >
          Copy
        </Button>
      </p>
    </div>
  );
}

export default PatientPanel;
