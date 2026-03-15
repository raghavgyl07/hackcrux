"use client";

import { Suspense } from "react";
import PatientReportsContent from "./PatientReportsContent";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PatientReportsContent />
    </Suspense>
  );
}