// Invariants for rotations/{rotationCode} — see firestore.rules match
// /rotations/{rotationCode}, rotationAllowsAdmin, rotationAllowsOwner.
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, getDocs, query, setDoc, where, collection } from "firebase/firestore";
import { BOOTSTRAP_ADMIN_EMAIL, makeTestEnv, minimalRotation } from "./helpers";

const ROTATION = "GS-26";
const OWNER = "owner-uid-1";
const CO_ADMIN = "co-admin-uid";
const OTHER_ADMIN = "other-admin-uid";
const BOOTSTRAP_UID = "bootstrap-uid";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await makeTestEnv();
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    // Every actor in this suite needs an /admins/{uid} doc: isAdmin() gates
    // every clause of rotationAllowsAdmin/rotationAllowsOwner, INCLUDING the
    // bootstrap-email clause — isBootstrapAdminEmail() alone is not enough.
    const db = ctx.firestore();
    for (const uid of [OWNER, CO_ADMIN, OTHER_ADMIN, BOOTSTRAP_UID]) {
      await setDoc(doc(db, "admins", uid), { email: `${uid}@example.com` });
    }
  });
});

describe("rotations: admin scoping via ownerUid/adminUids/ownerEmail", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), "rotations", ROTATION),
        minimalRotation({ ownerUid: OWNER, ownerEmail: "owner@example.com", adminUids: [OWNER, CO_ADMIN] })
      );
    });
  });

  it("the owner (by uid) can get the rotation", async () => {
    const owner = testEnv.authenticatedContext(OWNER);
    await assertSucceeds(getDoc(doc(owner.firestore(), "rotations", ROTATION)));
  });

  it("a co-admin (via adminUids) can get the rotation", async () => {
    const coAdmin = testEnv.authenticatedContext(CO_ADMIN);
    await assertSucceeds(getDoc(doc(coAdmin.firestore(), "rotations", ROTATION)));
  });

  it("a non-admin (not in adminUids, not owner) is denied get", async () => {
    const other = testEnv.authenticatedContext(OTHER_ADMIN);
    await assertFails(getDoc(doc(other.firestore(), "rotations", ROTATION)));
  });

  it("matching ownerEmail (case-insensitive) grants get", async () => {
    const owner = testEnv.authenticatedContext(OWNER, { email: "OWNER@example.com" });
    await assertSucceeds(getDoc(doc(owner.firestore(), "rotations", ROTATION)));
  });

  it("bootstrap admin email can get any rotation regardless of ownership", async () => {
    const bootstrap = testEnv.authenticatedContext(BOOTSTRAP_UID, { email: BOOTSTRAP_ADMIN_EMAIL });
    await assertSucceeds(getDoc(doc(bootstrap.firestore(), "rotations", ROTATION)));
  });

  it("a signed-in non-admin (no /admins doc) is denied get even if listed in adminUids", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), "rotations", ROTATION),
        minimalRotation({ ownerUid: OWNER, adminUids: [OWNER, "not-an-admin-doc-uid"] })
      );
    });
    const notAdmin = testEnv.authenticatedContext("not-an-admin-doc-uid");
    await assertFails(getDoc(doc(notAdmin.firestore(), "rotations", ROTATION)));
  });
});

describe("rotations: list uses provable query shapes", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), "rotations", ROTATION),
        minimalRotation({ ownerUid: OWNER, adminUids: [OWNER, CO_ADMIN] })
      );
    });
  });

  it("owner can list via ownerUid == auth.uid query", async () => {
    const owner = testEnv.authenticatedContext(OWNER);
    const q = query(collection(owner.firestore(), "rotations"), where("ownerUid", "==", OWNER));
    await assertSucceeds(getDocs(q));
  });

  it("co-admin can list via adminUids array-contains query", async () => {
    const coAdmin = testEnv.authenticatedContext(CO_ADMIN);
    const q = query(collection(coAdmin.firestore(), "rotations"), where("adminUids", "array-contains", CO_ADMIN));
    await assertSucceeds(getDocs(q));
  });

  it("a signed-in user with no /admins doc cannot list, even with the exact provable query shape", async () => {
    const notAdmin = testEnv.authenticatedContext("not-an-admin-doc-uid");
    const q = query(collection(notAdmin.firestore(), "rotations"), where("ownerUid", "==", "not-an-admin-doc-uid"));
    await assertFails(getDocs(q));
  });

  it("an admin cannot list with a non-provable query shape (ownerUid compared to someone else's uid)", async () => {
    // isAdmin() is true for OTHER_ADMIN, but resource.data.ownerUid == request.auth.uid
    // can only be proven when the query compares ownerUid to the CALLER's own uid.
    // Firestore's rules engine validates list queries statically against the query
    // shape (see the comment on `allow list` in firestore.rules), so this is denied
    // before any documents are even considered, regardless of what the data holds.
    const other = testEnv.authenticatedContext(OTHER_ADMIN);
    const q = query(collection(other.firestore(), "rotations"), where("ownerUid", "==", OWNER));
    await assertFails(getDocs(q));
  });
});

describe("rotations: create", () => {
  it("an admin can create a rotation naming themself owner", async () => {
    const owner = testEnv.authenticatedContext(OWNER);
    await assertSucceeds(
      setDoc(doc(owner.firestore(), "rotations", ROTATION), minimalRotation({ ownerUid: OWNER, adminUids: [OWNER] }))
    );
  });

  it("rejects create naming someone else as owner", async () => {
    const owner = testEnv.authenticatedContext(OWNER);
    await assertFails(
      setDoc(
        doc(owner.firestore(), "rotations", ROTATION),
        minimalRotation({ ownerUid: CO_ADMIN, adminUids: [CO_ADMIN] })
      )
    );
  });

  it("a non-admin cannot create a rotation", async () => {
    const notAdmin = testEnv.authenticatedContext("not-an-admin-doc-uid");
    await assertFails(
      setDoc(
        doc(notAdmin.firestore(), "rotations", ROTATION),
        minimalRotation({ ownerUid: "not-an-admin-doc-uid", adminUids: ["not-an-admin-doc-uid"] })
      )
    );
  });
});

describe("rotations: update affectedKeys restrictions", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), "rotations", ROTATION),
        minimalRotation({ ownerUid: OWNER, ownerEmail: "owner@example.com", adminUids: [OWNER, CO_ADMIN] })
      );
    });
  });

  it("a co-admin can update content keys (e.g. name)", async () => {
    const coAdmin = testEnv.authenticatedContext(CO_ADMIN);
    await assertSucceeds(
      setDoc(
        doc(coAdmin.firestore(), "rotations", ROTATION),
        minimalRotation({ ownerUid: OWNER, ownerEmail: "owner@example.com", adminUids: [OWNER, CO_ADMIN], name: "Renamed" }),
        { merge: true }
      )
    );
  });

  it("a co-admin (in adminUids but not owner) CANNOT change ownerUid", async () => {
    const coAdmin = testEnv.authenticatedContext(CO_ADMIN);
    await assertFails(
      setDoc(
        doc(coAdmin.firestore(), "rotations", ROTATION),
        minimalRotation({ ownerUid: CO_ADMIN, ownerEmail: "owner@example.com", adminUids: [OWNER, CO_ADMIN] }),
        { merge: true }
      )
    );
  });

  it("a co-admin CANNOT change adminUids (e.g. to remove the owner)", async () => {
    const coAdmin = testEnv.authenticatedContext(CO_ADMIN);
    await assertFails(
      setDoc(
        doc(coAdmin.firestore(), "rotations", ROTATION),
        minimalRotation({ ownerUid: OWNER, ownerEmail: "owner@example.com", adminUids: [CO_ADMIN] }),
        { merge: true }
      )
    );
  });

  it("the owner CAN change ownerUid/adminUids (ownership transfer)", async () => {
    const owner = testEnv.authenticatedContext(OWNER);
    await assertSucceeds(
      setDoc(
        doc(owner.firestore(), "rotations", ROTATION),
        minimalRotation({ ownerUid: CO_ADMIN, ownerEmail: "owner@example.com", adminUids: [OWNER, CO_ADMIN] }),
        { merge: true }
      )
    );
  });

  it("a non-admin outsider cannot update at all", async () => {
    const other = testEnv.authenticatedContext(OTHER_ADMIN);
    await assertFails(
      setDoc(
        doc(other.firestore(), "rotations", ROTATION),
        minimalRotation({ ownerUid: OWNER, ownerEmail: "owner@example.com", adminUids: [OWNER, CO_ADMIN], name: "Hijacked" }),
        { merge: true }
      )
    );
  });
});

describe("rotations: delete", () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), "rotations", ROTATION),
        minimalRotation({ ownerUid: OWNER, adminUids: [OWNER, CO_ADMIN] })
      );
    });
  });

  it("a rotation admin (co-admin) can delete", async () => {
    const coAdmin = testEnv.authenticatedContext(CO_ADMIN);
    await assertSucceeds(deleteDoc(doc(coAdmin.firestore(), "rotations", ROTATION)));
  });

  it("a non-admin cannot delete", async () => {
    const other = testEnv.authenticatedContext(OTHER_ADMIN);
    await assertFails(deleteDoc(doc(other.firestore(), "rotations", ROTATION)));
  });
});
