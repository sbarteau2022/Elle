# The box — the image sandbox exec (run_code / run_shell) and the second brain
# (delegate_local) run inside. See electron/native/providers/sandbox-box.cjs.
#
# It needs python3, node, and npx (for `npx tsx` on TypeScript jobs) on PATH,
# and a uid 1000 user so `docker run --user 1000:1000` can write into the
# bind-mounted /work workspace. Nothing here is Elle-specific — it's a plain
# polyglot runner; the workspace is mounted at run time, never baked in.
#
# Build (tag must match ELLE_SANDBOX_IMAGE, default elle-sandbox:latest):
#   docker build -f electron/sandbox.Dockerfile -t elle-sandbox:latest .
#
# On an Apple-Silicon Mac this builds a linux/arm64 image natively — fine, since
# only EXEC runs in here; the local MODEL stays native on the host for Metal.

FROM node:20-bookworm-slim

# python3 + pip + git + build-essential so the box can actually build things.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pip python3-venv git ca-certificates build-essential \
    && rm -rf /var/lib/apt/lists/*

# tsx available without a network fetch at run time (the box defaults to
# --network none, so `npx -y tsx` could not download it mid-job).
RUN npm install -g tsx@4

# uid 1000 already exists in the node image as `node`; make /work and hand it over.
RUN mkdir -p /work && chown -R 1000:1000 /work
WORKDIR /work
USER 1000:1000

CMD ["/bin/sh"]
