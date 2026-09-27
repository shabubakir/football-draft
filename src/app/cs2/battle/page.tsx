import { Suspense } from "react";
import { CS2BattleClient } from "./battle-client";

export const metadata = {
  title: "CS2 Case Battle — Football Draft",
};

export default function CS2BattlePage() {
  return (
    <Suspense>
      <CS2BattleClient />
    </Suspense>
  );
}
