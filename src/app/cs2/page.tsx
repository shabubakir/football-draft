import { Suspense } from "react";
import { CS2PageClient } from "./cs2-page-client";

export const metadata = {
  title: "CS2 Cases — Football Draft",
};

export default function CS2Page() {
  return (
    <Suspense>
      <CS2PageClient />
    </Suspense>
  );
}
