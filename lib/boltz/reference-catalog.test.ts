import assert from "node:assert/strict"
import test from "node:test"

import {
  boltzReferenceComponents,
  boltzReferenceCounts,
  boltzReferenceInventory,
  boltzReferenceScreens,
  boltzReferenceStatuses,
} from "../../components/boltz/reference-catalog"

test("tracks every Boltz Web App UI module exactly once", () => {
  assert.deepEqual(boltzReferenceCounts, {
    components: 76,
    statuses: 15,
    screens: 23,
    total: 114,
  })
  assert.equal(
    new Set(boltzReferenceInventory.map((entry) => entry.path)).size,
    boltzReferenceInventory.length
  )
})

test("keeps component, status, and screen paths in their source namespaces", () => {
  assert.ok(
    boltzReferenceComponents.every((entry) =>
      entry.path.startsWith("components/")
    )
  )
  assert.ok(
    boltzReferenceStatuses.every((entry) => entry.path.startsWith("status/"))
  )
  assert.ok(
    boltzReferenceScreens.every((entry) => entry.path.startsWith("pages/"))
  )
  assert.ok(
    boltzReferenceInventory.some(
      (entry) => entry.path === "components/BridgeSendRecovery.ts"
    )
  )
})
