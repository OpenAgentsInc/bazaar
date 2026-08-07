var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// vendor/nip-mkt/src/generated.ts
import { Schema } from "effect";
var CONTRACT_SOURCE_COMMIT = "15e77e0c9958b2334a8471c250cf7476f4c28598";
var CONTRACT_SHA256 = "a0037ebb944c907b46f3e0d83c4be6081588fa826bcf4ae4bf5075e875186c83";
var FIXTURE_MANIFEST_SHA256 = "a056f3883a4c80918a7d906f652c122d39c2746e46ce5a50926a16fd9f14489b";
var CONTRACT_IDENTITY = {
  schema: "openagents.immortal.contract.v1",
  contract_version: 1,
  crate_name: "immortal",
  crate_version: "0.0.1",
  nips: [
    {
      lane: "official",
      repo: "https://github.com/nostr-protocol/nips",
      subdir: ".",
      commit: "c53877571f96eb423661fc23c620d629d37b8f19"
    },
    {
      lane: "block",
      repo: "https://github.com/block/buzz",
      subdir: "docs/nips",
      commit: "feccf4eabc23fdba94ce3537a194357ed17b197c"
    },
    {
      lane: "openagents",
      repo: "https://github.com/OpenAgentsInc/openagents",
      subdir: "docs/nips",
      commit: "b839dd43bad7915a35639b562d4d7ebf7d51c3f6"
    }
  ]
};
var FIXTURE_MANIFEST_IDENTITY = {
  schema: "openagents.immortal.fixture-manifest.v1",
  manifest_version: 1,
  algorithm: "sha256"
};
var MKT_KIND_DEFINITIONS = [
  {
    kind: 39600,
    lane: "openagents",
    identifier: "NIP-MKT",
    name: "provider_profile",
    classification: "addressable",
    publication: "public_head",
    immutability: "nip01_addressable",
    enforcement_scope: "relay"
  },
  {
    kind: 39601,
    lane: "openagents",
    identifier: "NIP-MKT",
    name: "offering",
    classification: "addressable",
    publication: "public_head",
    immutability: "nip01_addressable",
    enforcement_scope: "relay"
  },
  {
    kind: 39602,
    lane: "openagents",
    identifier: "NIP-MKT",
    name: "profile_descriptor",
    classification: "addressable",
    publication: "public_head",
    immutability: "nip01_addressable",
    enforcement_scope: "relay"
  },
  {
    kind: 39603,
    lane: "openagents",
    identifier: "NIP-MKT",
    name: "public_market_receipt",
    classification: "addressable",
    publication: "public_head",
    immutability: "nip01_addressable",
    enforcement_scope: "relay"
  },
  {
    kind: 39604,
    lane: "openagents",
    identifier: "NIP-MKT",
    name: "rfq",
    classification: "addressable",
    publication: "private_wrapped",
    immutability: "exact_signed_coordinate",
    enforcement_scope: "client_and_internal_store"
  },
  {
    kind: 39605,
    lane: "openagents",
    identifier: "NIP-MKT",
    name: "quote",
    classification: "addressable",
    publication: "private_wrapped",
    immutability: "exact_signed_coordinate",
    enforcement_scope: "client_and_internal_store"
  },
  {
    kind: 39606,
    lane: "openagents",
    identifier: "NIP-MKT",
    name: "order",
    classification: "addressable",
    publication: "private_wrapped",
    immutability: "exact_signed_coordinate",
    enforcement_scope: "client_and_internal_store"
  },
  {
    kind: 39607,
    lane: "openagents",
    identifier: "NIP-MKT",
    name: "status",
    classification: "addressable",
    publication: "private_wrapped",
    immutability: "exact_signed_coordinate",
    enforcement_scope: "client_and_internal_store"
  },
  {
    kind: 39608,
    lane: "openagents",
    identifier: "NIP-MKT",
    name: "cancel",
    classification: "addressable",
    publication: "private_wrapped",
    immutability: "exact_signed_coordinate",
    enforcement_scope: "client_and_internal_store"
  },
  {
    kind: 39609,
    lane: "openagents",
    identifier: "NIP-MKT",
    name: "close",
    classification: "addressable",
    publication: "private_wrapped",
    immutability: "exact_signed_coordinate",
    enforcement_scope: "client_and_internal_store"
  }
];
var MKT_KINDS = [
  39600,
  39601,
  39602,
  39603,
  39604,
  39605,
  39606,
  39607,
  39608,
  39609
];
var PUBLIC_MKT_KINDS = [39600, 39601, 39602, 39603];
var PRIVATE_MKT_KINDS = [39604, 39605, 39606, 39607, 39608, 39609];
var MKT_KIND_NAMES = {
  "39600": "provider_profile",
  "39601": "offering",
  "39602": "profile_descriptor",
  "39603": "public_market_receipt",
  "39604": "rfq",
  "39605": "quote",
  "39606": "order",
  "39607": "status",
  "39608": "cancel",
  "39609": "close"
};
var GATEWAY_LIMITS = [
  {
    name: "frame_bytes",
    environment: "IMMORTAL_MAX_FRAME_BYTES",
    default: 131072,
    minimum: 1024,
    maximum: 16777216,
    unit: "bytes"
  },
  {
    name: "subscriptions_per_connection",
    environment: "IMMORTAL_MAX_SUBSCRIPTIONS",
    default: 32,
    minimum: 1,
    maximum: 1024,
    unit: "count"
  },
  {
    name: "filters_per_request",
    environment: "IMMORTAL_MAX_FILTERS",
    default: 16,
    minimum: 1,
    maximum: 256,
    unit: "count"
  },
  {
    name: "results_per_filter",
    environment: "IMMORTAL_MAX_LIMIT",
    default: 1e3,
    minimum: 1,
    maximum: 1e5,
    unit: "count"
  },
  {
    name: "query_cost",
    environment: "IMMORTAL_MAX_QUERY_COST",
    default: 1e5,
    minimum: 1,
    maximum: 1e9,
    unit: "estimated_rows"
  },
  {
    name: "events_per_minute_ip",
    environment: "IMMORTAL_RATE_EVENTS_PER_MIN_IP",
    default: 120,
    minimum: 1,
    maximum: 4294967295,
    unit: "events_per_minute"
  },
  {
    name: "events_per_minute_pubkey",
    environment: "IMMORTAL_RATE_EVENTS_PER_MIN_PUBKEY",
    default: 60,
    minimum: 1,
    maximum: 4294967295,
    unit: "events_per_minute"
  },
  {
    name: "gift_wraps_per_minute_recipient",
    environment: "IMMORTAL_RATE_GIFT_WRAPS_PER_MIN_RECIPIENT",
    default: 60,
    minimum: 1,
    maximum: 4294967295,
    unit: "events_per_minute"
  },
  {
    name: "observer_events_per_second_ip",
    environment: "IMMORTAL_RATE_OBSERVER_PER_SEC_IP",
    default: 200,
    minimum: 1,
    maximum: 4294967295,
    unit: "events_per_second"
  },
  {
    name: "observer_events_per_second_agent",
    environment: "IMMORTAL_RATE_OBSERVER_PER_SEC_AGENT",
    default: 100,
    minimum: 1,
    maximum: 4294967295,
    unit: "events_per_second"
  },
  {
    name: "requests_per_minute_ip",
    environment: "IMMORTAL_RATE_REQ_PER_MIN_IP",
    default: 120,
    minimum: 1,
    maximum: 4294967295,
    unit: "requests_per_minute"
  },
  {
    name: "media_requests_per_minute_ip",
    environment: "IMMORTAL_RATE_MEDIA_PER_MIN_IP",
    default: 30,
    minimum: 1,
    maximum: 4294967295,
    unit: "requests_per_minute"
  },
  {
    name: "media_requests_per_minute_pubkey",
    environment: "IMMORTAL_RATE_MEDIA_PER_MIN_PUBKEY",
    default: 15,
    minimum: 1,
    maximum: 4294967295,
    unit: "requests_per_minute"
  },
  {
    name: "connections_per_ip",
    environment: "IMMORTAL_MAX_CONNECTIONS_PER_IP",
    default: 20,
    minimum: 1,
    maximum: 4096,
    unit: "count"
  },
  {
    name: "send_queue_capacity",
    environment: "IMMORTAL_SEND_QUEUE_CAPACITY",
    default: 256,
    minimum: 8,
    maximum: 65536,
    unit: "messages"
  }
];
var MKT_LIMITS = {
  discovery_content_bytes: 16384,
  receipt_content_bytes: 4096,
  private_signed_record_bytes: 32768,
  tags: 64,
  counterparties: 8,
  causal_or_evidence_references: 32,
  profiles: 16,
  relay_or_endpoint_hints: 8
};
var MKT_CLIENT_LIMITS = {
  discoveryContentBytes: 16384,
  receiptContentBytes: 4096,
  privateSignedRecordBytes: 32768,
  tags: 64,
  counterparties: 8,
  causalOrEvidenceReferences: 32,
  profiles: 16,
  relayOrEndpointHints: 8
};
var REQUIRED_TAGS = {
  cancel: ["order e", "action", "reason"],
  close: ["order e", "outcome", "terminal_at"],
  offering: ["d", "status", "published_at", "profile", "provider"],
  order: ["quote e", "provider p"],
  private_common: ["d", "session", "profile", "p", "alt"],
  profile_descriptor: ["d", "version", "x", "r", "status"],
  provider_profile: ["d", "status", "published_at", "profile"],
  public_market_receipt: ["d", "profile", "outcome", "x", "role"],
  quote: ["rfq e", "requester p", "expiration", "quote", "reservation"],
  rfq: ["provider p", "offering a", "expiration"],
  status: ["order e", "seq", "state", "previous e when seq > 0"]
};
var MKT_TAG_REQUIREMENTS_BY_KIND = {
  "39600": ["d", "status", "published_at", "profile"],
  "39601": ["d", "status", "published_at", "profile", "provider"],
  "39602": ["d", "version", "x", "r", "status"],
  "39603": ["d", "profile", "outcome", "x", "role"],
  "39604": ["d", "session", "profile", "p", "alt", "provider p", "offering a", "expiration"],
  "39605": [
    "d",
    "session",
    "profile",
    "p",
    "alt",
    "rfq e",
    "requester p",
    "expiration",
    "quote",
    "reservation"
  ],
  "39606": ["d", "session", "profile", "p", "alt", "quote e", "provider p"],
  "39607": [
    "d",
    "session",
    "profile",
    "p",
    "alt",
    "order e",
    "seq",
    "state",
    "previous e when seq > 0"
  ],
  "39608": ["d", "session", "profile", "p", "alt", "order e", "action", "reason"],
  "39609": ["d", "session", "profile", "p", "alt", "order e", "outcome", "terminal_at"]
};
var OPAQUE_TRANSPORT = {
  outer_kind: 1059,
  bare_private_publication: "rejected",
  relay_validates_inner: false,
  read_authorization: "nip42_authenticated_exact_single_p_recipient"
};
var OK_REASONS = {
  stored: "",
  duplicate: "duplicate: already have this event",
  blocked: "blocked: {bounded_detail}",
  relay_policy: "restricted: event is not allowed by relay policy",
  content_too_large: "invalid: event content is too large",
  too_many_tags: "invalid: event has too many tags",
  timestamp_outside_bounds: "invalid: event timestamp is outside relay bounds",
  auth_event: "invalid: authentication events cannot be published",
  deleted: "blocked: event is covered by a deletion request",
  superseded: "duplicate: newer replaceable event already stored",
  mkt_private_requires_gift_wrap: "restricted: mkt-private-requires-gift-wrap",
  mkt_idempotency_conflict: "invalid: idempotency-conflict",
  gift_wrap_recipient_rate: "rate-limited: gift-wrap recipient rate exceeded"
};
var CLOSED_REASONS = {
  request_rate: "rate-limited: REQ rate exceeded",
  count_rate: "rate-limited: COUNT rate exceeded",
  too_many_filters: "restricted: too many filters",
  gift_wrap_auth_required: "auth-required: gift-wrap reads require recipient authentication",
  gift_wrap_self_scope_required: "restricted: gift-wrap reads must be scoped to #p self",
  query_cost: "restricted: query cost exceeds the configured limit",
  count_bound: "restricted: count exceeds the configured query bound"
};
var REASON_PREFIXES = [
  "auth-required:",
  "blocked:",
  "duplicate:",
  "error:",
  "invalid:",
  "rate-limited:",
  "restricted:"
];
var MktKindSchema = Schema.Literals([
  39600,
  39601,
  39602,
  39603,
  39604,
  39605,
  39606,
  39607,
  39608,
  39609
]);
var PublicMktKindSchema = Schema.Literals([39600, 39601, 39602, 39603]);
var PrivateMktKindSchema = Schema.Literals([39604, 39605, 39606, 39607, 39608, 39609]);
var OkReasonCodeSchema = Schema.Literals([
  "stored",
  "duplicate",
  "blocked",
  "relay_policy",
  "content_too_large",
  "too_many_tags",
  "timestamp_outside_bounds",
  "auth_event",
  "deleted",
  "superseded",
  "mkt_private_requires_gift_wrap",
  "mkt_idempotency_conflict",
  "gift_wrap_recipient_rate"
]);
var ClosedReasonCodeSchema = Schema.Literals([
  "request_rate",
  "count_rate",
  "too_many_filters",
  "gift_wrap_auth_required",
  "gift_wrap_self_scope_required",
  "query_cost",
  "count_bound"
]);
var CancelActionSchema = Schema.Literals(["request", "accepted", "rejected", "effective"]);
var CloseOutcomeSchema = Schema.Literals([
  "completed",
  "rejected",
  "cancelled",
  "expired",
  "failed",
  "refunded",
  "disputed",
  "unresolved"
]);
var DescriptorStatusSchema = Schema.Literals([
  "draft",
  "active",
  "deprecated",
  "withdrawn"
]);
var OfferingStatusSchema = Schema.Literals(["active", "paused", "exhausted", "retired"]);
var ProviderStatusSchema = Schema.Literals(["active", "paused", "retired"]);
var PublicReceiptOutcomeSchema = Schema.Literals([
  "completed",
  "cancelled",
  "expired",
  "failed",
  "refunded",
  "disputed",
  "unresolved"
]);
var QuoteTypeSchema = Schema.Literals(["indicative", "firm"]);
var ReservationSchema = Schema.Literals(["none", "soft", "hard"]);
var StatusStateSchema = Schema.Literals([
  "accepted",
  "rejected",
  "awaiting_input",
  "funding_required",
  "funding_observed",
  "executing",
  "settlement_pending",
  "completed",
  "refund_pending",
  "refunded",
  "disputed",
  "failed"
]);
var HexIdentifierSchema = Schema.String.check(
  Schema.isPattern(/^[0-9a-f]{64}$/),
  Schema.isMaxLength(64)
);
var NamedIdentifierSchema = Schema.String.check(
  Schema.isPattern(/^[a-z0-9][a-z0-9._-]*$/),
  Schema.isMaxLength(64)
);
var MKT_ENVELOPE_SCHEMA = "openagents.mkt.v1";
var ProfileEnvelopeSchema = Schema.StructWithRest(
  Schema.Struct({
    schema: Schema.Literal(MKT_ENVELOPE_SCHEMA),
    profile: NamedIdentifierSchema,
    profile_version: Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1)),
    session_id: HexIdentifierSchema
  }),
  [Schema.Record(Schema.String, Schema.Json)]
);
var NostrTagSchema = Schema.NonEmptyArray(Schema.String);
var DecimalTimestampSchema = Schema.String.check(Schema.isPattern(/^(0|[1-9][0-9]*)$/));
var PositiveDecimalSchema = Schema.String.check(Schema.isPattern(/^[1-9][0-9]*$/));
var NonEmptyTagValueSchema = Schema.String.check(Schema.isMinLength(1));
var PublicIdentifierTagSchema = Schema.Tuple([Schema.Literal("d"), NamedIdentifierSchema]);
var PublicReceiptIdentifierTagSchema = Schema.Tuple([
  Schema.Literal("d"),
  NonEmptyTagValueSchema
]);
var PrivateIdentifierTagSchema = Schema.Tuple([Schema.Literal("d"), HexIdentifierSchema]);
var SessionTagSchema = Schema.Tuple([Schema.Literal("session"), HexIdentifierSchema]);
var ProfileTagSchema = Schema.Tuple([
  Schema.Literal("profile"),
  NamedIdentifierSchema,
  PositiveDecimalSchema
]);
var CounterpartyTagSchema = Schema.Tuple([
  Schema.Literal("p"),
  HexIdentifierSchema,
  Schema.String,
  Schema.Literals(["requester", "provider"])
]);
var EventReferenceTagSchema = Schema.Tuple([
  Schema.Literal("e"),
  HexIdentifierSchema,
  Schema.String,
  Schema.Literals([
    "rfq",
    "quote",
    "order",
    "previous",
    "status",
    "cancel",
    "close",
    "evidence",
    "settlement"
  ])
]);
var OfferingReferenceTagSchema = Schema.Tuple([
  Schema.Literal("a"),
  Schema.String.check(Schema.isPattern(/^39601:[0-9a-f]{64}:[a-z0-9][a-z0-9._-]*$/)),
  Schema.String,
  Schema.Literal("offering")
]);
var AltTagSchema = Schema.Tuple([Schema.Literal("alt"), NonEmptyTagValueSchema]);
var ProviderStatusTagSchema = Schema.Tuple([
  Schema.Literal("status"),
  ProviderStatusSchema
]);
var OfferingStatusTagSchema = Schema.Tuple([
  Schema.Literal("status"),
  OfferingStatusSchema
]);
var DescriptorStatusTagSchema = Schema.Tuple([
  Schema.Literal("status"),
  DescriptorStatusSchema
]);
var PublishedAtTagSchema = Schema.Tuple([
  Schema.Literal("published_at"),
  DecimalTimestampSchema
]);
var ProviderReferenceTagSchema = Schema.Tuple([
  Schema.Literal("provider"),
  Schema.String.check(Schema.isPattern(/^39600:[0-9a-f]{64}:[a-z0-9][a-z0-9._-]*$/))
]);
var VersionTagSchema = Schema.Tuple([Schema.Literal("version"), PositiveDecimalSchema]);
var DigestTagSchema = Schema.Tuple([Schema.Literal("x"), HexIdentifierSchema]);
var RetrievalTagSchema = Schema.Tuple([
  Schema.Literal("r"),
  Schema.String.check(Schema.isPattern(/^https?:\/\/\S+$/))
]);
var PublicReceiptOutcomeTagSchema = Schema.Tuple([
  Schema.Literal("outcome"),
  PublicReceiptOutcomeSchema
]);
var RoleTagSchema = Schema.Tuple([Schema.Literal("role"), NamedIdentifierSchema]);
var ExpirationTagSchema = Schema.Tuple([
  Schema.Literal("expiration"),
  DecimalTimestampSchema
]);
var QuoteTypeTagSchema = Schema.Tuple([Schema.Literal("quote"), QuoteTypeSchema]);
var ReservationTagSchema = Schema.Tuple([
  Schema.Literal("reservation"),
  ReservationSchema
]);
var SequenceTagSchema = Schema.Tuple([Schema.Literal("seq"), DecimalTimestampSchema]);
var StatusStateTagSchema = Schema.Tuple([Schema.Literal("state"), StatusStateSchema]);
var CancelActionTagSchema = Schema.Tuple([Schema.Literal("action"), CancelActionSchema]);
var CancelReasonTagSchema = Schema.Tuple([
  Schema.Literal("reason"),
  NonEmptyTagValueSchema
]);
var CloseOutcomeTagSchema = Schema.Tuple([Schema.Literal("outcome"), CloseOutcomeSchema]);
var TerminalAtTagSchema = Schema.Tuple([
  Schema.Literal("terminal_at"),
  DecimalTimestampSchema
]);
var isProfileEnvelope = Schema.is(ProfileEnvelopeSchema);
var isPrivateIdentifierTag = Schema.is(PrivateIdentifierTagSchema);
var isSessionTag = Schema.is(SessionTagSchema);
var isProfileTag = Schema.is(ProfileTagSchema);
var isCounterpartyTag = Schema.is(CounterpartyTagSchema);
var isEventReferenceTag = Schema.is(EventReferenceTagSchema);
var isOfferingReferenceTag = Schema.is(OfferingReferenceTagSchema);
var isAltTag = Schema.is(AltTagSchema);
var isPublicIdentifierTag = Schema.is(PublicIdentifierTagSchema);
var isProviderStatusTag = Schema.is(ProviderStatusTagSchema);
var isPublishedAtTag = Schema.is(PublishedAtTagSchema);
var isOfferingStatusTag = Schema.is(OfferingStatusTagSchema);
var isProviderReferenceTag = Schema.is(ProviderReferenceTagSchema);
var isVersionTag = Schema.is(VersionTagSchema);
var isDigestTag = Schema.is(DigestTagSchema);
var isRetrievalTag = Schema.is(RetrievalTagSchema);
var isDescriptorStatusTag = Schema.is(DescriptorStatusTagSchema);
var isPublicReceiptIdentifierTag = Schema.is(PublicReceiptIdentifierTagSchema);
var isPublicReceiptOutcomeTag = Schema.is(PublicReceiptOutcomeTagSchema);
var isRoleTag = Schema.is(RoleTagSchema);
var isExpirationTag = Schema.is(ExpirationTagSchema);
var isQuoteTypeTag = Schema.is(QuoteTypeTagSchema);
var isReservationTag = Schema.is(ReservationTagSchema);
var isSequenceTag = Schema.is(SequenceTagSchema);
var isStatusStateTag = Schema.is(StatusStateTagSchema);
var isCancelActionTag = Schema.is(CancelActionTagSchema);
var isCancelReasonTag = Schema.is(CancelReasonTagSchema);
var isCloseOutcomeTag = Schema.is(CloseOutcomeTagSchema);
var isTerminalAtTag = Schema.is(TerminalAtTagSchema);
function matchesTagRequirement(tags, requirement) {
  if (requirement === "previous e when seq > 0") {
    const sequence = tags.find((tag) => tag[0] === "seq")?.[1];
    return sequence === "0" || tags.some((tag) => tag[0] === "e" && tag[3] === "previous");
  }
  const [markerOrName, tagName] = requirement.split(" ");
  return tags.some(
    (tag) => tagName === "e" || tagName === "p" || tagName === "a" ? tag[0] === tagName && tag[3] === markerOrName : tag[0] === markerOrName
  );
}
function tagGrammarCheck(kind, requirements) {
  return Schema.makeFilter((tags) => {
    const issues = [];
    const missing = requirements.filter((requirement) => !matchesTagRequirement(tags, requirement));
    if (missing.length > 0)
      issues.push(`kind ${kind} is missing required tags: ${missing.join(", ")}`);
    const named = (name) => tags.filter((tag) => tag[0] === name);
    const marked = (name, marker) => tags.filter((tag) => tag[0] === name && tag[3] === marker);
    const one = (label, candidates, valid) => {
      if (candidates.length !== 1) issues.push(`${label} must occur exactly once`);
      else if (!valid(candidates[0])) issues.push(`${label} has invalid grammar`);
    };
    if (tags.length > MKT_LIMITS.tags) issues.push("too many tags");
    if (named("p").length > MKT_LIMITS.counterparties) issues.push("too many counterparties");
    if (named("profile").length > MKT_LIMITS.profiles) issues.push("too many profiles");
    if (named("e").length > MKT_LIMITS.causal_or_evidence_references)
      issues.push("too many references");
    for (const tag of named("e")) {
      if (!isEventReferenceTag(tag)) issues.push("event reference has invalid grammar");
    }
    for (const tag of marked("a", "offering")) {
      if (!isOfferingReferenceTag(tag)) issues.push("offering reference has invalid grammar");
    }
    if (kind >= 39604) {
      one("d", named("d"), isPrivateIdentifierTag);
      one("session", named("session"), isSessionTag);
      one("profile", named("profile"), isProfileTag);
      one("alt", named("alt"), isAltTag);
      const counterparties = named("p");
      if (counterparties.length === 0) issues.push("a counterparty must occur");
      else if (!counterparties.every(isCounterpartyTag))
        issues.push("counterparty has invalid grammar");
    }
    switch (kind) {
      case 39600:
        one("d", named("d"), isPublicIdentifierTag);
        one("status", named("status"), isProviderStatusTag);
        one("published_at", named("published_at"), isPublishedAtTag);
        if (!named("profile").every(isProfileTag)) issues.push("profile has invalid grammar");
        break;
      case 39601:
        one("d", named("d"), isPublicIdentifierTag);
        one("profile", named("profile"), isProfileTag);
        one("status", named("status"), isOfferingStatusTag);
        one("provider", named("provider"), isProviderReferenceTag);
        one("published_at", named("published_at"), isPublishedAtTag);
        break;
      case 39602:
        one("d", named("d"), isPublicIdentifierTag);
        one("version", named("version"), isVersionTag);
        one("x", named("x"), isDigestTag);
        one("r", named("r"), isRetrievalTag);
        one("status", named("status"), isDescriptorStatusTag);
        break;
      case 39603:
        one("d", named("d"), isPublicReceiptIdentifierTag);
        one("profile", named("profile"), isProfileTag);
        one("outcome", named("outcome"), isPublicReceiptOutcomeTag);
        one("x", named("x"), isDigestTag);
        one("role", named("role"), isRoleTag);
        break;
      case 39604:
        if (marked("p", "provider").length === 0) issues.push("provider counterparty is required");
        one("offering reference", marked("a", "offering"), isOfferingReferenceTag);
        one("expiration", named("expiration"), isExpirationTag);
        break;
      case 39605:
        one("rfq reference", marked("e", "rfq"), isEventReferenceTag);
        one("requester counterparty", marked("p", "requester"), isCounterpartyTag);
        one("expiration", named("expiration"), isExpirationTag);
        one("quote", named("quote"), isQuoteTypeTag);
        one("reservation", named("reservation"), isReservationTag);
        break;
      case 39606:
        one("quote reference", marked("e", "quote"), isEventReferenceTag);
        one("provider counterparty", marked("p", "provider"), isCounterpartyTag);
        break;
      case 39607: {
        one("order reference", marked("e", "order"), isEventReferenceTag);
        one("seq", named("seq"), isSequenceTag);
        one("state", named("state"), isStatusStateTag);
        const sequence = named("seq")[0]?.[1];
        const previous = marked("e", "previous");
        if (sequence === "0" && previous.length !== 0)
          issues.push("sequence zero must not have previous");
        if (sequence !== void 0 && sequence !== "0")
          one("previous reference", previous, isEventReferenceTag);
        break;
      }
      case 39608:
        one("order reference", marked("e", "order"), isEventReferenceTag);
        one("action", named("action"), isCancelActionTag);
        one("reason", named("reason"), isCancelReasonTag);
        break;
      case 39609:
        one("order reference", marked("e", "order"), isEventReferenceTag);
        one("outcome", named("outcome"), isCloseOutcomeTag);
        one("terminal_at", named("terminal_at"), isTerminalAtTag);
        break;
    }
    return issues;
  });
}
function eventContentCheck(kind) {
  return Schema.makeFilter(
    (event) => {
      let content;
      try {
        content = JSON.parse(event.content);
      } catch {
        return `kind ${kind} content must be valid JSON`;
      }
      if (typeof content !== "object" || content === null || Array.isArray(content)) {
        return `kind ${kind} content must be a JSON object`;
      }
      if (kind < 39604) return void 0;
      if (!isProfileEnvelope(content)) {
        return `kind ${kind} content must use the MKT profile envelope`;
      }
      const profile = event.tags.find((tag) => tag[0] === "profile");
      const session = event.tags.find((tag) => tag[0] === "session");
      if (profile?.[1] !== content.profile || profile?.[2] !== String(content.profile_version) || session?.[1] !== content.session_id) {
        return `kind ${kind} content envelope must agree with profile and session tags`;
      }
      return void 0;
    }
  );
}
var EventSignatureSchema = Schema.String.check(Schema.isPattern(/^[0-9a-f]{128}$/));
var NostrEventSchema = Schema.Struct({
  id: HexIdentifierSchema,
  pubkey: HexIdentifierSchema,
  created_at: Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
  kind: Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0)),
  tags: Schema.Array(NostrTagSchema),
  content: Schema.String,
  sig: EventSignatureSchema
});
var ProviderProfileEventSchema = Schema.Struct({
  ...NostrEventSchema.fields,
  kind: Schema.Literal(39600),
  tags: Schema.Array(NostrTagSchema).check(
    tagGrammarCheck(39600, MKT_TAG_REQUIREMENTS_BY_KIND[39600])
  )
}).check(eventContentCheck(39600));
var OfferingEventSchema = Schema.Struct({
  ...NostrEventSchema.fields,
  kind: Schema.Literal(39601),
  tags: Schema.Array(NostrTagSchema).check(
    tagGrammarCheck(39601, MKT_TAG_REQUIREMENTS_BY_KIND[39601])
  )
}).check(eventContentCheck(39601));
var ProfileDescriptorEventSchema = Schema.Struct({
  ...NostrEventSchema.fields,
  kind: Schema.Literal(39602),
  tags: Schema.Array(NostrTagSchema).check(
    tagGrammarCheck(39602, MKT_TAG_REQUIREMENTS_BY_KIND[39602])
  )
}).check(eventContentCheck(39602));
var PublicMarketReceiptEventSchema = Schema.Struct({
  ...NostrEventSchema.fields,
  kind: Schema.Literal(39603),
  tags: Schema.Array(NostrTagSchema).check(
    tagGrammarCheck(39603, MKT_TAG_REQUIREMENTS_BY_KIND[39603])
  )
}).check(eventContentCheck(39603));
var RfqEventSchema = Schema.Struct({
  ...NostrEventSchema.fields,
  kind: Schema.Literal(39604),
  tags: Schema.Array(NostrTagSchema).check(
    tagGrammarCheck(39604, MKT_TAG_REQUIREMENTS_BY_KIND[39604])
  )
}).check(eventContentCheck(39604));
var QuoteEventSchema = Schema.Struct({
  ...NostrEventSchema.fields,
  kind: Schema.Literal(39605),
  tags: Schema.Array(NostrTagSchema).check(
    tagGrammarCheck(39605, MKT_TAG_REQUIREMENTS_BY_KIND[39605])
  )
}).check(eventContentCheck(39605));
var OrderEventSchema = Schema.Struct({
  ...NostrEventSchema.fields,
  kind: Schema.Literal(39606),
  tags: Schema.Array(NostrTagSchema).check(
    tagGrammarCheck(39606, MKT_TAG_REQUIREMENTS_BY_KIND[39606])
  )
}).check(eventContentCheck(39606));
var StatusEventSchema = Schema.Struct({
  ...NostrEventSchema.fields,
  kind: Schema.Literal(39607),
  tags: Schema.Array(NostrTagSchema).check(
    tagGrammarCheck(39607, MKT_TAG_REQUIREMENTS_BY_KIND[39607])
  )
}).check(eventContentCheck(39607));
var CancelEventSchema = Schema.Struct({
  ...NostrEventSchema.fields,
  kind: Schema.Literal(39608),
  tags: Schema.Array(NostrTagSchema).check(
    tagGrammarCheck(39608, MKT_TAG_REQUIREMENTS_BY_KIND[39608])
  )
}).check(eventContentCheck(39608));
var CloseEventSchema = Schema.Struct({
  ...NostrEventSchema.fields,
  kind: Schema.Literal(39609),
  tags: Schema.Array(NostrTagSchema).check(
    tagGrammarCheck(39609, MKT_TAG_REQUIREMENTS_BY_KIND[39609])
  )
}).check(eventContentCheck(39609));
var MktEventSchema = Schema.Union([
  ProviderProfileEventSchema,
  OfferingEventSchema,
  ProfileDescriptorEventSchema,
  PublicMarketReceiptEventSchema,
  RfqEventSchema,
  QuoteEventSchema,
  OrderEventSchema,
  StatusEventSchema,
  CancelEventSchema,
  CloseEventSchema
]);

// vendor/nip-mkt/src/relay.ts
import { Effect, Schema as Schema2 } from "effect";
var NIP_MKT_SDK_VERSION = "0.1.2";
var IMMORTAL_RELAY_SOFTWARE = "https://github.com/OpenAgentsInc/immortal";
var IMMORTAL_RELAY_EXTENSION = "nip-mkt";
var RelayProbeCodeSchema = Schema2.Literals([
  "nip11_unavailable",
  "invalid_nip11",
  "not_immortal",
  "contract_version_mismatch",
  "nip_mkt_unavailable",
  "websocket_failed"
]);
var RelayProbeError = class extends Schema2.TaggedErrorClass()("RelayProbeError", {
  code: RelayProbeCodeSchema,
  message: Schema2.String
}) {
};
var RelayInformationSchema = Schema2.Struct({
  name: Schema2.optional(Schema2.String),
  software: Schema2.String,
  version: Schema2.String,
  supported_nips: Schema2.Array(Schema2.Number),
  supported_extensions: Schema2.Array(Schema2.String)
});
var decodeRelayInformation = Schema2.decodeUnknownSync(RelayInformationSchema);
function relayProbeError(code, cause) {
  return new RelayProbeError({
    code,
    message: cause instanceof Error ? cause.message : String(cause)
  });
}
function relayInformationUrl(relayUrl) {
  const url = new URL(relayUrl);
  if (url.protocol === "wss:") url.protocol = "https:";
  else if (url.protocol === "ws:") url.protocol = "http:";
  else throw new Error("Relay URL must use ws:// or wss://");
  return url.toString();
}
async function fetchRelayInformation(relayUrl, timeoutMs) {
  const response = await fetch(relayInformationUrl(relayUrl), {
    headers: { Accept: "application/nostr+json" },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) {
    throw new Error(`NIP-11 returned ${response.status} ${response.statusText}`.trim());
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/nostr+json")) {
    throw new Error(`NIP-11 returned unsupported content type ${contentType || "missing"}`);
  }
  return response.json();
}
function randomHex(bytes) {
  return Array.from(
    globalThis.crypto.getRandomValues(new Uint8Array(bytes)),
    (byte) => byte.toString(16).padStart(2, "0")
  ).join("");
}
async function probeSnapshot(relayUrl, timeoutMs) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const subscriptionId = `mkt-probe-${globalThis.crypto.randomUUID()}`;
    const impossibleEventId = randomHex(32);
    let socket;
    let connectedAt;
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket?.send(JSON.stringify(["CLOSE", subscriptionId]));
      } catch {
      }
      try {
        socket?.close();
      } catch {
      }
      if (result.error !== void 0) reject(result.error);
      else resolve({ websocketLatencyMs: (connectedAt ?? Date.now()) - startedAt });
    };
    const timer = setTimeout(
      () => finish({ error: new Error(`WebSocket or EOSE timeout after ${timeoutMs}ms`) }),
      timeoutMs
    );
    try {
      socket = new WebSocket(relayUrl);
    } catch (cause) {
      finish({ error: cause instanceof Error ? cause : new Error(String(cause)) });
      return;
    }
    socket.addEventListener("open", () => {
      connectedAt = Date.now();
      try {
        socket?.send(
          JSON.stringify(["REQ", subscriptionId, { ids: [impossibleEventId], limit: 1 }])
        );
      } catch (cause) {
        finish({ error: cause instanceof Error ? cause : new Error(String(cause)) });
      }
    });
    socket.addEventListener(
      "error",
      () => finish({ error: new Error(`WebSocket error from ${relayUrl}`) })
    );
    socket.addEventListener("close", () => {
      if (!settled) finish({ error: new Error("Relay closed before EOSE") });
    });
    socket.addEventListener("message", (event) => {
      if (typeof event.data !== "string") {
        finish({ error: new Error("Relay returned a non-text Nostr frame") });
        return;
      }
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        finish({ error: new Error("Relay returned invalid JSON") });
        return;
      }
      if (!Array.isArray(message) || message[1] !== subscriptionId) return;
      if (message[0] === "EVENT") {
        finish({ error: new Error("Relay returned an event for an exact random event ID") });
      } else if (message[0] === "EOSE") {
        finish({});
      } else if (message[0] === "CLOSED") {
        finish({ error: new Error(String(message[2] ?? "Relay closed the subscription")) });
      }
    });
  });
}
var probeImmortalRelay = Effect.fn("NipMkt.probeImmortalRelay")(function* (relayUrl, options = {}) {
  const timeoutMs = options.timeoutMs ?? 1e4;
  const startedAt = Date.now();
  const relayInformation = yield* Effect.tryPromise({
    try: () => fetchRelayInformation(relayUrl, timeoutMs),
    catch: (cause) => relayProbeError("nip11_unavailable", cause)
  });
  const information = yield* Effect.try({
    try: () => decodeRelayInformation(relayInformation),
    catch: (cause) => relayProbeError("invalid_nip11", cause)
  });
  const nip11CompletedAt = Date.now();
  if (information.software !== IMMORTAL_RELAY_SOFTWARE) {
    return yield* relayProbeError(
      "not_immortal",
      `Expected ${IMMORTAL_RELAY_SOFTWARE}, received ${information.software}`
    );
  }
  if (information.version !== CONTRACT_IDENTITY.crate_version) {
    return yield* relayProbeError(
      "contract_version_mismatch",
      `SDK contract ${CONTRACT_IDENTITY.crate_version} does not match relay ${information.version}`
    );
  }
  if (!information.supported_extensions.includes(IMMORTAL_RELAY_EXTENSION)) {
    return yield* relayProbeError(
      "nip_mkt_unavailable",
      `Relay does not advertise ${IMMORTAL_RELAY_EXTENSION}`
    );
  }
  const snapshot = yield* Effect.tryPromise({
    try: () => probeSnapshot(relayUrl, timeoutMs),
    catch: (cause) => relayProbeError("websocket_failed", cause)
  });
  const completedAt = Date.now();
  return {
    relayUrl,
    ...information.name === void 0 ? {} : { relayName: information.name },
    relaySoftware: information.software,
    relayVersion: information.version,
    supportedNips: information.supported_nips,
    supportedExtensions: information.supported_extensions,
    sdkVersion: NIP_MKT_SDK_VERSION,
    contractSourceCommit: CONTRACT_SOURCE_COMMIT,
    contractVersion: CONTRACT_IDENTITY.crate_version,
    websocketConnected: true,
    snapshotComplete: true,
    nip11LatencyMs: nip11CompletedAt - startedAt,
    websocketLatencyMs: snapshot.websocketLatencyMs,
    totalLatencyMs: completedAt - startedAt,
    checkedAt: new Date(completedAt).toISOString()
  };
});

// vendor/nip-mkt/src/state.ts
import { Effect as Effect2, Schema as Schema3 } from "effect";
var MktClientStateError = class extends Schema3.TaggedErrorClass()(
  "MktClientStateError",
  { code: Schema3.Literals(["expired"]), message: Schema3.String }
) {
};
function createPrivateAdmissionStore() {
  return { records: /* @__PURE__ */ new Map() };
}
function privateCoordinate(event) {
  const identifiers = event.tags.filter((tag) => tag[0] === "d");
  if (identifiers.length !== 1 || identifiers[0]?.length !== 2) {
    throw new Error("private MKT event requires exactly one d tag");
  }
  return `${event.pubkey}:${event.kind}:${identifiers[0][1]}`;
}
function admitPrivateRecord(store, event, raw, result) {
  const coordinate = privateCoordinate(event);
  const stored = store.records.get(coordinate);
  if (stored === void 0) {
    store.records.set(coordinate, { id: event.id, raw, result });
    return { decision: "stored", coordinate, result };
  }
  if (stored.id === event.id && stored.raw === raw) {
    return { decision: "duplicate", coordinate, previousResult: stored.result };
  }
  return {
    decision: "idempotency-conflict",
    coordinate,
    code: "idempotency-conflict",
    reasonCode: "mkt_idempotency_conflict",
    reasonMessage: OK_REASONS.mkt_idempotency_conflict
  };
}
function generateIdempotencyKey(randomBytes2) {
  const bytes = randomBytes2 ?? globalThis.crypto.getRandomValues(new Uint8Array(32));
  if (bytes.byteLength !== 32) throw new Error("idempotency material must contain 32 bytes");
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function analyzeStatusSequence(statuses) {
  if (statuses.length === 0)
    return { decision: "contiguous", lastContiguousSeq: -1, retainIds: [] };
  const streams = new Set(
    statuses.map((status) => `${status.sessionId}:${status.orderId}:${status.author}`)
  );
  if (streams.size !== 1)
    throw new Error("status sequence analysis requires one session, order, and signer");
  const grouped = /* @__PURE__ */ new Map();
  for (const status of statuses) {
    const key = `${status.orderId}:${status.author}:${status.seq}`;
    const existing = grouped.get(key) ?? [];
    existing.push(status);
    grouped.set(key, existing);
  }
  for (const records of grouped.values()) {
    const ids = [...new Set(records.map((record) => record.id))];
    if (ids.length > 1) {
      const record = records[0];
      return {
        decision: "fork",
        forkKey: {
          sessionId: record.sessionId,
          orderId: record.orderId,
          author: record.author,
          seq: record.seq
        },
        retainIds: ids,
        advanceState: false
      };
    }
  }
  const sequences = Array.from(new Set(statuses.map((status) => status.seq)));
  sequences.sort((left, right) => left - right);
  const maximum = sequences.at(-1);
  const missingSequences = [];
  let lastContiguousSeq = -1;
  for (let sequence = 0; sequence <= maximum; sequence += 1) {
    if (sequences.includes(sequence)) {
      if (missingSequences.length === 0) lastContiguousSeq = sequence;
    } else {
      missingSequences.push(sequence);
    }
  }
  return missingSequences.length === 0 ? { decision: "contiguous", lastContiguousSeq, retainIds: statuses.map(({ id }) => id) } : {
    decision: "gap",
    missingSequences,
    lastContiguousSeq,
    retainIds: statuses.map(({ id }) => id)
  };
}
function activeSupersedingQuote(records) {
  if (records.length === 0) throw new Error("at least one quote is required");
  const superseded = new Set(
    records.flatMap((record) => record.previous ? [record.previous] : [])
  );
  const active = records.filter((record) => !superseded.has(record.id));
  if (active.length !== 1) throw new Error("quote supersession is ambiguous");
  return {
    decision: "supersede",
    activeQuoteId: active[0].id,
    retainIds: records.map((record) => record.id)
  };
}
function reserveCapacity(capacity, quotes) {
  let reserved = 0;
  for (const quote of quotes) {
    if (quote.reservation !== "hard") continue;
    if (reserved + quote.units > capacity)
      return {
        decision: "conflict",
        code: "double_reservation",
        retainIds: quotes.map(({ id }) => id),
        effectiveReservedUnits: reserved
      };
    reserved += quote.units;
  }
  return {
    decision: "reserved",
    retainIds: quotes.map(({ id }) => id),
    effectiveReservedUnits: reserved
  };
}
function isExpired(expiration, observedAt) {
  return expiration <= observedAt;
}
var ensureNotExpired = Effect2.fn("NipMkt.ensureNotExpired")(function* (expiration, observedAt) {
  if (isExpired(expiration, observedAt)) {
    return yield* new MktClientStateError({ code: "expired", message: "record is expired" });
  }
});
function expiryDecision(expiration, observedAt) {
  return isExpired(expiration, observedAt) ? {
    decision: "reject",
    code: "expired",
    inclusive: true,
    performExternalEffect: false
  } : { decision: "accept", inclusive: true, performExternalEffect: true };
}
function authorizeParticipant(author, allowedAuthors) {
  return allowedAuthors.includes(author);
}
function authorizationDecision(kind, author, allowedAuthors) {
  if (authorizeParticipant(author, allowedAuthors)) return { decision: "accept" };
  if (kind === 39607)
    return { decision: "reject", code: "unauthorized_status", advanceState: false };
  if (kind === 39608) return { decision: "reject", code: "unauthorized_cancel", cancelled: false };
  return { decision: "reject", code: "unauthorized_close", terminal: false };
}
function missingCausalRecords(localIds, causalIds) {
  const local = new Set(localIds);
  return causalIds.filter((id) => !local.has(id));
}
function settlementIsFinal(evidence) {
  return evidence.final && (evidence.rung === "measured" || evidence.rung === "verified");
}
function settlementDecision(evidence) {
  const settled = settlementIsFinal(evidence);
  return settled ? { decision: "settled", displayRung: evidence.rung, settled: true } : {
    decision: "overclaim",
    code: "settlement_overclaim",
    displayRung: evidence.rung,
    settled: false
  };
}
function evidenceMatchesClaim(status, evidence) {
  return status.evidenceId === evidence.id && status.subjectId === evidence.subjectId && status.claimedRung === evidence.rung;
}
function evidenceDecision(status, evidence) {
  const matches = evidenceMatchesClaim(status, evidence);
  return matches ? {
    decision: "match",
    displayRung: evidence.rung,
    advanceVerifiedState: true
  } : {
    decision: "mismatch",
    code: "evidence_subject_or_rung_mismatch",
    displayRung: "claimed",
    advanceVerifiedState: false
  };
}
function recoveryDecision(localIds, causalIds) {
  const missingIds = missingCausalRecords(localIds, causalIds);
  return missingIds.length === 0 ? { decision: "complete", missingIds, synthesizeHistory: false } : {
    decision: "loss",
    code: "missing_causal_record",
    missingIds,
    synthesizeHistory: false
  };
}
function deduplicateDeliveries(deliveries) {
  const grouped = /* @__PURE__ */ new Map();
  for (const delivery of deliveries) {
    const records = grouped.get(delivery.event.id) ?? [];
    records.push(delivery);
    grouped.set(delivery.event.id, records);
  }
  return [...grouped.values()].map((records) => ({
    event: records[0].event,
    deliveries: records
  }));
}
function deliveryDeduplicationDecision(deliveries) {
  const records = deduplicateDeliveries(deliveries);
  if (records.length !== 1) throw new Error("delivery decision requires one logical record");
  return {
    decision: "deduplicate",
    dedupKey: records[0].event.id,
    logicalRecords: 1,
    retainDeliveryProvenance: records[0].deliveries.map(({ wrapId }) => wrapId),
    repeatExternalEffect: false
  };
}

// node_modules/.pnpm/@noble+hashes@1.7.1/node_modules/@noble/hashes/esm/crypto.js
var crypto = typeof globalThis === "object" && "crypto" in globalThis ? globalThis.crypto : void 0;

// node_modules/.pnpm/@noble+hashes@1.7.1/node_modules/@noble/hashes/esm/_assert.js
function anumber(n) {
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error("positive integer expected, got " + n);
}
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function abytes(b, ...lengths) {
  if (!isBytes(b))
    throw new Error("Uint8Array expected");
  if (lengths.length > 0 && !lengths.includes(b.length))
    throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
}
function ahash(h) {
  if (typeof h !== "function" || typeof h.create !== "function")
    throw new Error("Hash should be wrapped by utils.wrapConstructor");
  anumber(h.outputLen);
  anumber(h.blockLen);
}
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished)
    throw new Error("Hash#digest() has already been called");
}
function aoutput(out, instance) {
  abytes(out);
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error("digestInto() expects output buffer of length at least " + min);
  }
}

// node_modules/.pnpm/@noble+hashes@1.7.1/node_modules/@noble/hashes/esm/utils.js
function createView(arr) {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
function rotr(word, shift) {
  return word << 32 - shift | word >>> shift;
}
var hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
function bytesToHex(bytes) {
  abytes(bytes);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += hexes[bytes[i]];
  }
  return hex;
}
var asciis = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function asciiToBase16(ch) {
  if (ch >= asciis._0 && ch <= asciis._9)
    return ch - asciis._0;
  if (ch >= asciis.A && ch <= asciis.F)
    return ch - (asciis.A - 10);
  if (ch >= asciis.a && ch <= asciis.f)
    return ch - (asciis.a - 10);
  return;
}
function hexToBytes(hex) {
  if (typeof hex !== "string")
    throw new Error("hex string expected, got " + typeof hex);
  const hl = hex.length;
  const al = hl / 2;
  if (hl % 2)
    throw new Error("hex string expected, got unpadded hex of length " + hl);
  const array = new Uint8Array(al);
  for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
    const n1 = asciiToBase16(hex.charCodeAt(hi));
    const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
    if (n1 === void 0 || n2 === void 0) {
      const char = hex[hi] + hex[hi + 1];
      throw new Error('hex string expected, got non-hex character "' + char + '" at index ' + hi);
    }
    array[ai] = n1 * 16 + n2;
  }
  return array;
}
function utf8ToBytes(str) {
  if (typeof str !== "string")
    throw new Error("utf8ToBytes expected string, got " + typeof str);
  return new Uint8Array(new TextEncoder().encode(str));
}
function toBytes(data) {
  if (typeof data === "string")
    data = utf8ToBytes(data);
  abytes(data);
  return data;
}
function concatBytes(...arrays) {
  let sum = 0;
  for (let i = 0; i < arrays.length; i++) {
    const a = arrays[i];
    abytes(a);
    sum += a.length;
  }
  const res = new Uint8Array(sum);
  for (let i = 0, pad2 = 0; i < arrays.length; i++) {
    const a = arrays[i];
    res.set(a, pad2);
    pad2 += a.length;
  }
  return res;
}
var Hash = class {
  // Safe version that clones internal state
  clone() {
    return this._cloneInto();
  }
};
function wrapConstructor(hashCons) {
  const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
  const tmp = hashCons();
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = () => hashCons();
  return hashC;
}
function randomBytes(bytesLength = 32) {
  if (crypto && typeof crypto.getRandomValues === "function") {
    return crypto.getRandomValues(new Uint8Array(bytesLength));
  }
  if (crypto && typeof crypto.randomBytes === "function") {
    return crypto.randomBytes(bytesLength);
  }
  throw new Error("crypto.getRandomValues must be defined");
}

// node_modules/.pnpm/@noble+hashes@1.7.1/node_modules/@noble/hashes/esm/_md.js
function setBigUint64(view, byteOffset, value, isLE2) {
  if (typeof view.setBigUint64 === "function")
    return view.setBigUint64(byteOffset, value, isLE2);
  const _32n = BigInt(32);
  const _u32_max = BigInt(4294967295);
  const wh = Number(value >> _32n & _u32_max);
  const wl = Number(value & _u32_max);
  const h = isLE2 ? 4 : 0;
  const l = isLE2 ? 0 : 4;
  view.setUint32(byteOffset + h, wh, isLE2);
  view.setUint32(byteOffset + l, wl, isLE2);
}
function Chi(a, b, c) {
  return a & b ^ ~a & c;
}
function Maj(a, b, c) {
  return a & b ^ a & c ^ b & c;
}
var HashMD = class extends Hash {
  constructor(blockLen, outputLen, padOffset, isLE2) {
    super();
    this.blockLen = blockLen;
    this.outputLen = outputLen;
    this.padOffset = padOffset;
    this.isLE = isLE2;
    this.finished = false;
    this.length = 0;
    this.pos = 0;
    this.destroyed = false;
    this.buffer = new Uint8Array(blockLen);
    this.view = createView(this.buffer);
  }
  update(data) {
    aexists(this);
    const { view, buffer, blockLen } = this;
    data = toBytes(data);
    const len = data.length;
    for (let pos = 0; pos < len; ) {
      const take = Math.min(blockLen - this.pos, len - pos);
      if (take === blockLen) {
        const dataView = createView(data);
        for (; blockLen <= len - pos; pos += blockLen)
          this.process(dataView, pos);
        continue;
      }
      buffer.set(data.subarray(pos, pos + take), this.pos);
      this.pos += take;
      pos += take;
      if (this.pos === blockLen) {
        this.process(view, 0);
        this.pos = 0;
      }
    }
    this.length += data.length;
    this.roundClean();
    return this;
  }
  digestInto(out) {
    aexists(this);
    aoutput(out, this);
    this.finished = true;
    const { buffer, view, blockLen, isLE: isLE2 } = this;
    let { pos } = this;
    buffer[pos++] = 128;
    this.buffer.subarray(pos).fill(0);
    if (this.padOffset > blockLen - pos) {
      this.process(view, 0);
      pos = 0;
    }
    for (let i = pos; i < blockLen; i++)
      buffer[i] = 0;
    setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE2);
    this.process(view, 0);
    const oview = createView(out);
    const len = this.outputLen;
    if (len % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const outLen = len / 4;
    const state = this.get();
    if (outLen > state.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let i = 0; i < outLen; i++)
      oview.setUint32(4 * i, state[i], isLE2);
  }
  digest() {
    const { buffer, outputLen } = this;
    this.digestInto(buffer);
    const res = buffer.slice(0, outputLen);
    this.destroy();
    return res;
  }
  _cloneInto(to) {
    to || (to = new this.constructor());
    to.set(...this.get());
    const { blockLen, buffer, length, finished, destroyed, pos } = this;
    to.length = length;
    to.pos = pos;
    to.finished = finished;
    to.destroyed = destroyed;
    if (length % blockLen)
      to.buffer.set(buffer);
    return to;
  }
};

// node_modules/.pnpm/@noble+hashes@1.7.1/node_modules/@noble/hashes/esm/sha256.js
var SHA256_K = /* @__PURE__ */ new Uint32Array([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
var SHA256_IV = /* @__PURE__ */ new Uint32Array([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]);
var SHA256_W = /* @__PURE__ */ new Uint32Array(64);
var SHA256 = class extends HashMD {
  constructor() {
    super(64, 32, 8, false);
    this.A = SHA256_IV[0] | 0;
    this.B = SHA256_IV[1] | 0;
    this.C = SHA256_IV[2] | 0;
    this.D = SHA256_IV[3] | 0;
    this.E = SHA256_IV[4] | 0;
    this.F = SHA256_IV[5] | 0;
    this.G = SHA256_IV[6] | 0;
    this.H = SHA256_IV[7] | 0;
  }
  get() {
    const { A, B, C, D, E, F, G, H } = this;
    return [A, B, C, D, E, F, G, H];
  }
  // prettier-ignore
  set(A, B, C, D, E, F, G, H) {
    this.A = A | 0;
    this.B = B | 0;
    this.C = C | 0;
    this.D = D | 0;
    this.E = E | 0;
    this.F = F | 0;
    this.G = G | 0;
    this.H = H | 0;
  }
  process(view, offset) {
    for (let i = 0; i < 16; i++, offset += 4)
      SHA256_W[i] = view.getUint32(offset, false);
    for (let i = 16; i < 64; i++) {
      const W15 = SHA256_W[i - 15];
      const W2 = SHA256_W[i - 2];
      const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
      const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
      SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
    }
    let { A, B, C, D, E, F, G, H } = this;
    for (let i = 0; i < 64; i++) {
      const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
      const T1 = H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i] | 0;
      const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
      const T2 = sigma0 + Maj(A, B, C) | 0;
      H = G;
      G = F;
      F = E;
      E = D + T1 | 0;
      D = C;
      C = B;
      B = A;
      A = T1 + T2 | 0;
    }
    A = A + this.A | 0;
    B = B + this.B | 0;
    C = C + this.C | 0;
    D = D + this.D | 0;
    E = E + this.E | 0;
    F = F + this.F | 0;
    G = G + this.G | 0;
    H = H + this.H | 0;
    this.set(A, B, C, D, E, F, G, H);
  }
  roundClean() {
    SHA256_W.fill(0);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0);
    this.buffer.fill(0);
  }
};
var sha256 = /* @__PURE__ */ wrapConstructor(() => new SHA256());

// node_modules/.pnpm/@noble+hashes@1.7.1/node_modules/@noble/hashes/esm/hmac.js
var HMAC = class extends Hash {
  constructor(hash, _key) {
    super();
    this.finished = false;
    this.destroyed = false;
    ahash(hash);
    const key = toBytes(_key);
    this.iHash = hash.create();
    if (typeof this.iHash.update !== "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen;
    this.outputLen = this.iHash.outputLen;
    const blockLen = this.blockLen;
    const pad2 = new Uint8Array(blockLen);
    pad2.set(key.length > blockLen ? hash.create().update(key).digest() : key);
    for (let i = 0; i < pad2.length; i++)
      pad2[i] ^= 54;
    this.iHash.update(pad2);
    this.oHash = hash.create();
    for (let i = 0; i < pad2.length; i++)
      pad2[i] ^= 54 ^ 92;
    this.oHash.update(pad2);
    pad2.fill(0);
  }
  update(buf) {
    aexists(this);
    this.iHash.update(buf);
    return this;
  }
  digestInto(out) {
    aexists(this);
    abytes(out, this.outputLen);
    this.finished = true;
    this.iHash.digestInto(out);
    this.oHash.update(out);
    this.oHash.digestInto(out);
    this.destroy();
  }
  digest() {
    const out = new Uint8Array(this.oHash.outputLen);
    this.digestInto(out);
    return out;
  }
  _cloneInto(to) {
    to || (to = Object.create(Object.getPrototypeOf(this), {}));
    const { oHash, iHash, finished, destroyed, blockLen, outputLen } = this;
    to = to;
    to.finished = finished;
    to.destroyed = destroyed;
    to.blockLen = blockLen;
    to.outputLen = outputLen;
    to.oHash = oHash._cloneInto(to.oHash);
    to.iHash = iHash._cloneInto(to.iHash);
    return to;
  }
  destroy() {
    this.destroyed = true;
    this.oHash.destroy();
    this.iHash.destroy();
  }
};
var hmac = (hash, key, message) => new HMAC(hash, key).update(message).digest();
hmac.create = (hash, key) => new HMAC(hash, key);

// node_modules/.pnpm/@noble+curves@1.8.1/node_modules/@noble/curves/esm/abstract/utils.js
var utils_exports = {};
__export(utils_exports, {
  aInRange: () => aInRange,
  abool: () => abool,
  abytes: () => abytes2,
  bitGet: () => bitGet,
  bitLen: () => bitLen,
  bitMask: () => bitMask,
  bitSet: () => bitSet,
  bytesToHex: () => bytesToHex2,
  bytesToNumberBE: () => bytesToNumberBE,
  bytesToNumberLE: () => bytesToNumberLE,
  concatBytes: () => concatBytes2,
  createHmacDrbg: () => createHmacDrbg,
  ensureBytes: () => ensureBytes,
  equalBytes: () => equalBytes,
  hexToBytes: () => hexToBytes2,
  hexToNumber: () => hexToNumber,
  inRange: () => inRange,
  isBytes: () => isBytes2,
  memoized: () => memoized,
  notImplemented: () => notImplemented,
  numberToBytesBE: () => numberToBytesBE,
  numberToBytesLE: () => numberToBytesLE,
  numberToHexUnpadded: () => numberToHexUnpadded,
  numberToVarBytesBE: () => numberToVarBytesBE,
  utf8ToBytes: () => utf8ToBytes2,
  validateObject: () => validateObject
});
var _0n = /* @__PURE__ */ BigInt(0);
var _1n = /* @__PURE__ */ BigInt(1);
var _2n = /* @__PURE__ */ BigInt(2);
function isBytes2(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function abytes2(item) {
  if (!isBytes2(item))
    throw new Error("Uint8Array expected");
}
function abool(title, value) {
  if (typeof value !== "boolean")
    throw new Error(title + " boolean expected, got " + value);
}
var hexes2 = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
function bytesToHex2(bytes) {
  abytes2(bytes);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += hexes2[bytes[i]];
  }
  return hex;
}
function numberToHexUnpadded(num2) {
  const hex = num2.toString(16);
  return hex.length & 1 ? "0" + hex : hex;
}
function hexToNumber(hex) {
  if (typeof hex !== "string")
    throw new Error("hex string expected, got " + typeof hex);
  return hex === "" ? _0n : BigInt("0x" + hex);
}
var asciis2 = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function asciiToBase162(ch) {
  if (ch >= asciis2._0 && ch <= asciis2._9)
    return ch - asciis2._0;
  if (ch >= asciis2.A && ch <= asciis2.F)
    return ch - (asciis2.A - 10);
  if (ch >= asciis2.a && ch <= asciis2.f)
    return ch - (asciis2.a - 10);
  return;
}
function hexToBytes2(hex) {
  if (typeof hex !== "string")
    throw new Error("hex string expected, got " + typeof hex);
  const hl = hex.length;
  const al = hl / 2;
  if (hl % 2)
    throw new Error("hex string expected, got unpadded hex of length " + hl);
  const array = new Uint8Array(al);
  for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
    const n1 = asciiToBase162(hex.charCodeAt(hi));
    const n2 = asciiToBase162(hex.charCodeAt(hi + 1));
    if (n1 === void 0 || n2 === void 0) {
      const char = hex[hi] + hex[hi + 1];
      throw new Error('hex string expected, got non-hex character "' + char + '" at index ' + hi);
    }
    array[ai] = n1 * 16 + n2;
  }
  return array;
}
function bytesToNumberBE(bytes) {
  return hexToNumber(bytesToHex2(bytes));
}
function bytesToNumberLE(bytes) {
  abytes2(bytes);
  return hexToNumber(bytesToHex2(Uint8Array.from(bytes).reverse()));
}
function numberToBytesBE(n, len) {
  return hexToBytes2(n.toString(16).padStart(len * 2, "0"));
}
function numberToBytesLE(n, len) {
  return numberToBytesBE(n, len).reverse();
}
function numberToVarBytesBE(n) {
  return hexToBytes2(numberToHexUnpadded(n));
}
function ensureBytes(title, hex, expectedLength) {
  let res;
  if (typeof hex === "string") {
    try {
      res = hexToBytes2(hex);
    } catch (e) {
      throw new Error(title + " must be hex string or Uint8Array, cause: " + e);
    }
  } else if (isBytes2(hex)) {
    res = Uint8Array.from(hex);
  } else {
    throw new Error(title + " must be hex string or Uint8Array");
  }
  const len = res.length;
  if (typeof expectedLength === "number" && len !== expectedLength)
    throw new Error(title + " of length " + expectedLength + " expected, got " + len);
  return res;
}
function concatBytes2(...arrays) {
  let sum = 0;
  for (let i = 0; i < arrays.length; i++) {
    const a = arrays[i];
    abytes2(a);
    sum += a.length;
  }
  const res = new Uint8Array(sum);
  for (let i = 0, pad2 = 0; i < arrays.length; i++) {
    const a = arrays[i];
    res.set(a, pad2);
    pad2 += a.length;
  }
  return res;
}
function equalBytes(a, b) {
  if (a.length !== b.length)
    return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++)
    diff |= a[i] ^ b[i];
  return diff === 0;
}
function utf8ToBytes2(str) {
  if (typeof str !== "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(str));
}
var isPosBig = (n) => typeof n === "bigint" && _0n <= n;
function inRange(n, min, max) {
  return isPosBig(n) && isPosBig(min) && isPosBig(max) && min <= n && n < max;
}
function aInRange(title, n, min, max) {
  if (!inRange(n, min, max))
    throw new Error("expected valid " + title + ": " + min + " <= n < " + max + ", got " + n);
}
function bitLen(n) {
  let len;
  for (len = 0; n > _0n; n >>= _1n, len += 1)
    ;
  return len;
}
function bitGet(n, pos) {
  return n >> BigInt(pos) & _1n;
}
function bitSet(n, pos, value) {
  return n | (value ? _1n : _0n) << BigInt(pos);
}
var bitMask = (n) => (_2n << BigInt(n - 1)) - _1n;
var u8n = (data) => new Uint8Array(data);
var u8fr = (arr) => Uint8Array.from(arr);
function createHmacDrbg(hashLen, qByteLen, hmacFn) {
  if (typeof hashLen !== "number" || hashLen < 2)
    throw new Error("hashLen must be a number");
  if (typeof qByteLen !== "number" || qByteLen < 2)
    throw new Error("qByteLen must be a number");
  if (typeof hmacFn !== "function")
    throw new Error("hmacFn must be a function");
  let v = u8n(hashLen);
  let k = u8n(hashLen);
  let i = 0;
  const reset = () => {
    v.fill(1);
    k.fill(0);
    i = 0;
  };
  const h = (...b) => hmacFn(k, v, ...b);
  const reseed = (seed = u8n()) => {
    k = h(u8fr([0]), seed);
    v = h();
    if (seed.length === 0)
      return;
    k = h(u8fr([1]), seed);
    v = h();
  };
  const gen = () => {
    if (i++ >= 1e3)
      throw new Error("drbg: tried 1000 values");
    let len = 0;
    const out = [];
    while (len < qByteLen) {
      v = h();
      const sl = v.slice();
      out.push(sl);
      len += v.length;
    }
    return concatBytes2(...out);
  };
  const genUntil = (seed, pred) => {
    reset();
    reseed(seed);
    let res = void 0;
    while (!(res = pred(gen())))
      reseed();
    reset();
    return res;
  };
  return genUntil;
}
var validatorFns = {
  bigint: (val) => typeof val === "bigint",
  function: (val) => typeof val === "function",
  boolean: (val) => typeof val === "boolean",
  string: (val) => typeof val === "string",
  stringOrUint8Array: (val) => typeof val === "string" || isBytes2(val),
  isSafeInteger: (val) => Number.isSafeInteger(val),
  array: (val) => Array.isArray(val),
  field: (val, object) => object.Fp.isValid(val),
  hash: (val) => typeof val === "function" && Number.isSafeInteger(val.outputLen)
};
function validateObject(object, validators, optValidators = {}) {
  const checkField = (fieldName, type, isOptional) => {
    const checkVal = validatorFns[type];
    if (typeof checkVal !== "function")
      throw new Error("invalid validator function");
    const val = object[fieldName];
    if (isOptional && val === void 0)
      return;
    if (!checkVal(val, object)) {
      throw new Error("param " + String(fieldName) + " is invalid. Expected " + type + ", got " + val);
    }
  };
  for (const [fieldName, type] of Object.entries(validators))
    checkField(fieldName, type, false);
  for (const [fieldName, type] of Object.entries(optValidators))
    checkField(fieldName, type, true);
  return object;
}
var notImplemented = () => {
  throw new Error("not implemented");
};
function memoized(fn) {
  const map = /* @__PURE__ */ new WeakMap();
  return (arg, ...args) => {
    const val = map.get(arg);
    if (val !== void 0)
      return val;
    const computed = fn(arg, ...args);
    map.set(arg, computed);
    return computed;
  };
}

// node_modules/.pnpm/@noble+curves@1.8.1/node_modules/@noble/curves/esm/abstract/modular.js
var _0n2 = BigInt(0);
var _1n2 = BigInt(1);
var _2n2 = /* @__PURE__ */ BigInt(2);
var _3n = /* @__PURE__ */ BigInt(3);
var _4n = /* @__PURE__ */ BigInt(4);
var _5n = /* @__PURE__ */ BigInt(5);
var _8n = /* @__PURE__ */ BigInt(8);
var _9n = /* @__PURE__ */ BigInt(9);
var _16n = /* @__PURE__ */ BigInt(16);
function mod(a, b) {
  const result = a % b;
  return result >= _0n2 ? result : b + result;
}
function pow(num2, power, modulo) {
  if (power < _0n2)
    throw new Error("invalid exponent, negatives unsupported");
  if (modulo <= _0n2)
    throw new Error("invalid modulus");
  if (modulo === _1n2)
    return _0n2;
  let res = _1n2;
  while (power > _0n2) {
    if (power & _1n2)
      res = res * num2 % modulo;
    num2 = num2 * num2 % modulo;
    power >>= _1n2;
  }
  return res;
}
function pow2(x, power, modulo) {
  let res = x;
  while (power-- > _0n2) {
    res *= res;
    res %= modulo;
  }
  return res;
}
function invert(number, modulo) {
  if (number === _0n2)
    throw new Error("invert: expected non-zero number");
  if (modulo <= _0n2)
    throw new Error("invert: expected positive modulus, got " + modulo);
  let a = mod(number, modulo);
  let b = modulo;
  let x = _0n2, y = _1n2, u = _1n2, v = _0n2;
  while (a !== _0n2) {
    const q = b / a;
    const r = b % a;
    const m = x - u * q;
    const n = y - v * q;
    b = a, a = r, x = u, y = v, u = m, v = n;
  }
  const gcd2 = b;
  if (gcd2 !== _1n2)
    throw new Error("invert: does not exist");
  return mod(x, modulo);
}
function tonelliShanks(P) {
  const legendreC = (P - _1n2) / _2n2;
  let Q, S, Z;
  for (Q = P - _1n2, S = 0; Q % _2n2 === _0n2; Q /= _2n2, S++)
    ;
  for (Z = _2n2; Z < P && pow(Z, legendreC, P) !== P - _1n2; Z++) {
    if (Z > 1e3)
      throw new Error("Cannot find square root: likely non-prime P");
  }
  if (S === 1) {
    const p1div4 = (P + _1n2) / _4n;
    return function tonelliFast(Fp, n) {
      const root = Fp.pow(n, p1div4);
      if (!Fp.eql(Fp.sqr(root), n))
        throw new Error("Cannot find square root");
      return root;
    };
  }
  const Q1div2 = (Q + _1n2) / _2n2;
  return function tonelliSlow(Fp, n) {
    if (Fp.pow(n, legendreC) === Fp.neg(Fp.ONE))
      throw new Error("Cannot find square root");
    let r = S;
    let g = Fp.pow(Fp.mul(Fp.ONE, Z), Q);
    let x = Fp.pow(n, Q1div2);
    let b = Fp.pow(n, Q);
    while (!Fp.eql(b, Fp.ONE)) {
      if (Fp.eql(b, Fp.ZERO))
        return Fp.ZERO;
      let m = 1;
      for (let t2 = Fp.sqr(b); m < r; m++) {
        if (Fp.eql(t2, Fp.ONE))
          break;
        t2 = Fp.sqr(t2);
      }
      const ge = Fp.pow(g, _1n2 << BigInt(r - m - 1));
      g = Fp.sqr(ge);
      x = Fp.mul(x, ge);
      b = Fp.mul(b, g);
      r = m;
    }
    return x;
  };
}
function FpSqrt(P) {
  if (P % _4n === _3n) {
    const p1div4 = (P + _1n2) / _4n;
    return function sqrt3mod4(Fp, n) {
      const root = Fp.pow(n, p1div4);
      if (!Fp.eql(Fp.sqr(root), n))
        throw new Error("Cannot find square root");
      return root;
    };
  }
  if (P % _8n === _5n) {
    const c1 = (P - _5n) / _8n;
    return function sqrt5mod8(Fp, n) {
      const n2 = Fp.mul(n, _2n2);
      const v = Fp.pow(n2, c1);
      const nv = Fp.mul(n, v);
      const i = Fp.mul(Fp.mul(nv, _2n2), v);
      const root = Fp.mul(nv, Fp.sub(i, Fp.ONE));
      if (!Fp.eql(Fp.sqr(root), n))
        throw new Error("Cannot find square root");
      return root;
    };
  }
  if (P % _16n === _9n) {
  }
  return tonelliShanks(P);
}
var FIELD_FIELDS = [
  "create",
  "isValid",
  "is0",
  "neg",
  "inv",
  "sqrt",
  "sqr",
  "eql",
  "add",
  "sub",
  "mul",
  "pow",
  "div",
  "addN",
  "subN",
  "mulN",
  "sqrN"
];
function validateField(field) {
  const initial = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "isSafeInteger",
    BITS: "isSafeInteger"
  };
  const opts = FIELD_FIELDS.reduce((map, val) => {
    map[val] = "function";
    return map;
  }, initial);
  return validateObject(field, opts);
}
function FpPow(f, num2, power) {
  if (power < _0n2)
    throw new Error("invalid exponent, negatives unsupported");
  if (power === _0n2)
    return f.ONE;
  if (power === _1n2)
    return num2;
  let p = f.ONE;
  let d = num2;
  while (power > _0n2) {
    if (power & _1n2)
      p = f.mul(p, d);
    d = f.sqr(d);
    power >>= _1n2;
  }
  return p;
}
function FpInvertBatch(f, nums) {
  const tmp = new Array(nums.length);
  const lastMultiplied = nums.reduce((acc, num2, i) => {
    if (f.is0(num2))
      return acc;
    tmp[i] = acc;
    return f.mul(acc, num2);
  }, f.ONE);
  const inverted = f.inv(lastMultiplied);
  nums.reduceRight((acc, num2, i) => {
    if (f.is0(num2))
      return acc;
    tmp[i] = f.mul(acc, tmp[i]);
    return f.mul(acc, num2);
  }, inverted);
  return tmp;
}
function nLength(n, nBitLength) {
  const _nBitLength = nBitLength !== void 0 ? nBitLength : n.toString(2).length;
  const nByteLength = Math.ceil(_nBitLength / 8);
  return { nBitLength: _nBitLength, nByteLength };
}
function Field(ORDER, bitLen2, isLE2 = false, redef = {}) {
  if (ORDER <= _0n2)
    throw new Error("invalid field: expected ORDER > 0, got " + ORDER);
  const { nBitLength: BITS, nByteLength: BYTES } = nLength(ORDER, bitLen2);
  if (BYTES > 2048)
    throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let sqrtP;
  const f = Object.freeze({
    ORDER,
    isLE: isLE2,
    BITS,
    BYTES,
    MASK: bitMask(BITS),
    ZERO: _0n2,
    ONE: _1n2,
    create: (num2) => mod(num2, ORDER),
    isValid: (num2) => {
      if (typeof num2 !== "bigint")
        throw new Error("invalid field element: expected bigint, got " + typeof num2);
      return _0n2 <= num2 && num2 < ORDER;
    },
    is0: (num2) => num2 === _0n2,
    isOdd: (num2) => (num2 & _1n2) === _1n2,
    neg: (num2) => mod(-num2, ORDER),
    eql: (lhs, rhs) => lhs === rhs,
    sqr: (num2) => mod(num2 * num2, ORDER),
    add: (lhs, rhs) => mod(lhs + rhs, ORDER),
    sub: (lhs, rhs) => mod(lhs - rhs, ORDER),
    mul: (lhs, rhs) => mod(lhs * rhs, ORDER),
    pow: (num2, power) => FpPow(f, num2, power),
    div: (lhs, rhs) => mod(lhs * invert(rhs, ORDER), ORDER),
    // Same as above, but doesn't normalize
    sqrN: (num2) => num2 * num2,
    addN: (lhs, rhs) => lhs + rhs,
    subN: (lhs, rhs) => lhs - rhs,
    mulN: (lhs, rhs) => lhs * rhs,
    inv: (num2) => invert(num2, ORDER),
    sqrt: redef.sqrt || ((n) => {
      if (!sqrtP)
        sqrtP = FpSqrt(ORDER);
      return sqrtP(f, n);
    }),
    invertBatch: (lst) => FpInvertBatch(f, lst),
    // TODO: do we really need constant cmov?
    // We don't have const-time bigints anyway, so probably will be not very useful
    cmov: (a, b, c) => c ? b : a,
    toBytes: (num2) => isLE2 ? numberToBytesLE(num2, BYTES) : numberToBytesBE(num2, BYTES),
    fromBytes: (bytes) => {
      if (bytes.length !== BYTES)
        throw new Error("Field.fromBytes: expected " + BYTES + " bytes, got " + bytes.length);
      return isLE2 ? bytesToNumberLE(bytes) : bytesToNumberBE(bytes);
    }
  });
  return Object.freeze(f);
}
function getFieldBytesLength(fieldOrder) {
  if (typeof fieldOrder !== "bigint")
    throw new Error("field order must be bigint");
  const bitLength = fieldOrder.toString(2).length;
  return Math.ceil(bitLength / 8);
}
function getMinHashLength(fieldOrder) {
  const length = getFieldBytesLength(fieldOrder);
  return length + Math.ceil(length / 2);
}
function mapHashToField(key, fieldOrder, isLE2 = false) {
  const len = key.length;
  const fieldLen = getFieldBytesLength(fieldOrder);
  const minLen = getMinHashLength(fieldOrder);
  if (len < 16 || len < minLen || len > 1024)
    throw new Error("expected " + minLen + "-1024 bytes of input, got " + len);
  const num2 = isLE2 ? bytesToNumberLE(key) : bytesToNumberBE(key);
  const reduced = mod(num2, fieldOrder - _1n2) + _1n2;
  return isLE2 ? numberToBytesLE(reduced, fieldLen) : numberToBytesBE(reduced, fieldLen);
}

// node_modules/.pnpm/@noble+curves@1.8.1/node_modules/@noble/curves/esm/abstract/curve.js
var _0n3 = BigInt(0);
var _1n3 = BigInt(1);
function constTimeNegate(condition, item) {
  const neg = item.negate();
  return condition ? neg : item;
}
function validateW(W, bits) {
  if (!Number.isSafeInteger(W) || W <= 0 || W > bits)
    throw new Error("invalid window size, expected [1.." + bits + "], got W=" + W);
}
function calcWOpts(W, bits) {
  validateW(W, bits);
  const windows = Math.ceil(bits / W) + 1;
  const windowSize = 2 ** (W - 1);
  return { windows, windowSize };
}
function validateMSMPoints(points, c) {
  if (!Array.isArray(points))
    throw new Error("array expected");
  points.forEach((p, i) => {
    if (!(p instanceof c))
      throw new Error("invalid point at index " + i);
  });
}
function validateMSMScalars(scalars, field) {
  if (!Array.isArray(scalars))
    throw new Error("array of scalars expected");
  scalars.forEach((s, i) => {
    if (!field.isValid(s))
      throw new Error("invalid scalar at index " + i);
  });
}
var pointPrecomputes = /* @__PURE__ */ new WeakMap();
var pointWindowSizes = /* @__PURE__ */ new WeakMap();
function getW(P) {
  return pointWindowSizes.get(P) || 1;
}
function wNAF(c, bits) {
  return {
    constTimeNegate,
    hasPrecomputes(elm) {
      return getW(elm) !== 1;
    },
    // non-const time multiplication ladder
    unsafeLadder(elm, n, p = c.ZERO) {
      let d = elm;
      while (n > _0n3) {
        if (n & _1n3)
          p = p.add(d);
        d = d.double();
        n >>= _1n3;
      }
      return p;
    },
    /**
     * Creates a wNAF precomputation window. Used for caching.
     * Default window size is set by `utils.precompute()` and is equal to 8.
     * Number of precomputed points depends on the curve size:
     * 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
     * - 𝑊 is the window size
     * - 𝑛 is the bitlength of the curve order.
     * For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
     * @param elm Point instance
     * @param W window size
     * @returns precomputed point tables flattened to a single array
     */
    precomputeWindow(elm, W) {
      const { windows, windowSize } = calcWOpts(W, bits);
      const points = [];
      let p = elm;
      let base = p;
      for (let window = 0; window < windows; window++) {
        base = p;
        points.push(base);
        for (let i = 1; i < windowSize; i++) {
          base = base.add(p);
          points.push(base);
        }
        p = base.double();
      }
      return points;
    },
    /**
     * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
     * @param W window size
     * @param precomputes precomputed tables
     * @param n scalar (we don't check here, but should be less than curve order)
     * @returns real and fake (for const-time) points
     */
    wNAF(W, precomputes, n) {
      const { windows, windowSize } = calcWOpts(W, bits);
      let p = c.ZERO;
      let f = c.BASE;
      const mask = BigInt(2 ** W - 1);
      const maxNumber = 2 ** W;
      const shiftBy = BigInt(W);
      for (let window = 0; window < windows; window++) {
        const offset = window * windowSize;
        let wbits = Number(n & mask);
        n >>= shiftBy;
        if (wbits > windowSize) {
          wbits -= maxNumber;
          n += _1n3;
        }
        const offset1 = offset;
        const offset2 = offset + Math.abs(wbits) - 1;
        const cond1 = window % 2 !== 0;
        const cond2 = wbits < 0;
        if (wbits === 0) {
          f = f.add(constTimeNegate(cond1, precomputes[offset1]));
        } else {
          p = p.add(constTimeNegate(cond2, precomputes[offset2]));
        }
      }
      return { p, f };
    },
    /**
     * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
     * @param W window size
     * @param precomputes precomputed tables
     * @param n scalar (we don't check here, but should be less than curve order)
     * @param acc accumulator point to add result of multiplication
     * @returns point
     */
    wNAFUnsafe(W, precomputes, n, acc = c.ZERO) {
      const { windows, windowSize } = calcWOpts(W, bits);
      const mask = BigInt(2 ** W - 1);
      const maxNumber = 2 ** W;
      const shiftBy = BigInt(W);
      for (let window = 0; window < windows; window++) {
        const offset = window * windowSize;
        if (n === _0n3)
          break;
        let wbits = Number(n & mask);
        n >>= shiftBy;
        if (wbits > windowSize) {
          wbits -= maxNumber;
          n += _1n3;
        }
        if (wbits === 0)
          continue;
        let curr = precomputes[offset + Math.abs(wbits) - 1];
        if (wbits < 0)
          curr = curr.negate();
        acc = acc.add(curr);
      }
      return acc;
    },
    getPrecomputes(W, P, transform) {
      let comp = pointPrecomputes.get(P);
      if (!comp) {
        comp = this.precomputeWindow(P, W);
        if (W !== 1)
          pointPrecomputes.set(P, transform(comp));
      }
      return comp;
    },
    wNAFCached(P, n, transform) {
      const W = getW(P);
      return this.wNAF(W, this.getPrecomputes(W, P, transform), n);
    },
    wNAFCachedUnsafe(P, n, transform, prev) {
      const W = getW(P);
      if (W === 1)
        return this.unsafeLadder(P, n, prev);
      return this.wNAFUnsafe(W, this.getPrecomputes(W, P, transform), n, prev);
    },
    // We calculate precomputes for elliptic curve point multiplication
    // using windowed method. This specifies window size and
    // stores precomputed values. Usually only base point would be precomputed.
    setWindowSize(P, W) {
      validateW(W, bits);
      pointWindowSizes.set(P, W);
      pointPrecomputes.delete(P);
    }
  };
}
function pippenger(c, fieldN, points, scalars) {
  validateMSMPoints(points, c);
  validateMSMScalars(scalars, fieldN);
  if (points.length !== scalars.length)
    throw new Error("arrays of points and scalars must have equal length");
  const zero = c.ZERO;
  const wbits = bitLen(BigInt(points.length));
  const windowSize = wbits > 12 ? wbits - 3 : wbits > 4 ? wbits - 2 : wbits ? 2 : 1;
  const MASK = (1 << windowSize) - 1;
  const buckets = new Array(MASK + 1).fill(zero);
  const lastBits = Math.floor((fieldN.BITS - 1) / windowSize) * windowSize;
  let sum = zero;
  for (let i = lastBits; i >= 0; i -= windowSize) {
    buckets.fill(zero);
    for (let j = 0; j < scalars.length; j++) {
      const scalar = scalars[j];
      const wbits2 = Number(scalar >> BigInt(i) & BigInt(MASK));
      buckets[wbits2] = buckets[wbits2].add(points[j]);
    }
    let resI = zero;
    for (let j = buckets.length - 1, sumI = zero; j > 0; j--) {
      sumI = sumI.add(buckets[j]);
      resI = resI.add(sumI);
    }
    sum = sum.add(resI);
    if (i !== 0)
      for (let j = 0; j < windowSize; j++)
        sum = sum.double();
  }
  return sum;
}
function validateBasic(curve) {
  validateField(curve.Fp);
  validateObject(curve, {
    n: "bigint",
    h: "bigint",
    Gx: "field",
    Gy: "field"
  }, {
    nBitLength: "isSafeInteger",
    nByteLength: "isSafeInteger"
  });
  return Object.freeze({
    ...nLength(curve.n, curve.nBitLength),
    ...curve,
    ...{ p: curve.Fp.ORDER }
  });
}

// node_modules/.pnpm/@noble+curves@1.8.1/node_modules/@noble/curves/esm/abstract/weierstrass.js
function validateSigVerOpts(opts) {
  if (opts.lowS !== void 0)
    abool("lowS", opts.lowS);
  if (opts.prehash !== void 0)
    abool("prehash", opts.prehash);
}
function validatePointOpts(curve) {
  const opts = validateBasic(curve);
  validateObject(opts, {
    a: "field",
    b: "field"
  }, {
    allowedPrivateKeyLengths: "array",
    wrapPrivateKey: "boolean",
    isTorsionFree: "function",
    clearCofactor: "function",
    allowInfinityPoint: "boolean",
    fromBytes: "function",
    toBytes: "function"
  });
  const { endo, Fp, a } = opts;
  if (endo) {
    if (!Fp.eql(a, Fp.ZERO)) {
      throw new Error("invalid endomorphism, can only be defined for Koblitz curves that have a=0");
    }
    if (typeof endo !== "object" || typeof endo.beta !== "bigint" || typeof endo.splitScalar !== "function") {
      throw new Error("invalid endomorphism, expected beta: bigint and splitScalar: function");
    }
  }
  return Object.freeze({ ...opts });
}
var { bytesToNumberBE: b2n, hexToBytes: h2b } = utils_exports;
var DERErr = class extends Error {
  constructor(m = "") {
    super(m);
  }
};
var DER = {
  // asn.1 DER encoding utils
  Err: DERErr,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (tag, data) => {
      const { Err: E } = DER;
      if (tag < 0 || tag > 256)
        throw new E("tlv.encode: wrong tag");
      if (data.length & 1)
        throw new E("tlv.encode: unpadded data");
      const dataLen = data.length / 2;
      const len = numberToHexUnpadded(dataLen);
      if (len.length / 2 & 128)
        throw new E("tlv.encode: long form length too big");
      const lenLen = dataLen > 127 ? numberToHexUnpadded(len.length / 2 | 128) : "";
      const t = numberToHexUnpadded(tag);
      return t + lenLen + len + data;
    },
    // v - value, l - left bytes (unparsed)
    decode(tag, data) {
      const { Err: E } = DER;
      let pos = 0;
      if (tag < 0 || tag > 256)
        throw new E("tlv.encode: wrong tag");
      if (data.length < 2 || data[pos++] !== tag)
        throw new E("tlv.decode: wrong tlv");
      const first = data[pos++];
      const isLong = !!(first & 128);
      let length = 0;
      if (!isLong)
        length = first;
      else {
        const lenLen = first & 127;
        if (!lenLen)
          throw new E("tlv.decode(long): indefinite length not supported");
        if (lenLen > 4)
          throw new E("tlv.decode(long): byte length is too big");
        const lengthBytes = data.subarray(pos, pos + lenLen);
        if (lengthBytes.length !== lenLen)
          throw new E("tlv.decode: length bytes not complete");
        if (lengthBytes[0] === 0)
          throw new E("tlv.decode(long): zero leftmost byte");
        for (const b of lengthBytes)
          length = length << 8 | b;
        pos += lenLen;
        if (length < 128)
          throw new E("tlv.decode(long): not minimal encoding");
      }
      const v = data.subarray(pos, pos + length);
      if (v.length !== length)
        throw new E("tlv.decode: wrong value length");
      return { v, l: data.subarray(pos + length) };
    }
  },
  // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
  // since we always use positive integers here. It must always be empty:
  // - add zero byte if exists
  // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
  _int: {
    encode(num2) {
      const { Err: E } = DER;
      if (num2 < _0n4)
        throw new E("integer: negative integers are not allowed");
      let hex = numberToHexUnpadded(num2);
      if (Number.parseInt(hex[0], 16) & 8)
        hex = "00" + hex;
      if (hex.length & 1)
        throw new E("unexpected DER parsing assertion: unpadded hex");
      return hex;
    },
    decode(data) {
      const { Err: E } = DER;
      if (data[0] & 128)
        throw new E("invalid signature integer: negative");
      if (data[0] === 0 && !(data[1] & 128))
        throw new E("invalid signature integer: unnecessary leading zero");
      return b2n(data);
    }
  },
  toSig(hex) {
    const { Err: E, _int: int, _tlv: tlv } = DER;
    const data = typeof hex === "string" ? h2b(hex) : hex;
    abytes2(data);
    const { v: seqBytes, l: seqLeftBytes } = tlv.decode(48, data);
    if (seqLeftBytes.length)
      throw new E("invalid signature: left bytes after parsing");
    const { v: rBytes, l: rLeftBytes } = tlv.decode(2, seqBytes);
    const { v: sBytes, l: sLeftBytes } = tlv.decode(2, rLeftBytes);
    if (sLeftBytes.length)
      throw new E("invalid signature: left bytes after parsing");
    return { r: int.decode(rBytes), s: int.decode(sBytes) };
  },
  hexFromSig(sig) {
    const { _tlv: tlv, _int: int } = DER;
    const rs = tlv.encode(2, int.encode(sig.r));
    const ss = tlv.encode(2, int.encode(sig.s));
    const seq = rs + ss;
    return tlv.encode(48, seq);
  }
};
var _0n4 = BigInt(0);
var _1n4 = BigInt(1);
var _2n3 = BigInt(2);
var _3n2 = BigInt(3);
var _4n2 = BigInt(4);
function weierstrassPoints(opts) {
  const CURVE = validatePointOpts(opts);
  const { Fp } = CURVE;
  const Fn = Field(CURVE.n, CURVE.nBitLength);
  const toBytes3 = CURVE.toBytes || ((_c, point, _isCompressed) => {
    const a = point.toAffine();
    return concatBytes2(Uint8Array.from([4]), Fp.toBytes(a.x), Fp.toBytes(a.y));
  });
  const fromBytes = CURVE.fromBytes || ((bytes) => {
    const tail = bytes.subarray(1);
    const x = Fp.fromBytes(tail.subarray(0, Fp.BYTES));
    const y = Fp.fromBytes(tail.subarray(Fp.BYTES, 2 * Fp.BYTES));
    return { x, y };
  });
  function weierstrassEquation(x) {
    const { a, b } = CURVE;
    const x2 = Fp.sqr(x);
    const x3 = Fp.mul(x2, x);
    return Fp.add(Fp.add(x3, Fp.mul(x, a)), b);
  }
  if (!Fp.eql(Fp.sqr(CURVE.Gy), weierstrassEquation(CURVE.Gx)))
    throw new Error("bad generator point: equation left != right");
  function isWithinCurveOrder(num2) {
    return inRange(num2, _1n4, CURVE.n);
  }
  function normPrivateKeyToScalar(key) {
    const { allowedPrivateKeyLengths: lengths, nByteLength, wrapPrivateKey, n: N } = CURVE;
    if (lengths && typeof key !== "bigint") {
      if (isBytes2(key))
        key = bytesToHex2(key);
      if (typeof key !== "string" || !lengths.includes(key.length))
        throw new Error("invalid private key");
      key = key.padStart(nByteLength * 2, "0");
    }
    let num2;
    try {
      num2 = typeof key === "bigint" ? key : bytesToNumberBE(ensureBytes("private key", key, nByteLength));
    } catch (error) {
      throw new Error("invalid private key, expected hex or " + nByteLength + " bytes, got " + typeof key);
    }
    if (wrapPrivateKey)
      num2 = mod(num2, N);
    aInRange("private key", num2, _1n4, N);
    return num2;
  }
  function assertPrjPoint(other) {
    if (!(other instanceof Point2))
      throw new Error("ProjectivePoint expected");
  }
  const toAffineMemo = memoized((p, iz) => {
    const { px: x, py: y, pz: z } = p;
    if (Fp.eql(z, Fp.ONE))
      return { x, y };
    const is0 = p.is0();
    if (iz == null)
      iz = is0 ? Fp.ONE : Fp.inv(z);
    const ax = Fp.mul(x, iz);
    const ay = Fp.mul(y, iz);
    const zz = Fp.mul(z, iz);
    if (is0)
      return { x: Fp.ZERO, y: Fp.ZERO };
    if (!Fp.eql(zz, Fp.ONE))
      throw new Error("invZ was invalid");
    return { x: ax, y: ay };
  });
  const assertValidMemo = memoized((p) => {
    if (p.is0()) {
      if (CURVE.allowInfinityPoint && !Fp.is0(p.py))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x, y } = p.toAffine();
    if (!Fp.isValid(x) || !Fp.isValid(y))
      throw new Error("bad point: x or y not FE");
    const left = Fp.sqr(y);
    const right = weierstrassEquation(x);
    if (!Fp.eql(left, right))
      throw new Error("bad point: equation left != right");
    if (!p.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return true;
  });
  class Point2 {
    constructor(px, py, pz) {
      this.px = px;
      this.py = py;
      this.pz = pz;
      if (px == null || !Fp.isValid(px))
        throw new Error("x required");
      if (py == null || !Fp.isValid(py))
        throw new Error("y required");
      if (pz == null || !Fp.isValid(pz))
        throw new Error("z required");
      Object.freeze(this);
    }
    // Does not validate if the point is on-curve.
    // Use fromHex instead, or call assertValidity() later.
    static fromAffine(p) {
      const { x, y } = p || {};
      if (!p || !Fp.isValid(x) || !Fp.isValid(y))
        throw new Error("invalid affine point");
      if (p instanceof Point2)
        throw new Error("projective point not allowed");
      const is0 = (i) => Fp.eql(i, Fp.ZERO);
      if (is0(x) && is0(y))
        return Point2.ZERO;
      return new Point2(x, y, Fp.ONE);
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    /**
     * Takes a bunch of Projective Points but executes only one
     * inversion on all of them. Inversion is very slow operation,
     * so this improves performance massively.
     * Optimization: converts a list of projective points to a list of identical points with Z=1.
     */
    static normalizeZ(points) {
      const toInv = Fp.invertBatch(points.map((p) => p.pz));
      return points.map((p, i) => p.toAffine(toInv[i])).map(Point2.fromAffine);
    }
    /**
     * Converts hash string or Uint8Array to Point.
     * @param hex short/long ECDSA hex
     */
    static fromHex(hex) {
      const P = Point2.fromAffine(fromBytes(ensureBytes("pointHex", hex)));
      P.assertValidity();
      return P;
    }
    // Multiplies generator point by privateKey.
    static fromPrivateKey(privateKey) {
      return Point2.BASE.multiply(normPrivateKeyToScalar(privateKey));
    }
    // Multiscalar Multiplication
    static msm(points, scalars) {
      return pippenger(Point2, Fn, points, scalars);
    }
    // "Private method", don't use it directly
    _setWindowSize(windowSize) {
      wnaf.setWindowSize(this, windowSize);
    }
    // A point on curve is valid if it conforms to equation.
    assertValidity() {
      assertValidMemo(this);
    }
    hasEvenY() {
      const { y } = this.toAffine();
      if (Fp.isOdd)
        return !Fp.isOdd(y);
      throw new Error("Field doesn't support isOdd");
    }
    /**
     * Compare one point to another.
     */
    equals(other) {
      assertPrjPoint(other);
      const { px: X1, py: Y1, pz: Z1 } = this;
      const { px: X2, py: Y2, pz: Z2 } = other;
      const U1 = Fp.eql(Fp.mul(X1, Z2), Fp.mul(X2, Z1));
      const U2 = Fp.eql(Fp.mul(Y1, Z2), Fp.mul(Y2, Z1));
      return U1 && U2;
    }
    /**
     * Flips point to one corresponding to (x, -y) in Affine coordinates.
     */
    negate() {
      return new Point2(this.px, Fp.neg(this.py), this.pz);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a, b } = CURVE;
      const b3 = Fp.mul(b, _3n2);
      const { px: X1, py: Y1, pz: Z1 } = this;
      let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO;
      let t0 = Fp.mul(X1, X1);
      let t1 = Fp.mul(Y1, Y1);
      let t2 = Fp.mul(Z1, Z1);
      let t3 = Fp.mul(X1, Y1);
      t3 = Fp.add(t3, t3);
      Z3 = Fp.mul(X1, Z1);
      Z3 = Fp.add(Z3, Z3);
      X3 = Fp.mul(a, Z3);
      Y3 = Fp.mul(b3, t2);
      Y3 = Fp.add(X3, Y3);
      X3 = Fp.sub(t1, Y3);
      Y3 = Fp.add(t1, Y3);
      Y3 = Fp.mul(X3, Y3);
      X3 = Fp.mul(t3, X3);
      Z3 = Fp.mul(b3, Z3);
      t2 = Fp.mul(a, t2);
      t3 = Fp.sub(t0, t2);
      t3 = Fp.mul(a, t3);
      t3 = Fp.add(t3, Z3);
      Z3 = Fp.add(t0, t0);
      t0 = Fp.add(Z3, t0);
      t0 = Fp.add(t0, t2);
      t0 = Fp.mul(t0, t3);
      Y3 = Fp.add(Y3, t0);
      t2 = Fp.mul(Y1, Z1);
      t2 = Fp.add(t2, t2);
      t0 = Fp.mul(t2, t3);
      X3 = Fp.sub(X3, t0);
      Z3 = Fp.mul(t2, t1);
      Z3 = Fp.add(Z3, Z3);
      Z3 = Fp.add(Z3, Z3);
      return new Point2(X3, Y3, Z3);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(other) {
      assertPrjPoint(other);
      const { px: X1, py: Y1, pz: Z1 } = this;
      const { px: X2, py: Y2, pz: Z2 } = other;
      let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO;
      const a = CURVE.a;
      const b3 = Fp.mul(CURVE.b, _3n2);
      let t0 = Fp.mul(X1, X2);
      let t1 = Fp.mul(Y1, Y2);
      let t2 = Fp.mul(Z1, Z2);
      let t3 = Fp.add(X1, Y1);
      let t4 = Fp.add(X2, Y2);
      t3 = Fp.mul(t3, t4);
      t4 = Fp.add(t0, t1);
      t3 = Fp.sub(t3, t4);
      t4 = Fp.add(X1, Z1);
      let t5 = Fp.add(X2, Z2);
      t4 = Fp.mul(t4, t5);
      t5 = Fp.add(t0, t2);
      t4 = Fp.sub(t4, t5);
      t5 = Fp.add(Y1, Z1);
      X3 = Fp.add(Y2, Z2);
      t5 = Fp.mul(t5, X3);
      X3 = Fp.add(t1, t2);
      t5 = Fp.sub(t5, X3);
      Z3 = Fp.mul(a, t4);
      X3 = Fp.mul(b3, t2);
      Z3 = Fp.add(X3, Z3);
      X3 = Fp.sub(t1, Z3);
      Z3 = Fp.add(t1, Z3);
      Y3 = Fp.mul(X3, Z3);
      t1 = Fp.add(t0, t0);
      t1 = Fp.add(t1, t0);
      t2 = Fp.mul(a, t2);
      t4 = Fp.mul(b3, t4);
      t1 = Fp.add(t1, t2);
      t2 = Fp.sub(t0, t2);
      t2 = Fp.mul(a, t2);
      t4 = Fp.add(t4, t2);
      t0 = Fp.mul(t1, t4);
      Y3 = Fp.add(Y3, t0);
      t0 = Fp.mul(t5, t4);
      X3 = Fp.mul(t3, X3);
      X3 = Fp.sub(X3, t0);
      t0 = Fp.mul(t3, t1);
      Z3 = Fp.mul(t5, Z3);
      Z3 = Fp.add(Z3, t0);
      return new Point2(X3, Y3, Z3);
    }
    subtract(other) {
      return this.add(other.negate());
    }
    is0() {
      return this.equals(Point2.ZERO);
    }
    wNAF(n) {
      return wnaf.wNAFCached(this, n, Point2.normalizeZ);
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed private key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(sc) {
      const { endo, n: N } = CURVE;
      aInRange("scalar", sc, _0n4, N);
      const I = Point2.ZERO;
      if (sc === _0n4)
        return I;
      if (this.is0() || sc === _1n4)
        return this;
      if (!endo || wnaf.hasPrecomputes(this))
        return wnaf.wNAFCachedUnsafe(this, sc, Point2.normalizeZ);
      let { k1neg, k1, k2neg, k2 } = endo.splitScalar(sc);
      let k1p = I;
      let k2p = I;
      let d = this;
      while (k1 > _0n4 || k2 > _0n4) {
        if (k1 & _1n4)
          k1p = k1p.add(d);
        if (k2 & _1n4)
          k2p = k2p.add(d);
        d = d.double();
        k1 >>= _1n4;
        k2 >>= _1n4;
      }
      if (k1neg)
        k1p = k1p.negate();
      if (k2neg)
        k2p = k2p.negate();
      k2p = new Point2(Fp.mul(k2p.px, endo.beta), k2p.py, k2p.pz);
      return k1p.add(k2p);
    }
    /**
     * Constant time multiplication.
     * Uses wNAF method. Windowed method may be 10% faster,
     * but takes 2x longer to generate and consumes 2x memory.
     * Uses precomputes when available.
     * Uses endomorphism for Koblitz curves.
     * @param scalar by which the point would be multiplied
     * @returns New point
     */
    multiply(scalar) {
      const { endo, n: N } = CURVE;
      aInRange("scalar", scalar, _1n4, N);
      let point, fake;
      if (endo) {
        const { k1neg, k1, k2neg, k2 } = endo.splitScalar(scalar);
        let { p: k1p, f: f1p } = this.wNAF(k1);
        let { p: k2p, f: f2p } = this.wNAF(k2);
        k1p = wnaf.constTimeNegate(k1neg, k1p);
        k2p = wnaf.constTimeNegate(k2neg, k2p);
        k2p = new Point2(Fp.mul(k2p.px, endo.beta), k2p.py, k2p.pz);
        point = k1p.add(k2p);
        fake = f1p.add(f2p);
      } else {
        const { p, f } = this.wNAF(scalar);
        point = p;
        fake = f;
      }
      return Point2.normalizeZ([point, fake])[0];
    }
    /**
     * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
     * Not using Strauss-Shamir trick: precomputation tables are faster.
     * The trick could be useful if both P and Q are not G (not in our case).
     * @returns non-zero affine point
     */
    multiplyAndAddUnsafe(Q, a, b) {
      const G = Point2.BASE;
      const mul = (P, a2) => a2 === _0n4 || a2 === _1n4 || !P.equals(G) ? P.multiplyUnsafe(a2) : P.multiply(a2);
      const sum = mul(this, a).add(mul(Q, b));
      return sum.is0() ? void 0 : sum;
    }
    // Converts Projective point to affine (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    // (x, y, z) ∋ (x=x/z, y=y/z)
    toAffine(iz) {
      return toAffineMemo(this, iz);
    }
    isTorsionFree() {
      const { h: cofactor, isTorsionFree } = CURVE;
      if (cofactor === _1n4)
        return true;
      if (isTorsionFree)
        return isTorsionFree(Point2, this);
      throw new Error("isTorsionFree() has not been declared for the elliptic curve");
    }
    clearCofactor() {
      const { h: cofactor, clearCofactor } = CURVE;
      if (cofactor === _1n4)
        return this;
      if (clearCofactor)
        return clearCofactor(Point2, this);
      return this.multiplyUnsafe(CURVE.h);
    }
    toRawBytes(isCompressed = true) {
      abool("isCompressed", isCompressed);
      this.assertValidity();
      return toBytes3(Point2, this, isCompressed);
    }
    toHex(isCompressed = true) {
      abool("isCompressed", isCompressed);
      return bytesToHex2(this.toRawBytes(isCompressed));
    }
  }
  Point2.BASE = new Point2(CURVE.Gx, CURVE.Gy, Fp.ONE);
  Point2.ZERO = new Point2(Fp.ZERO, Fp.ONE, Fp.ZERO);
  const _bits = CURVE.nBitLength;
  const wnaf = wNAF(Point2, CURVE.endo ? Math.ceil(_bits / 2) : _bits);
  return {
    CURVE,
    ProjectivePoint: Point2,
    normPrivateKeyToScalar,
    weierstrassEquation,
    isWithinCurveOrder
  };
}
function validateOpts(curve) {
  const opts = validateBasic(curve);
  validateObject(opts, {
    hash: "hash",
    hmac: "function",
    randomBytes: "function"
  }, {
    bits2int: "function",
    bits2int_modN: "function",
    lowS: "boolean"
  });
  return Object.freeze({ lowS: true, ...opts });
}
function weierstrass(curveDef) {
  const CURVE = validateOpts(curveDef);
  const { Fp, n: CURVE_ORDER } = CURVE;
  const compressedLen = Fp.BYTES + 1;
  const uncompressedLen = 2 * Fp.BYTES + 1;
  function modN2(a) {
    return mod(a, CURVE_ORDER);
  }
  function invN(a) {
    return invert(a, CURVE_ORDER);
  }
  const { ProjectivePoint: Point2, normPrivateKeyToScalar, weierstrassEquation, isWithinCurveOrder } = weierstrassPoints({
    ...CURVE,
    toBytes(_c, point, isCompressed) {
      const a = point.toAffine();
      const x = Fp.toBytes(a.x);
      const cat = concatBytes2;
      abool("isCompressed", isCompressed);
      if (isCompressed) {
        return cat(Uint8Array.from([point.hasEvenY() ? 2 : 3]), x);
      } else {
        return cat(Uint8Array.from([4]), x, Fp.toBytes(a.y));
      }
    },
    fromBytes(bytes) {
      const len = bytes.length;
      const head = bytes[0];
      const tail = bytes.subarray(1);
      if (len === compressedLen && (head === 2 || head === 3)) {
        const x = bytesToNumberBE(tail);
        if (!inRange(x, _1n4, Fp.ORDER))
          throw new Error("Point is not on curve");
        const y2 = weierstrassEquation(x);
        let y;
        try {
          y = Fp.sqrt(y2);
        } catch (sqrtError) {
          const suffix = sqrtError instanceof Error ? ": " + sqrtError.message : "";
          throw new Error("Point is not on curve" + suffix);
        }
        const isYOdd = (y & _1n4) === _1n4;
        const isHeadOdd = (head & 1) === 1;
        if (isHeadOdd !== isYOdd)
          y = Fp.neg(y);
        return { x, y };
      } else if (len === uncompressedLen && head === 4) {
        const x = Fp.fromBytes(tail.subarray(0, Fp.BYTES));
        const y = Fp.fromBytes(tail.subarray(Fp.BYTES, 2 * Fp.BYTES));
        return { x, y };
      } else {
        const cl = compressedLen;
        const ul = uncompressedLen;
        throw new Error("invalid Point, expected length of " + cl + ", or uncompressed " + ul + ", got " + len);
      }
    }
  });
  const numToNByteStr = (num2) => bytesToHex2(numberToBytesBE(num2, CURVE.nByteLength));
  function isBiggerThanHalfOrder(number) {
    const HALF = CURVE_ORDER >> _1n4;
    return number > HALF;
  }
  function normalizeS(s) {
    return isBiggerThanHalfOrder(s) ? modN2(-s) : s;
  }
  const slcNum = (b, from, to) => bytesToNumberBE(b.slice(from, to));
  class Signature2 {
    constructor(r, s, recovery) {
      this.r = r;
      this.s = s;
      this.recovery = recovery;
      this.assertValidity();
    }
    // pair (bytes of r, bytes of s)
    static fromCompact(hex) {
      const l = CURVE.nByteLength;
      hex = ensureBytes("compactSignature", hex, l * 2);
      return new Signature2(slcNum(hex, 0, l), slcNum(hex, l, 2 * l));
    }
    // DER encoded ECDSA signature
    // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
    static fromDER(hex) {
      const { r, s } = DER.toSig(ensureBytes("DER", hex));
      return new Signature2(r, s);
    }
    assertValidity() {
      aInRange("r", this.r, _1n4, CURVE_ORDER);
      aInRange("s", this.s, _1n4, CURVE_ORDER);
    }
    addRecoveryBit(recovery) {
      return new Signature2(this.r, this.s, recovery);
    }
    recoverPublicKey(msgHash) {
      const { r, s, recovery: rec } = this;
      const h = bits2int_modN(ensureBytes("msgHash", msgHash));
      if (rec == null || ![0, 1, 2, 3].includes(rec))
        throw new Error("recovery id invalid");
      const radj = rec === 2 || rec === 3 ? r + CURVE.n : r;
      if (radj >= Fp.ORDER)
        throw new Error("recovery id 2 or 3 invalid");
      const prefix = (rec & 1) === 0 ? "02" : "03";
      const R = Point2.fromHex(prefix + numToNByteStr(radj));
      const ir = invN(radj);
      const u1 = modN2(-h * ir);
      const u2 = modN2(s * ir);
      const Q = Point2.BASE.multiplyAndAddUnsafe(R, u1, u2);
      if (!Q)
        throw new Error("point at infinify");
      Q.assertValidity();
      return Q;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return isBiggerThanHalfOrder(this.s);
    }
    normalizeS() {
      return this.hasHighS() ? new Signature2(this.r, modN2(-this.s), this.recovery) : this;
    }
    // DER-encoded
    toDERRawBytes() {
      return hexToBytes2(this.toDERHex());
    }
    toDERHex() {
      return DER.hexFromSig({ r: this.r, s: this.s });
    }
    // padded bytes of r, then padded bytes of s
    toCompactRawBytes() {
      return hexToBytes2(this.toCompactHex());
    }
    toCompactHex() {
      return numToNByteStr(this.r) + numToNByteStr(this.s);
    }
  }
  const utils = {
    isValidPrivateKey(privateKey) {
      try {
        normPrivateKeyToScalar(privateKey);
        return true;
      } catch (error) {
        return false;
      }
    },
    normPrivateKeyToScalar,
    /**
     * Produces cryptographically secure private key from random of size
     * (groupLen + ceil(groupLen / 2)) with modulo bias being negligible.
     */
    randomPrivateKey: () => {
      const length = getMinHashLength(CURVE.n);
      return mapHashToField(CURVE.randomBytes(length), CURVE.n);
    },
    /**
     * Creates precompute table for an arbitrary EC point. Makes point "cached".
     * Allows to massively speed-up `point.multiply(scalar)`.
     * @returns cached point
     * @example
     * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
     * fast.multiply(privKey); // much faster ECDH now
     */
    precompute(windowSize = 8, point = Point2.BASE) {
      point._setWindowSize(windowSize);
      point.multiply(BigInt(3));
      return point;
    }
  };
  function getPublicKey2(privateKey, isCompressed = true) {
    return Point2.fromPrivateKey(privateKey).toRawBytes(isCompressed);
  }
  function isProbPub(item) {
    const arr = isBytes2(item);
    const str = typeof item === "string";
    const len = (arr || str) && item.length;
    if (arr)
      return len === compressedLen || len === uncompressedLen;
    if (str)
      return len === 2 * compressedLen || len === 2 * uncompressedLen;
    if (item instanceof Point2)
      return true;
    return false;
  }
  function getSharedSecret(privateA, publicB, isCompressed = true) {
    if (isProbPub(privateA))
      throw new Error("first arg must be private key");
    if (!isProbPub(publicB))
      throw new Error("second arg must be public key");
    const b = Point2.fromHex(publicB);
    return b.multiply(normPrivateKeyToScalar(privateA)).toRawBytes(isCompressed);
  }
  const bits2int = CURVE.bits2int || function(bytes) {
    if (bytes.length > 8192)
      throw new Error("input is too large");
    const num2 = bytesToNumberBE(bytes);
    const delta = bytes.length * 8 - CURVE.nBitLength;
    return delta > 0 ? num2 >> BigInt(delta) : num2;
  };
  const bits2int_modN = CURVE.bits2int_modN || function(bytes) {
    return modN2(bits2int(bytes));
  };
  const ORDER_MASK = bitMask(CURVE.nBitLength);
  function int2octets(num2) {
    aInRange("num < 2^" + CURVE.nBitLength, num2, _0n4, ORDER_MASK);
    return numberToBytesBE(num2, CURVE.nByteLength);
  }
  function prepSig(msgHash, privateKey, opts = defaultSigOpts) {
    if (["recovered", "canonical"].some((k) => k in opts))
      throw new Error("sign() legacy options not supported");
    const { hash, randomBytes: randomBytes2 } = CURVE;
    let { lowS, prehash, extraEntropy: ent } = opts;
    if (lowS == null)
      lowS = true;
    msgHash = ensureBytes("msgHash", msgHash);
    validateSigVerOpts(opts);
    if (prehash)
      msgHash = ensureBytes("prehashed msgHash", hash(msgHash));
    const h1int = bits2int_modN(msgHash);
    const d = normPrivateKeyToScalar(privateKey);
    const seedArgs = [int2octets(d), int2octets(h1int)];
    if (ent != null && ent !== false) {
      const e = ent === true ? randomBytes2(Fp.BYTES) : ent;
      seedArgs.push(ensureBytes("extraEntropy", e));
    }
    const seed = concatBytes2(...seedArgs);
    const m = h1int;
    function k2sig(kBytes) {
      const k = bits2int(kBytes);
      if (!isWithinCurveOrder(k))
        return;
      const ik = invN(k);
      const q = Point2.BASE.multiply(k).toAffine();
      const r = modN2(q.x);
      if (r === _0n4)
        return;
      const s = modN2(ik * modN2(m + r * d));
      if (s === _0n4)
        return;
      let recovery = (q.x === r ? 0 : 2) | Number(q.y & _1n4);
      let normS = s;
      if (lowS && isBiggerThanHalfOrder(s)) {
        normS = normalizeS(s);
        recovery ^= 1;
      }
      return new Signature2(r, normS, recovery);
    }
    return { seed, k2sig };
  }
  const defaultSigOpts = { lowS: CURVE.lowS, prehash: false };
  const defaultVerOpts = { lowS: CURVE.lowS, prehash: false };
  function sign(msgHash, privKey, opts = defaultSigOpts) {
    const { seed, k2sig } = prepSig(msgHash, privKey, opts);
    const C = CURVE;
    const drbg = createHmacDrbg(C.hash.outputLen, C.nByteLength, C.hmac);
    return drbg(seed, k2sig);
  }
  Point2.BASE._setWindowSize(8);
  function verify(signature, msgHash, publicKey, opts = defaultVerOpts) {
    const sg = signature;
    msgHash = ensureBytes("msgHash", msgHash);
    publicKey = ensureBytes("publicKey", publicKey);
    const { lowS, prehash, format } = opts;
    validateSigVerOpts(opts);
    if ("strict" in opts)
      throw new Error("options.strict was renamed to lowS");
    if (format !== void 0 && format !== "compact" && format !== "der")
      throw new Error("format must be compact or der");
    const isHex = typeof sg === "string" || isBytes2(sg);
    const isObj = !isHex && !format && typeof sg === "object" && sg !== null && typeof sg.r === "bigint" && typeof sg.s === "bigint";
    if (!isHex && !isObj)
      throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
    let _sig = void 0;
    let P;
    try {
      if (isObj)
        _sig = new Signature2(sg.r, sg.s);
      if (isHex) {
        try {
          if (format !== "compact")
            _sig = Signature2.fromDER(sg);
        } catch (derError) {
          if (!(derError instanceof DER.Err))
            throw derError;
        }
        if (!_sig && format !== "der")
          _sig = Signature2.fromCompact(sg);
      }
      P = Point2.fromHex(publicKey);
    } catch (error) {
      return false;
    }
    if (!_sig)
      return false;
    if (lowS && _sig.hasHighS())
      return false;
    if (prehash)
      msgHash = CURVE.hash(msgHash);
    const { r, s } = _sig;
    const h = bits2int_modN(msgHash);
    const is = invN(s);
    const u1 = modN2(h * is);
    const u2 = modN2(r * is);
    const R = Point2.BASE.multiplyAndAddUnsafe(P, u1, u2)?.toAffine();
    if (!R)
      return false;
    const v = modN2(R.x);
    return v === r;
  }
  return {
    CURVE,
    getPublicKey: getPublicKey2,
    getSharedSecret,
    sign,
    verify,
    ProjectivePoint: Point2,
    Signature: Signature2,
    utils
  };
}

// node_modules/.pnpm/@noble+curves@1.8.1/node_modules/@noble/curves/esm/_shortw_utils.js
function getHash(hash) {
  return {
    hash,
    hmac: (key, ...msgs) => hmac(hash, key, concatBytes(...msgs)),
    randomBytes
  };
}
function createCurve(curveDef, defHash) {
  const create = (hash) => weierstrass({ ...curveDef, ...getHash(hash) });
  return { ...create(defHash), create };
}

// node_modules/.pnpm/@noble+curves@1.8.1/node_modules/@noble/curves/esm/secp256k1.js
var secp256k1P = BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f");
var secp256k1N = BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141");
var _1n5 = BigInt(1);
var _2n4 = BigInt(2);
var divNearest = (a, b) => (a + b / _2n4) / b;
function sqrtMod(y) {
  const P = secp256k1P;
  const _3n3 = BigInt(3), _6n = BigInt(6), _11n = BigInt(11), _22n = BigInt(22);
  const _23n = BigInt(23), _44n = BigInt(44), _88n = BigInt(88);
  const b2 = y * y * y % P;
  const b3 = b2 * b2 * y % P;
  const b6 = pow2(b3, _3n3, P) * b3 % P;
  const b9 = pow2(b6, _3n3, P) * b3 % P;
  const b11 = pow2(b9, _2n4, P) * b2 % P;
  const b22 = pow2(b11, _11n, P) * b11 % P;
  const b44 = pow2(b22, _22n, P) * b22 % P;
  const b88 = pow2(b44, _44n, P) * b44 % P;
  const b176 = pow2(b88, _88n, P) * b88 % P;
  const b220 = pow2(b176, _44n, P) * b44 % P;
  const b223 = pow2(b220, _3n3, P) * b3 % P;
  const t1 = pow2(b223, _23n, P) * b22 % P;
  const t2 = pow2(t1, _6n, P) * b2 % P;
  const root = pow2(t2, _2n4, P);
  if (!Fpk1.eql(Fpk1.sqr(root), y))
    throw new Error("Cannot find square root");
  return root;
}
var Fpk1 = Field(secp256k1P, void 0, void 0, { sqrt: sqrtMod });
var secp256k1 = createCurve({
  a: BigInt(0),
  // equation params: a, b
  b: BigInt(7),
  Fp: Fpk1,
  // Field's prime: 2n**256n - 2n**32n - 2n**9n - 2n**8n - 2n**7n - 2n**6n - 2n**4n - 1n
  n: secp256k1N,
  // Curve order, total count of valid points in the field
  // Base point (x, y) aka generator point
  Gx: BigInt("55066263022277343669578718895168534326250603453777594175500187360389116729240"),
  Gy: BigInt("32670510020758816978083085130507043184471273380659243275938904335757337482424"),
  h: BigInt(1),
  // Cofactor
  lowS: true,
  // Allow only low-S signatures by default in sign() and verify()
  endo: {
    // Endomorphism, see above
    beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
    splitScalar: (k) => {
      const n = secp256k1N;
      const a1 = BigInt("0x3086d221a7d46bcde86c90e49284eb15");
      const b1 = -_1n5 * BigInt("0xe4437ed6010e88286f547fa90abfe4c3");
      const a2 = BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8");
      const b2 = a1;
      const POW_2_128 = BigInt("0x100000000000000000000000000000000");
      const c1 = divNearest(b2 * k, n);
      const c2 = divNearest(-b1 * k, n);
      let k1 = mod(k - c1 * a1 - c2 * a2, n);
      let k2 = mod(-c1 * b1 - c2 * b2, n);
      const k1neg = k1 > POW_2_128;
      const k2neg = k2 > POW_2_128;
      if (k1neg)
        k1 = n - k1;
      if (k2neg)
        k2 = n - k2;
      if (k1 > POW_2_128 || k2 > POW_2_128) {
        throw new Error("splitScalar: Endomorphism failed, k=" + k);
      }
      return { k1neg, k1, k2neg, k2 };
    }
  }
}, sha256);
var _0n5 = BigInt(0);
var TAGGED_HASH_PREFIXES = {};
function taggedHash(tag, ...messages) {
  let tagP = TAGGED_HASH_PREFIXES[tag];
  if (tagP === void 0) {
    const tagH = sha256(Uint8Array.from(tag, (c) => c.charCodeAt(0)));
    tagP = concatBytes2(tagH, tagH);
    TAGGED_HASH_PREFIXES[tag] = tagP;
  }
  return sha256(concatBytes2(tagP, ...messages));
}
var pointToBytes = (point) => point.toRawBytes(true).slice(1);
var numTo32b = (n) => numberToBytesBE(n, 32);
var modP = (x) => mod(x, secp256k1P);
var modN = (x) => mod(x, secp256k1N);
var Point = secp256k1.ProjectivePoint;
var GmulAdd = (Q, a, b) => Point.BASE.multiplyAndAddUnsafe(Q, a, b);
function schnorrGetExtPubKey(priv) {
  let d_ = secp256k1.utils.normPrivateKeyToScalar(priv);
  let p = Point.fromPrivateKey(d_);
  const scalar = p.hasEvenY() ? d_ : modN(-d_);
  return { scalar, bytes: pointToBytes(p) };
}
function lift_x(x) {
  aInRange("x", x, _1n5, secp256k1P);
  const xx = modP(x * x);
  const c = modP(xx * x + BigInt(7));
  let y = sqrtMod(c);
  if (y % _2n4 !== _0n5)
    y = modP(-y);
  const p = new Point(x, y, _1n5);
  p.assertValidity();
  return p;
}
var num = bytesToNumberBE;
function challenge(...args) {
  return modN(num(taggedHash("BIP0340/challenge", ...args)));
}
function schnorrGetPublicKey(privateKey) {
  return schnorrGetExtPubKey(privateKey).bytes;
}
function schnorrSign(message, privateKey, auxRand = randomBytes(32)) {
  const m = ensureBytes("message", message);
  const { bytes: px, scalar: d } = schnorrGetExtPubKey(privateKey);
  const a = ensureBytes("auxRand", auxRand, 32);
  const t = numTo32b(d ^ num(taggedHash("BIP0340/aux", a)));
  const rand = taggedHash("BIP0340/nonce", t, px, m);
  const k_ = modN(num(rand));
  if (k_ === _0n5)
    throw new Error("sign failed: k is zero");
  const { bytes: rx, scalar: k } = schnorrGetExtPubKey(k_);
  const e = challenge(rx, px, m);
  const sig = new Uint8Array(64);
  sig.set(rx, 0);
  sig.set(numTo32b(modN(k + e * d)), 32);
  if (!schnorrVerify(sig, m, px))
    throw new Error("sign: Invalid signature produced");
  return sig;
}
function schnorrVerify(signature, message, publicKey) {
  const sig = ensureBytes("signature", signature, 64);
  const m = ensureBytes("message", message);
  const pub = ensureBytes("publicKey", publicKey, 32);
  try {
    const P = lift_x(num(pub));
    const r = num(sig.subarray(0, 32));
    if (!inRange(r, _1n5, secp256k1P))
      return false;
    const s = num(sig.subarray(32, 64));
    if (!inRange(s, _1n5, secp256k1N))
      return false;
    const e = challenge(numTo32b(r), pointToBytes(P), m);
    const R = GmulAdd(P, s, modN(-e));
    if (!R || !R.hasEvenY() || R.toAffine().x !== r)
      return false;
    return true;
  } catch (error) {
    return false;
  }
}
var schnorr = /* @__PURE__ */ (() => ({
  getPublicKey: schnorrGetPublicKey,
  sign: schnorrSign,
  verify: schnorrVerify,
  utils: {
    randomPrivateKey: secp256k1.utils.randomPrivateKey,
    lift_x,
    pointToBytes,
    numberToBytesBE,
    bytesToNumberBE,
    taggedHash,
    mod
  }
}))();

// node_modules/.pnpm/@noble+hashes@1.7.1/node_modules/@noble/hashes/esm/hkdf.js
function extract(hash, ikm, salt) {
  ahash(hash);
  if (salt === void 0)
    salt = new Uint8Array(hash.outputLen);
  return hmac(hash, toBytes(salt), toBytes(ikm));
}
var HKDF_COUNTER = /* @__PURE__ */ new Uint8Array([0]);
var EMPTY_BUFFER = /* @__PURE__ */ new Uint8Array();
function expand(hash, prk, info, length = 32) {
  ahash(hash);
  anumber(length);
  if (length > 255 * hash.outputLen)
    throw new Error("Length should be <= 255*HashLen");
  const blocks = Math.ceil(length / hash.outputLen);
  if (info === void 0)
    info = EMPTY_BUFFER;
  const okm = new Uint8Array(blocks * hash.outputLen);
  const HMAC2 = hmac.create(hash, prk);
  const HMACTmp = HMAC2._cloneInto();
  const T = new Uint8Array(HMAC2.outputLen);
  for (let counter = 0; counter < blocks; counter++) {
    HKDF_COUNTER[0] = counter + 1;
    HMACTmp.update(counter === 0 ? EMPTY_BUFFER : T).update(info).update(HKDF_COUNTER).digestInto(T);
    okm.set(T, hash.outputLen * counter);
    HMAC2._cloneInto(HMACTmp);
  }
  HMAC2.destroy();
  HMACTmp.destroy();
  T.fill(0);
  HKDF_COUNTER.fill(0);
  return okm.slice(0, length);
}

// node_modules/.pnpm/@noble+ciphers@1.2.1/node_modules/@noble/ciphers/esm/_assert.js
function anumber2(n) {
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error("positive integer expected, got " + n);
}
function isBytes3(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function abytes3(b, ...lengths) {
  if (!isBytes3(b))
    throw new Error("Uint8Array expected");
  if (lengths.length > 0 && !lengths.includes(b.length))
    throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
}
function aexists2(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished)
    throw new Error("Hash#digest() has already been called");
}
function aoutput2(out, instance) {
  abytes3(out);
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error("digestInto() expects output buffer of length at least " + min);
  }
}
function abool2(b) {
  if (typeof b !== "boolean")
    throw new Error(`boolean expected, not ${b}`);
}

// node_modules/.pnpm/@noble+ciphers@1.2.1/node_modules/@noble/ciphers/esm/utils.js
var u32 = (arr) => new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
var createView2 = (arr) => new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
var isLE = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
if (!isLE)
  throw new Error("Non little-endian hardware is not supported");
function utf8ToBytes3(str) {
  if (typeof str !== "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(str));
}
function toBytes2(data) {
  if (typeof data === "string")
    data = utf8ToBytes3(data);
  else if (isBytes3(data))
    data = copyBytes(data);
  else
    throw new Error("Uint8Array expected, got " + typeof data);
  return data;
}
function checkOpts(defaults, opts) {
  if (opts == null || typeof opts !== "object")
    throw new Error("options must be defined");
  const merged = Object.assign(defaults, opts);
  return merged;
}
function equalBytes2(a, b) {
  if (a.length !== b.length)
    return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++)
    diff |= a[i] ^ b[i];
  return diff === 0;
}
var wrapCipher = /* @__NO_SIDE_EFFECTS__ */ (params, constructor) => {
  function wrappedCipher(key, ...args) {
    abytes3(key);
    if (params.nonceLength !== void 0) {
      const nonce = args[0];
      if (!nonce)
        throw new Error("nonce / iv required");
      if (params.varSizeNonce)
        abytes3(nonce);
      else
        abytes3(nonce, params.nonceLength);
    }
    const tagl = params.tagLength;
    if (tagl && args[1] !== void 0) {
      abytes3(args[1]);
    }
    const cipher = constructor(key, ...args);
    const checkOutput = (fnLength, output) => {
      if (output !== void 0) {
        if (fnLength !== 2)
          throw new Error("cipher output not supported");
        abytes3(output);
      }
    };
    let called = false;
    const wrCipher = {
      encrypt(data, output) {
        if (called)
          throw new Error("cannot encrypt() twice with same key + nonce");
        called = true;
        abytes3(data);
        checkOutput(cipher.encrypt.length, output);
        return cipher.encrypt(data, output);
      },
      decrypt(data, output) {
        abytes3(data);
        if (tagl && data.length < tagl)
          throw new Error("invalid ciphertext length: smaller than tagLength=" + tagl);
        checkOutput(cipher.decrypt.length, output);
        return cipher.decrypt(data, output);
      }
    };
    return wrCipher;
  }
  Object.assign(wrappedCipher, params);
  return wrappedCipher;
};
function getOutput(expectedLength, out, onlyAligned = true) {
  if (out === void 0)
    return new Uint8Array(expectedLength);
  if (out.length !== expectedLength)
    throw new Error("invalid output length, expected " + expectedLength + ", got: " + out.length);
  if (onlyAligned && !isAligned32(out))
    throw new Error("invalid output, must be aligned");
  return out;
}
function setBigUint642(view, byteOffset, value, isLE2) {
  if (typeof view.setBigUint64 === "function")
    return view.setBigUint64(byteOffset, value, isLE2);
  const _32n = BigInt(32);
  const _u32_max = BigInt(4294967295);
  const wh = Number(value >> _32n & _u32_max);
  const wl = Number(value & _u32_max);
  const h = isLE2 ? 4 : 0;
  const l = isLE2 ? 0 : 4;
  view.setUint32(byteOffset + h, wh, isLE2);
  view.setUint32(byteOffset + l, wl, isLE2);
}
function isAligned32(bytes) {
  return bytes.byteOffset % 4 === 0;
}
function copyBytes(bytes) {
  return Uint8Array.from(bytes);
}
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}

// node_modules/.pnpm/@noble+ciphers@1.2.1/node_modules/@noble/ciphers/esm/_arx.js
var _utf8ToBytes = (str) => Uint8Array.from(str.split("").map((c) => c.charCodeAt(0)));
var sigma16 = _utf8ToBytes("expand 16-byte k");
var sigma32 = _utf8ToBytes("expand 32-byte k");
var sigma16_32 = u32(sigma16);
var sigma32_32 = u32(sigma32);
function rotl(a, b) {
  return a << b | a >>> 32 - b;
}
function isAligned322(b) {
  return b.byteOffset % 4 === 0;
}
var BLOCK_LEN = 64;
var BLOCK_LEN32 = 16;
var MAX_COUNTER = 2 ** 32 - 1;
var U32_EMPTY = new Uint32Array();
function runCipher(core, sigma, key, nonce, data, output, counter, rounds) {
  const len = data.length;
  const block = new Uint8Array(BLOCK_LEN);
  const b32 = u32(block);
  const isAligned = isAligned322(data) && isAligned322(output);
  const d32 = isAligned ? u32(data) : U32_EMPTY;
  const o32 = isAligned ? u32(output) : U32_EMPTY;
  for (let pos = 0; pos < len; counter++) {
    core(sigma, key, nonce, b32, counter, rounds);
    if (counter >= MAX_COUNTER)
      throw new Error("arx: counter overflow");
    const take = Math.min(BLOCK_LEN, len - pos);
    if (isAligned && take === BLOCK_LEN) {
      const pos32 = pos / 4;
      if (pos % 4 !== 0)
        throw new Error("arx: invalid block position");
      for (let j = 0, posj; j < BLOCK_LEN32; j++) {
        posj = pos32 + j;
        o32[posj] = d32[posj] ^ b32[j];
      }
      pos += BLOCK_LEN;
      continue;
    }
    for (let j = 0, posj; j < take; j++) {
      posj = pos + j;
      output[posj] = data[posj] ^ block[j];
    }
    pos += take;
  }
}
function createCipher(core, opts) {
  const { allowShortKeys, extendNonceFn, counterLength, counterRight, rounds } = checkOpts({ allowShortKeys: false, counterLength: 8, counterRight: false, rounds: 20 }, opts);
  if (typeof core !== "function")
    throw new Error("core must be a function");
  anumber2(counterLength);
  anumber2(rounds);
  abool2(counterRight);
  abool2(allowShortKeys);
  return (key, nonce, data, output, counter = 0) => {
    abytes3(key);
    abytes3(nonce);
    abytes3(data);
    const len = data.length;
    if (output === void 0)
      output = new Uint8Array(len);
    abytes3(output);
    anumber2(counter);
    if (counter < 0 || counter >= MAX_COUNTER)
      throw new Error("arx: counter overflow");
    if (output.length < len)
      throw new Error(`arx: output (${output.length}) is shorter than data (${len})`);
    const toClean = [];
    let l = key.length;
    let k;
    let sigma;
    if (l === 32) {
      toClean.push(k = copyBytes(key));
      sigma = sigma32_32;
    } else if (l === 16 && allowShortKeys) {
      k = new Uint8Array(32);
      k.set(key);
      k.set(key, 16);
      sigma = sigma16_32;
      toClean.push(k);
    } else {
      throw new Error(`arx: invalid 32-byte key, got length=${l}`);
    }
    if (!isAligned322(nonce))
      toClean.push(nonce = copyBytes(nonce));
    const k32 = u32(k);
    if (extendNonceFn) {
      if (nonce.length !== 24)
        throw new Error(`arx: extended nonce must be 24 bytes`);
      extendNonceFn(sigma, k32, u32(nonce.subarray(0, 16)), k32);
      nonce = nonce.subarray(16);
    }
    const nonceNcLen = 16 - counterLength;
    if (nonceNcLen !== nonce.length)
      throw new Error(`arx: nonce must be ${nonceNcLen} or 16 bytes`);
    if (nonceNcLen !== 12) {
      const nc = new Uint8Array(12);
      nc.set(nonce, counterRight ? 0 : 12 - nonce.length);
      nonce = nc;
      toClean.push(nonce);
    }
    const n32 = u32(nonce);
    runCipher(core, sigma, k32, n32, data, output, counter, rounds);
    clean(...toClean);
    return output;
  };
}

// node_modules/.pnpm/@noble+ciphers@1.2.1/node_modules/@noble/ciphers/esm/_poly1305.js
var u8to16 = (a, i) => a[i++] & 255 | (a[i++] & 255) << 8;
var Poly1305 = class {
  constructor(key) {
    this.blockLen = 16;
    this.outputLen = 16;
    this.buffer = new Uint8Array(16);
    this.r = new Uint16Array(10);
    this.h = new Uint16Array(10);
    this.pad = new Uint16Array(8);
    this.pos = 0;
    this.finished = false;
    key = toBytes2(key);
    abytes3(key, 32);
    const t0 = u8to16(key, 0);
    const t1 = u8to16(key, 2);
    const t2 = u8to16(key, 4);
    const t3 = u8to16(key, 6);
    const t4 = u8to16(key, 8);
    const t5 = u8to16(key, 10);
    const t6 = u8to16(key, 12);
    const t7 = u8to16(key, 14);
    this.r[0] = t0 & 8191;
    this.r[1] = (t0 >>> 13 | t1 << 3) & 8191;
    this.r[2] = (t1 >>> 10 | t2 << 6) & 7939;
    this.r[3] = (t2 >>> 7 | t3 << 9) & 8191;
    this.r[4] = (t3 >>> 4 | t4 << 12) & 255;
    this.r[5] = t4 >>> 1 & 8190;
    this.r[6] = (t4 >>> 14 | t5 << 2) & 8191;
    this.r[7] = (t5 >>> 11 | t6 << 5) & 8065;
    this.r[8] = (t6 >>> 8 | t7 << 8) & 8191;
    this.r[9] = t7 >>> 5 & 127;
    for (let i = 0; i < 8; i++)
      this.pad[i] = u8to16(key, 16 + 2 * i);
  }
  process(data, offset, isLast = false) {
    const hibit = isLast ? 0 : 1 << 11;
    const { h, r } = this;
    const r0 = r[0];
    const r1 = r[1];
    const r2 = r[2];
    const r3 = r[3];
    const r4 = r[4];
    const r5 = r[5];
    const r6 = r[6];
    const r7 = r[7];
    const r8 = r[8];
    const r9 = r[9];
    const t0 = u8to16(data, offset + 0);
    const t1 = u8to16(data, offset + 2);
    const t2 = u8to16(data, offset + 4);
    const t3 = u8to16(data, offset + 6);
    const t4 = u8to16(data, offset + 8);
    const t5 = u8to16(data, offset + 10);
    const t6 = u8to16(data, offset + 12);
    const t7 = u8to16(data, offset + 14);
    let h0 = h[0] + (t0 & 8191);
    let h1 = h[1] + ((t0 >>> 13 | t1 << 3) & 8191);
    let h2 = h[2] + ((t1 >>> 10 | t2 << 6) & 8191);
    let h3 = h[3] + ((t2 >>> 7 | t3 << 9) & 8191);
    let h4 = h[4] + ((t3 >>> 4 | t4 << 12) & 8191);
    let h5 = h[5] + (t4 >>> 1 & 8191);
    let h6 = h[6] + ((t4 >>> 14 | t5 << 2) & 8191);
    let h7 = h[7] + ((t5 >>> 11 | t6 << 5) & 8191);
    let h8 = h[8] + ((t6 >>> 8 | t7 << 8) & 8191);
    let h9 = h[9] + (t7 >>> 5 | hibit);
    let c = 0;
    let d0 = c + h0 * r0 + h1 * (5 * r9) + h2 * (5 * r8) + h3 * (5 * r7) + h4 * (5 * r6);
    c = d0 >>> 13;
    d0 &= 8191;
    d0 += h5 * (5 * r5) + h6 * (5 * r4) + h7 * (5 * r3) + h8 * (5 * r2) + h9 * (5 * r1);
    c += d0 >>> 13;
    d0 &= 8191;
    let d1 = c + h0 * r1 + h1 * r0 + h2 * (5 * r9) + h3 * (5 * r8) + h4 * (5 * r7);
    c = d1 >>> 13;
    d1 &= 8191;
    d1 += h5 * (5 * r6) + h6 * (5 * r5) + h7 * (5 * r4) + h8 * (5 * r3) + h9 * (5 * r2);
    c += d1 >>> 13;
    d1 &= 8191;
    let d2 = c + h0 * r2 + h1 * r1 + h2 * r0 + h3 * (5 * r9) + h4 * (5 * r8);
    c = d2 >>> 13;
    d2 &= 8191;
    d2 += h5 * (5 * r7) + h6 * (5 * r6) + h7 * (5 * r5) + h8 * (5 * r4) + h9 * (5 * r3);
    c += d2 >>> 13;
    d2 &= 8191;
    let d3 = c + h0 * r3 + h1 * r2 + h2 * r1 + h3 * r0 + h4 * (5 * r9);
    c = d3 >>> 13;
    d3 &= 8191;
    d3 += h5 * (5 * r8) + h6 * (5 * r7) + h7 * (5 * r6) + h8 * (5 * r5) + h9 * (5 * r4);
    c += d3 >>> 13;
    d3 &= 8191;
    let d4 = c + h0 * r4 + h1 * r3 + h2 * r2 + h3 * r1 + h4 * r0;
    c = d4 >>> 13;
    d4 &= 8191;
    d4 += h5 * (5 * r9) + h6 * (5 * r8) + h7 * (5 * r7) + h8 * (5 * r6) + h9 * (5 * r5);
    c += d4 >>> 13;
    d4 &= 8191;
    let d5 = c + h0 * r5 + h1 * r4 + h2 * r3 + h3 * r2 + h4 * r1;
    c = d5 >>> 13;
    d5 &= 8191;
    d5 += h5 * r0 + h6 * (5 * r9) + h7 * (5 * r8) + h8 * (5 * r7) + h9 * (5 * r6);
    c += d5 >>> 13;
    d5 &= 8191;
    let d6 = c + h0 * r6 + h1 * r5 + h2 * r4 + h3 * r3 + h4 * r2;
    c = d6 >>> 13;
    d6 &= 8191;
    d6 += h5 * r1 + h6 * r0 + h7 * (5 * r9) + h8 * (5 * r8) + h9 * (5 * r7);
    c += d6 >>> 13;
    d6 &= 8191;
    let d7 = c + h0 * r7 + h1 * r6 + h2 * r5 + h3 * r4 + h4 * r3;
    c = d7 >>> 13;
    d7 &= 8191;
    d7 += h5 * r2 + h6 * r1 + h7 * r0 + h8 * (5 * r9) + h9 * (5 * r8);
    c += d7 >>> 13;
    d7 &= 8191;
    let d8 = c + h0 * r8 + h1 * r7 + h2 * r6 + h3 * r5 + h4 * r4;
    c = d8 >>> 13;
    d8 &= 8191;
    d8 += h5 * r3 + h6 * r2 + h7 * r1 + h8 * r0 + h9 * (5 * r9);
    c += d8 >>> 13;
    d8 &= 8191;
    let d9 = c + h0 * r9 + h1 * r8 + h2 * r7 + h3 * r6 + h4 * r5;
    c = d9 >>> 13;
    d9 &= 8191;
    d9 += h5 * r4 + h6 * r3 + h7 * r2 + h8 * r1 + h9 * r0;
    c += d9 >>> 13;
    d9 &= 8191;
    c = (c << 2) + c | 0;
    c = c + d0 | 0;
    d0 = c & 8191;
    c = c >>> 13;
    d1 += c;
    h[0] = d0;
    h[1] = d1;
    h[2] = d2;
    h[3] = d3;
    h[4] = d4;
    h[5] = d5;
    h[6] = d6;
    h[7] = d7;
    h[8] = d8;
    h[9] = d9;
  }
  finalize() {
    const { h, pad: pad2 } = this;
    const g = new Uint16Array(10);
    let c = h[1] >>> 13;
    h[1] &= 8191;
    for (let i = 2; i < 10; i++) {
      h[i] += c;
      c = h[i] >>> 13;
      h[i] &= 8191;
    }
    h[0] += c * 5;
    c = h[0] >>> 13;
    h[0] &= 8191;
    h[1] += c;
    c = h[1] >>> 13;
    h[1] &= 8191;
    h[2] += c;
    g[0] = h[0] + 5;
    c = g[0] >>> 13;
    g[0] &= 8191;
    for (let i = 1; i < 10; i++) {
      g[i] = h[i] + c;
      c = g[i] >>> 13;
      g[i] &= 8191;
    }
    g[9] -= 1 << 13;
    let mask = (c ^ 1) - 1;
    for (let i = 0; i < 10; i++)
      g[i] &= mask;
    mask = ~mask;
    for (let i = 0; i < 10; i++)
      h[i] = h[i] & mask | g[i];
    h[0] = (h[0] | h[1] << 13) & 65535;
    h[1] = (h[1] >>> 3 | h[2] << 10) & 65535;
    h[2] = (h[2] >>> 6 | h[3] << 7) & 65535;
    h[3] = (h[3] >>> 9 | h[4] << 4) & 65535;
    h[4] = (h[4] >>> 12 | h[5] << 1 | h[6] << 14) & 65535;
    h[5] = (h[6] >>> 2 | h[7] << 11) & 65535;
    h[6] = (h[7] >>> 5 | h[8] << 8) & 65535;
    h[7] = (h[8] >>> 8 | h[9] << 5) & 65535;
    let f = h[0] + pad2[0];
    h[0] = f & 65535;
    for (let i = 1; i < 8; i++) {
      f = (h[i] + pad2[i] | 0) + (f >>> 16) | 0;
      h[i] = f & 65535;
    }
    clean(g);
  }
  update(data) {
    aexists2(this);
    const { buffer, blockLen } = this;
    data = toBytes2(data);
    const len = data.length;
    for (let pos = 0; pos < len; ) {
      const take = Math.min(blockLen - this.pos, len - pos);
      if (take === blockLen) {
        for (; blockLen <= len - pos; pos += blockLen)
          this.process(data, pos);
        continue;
      }
      buffer.set(data.subarray(pos, pos + take), this.pos);
      this.pos += take;
      pos += take;
      if (this.pos === blockLen) {
        this.process(buffer, 0, false);
        this.pos = 0;
      }
    }
    return this;
  }
  destroy() {
    clean(this.h, this.r, this.buffer, this.pad);
  }
  digestInto(out) {
    aexists2(this);
    aoutput2(out, this);
    this.finished = true;
    const { buffer, h } = this;
    let { pos } = this;
    if (pos) {
      buffer[pos++] = 1;
      for (; pos < 16; pos++)
        buffer[pos] = 0;
      this.process(buffer, 0, true);
    }
    this.finalize();
    let opos = 0;
    for (let i = 0; i < 8; i++) {
      out[opos++] = h[i] >>> 0;
      out[opos++] = h[i] >>> 8;
    }
    return out;
  }
  digest() {
    const { buffer, outputLen } = this;
    this.digestInto(buffer);
    const res = buffer.slice(0, outputLen);
    this.destroy();
    return res;
  }
};
function wrapConstructorWithKey(hashCons) {
  const hashC = (msg, key) => hashCons(key).update(toBytes2(msg)).digest();
  const tmp = hashCons(new Uint8Array(32));
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = (key) => hashCons(key);
  return hashC;
}
var poly1305 = wrapConstructorWithKey((key) => new Poly1305(key));

// node_modules/.pnpm/@noble+ciphers@1.2.1/node_modules/@noble/ciphers/esm/chacha.js
function chachaCore(s, k, n, out, cnt, rounds = 20) {
  let y00 = s[0], y01 = s[1], y02 = s[2], y03 = s[3], y04 = k[0], y05 = k[1], y06 = k[2], y07 = k[3], y08 = k[4], y09 = k[5], y10 = k[6], y11 = k[7], y12 = cnt, y13 = n[0], y14 = n[1], y15 = n[2];
  let x00 = y00, x01 = y01, x02 = y02, x03 = y03, x04 = y04, x05 = y05, x06 = y06, x07 = y07, x08 = y08, x09 = y09, x10 = y10, x11 = y11, x12 = y12, x13 = y13, x14 = y14, x15 = y15;
  for (let r = 0; r < rounds; r += 2) {
    x00 = x00 + x04 | 0;
    x12 = rotl(x12 ^ x00, 16);
    x08 = x08 + x12 | 0;
    x04 = rotl(x04 ^ x08, 12);
    x00 = x00 + x04 | 0;
    x12 = rotl(x12 ^ x00, 8);
    x08 = x08 + x12 | 0;
    x04 = rotl(x04 ^ x08, 7);
    x01 = x01 + x05 | 0;
    x13 = rotl(x13 ^ x01, 16);
    x09 = x09 + x13 | 0;
    x05 = rotl(x05 ^ x09, 12);
    x01 = x01 + x05 | 0;
    x13 = rotl(x13 ^ x01, 8);
    x09 = x09 + x13 | 0;
    x05 = rotl(x05 ^ x09, 7);
    x02 = x02 + x06 | 0;
    x14 = rotl(x14 ^ x02, 16);
    x10 = x10 + x14 | 0;
    x06 = rotl(x06 ^ x10, 12);
    x02 = x02 + x06 | 0;
    x14 = rotl(x14 ^ x02, 8);
    x10 = x10 + x14 | 0;
    x06 = rotl(x06 ^ x10, 7);
    x03 = x03 + x07 | 0;
    x15 = rotl(x15 ^ x03, 16);
    x11 = x11 + x15 | 0;
    x07 = rotl(x07 ^ x11, 12);
    x03 = x03 + x07 | 0;
    x15 = rotl(x15 ^ x03, 8);
    x11 = x11 + x15 | 0;
    x07 = rotl(x07 ^ x11, 7);
    x00 = x00 + x05 | 0;
    x15 = rotl(x15 ^ x00, 16);
    x10 = x10 + x15 | 0;
    x05 = rotl(x05 ^ x10, 12);
    x00 = x00 + x05 | 0;
    x15 = rotl(x15 ^ x00, 8);
    x10 = x10 + x15 | 0;
    x05 = rotl(x05 ^ x10, 7);
    x01 = x01 + x06 | 0;
    x12 = rotl(x12 ^ x01, 16);
    x11 = x11 + x12 | 0;
    x06 = rotl(x06 ^ x11, 12);
    x01 = x01 + x06 | 0;
    x12 = rotl(x12 ^ x01, 8);
    x11 = x11 + x12 | 0;
    x06 = rotl(x06 ^ x11, 7);
    x02 = x02 + x07 | 0;
    x13 = rotl(x13 ^ x02, 16);
    x08 = x08 + x13 | 0;
    x07 = rotl(x07 ^ x08, 12);
    x02 = x02 + x07 | 0;
    x13 = rotl(x13 ^ x02, 8);
    x08 = x08 + x13 | 0;
    x07 = rotl(x07 ^ x08, 7);
    x03 = x03 + x04 | 0;
    x14 = rotl(x14 ^ x03, 16);
    x09 = x09 + x14 | 0;
    x04 = rotl(x04 ^ x09, 12);
    x03 = x03 + x04 | 0;
    x14 = rotl(x14 ^ x03, 8);
    x09 = x09 + x14 | 0;
    x04 = rotl(x04 ^ x09, 7);
  }
  let oi = 0;
  out[oi++] = y00 + x00 | 0;
  out[oi++] = y01 + x01 | 0;
  out[oi++] = y02 + x02 | 0;
  out[oi++] = y03 + x03 | 0;
  out[oi++] = y04 + x04 | 0;
  out[oi++] = y05 + x05 | 0;
  out[oi++] = y06 + x06 | 0;
  out[oi++] = y07 + x07 | 0;
  out[oi++] = y08 + x08 | 0;
  out[oi++] = y09 + x09 | 0;
  out[oi++] = y10 + x10 | 0;
  out[oi++] = y11 + x11 | 0;
  out[oi++] = y12 + x12 | 0;
  out[oi++] = y13 + x13 | 0;
  out[oi++] = y14 + x14 | 0;
  out[oi++] = y15 + x15 | 0;
}
function hchacha(s, k, i, o32) {
  let x00 = s[0], x01 = s[1], x02 = s[2], x03 = s[3], x04 = k[0], x05 = k[1], x06 = k[2], x07 = k[3], x08 = k[4], x09 = k[5], x10 = k[6], x11 = k[7], x12 = i[0], x13 = i[1], x14 = i[2], x15 = i[3];
  for (let r = 0; r < 20; r += 2) {
    x00 = x00 + x04 | 0;
    x12 = rotl(x12 ^ x00, 16);
    x08 = x08 + x12 | 0;
    x04 = rotl(x04 ^ x08, 12);
    x00 = x00 + x04 | 0;
    x12 = rotl(x12 ^ x00, 8);
    x08 = x08 + x12 | 0;
    x04 = rotl(x04 ^ x08, 7);
    x01 = x01 + x05 | 0;
    x13 = rotl(x13 ^ x01, 16);
    x09 = x09 + x13 | 0;
    x05 = rotl(x05 ^ x09, 12);
    x01 = x01 + x05 | 0;
    x13 = rotl(x13 ^ x01, 8);
    x09 = x09 + x13 | 0;
    x05 = rotl(x05 ^ x09, 7);
    x02 = x02 + x06 | 0;
    x14 = rotl(x14 ^ x02, 16);
    x10 = x10 + x14 | 0;
    x06 = rotl(x06 ^ x10, 12);
    x02 = x02 + x06 | 0;
    x14 = rotl(x14 ^ x02, 8);
    x10 = x10 + x14 | 0;
    x06 = rotl(x06 ^ x10, 7);
    x03 = x03 + x07 | 0;
    x15 = rotl(x15 ^ x03, 16);
    x11 = x11 + x15 | 0;
    x07 = rotl(x07 ^ x11, 12);
    x03 = x03 + x07 | 0;
    x15 = rotl(x15 ^ x03, 8);
    x11 = x11 + x15 | 0;
    x07 = rotl(x07 ^ x11, 7);
    x00 = x00 + x05 | 0;
    x15 = rotl(x15 ^ x00, 16);
    x10 = x10 + x15 | 0;
    x05 = rotl(x05 ^ x10, 12);
    x00 = x00 + x05 | 0;
    x15 = rotl(x15 ^ x00, 8);
    x10 = x10 + x15 | 0;
    x05 = rotl(x05 ^ x10, 7);
    x01 = x01 + x06 | 0;
    x12 = rotl(x12 ^ x01, 16);
    x11 = x11 + x12 | 0;
    x06 = rotl(x06 ^ x11, 12);
    x01 = x01 + x06 | 0;
    x12 = rotl(x12 ^ x01, 8);
    x11 = x11 + x12 | 0;
    x06 = rotl(x06 ^ x11, 7);
    x02 = x02 + x07 | 0;
    x13 = rotl(x13 ^ x02, 16);
    x08 = x08 + x13 | 0;
    x07 = rotl(x07 ^ x08, 12);
    x02 = x02 + x07 | 0;
    x13 = rotl(x13 ^ x02, 8);
    x08 = x08 + x13 | 0;
    x07 = rotl(x07 ^ x08, 7);
    x03 = x03 + x04 | 0;
    x14 = rotl(x14 ^ x03, 16);
    x09 = x09 + x14 | 0;
    x04 = rotl(x04 ^ x09, 12);
    x03 = x03 + x04 | 0;
    x14 = rotl(x14 ^ x03, 8);
    x09 = x09 + x14 | 0;
    x04 = rotl(x04 ^ x09, 7);
  }
  let oi = 0;
  o32[oi++] = x00;
  o32[oi++] = x01;
  o32[oi++] = x02;
  o32[oi++] = x03;
  o32[oi++] = x12;
  o32[oi++] = x13;
  o32[oi++] = x14;
  o32[oi++] = x15;
}
var chacha20 = /* @__PURE__ */ createCipher(chachaCore, {
  counterRight: false,
  counterLength: 4,
  allowShortKeys: false
});
var xchacha20 = /* @__PURE__ */ createCipher(chachaCore, {
  counterRight: false,
  counterLength: 8,
  extendNonceFn: hchacha,
  allowShortKeys: false
});
var ZEROS16 = /* @__PURE__ */ new Uint8Array(16);
var updatePadded = (h, msg) => {
  h.update(msg);
  const left = msg.length % 16;
  if (left)
    h.update(ZEROS16.subarray(left));
};
var ZEROS32 = /* @__PURE__ */ new Uint8Array(32);
function computeTag(fn, key, nonce, data, AAD) {
  const authKey = fn(key, nonce, ZEROS32);
  const h = poly1305.create(authKey);
  if (AAD)
    updatePadded(h, AAD);
  updatePadded(h, data);
  const num2 = new Uint8Array(16);
  const view = createView2(num2);
  setBigUint642(view, 0, BigInt(AAD ? AAD.length : 0), true);
  setBigUint642(view, 8, BigInt(data.length), true);
  h.update(num2);
  const res = h.digest();
  clean(authKey, num2);
  return res;
}
var _poly1305_aead = (xorStream) => (key, nonce, AAD) => {
  const tagLength = 16;
  return {
    encrypt(plaintext, output) {
      const plength = plaintext.length;
      output = getOutput(plength + tagLength, output, false);
      output.set(plaintext);
      const oPlain = output.subarray(0, -tagLength);
      xorStream(key, nonce, oPlain, oPlain, 1);
      const tag = computeTag(xorStream, key, nonce, oPlain, AAD);
      output.set(tag, plength);
      clean(tag);
      return output;
    },
    decrypt(ciphertext, output) {
      output = getOutput(ciphertext.length - tagLength, output, false);
      const data = ciphertext.subarray(0, -tagLength);
      const passedTag = ciphertext.subarray(-tagLength);
      const tag = computeTag(xorStream, key, nonce, data, AAD);
      if (!equalBytes2(passedTag, tag))
        throw new Error("invalid tag");
      output.set(ciphertext.subarray(0, -tagLength));
      xorStream(key, nonce, output, output, 1);
      clean(tag);
      return output;
    }
  };
};
var chacha20poly1305 = /* @__PURE__ */ wrapCipher({ blockSize: 64, nonceLength: 12, tagLength: 16 }, _poly1305_aead(chacha20));
var xchacha20poly1305 = /* @__PURE__ */ wrapCipher({ blockSize: 64, nonceLength: 24, tagLength: 16 }, _poly1305_aead(xchacha20));

// node_modules/.pnpm/@scure+base@1.2.4/node_modules/@scure/base/lib/esm/index.js
function isBytes4(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function isArrayOf(isString, arr) {
  if (!Array.isArray(arr))
    return false;
  if (arr.length === 0)
    return true;
  if (isString) {
    return arr.every((item) => typeof item === "string");
  } else {
    return arr.every((item) => Number.isSafeInteger(item));
  }
}
function astr(label, input) {
  if (typeof input !== "string")
    throw new Error(`${label}: string expected`);
  return true;
}
function anumber3(n) {
  if (!Number.isSafeInteger(n))
    throw new Error(`invalid integer: ${n}`);
}
function aArr(input) {
  if (!Array.isArray(input))
    throw new Error("array expected");
}
function astrArr(label, input) {
  if (!isArrayOf(true, input))
    throw new Error(`${label}: array of strings expected`);
}
function anumArr(label, input) {
  if (!isArrayOf(false, input))
    throw new Error(`${label}: array of numbers expected`);
}
// @__NO_SIDE_EFFECTS__
function chain(...args) {
  const id = (a) => a;
  const wrap = (a, b) => (c) => a(b(c));
  const encode = args.map((x) => x.encode).reduceRight(wrap, id);
  const decode = args.map((x) => x.decode).reduce(wrap, id);
  return { encode, decode };
}
// @__NO_SIDE_EFFECTS__
function alphabet(letters) {
  const lettersA = typeof letters === "string" ? letters.split("") : letters;
  const len = lettersA.length;
  astrArr("alphabet", lettersA);
  const indexes = new Map(lettersA.map((l, i) => [l, i]));
  return {
    encode: (digits) => {
      aArr(digits);
      return digits.map((i) => {
        if (!Number.isSafeInteger(i) || i < 0 || i >= len)
          throw new Error(`alphabet.encode: digit index outside alphabet "${i}". Allowed: ${letters}`);
        return lettersA[i];
      });
    },
    decode: (input) => {
      aArr(input);
      return input.map((letter) => {
        astr("alphabet.decode", letter);
        const i = indexes.get(letter);
        if (i === void 0)
          throw new Error(`Unknown letter: "${letter}". Allowed: ${letters}`);
        return i;
      });
    }
  };
}
// @__NO_SIDE_EFFECTS__
function join(separator = "") {
  astr("join", separator);
  return {
    encode: (from) => {
      astrArr("join.decode", from);
      return from.join(separator);
    },
    decode: (to) => {
      astr("join.decode", to);
      return to.split(separator);
    }
  };
}
// @__NO_SIDE_EFFECTS__
function padding(bits, chr = "=") {
  anumber3(bits);
  astr("padding", chr);
  return {
    encode(data) {
      astrArr("padding.encode", data);
      while (data.length * bits % 8)
        data.push(chr);
      return data;
    },
    decode(input) {
      astrArr("padding.decode", input);
      let end = input.length;
      if (end * bits % 8)
        throw new Error("padding: invalid, string should have whole number of bytes");
      for (; end > 0 && input[end - 1] === chr; end--) {
        const last = end - 1;
        const byte = last * bits;
        if (byte % 8 === 0)
          throw new Error("padding: invalid, string has too much padding");
      }
      return input.slice(0, end);
    }
  };
}
var gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
var radix2carry = /* @__NO_SIDE_EFFECTS__ */ (from, to) => from + (to - gcd(from, to));
var powers = /* @__PURE__ */ (() => {
  let res = [];
  for (let i = 0; i < 40; i++)
    res.push(2 ** i);
  return res;
})();
function convertRadix2(data, from, to, padding2) {
  aArr(data);
  if (from <= 0 || from > 32)
    throw new Error(`convertRadix2: wrong from=${from}`);
  if (to <= 0 || to > 32)
    throw new Error(`convertRadix2: wrong to=${to}`);
  if (/* @__PURE__ */ radix2carry(from, to) > 32) {
    throw new Error(`convertRadix2: carry overflow from=${from} to=${to} carryBits=${/* @__PURE__ */ radix2carry(from, to)}`);
  }
  let carry = 0;
  let pos = 0;
  const max = powers[from];
  const mask = powers[to] - 1;
  const res = [];
  for (const n of data) {
    anumber3(n);
    if (n >= max)
      throw new Error(`convertRadix2: invalid data word=${n} from=${from}`);
    carry = carry << from | n;
    if (pos + from > 32)
      throw new Error(`convertRadix2: carry overflow pos=${pos} from=${from}`);
    pos += from;
    for (; pos >= to; pos -= to)
      res.push((carry >> pos - to & mask) >>> 0);
    const pow3 = powers[pos];
    if (pow3 === void 0)
      throw new Error("invalid carry");
    carry &= pow3 - 1;
  }
  carry = carry << to - pos & mask;
  if (!padding2 && pos >= from)
    throw new Error("Excess padding");
  if (!padding2 && carry > 0)
    throw new Error(`Non-zero padding: ${carry}`);
  if (padding2 && pos > 0)
    res.push(carry >>> 0);
  return res;
}
// @__NO_SIDE_EFFECTS__
function radix2(bits, revPadding = false) {
  anumber3(bits);
  if (bits <= 0 || bits > 32)
    throw new Error("radix2: bits should be in (0..32]");
  if (/* @__PURE__ */ radix2carry(8, bits) > 32 || /* @__PURE__ */ radix2carry(bits, 8) > 32)
    throw new Error("radix2: carry overflow");
  return {
    encode: (bytes) => {
      if (!isBytes4(bytes))
        throw new Error("radix2.encode input should be Uint8Array");
      return convertRadix2(Array.from(bytes), 8, bits, !revPadding);
    },
    decode: (digits) => {
      anumArr("radix2.decode", digits);
      return Uint8Array.from(convertRadix2(digits, bits, 8, revPadding));
    }
  };
}
var base64 = /* @__PURE__ */ chain(/* @__PURE__ */ radix2(6), /* @__PURE__ */ alphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"), /* @__PURE__ */ padding(6), /* @__PURE__ */ join(""));

// node_modules/.pnpm/nostr-effect@https+++github.com+OpenAgentsInc+nostr-effect+archive+46548d34fb1e6502763a_481a7ed9ebab8a5add931493e0c0a76f/node_modules/nostr-effect/src/wrappers/nip44.ts
var utf8Encoder = new TextEncoder();
var utf8Decoder = new TextDecoder();
var minPlaintextSize = 1;
var maxPlaintextSize = 65535;
function getConversationKey(privkeyA, pubkeyB) {
  const sharedX = secp256k1.getSharedSecret(privkeyA, "02" + pubkeyB).subarray(1, 33);
  return extract(sha256, sharedX, "nip44-v2");
}
function getMessageKeys(conversationKey, nonce) {
  const keys = expand(sha256, conversationKey, nonce, 76);
  return {
    chacha_key: keys.subarray(0, 32),
    chacha_nonce: keys.subarray(32, 44),
    hmac_key: keys.subarray(44, 76)
  };
}
function calcPaddedLen(len) {
  if (!Number.isSafeInteger(len) || len < 1) throw new Error("expected positive integer");
  if (len <= 32) return 32;
  const nextPower = 1 << Math.floor(Math.log2(len - 1)) + 1;
  const chunk = nextPower <= 256 ? 32 : nextPower / 8;
  return chunk * (Math.floor((len - 1) / chunk) + 1);
}
function writeU16BE(num2) {
  if (!Number.isSafeInteger(num2) || num2 < minPlaintextSize || num2 > maxPlaintextSize)
    throw new Error("invalid plaintext size: must be between 1 and 65535 bytes");
  const arr = new Uint8Array(2);
  new DataView(arr.buffer).setUint16(0, num2, false);
  return arr;
}
function pad(plaintext) {
  const unpadded = utf8Encoder.encode(plaintext);
  const unpaddedLen = unpadded.length;
  const prefix = writeU16BE(unpaddedLen);
  const suffix = new Uint8Array(calcPaddedLen(unpaddedLen) - unpaddedLen);
  return concatBytes(prefix, unpadded, suffix);
}
function unpad(padded) {
  const unpaddedLen = new DataView(padded.buffer).getUint16(0);
  const unpadded = padded.subarray(2, 2 + unpaddedLen);
  if (unpaddedLen < minPlaintextSize || unpaddedLen > maxPlaintextSize || unpadded.length !== unpaddedLen || padded.length !== 2 + calcPaddedLen(unpaddedLen))
    throw new Error("invalid padding");
  return utf8Decoder.decode(unpadded);
}
function hmacAad(key, message, aad) {
  if (aad.length !== 32) throw new Error("AAD associated data must be 32 bytes");
  const combined = concatBytes(aad, message);
  return hmac(sha256, key, combined);
}
function decodePayload(payload) {
  if (typeof payload !== "string") throw new Error("payload must be a valid string");
  const plen = payload.length;
  if (plen < 132 || plen > 87472) throw new Error("invalid payload length: " + plen);
  if (payload[0] === "#") throw new Error("unknown encryption version");
  let data;
  try {
    data = base64.decode(payload);
  } catch (error) {
    throw new Error("invalid base64: " + error.message);
  }
  const dlen = data.length;
  if (dlen < 99 || dlen > 65603) throw new Error("invalid data length: " + dlen);
  const vers = data[0];
  if (vers !== 2) throw new Error("unknown encryption version " + vers);
  return {
    nonce: data.subarray(1, 33),
    ciphertext: data.subarray(33, -32),
    mac: data.subarray(-32)
  };
}
function encrypt(plaintext, conversationKey, nonce = randomBytes(32)) {
  const { chacha_key, chacha_nonce, hmac_key } = getMessageKeys(conversationKey, nonce);
  const padded = pad(plaintext);
  const ciphertext = chacha20(chacha_key, chacha_nonce, padded);
  const mac = hmacAad(hmac_key, ciphertext, nonce);
  return base64.encode(concatBytes(new Uint8Array([2]), nonce, ciphertext, mac));
}
function decrypt(payload, conversationKey) {
  const { nonce, ciphertext, mac } = decodePayload(payload);
  const { chacha_key, chacha_nonce, hmac_key } = getMessageKeys(conversationKey, nonce);
  const calculatedMac = hmacAad(hmac_key, ciphertext, nonce);
  if (!equalBytes2(calculatedMac, mac)) throw new Error("invalid MAC");
  const padded = chacha20(chacha_key, chacha_nonce, ciphertext);
  return unpad(padded);
}

// node_modules/.pnpm/nostr-effect@https+++github.com+OpenAgentsInc+nostr-effect+archive+46548d34fb1e6502763a_481a7ed9ebab8a5add931493e0c0a76f/node_modules/nostr-effect/src/wrappers/pure.ts
var verifiedSymbol = /* @__PURE__ */ Symbol("verified");
var isRecord = (obj) => obj instanceof Object;
function validateEvent(event) {
  if (!isRecord(event)) return false;
  if (typeof event.kind !== "number") return false;
  if (typeof event.content !== "string") return false;
  if (typeof event.created_at !== "number") return false;
  if (typeof event.pubkey !== "string") return false;
  if (!event.pubkey.match(/^[a-f0-9]{64}$/)) return false;
  if (!Array.isArray(event.tags)) return false;
  for (let i = 0; i < event.tags.length; i++) {
    const tag = event.tags[i];
    if (!Array.isArray(tag)) return false;
    for (let j = 0; j < tag.length; j++) {
      if (typeof tag[j] !== "string") return false;
    }
  }
  return true;
}
function serializeEvent(evt) {
  if (!validateEvent(evt)) throw new Error("can't serialize event with wrong or missing properties");
  return JSON.stringify([0, evt.pubkey, evt.created_at, evt.kind, evt.tags, evt.content]);
}
function getEventHash(event) {
  const eventHash = sha256(new TextEncoder().encode(serializeEvent(event)));
  return bytesToHex(eventHash);
}
function generateSecretKey() {
  return schnorr.utils.randomPrivateKey();
}
function getPublicKey(secretKey) {
  return bytesToHex(schnorr.getPublicKey(secretKey));
}
function finalizeEvent(t, secretKey, auxiliaryRandomData) {
  const event = t;
  event.pubkey = bytesToHex(schnorr.getPublicKey(secretKey));
  event.id = getEventHash(event);
  event.sig = bytesToHex(schnorr.sign(event.id, secretKey, auxiliaryRandomData));
  event[verifiedSymbol] = true;
  return event;
}
function verifyEvent(event) {
  if (typeof event[verifiedSymbol] === "boolean") return event[verifiedSymbol];
  const hash = getEventHash(event);
  if (hash !== event.id) {
    event[verifiedSymbol] = false;
    return false;
  }
  try {
    const valid = schnorr.verify(event.sig, hash, event.pubkey);
    event[verifiedSymbol] = valid;
    return valid;
  } catch {
    event[verifiedSymbol] = false;
    return false;
  }
}

// node_modules/.pnpm/nostr-effect@https+++github.com+OpenAgentsInc+nostr-effect+archive+46548d34fb1e6502763a_481a7ed9ebab8a5add931493e0c0a76f/node_modules/nostr-effect/src/core/Nip59.ts
var SEAL_KIND = 13;
var GIFT_WRAP_KIND = 1059;
var TWO_DAYS = 2 * 24 * 60 * 60;
var HEX_64 = /^[a-f0-9]{64}$/;
function now() {
  return Math.floor(Date.now() / 1e3);
}
function randomizedTimestamp() {
  const random = randomBytes(4);
  const offset = new DataView(random.buffer, random.byteOffset, random.byteLength).getUint32(0) % TWO_DAYS;
  return now() - offset;
}
function requirePublicKey(publicKey, label) {
  if (!HEX_64.test(publicKey))
    throw new Error(`${label} must be 64 lowercase hexadecimal characters`);
}
function mutableTags(tags) {
  return tags.map((tag) => [...tag]);
}
function eventForVerification(event) {
  return {
    id: event.id,
    pubkey: event.pubkey,
    created_at: event.created_at,
    kind: event.kind,
    tags: mutableTags(event.tags),
    content: event.content,
    sig: event.sig
  };
}
function requireValidSignedEvent(event, label) {
  const candidate = eventForVerification(event);
  if (!validateEvent(candidate) || !verifyEvent(candidate))
    throw new Error(`${label} signature or ID is invalid`);
}
function requireRecipient(tags, recipient, label) {
  if (tags.length !== 1 || tags[0]?.length !== 2 || tags[0]?.[0] !== "p" || tags[0]?.[1] !== recipient) {
    throw new Error(`${label} must contain exactly one recipient tag`);
  }
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function requireExactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${label} has unexpected or missing fields`);
  }
}
function isTags(value) {
  return Array.isArray(value) && value.every((tag) => Array.isArray(tag) && tag.every((part) => typeof part === "string"));
}
function parseJsonObject(json, label) {
  let value;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
  if (!isRecord2(value)) throw new Error(`${label} must be a JSON object`);
  return value;
}
function parseSeal(json) {
  const value = parseJsonObject(json, "gift wrap seal");
  requireExactKeys(
    value,
    ["id", "pubkey", "created_at", "kind", "tags", "content", "sig"],
    "gift wrap seal"
  );
  if (typeof value.id !== "string" || typeof value.pubkey !== "string" || !Number.isSafeInteger(value.created_at) || value.kind !== SEAL_KIND || !isTags(value.tags) || value.tags.length !== 0 || typeof value.content !== "string" || typeof value.sig !== "string") {
    throw new Error("gift wrap seal has an invalid structure");
  }
  return value;
}
function parseRumor(json) {
  const value = parseJsonObject(json, "gift wrap rumor");
  requireExactKeys(
    value,
    ["id", "pubkey", "created_at", "kind", "tags", "content"],
    "gift wrap rumor"
  );
  if (typeof value.id !== "string" || typeof value.pubkey !== "string" || !Number.isSafeInteger(value.created_at) || !Number.isSafeInteger(value.kind) || value.kind < 0 || value.kind > 65535 || !isTags(value.tags) || typeof value.content !== "string") {
    throw new Error("gift wrap rumor has an invalid structure");
  }
  requirePublicKey(value.pubkey, "gift wrap rumor public key");
  if (!HEX_64.test(value.id)) throw new Error("gift wrap rumor ID is invalid");
  return value;
}
function rumorHash(rumor) {
  return getEventHash({
    pubkey: rumor.pubkey,
    created_at: rumor.created_at,
    kind: rumor.kind,
    tags: mutableTags(rumor.tags),
    content: rumor.content
  });
}
function createSeal(rumor, senderPrivateKey, recipientPublicKey, material = {}) {
  requirePublicKey(recipientPublicKey, "recipient public key");
  const senderPublicKey = getPublicKey(senderPrivateKey);
  if (rumor.pubkey !== senderPublicKey || rumor.id !== rumorHash(rumor)) {
    throw new Error("rumor author or ID does not match the sender");
  }
  const conversationKey = getConversationKey(senderPrivateKey, recipientPublicKey);
  const encryptedContent = encrypt(JSON.stringify(rumor), conversationKey, material.sealNonce);
  return finalizeEvent(
    {
      kind: SEAL_KIND,
      created_at: material.sealCreatedAt ?? randomizedTimestamp(),
      tags: [],
      content: encryptedContent
    },
    senderPrivateKey,
    material.sealAuxiliaryRandomData
  );
}
function createWrap(seal, recipientPublicKey, material = {}) {
  requirePublicKey(recipientPublicKey, "recipient public key");
  requireValidSignedEvent(seal, "gift wrap seal");
  if (seal.kind !== SEAL_KIND || seal.tags.length !== 0)
    throw new Error("gift wrap seal must be kind 13 with no tags");
  const wrapPrivateKey = material.wrapPrivateKey ?? generateSecretKey();
  if (getPublicKey(wrapPrivateKey) === seal.pubkey)
    throw new Error("gift wrap key must differ from the seal key");
  const conversationKey = getConversationKey(wrapPrivateKey, recipientPublicKey);
  const encryptedContent = encrypt(JSON.stringify(seal), conversationKey, material.wrapNonce);
  return finalizeEvent(
    {
      kind: GIFT_WRAP_KIND,
      created_at: material.wrapCreatedAt ?? randomizedTimestamp(),
      tags: [["p", recipientPublicKey]],
      content: encryptedContent
    },
    wrapPrivateKey,
    material.wrapAuxiliaryRandomData
  );
}
function unwrapEventWithDetails(wrap, recipientPrivateKey) {
  const recipientPublicKey = getPublicKey(recipientPrivateKey);
  if (wrap.kind !== GIFT_WRAP_KIND) throw new Error("gift wrap must use kind 1059");
  requireRecipient(wrap.tags, recipientPublicKey, "gift wrap");
  requireValidSignedEvent(wrap, "gift wrap");
  const wrapConversationKey = getConversationKey(recipientPrivateKey, wrap.pubkey);
  const seal = parseSeal(decrypt(wrap.content, wrapConversationKey));
  requireValidSignedEvent(seal, "gift wrap seal");
  if (wrap.pubkey === seal.pubkey) throw new Error("gift wrap key must differ from the seal key");
  const sealConversationKey = getConversationKey(recipientPrivateKey, seal.pubkey);
  const rumor = parseRumor(decrypt(seal.content, sealConversationKey));
  if (rumor.id !== rumorHash(rumor)) throw new Error("gift wrap rumor ID is invalid");
  if (rumor.pubkey !== seal.pubkey)
    throw new Error("gift wrap rumor author does not match the seal signer");
  return {
    rumor,
    seal,
    wrapId: wrap.id,
    sealId: seal.id,
    rumorId: rumor.id
  };
}

// node_modules/.pnpm/nostr-effect@https+++github.com+OpenAgentsInc+nostr-effect+archive+46548d34fb1e6502763a_481a7ed9ebab8a5add931493e0c0a76f/node_modules/nostr-effect/src/core/Schema.ts
import { Schema as Schema4 } from "effect";
var EventId = Schema4.String.pipe(
  Schema4.check(Schema4.isPattern(/^[a-f0-9]{64}$/)),
  Schema4.brand("EventId")
);
var PublicKey = Schema4.String.pipe(
  Schema4.check(Schema4.isPattern(/^[a-f0-9]{64}$/)),
  Schema4.brand("PublicKey")
);
var PrivateKey = Schema4.String.pipe(
  Schema4.check(Schema4.isPattern(/^[a-f0-9]{64}$/)),
  Schema4.brand("PrivateKey")
);
var Signature = Schema4.String.pipe(
  Schema4.check(Schema4.isPattern(/^[a-f0-9]{128}$/)),
  Schema4.brand("Signature")
);
var UnixTimestamp = Schema4.Int.pipe(
  Schema4.check(Schema4.isGreaterThanOrEqualTo(0)),
  Schema4.brand("UnixTimestamp")
);
var EventKind = Schema4.Int.pipe(
  Schema4.check(Schema4.isBetween({ minimum: 0, maximum: 65535 })),
  Schema4.brand("EventKind")
);
var Tag = Schema4.Array(Schema4.String).pipe(
  Schema4.check(Schema4.isMinLength(1)),
  Schema4.brand("Tag")
);
var SubscriptionId = Schema4.String.pipe(
  Schema4.check(Schema4.isMinLength(1), Schema4.isMaxLength(64)),
  Schema4.brand("SubscriptionId")
);
var NostrEvent = Schema4.Struct({
  id: EventId,
  pubkey: PublicKey,
  created_at: UnixTimestamp,
  kind: EventKind,
  tags: Schema4.Array(Tag),
  content: Schema4.String,
  sig: Signature
});
var UnsignedEvent = Schema4.Struct({
  pubkey: PublicKey,
  created_at: UnixTimestamp,
  kind: EventKind,
  tags: Schema4.Array(Tag),
  content: Schema4.String
});
var EventParams = Schema4.Struct({
  kind: EventKind,
  tags: Schema4.Array(Tag),
  content: Schema4.String
});
var SINGLE_LETTER_TAG = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
var TagFilterKey = Schema4.TemplateLiteral([
  Schema4.Literal("#"),
  Schema4.Literals(SINGLE_LETTER_TAG)
]);
var FilterFields = Schema4.Struct({
  ids: Schema4.optional(Schema4.Array(EventId)),
  authors: Schema4.optional(Schema4.Array(PublicKey)),
  kinds: Schema4.optional(Schema4.Array(EventKind)),
  since: Schema4.optional(UnixTimestamp),
  until: Schema4.optional(UnixTimestamp),
  limit: Schema4.optional(Schema4.Int.check(Schema4.isGreaterThan(0))),
  // NIP-50 search capability
  search: Schema4.optional(Schema4.String),
  // Common tag filters with tighter validation where the spec requires hex
  "#e": Schema4.optional(Schema4.Array(EventId)),
  "#p": Schema4.optional(Schema4.Array(PublicKey))
});
var Filter = Schema4.StructWithRest(FilterFields, [
  Schema4.Record(TagFilterKey, Schema4.Array(Schema4.String))
]).pipe(Schema4.brand("Filter"));
var ClientEventMessage = Schema4.Tuple(
  [Schema4.Literal("EVENT"), NostrEvent]
);
var ClientReqMessage = Schema4.TupleWithRest(
  Schema4.Tuple([Schema4.Literal("REQ"), SubscriptionId]),
  [Filter]
);
var ClientCloseMessage = Schema4.Tuple(
  [Schema4.Literal("CLOSE"), SubscriptionId]
);
var ClientAuthMessage = Schema4.Tuple(
  [Schema4.Literal("AUTH"), NostrEvent]
  // kind 22242 signed event
);
var ClientCountMessage = Schema4.TupleWithRest(
  Schema4.Tuple([Schema4.Literal("COUNT"), SubscriptionId]),
  [Filter]
);
var ClientNegOpenMessage = Schema4.Tuple(
  [Schema4.Literal("NEG-OPEN"), SubscriptionId, Filter, Schema4.String]
);
var ClientNegMsgMessage = Schema4.Tuple(
  [Schema4.Literal("NEG-MSG"), SubscriptionId, Schema4.String]
);
var ClientNegCloseMessage = Schema4.Tuple(
  [Schema4.Literal("NEG-CLOSE"), SubscriptionId]
);
var ClientMessage = Schema4.Union([
  ClientEventMessage,
  ClientReqMessage,
  ClientCloseMessage,
  ClientAuthMessage,
  ClientCountMessage,
  ClientNegOpenMessage,
  ClientNegMsgMessage,
  ClientNegCloseMessage
]);
var RelayEventMessage = Schema4.Tuple(
  [Schema4.Literal("EVENT"), SubscriptionId, NostrEvent]
);
var RelayOkMessage = Schema4.Tuple(
  [Schema4.Literal("OK"), EventId, Schema4.Boolean, Schema4.String]
  // reason
);
var EoseCompletenessHint = Schema4.String;
var RelayEoseMessage = Schema4.Union([
  Schema4.Tuple([Schema4.Literal("EOSE"), SubscriptionId, Schema4.Array(EoseCompletenessHint)]),
  Schema4.Tuple([Schema4.Literal("EOSE"), SubscriptionId])
]);
var RelayClosedMessage = Schema4.Tuple(
  [Schema4.Literal("CLOSED"), SubscriptionId, Schema4.String]
  // reason
);
var RelayNoticeMessage = Schema4.Tuple(
  [Schema4.Literal("NOTICE"), Schema4.String]
);
var RelayAuthMessage = Schema4.Tuple(
  [Schema4.Literal("AUTH"), Schema4.String]
  // challenge string
);
var RelayCountMessage = Schema4.Tuple(
  [
    Schema4.Literal("COUNT"),
    SubscriptionId,
    Schema4.Struct({
      count: Schema4.Number,
      approximate: Schema4.optional(Schema4.Boolean)
    })
  ]
);
var RelayMessage = Schema4.Union([
  RelayEventMessage,
  RelayOkMessage,
  RelayEoseMessage,
  RelayClosedMessage,
  RelayNoticeMessage,
  RelayAuthMessage,
  RelayCountMessage,
  // NIP-77
  Schema4.Tuple([Schema4.Literal("NEG-MSG"), SubscriptionId, Schema4.String]),
  Schema4.Tuple([Schema4.Literal("NEG-ERR"), SubscriptionId, Schema4.String])
]);

// node_modules/.pnpm/nostr-effect@https+++github.com+OpenAgentsInc+nostr-effect+archive+46548d34fb1e6502763a_481a7ed9ebab8a5add931493e0c0a76f/node_modules/nostr-effect/src/core/Errors.ts
import { Schema as Schema5 } from "effect";
var InvalidEventId = class extends Schema5.TaggedErrorClass()(
  "InvalidEventId",
  { message: Schema5.String }
) {
};
var InvalidSignature = class extends Schema5.TaggedErrorClass()(
  "InvalidSignature",
  { message: Schema5.String }
) {
};
var InvalidEventFormat = class extends Schema5.TaggedErrorClass()(
  "InvalidEventFormat",
  { message: Schema5.String }
) {
};
var EventValidationError = class extends Schema5.TaggedErrorClass()(
  "EventValidationError",
  { message: Schema5.String }
) {
};
var CryptoError = class extends Schema5.TaggedErrorClass()(
  "CryptoError",
  {
    message: Schema5.String,
    operation: Schema5.Literals([
      "sign",
      "verify",
      "hash",
      "generateKey",
      "encrypt",
      "decrypt",
      "getConversationKey",
      "encryptWithNonce"
    ])
  }
) {
};
var InvalidPrivateKey = class extends Schema5.TaggedErrorClass()(
  "InvalidPrivateKey",
  { message: Schema5.String }
) {
};
var InvalidPublicKey = class extends Schema5.TaggedErrorClass()(
  "InvalidPublicKey",
  { message: Schema5.String }
) {
};
var ObservabilityError = class extends Schema5.TaggedErrorClass()(
  "ObservabilityError",
  {
    message: Schema5.String,
    operation: Schema5.Literals([
      "buildTelemetryFrame",
      "buildControlFrame",
      "readFrame",
      "wrapFrame",
      "unwrapFrame"
    ])
  }
) {
};
var AgentMetricsError = class extends Schema5.TaggedErrorClass()(
  "AgentMetricsError",
  {
    message: Schema5.String,
    operation: Schema5.Literals(["buildTurnMetric", "readTurnMetric"])
  }
) {
};
var EncodingError = class extends Schema5.TaggedErrorClass()(
  "EncodingError",
  { message: Schema5.String }
) {
};
var DecodingError = class extends Schema5.TaggedErrorClass()(
  "DecodingError",
  { message: Schema5.String }
) {
};
var ConnectionError = class extends Schema5.TaggedErrorClass()(
  "ConnectionError",
  {
    message: Schema5.String,
    url: Schema5.String
  }
) {
};
var ConnectionClosed = class extends Schema5.TaggedErrorClass()(
  "ConnectionClosed",
  {
    message: Schema5.String,
    code: Schema5.optional(Schema5.Number),
    reason: Schema5.optional(Schema5.String)
  }
) {
};
var MessageSendError = class extends Schema5.TaggedErrorClass()(
  "MessageSendError",
  { message: Schema5.String }
) {
};
var TimeoutError = class extends Schema5.TaggedErrorClass()(
  "TimeoutError",
  {
    message: Schema5.String,
    durationMs: Schema5.Number
  }
) {
};
var RelayError = class extends Schema5.TaggedErrorClass()(
  "RelayError",
  {
    message: Schema5.String,
    relay: Schema5.String
  }
) {
};
var RelayNotice = class extends Schema5.TaggedErrorClass()(
  "RelayNotice",
  {
    message: Schema5.String,
    relay: Schema5.String
  }
) {
};
var SubscriptionError = class extends Schema5.TaggedErrorClass()(
  "SubscriptionError",
  {
    message: Schema5.String,
    subscriptionId: Schema5.String
  }
) {
};
var SubscriptionClosed = class extends Schema5.TaggedErrorClass()(
  "SubscriptionClosed",
  {
    subscriptionId: Schema5.String,
    reason: Schema5.String
  }
) {
};
var StorageError = class extends Schema5.TaggedErrorClass()(
  "StorageError",
  {
    message: Schema5.String,
    operation: Schema5.Literals(["insert", "query", "delete", "init", "upsert"])
  }
) {
};
var DuplicateEvent = class extends Schema5.TaggedErrorClass()(
  "DuplicateEvent",
  {
    eventId: Schema5.String
  }
) {
};
var MessageParseError = class extends Schema5.TaggedErrorClass()(
  "MessageParseError",
  {
    message: Schema5.String,
    raw: Schema5.String
  }
) {
};

// node_modules/.pnpm/nostr-effect@https+++github.com+OpenAgentsInc+nostr-effect+archive+46548d34fb1e6502763a_481a7ed9ebab8a5add931493e0c0a76f/node_modules/nostr-effect/src/core/Nip19.ts
import { Effect as Effect3 } from "effect";

// node_modules/.pnpm/nostr-effect@https+++github.com+OpenAgentsInc+nostr-effect+archive+46548d34fb1e6502763a_481a7ed9ebab8a5add931493e0c0a76f/node_modules/nostr-effect/src/core/NipAO.ts
import { Schema as Schema6 } from "effect";
var ObserverFrameDirection = Schema6.Literals(["telemetry", "control"]);
var ObserverEvent = Schema6.Struct({
  /** Monotonically increasing per session; used for drop detection. */
  seq: Schema6.Int,
  /** RFC 3339 datetime string with sub-second precision. */
  timestamp: Schema6.String,
  /** Frame kind (see {@link KNOWN_OBSERVER_EVENT_KINDS}); open for forward compat. */
  kind: Schema6.String,
  /** Agent index in multi-agent scenarios. */
  agentIndex: Schema6.optional(Schema6.NullOr(Schema6.Int)),
  /** Channel correlation UUID. */
  channelId: Schema6.optional(Schema6.NullOr(Schema6.String)),
  /** Session correlation id. */
  sessionId: Schema6.optional(Schema6.NullOr(Schema6.String)),
  /** Turn correlation id. */
  turnId: Schema6.optional(Schema6.NullOr(Schema6.String)),
  /** Kind-specific payload; MAY be `{}`. */
  payload: Schema6.Record(Schema6.String, Schema6.Unknown)
});
var ControlMessage = Schema6.Struct({
  /** Control type; the only defined value is {@link CONTROL_TYPE_CANCEL_TURN}. */
  type: Schema6.String,
  /** Target channel UUID. */
  channelId: Schema6.optional(Schema6.String)
});
var decodeObserverEventUnknown = Schema6.decodeUnknownSync(ObserverEvent);
var encodeObserverEvent = Schema6.encodeSync(ObserverEvent);
var decodeControlMessageUnknown = Schema6.decodeUnknownSync(ControlMessage);
var encodeControlMessage = Schema6.encodeSync(ControlMessage);

// node_modules/.pnpm/nostr-effect@https+++github.com+OpenAgentsInc+nostr-effect+archive+46548d34fb1e6502763a_481a7ed9ebab8a5add931493e0c0a76f/node_modules/nostr-effect/src/core/NipAA.ts
import { Effect as Effect5 } from "effect";

// node_modules/.pnpm/nostr-effect@https+++github.com+OpenAgentsInc+nostr-effect+archive+46548d34fb1e6502763a_481a7ed9ebab8a5add931493e0c0a76f/node_modules/nostr-effect/src/services/OwnerAttestationService.ts
import { Context, Effect as Effect4, Layer, Schema as Schema7 } from "effect";
var AGENT_AUTH_DOMAIN = "nostr:agent-auth:";
var AUTH_TAG_NAME = "auth";
var MAX_KIND = 65535;
var MAX_TIMESTAMP = 4294967295;
var HEX64 = /^[0-9a-f]{64}$/;
var HEX128 = /^[0-9a-f]{128}$/;
var DECIMAL = /^(0|[1-9][0-9]*)$/;
var CREATED_AT_PREFIX_LEN = "created_at<".length;
var KIND_PREFIX_LEN = "kind=".length;
var utf8Encoder2 = new TextEncoder();
var Nip0aError = class extends Schema7.TaggedErrorClass()(
  "Nip0aError",
  {
    reason: Schema7.Literals([
      "malformed_tag",
      "bad_signature",
      "stale_window",
      "unsatisfied_condition"
    ]),
    message: Schema7.String
  }
) {
};
var malformed = (message) => new Nip0aError({ reason: "malformed_tag", message });
var badSignature = (message) => new Nip0aError({ reason: "bad_signature", message });
var staleWindow = (message) => new Nip0aError({ reason: "stale_window", message });
var unsatisfied = (message) => new Nip0aError({ reason: "unsatisfied_condition", message });
var Clause = Schema7.Union([
  Schema7.Struct({ _tag: Schema7.Literal("kind"), value: Schema7.Int }),
  Schema7.Struct({ _tag: Schema7.Literal("created_at<"), value: Schema7.Int }),
  Schema7.Struct({ _tag: Schema7.Literal("created_at>"), value: Schema7.Int })
]);
var Conditions = Schema7.Array(Clause);
var AuthTag = Schema7.Struct({
  /** 64-character lowercase hex x-only owner public key. */
  ownerPubkey: Schema7.String,
  /** The exact `&`-joined conditions string, as signed. */
  conditions: Schema7.String,
  /** 128-character lowercase hex Schnorr signature. */
  sig: Schema7.String
});
var AuthTagTuple = Schema7.Tuple([
  Schema7.Literal(AUTH_TAG_NAME),
  Schema7.String,
  Schema7.String,
  Schema7.String
]);
var parseClause = (part) => {
  if (part.startsWith("kind=")) {
    const decimal = part.slice(KIND_PREFIX_LEN);
    if (!DECIMAL.test(decimal)) return null;
    const value = Number(decimal);
    if (value < 0 || value > MAX_KIND) return null;
    return { _tag: "kind", value };
  }
  if (part.startsWith("created_at<")) {
    const decimal = part.slice(CREATED_AT_PREFIX_LEN);
    if (!DECIMAL.test(decimal)) return null;
    const value = Number(decimal);
    if (value < 0 || value > MAX_TIMESTAMP) return null;
    return { _tag: "created_at<", value };
  }
  if (part.startsWith("created_at>")) {
    const decimal = part.slice(CREATED_AT_PREFIX_LEN);
    if (!DECIMAL.test(decimal)) return null;
    const value = Number(decimal);
    if (value < 0 || value > MAX_TIMESTAMP) return null;
    return { _tag: "created_at>", value };
  }
  return null;
};
var parseConditions = (raw) => {
  if (raw === "") return Effect4.succeed([]);
  if (/\s/.test(raw)) {
    return Effect4.fail(malformed("conditions must not contain whitespace"));
  }
  const parts = raw.split("&");
  const clauses = [];
  for (const part of parts) {
    if (part === "") {
      return Effect4.fail(
        malformed("conditions must not contain an empty clause")
      );
    }
    const clause = parseClause(part);
    if (clause === null) {
      return Effect4.fail(malformed(`unsupported or malformed clause: ${part}`));
    }
    clauses.push(clause);
  }
  return Effect4.succeed(clauses);
};
var parseAuthTag = (tag) => {
  if (tag.length !== 4) {
    return Effect4.fail(
      malformed(`auth tag must have exactly 4 elements, got ${tag.length}`)
    );
  }
  if (tag[0] !== AUTH_TAG_NAME) {
    return Effect4.fail(malformed(`auth tag name must be "${AUTH_TAG_NAME}"`));
  }
  const ownerPubkey = tag[1];
  const conditions = tag[2];
  const sig = tag[3];
  if (!HEX64.test(ownerPubkey)) {
    return Effect4.fail(
      malformed("owner pubkey must be 64-character lowercase hex")
    );
  }
  if (!HEX128.test(sig)) {
    return Effect4.fail(
      malformed("signature must be 128-character lowercase hex")
    );
  }
  return parseConditions(conditions).pipe(
    Effect4.map(() => ({ ownerPubkey, conditions, sig }))
  );
};
var findAuthTag = (tags) => {
  const authTags = tags.filter((t) => t[0] === AUTH_TAG_NAME);
  if (authTags.length === 0) {
    return Effect4.fail(malformed("event has no auth tag"));
  }
  if (authTags.length > 1) {
    return Effect4.fail(
      malformed("event has more than one auth tag; treated as no valid tag")
    );
  }
  return parseAuthTag(authTags[0]);
};
var authPreimage = (agentPubkey, conditions) => `${AGENT_AUTH_DOMAIN}${agentPubkey}:${conditions}`;
var signedMessage = (agentPubkey, conditions) => sha256(utf8Encoder2.encode(authPreimage(agentPubkey, conditions)));
var signAuthTag = (agentPubkey, conditions, ownerSeckey) => Effect4.gen(function* () {
  if (!HEX64.test(agentPubkey)) {
    return yield* Effect4.fail(
      malformed("agent pubkey must be 64-character lowercase hex")
    );
  }
  if (!HEX64.test(ownerSeckey)) {
    return yield* Effect4.fail(
      malformed("owner secret key must be 64-character lowercase hex")
    );
  }
  yield* parseConditions(conditions);
  const ownerPubkey = yield* Effect4.try({
    try: () => bytesToHex(schnorr.getPublicKey(hexToBytes(ownerSeckey))),
    catch: (error) => malformed(`failed to derive owner pubkey: ${error}`)
  });
  if (ownerPubkey === agentPubkey) {
    return yield* Effect4.fail(
      malformed("self-attestation: owner key equals agent key")
    );
  }
  const message = signedMessage(agentPubkey, conditions);
  const sig = yield* Effect4.try({
    try: () => bytesToHex(schnorr.sign(message, hexToBytes(ownerSeckey))),
    catch: (error) => malformed(`failed to sign attestation: ${error}`)
  });
  return { ownerPubkey, conditions, sig };
});
var verifyAuthTag = (authTag, agentPubkey) => Effect4.gen(function* () {
  const parsed = yield* parseAuthTag(authTag);
  if (!HEX64.test(agentPubkey)) {
    return yield* Effect4.fail(
      malformed("agent pubkey must be 64-character lowercase hex")
    );
  }
  if (parsed.ownerPubkey === agentPubkey) {
    return yield* Effect4.fail(
      malformed("self-attestation: owner key equals agent key")
    );
  }
  const message = signedMessage(agentPubkey, parsed.conditions);
  return yield* Effect4.try({
    try: () => schnorr.verify(
      hexToBytes(parsed.sig),
      message,
      hexToBytes(parsed.ownerPubkey)
    ),
    catch: (error) => malformed(`failed to verify signature: ${error}`)
  });
});
var verifyAuthTagForEvent = (authTag, event) => Effect4.gen(function* () {
  const parsed = yield* parseAuthTag(authTag);
  if (parsed.ownerPubkey === event.pubkey) {
    return yield* Effect4.fail(
      malformed("self-attestation: owner key equals agent key")
    );
  }
  const clauses = yield* parseConditions(parsed.conditions);
  const message = signedMessage(event.pubkey, parsed.conditions);
  const ok = yield* Effect4.try({
    try: () => schnorr.verify(
      hexToBytes(parsed.sig),
      message,
      hexToBytes(parsed.ownerPubkey)
    ),
    catch: (error) => malformed(`failed to verify signature: ${error}`)
  });
  if (!ok) {
    return yield* Effect4.fail(
      badSignature("owner signature does not verify for this event")
    );
  }
  for (const clause of clauses) {
    switch (clause._tag) {
      case "kind":
        if (event.kind !== clause.value) {
          return yield* Effect4.fail(
            unsatisfied(
              `event kind ${event.kind} does not satisfy kind=${clause.value}`
            )
          );
        }
        break;
      case "created_at<":
        if (!(event.created_at < clause.value)) {
          return yield* Effect4.fail(
            staleWindow(
              `event created_at ${event.created_at} does not satisfy created_at<${clause.value}`
            )
          );
        }
        break;
      case "created_at>":
        if (!(event.created_at > clause.value)) {
          return yield* Effect4.fail(
            staleWindow(
              `event created_at ${event.created_at} does not satisfy created_at>${clause.value}`
            )
          );
        }
        break;
    }
  }
  return true;
});
var OwnerAttestationService = Context.Service(
  "OwnerAttestationService"
);
var make = {
  _tag: "OwnerAttestationService",
  sign: signAuthTag,
  verify: verifyAuthTag,
  verifyForEvent: verifyAuthTagForEvent,
  parseTag: parseAuthTag,
  findTag: findAuthTag
};
var OwnerAttestationServiceLive = Layer.succeed(
  OwnerAttestationService,
  make
);

// node_modules/.pnpm/nostr-effect@https+++github.com+OpenAgentsInc+nostr-effect+archive+46548d34fb1e6502763a_481a7ed9ebab8a5add931493e0c0a76f/node_modules/nostr-effect/src/core/NipAA.ts
var utf8Encoder3 = new TextEncoder();

// node_modules/.pnpm/nostr-effect@https+++github.com+OpenAgentsInc+nostr-effect+archive+46548d34fb1e6502763a_481a7ed9ebab8a5add931493e0c0a76f/node_modules/nostr-effect/src/core/NipAM.ts
import { Schema as Schema8 } from "effect";
var NonNegInt = Schema8.Int.check(Schema8.isGreaterThanOrEqualTo(0));
var NonNegCost = Schema8.Finite.check(Schema8.isGreaterThanOrEqualTo(0));
var TokenUsage = Schema8.Struct({
  inputTokens: Schema8.optional(Schema8.NullOr(NonNegInt)),
  outputTokens: Schema8.optional(Schema8.NullOr(NonNegInt)),
  totalTokens: Schema8.optional(Schema8.NullOr(NonNegInt)),
  costUsd: Schema8.optional(Schema8.NullOr(NonNegCost)),
  cacheReadTokens: Schema8.optional(Schema8.NullOr(NonNegInt)),
  cacheWriteTokens: Schema8.optional(Schema8.NullOr(NonNegInt))
});
var TurnMetric = Schema8.Struct({
  /** Harness identifier (e.g. `"goose"`). */
  harness: Schema8.String,
  /** Model id, or null if unknown. */
  model: Schema8.optional(Schema8.NullOr(Schema8.String)),
  /** Channel correlation UUID. */
  channelId: Schema8.optional(Schema8.NullOr(Schema8.String)),
  /** Session correlation id. REQUIRED when `cumulative` is present. */
  sessionId: Schema8.optional(Schema8.NullOr(Schema8.String)),
  /** Turn correlation id. */
  turnId: Schema8.optional(Schema8.NullOr(Schema8.String)),
  /**
   * Per-session monotonically increasing integer. REQUIRED when `cumulative`
   * is present. Ordering within a session uses `(sessionId, turnSeq)`.
   */
  turnSeq: Schema8.optional(Schema8.NullOr(Schema8.Int)),
  /** RFC 3339 datetime string (end of turn). */
  timestamp: Schema8.String,
  /** Usage for THIS turn (computed delta). */
  turn: Schema8.optional(TokenUsage),
  /** Session-cumulative usage as reported at the end of this turn. */
  cumulative: Schema8.optional(TokenUsage),
  /**
   * `false` when the publisher could not observe the previous turn's
   * cumulative baseline, making the `turn` object unreliable for this event.
   */
  deltaReliable: Schema8.optional(Schema8.Boolean),
  /**
   * Why the turn ended. Known values: {@link KNOWN_STOP_REASONS}. Open for
   * forward compatibility — treat unrecognized as `"unknown"`.
   */
  stopReason: Schema8.optional(Schema8.String)
});
var decodeTurnMetricUnknown = Schema8.decodeUnknownSync(TurnMetric);
var encodeTurnMetric = Schema8.encodeSync(TurnMetric);

// node_modules/.pnpm/nostr-effect@https+++github.com+OpenAgentsInc+nostr-effect+archive+46548d34fb1e6502763a_481a7ed9ebab8a5add931493e0c0a76f/node_modules/nostr-effect/src/core/NipAB.ts
var INFO_SESSION_ID = new TextEncoder().encode("nostr-pair-session-id");
var INFO_SAS = new TextEncoder().encode("nostr-pair-sas-v1");
var INFO_TRANSCRIPT = new TextEncoder().encode("nostr-pair-transcript-v1");
var NIP44_SALT = new TextEncoder().encode("nip44-v2");
var utf8Encoder4 = new TextEncoder();
var utf8Decoder2 = new TextDecoder();

// node_modules/.pnpm/nostr-effect@https+++github.com+OpenAgentsInc+nostr-effect+archive+46548d34fb1e6502763a_481a7ed9ebab8a5add931493e0c0a76f/node_modules/nostr-effect/src/core/Nip29GroupPolicy.ts
var GROUP_PUT_USER_KIND = 9e3;
var GROUP_REMOVE_USER_KIND = 9001;
var GROUP_EDIT_METADATA_KIND = 9002;
var GROUP_DELETE_EVENT_KIND = 9005;
var GROUP_CREATE_GROUP_KIND = 9007;
var GROUP_DELETE_GROUP_KIND = 9008;
var GROUP_CREATE_INVITE_KIND = 9009;
var GROUP_UPDATE_PIN_LIST_KIND = 9010;
var MODERATION_PERMISSION = {
  [GROUP_PUT_USER_KIND]: "put-user",
  [GROUP_REMOVE_USER_KIND]: "remove-user",
  [GROUP_EDIT_METADATA_KIND]: "edit-metadata",
  [GROUP_DELETE_EVENT_KIND]: "delete-event",
  [GROUP_CREATE_GROUP_KIND]: "create-group",
  [GROUP_DELETE_GROUP_KIND]: "delete-group",
  [GROUP_CREATE_INVITE_KIND]: "create-invite",
  [GROUP_UPDATE_PIN_LIST_KIND]: "update-pin-list"
};

// vendor/nip-mkt/src/transport.ts
import { Effect as Effect7, Schema as Schema10 } from "effect";

// vendor/nip-mkt/src/validation.ts
import { Effect as Effect6, Schema as Schema9 } from "effect";
var MktValidationCodeSchema = Schema9.Literals([
  "duplicate_json_member",
  "envelope_mismatch",
  "event_too_large",
  "collection_limit",
  "invalid_event_shape",
  "invalid_event_signature",
  "invalid_kind",
  "invalid_identifier",
  "invalid_json",
  "invalid_reference",
  "tag_grammar",
  "unsupported_critical_member",
  "unsupported_profile",
  "unsupported_profile_version"
]);
var MktValidationError = class extends Schema9.TaggedErrorClass()(
  "MktValidationError",
  { code: MktValidationCodeSchema, message: Schema9.String }
) {
};
var decodeEvent = Schema9.decodeUnknownSync(NostrEventSchema);
var decodeEventEffect = Schema9.decodeUnknownEffect(NostrEventSchema);
var decodeEnvelope = Schema9.decodeUnknownSync(ProfileEnvelopeSchema);
var decodeNamedIdentifier = Schema9.decodeUnknownSync(NamedIdentifierSchema);
var decodeProviderStatus = Schema9.decodeUnknownSync(ProviderStatusSchema);
var decodeOfferingStatus = Schema9.decodeUnknownSync(OfferingStatusSchema);
var decodeDescriptorStatus = Schema9.decodeUnknownSync(DescriptorStatusSchema);
var decodePublicReceiptOutcome = Schema9.decodeUnknownSync(PublicReceiptOutcomeSchema);
var decodeQuoteType = Schema9.decodeUnknownSync(QuoteTypeSchema);
var decodeReservation = Schema9.decodeUnknownSync(ReservationSchema);
var decodeStatusState = Schema9.decodeUnknownSync(StatusStateSchema);
var decodeCancelAction = Schema9.decodeUnknownSync(CancelActionSchema);
var decodeCloseOutcome = Schema9.decodeUnknownSync(CloseOutcomeSchema);
var PRIVATE_KIND_SET = new Set(PRIVATE_MKT_KINDS);
var PUBLIC_KIND_SET = new Set(PUBLIC_MKT_KINDS);
var HEX_642 = /^[0-9a-f]{64}$/;
var POSITIVE_INTEGER = /^[1-9][0-9]*$/;
var DECIMAL_TIMESTAMP = /^(0|[1-9][0-9]*)$/;
var EVENT_MARKERS = /* @__PURE__ */ new Set([
  "rfq",
  "quote",
  "order",
  "previous",
  "status",
  "cancel",
  "close",
  "evidence",
  "settlement"
]);
var COUNTERPARTY_ROLES = /* @__PURE__ */ new Set(["requester", "provider"]);
function fail(code, message) {
  throw new MktValidationError({ code, message });
}
function validationFailure(cause) {
  return cause instanceof MktValidationError ? cause : new MktValidationError({ code: "invalid_event_shape", message: String(cause) });
}
function mutableEvent(decoded) {
  const tags = decoded.tags.map((tag) => Array.from(tag));
  return { ...decoded, tags };
}
function utf8Bytes(value) {
  return new TextEncoder().encode(value).byteLength;
}
function tagsNamed(event, name) {
  return event.tags.filter((tag) => tag[0] === name);
}
function exactlyOne(event, name) {
  const matches = tagsNamed(event, name);
  if (matches.length !== 1) fail("tag_grammar", `expected exactly one ${name} tag`);
  return matches[0];
}
function exactlyOneMarker(event, name, marker) {
  const matches = tagsNamed(event, name).filter((tag) => tag[3] === marker);
  if (matches.length !== 1) fail("tag_grammar", `expected exactly one ${marker} ${name} tag`);
  return matches[0];
}
function requireTagShape(tag, length, name) {
  if (tag.length !== length) fail("tag_grammar", `${name} tag has the wrong shape`);
}
function requireNamedIdentifier(value, label) {
  try {
    decodeNamedIdentifier(value);
  } catch {
    fail("invalid_identifier", `${label} is invalid`);
  }
}
function requireReferenceIdentifier(value, label) {
  try {
    decodeNamedIdentifier(value);
  } catch {
    fail("invalid_reference", `${label} is invalid`);
  }
}
function requireHex(value, label) {
  if (!HEX_642.test(value))
    fail("invalid_identifier", `${label} must be 64 lowercase hexadecimal characters`);
}
function requirePositive(value, label) {
  if (!POSITIVE_INTEGER.test(value)) fail("tag_grammar", `${label} must be a positive integer`);
  const decoded = Number(value);
  if (!Number.isSafeInteger(decoded)) fail("tag_grammar", `${label} is too large`);
  return decoded;
}
function requireTimestamp(value, label) {
  if (!DECIMAL_TIMESTAMP.test(value)) fail("tag_grammar", `${label} must be a decimal timestamp`);
  const decoded = Number(value);
  if (!Number.isSafeInteger(decoded)) fail("tag_grammar", `${label} is too large`);
  return decoded;
}
function requireEnum(decoder, value, label) {
  try {
    decoder(value);
  } catch {
    fail("tag_grammar", `${label} is invalid`);
  }
}
function requireProfileTag(tag) {
  requireTagShape(tag, 3, "profile");
  requireNamedIdentifier(tag[1], "profile id");
  return { id: tag[1], version: requirePositive(tag[2], "profile version") };
}
function requireEventReference(tag, marker) {
  if (tag.length !== 4 || tag[0] !== "e" || tag[3] !== marker) {
    fail("invalid_reference", `expected ${marker} event reference`);
  }
  if (!HEX_642.test(tag[1])) fail("invalid_reference", `${marker} event id is invalid`);
}
function requireCounterparty(event, role) {
  const matches = tagsNamed(event, "p").filter((tag) => tag[3] === role);
  if (matches.length !== 1) fail("tag_grammar", `expected exactly one ${role} counterparty`);
}
function validateReferenceTags(event, extensionMarkers = /* @__PURE__ */ new Set()) {
  const references = event.tags.filter((tag) => tag[0] === "e");
  if (references.length > MKT_LIMITS.causal_or_evidence_references) {
    fail("collection_limit", "too many causal or evidence references");
  }
  for (const tag of references) {
    if (tag.length !== 4 || !EVENT_MARKERS.has(tag[3]) && !extensionMarkers.has(tag[3]))
      fail("invalid_reference", "invalid event reference");
    if (!HEX_642.test(tag[1])) fail("invalid_reference", "event reference ID is invalid");
  }
  for (const tag of event.tags.filter(
    (candidate) => candidate[0] === "a" && candidate[3] === "offering"
  )) {
    if (tag.length !== 4) fail("invalid_reference", "invalid address reference");
    const match = /^39601:([0-9a-f]{64}):(.+)$/.exec(tag[1]);
    if (match === null) fail("invalid_reference", "invalid offering address");
    requireReferenceIdentifier(match[2], "offering id");
  }
}
function validateCommonBounds(event, extensionMarkers = /* @__PURE__ */ new Set()) {
  if (event.tags.length > MKT_LIMITS.tags) fail("collection_limit", "too many tags");
  if (tagsNamed(event, "p").length > MKT_LIMITS.counterparties)
    fail("collection_limit", "too many counterparties");
  if (tagsNamed(event, "profile").length > MKT_LIMITS.profiles)
    fail("collection_limit", "too many profiles");
  const hints = event.tags.filter(
    (tag) => (tag[0] === "p" || tag[0] === "e" || tag[0] === "a") && tag[2] || tag[0] === "relay"
  );
  if (hints.length > MKT_LIMITS.relay_or_endpoint_hints)
    fail("collection_limit", "too many relay hints");
  validateReferenceTags(event, extensionMarkers);
}
function validatePublicTags(event) {
  const identifier = exactlyOne(event, "d");
  requireTagShape(identifier, 2, "d");
  if (event.kind === 39603) {
    if (identifier[1].length === 0) fail("invalid_identifier", "receipt d identifier is empty");
  } else {
    requireNamedIdentifier(identifier[1], "d identifier");
  }
  if (event.kind === 39600) {
    const status = exactlyOne(event, "status");
    requireTagShape(status, 2, "status");
    requireEnum(decodeProviderStatus, status[1], "provider status");
    const profiles = tagsNamed(event, "profile");
    if (profiles.length === 0) fail("tag_grammar", "provider profile requires a profile tag");
    const seen = /* @__PURE__ */ new Set();
    for (const tag of profiles) {
      const profile = requireProfileTag(tag);
      const key = `${profile.id}:${profile.version}`;
      if (seen.has(key)) fail("tag_grammar", "duplicate profile version");
      seen.add(key);
    }
    const published = exactlyOne(event, "published_at");
    requireTagShape(published, 2, "published_at");
    requireTimestamp(published[1], "published_at");
  } else if (event.kind === 39601) {
    const profile = exactlyOne(event, "profile");
    requireProfileTag(profile);
    const status = exactlyOne(event, "status");
    requireTagShape(status, 2, "status");
    requireEnum(decodeOfferingStatus, status[1], "offering status");
    const provider = exactlyOne(event, "provider");
    requireTagShape(provider, 2, "provider");
    const match = /^39600:([0-9a-f]{64}):(.+)$/.exec(provider[1]);
    if (match === null || match[1] !== event.pubkey)
      fail("invalid_reference", "provider address is invalid");
    requireReferenceIdentifier(match[2], "provider id");
    const published = exactlyOne(event, "published_at");
    requireTagShape(published, 2, "published_at");
    requireTimestamp(published[1], "published_at");
  } else if (event.kind === 39602) {
    const version = exactlyOne(event, "version");
    requireTagShape(version, 2, "version");
    requirePositive(version[1], "version");
    const digest = exactlyOne(event, "x");
    requireTagShape(digest, 2, "x");
    requireHex(digest[1], "profile digest");
    const retrieval = exactlyOne(event, "r");
    requireTagShape(retrieval, 2, "r");
    try {
      const url = new URL(retrieval[1]);
      if (url.protocol !== "http:" && url.protocol !== "https:" || url.host.length === 0 || /\s/.test(retrieval[1])) {
        fail("tag_grammar", "profile retrieval URL is invalid");
      }
    } catch {
      fail("tag_grammar", "profile retrieval URL is invalid");
    }
    const status = exactlyOne(event, "status");
    requireTagShape(status, 2, "status");
    requireEnum(decodeDescriptorStatus, status[1], "descriptor status");
  } else {
    const profile = exactlyOne(event, "profile");
    requireProfileTag(profile);
    const outcome = exactlyOne(event, "outcome");
    requireTagShape(outcome, 2, "outcome");
    requireEnum(decodePublicReceiptOutcome, outcome[1], "receipt outcome");
    const close = exactlyOne(event, "x");
    requireTagShape(close, 2, "x");
    if (!HEX_642.test(close[1])) fail("invalid_reference", "close event id is invalid");
    const role = exactlyOne(event, "role");
    requireTagShape(role, 2, "role");
    requireNamedIdentifier(role[1], "receipt role");
  }
}
function validatePrivateTags(event, validateKindTags) {
  const identifier = exactlyOne(event, "d");
  requireTagShape(identifier, 2, "d");
  requireHex(identifier[1], "d identifier");
  const session = exactlyOne(event, "session");
  requireTagShape(session, 2, "session");
  requireHex(session[1], "session id");
  const profile = requireProfileTag(exactlyOne(event, "profile"));
  const counterparties = tagsNamed(event, "p");
  if (counterparties.length === 0) fail("tag_grammar", "private record requires a counterparty");
  let roleMarkedCounterparties = 0;
  for (const tag of counterparties) {
    if (tag.length !== 4 || !COUNTERPARTY_ROLES.has(tag[3])) continue;
    roleMarkedCounterparties += 1;
    requireHex(tag[1], "counterparty public key");
  }
  if (roleMarkedCounterparties === 0)
    fail("tag_grammar", "private record requires a role-marked counterparty");
  const alt = exactlyOne(event, "alt");
  requireTagShape(alt, 2, "alt");
  if (alt[1].length === 0) fail("tag_grammar", "alt text must not be empty");
  if (utf8Bytes(alt[1]) > 128 || Array.from(alt[1]).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  })) {
    fail("tag_grammar", "alt text is invalid");
  }
  if (!validateKindTags) {
    return { profile: profile.id, version: profile.version, session: session[1] };
  }
  if (event.kind === 39604) {
    requireCounterparty(event, "provider");
    const offering = exactlyOneMarker(event, "a", "offering");
    const match = /^39601:[0-9a-f]{64}:(.+)$/.exec(offering[1]);
    if (match === null || offering[3] !== "offering")
      fail("invalid_reference", "offering reference is invalid");
    requireReferenceIdentifier(match[1], "offering id");
    const expiration = exactlyOne(event, "expiration");
    requireTagShape(expiration, 2, "expiration");
    requireTimestamp(expiration[1], "expiration");
  } else if (event.kind === 39605) {
    requireEventReference(exactlyOneMarker(event, "e", "rfq"), "rfq");
    requireCounterparty(event, "requester");
    const expiration = exactlyOne(event, "expiration");
    requireTagShape(expiration, 2, "expiration");
    requireTimestamp(expiration[1], "expiration");
    const quote = exactlyOne(event, "quote");
    requireTagShape(quote, 2, "quote");
    requireEnum(decodeQuoteType, quote[1], "quote type");
    const reservation = exactlyOne(event, "reservation");
    requireTagShape(reservation, 2, "reservation");
    requireEnum(decodeReservation, reservation[1], "reservation");
  } else if (event.kind === 39606) {
    requireEventReference(exactlyOneMarker(event, "e", "quote"), "quote");
    requireCounterparty(event, "provider");
  } else if (event.kind === 39607) {
    requireEventReference(exactlyOneMarker(event, "e", "order"), "order");
    const sequence = exactlyOne(event, "seq");
    requireTagShape(sequence, 2, "seq");
    const sequenceNumber = requireTimestamp(sequence[1], "seq");
    const state = exactlyOne(event, "state");
    requireTagShape(state, 2, "state");
    requireEnum(decodeStatusState, state[1], "status state");
    const previous = tagsNamed(event, "e").filter((tag) => tag[3] === "previous");
    if (sequenceNumber === 0 && previous.length !== 0)
      fail("tag_grammar", "sequence zero must not have previous");
    if (sequenceNumber > 0 && previous.length !== 1)
      fail("tag_grammar", "status requires previous");
    if (previous[0]) requireEventReference(previous[0], "previous");
  } else if (event.kind === 39608) {
    requireEventReference(exactlyOneMarker(event, "e", "order"), "order");
    const action = exactlyOne(event, "action");
    requireTagShape(action, 2, "action");
    requireEnum(decodeCancelAction, action[1], "cancel action");
    const reason = exactlyOne(event, "reason");
    requireTagShape(reason, 2, "reason");
    if (reason[1].length === 0) fail("tag_grammar", "cancel reason must not be empty");
  } else {
    requireEventReference(exactlyOneMarker(event, "e", "order"), "order");
    const outcome = exactlyOne(event, "outcome");
    requireTagShape(outcome, 2, "outcome");
    requireEnum(decodeCloseOutcome, outcome[1], "close outcome");
    const terminal = exactlyOne(event, "terminal_at");
    requireTagShape(terminal, 2, "terminal_at");
    requireTimestamp(terminal[1], "terminal_at");
  }
  return { profile: profile.id, version: profile.version, session: session[1] };
}
function parseJsonRejectingDuplicateMembers(raw) {
  let index = 0;
  const whitespace = () => {
    while (/\s/.test(raw[index] ?? "")) index += 1;
  };
  const stringToken = () => {
    const start = index;
    if (raw[index] !== '"') fail("invalid_json", "expected JSON string");
    index += 1;
    while (index < raw.length) {
      const character = raw[index];
      if (character === '"') {
        index += 1;
        try {
          return JSON.parse(raw.slice(start, index));
        } catch {
          fail("invalid_json", "invalid JSON string");
        }
      }
      if (character === "\\") {
        index += 2;
      } else {
        if (character.charCodeAt(0) < 32)
          fail("invalid_json", "control character in JSON string");
        index += 1;
      }
    }
    fail("invalid_json", "unterminated JSON string");
  };
  const value = () => {
    whitespace();
    const character = raw[index];
    if (character === '"') {
      stringToken();
    } else if (character === "{") {
      index += 1;
      whitespace();
      const members = /* @__PURE__ */ new Set();
      if (raw[index] === "}") {
        index += 1;
        return;
      }
      while (true) {
        whitespace();
        const key = stringToken();
        if (members.has(key)) fail("duplicate_json_member", `duplicate JSON member: ${key}`);
        members.add(key);
        whitespace();
        if (raw[index] !== ":") fail("invalid_json", "expected colon");
        index += 1;
        value();
        whitespace();
        if (raw[index] === "}") {
          index += 1;
          return;
        }
        if (raw[index] !== ",") fail("invalid_json", "expected comma");
        index += 1;
      }
    } else if (character === "[") {
      index += 1;
      whitespace();
      if (raw[index] === "]") {
        index += 1;
        return;
      }
      while (true) {
        value();
        whitespace();
        if (raw[index] === "]") {
          index += 1;
          return;
        }
        if (raw[index] !== ",") fail("invalid_json", "expected comma");
        index += 1;
      }
    } else {
      const match = /^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/.exec(
        raw.slice(index)
      );
      if (match === null) fail("invalid_json", "invalid JSON value");
      index += match[0].length;
    }
  };
  value();
  whitespace();
  if (index !== raw.length) fail("invalid_json", "trailing bytes after JSON value");
  try {
    return JSON.parse(raw);
  } catch {
    fail("invalid_json", "invalid JSON");
  }
}
function decodeNostrEvent(raw) {
  const value = parseJsonRejectingDuplicateMembers(raw);
  try {
    return mutableEvent(decodeEvent(value));
  } catch {
    fail("invalid_event_shape", "signed event structure is invalid");
  }
}
function decodeContentEnvelope(content) {
  const value = parseJsonRejectingDuplicateMembers(content);
  try {
    return decodeEnvelope(value);
  } catch {
    fail("envelope_mismatch", "content envelope is invalid");
  }
}
function validatePublicHead(event) {
  if (!PUBLIC_KIND_SET.has(event.kind)) fail("invalid_kind", "event is not a public MKT head");
  const maximum = event.kind === 39603 ? MKT_LIMITS.receipt_content_bytes : MKT_LIMITS.discovery_content_bytes;
  if (utf8Bytes(event.content) > maximum) fail("event_too_large", "public content is too large");
  const content = parseJsonRejectingDuplicateMembers(event.content);
  if (typeof content !== "object" || content === null || Array.isArray(content)) {
    fail("invalid_json", "public MKT content must be a JSON object");
  }
  validateCommonBounds(event);
  validatePublicTags(event);
  return event;
}
function validateRawPrivateRecordBase(raw, validateKindTags = true) {
  if (utf8Bytes(raw) > MKT_LIMITS.private_signed_record_bytes)
    fail("event_too_large", "private signed record is too large");
  const event = decodeNostrEvent(raw);
  return validateDecodedPrivateRecord(raw, event, validateKindTags);
}
function validateDecodedPrivateRecord(raw, event, validateKindTags, extensionKinds = /* @__PURE__ */ new Set(), extensionMarkers = /* @__PURE__ */ new Set()) {
  const baseKind = PRIVATE_KIND_SET.has(event.kind);
  if (!baseKind && !extensionKinds.has(event.kind))
    fail("invalid_kind", "event is not a private MKT record");
  if (!verifyEvent(event))
    fail("invalid_event_signature", "private MKT signature or ID is invalid");
  validateCommonBounds(event, extensionMarkers);
  const common = validatePrivateTags(event, baseKind && validateKindTags);
  const envelope = decodeContentEnvelope(event.content);
  if (envelope.profile !== common.profile || envelope.profile_version !== common.version || envelope.session_id !== common.session) {
    fail("envelope_mismatch", "content envelope does not match event tags");
  }
  return { event, envelope, raw };
}
function validateRawPrivateRecord(raw, profiles, validateKindTags = true) {
  if (utf8Bytes(raw) > MKT_LIMITS.private_signed_record_bytes)
    fail("event_too_large", "private signed record is too large");
  const event = decodeNostrEvent(raw);
  const extensionKinds = new Set(profiles.flatMap((profile) => profile.privateKinds ?? []));
  const extensionMarkers = new Set(profiles.flatMap((profile) => profile.referenceMarkers ?? []));
  const validated = validateDecodedPrivateRecord(
    raw,
    event,
    validateKindTags,
    extensionKinds,
    extensionMarkers
  );
  return validateProfileSupport(validated, profiles);
}
function validateProfileSupport(validated, profiles) {
  const byId = profiles.filter((profile) => profile.id === validated.envelope.profile);
  if (byId.length === 0) fail("unsupported_profile", "profile is not supported");
  const support = byId.find((profile) => profile.version === validated.envelope.profile_version);
  if (support === void 0)
    fail("unsupported_profile_version", "profile version is not supported");
  const envelopeMembers = new Set(Object.keys(validated.envelope));
  for (const member of support.criticalMembers ?? []) {
    if (envelopeMembers.has(member) && !(support.understoodMembers ?? []).includes(member)) {
      fail("unsupported_critical_member", `critical profile member ${member} is not understood`);
    }
  }
  return validated;
}
function validateRawPublicHead(raw) {
  const event = decodeNostrEvent(raw);
  if (!verifyEvent(event)) fail("invalid_event_signature", "public MKT signature or ID is invalid");
  return validatePublicHead(event);
}
var decodePrivateBase = Effect6.fn("NipMkt.decodePrivateBase")(function* (raw, validateKindTags = true) {
  if (utf8Bytes(raw) > MKT_LIMITS.private_signed_record_bytes) {
    return yield* new MktValidationError({
      code: "event_too_large",
      message: "private signed record is too large"
    });
  }
  const value = yield* Effect6.try({
    try: () => parseJsonRejectingDuplicateMembers(raw),
    catch: validationFailure
  });
  const decoded = yield* decodeEventEffect(value).pipe(
    Effect6.mapError(
      () => new MktValidationError({
        code: "invalid_event_shape",
        message: "signed event structure is invalid"
      })
    )
  );
  return yield* Effect6.try({
    try: () => validateDecodedPrivateRecord(raw, mutableEvent(decoded), validateKindTags),
    catch: validationFailure
  });
});
var decodePrivateWithProfiles = Effect6.fn("NipMkt.decodePrivateWithProfiles")(function* (raw, profiles, validateKindTags = true) {
  return yield* Effect6.try({
    try: () => validateRawPrivateRecord(raw, profiles, validateKindTags),
    catch: validationFailure
  });
});
var decodePublicHead = Effect6.fn("NipMkt.decodePublicHead")(function* (raw) {
  const value = yield* Effect6.try({
    try: () => parseJsonRejectingDuplicateMembers(raw),
    catch: validationFailure
  });
  const decoded = yield* decodeEventEffect(value).pipe(
    Effect6.mapError(
      () => new MktValidationError({
        code: "invalid_event_shape",
        message: "signed event structure is invalid"
      })
    )
  );
  return yield* Effect6.try({
    try: () => {
      const event = mutableEvent(decoded);
      if (!verifyEvent(event))
        fail("invalid_event_signature", "public MKT signature or ID is invalid");
      return validatePublicHead(event);
    },
    catch: validationFailure
  });
});
var validateRawPrivateRecordEffect = decodePrivateWithProfiles;
var validateRawPublicHeadEffect = decodePublicHead;

// vendor/nip-mkt/src/transport.ts
var MktTransportCodeSchema = Schema10.Literals([
  "invalid_private_record",
  "invalid_gift_wrap",
  "signer_mismatch",
  "wrapper_inner_created_at_mismatch",
  "wrapper_inner_kind_mismatch",
  "wrapper_inner_recipient_mismatch",
  "wrapper_inner_signer_mismatch",
  "wrapper_recipient_mismatch",
  "wrapper_transport_failure"
]);
var MktTransportError = class extends Schema10.TaggedErrorClass()(
  "MktTransportError",
  { code: MktTransportCodeSchema, message: Schema10.String }
) {
};
function wrapperBindingError(input) {
  if (input.sealPubkey !== input.rumorPubkey || input.innerPubkey !== input.rumorPubkey) {
    return "wrapper_inner_signer_mismatch";
  }
  if (input.innerKind !== input.rumorKind) return "wrapper_inner_kind_mismatch";
  if (input.innerPubkey !== input.recipient && !input.innerCounterparties.some(
    (counterparty) => counterparty.pubkey === input.recipient && (counterparty.role === "requester" || counterparty.role === "provider")
  ))
    return "wrapper_inner_recipient_mismatch";
  return void 0;
}
function requireRumorBindings(tags, recipient) {
  const recipients = tags.filter((tag) => tag[0] === "p");
  const identifiers = tags.filter((tag) => tag[0] === "d");
  if (recipients.length !== 1 || recipients[0]?.length !== 2 || recipients[0]?.[1] !== recipient) {
    throw new Error("MKT rumor must contain exactly one recipient tag");
  }
  if (identifiers.length !== 1 || identifiers[0]?.length !== 2 || !/^[0-9a-f]{64}$/.test(identifiers[0]?.[1] ?? "")) {
    throw new Error("MKT rumor must contain exactly one unique d tag");
  }
}
var RumorSchema = Schema10.Struct({
  id: EventId,
  pubkey: PublicKey,
  created_at: UnixTimestamp,
  kind: EventKind,
  tags: Schema10.Array(Tag),
  content: Schema10.String
});
var decodeRumor = Schema10.decodeUnknownSync(RumorSchema);
var decodeNostrEventEffect = Schema10.decodeUnknownEffect(NostrEvent);
function serializeSignedEvent(event) {
  return JSON.stringify({
    id: event.id,
    pubkey: event.pubkey,
    created_at: event.created_at,
    kind: event.kind,
    tags: event.tags,
    content: event.content,
    sig: event.sig
  });
}
function buildSignedPublicHead(template, privateKey) {
  const event = finalizeEvent(
    { ...template, tags: template.tags.map((tag) => [...tag]) },
    privateKey
  );
  return validatePublicHead(event);
}
function transportFailure(cause) {
  return cause instanceof MktValidationError || cause instanceof MktTransportError ? cause : new MktTransportError({ code: "wrapper_transport_failure", message: String(cause) });
}
function wrapPrivateRecordSync(rawSignedEvent, senderPrivateKey, recipientPublicKey, profiles, material = {}) {
  const validated = validateRawPrivateRecord(
    rawSignedEvent,
    profiles,
    material.validateKindTags ?? true
  );
  const senderPublicKey = getPublicKey(senderPrivateKey);
  if (validated.event.pubkey !== senderPublicKey) {
    throw new MktTransportError({
      code: "signer_mismatch",
      message: "private MKT signer does not match wrapping sender"
    });
  }
  const rumorIdentifier = material.rumorIdentifier ?? Array.from(
    globalThis.crypto.getRandomValues(new Uint8Array(32)),
    (byte) => byte.toString(16).padStart(2, "0")
  ).join("");
  if (!/^[0-9a-f]{64}$/.test(rumorIdentifier)) {
    throw new MktTransportError({
      code: "invalid_private_record",
      message: "rumor identifier must be 64 lowercase hexadecimal characters"
    });
  }
  const rumorFields = {
    pubkey: senderPublicKey,
    created_at: validated.event.created_at,
    kind: validated.event.kind,
    tags: [
      ["p", recipientPublicKey],
      ["d", rumorIdentifier]
    ],
    content: rawSignedEvent
  };
  const rumor = decodeRumor({
    id: getEventHash(rumorFields),
    ...rumorFields
  });
  const seal = createSeal(rumor, senderPrivateKey, recipientPublicKey, material);
  const canonicalSeal = {
    id: seal.id,
    pubkey: seal.pubkey,
    created_at: seal.created_at,
    kind: seal.kind,
    tags: seal.tags,
    content: seal.content,
    sig: seal.sig
  };
  return createWrap(canonicalSeal, recipientPublicKey, material);
}
var wrapPrivateRecordCopies = Effect7.fn("NipMkt.wrapPrivateRecordCopies")(function* (rawSignedEvent, senderPrivateKey, counterpartyPublicKey, profiles, counterpartyMaterial = {}, recoveryMaterial = {}) {
  const senderPublicKey = getPublicKey(senderPrivateKey);
  const counterparty = yield* wrapPrivateRecord(
    rawSignedEvent,
    senderPrivateKey,
    counterpartyPublicKey,
    profiles,
    counterpartyMaterial
  );
  const senderRecovery = yield* wrapPrivateRecord(
    rawSignedEvent,
    senderPrivateKey,
    senderPublicKey,
    profiles,
    recoveryMaterial
  );
  return { counterparty, senderRecovery };
});
function unwrapPrivateRecordSync(wrap, recipientPrivateKey, profiles, options = {}) {
  const recipientPublicKey = getPublicKey(recipientPrivateKey);
  const details = unwrapEventWithDetails(wrap, recipientPrivateKey);
  const rumor = details.rumor;
  requireRumorBindings(rumor.tags, recipientPublicKey);
  const validated = validateRawPrivateRecord(
    rumor.content,
    profiles,
    options.validateKindTags ?? true
  );
  const bindingError = wrapperBindingError({
    sealPubkey: details.seal.pubkey,
    rumorPubkey: rumor.pubkey,
    rumorKind: rumor.kind,
    innerPubkey: validated.event.pubkey,
    innerKind: validated.event.kind,
    recipient: recipientPublicKey,
    innerCounterparties: validated.event.tags.filter((tag) => tag.length === 4 && tag[0] === "p").map((tag) => ({ pubkey: tag[1] ?? "", role: tag[3] ?? "" }))
  });
  if (bindingError !== void 0) {
    throw new MktTransportError({ code: bindingError, message: bindingError.replaceAll("_", " ") });
  }
  if (validated.event.created_at !== rumor.created_at) {
    throw new MktTransportError({
      code: "wrapper_inner_created_at_mismatch",
      message: "wrapper inner timestamp does not match the rumor"
    });
  }
  const delivery = {
    wrapId: details.wrapId,
    sealId: details.sealId,
    rumorId: details.rumorId,
    verifiedProvenance: {
      wrapId: details.wrapId,
      sealId: details.sealId,
      rumorId: details.rumorId
    },
    sourceProvenance: options.sourceProvenance ?? [],
    raw: rumor.content,
    event: validated.event
  };
  return options.receivedAt === void 0 ? delivery : { ...delivery, receivedAt: options.receivedAt };
}
var signPublicHead = Effect7.fn("NipMkt.signPublicHead")(
  (template, privateKey) => Effect7.try({
    try: () => buildSignedPublicHead(template, privateKey),
    catch: transportFailure
  })
);
var wrapPrivateRecord = Effect7.fn("NipMkt.wrapPrivateRecord")(
  (rawSignedEvent, senderPrivateKey, recipientPublicKey, profiles, material = {}) => Effect7.try({
    try: () => wrapPrivateRecordSync(
      rawSignedEvent,
      senderPrivateKey,
      recipientPublicKey,
      profiles,
      material
    ),
    catch: transportFailure
  })
);
var unwrapPrivateRecord = Effect7.fn("NipMkt.unwrapPrivateRecord")(function* (wrap, recipientPrivateKey, profiles, options = {}) {
  const decoded = yield* decodeNostrEventEffect(wrap).pipe(
    Effect7.mapError(
      (cause) => new MktTransportError({
        code: "invalid_gift_wrap",
        message: `gift wrap structure is invalid: ${String(cause)}`
      })
    )
  );
  if (decoded.kind !== GIFT_WRAP_KIND) {
    return yield* new MktTransportError({
      code: "invalid_gift_wrap",
      message: "gift wrap must use kind 1059"
    });
  }
  const giftWrap = { ...decoded, kind: GIFT_WRAP_KIND };
  return yield* Effect7.try({
    try: () => unwrapPrivateRecordSync(giftWrap, recipientPrivateKey, profiles, options),
    catch: transportFailure
  });
});
export {
  AltTagSchema,
  CLOSED_REASONS,
  CONTRACT_IDENTITY,
  CONTRACT_SHA256,
  CONTRACT_SOURCE_COMMIT,
  CancelActionSchema,
  CancelActionTagSchema,
  CancelEventSchema,
  CancelReasonTagSchema,
  CloseEventSchema,
  CloseOutcomeSchema,
  CloseOutcomeTagSchema,
  ClosedReasonCodeSchema,
  CounterpartyTagSchema,
  DescriptorStatusSchema,
  DescriptorStatusTagSchema,
  DigestTagSchema,
  EventReferenceTagSchema,
  ExpirationTagSchema,
  FIXTURE_MANIFEST_IDENTITY,
  FIXTURE_MANIFEST_SHA256,
  GATEWAY_LIMITS,
  HexIdentifierSchema,
  IMMORTAL_RELAY_EXTENSION,
  IMMORTAL_RELAY_SOFTWARE,
  MKT_CLIENT_LIMITS,
  MKT_ENVELOPE_SCHEMA,
  MKT_KINDS,
  MKT_KIND_DEFINITIONS,
  MKT_KIND_NAMES,
  MKT_LIMITS,
  MKT_TAG_REQUIREMENTS_BY_KIND,
  MktClientStateError,
  MktEventSchema,
  MktKindSchema,
  MktTransportCodeSchema,
  MktTransportError,
  MktValidationCodeSchema,
  MktValidationError,
  NIP_MKT_SDK_VERSION,
  NamedIdentifierSchema,
  NostrEventSchema,
  NostrTagSchema,
  OK_REASONS,
  OPAQUE_TRANSPORT,
  OfferingEventSchema,
  OfferingReferenceTagSchema,
  OfferingStatusSchema,
  OfferingStatusTagSchema,
  OkReasonCodeSchema,
  OrderEventSchema,
  PRIVATE_MKT_KINDS,
  PUBLIC_MKT_KINDS,
  PrivateIdentifierTagSchema,
  PrivateMktKindSchema,
  ProfileDescriptorEventSchema,
  ProfileEnvelopeSchema,
  ProfileTagSchema,
  ProviderProfileEventSchema,
  ProviderReferenceTagSchema,
  ProviderStatusSchema,
  ProviderStatusTagSchema,
  PublicIdentifierTagSchema,
  PublicMarketReceiptEventSchema,
  PublicMktKindSchema,
  PublicReceiptIdentifierTagSchema,
  PublicReceiptOutcomeSchema,
  PublicReceiptOutcomeTagSchema,
  PublishedAtTagSchema,
  QuoteEventSchema,
  QuoteTypeSchema,
  QuoteTypeTagSchema,
  REASON_PREFIXES,
  REQUIRED_TAGS,
  RelayProbeError,
  ReservationSchema,
  ReservationTagSchema,
  RetrievalTagSchema,
  RfqEventSchema,
  RoleTagSchema,
  SequenceTagSchema,
  SessionTagSchema,
  StatusEventSchema,
  StatusStateSchema,
  StatusStateTagSchema,
  TerminalAtTagSchema,
  VersionTagSchema,
  activeSupersedingQuote,
  admitPrivateRecord,
  analyzeStatusSequence,
  authorizationDecision,
  authorizeParticipant,
  buildSignedPublicHead,
  createPrivateAdmissionStore,
  decodePrivateBase,
  decodePrivateWithProfiles,
  decodePublicHead,
  deduplicateDeliveries,
  deliveryDeduplicationDecision,
  ensureNotExpired,
  evidenceDecision,
  evidenceMatchesClaim,
  expiryDecision,
  finalizeEvent,
  generateIdempotencyKey,
  generateSecretKey,
  getPublicKey,
  isExpired,
  missingCausalRecords,
  parseJsonRejectingDuplicateMembers,
  privateCoordinate,
  probeImmortalRelay,
  recoveryDecision,
  reserveCapacity,
  serializeSignedEvent,
  settlementDecision,
  settlementIsFinal,
  signPublicHead,
  unwrapPrivateRecord,
  validatePublicHead,
  validateRawPrivateRecord,
  validateRawPrivateRecordBase,
  validateRawPrivateRecordEffect,
  validateRawPublicHead,
  validateRawPublicHeadEffect,
  verifyEvent,
  wrapPrivateRecord,
  wrapPrivateRecordCopies,
  wrapperBindingError
};
/*! Bundled license information:

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/abstract/utils.js:
@noble/curves/esm/abstract/modular.js:
@noble/curves/esm/abstract/curve.js:
@noble/curves/esm/abstract/weierstrass.js:
@noble/curves/esm/_shortw_utils.js:
@noble/curves/esm/secp256k1.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/ciphers/esm/utils.js:
  (*! noble-ciphers - MIT License (c) 2023 Paul Miller (paulmillr.com) *)

@scure/base/lib/esm/index.js:
  (*! scure-base - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
