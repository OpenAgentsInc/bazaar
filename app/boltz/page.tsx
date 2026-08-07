import type { Metadata } from "next"

import { BoltzReferenceCatalog } from "@/components/boltz/reference-showcase"

export const metadata: Metadata = {
  title: "Boltz UI Coverage · Bazaar",
  description:
    "Complete Bazaar-native coverage of Boltz Web App components and screens.",
}

export default function BoltzCatalogPage() {
  return <BoltzReferenceCatalog />
}
