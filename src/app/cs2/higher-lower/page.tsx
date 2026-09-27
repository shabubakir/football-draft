import { Suspense } from "react";
import { CS2CompareClient } from "./higher-lower-client";

export const metadata = {
  title: "CS2 Higher / Lower — Football Draft",
};

export default function CS2HigherLowerPage() {
  return (
    <Suspense>
      <CS2CompareClient />
    </Suspense>
  );
}
