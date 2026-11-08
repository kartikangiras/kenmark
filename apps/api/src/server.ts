/**
 * Hosted aggregation API. Everything it returns is a read of live devnet
 * through @kenmark/core; it holds no state beyond a 30-second response cache.
 *
 *   GET /health
 *   GET /programs/:programId/security      profile shape from the spec, one predicate populated
 *   GET /programs/:programId/attestations  every decoded attestation plus exclusions
 */
import { serve } from "@hono/node-server";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { address, getBase58Decoder, type Address } from "@solana/kit";
import {
  createRpcClient,
  isRateLimitError,
  loadConfig,
  queryAttestationsForProgram,
  resolveAndDecode,
  verifiedBuild,
  withRateLimitBackoff,
  withRetry,
} from "@kenmark/core";

const config = loadConfig();
const rpc = createRpcClient(config.rpcUrl);
const rpcHost = (() => {
  try {
    return new URL(config.rpcUrl).host;
  } catch {
    return "unknown";
  }
})();

const IMPLEMENTED_PREDICATES = [verifiedBuild.PREDICATE_TYPE];
const CACHE_TTL_MS = 30_000;

interface IssuerView {
  credential: string;
  authority: string;
}

interface AttestationView {
  attestation: string;
  predicateType: string;
  schemaVersion: number;
  issuer: IssuerView;
  fields: {
    programId: string;
    binaryHash: string;
    sourceCommit: string;
    verificationStatus: string;
    verificationTimestamp: number;
  };
}

interface Aggregate {
  programId: string;
  queriedAtSlot: number;
  fetchedAt: string;
  decoded: AttestationView[];
  excluded: { attestation: string; reason: string }[];
}

const cache = new Map<string, Aggregate>();

async function aggregate(programId: Address): Promise<Aggregate> {
  const hit = cache.get(programId);
  if (hit && Date.now() - Date.parse(hit.fetchedAt) < CACHE_TTL_MS) return hit;

  const base58 = getBase58Decoder();
  const result = await withRateLimitBackoff(async () => {
    const slot = await withRetry(() => rpc.getSlot({ commitment: "confirmed" }).send(), {
      rpcUrl: config.rpcUrl,
    });
    const records = await queryAttestationsForProgram(rpc, config.rpcUrl, programId);
    const { decoded, excluded } = await resolveAndDecode(rpc, config.rpcUrl, records);
    return { slot, decoded, excluded };
  });

  const view: Aggregate = {
    programId,
    queriedAtSlot: Number(result.slot),
    fetchedAt: new Date().toISOString(),
    decoded: result.decoded.map((d) => ({
      attestation: d.attestationAddress,
      predicateType: d.predicateType,
      schemaVersion: d.schemaVersion,
      issuer: { credential: d.issuer.credential, authority: d.issuer.authority },
      fields: {
        programId: base58.decode(d.fields.programId),
        binaryHash: Buffer.from(d.fields.binaryHash).toString("hex"),
        sourceCommit: d.fields.sourceCommit,
        verificationStatus: verifiedBuild.verificationStatusName(d.fields.verificationStatus),
        verificationTimestamp: Number(d.fields.verificationTimestamp),
      },
    })),
    excluded: result.excluded.map((e) => ({ attestation: e.attestationAddress, reason: e.reason })),
  };
  cache.set(programId, view);
  return view;
}

/** The profile shape from the spec. Sections without an implemented predicate are empty, never guessed. */
function securityProfile(a: Aggregate) {
  const builds = [...a.decoded]
    .filter((d) => d.predicateType === verifiedBuild.PREDICATE_TYPE)
    .sort((x, y) => y.fields.verificationTimestamp - x.fields.verificationTimestamp);
  const latest = builds[0];
  return {
    programId: a.programId,
    cluster: "devnet",
    queriedAtSlot: a.queriedAtSlot,
    predicatesImplemented: IMPLEMENTED_PREDICATES,
    verifiedBuild: latest
      ? {
          status: latest.fields.verificationStatus,
          issuer: latest.issuer,
          timestamp: latest.fields.verificationTimestamp,
          binaryHash: latest.fields.binaryHash,
          sourceCommit: latest.fields.sourceCommit,
          attestation: latest.attestation,
        }
      : null,
    verifiedBuilds: builds.map((b) => ({
      status: b.fields.verificationStatus,
      issuer: b.issuer,
      timestamp: b.fields.verificationTimestamp,
      binaryHash: b.fields.binaryHash,
      sourceCommit: b.fields.sourceCommit,
      attestation: b.attestation,
    })),
    upgradeAuthority: null,
    audits: [],
    staticAnalysis: [],
    bugBounty: null,
    runtimeObservations: [],
    formalVerification: [],
    supplyChain: [],
    incidents: [],
    rawAttestations: a.decoded,
    excluded: a.excluded,
  };
}

const app = new Hono();
app.use("*", cors());

app.get("/", (c) =>
  c.json({
    name: "kenmark-api",
    cluster: "devnet",
    routes: ["/health", "/programs/:programId/security", "/programs/:programId/attestations"],
    source: "https://github.com/kartikangiras/kenmark",
  }),
);

app.get("/health", (c) =>
  c.json({ ok: true, cluster: "devnet", rpcHost, predicates: IMPLEMENTED_PREDICATES }),
);

function parseProgramId(raw: string): Address | null {
  try {
    return address(raw.trim());
  } catch {
    return null;
  }
}

app.get("/programs/:programId/security", async (c) => {
  const programId = parseProgramId(c.req.param("programId"));
  if (!programId) return c.json({ error: "programId is not a valid base58 address." }, 400);
  try {
    return c.json(securityProfile(await aggregate(programId)));
  } catch (err) {
    return failure(c, err);
  }
});

app.get("/programs/:programId/attestations", async (c) => {
  const programId = parseProgramId(c.req.param("programId"));
  if (!programId) return c.json({ error: "programId is not a valid base58 address." }, 400);
  try {
    const a = await aggregate(programId);
    return c.json({
      programId: a.programId,
      cluster: "devnet",
      queriedAtSlot: a.queriedAtSlot,
      fetchedAt: a.fetchedAt,
      decoded: a.decoded,
      excluded: a.excluded,
    });
  } catch (err) {
    return failure(c, err);
  }
});

function failure(c: Context, err: unknown) {
  if (isRateLimitError(err)) {
    c.header("retry-after", "3");
    return c.json(
      {
        error:
          "The devnet RPC endpoint is rate-limiting getProgramAccounts. Retry in a few seconds.",
        retryable: true,
      },
      503,
    );
  }
  const message = err instanceof Error ? err.message : String(err);
  return c.json({ error: `Devnet RPC failed: ${message}` }, 502);
}

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
  console.log(`kenmark-api listening on ${info.port} (rpc ${rpcHost})`);
});
